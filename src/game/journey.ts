// The Journey: start at a randomly drawn bottom-tier club in England or Scotland. You can't sign players
// yourself; your director of football (DoF) finds them for the slot and role you ask for, and the scouting
// department decides how good and how well-known they are. The board approves staff upgrades, and as your
// reputation grows (or you're sacked) other clubs come for you.
import { setBoardObjective, expectedRank } from './club';
import { leaguePosition, leagueTable } from './competitions';
import { LEAGUE_DEFS } from './data/leagues';
import { addDays } from './dates';
import { fitLabel, systemFit } from './fit';
import { FORMATIONS } from './formations';
import { leagueOf, squadOf } from './generate';
import { isGuest } from './guests';
import { sendMessage } from './inbox';
import { MANAGER_ATTRS, defaultProfile, mgr } from './manager';
import { personalityOf } from './personality';
import { age, fmtMoney, fullName, overall } from './ratings';
import { chance, hash, rand } from './rng';
import { resetRegistration } from './actions';
import { askingPrice, completeTransfer, wageDemand, windowOpen } from './transfers';
import type { Candidate, GameState, Journey, ManagerAttr, Pos, RecruitRequest } from './types';

// ---------- Starting out ----------

export const BACKGROUNDS = [
  { id: 'sunday', name: 'Sunday League', desc: 'Never played professionally. Everything to prove.', skill: 7, rep: 8 },
  { id: 'semi', name: 'Semi-pro', desc: 'A non-league career; knows the lower leagues.', skill: 9, rep: 14 },
  { id: 'pro', name: 'Professional', desc: 'A solid Football League career.', skill: 10, rep: 22 },
  { id: 'intl', name: 'International', desc: 'Played at the top level and for your country.', skill: 11, rep: 32 },
] as const;
export const BONUS_POINTS = 6;
export const JOURNEY_LEAGUES = ['ENG5', 'SCO4'];

/** A random bottom-tier club (National League or Scottish League Two). */
export function drawJourneyClub(seed = Math.random()): string {
  const names = LEAGUE_DEFS.filter((d) => JOURNEY_LEAGUES.includes(d.id)).flatMap((d) => d.clubs.map((c) => c.split('|')[0]));
  return names[Math.floor(seed * names.length) % names.length];
}

/** Set up The Journey on a freshly created world (manager profile from background + bonus points). */
export function initJourney(g: GameState, background: string, bonus: Partial<Record<ManagerAttr, number>>, nat = 'ENG', mgrAge = 38) {
  const bg = BACKGROUNDS.find((b) => b.id === background) ?? BACKGROUNDS[0];
  const prof = defaultProfile();
  for (const a of MANAGER_ATTRS) prof.skills[a.key] = Math.min(20, bg.skill + (bonus[a.key] ?? 0));
  g.managerProfile = prof;
  g.mode = 'journey';
  g.journey = {
    background: bg.id, nat, age: mgrAge, rep: bg.rep, dof: 1, scouting: 1, requests: [], upgrade: null, lastAsk: null, vacancies: [],
    career: [{ clubId: g.userClubId, from: g.date }],
  };
  sendMessage(g, {
    from: 'Director of Football', kind: 'transfer', title: 'Welcome, gaffer',
    body: `I'll be handling recruitment for you. Tell me the position and role you need from the Recruitment screen and I'll come back with the best options I can find. Our scouting is basic for now; the board might fund better staff if results go well.`,
  });
}

export function journey(g: GameState): Journey | null {
  return g.mode === 'journey' && g.journey ? g.journey : null;
}

// ---------- Recruitment ----------

/** How many players the DoF presents per request (level 1-5). */
export const DOF_SHORTLIST = [0, 3, 3, 4, 4, 5];

export function scoutingDays(j: Journey) {
  return 8 - j.scouting; // 7 days at level 1 down to 3 at level 5
}

export function requestPlayer(g: GameState, slot: number, maxAge: number, maxWage: number): { ok: boolean; msg: string } {
  const j = journey(g);
  if (!j) return { ok: false, msg: 'Only in The Journey.' };
  if (j.requests.filter((r) => r.status === 'scouting').length >= 3) return { ok: false, msg: 'Your director of football is already working on three requests.' };
  const club = g.clubs[g.userClubId];
  const fslot = FORMATIONS[club.tactics.formation][slot];
  if (!fslot) return { ok: false, msg: 'Pick a position.' };
  const req: RecruitRequest = {
    id: g.nextId++, slot, pos: fslot.pos, role: club.tactics.roles[slot] ?? '', maxAge, maxWage,
    created: g.date, ready: addDays(g.date, scoutingDays(j)), status: 'scouting', candidates: [],
  };
  j.requests.unshift(req);
  j.requests = j.requests.slice(0, 12);
  return { ok: true, msg: `Request sent. Your scouts report back in ${scoutingDays(j)} days.` };
}

