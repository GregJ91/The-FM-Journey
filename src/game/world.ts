// FIFA Club World Cup: 32 clubs every four years (next in 2029), played in June after the season.
// Format as in 2025: eight groups of four, then single-match knockouts from the round of 16.
// All matches are at neutral venues.
import { CWC_PLACES, NATION_DEFS, WORLD_CLUBS, WORLD_GUEST_LEAGUE, WORLD_PLAYERS } from './data/world';
import { EURO_GUEST_LEAGUE } from './data/europe';
import { type TableRow } from './competitions';
import { nextId } from './generate';
import { addGuestClubs } from './guests';
import { sendMessage } from './inbox';
import { winnerOf } from './match';
import { normal, shuffle } from './rng';
import type { Club, Cup, GameState } from './types';

export const CWC_ID = 'CWC';
const FIRST_CWC = 2029;
const PRIZE = { entryUefa: 10_000_000, entry: 3_000_000, win: 1_500_000, draw: 750_000, ko: [6_000_000, 10_000_000, 16_000_000, 25_000_000], winner: 32_000_000 };
const DATES = ['06-09', '06-13', '06-17', '06-21', '06-24', '06-27', '06-30'];
const NAMES = ['Group stage · Matchday 1', 'Group stage · Matchday 2', 'Group stage · Matchday 3', 'Round of 16', 'Quarter-finals', 'Semi-finals', 'Final'];

export function isCwcYear(year: number) {
  return year >= FIRST_CWC && (year - FIRST_CWC) % 4 === 0;
}

export function nextCwcYear(year: number) {
  let y = Math.max(FIRST_CWC, year);
  while (!isCwcYear(y)) y++;
  return y;
}

function confOf(club: Club) {
  return NATION_DEFS[club.country]?.conf ?? 'UEFA';
}

function pay(g: GameState, id: number, amount: number) {
  const c = g.clubs[id];
  c.balance += amount;
  c.seasonIncome += amount;
}

/** UEFA: Champions League winners of the last four seasons, then the strongest clubs (two per country at most). */
function entrants(g: GameState, year: number): number[] {
  const clubs = Object.values(g.clubs);
  const european = clubs.filter((c) => confOf(c) === 'UEFA' && (c.leagueId === EURO_GUEST_LEAGUE || g.leagues.some((l) => l.id === c.leagueId && l.tier === 1)));
  const euroTrophies = (c: Club) => c.trophies.filter((t) => t.season >= year - 4 && ['Champions League', 'Europa League', 'Conference League'].includes(t.name));
  const winners = european.filter((c) => euroTrophies(c).some((t) => t.name === 'Champions League'));
  const picked = [...winners];
  const perCountry: Record<string, number> = {};
  for (const c of winners) perCountry[c.country] = (perCountry[c.country] ?? 0) + 1;
  const ranked = european
    .filter((c) => !picked.includes(c))
    .map((c) => ({ c, score: c.reputation + euroTrophies(c).length * 3 }))
    .sort((a, b) => b.score - a.score);
  for (const { c } of ranked) {
    if (picked.length >= 12) break;
    if ((perCountry[c.country] ?? 0) >= 2) continue;
    picked.push(c);
    perCountry[c.country] = (perCountry[c.country] ?? 0) + 1;
  }
  const rest = clubs.filter((c) => c.leagueId === WORLD_GUEST_LEAGUE).map((c) => ({ c, score: c.reputation + normal(0, 3) })).sort((a, b) => b.score - a.score);
  for (const [conf, n] of Object.entries(CWC_PLACES)) picked.push(...rest.filter((r) => confOf(r.c) === conf).slice(0, n).map((r) => r.c));
  // Host's place: the best club left from outside Europe
  const host = rest.find((r) => !picked.includes(r.c));
  if (host) picked.push(host.c);
  return picked.slice(0, 32).map((c) => c.id);
}

