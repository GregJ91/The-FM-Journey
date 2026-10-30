import { addDays, diffDays, nextWeekday } from './dates';
import { nextId } from './generate';
import { pick, shuffle } from './rng';
import { winnerOf } from './match';
import type { Cup, Fixture, GameState, League } from './types';
import { REAL_FIXTURES, REAL_FIXTURES_SEASON } from './data/realFixtures';
import { LEAGUE_CUP_DEFS, LEAGUE_DEFS } from './data/leagues';

export interface TableRow {
  clubId: number;
  p: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  pts: number;
  form: ('W' | 'D' | 'L')[];
  ded?: number; // points deducted
}

/** Round-robin pairings (circle method), double round. */
function roundRobin(ids: number[]): [number, number][][] {
  const teams = [...ids];
  if (teams.length % 2) teams.push(-1);
  const n = teams.length;
  const rounds: [number, number][][] = [];
  const arr = [...teams];
  for (let r = 0; r < n - 1; r++) {
    const pairs: [number, number][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a === -1 || b === -1) continue;
      pairs.push(r % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(pairs);
    arr.splice(1, 0, arr.pop()!);
  }
  const second = rounds.map((rd) => rd.map(([a, b]) => [b, a] as [number, number]));
  return [...rounds, ...second];
}

/** Spread `n` rounds between start and end dates, on Saturdays (+ Tuesdays when needed). */
function leagueDates(season: number, n: number) {
  const start = nextWeekday(`${season}-08-08`, 6);
  const end = `${season + 1}-05-16`;
  const sats: string[] = [];
  for (let d = start; diffDays(end, d) >= 0; d = addDays(d, 7)) {
    // winter break around Christmas is not used in England; keep all
    sats.push(d);
  }
  if (n <= sats.length) {
    // choose n evenly spaced Saturdays
    const out: string[] = [];
    for (let i = 0; i < n; i++) out.push(sats[Math.round((i * (sats.length - 1)) / Math.max(1, n - 1))]);
    return out;
  }
  // add midweek Tuesday rounds spread through the season
  const extra = n - sats.length;
  const tues: string[] = [];
  for (let i = 0; i < extra; i++) {
    const idx = Math.round(((i + 1) * (sats.length - 1)) / (extra + 1));
    tues.push(addDays(sats[idx], 3));
  }
  return [...sats, ...tues].sort();
}

/** The real fixture list for this league and season, if we have one and every club is still in it. */
function realSchedule(g: GameState, league: League) {
  const real = REAL_FIXTURES[league.id];
  if (!real || g.season !== REAL_FIXTURES_SEASON) return null;
  const byName = new Map(league.clubIds.map((id) => [g.clubs[id].name, id]));
  const ids = real.clubs.map((n) => byName.get(n));
  if (ids.some((id) => id === undefined) || ids.length !== league.clubIds.length) return null; // e.g. a created club took a place
  return real.matches.map((m) => {
    const [round, date, h, a] = m.split('|');
    return { round: Number(round), date, home: ids[Number(h)]!, away: ids[Number(a)]! };
  });
}

export function scheduleLeague(g: GameState, league: League) {
  const real = realSchedule(g, league);
  if (real) {
    for (const m of real) g.fixtures.push({ id: nextId(g), comp: league.id, date: m.date, round: m.round, home: m.home, away: m.away, result: null });
    return;
  }
  const double = roundRobin(shuffle([...league.clubIds]));
  // Leagues where clubs meet more than twice (Scotland) repeat the cycle, alternating home and away
  const meetings = LEAGUE_DEFS.find((d) => d.id === league.id)?.meetings ?? 2;
  const half = double.length / 2;
  const rounds: [number, number][][] = [];
  for (let k = 0; k < meetings; k++) rounds.push(...double.slice(k % 2 ? half : 0, k % 2 ? double.length : half));
  const dates = leagueDates(g.season, rounds.length);
  rounds.forEach((pairs, i) => {
    for (const [home, away] of pairs) {
      g.fixtures.push({ id: nextId(g), comp: league.id, date: dates[i], round: i + 1, home, away, result: null });
    }
  });
}

export function leagueTable(g: GameState, league: League): TableRow[] {
  const rows: Record<number, TableRow> = {};
  for (const id of league.clubIds) rows[id] = { clubId: id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, form: [] };
  const fx = g.fixtures.filter((f) => f.comp === league.id && f.result).sort((a, b) => (a.date < b.date ? -1 : 1));
  for (const f of fx) {
    const r = f.result!;
    const h = rows[f.home];
    const a = rows[f.away];
    if (!h || !a) continue;
    h.p++; a.p++;
    h.gf += r.hg; h.ga += r.ag; a.gf += r.ag; a.ga += r.hg;
    if (r.hg > r.ag) { h.w++; a.l++; h.pts += 3; h.form.push('W'); a.form.push('L'); }
    else if (r.hg < r.ag) { a.w++; h.l++; a.pts += 3; a.form.push('W'); h.form.push('L'); }
    else { h.d++; a.d++; h.pts++; a.pts++; h.form.push('D'); a.form.push('D'); }
  }
  for (const d of g.deductions ?? []) {
    if (d.leagueId !== league.id || d.season !== g.season || !rows[d.clubId]) continue;
    rows[d.clubId].pts -= d.pts;
    rows[d.clubId].ded = (rows[d.clubId].ded ?? 0) + d.pts;
  }
  const out = Object.values(rows);
  for (const r of out) r.form = r.form.slice(-5);
  out.sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || g.clubs[x.clubId].name.localeCompare(g.clubs[y.clubId].name));
  return out;
}