/** Which leagues the scouting department can reach. */
function reach(g: GameState, j: Journey): (clubId: number | null) => boolean {
  const myLeague = leagueOf(g, g.userClubId);
  return (clubId) => {
    if (clubId === null) return true; // free agents are always known
    const c = g.clubs[clubId];
    if (isGuest(c)) return j.scouting >= 5;
    const lg = g.leagues.find((l) => l.id === c.leagueId);
    if (!lg) return false;
    if (j.scouting >= 4) return true;
    const uk = lg.country === 'ENG' || lg.country === 'SCO';
    if (j.scouting === 3) return uk;
    if (lg.country !== myLeague.country) return j.scouting >= 2 && uk && Math.abs(lg.tier - myLeague.tier) <= 1;
    return j.scouting >= 2 || Math.abs(lg.tier - myLeague.tier) <= 1;
  };
}

/** Likelihood (and the reasons) that a player would sign for the user's club, plus the fee and wage. */
export function signChance(g: GameState, playerId: number, maxWage: number) {
  const j = journey(g)!;
  const p = g.players[playerId];
  const me = g.clubs[g.userClubId];
  const reasons: { good: boolean; text: string }[] = [];
  let c = 55 + j.dof * 4 + mgr(g, 'negotiating') * 8;
  const pers = personalityOf(p).name;
  if (p.clubId === null) { c += 15; reasons.push({ good: true, text: 'Free agent looking for a club' }); }
  else {
    const them = g.clubs[p.clubId];
    const diff = Math.max(-25, Math.min(20, (me.reputation - them.reputation) * 0.8));
    c += diff;
    if (diff >= 5) reasons.push({ good: true, text: `Sees ${me.name} as a step up` });
    if (diff <= -5) reasons.push({ good: false, text: `Sees ${me.name} as a step down` });
    const theirLg = g.leagues.find((l) => l.id === them.leagueId);
    const myLg = leagueOf(g, me.id);
    if (theirLg && theirLg.tier < myLg.tier) { c -= 10; reasons.push({ good: false, text: 'Would be dropping down a division' }); }
    if (!them.lineup.includes(p.id)) { c += 12; reasons.push({ good: true, text: 'Wants first-team football' }); }
    if (p.contractEnd <= g.season + 1) { c += 8; reasons.push({ good: true, text: 'Contract running down' }); }
    if (pers === 'Loyal') { c -= 15; reasons.push({ good: false, text: `Loyal to ${them.name}` }); }
    if (hash(p.id * 31 + g.season) < 0.25) { c -= 8; reasons.push({ good: false, text: 'Rival clubs interested' }); }
  }
  if (pers === 'Ambitious' && reasons.some((r) => r.text.includes('step down'))) { c -= 10; reasons.push({ good: false, text: 'Ambitious: wants to play higher' }); }
  if (pers === 'Unambitious') { c += 8; reasons.push({ good: true, text: 'Unambitious: happy at a smaller club' }); }
  const discount = 1 - 0.04 * (j.dof - 1);
  const fee = p.clubId === null ? 0 : Math.round(askingPrice(g, p) * discount);
  const wage = Math.round(wageDemand(g, p, me) * (1 - 0.03 * (j.dof - 1)));
  if (wage > maxWage) { c -= 20; reasons.push({ good: false, text: `Wants ${fmtMoney(wage)}/wk, over your limit` }); }
  else if (pers === 'Mercenary') { c += 6; reasons.push({ good: true, text: 'Mercenary: the money works' }); }
  if (fee > me.transferBudget) reasons.push({ good: false, text: `Fee ${fmtMoney(fee)} is over your budget` });
  return { chance: Math.round(Math.max(5, Math.min(95, c))), reasons: reasons.slice(0, 4), fee, wage };
}

