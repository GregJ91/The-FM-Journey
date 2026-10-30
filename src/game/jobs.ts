// CM 01/02 careers: the manager's reputation and the job market. Struggling clubs sack their managers; clubs your
// reputation can reach come calling; you can apply for any vacancy; and if you're sacked, smaller clubs give you
// another chance. Taking a job moves your career to that club. (The Journey has its own version of this.)
import { resetRegistration } from './actions';
import { expectedRank, setBoardObjective } from './club';
import { leaguePosition, leagueTable } from './competitions';
import { addDays } from './dates';
import { leagueOf } from './generate';
import { isGuest } from './guests';
import { sendMessage } from './inbox';
import { moveClub } from './journey';
import { fmtMoney, overall } from './ratings';
import { playersByClub } from './shirts';
import { chance, hash, rand } from './rng';
import type { Club, GameState, Jobs } from './types';

/** Does this career use the job market? (CM 01/02 careers; The Journey has its own.) */
export function hasJobs(g: GameState) {
  return g.mode === 'classic' && !!g.era;
}

/** The manager's career so far, started from the club he took on. */
export function jobsOf(g: GameState): Jobs {
  if (!g.jobs) {
    const club = g.clubs[g.userClubId];
    g.jobs = { rep: Math.max(10, club.reputation - 8), vacancies: [], career: [{ clubId: club.id, from: g.date }] };
  }
  return g.jobs;
}

/** Clubs that hire managers here: those in the playable leagues (not the transfer-only or guest clubs). */
function hiring(g: GameState, c: Club) {
  return !isGuest(c) && g.leagues.some((l) => l.clubIds.includes(c.id));
}

export function addRep(g: GameState, by: number) {
  if (!hasJobs(g)) return;
  const j = jobsOf(g);
  j.rep = Math.max(1, Math.min(100, j.rep + by));
}

/** The reputation labels CM used. */
export function managerRepLabel(rep: number) {
  return rep >= 85 ? 'World class' : rep >= 72 ? 'Continental' : rep >= 58 ? 'National' : rep >= 42 ? 'Regional' : rep >= 25 ? 'Local' : 'Unknown';
}

/** Would `club` take you on? Its board wants a manager whose name fits the club. */
function wouldHire(g: GameState, club: Club) {
  const j = jobsOf(g);
  return club.reputation <= j.rep + 8 + hash(club.id + g.season) * 4;
}

/** 1st of the month: your reputation moves with results, managers lose their jobs, and clubs approach you. */
export function jobsMonthly(g: GameState) {
  if (!hasJobs(g) || g.sacked) return;
  const j = jobsOf(g);
  const me = g.clubs[g.userClubId];
  const league = leagueOf(g, me.id);
  if (leagueTable(g, league).some((r) => r.p >= 4)) {
    const pos = leaguePosition(g, me.id);
    j.rep = Math.max(1, Math.min(100, j.rep + Math.max(-1.5, Math.min(1.5, (expectedRank(g, league, me.id) - pos) * 0.3))));
  }
  // Managers who aren't delivering are shown the door (each league's expected order worked out once)
  const byClub = playersByClub(g);
  const strength = (id: number) => {
    const best = (byClub.get(id) ?? []).filter((p) => p.squad === 'first').map(overall).sort((x, y) => y - x).slice(0, 16);
    return (best.length ? best.reduce((s2, v) => s2 + v, 0) / best.length : 0) + g.clubs[id].reputation * 0.05;
  };
  for (const lg of g.leagues) {
    const t = leagueTable(g, lg);
    if (!t.some((r) => r.p >= 8)) continue;
    const str = new Map(lg.clubIds.map((id) => [id, strength(id)]));
    const expected = [...lg.clubIds].sort((x, y) => str.get(y)! - str.get(x)!);
    t.forEach((r, i) => {
      if (r.clubId === me.id || j.vacancies.some((v) => v.clubId === r.clubId)) return;
      const behind = i - expected.indexOf(r.clubId);
      const p = i >= t.length - Math.ceil(t.length / 5) ? 0.08 : behind >= 6 ? 0.04 : 0;
      if (!p || !chance(p)) return;
      j.vacancies.push({ clubId: r.clubId, since: g.date });
      const c = g.clubs[r.clubId];
      if (c.reputation >= 55) sendMessage(g, { from: 'Media', kind: 'news', quiet: true, title: `${c.name} sack their manager`, body: `${c.name} have parted company with their manager after a poor run. The board are looking for a replacement.\n\nVacancies are listed under Board → Manager.` });
    });
  }
  j.vacancies = j.vacancies.filter((v) => v.since > addDays(g.date, -75));
  // A club with a vacancy your reputation can reach (and not a step down) asks you to take over
  const offers = j.vacancies.filter((v) => !v.offered && v.clubId !== me.id && wouldHire(g, g.clubs[v.clubId]) && g.clubs[v.clubId].reputation >= me.reputation - 3);
  const offer = offers.sort((a, b) => g.clubs[b.clubId].reputation - g.clubs[a.clubId].reputation)[0];
  if (offer && chance(0.4)) {
    offer.offered = true;
    jobMail(g, [offer.clubId], false);
  }
}