export function leaguePosition(g: GameState, clubId: number) {
  const league = g.leagues.find((l) => l.clubIds.includes(clubId));
  if (!league) return 0;
  return leagueTable(g, league).findIndex((r) => r.clubId === clubId) + 1;
}

// ---------- Cups ----------

const DOMESTIC_ROUND_NAMES = (n: number) => {
  const names: string[] = [];
  for (let i = 0; i < n; i++) {
    const left = n - i;
    names.push(left === 1 ? 'Final' : left === 2 ? 'Semi-finals' : left === 3 ? 'Quarter-finals' : left === 4 ? 'Round of 16' : `Round ${i + 1}`);
  }
  return names;
};

function cupRoundDates(season: number, n: number, first: string, final: string, weekday: number) {
  const start = nextWeekday(first, weekday);
  const span = diffDays(final, start);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    if (i === n - 1) out.push(final);
    else out.push(nextWeekday(addDays(start, Math.round((i * span) / (n - 1))), weekday));
  }
  void season;
  return out;
}

/** CM 01/02 careers have the League Cups too (added to older saves at the start of a season). */
export function ensureLeagueCups(g: GameState) {
  if (!g.era) return;
  for (const def of LEAGUE_CUP_DEFS) {
    if (g.cups.some((c) => c.id === def.id)) continue;
    g.cups.push({ id: def.id, name: def.name, short: def.short, type: 'domestic', country: def.country, color: def.color, alive: [], rounds: [], current: 0, winner: null, runnerUp: null, leagues: def.leagues });
  }
}

export function setupCups(g: GameState) {
  for (const cup of g.cups) {
    if (cup.type !== 'domestic') continue;
    cup.winner = null;
    cup.runnerUp = null;
    cup.current = 0;
    cup.alive = g.leagues.filter((l) => l.country === cup.country && (!cup.leagues || cup.leagues.includes(l.id))).flatMap((l) => l.clubIds);
    const n = Math.ceil(Math.log2(cup.alive.length));
    const names = DOMESTIC_ROUND_NAMES(n);
    // League Cups start in August on Tuesdays and finish with a Sunday final in early March (Scotland: mid-March)
    const dates = cup.leagues
      ? cupRoundDates(g.season, n, `${g.season}-08-13`, nextWeekday(`${g.season + 1}-${cup.country === 'SCO' ? '03-16' : '03-02'}`, 0), 2)
      : cupRoundDates(g.season, n, `${g.season}-09-16`, `${g.season + 1}-05-23`, 3);
    if (!cup.leagues) dates[n - 1] = nextWeekday(`${g.season + 1}-05-22`, 6); // final on a Saturday
    cup.rounds = names.map((name, i) => ({ name, date: dates[i] }));
    drawCupRound(g, cup);
  }
}

/** Draw the next round. Lower-ranked teams play the preliminary round so the field reaches a power of two. */
export function drawCupRound(g: GameState, cup: Cup) {
  if (cup.current >= cup.rounds.length || cup.alive.length < 2) return;
  const round = cup.rounds[cup.current];
  const teams = [...cup.alive];
  const pow = Math.pow(2, Math.floor(Math.log2(teams.length)));
  let playing: number[];
  if (teams.length > pow) {
    const matches = teams.length - pow;
    // rank by reputation; lowest 2*matches teams play
    teams.sort((a, b) => g.clubs[b].reputation - g.clubs[a].reputation);
    playing = teams.slice(teams.length - matches * 2);
  } else {
    playing = teams;
  }
  shuffle(playing);
  for (let i = 0; i + 1 < playing.length; i += 2) {
    const final = cup.current === cup.rounds.length - 1;
    const f: Fixture = {
      id: nextId(g), comp: cup.id, date: round.date, round: cup.current + 1, roundName: round.name,
      home: playing[i], away: playing[i + 1], result: null, knockout: true, neutral: final,
    };
    g.fixtures.push(f);
    avoidLeagueClash(g, f);
  }
}

/**
 * A club can't play twice on one day. When a cup or European tie lands on the same date as one of its
 * clubs' league matches (real fixture lists have midweek rounds), the league match moves a day earlier,
 * or later, to the nearest day that's free for both of its clubs.
 */
