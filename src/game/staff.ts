// CM 01/02 careers: the backroom staff. Coaches make players improve faster (specialists in their area, a fitness
// coach keeps them sharp), physios get injured players back sooner and keep more of them fit, and scouts judge
// players more accurately and send monthly reports from the country you assign them to. Hire from the staff
// available (Board > Staff) within the wage budget; how many you can have depends on the size of the club.
import { sendMessage } from './inbox';
import { nextId } from './generate';
import { NAME_POOLS } from './data/names';
import { POS_GROUP, age, fmtMoney, fullName, marketValue, overall, scoutedPotential } from './ratings';
import { hash, pick, rand } from './rng';
import { permitCheck } from './permits';
import { playerInterest } from './transfers';
import { nationName } from './intl';
import type { CoachFocus, GameState, Player, Staff, StaffRole } from './types';

export const ROLE_NAME: Record<StaffRole, string> = { coach: 'Coach', physio: 'Physio', scout: 'Scout' };
export const FOCUS_NAME: Record<CoachFocus, string> = { general: 'General', attacking: 'Attack', defending: 'Defence', goalkeeping: 'Keepers', fitness: 'Fitness', youth: 'Youth' };
export const ROLE_PLURAL: Record<StaffRole, string> = { coach: 'Coaches', physio: 'Physios', scout: 'Scouts' };
const FOCI: CoachFocus[] = ['general', 'attacking', 'defending', 'goalkeeping', 'fitness', 'youth'];

/** Staff are a CM 01/02 career feature. */
export function hasStaff(g: GameState) {
  return !!g.era;
}

/** A weekly wage for this level of staff (2002 money). */
function staffWage(ability: number) {
  return Math.round((300 + ability * ability * 12) / 50) * 50;
}

/** How many of each the club can employ: bigger clubs run bigger backrooms. */
export function staffLimits(g: GameState) {
  const rep = g.clubs[g.userClubId].reputation;
  return { coach: 2 + Math.floor(rep / 25), physio: rep >= 60 ? 2 : 1, scout: 1 + Math.floor(rep / 30) } as Record<StaffRole, number>;
}

function newStaff(g: GameState, role: StaffRole, ability: number, nat: string): Staff {
  const pool = NAME_POOLS[nat] ?? NAME_POOLS.ENG;
  const a = Math.max(3, Math.min(20, Math.round(ability)));
  return {
    id: nextId(g),
    first: pick(pool.first), last: pick(pool.last), nat, role, ability: a,
    ...(role === 'coach' ? { focus: pick(FOCI) } : {}),
    age: 32 + Math.floor(rand() * 30), wage: staffWage(a), clubId: null,
  };
}

/** The staff list: your backroom and the staff available to hire. Started (or topped up) when first needed. */
export function staffOf(g: GameState) {
  if (!g.staff) {
    const club = g.clubs[g.userClubId];
    const nat = club.country;
    const level = 4 + club.reputation / 9; // Middlesbrough about 12, Manchester United about 14
    const staff: Staff[] = [];
    const lim = staffLimits(g);
    // Your backroom: a coach short of the limit, one physio, one scout; the board covers their wages
    for (let i = 0; i < lim.coach - 1; i++) { const s = newStaff(g, 'coach', level + (rand() - 0.5) * 4, nat); if (i === 0) s.focus = 'general'; s.clubId = club.id; staff.push(s); }
    for (const role of ['physio', 'scout'] as StaffRole[]) { const s = newStaff(g, role, level + (rand() - 0.5) * 4, nat); s.clubId = club.id; if (role === 'scout') s.assign = nat; staff.push(s); }
    club.wageBudget += staff.reduce((t, s) => t + s.wage, 0);
    g.staff = staff;
    refreshPool(g);
  }
  return g.staff;
}

/** Staff out of work: mostly from your country, a few from abroad, from journeymen to the very best. */
function refreshPool(g: GameState) {
  const all = g.staff!;
  const free = all.filter((s) => s.clubId === null);
  // Some find other jobs
  for (const s of free) if (rand() < 0.2) all.splice(all.indexOf(s), 1);
  const nat = g.clubs[g.userClubId].country;
  const others = ['ENG', 'SCO', 'ESP', 'ITA', 'FRA', 'GER', 'NED', 'POR'].filter((n) => n !== nat);
  const want: Record<StaffRole, number> = { coach: 14, physio: 6, scout: 9 };
  for (const role of Object.keys(want) as StaffRole[]) {
    const have = all.filter((s) => s.clubId === null && s.role === role).length;
    for (let i = have; i < want[role]; i++) all.push(newStaff(g, role, 4 + Math.pow(rand(), 1.4) * 16, rand() < 0.7 ? nat : pick(others)));
  }
}