/** Called when the season ends (5 June). Sets up the tournament in Club World Cup years. */
export function setupClubWorldCup(g: GameState) {
  const year = Number(g.date.slice(0, 4));
  if (!isCwcYear(year)) return;
  addGuestClubs(g, WORLD_CLUBS, WORLD_PLAYERS, WORLD_GUEST_LEAGUE);
  const teams = entrants(g, year);
  if (teams.length < 32) return;
  // Pots by reputation; one club from each pot per group, avoiding two clubs from one confederation (UEFA: two)
  const sorted = [...teams].sort((a, b) => g.clubs[b].reputation - g.clubs[a].reputation);
  const pots = [0, 1, 2, 3].map((i) => sorted.slice(i * 8, i * 8 + 8));
  let best: number[][] = [];
  let bestClash = Infinity;
  for (let attempt = 0; attempt < 120 && bestClash > 0; attempt++) {
    const groups: number[][] = shuffle([...pots[0]]).map((id) => [id]);
    for (let p = 1; p < 4; p++) shuffle([...pots[p]]).forEach((id, i) => groups[i].push(id));
    let clash = 0;
    for (const grp of groups) {
      const n: Record<string, number> = {};
      for (const id of grp) n[confOf(g.clubs[id])] = (n[confOf(g.clubs[id])] ?? 0) + 1;
      for (const [c, k] of Object.entries(n)) clash += Math.max(0, k - (c === 'UEFA' ? 2 : 1));
    }
    if (clash < bestClash) { bestClash = clash; best = groups; }
  }
  g.cups = g.cups.filter((c) => c.id !== CWC_ID);
  const cup: Cup = {
    id: CWC_ID, name: 'Club World Cup', short: 'CWC', type: 'world', country: null, color: '#C9A227',
    alive: [...teams], teams: [...teams], groups: best, current: 0, winner: null, runnerUp: null,
    rounds: NAMES.map((name, i) => ({ name, date: `${year}-${DATES[i]}` })),
  };
  g.cups.push(cup);
  const md = [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[3, 0], [1, 2]]];
  best.forEach((grp, gi) => md.forEach((pairs, r) => {
    for (const [a, b] of pairs) g.fixtures.push({ id: nextId(g), comp: CWC_ID, date: cup.rounds[r].date, round: r + 1, roundName: `${cup.rounds[r].name} · Group ${String.fromCharCode(65 + gi)}`, home: grp[a], away: grp[b], result: null, neutral: true });
  }));
  for (const id of teams) pay(g, id, confOf(g.clubs[id]) === 'UEFA' ? PRIZE.entryUefa : PRIZE.entry);
  const user = g.userClubId;
  const gi = best.findIndex((grp) => grp.includes(user));
  sendMessage(g, {
    from: 'Media', kind: 'season', title: `Club World Cup ${year}`,
    body: gi >= 0
      ? `${g.clubs[user].name} are in the Club World Cup! They're in Group ${String.fromCharCode(65 + gi)} with ${best[gi].filter((id) => id !== user).map((id) => g.clubs[id].name).join(', ')}. The first game is on ${cup.rounds[0].date}.`
      : `32 clubs from around the world meet in June. Favourites: ${sorted.slice(0, 4).map((id) => g.clubs[id].name).join(', ')}.`,
  });
}

export function cwcGroupTable(g: GameState, cup: Cup, gi: number): TableRow[] {
  const ids = cup.groups?.[gi] ?? [];
  const rows: Record<number, TableRow> = {};
  for (const id of ids) rows[id] = { clubId: id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, form: [] };
  for (const f of g.fixtures) {
    if (f.comp !== cup.id || f.round > 3 || !f.result || !rows[f.home] || !rows[f.away]) continue;
    const h = rows[f.home];
    const a = rows[f.away];
    const r = f.result;
    h.p++; a.p++;
    h.gf += r.hg; h.ga += r.ag; a.gf += r.ag; a.ga += r.hg;
    if (r.hg > r.ag) { h.w++; a.l++; h.pts += 3; } else if (r.ag > r.hg) { a.w++; h.l++; a.pts += 3; } else { h.d++; a.d++; h.pts++; a.pts++; }
  }
  return Object.values(rows).sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || g.clubs[y.clubId].reputation - g.clubs[x.clubId].reputation);
}