export function avoidLeagueClash(g: GameState, f: Fixture) {
  const busy = (club: number, date: string, except: Fixture) => g.fixtures.some((x) => x !== except && x.date === date && (x.home === club || x.away === club));
  for (const club of [f.home, f.away]) {
    const other = g.fixtures.find((x) => x !== f && !x.result && x.date === f.date && (x.home === club || x.away === club));
    if (!other || !g.leagues.some((l) => l.id === other.comp)) continue;
    for (const shift of [-1, 1, -2, 2, -3, 3]) {
      const d = addDays(other.date, shift);
      if (d <= g.date) continue;
      if (!busy(other.home, d, other) && !busy(other.away, d, other)) { other.date = d; break; }
    }
  }
}

/** After a cup round's matches are played, eliminate losers and draw the next round. */
export function progressCup(g: GameState, cup: Cup) {
  const round = cup.current + 1;
  const fx = g.fixtures.filter((f) => f.comp === cup.id && f.round === round);
  if (!fx.length || fx.some((f) => !f.result)) return false;
  for (const f of fx) {
    const w = winnerOf(f)!;
    const loser = w === f.home ? f.away : f.home;
    cup.alive = cup.alive.filter((id) => id !== loser);
  }
  cup.current++;
  if (cup.alive.length === 1) {
    cup.winner = cup.alive[0];
    const final = fx[0];
    cup.runnerUp = final.home === cup.winner ? final.away : final.home;
    return true;
  }
  // Keep rounds aligned with remaining field
  const needed = Math.ceil(Math.log2(cup.alive.length));
  const remaining = cup.rounds.length - cup.current;
  if (remaining > needed) cup.rounds.splice(cup.current, remaining - needed);
  drawCupRound(g, cup);
  return true;
}

/** Pre-season friendlies (CM 01/02 careers): the user's club only; they count for nothing but fitness. */
export const FRIENDLY = 'FRN';

export function compName(g: GameState, comp: string) {
  if (comp === FRIENDLY) return 'Friendly';
  return g.leagues.find((l) => l.id === comp)?.name ?? g.cups.find((c) => c.id === comp)?.name ?? comp;
}

/**
 * Arrange the user's pre-season friendlies (CM 01/02 careers): up to five in July and early August, before the first
 * competitive game, against two lower-league sides, a club at your level and a side from abroad.
 */
export function scheduleFriendlies(g: GameState) {
  if (!g.era) return [];
  const me = g.clubs[g.userClubId];
  const mine = g.fixtures.filter((f) => f.home === me.id || f.away === me.id);
  const firstComp = mine.map((f) => f.date).sort()[0] ?? `${g.season}-08-17`;
  const busy = (id: number, d: string) => g.fixtures.some((f) => (f.home === id || f.away === id) && Math.abs(Date.parse(f.date) - Date.parse(d)) < 3 * 86400000);
  const dates = ['07-13', '07-17', '07-20', '07-24', '07-27', '07-31', '08-03']
    .map((md) => `${g.season}-${md}`)
    .filter((d) => d > g.date && Date.parse(firstComp) - Date.parse(d) >= 4 * 86400000 && !busy(me.id, d));
  // Every other date, so there's a rest in between
  const picked = dates.filter((_, i) => i % 2 === 0 || dates.length <= 5).slice(0, 5);
  const myLeague = g.leagues.find((l) => l.clubIds.includes(me.id));
  const sameCountry = g.leagues.filter((l) => l.country === me.country);
  const lower = sameCountry.filter((l) => myLeague && l.tier > myLeague.tier && l.tier <= myLeague.tier + 2).flatMap((l) => l.clubIds);
  const level = (myLeague?.clubIds ?? []).filter((id) => id !== me.id);
  const abroad = Object.values(g.clubs).filter((c) => c.country !== me.country && !c.isUser && Math.abs(c.reputation - me.reputation) < 15 && (c.leagueId === 'EUR' || g.leagues.some((l) => l.tier === 1 && l.clubIds.includes(c.id)))).map((c) => c.id);
  const pools = [lower, lower, level, abroad, abroad.length ? abroad : level];
  const used = new Set<number>();
  const out: Fixture[] = [];
  picked.forEach((d, i) => {
    const pool = (pools[i] ?? level).filter((id) => !used.has(id) && !busy(id, d));
    const opp = pool.length ? pick(pool) : undefined;
    if (opp === undefined) return;
    used.add(opp);
    // Lower-league sides host (as they usually did); the rest alternate
    const home = i < 2 ? opp : i % 2 ? me.id : opp;
    const f: Fixture = { id: nextId(g), comp: FRIENDLY, date: d, round: i + 1, home, away: home === me.id ? opp : me.id, result: null };
    g.fixtures.push(f);
    out.push(f);
  });
  return out;
}

export function compColor(g: GameState, comp: string) {
  return g.leagues.find((l) => l.id === comp)?.color ?? g.cups.find((c) => c.id === comp)?.color ?? '#333';
}

export function clubFixtures(g: GameState, clubId: number) {
  return g.fixtures.filter((f) => f.home === clubId || f.away === clubId).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
