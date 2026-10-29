// Finances and board logic
import { budget, pay } from './economy';
import { journeySacked } from './journey';
import { leaguePosition, leagueTable } from './competitions';
import { month, monthName } from './dates';
import { GUEST_LEAGUES } from './guests';
import { leagueOf, squadOf, wageBill } from './generate';
import { sendMessage } from './inbox';
import { fmtMoney, overall } from './ratings';
import type { Club, GameState, League } from './types';
import { playersByClub } from './shirts';

const TICKET: Record<number, number> = { 1: 48, 2: 28, 3: 22, 4: 18, 5: 14 };
const TV_MONTHLY: Record<number, number> = { 1: 9_000_000, 2: 1_400_000, 3: 330_000, 4: 190_000, 5: 75_000 };

export function tierOf(g: GameState, club: Club) {
  // Guest clubs from the rest of Europe are financed like a strong second tier
  return g.leagues.find((l) => l.id === club.leagueId)?.tier ?? (GUEST_LEAGUES.includes(club.leagueId) ? 2 : 5);
}

function countryMult(club: Club) {
  return club.country === 'ENG' ? 1 : 0.6;
}

export function matchdayIncome(g: GameState, club: Club, cup = false) {
  const tier = tierOf(g, club);
  const fill = Math.min(1, 0.5 + club.reputation / 200 + (cup ? 0.1 : 0));
  const att = Math.round(club.capacity * fill);
  const income = Math.round(pay(att * (TICKET[tier] ?? 14) * countryMult(club)));
  club.balance += income;
  club.seasonIncome += income;
  return { att, income };
}

export function monthlyFinances(g: GameState) {
  for (const club of Object.values(g.clubs)) {
    const tier = tierOf(g, club);
    const tv = Math.round(pay((TV_MONTHLY[tier] ?? 20_000) * countryMult(club) * (0.75 + club.reputation / 200)));
    const commercial = Math.round(pay(Math.pow(club.reputation, 2.4) * 40 * (tier === 1 ? 1 : 0.4)));
    const facilityCost = Math.round(pay((club.facilities.training + club.facilities.youth) * [0, 60_000, 12_000, 4_000, 2_000, 800][tier]));
    club.balance += tv + commercial - facilityCost;
    club.seasonIncome += tv + commercial;
    club.seasonExpense += facilityCost;
  }
}

export function weeklyWages(g: GameState) {
  const bills: Record<number, number> = {};
  for (const p of Object.values(g.players)) if (p.clubId !== null) bills[p.clubId] = (bills[p.clubId] ?? 0) + p.wage;
  for (const club of Object.values(g.clubs)) {
    const w = bills[club.id] ?? 0;
    club.balance -= w;
    club.seasonExpense += w;
    // AI clubs stay solvent by trimming spending
    if (!club.isUser && club.balance < 0) club.transferBudget = 0;
  }
}

/** Snapshot the user's monthly finances for the Board screen chart. */
export function recordLedger(g: GameState) {
  const c = g.clubs[g.userClubId];
  const mark = g.ledgerMark ?? { i: 0, e: 0 };
  const d = new Date(g.date + 'T00:00:00Z');
  d.setUTCMonth(d.getUTCMonth() - 1);
  const key = d.toISOString().slice(0, 7);
  g.ledger.push({ month: key, income: Math.max(0, c.seasonIncome - mark.i), expense: Math.max(0, c.seasonExpense - mark.e), balance: c.balance });
  g.ledgerMark = { i: c.seasonIncome, e: c.seasonExpense };
  if (g.ledger.length > 36) g.ledger.shift();
}

// ---------------- Board ----------------

export function squadStrength(g: GameState, clubId: number) {
  const sq = squadOf(g, clubId).map(overall).sort((a, b) => b - a).slice(0, 16);
  return sq.length ? sq.reduce((s, x) => s + x, 0) / sq.length : 0;
}

export function expectedRank(g: GameState, league: League, clubId: number) {
  const ranked = [...league.clubIds].sort((a, b) => squadStrength(g, b) + g.clubs[b].reputation * 0.05 - squadStrength(g, a) - g.clubs[a].reputation * 0.05);
  return ranked.indexOf(clubId) + 1;
}