function findCandidates(g: GameState, req: RecruitRequest): Candidate[] {
  const j = journey(g)!;
  const club = g.clubs[g.userClubId];
  const level = LEAGUE_DEFS.find((d) => d.id === club.leagueId)?.level ?? 50;
  const lo = level - 8 + j.scouting * 1.5;
  const hi = level - 1 + j.scouting * 3;
  const known = reach(g, j);
  const taken = new Set(j.requests.flatMap((r) => r.candidates.map((c) => c.playerId)));
  const pool = Object.values(g.players).filter((p) => {
    if (p.clubId === g.userClubId || p.squad === 'youth' || taken.has(p.id)) return false;
    if (!(p.pos === req.pos || p.alt.includes(req.pos))) return false;
    if (age(p, g.date) > req.maxAge || (p.injury && p.injury.days > 30)) return false;
    const o = overall(p);
    return o >= lo && o <= hi && known(p.clubId);
  });
  const scored = pool.map((p) => {
    const fit = systemFit(p, req.pos, req.role, club.tactics);
    return { p, s: overall(p) * 1.2 + fit.score * 0.35 + rand() * 6 };
  }).sort((a, b) => b.s - a.s).slice(0, DOF_SHORTLIST[j.dof]);
  return scored.map(({ p }) => ({ playerId: p.id, ...signChance(g, p.id, req.maxWage), status: 'open' as const }));
}

/** The scouting range shown for an attribute or rating: exact at level 5, wider the worse the scouting. */
export function scoutRange(g: GameState, v: number, playerId: number, salt = 0): [number, number] {
  const j = journey(g);
  const p = g.players[playerId];
  if (!j || !p || p.clubId === g.userClubId) return [Math.round(v), Math.round(v)];
  const w = [0, 4, 3, 2, 1, 0][j.scouting];
  const off = Math.round((hash(playerId * 97 + salt * 13 + Math.round(v)) - 0.5) * w);
  return [Math.max(1, Math.round(v) - w + off), Math.min(99, Math.round(v) + w + off)];
}

export function pursue(g: GameState, reqId: number, playerId: number): { ok: boolean; msg: string } {
  const j = journey(g)!;
  const req = j.requests.find((r) => r.id === reqId);
  const cand = req?.candidates.find((c) => c.playerId === playerId);
  if (!req || !cand || cand.status !== 'open') return { ok: false, msg: 'No longer available.' };
  const p = g.players[playerId];
  if (cand.fee > g.clubs[g.userClubId].transferBudget) return { ok: false, msg: 'The fee is over your transfer budget.' };
  if (p.clubId !== null && !windowOpen(g)) return { ok: false, msg: 'The transfer window is closed. Free agents only until it reopens.' };
  cand.status = 'pursuing';
  cand.resolveOn = addDays(g.date, Math.max(1, 4 - Math.ceil(j.dof / 2)));
  return { ok: true, msg: `Your director of football is opening talks for ${fullName(p)}.` };
}

export function rejectCandidate(g: GameState, reqId: number, playerId: number) {
  const cand = journey(g)?.requests.find((r) => r.id === reqId)?.candidates.find((c) => c.playerId === playerId);
  if (cand && cand.status === 'open') cand.status = 'rejected';
}

export function systemFitFor(g: GameState, req: RecruitRequest, playerId: number) {
  const club = g.clubs[g.userClubId];
  return systemFit(g.players[playerId], req.pos, req.role, club.tactics, (journey(g)?.scouting ?? 5) >= 5);
}
export { fitLabel };

// ---------- Staff upgrades (board approval) ----------

export const STAFF_COST = [0, 25_000, 80_000, 200_000, 500_000, 0];

export function upgradeStaff(g: GameState, kind: 'dof' | 'scouting'): { ok: boolean; msg: string } {
  const j = journey(g)!;
  const level = j[kind];
  if (level >= 5) return { ok: false, msg: 'Already the best there is.' };
  if (j.upgrade) return { ok: false, msg: 'An upgrade is already under way.' };
  const month = g.date.slice(0, 7);
  if (j.lastAsk === month) return { ok: false, msg: 'You can only ask the board once a month.' };
  j.lastAsk = month;
  const club = g.clubs[g.userClubId];
  const cost = STAFF_COST[level];
  if (club.balance < cost * 1.5) {
    sendMessage(g, { from: 'The Board', kind: 'board', title: 'Staff upgrade declined', body: `We can't justify ${fmtMoney(cost)} on staff with the club's finances as they are.` });
    return { ok: false, msg: 'The board say the club can\'t afford it.' };
  }
  const approve = 0.15 + (g.board.confidence / 100) * 0.8;
  if (!chance(approve)) {
    sendMessage(g, { from: 'The Board', kind: 'board', title: 'Staff upgrade declined', body: `Not right now. Show us results and we'll look again next month.` });
    return { ok: false, msg: 'The board turned it down this time.' };
  }
  club.balance -= cost;
  club.seasonExpense += cost;
  j.upgrade = { kind, ready: addDays(g.date, 10) };
  const what = kind === 'dof' ? 'a better director of football' : 'an upgraded scouting department';
  sendMessage(g, { from: 'The Board', kind: 'board', title: 'Staff upgrade approved', body: `We've approved ${fmtMoney(cost)} for ${what}. It'll be in place in ten days.` });
  return { ok: true, msg: 'Approved by the board.' };
}