/** Daily: applications are answered after a few days. */
export function jobsDaily(g: GameState) {
  if (!g.jobs) return;
  for (const v of g.jobs.vacancies) {
    if (!v.applied || v.answered || addDays(v.applied, 3) > g.date) continue;
    v.answered = true;
    const club = g.clubs[v.clubId];
    if (wouldHire(g, club)) jobMail(g, [club.id], false, true);
    else sendMessage(g, { from: club.name, kind: 'board', title: `${club.name}: application unsuccessful`, body: `Thank you for your interest in the manager's job at ${club.name}. The board have decided to look for someone with more experience at this level.` });
  }
}

/** Apply for a vacancy (answered in about three days). */
export function applyForJob(g: GameState, clubId: number): { ok: boolean; msg: string } {
  const v = jobsOf(g).vacancies.find((x) => x.clubId === clubId);
  if (!v) return { ok: false, msg: 'That job has gone.' };
  if (v.applied) return { ok: false, msg: 'You have already applied.' };
  v.applied = g.date;
  return { ok: true, msg: `Application sent to ${g.clubs[clubId].name}. Expect an answer in a few days.` };
}

/** A job offer to answer (after a sacking: a choice of clubs, one of which you must take). */
export function jobMail(g: GameState, clubIds: number[], sacked: boolean, applied = false) {
  const first = g.clubs[clubIds[0]];
  const names = clubIds.map((id) => g.clubs[id].name);
  sendMessage(g, {
    from: sacked ? 'Your Agent' : first.name, kind: 'board',
    title: sacked ? 'Clubs want to talk to you' : applied ? `${first.name} offer you the job` : `${first.name} want you as their manager`,
    body: sacked
      ? `Losing your job hurts, but you're not short of options. ${names.join(', ')} have all been in touch. Pick your next club.`
      : `${first.name} (${leagueOf(g, first.id).name}) ${applied ? 'were impressed by your application and' : 'have parted company with their manager and'} want you to take over.\n\nIf you go, your current club will appoint someone else and any deals you're working on there are off.`,
  });
  g.inbox[0].action = {
    type: 'job', status: 'open', clubIds,
    options: [...clubIds.map((id) => ({ id: String(id), label: `Join ${g.clubs[id].name}` })), ...(sacked ? [] : [{ id: 'stay', label: `Stay at ${g.clubs[g.userClubId].name}` }])],
  };
}

/** Sacked: your name takes a knock, and a few smaller clubs offer you a way back. */
export function jobsSacked(g: GameState) {
  const j = jobsOf(g);
  const me = g.clubs[g.userClubId];
  j.rep = Math.max(1, j.rep - 8);
  const pool = Object.values(g.clubs).filter((c) => c.id !== me.id && hiring(g, c) && c.reputation <= me.reputation - 2 && c.reputation >= me.reputation - 25);
  const near = [...pool].sort((a, b) => b.reputation - a.reputation).slice(0, 12);
  const picks = near.sort(() => rand() - 0.5).slice(0, 3).map((c) => c.id);
  const fallback = Object.values(g.clubs).filter((c) => c.id !== me.id && hiring(g, c)).sort((a, b) => a.reputation - b.reputation).slice(0, 3).map((c) => c.id);
  jobMail(g, picks.length ? picks : fallback, true);
}

/** Take over at another club: the old one appoints someone, your deals there are off, the new board sets its aims. */
export function takeJob(g: GameState, clubId: number) {
  if (g.journey && g.mode === 'journey') { moveClub(g, clubId); return; }
  const j = jobsOf(g);
  const old = g.clubs[g.userClubId];
  const next = g.clubs[clubId];
  old.isUser = false;
  next.isUser = true;
  old.setPieces = undefined;
  // The new man at your old club picks from the whole first-team squad again
  for (const p of Object.values(g.players)) if (p.clubId === old.id && p.squad === 'reserve') p.squad = 'first';
  for (const o of g.offers) {
    if (o.from === old.id && (o.status === 'pending' || o.status === 'accepted' || o.status === 'countered')) o.status = 'withdrawn';
    if (o.to === old.id && o.status === 'pending') o.status = 'rejected';
  }
  for (const m of g.inbox) if (m.action?.status === 'open' && m.action.type !== 'job') { m.action.status = 'done'; m.action.result = `You left ${old.name}.`; }
  const last = j.career[j.career.length - 1];
  if (last) last.to = g.date;
  j.career.push({ clubId, from: g.date });
  j.vacancies = j.vacancies.filter((v) => v.clubId !== clubId);
  j.vacancies.push({ clubId: old.id, since: g.date, offered: true }); // your old job is open now
  j.rep = Math.min(100, j.rep + 2);
  g.userClubId = clubId;
  g.sacked = false;
  g.shortlist = g.shortlist.filter((id) => g.players[id]?.clubId !== clubId);
  g.board.confidence = 60;
  setBoardObjective(g);
  resetRegistration(g);
  sendMessage(g, { from: 'The Board', kind: 'board', title: `Welcome to ${next.name}`, body: `Welcome to ${next.name}. ${g.board.objective}.\n\nTransfer budget: ${fmtMoney(next.transferBudget)}. Have a look at the squad and the tactics before the next game.` });
}