export function setBoardObjective(g: GameState) {
  const club = g.clubs[g.userClubId];
  const league = leagueOf(g, club.id);
  const n = league.clubIds.length;
  const r = expectedRank(g, league, club.id);
  let objective: string;
  let target: number;
  if (league.tier === 1) {
    if (r <= 1) { objective = 'Win the league title'; target = 1; }
    else if (r <= 4) { objective = 'Qualify for the Champions League (top 4)'; target = 4; }
    else if (r <= 8) { objective = 'Push for Europe (top 8)'; target = 8; }
    else if (r <= n - 5) { objective = 'Comfortable mid-table finish'; target = n - 5; }
    else { objective = 'Avoid relegation'; target = n - league.down; }
  } else {
    const up = league.up;
    if (r <= up) { objective = 'Win promotion'; target = up; }
    else if (r <= up + 4) { objective = 'Challenge for promotion (top 7)'; target = up + 4; }
    else if (r <= Math.floor(n / 2)) { objective = 'Finish in the top half'; target = Math.floor(n / 2); }
    else if (league.down > 0) { objective = 'Avoid relegation'; target = n - league.down; }
    else { objective = 'Establish the club in the division'; target = n - 4; }
  }
  g.board.objective = objective;
  g.board.objectiveRank = target;
}

export function boardMonthly(g: GameState) {
  const club = g.clubs[g.userClubId];
  const m = month(g.date);
  if (m === 7 || m === 8) return; // pre-season
  const pos = leaguePosition(g, club.id);
  const diff = g.board.objectiveRank - pos;
  let delta = Math.max(-6, Math.min(5, diff * 0.8));
  if (club.balance < 0) delta -= 4;
  g.board.confidence = clampConf(g.board.confidence + delta);
  checkSacking(g);
}

export function clampConf(v: number) {
  return Math.max(0, Math.min(100, Math.round(v)));
}

export function checkSacking(g: GameState) {
  if (g.mode === 'create' || g.sacked) return;
  if (g.board.confidence <= 5 && g.mode === 'journey') {
    // The Journey goes on: sacked, but other clubs come calling
    if (g.inbox.some((m) => m.action?.type === 'job' && m.action.status === 'open' && !m.action.options.some((o) => o.id === 'stay'))) return;
    sendMessage(g, { from: 'The Board', kind: 'board', title: 'You have been sacked', body: `The board has lost all confidence in your ability to deliver. Your time at ${g.clubs[g.userClubId].name} is over.` });
    journeySacked(g);
    return;
  }
  if (g.board.confidence <= 5) {
    g.sacked = true;
    sendMessage(g, { from: 'The Board', kind: 'board', title: 'You have been sacked', body: `The board has lost all confidence in your ability to deliver. Your contract with ${g.clubs[g.userClubId].name} has been terminated.` });
  }
}

const UPGRADE_COST = [0, 250_000, 900_000, 3_000_000, 9_000_000, 25_000_000];

export function upgradeCost(level: number, tier: number) {
  const mult = tier === 1 ? 1 : tier === 2 ? 0.5 : tier === 3 ? 0.25 : 0.15;
  return Math.round(pay((UPGRADE_COST[Math.min(5, level)] ?? 0) * mult));
}

export type BoardRequest = 'transfer' | 'wage' | 'training' | 'youth';