// ---------- Daily / monthly ----------

export function journeyDaily(g: GameState) {
  const j = journey(g);
  if (!j) return;
  // Scouting reports come in
  for (const req of j.requests) {
    if (req.status !== 'scouting' || req.ready > g.date) continue;
    req.status = 'ready';
    req.candidates = findCandidates(g, req);
    const n = req.candidates.length;
    sendMessage(g, {
      from: 'Director of Football', kind: 'transfer',
      title: n ? `${n} options for your ${req.pos}` : `No one found for your ${req.pos}`,
      body: n ? `I've found ${n} players who could do a job in that ${req.pos} role. Have a look on the Recruitment screen and tell me who to go for.` : `I couldn't find anyone suitable within those limits. Try a higher wage limit or an older age limit.`,
    });
  }
  // Negotiations conclude
  for (const req of j.requests) {
    for (const cand of req.candidates) {
      if (cand.status !== 'pursuing' || !cand.resolveOn || cand.resolveOn > g.date) continue;
      const p = g.players[cand.playerId];
      const me = g.clubs[g.userClubId];
      if (!p || p.clubId === g.userClubId) { cand.status = 'failed'; continue; }
      if (p.clubId !== null && !windowOpen(g)) { cand.status = 'failed'; sendMessage(g, { from: 'Director of Football', kind: 'transfer', title: `Talks for ${fullName(p)} collapsed`, body: 'The window shut before we could finish the deal.' }); continue; }
      if (cand.fee > me.transferBudget) { cand.status = 'failed'; continue; }
      if (chance(cand.chance / 100)) {
        completeTransfer(g, p.id, me.id, cand.fee, cand.wage);
        cand.status = 'signed';
        req.status = 'closed';
        sendMessage(g, { from: 'Director of Football', kind: 'transfer', title: `✍️ ${fullName(p)} signs!`, body: `Done. ${fullName(p)} joins ${cand.fee ? `for ${fmtMoney(cand.fee)}` : 'on a free'} on ${fmtMoney(cand.wage)}/wk.` });
      } else {
        cand.status = 'failed';
        sendMessage(g, { from: 'Director of Football', kind: 'transfer', title: `${fullName(p)} turned us down`, body: `We couldn't get it over the line. ${cand.reasons.find((r) => !r.good)?.text ?? 'He chose to stay put.'}` });
      }
    }
  }
  // Staff upgrades arrive
  if (j.upgrade && j.upgrade.ready <= g.date) {
    j[j.upgrade.kind]++;
    sendMessage(g, { from: 'Director of Football', kind: 'transfer', title: j.upgrade.kind === 'dof' ? 'Director of football upgraded' : 'Scouting department upgraded', body: j.upgrade.kind === 'dof' ? `Level ${j.dof}: better negotiating, more options per request.` : `Level ${j.scouting}: better players, further afield, and more accurate reports.` });
    j.upgrade = null;
  }
}

/** 1st of the month: reputation moves with results; struggling clubs sack their managers; offers arrive. */
export function journeyMonthly(g: GameState) {
  const j = journey(g);
  if (!j) return;
  const me = g.clubs[g.userClubId];
  const league = leagueOf(g, me.id);
  const table = leagueTable(g, league);
  if (table.some((r) => r.p >= 4)) {
    const pos = leaguePosition(g, me.id);
    const exp = expectedRank(g, league, me.id);
    j.rep = Math.max(1, Math.min(100, j.rep + Math.max(-2, Math.min(2, (exp - pos) * 0.35))));
  }
  // Other clubs lose patience with their managers
  for (const lg of g.leagues.filter((l) => l.country === 'ENG' || l.country === 'SCO')) {
    const t = leagueTable(g, lg);
    if (!t.some((r) => r.p >= 8)) continue;
    t.slice(-Math.ceil(t.length / 5)).forEach((r) => {
      if (r.clubId === me.id || j.vacancies.some((v) => v.clubId === r.clubId)) return;
      if (chance(0.08)) j.vacancies.push({ clubId: r.clubId, since: g.date });
    });
  }
  j.vacancies = j.vacancies.filter((v) => v.since > addDays(g.date, -75));
  // Clubs approach you: a step up (or sideways) that your reputation can reach
  const offers = j.vacancies.filter((v) => !v.offered && g.clubs[v.clubId].reputation <= j.rep + 12 && g.clubs[v.clubId].reputation >= me.reputation - 3);
  const offer = offers.sort((a, b) => g.clubs[b.clubId].reputation - g.clubs[a.clubId].reputation)[0];
  if (offer && chance(0.45)) {
    offer.offered = true;
    jobOffer(g, [offer.clubId], false);
  }
}

