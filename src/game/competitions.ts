import { addDays, diffDays, nextWeekday } from './dates';
import { nextId } from './generate';
import { shuffle } from './rng';
import { winnerOf } from './match';
import type { Cup, Fixture, GameState, League } from './types';

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

export function scheduleLeague(g: GameState, league: League) {
  const rounds = roundRobin(shuffle([...league.clubIds]));
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

export function setupCups(g: GameState, continentalEntrants: number[]) {
  for (const cup of g.cups) {
    cup.winner = null;
    cup.runnerUp = null;
    cup.current = 0;
    if (cup.type === 'domestic') {
      cup.alive = g.leagues.filter((l) => l.country === cup.country).flatMap((l) => l.clubIds);
      const n = Math.ceil(Math.log2(cup.alive.length));
      const names = DOMESTIC_ROUND_NAMES(n);
      const dates = cupRoundDates(g.season, n, `${g.season}-09-16`, `${g.season + 1}-05-23`, 3);
      dates[n - 1] = nextWeekday(`${g.season + 1}-05-22`, 6); // final on a Saturday
      cup.rounds = names.map((name, i) => ({ name, date: dates[i] }));
    } else {
      cup.alive = [...continentalEntrants];
      const n = Math.ceil(Math.log2(Math.max(2, cup.alive.length)));
      const names = DOMESTIC_ROUND_NAMES(n).map((x) => (x.startsWith('Round') ? 'Round of 32' : x));
      const dates = cupRoundDates(g.season, n, `${g.season}-10-20`, `${g.season + 1}-05-29`, 2);
      dates[n - 1] = nextWeekday(`${g.season + 1}-05-29`, 6);
      cup.rounds = names.map((name, i) => ({ name, date: dates[i] }));
    }
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

export function compName(g: GameState, comp: string) {
  return g.leagues.find((l) => l.id === comp)?.name ?? g.cups.find((c) => c.id === comp)?.name ?? comp;
}

export function compColor(g: GameState, comp: string) {
  return g.leagues.find((l) => l.id === comp)?.color ?? g.cups.find((c) => c.id === comp)?.color ?? '#333';
}

export function clubFixtures(g: GameState, clubId: number) {
  return g.fixtures.filter((f) => f.home === clubId || f.away === clubId).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** Continental entrants: top 4 of each top division + best of the rest by reputation to make 32. */
export function continentalEntrants(g: GameState, useTables: boolean) {
  const tops = g.leagues.filter((l) => l.tier === 1);
  const picked: number[] = [];
  for (const l of tops) {
    const order = useTables ? leagueTable(g, l).map((r) => r.clubId) : [...l.clubIds].sort((a, b) => g.clubs[b].reputation - g.clubs[a].reputation);
    picked.push(...order.slice(0, 4));
  }
  const rest = tops
    .flatMap((l) => {
      const order = useTables ? leagueTable(g, l).map((r) => r.clubId) : [...l.clubIds].sort((a, b) => g.clubs[b].reputation - g.clubs[a].reputation);
      return order.slice(4, 8).map((id, i) => ({ id, score: g.clubs[id].reputation - i * 4 }));
    })
    .sort((a, b) => b.score - a.score);
  for (const r of rest) {
    if (picked.length >= 32) break;
    picked.push(r.id);
  }
  return picked;
}