export function boardRequest(g: GameState, kind: BoardRequest): { ok: boolean; msg: string } {
  const club = g.clubs[g.userClubId];
  const monthKey = g.date.slice(0, 7);
  if (g.board.lastRequest === monthKey) return { ok: false, msg: 'The board has already heard a request from you this month. Come back next month.' };
  const conf = g.board.confidence;
  const tier = tierOf(g, club);
  g.board.lastRequest = monthKey;
  if (kind === 'transfer') {
    if (conf < 45 || club.balance < club.transferBudget * 1.2) return { ok: false, msg: 'The board refuses: "Results and finances don\'t justify more spending right now."' };
    const extra = Math.round(Math.min(club.balance * 0.15, Math.max(budget(50_000), club.transferBudget * 0.3)) / 10_000) * 10_000;
    club.transferBudget += extra;
    return { ok: true, msg: `The board agrees to add ${fmtMoney(extra)} to your transfer budget.` };
  }
  if (kind === 'wage') {
    if (conf < 50 || club.balance < 0) return { ok: false, msg: 'The board refuses to increase the wage budget at this time.' };
    const extra = Math.round(club.wageBudget * 0.1);
    club.wageBudget += extra;
    return { ok: true, msg: `Wage budget increased by ${fmtMoney(extra)}/week.` };
  }
  const level = club.facilities[kind];
  if (level >= 5) return { ok: false, msg: 'Facilities are already world class.' };
  if (g.board.facilityUpgrade) return { ok: false, msg: 'An upgrade is already under way.' };
  const cost = upgradeCost(level + 1, tier);
  if (conf < 55 || club.balance < cost * 1.5) return { ok: false, msg: `The board can't justify ${fmtMoney(cost)} on ${kind} facilities right now.` };
  club.balance -= cost;
  club.seasonExpense += cost;
  const ready = new Date(g.date + 'T00:00:00Z');
  ready.setUTCDate(ready.getUTCDate() + 90);
  g.board.facilityUpgrade = { kind, ready: ready.toISOString().slice(0, 10) };
  return { ok: true, msg: `Approved! ${fmtMoney(cost)} will be invested; the new ${kind} facilities open in 3 months.` };
}

export function checkFacilityUpgrade(g: GameState) {
  const up = g.board.facilityUpgrade;
  if (!up || up.ready > g.date) return;
  const club = g.clubs[g.userClubId];
  club.facilities[up.kind] = Math.min(5, club.facilities[up.kind] + 1);
  g.board.facilityUpgrade = null;
  sendMessage(g, { from: 'The Board', kind: 'board', title: `${up.kind === 'training' ? 'Training' : 'Youth'} facilities upgraded`, body: `Work is complete — your ${up.kind} facilities are now level ${club.facilities[up.kind]}.` });
}

export function setSeasonBudgets(g: GameState) {
  const byClub = playersByClub(g);
  for (const club of Object.values(g.clubs)) {
    const tier = tierOf(g, club);
    const bill = (byClub.get(club.id) ?? []).reduce((t, p) => t + p.wage, 0);
    const tierMult = [0, 1, 0.12, 0.035, 0.015, 0.005][tier] ?? 0.005;
    const base = budget(Math.pow(club.reputation / 100, 2.2) * 250_000_000 * tierMult);
    const fromBalance = Math.max(0, club.balance) * 0.35;
    club.transferBudget = Math.round(Math.max(club.custom ? budget(150_000) : 0, Math.min(fromBalance + base * 0.3, base * 1.2)) / 10_000) * 10_000;
    club.wageBudget = Math.round(Math.max(bill * 1.08, bill + base * 0.002));
    club.seasonIncome = 0;
    club.seasonExpense = 0;
  }
  g.ledgerMark = { i: 0, e: 0 };
}

export function financeSummary(g: GameState) {
  const c = g.clubs[g.userClubId];
  return {
    balance: c.balance,
    transferBudget: c.transferBudget,
    wageBudget: c.wageBudget,
    wageBill: wageBill(g, c.id),
    seasonIncome: c.seasonIncome,
    seasonExpense: c.seasonExpense,
  };
}

export function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number);
  return `${monthName(m)} ${String(y).slice(2)}`;
}

export function prizeMoney(g: GameState, league: League) {
  const table = leagueTable(g, league);
  const pot = pay((TV_MONTHLY[league.tier] ?? 20_000) * 4 * (league.country === 'ENG' ? 1 : 0.6));
  table.forEach((row, i) => {
    const club = g.clubs[row.clubId];
    const share = Math.round(pot * (1 - i / table.length) * 0.8 + pot * 0.2);
    club.balance += share;
    club.seasonIncome += share;
  });
}