export function myStaff(g: GameState, role?: StaffRole) {
  return staffOf(g).filter((s) => s.clubId === g.userClubId && (!role || s.role === role));
}

export function staffWages(g: GameState, clubId: number) {
  return (g.staff ?? []).filter((s) => s.clubId === clubId).reduce((t, s) => t + s.wage, 0);
}

export function hireStaff(g: GameState, id: number): { ok: boolean; msg: string } {
  const s = staffOf(g).find((x) => x.id === id);
  const club = g.clubs[g.userClubId];
  if (!s || s.clubId !== null) return { ok: false, msg: 'No longer available.' };
  if (myStaff(g, s.role).length >= staffLimits(g)[s.role]) return { ok: false, msg: `The board won't fund another ${ROLE_NAME[s.role].toLowerCase()} (the limit is ${staffLimits(g)[s.role]}). Release one first.` };
  let bill = 0;
  for (const p of Object.values(g.players)) if (p.clubId === club.id) bill += p.wage;
  if (bill + staffWages(g, club.id) + s.wage > club.wageBudget) return { ok: false, msg: `His wages (${fmtMoney(s.wage)}/wk) would break your wage budget.` };
  s.clubId = club.id;
  if (s.role === 'scout') s.assign = club.country;
  return { ok: true, msg: `${s.first} ${s.last} joins as ${s.role === 'coach' ? `${FOCUS_NAME[s.focus!].toLowerCase()} coach` : s.role}.` };
}

/** Release a member of staff: three months' wages as compensation. */
export function releaseStaff(g: GameState, id: number): { ok: boolean; msg: string } {
  const s = staffOf(g).find((x) => x.id === id);
  const club = g.clubs[g.userClubId];
  if (!s || s.clubId !== club.id) return { ok: false, msg: 'Not on your staff.' };
  const pay = s.wage * 13;
  club.balance -= pay;
  club.seasonExpense += pay;
  s.clubId = null;
  s.assign = undefined;
  return { ok: true, msg: `${s.first} ${s.last} has left (compensation ${fmtMoney(pay)}).` };
}

// ---------- What staff do ----------

/** Development: your best coach for this player's area (a general coach counts a little less). 1.0 is an average backroom. */
export function coachFactor(g: GameState, p: Player) {
  if (!hasStaff(g) || p.clubId !== g.userClubId || !g.staff) return 1;
  const coaches = myStaff(g, 'coach');
  if (!coaches.length) return 0.85;
  const area: CoachFocus = p.pos === 'GK' ? 'goalkeeping' : POS_GROUP[p.pos] === 'DEF' ? 'defending' : 'attacking';
  const young = age(p, g.date) <= 21;
  const fit = (c: Staff) => c.ability * (c.focus === area || (young && c.focus === 'youth') ? 1 : c.focus === 'general' ? 0.92 : 0.8);
  const best = Math.max(...coaches.map(fit));
  // More coaches share the work: a small bonus for a full staff
  const depth = Math.min(1.04, 1 + (coaches.length - 2) * 0.01);
  return (0.85 + 0.3 * (best / 20)) * depth;
}

/** The squad's average development factor from coaching (1 = an average backroom). */
export function coachingLevel(g: GameState) {
  const squad = Object.values(g.players).filter((p) => p.clubId === g.userClubId && p.squad !== 'youth');
  return squad.length ? squad.reduce((t, p) => t + coachFactor(g, p), 0) / squad.length : 1;
}

/** Daily match-fitness recovery from a fitness coach (points per day). */
export function fitnessBonus(g: GameState) {
  if (!hasStaff(g) || !g.staff) return 0;
  const f = myStaff(g, 'coach').filter((c) => c.focus === 'fitness');
  return f.length ? (Math.max(...f.map((c) => c.ability)) - 8) * 0.15 : -0.5;
}