/** Send a job offer (or, after a sacking, a choice of clubs that must be answered). */
export function jobOffer(g: GameState, clubIds: number[], sacked: boolean) {
  const names = clubIds.map((id) => g.clubs[id].name);
  const first = g.clubs[clubIds[0]];
  sendMessage(g, {
    from: sacked ? 'Your Agent' : first.name, kind: 'board',
    title: sacked ? 'Clubs want to talk to you' : `${first.name} want you as their manager`,
    body: sacked
      ? `Losing your job hurts, but you're not short of options. ${names.join(', ')} have all been in touch. Pick your next club.`
      : `${first.name} (${leagueOf(g, first.id).name}) have parted company with their manager and want you to take over. The board are offering a fresh start and a bigger stage.`,
  }, );
  const m = g.inbox[0];
  m.action = {
    type: 'job', status: 'open', clubIds,
    options: [...clubIds.map((id) => ({ id: String(id), label: `Join ${g.clubs[id].name}` })), ...(sacked ? [] : [{ id: 'stay', label: `Stay at ${g.clubs[g.userClubId].name}` }])],
  };
}

/** Take over at another club. */
export function moveClub(g: GameState, clubId: number) {
  const j = journey(g)!;
  const old = g.clubs[g.userClubId];
  const next = g.clubs[clubId];
  old.isUser = false;
  next.isUser = true;
  const last = j.career[j.career.length - 1];
  if (last) last.to = g.date;
  j.career.push({ clubId, from: g.date });
  g.userClubId = clubId;
  g.sacked = false;
  g.board.confidence = 60;
  setBoardObjective(g);
  resetRegistration(g);
  j.requests = [];
  j.vacancies = j.vacancies.filter((v) => v.clubId !== clubId);
  // Your old club appoints someone new; the staff levels belong to the new club
  j.dof = Math.max(1, Math.min(j.dof, 1 + Math.floor((next.reputation - 30) / 15)));
  j.scouting = Math.max(1, Math.min(j.scouting, 1 + Math.floor((next.reputation - 30) / 15)));
  j.rep = Math.min(100, j.rep + 3);
  sendMessage(g, { from: 'The Board', kind: 'board', title: `Welcome to ${next.name}`, body: `Welcome to ${next.name}, gaffer. ${g.board.objective}. Your director of football is ready when you are.` });
}

/** The board have sacked you: reputation takes a hit and lower clubs come calling. */
export function journeySacked(g: GameState) {
  const j = journey(g)!;
  const me = g.clubs[g.userClubId];
  j.rep = Math.max(1, j.rep - 8);
  const pool = Object.values(g.clubs).filter((c) => c.id !== me.id && !isGuest(c) && ['ENG', 'SCO'].includes(g.leagues.find((l) => l.id === c.leagueId)?.country ?? '') && c.reputation <= me.reputation + 2 && c.reputation >= me.reputation - 15);
  const picks = pool.sort(() => rand() - 0.5).slice(0, 3).map((c) => c.id);
  const fallback = Object.values(g.clubs).filter((c) => JOURNEY_LEAGUES.includes(c.leagueId) && c.id !== me.id).slice(0, 3).map((c) => c.id);
  jobOffer(g, picks.length ? picks : fallback, true);
}

export function respondJob(g: GameState, option: string): string {
  if (option === 'stay') return `You turned them down and stay at ${g.clubs[g.userClubId].name}.`;
  const id = Number(option);
  moveClub(g, id);
  return `You're the new manager of ${g.clubs[id].name}.`;
}

/** Stars for a reputation (0-5) */
export function repLabel(rep: number) {
  return rep >= 80 ? 'World class' : rep >= 65 ? 'Continental' : rep >= 50 ? 'National' : rep >= 35 ? 'Regional' : rep >= 20 ? 'Local' : 'Unknown';
}

export type { Pos };
export const squadSize = (g: GameState) => squadOf(g, g.userClubId).length;