/** After each matchday: pay prize money, eliminate and draw the next round. Returns true when the cup moved on. */
export function progressClubWorldCup(g: GameState, cup: Cup): boolean {
  if (cup.winner !== null) return false;
  const round = cup.current + 1;
  const fx = g.fixtures.filter((f) => f.comp === cup.id && f.round === round);
  if (!fx.length || fx.some((f) => !f.result)) return false;
  const user = g.userClubId;
  const userIn = cup.alive.includes(user);
  cup.current++;
  if (round <= 3) {
    for (const f of fx) {
      const r = f.result!;
      if (r.hg > r.ag) pay(g, f.home, PRIZE.win);
      else if (r.ag > r.hg) pay(g, f.away, PRIZE.win);
      else { pay(g, f.home, PRIZE.draw); pay(g, f.away, PRIZE.draw); }
    }
    if (round < 3) return true;
    const tables = (cup.groups ?? []).map((_, gi) => cwcGroupTable(g, cup, gi).map((r) => r.clubId));
    // 1A v 2B, 1C v 2D, 1E v 2F, 1G v 2H, 1B v 2A, 1D v 2C, 1F v 2E, 1H v 2G
    const pairs: [number, number][] = [];
    for (let i = 0; i < 8; i += 2) pairs.push([tables[i][0], tables[i + 1][1]]);
    for (let i = 0; i < 8; i += 2) pairs.push([tables[i + 1][0], tables[i][1]]);
    cup.alive = pairs.flat();
    pairs.forEach(([a, b], t) => {
      g.fixtures.push({ id: nextId(g), comp: cup.id, date: cup.rounds[3].date, round: 4, roundName: cup.rounds[3].name, home: a, away: b, result: null, knockout: true, neutral: true, tie: t });
      pay(g, a, PRIZE.ko[0]);
      pay(g, b, PRIZE.ko[0]);
    });
    if (userIn) {
      const mine = pairs.find((p) => p.includes(user));
      sendMessage(g, mine
        ? { from: 'Media', kind: 'match', title: 'Club World Cup: through to the round of 16', body: `${g.clubs[user].name} face ${g.clubs[mine[0] === user ? mine[1] : mine[0]].name} on ${cup.rounds[3].date}.` }
        : { from: 'Media', kind: 'match', title: 'Out of the Club World Cup', body: `${g.clubs[user].name} didn't make it out of their group.` });
    }
    return true;
  }
  const results = fx.sort((a, b) => (a.tie ?? 0) - (b.tie ?? 0)).map((f) => ({ w: winnerOf(f)!, l: winnerOf(f) === f.home ? f.away : f.home }));
  for (const r of results) cup.alive = cup.alive.filter((id) => id !== r.l);
  if (results.length === 1) {
    cup.winner = results[0].w;
    cup.runnerUp = results[0].l;
    pay(g, cup.winner, PRIZE.winner);
    return true;
  }
  const next = cup.current; // index of the next round
  for (let i = 0; i + 1 < results.length; i += 2) {
    const [a, b] = [results[i].w, results[i + 1].w];
    g.fixtures.push({ id: nextId(g), comp: cup.id, date: cup.rounds[next].date, round: next + 1, roundName: cup.rounds[next].name, home: a, away: b, result: null, knockout: true, neutral: true, tie: i / 2 });
    pay(g, a, PRIZE.ko[next - 3] ?? 0);
    pay(g, b, PRIZE.ko[next - 3] ?? 0);
  }
  const lost = results.find((r) => r.l === user);
  if (cup.alive.includes(user)) {
    const f = g.fixtures.find((x) => x.comp === cup.id && x.round === next + 1 && (x.home === user || x.away === user))!;
    sendMessage(g, { from: 'Media', kind: 'match', title: `Club World Cup: ${cup.rounds[next].name}`, body: `${g.clubs[user].name} play ${g.clubs[f.home === user ? f.away : f.home].name} on ${f.date}.` });
  } else if (lost) {
    sendMessage(g, { from: 'Media', kind: 'match', title: 'Out of the Club World Cup', body: `${g.clubs[lost.w].name} knocked ${g.clubs[user].name} out in the ${cup.rounds[next - 1].name.toLowerCase()}.` });
  }
  return true;
}