/** Your best physio (0 with none). */
function physio(g: GameState) {
  if (!hasStaff(g) || !g.staff) return 10;
  const ps = myStaff(g, 'physio');
  return ps.length ? Math.max(...ps.map((s) => s.ability)) : 0;
}

/** A good physio gets injured players back sooner: the chance of an extra day's recovery each day (negative: slower). */
export function physioRecovery(g: GameState) {
  return (physio(g) - 10) / 20;
}

/** ...and keeps more players fit: multiplies the user's injury chance in matches. */
export function physioInjuryRisk(g: GameState) {
  return 1.15 - 0.015 * physio(g);
}

/** How far out a scout report can be: your best scout's judgement (±points of ability). */
export function scoutError(g: GameState) {
  if (!hasStaff(g) || !g.staff) return 2;
  const s = myStaff(g, 'scout');
  const best = s.length ? Math.max(...s.map((x) => x.ability)) : 3;
  return Math.max(0.5, 5 - best / 4);
}

// ---------- Monthly ----------

/** 1st of the month: scouts send their reports; staff come and go from the market. */
export function staffMonthly(g: GameState) {
  if (!hasStaff(g)) return;
  staffOf(g);
  refreshPool(g);
  const club = g.clubs[g.userClubId];
  const best = squadOfLevel(g);
  for (const s of myStaff(g, 'scout')) {
    const nat = s.assign ?? club.country;
    const found = scoutFind(g, s, nat, best);
    if (!found.length) continue;
    const where = nat === 'YOUTH' ? 'young talent everywhere' : nat === 'ALL' ? 'players everywhere' : nationName(nat);
    sendMessage(g, {
      from: `${s.first} ${s.last} (scout)`, kind: 'transfer', quiet: true,
      title: `Scout report: ${where}`,
      body: `Players worth a look:\n\n${found.map((p) => `• ${fullName(p)} (${p.pos}, ${age(p, g.date)}, ${p.clubId !== null ? g.clubs[p.clubId].name : 'free agent'}): ${judge(g, s, p, best)}. Value ${fmtMoney(marketValue(p, g.date))}.`).join('\n')}\n\nSearch for them on the Transfers screen.`,
    });
  }
}

/** The average of the user's best XI. */
function squadOfLevel(g: GameState) {
  const best = Object.values(g.players).filter((p) => p.clubId === g.userClubId && p.squad === 'first').map(overall).sort((a, b) => b - a).slice(0, 11);
  return best.length ? best.reduce((a, b) => a + b, 0) / best.length : 60;
}

/** A scout's view of a player (his own judgement, so it can be out). */
function seen(_g: GameState, s: Staff, p: Player) {
  const err = (hash(p.id * 31 + s.id) - 0.5) * 2 * Math.max(0.5, 5 - s.ability / 4);
  return { now: overall(p) + err, pot: scoutedPotential(p, false) + err };
}

function judge(g: GameState, s: Staff, p: Player, level: number) {
  const v = seen(g, s, p);
  const fit = v.now >= level + 3 ? 'would walk into your team' : v.now >= level - 1 ? 'good enough for your first team' : v.pot >= level + 3 ? 'could become a star for you' : 'one for the future';
  return fit;
}

/** Up to a handful of players a scout recommends: better scouts find more, and better ones. */
function scoutFind(g: GameState, s: Staff, nat: string, level: number) {
  const club = g.clubs[g.userClubId];
  const n = 2 + Math.floor(s.ability / 6);
  const pool = Object.values(g.players).filter((p) => {
    if (p.clubId === club.id || p.loan || p.preContract) return false;
    const c = p.clubId !== null ? g.clubs[p.clubId] : null;
    if (nat === 'YOUTH') { if (age(p, g.date) > 20) return false; }
    else if (nat !== 'ALL' && (c ? c.country : p.nat) !== nat) return false;
    return permitCheck(g, p, club).ok && playerInterest(g, p, club).ok && marketValue(p, g.date) <= Math.max(club.transferBudget * 1.3, 250_000);
  });
  const score = (p: Player) => { const v = seen(g, s, p); return nat === 'YOUTH' ? v.pot : v.now + Math.max(0, v.pot - v.now) * 0.3; };
  return pool.map((p) => ({ p, v: score(p) })).filter((x) => nat === 'YOUTH' || x.v >= level - 4).sort((a, b) => b.v - a.v).slice(0, n).map((x) => x.p);
}
