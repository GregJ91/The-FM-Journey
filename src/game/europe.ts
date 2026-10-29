// Champions League, Europa League and Conference League.
// Format (as UEFA since 2024/25): a 36-team league phase where each club plays 8 (6 in the
// Conference League) different opponents, then 1st-8th go to the round of 16, 9th-24th play
// two-legged knockout play-offs, and 25th-36th are out. Knockout ties are two-legged; the final is one match.
import { pay as payScale } from './economy';
import { EURO_CLUBS, EURO_COMPS, EURO_ENTRANTS_2026, EURO_GUEST_LEAGUE, EURO_PLACES, EURO_PLAYERS, type EuroCompDef } from './data/europe';
import { leagueTable, type TableRow, avoidLeagueClash } from './competitions';
import { addDays, nextWeekday } from './dates';
import { nextId } from './generate';
import { addGuestClubs } from './guests';
import { computeEntrants2002, ensureEurope2002, initialEntrants2002, setupEurope2002 } from './europe2002';
import { sendMessage } from './inbox';
import { winnerOf } from './match';
import { hash, normal, shuffle } from './rng';
import type { Cup, Fixture, GameState } from './types';

export const KO_NAMES = ['Knockout play-offs', 'Round of 16', 'Quarter-finals', 'Semi-finals', 'Final'];

export function euroDef(id: string) {
  return EURO_COMPS.find((c) => c.id === id);
}

/** What the competitions were called in the early 2000s. */
const OLD_NAMES: Record<string, [string, string]> = { UEL: ['UEFA Cup', 'UEFA'], UECL: ['Intertoto Cup', 'UIC'] };

/** Add the rest-of-Europe clubs and the three competitions if they're missing (new games and older saves). */
export function ensureEurope(g: GameState) {
  // CM 01/02 careers: their own guest clubs from the database, and the 2002/03 formats
  if (g.era) return ensureEurope2002(g);
  addGuestClubs(g, EURO_CLUBS, EURO_PLAYERS, EURO_GUEST_LEAGUE);
  // Replace the old single knockout cup from earlier versions
  g.cups = g.cups.filter((c) => c.type !== 'continental' || c.lp !== undefined);
  for (const def of EURO_COMPS) {
    if (g.cups.some((c) => c.id === def.id && c.lp !== undefined)) continue;
    g.cups = g.cups.filter((c) => c.id !== def.id);
    const [name, short] = g.era ? OLD_NAMES[def.id] ?? [def.name, def.short] : [def.name, def.short];
    g.cups.push({ id: def.id, name, short, type: 'continental', country: null, color: def.color, alive: [], rounds: [], current: 0, winner: null, runnerUp: null, teams: [], lp: def.games });
  }
}

/** The real 2026/27 line-ups. */
export function initialEntrants(g: GameState): Record<string, number[]> {
  if (g.era) return initialEntrants2002(g);
  const byName: Record<string, number> = {};
  for (const c of Object.values(g.clubs)) byName[c.name] = c.id;
  const out: Record<string, number[]> = {};
  for (const def of EURO_COMPS) out[def.id] = EURO_ENTRANTS_2026[def.id].map((n) => byName[n]).filter((id) => id !== undefined);
  return topUp(g, out);
}

/** Fill every competition to 36 with the best remaining guest clubs (by reputation, with a little luck). */
function topUp(g: GameState, out: Record<string, number[]>) {
  const taken = new Set(Object.values(out).flat());
  const guests = Object.values(g.clubs)
    .filter((c) => c.leagueId === EURO_GUEST_LEAGUE && !taken.has(c.id))
    .map((c) => ({ id: c.id, score: c.reputation + normal(0, 3) }))
    .sort((a, b) => b.score - a.score);
  for (const def of EURO_COMPS) {
    const list = out[def.id] ?? (out[def.id] = []);
    while (list.length > 36) list.pop();
    while (list.length < 36 && guests.length) list.push(guests.shift()!.id);
  }
  return out;
}

/**
 * Next season's entrants from this season's final league tables, domestic cups and European winners.
 * Call before promotion/relegation.
 */
export function computeEntrants(g: GameState): Record<string, number[]> {
  if (g.era) return computeEntrants2002(g);
  const out: Record<string, number[]> = { UCL: [], UEL: [], UECL: [] };
  const taken = new Set<number>();
  const add = (comp: string, id: number) => { if (!taken.has(id)) { out[comp].push(id); taken.add(id); return true; } return false; };
  const tables: Record<string, number[]> = {};
  for (const l of g.leagues.filter((x) => x.tier === 1)) {
    const t = leagueTable(g, l);
    // No games yet (older saves at season start): go by reputation
    tables[l.country] = t.some((r) => r.p > 0) ? t.map((r) => r.clubId) : [...l.clubIds].sort((a, b) => g.clubs[b].reputation - g.clubs[a].reputation);
  }
  const cupWinner = (comp: string) => g.cups.find((c) => c.id === comp)?.winner ?? null;
  // European winners step up: UEL winner into the UCL, UECL winner into the UEL (top-division clubs only)
  const topFlight = new Set(Object.values(tables).flat());
  const uelW = cupWinner('UEL');
  if (uelW !== null && topFlight.has(uelW)) add('UCL', uelW);
  for (const [country, places] of Object.entries(EURO_PLACES)) {
    const order = tables[country] ?? [];
    let i = 0;
    const take = (comp: 'UCL' | 'UEL' | 'UECL', n: number) => {
      let got = 0;
      while (got < n && i < order.length) if (add(comp, order[i++])) got++;
    };
    take('UCL', places.UCL);
    // Domestic cup winner gets the first Europa League place
    const dom = g.cups.find((c) => c.type === 'domestic' && c.country === country && !c.leagues)?.winner ?? null;
    let uel = places.UEL;
    if (dom !== null && add('UEL', dom)) uel--;
    take('UEL', uel);
    take('UECL', places.UECL);
  }
  const ueclW = cupWinner('UECL');
  if (ueclW !== null && !taken.has(ueclW) && topFlight.has(ueclW)) add('UEL', ueclW);
  return topUp(g, out);
}

// ---------- Schedule ----------

function roundDates(season: number, def: EuroCompDef) {
  const wd = def.weekday;
  const y1 = (md: string) => `${season}-${md}`;
  const y2 = (md: string) => `${season + 1}-${md}`;
  const lp = def.games === 8
    ? [y1('09-15'), y1('09-29'), y1('10-20'), y1('11-03'), y1('11-24'), y1('12-08'), y2('01-19'), y2('01-26')]
    : [y1('10-01'), y1('10-22'), y1('11-05'), y1('11-26'), y1('12-10'), y1('12-17')];
  const ko = [y2('02-16'), y2('03-09'), y2('04-06'), y2('04-27')];
  return {
    lp: lp.map((d) => nextWeekday(d, wd)),
    ko: [...ko.map((d) => nextWeekday(d, wd)), nextWeekday(y2(def.finalDate), def.id === 'UCL' ? 6 : 3)],
  };
}

export function setupEurope(g: GameState, entrants: Record<string, number[]>) {
  if (g.era) return setupEurope2002(g, entrants);
  for (const def of EURO_COMPS) {
    const cup = g.cups.find((c) => c.id === def.id);
    if (!cup) continue;
    const dates = roundDates(g.season, def);
    cup.teams = [...(entrants[def.id] ?? [])];
    cup.alive = [...cup.teams];
    cup.lp = def.games;
    cup.current = 0;
    cup.winner = null;
    cup.runnerUp = null;
    cup.rounds = [
      ...dates.lp.map((date, i) => ({ name: `League phase · Matchday ${i + 1}`, date })),
      ...dates.ko.map((date, i) => ({ name: KO_NAMES[i], date })),
    ];
    drawLeaguePhase(g, cup, def, dates.lp);
    // Participation fee
    for (const id of cup.teams) pay(g, id, def.prize.entry);
  }
}

/** League phase draw: every club plays `games` different opponents, avoiding clubs from its own country where possible. */
function drawLeaguePhase(g: GameState, cup: Cup, def: EuroCompDef, dates: string[]) {
  const teams = cup.teams!;
  if (teams.length < 2) return;
  const country = (id: number) => g.clubs[id].country;
  let best: [number, number][][] | null = null;
  let bestClash = Infinity;
  for (let attempt = 0; attempt < 60 && bestClash > 0; attempt++) {
    const arr = shuffle([...teams]);
    if (arr.length % 2) arr.push(-1);
    const n = arr.length;
    const rounds: [number, number][][] = [];
    let clash = 0;
    for (let r = 0; r < Math.min(def.games, n - 1); r++) {
      const pairs: [number, number][] = [];
      for (let i = 0; i < n / 2; i++) {
        const a = arr[i];
        const b = arr[n - 1 - i];
        if (a === -1 || b === -1) continue;
        if (country(a) === country(b)) clash++;
        pairs.push([a, b]);
      }
      rounds.push(pairs);
      arr.splice(1, 0, arr.pop()!);
    }
    if (clash < bestClash) { bestClash = clash; best = rounds; }
  }
  // Balance home and away games
  const homes: Record<number, number> = {};
  best!.forEach((pairs, r) => {
    for (const [a, b] of pairs) {
      const ha = homes[a] ?? 0;
      const hb = homes[b] ?? 0;
      const [home, away] = ha < hb || (ha === hb && hash(a * 31 + b + r) < 0.5) ? [a, b] : [b, a];
      homes[home] = (homes[home] ?? 0) + 1;
      const f: Fixture = { id: nextId(g), comp: cup.id, date: dates[r], round: r + 1, roundName: cup.rounds[r].name, home, away, result: null };
      g.fixtures.push(f);
      avoidLeagueClash(g, f);
    }
  });
}

// ---------- Tables & progress ----------

export function europeTable(g: GameState, cup: Cup): TableRow[] {
  const rows: Record<number, TableRow> = {};
  for (const id of cup.teams ?? []) rows[id] = { clubId: id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, form: [] };
  const fx = g.fixtures.filter((f) => f.comp === cup.id && f.round <= (cup.lp ?? 0) && f.result).sort((a, b) => (a.date < b.date ? -1 : 1));
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
  out.sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || y.w - x.w || g.clubs[y.clubId].reputation - g.clubs[x.clubId].reputation);
  return out;
}

function pay(g: GameState, clubId: number, amount: number) {
  const c = g.clubs[clubId];
  if (!c || !amount) return;
  const v = Math.round(payScale(amount));
  c.balance += v;
  c.seasonIncome += v;
}

/** Create a knockout tie: two legs (higher seed at home second), or a single neutral final. */
function makeTie(g: GameState, cup: Cup, round: number, tie: number, high: number, low: number) {
  const r = cup.rounds[round - 1];
  if (r.name === 'Final') {
    const fin: Fixture = { id: nextId(g), comp: cup.id, date: r.date, round, roundName: r.name, home: high, away: low, result: null, knockout: true, neutral: true, tie };
    g.fixtures.push(fin);
    avoidLeagueClash(g, fin);
    return;
  }
  const l1: Fixture = { id: nextId(g), comp: cup.id, date: r.date, round, roundName: `${r.name} · 1st leg`, home: low, away: high, result: null, leg: 1, tie };
  const l2: Fixture = { id: nextId(g), comp: cup.id, date: addDays(r.date, 7), round, roundName: `${r.name} · 2nd leg`, home: high, away: low, result: null, knockout: true, leg: 2, firstLeg: l1.id, tie };
  g.fixtures.push(l1, l2);
  avoidLeagueClash(g, l1);
  avoidLeagueClash(g, l2);
}

/** Winners of a knockout round, in bracket order. */
function roundWinners(g: GameState, cup: Cup, round: number) {
  return g.fixtures
    .filter((f) => f.comp === cup.id && f.round === round && f.leg !== 1)
    .sort((a, b) => (a.tie ?? 0) - (b.tie ?? 0))
    .map((f) => ({ winner: winnerOf(f)!, loser: winnerOf(f) === f.home ? f.away : f.home, f }));
}

/**
 * Call after each match day. When every match of the current round is done, pays prize money,
 * eliminates clubs and draws the next round. Returns true when the cup moved on.
 */
export function progressEurope(g: GameState, cup: Cup): boolean {
  const def = euroDef(cup.id);
  if (!def || cup.winner !== null) return false;
  const round = cup.current + 1;
  const fx = g.fixtures.filter((f) => f.comp === cup.id && f.round === round);
  if (!fx.length || fx.some((f) => !f.result)) return false;
  const lp = cup.lp ?? def.games;
  const user = g.userClubId;
  const userIn = cup.alive.includes(user);

  if (round <= lp) {
    for (const f of fx) {
      const r = f.result!;
      if (r.hg > r.ag) pay(g, f.home, def.prize.win);
      else if (r.ag > r.hg) pay(g, f.away, def.prize.win);
      else { pay(g, f.home, def.prize.draw); pay(g, f.away, def.prize.draw); }
    }
    cup.current++;
    if (round < lp) return true;
    // League phase over
    const table = europeTable(g, cup).map((r) => r.clubId);
    const seeds = table.slice(0, 8);
    const playoff = table.slice(8, 24);
    cup.alive = [...seeds, ...playoff];
    for (const id of playoff) pay(g, id, def.prize.ko[0]);
    for (const id of seeds) pay(g, id, def.prize.ko[1]);
    // 9th v 24th, 10th v 23rd ... 16th v 17th; the higher-placed club is at home in the second leg
    for (let j = 0; j < 8; j++) makeTie(g, cup, lp + 1, j, playoff[j], playoff[15 - j]);
    if (userIn) {
      const pos = table.indexOf(user) + 1;
      sendMessage(g, {
        from: 'Media', kind: 'match', title: `${cup.name}: league phase finished ${nth(pos)}`,
        body: pos <= 8 ? `${g.clubs[user].name} finished in the top eight and go straight into the round of 16.` : pos <= 24 ? `${g.clubs[user].name} go into the knockout play-offs.${tieText(g, cup, lp + 1)}` : `${g.clubs[user].name} finished ${nth(pos)} and are out of the ${cup.name}.`,
      });
    }
    return true;
  }

  // Knockout round finished
  const results = roundWinners(g, cup, round);
  for (const r of results) cup.alive = cup.alive.filter((id) => id !== r.loser);
  cup.current++;
  const koIndex = round - lp; // 1 = play-offs ... 5 = final
  const lostUser = results.find((r) => r.loser === user);
  if (koIndex === 5) {
    const w = results[0];
    cup.winner = w.winner;
    cup.runnerUp = w.loser;
    pay(g, w.winner, def.prize.winner);
    return true;
  }
  let next: [number, number][] = [];
  if (koIndex === 1) {
    // Round of 16: seed k meets the winner of the play-off involving the (17-k)th-placed club, in bracket order
    const table = europeTable(g, cup).map((r) => r.clubId);
    const seeds = table.slice(0, 8);
    const order = [0, 7, 3, 4, 1, 6, 2, 5];
    next = order.map((k) => [seeds[k], results[7 - k].winner]);
  } else {
    for (let i = 0; i + 1 < results.length; i += 2) {
      const [a, b] = shuffle([results[i].winner, results[i + 1].winner]);
      next.push([a, b]);
    }
  }
  next.forEach(([high, low], t) => {
    makeTie(g, cup, round + 1, t, high, low);
    // Reaching a round pays its prize (the top eight were already paid for the round of 16)
    if (koIndex > 1) pay(g, high, def.prize.ko[koIndex]);
    pay(g, low, def.prize.ko[koIndex]);
  });
  if (cup.alive.includes(user)) {
    sendMessage(g, { from: 'Media', kind: 'match', title: `${cup.name}: ${cup.rounds[round].name} draw`, body: `Through to the ${cup.rounds[round].name.toLowerCase()}!${tieText(g, cup, round + 1)}` });
  } else if (lostUser) {
    sendMessage(g, { from: 'Media', kind: 'match', title: `Knocked out of the ${cup.name}`, body: `${g.clubs[lostUser.winner].name} knocked ${g.clubs[user].name} out in the ${cup.rounds[round - 1].name.toLowerCase()}.` });
  }
  return true;
}

function nth(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function tieText(g: GameState, cup: Cup, round: number) {
  const mine = g.fixtures.filter((f) => f.comp === cup.id && f.round === round && (f.home === g.userClubId || f.away === g.userClubId)).sort((a, b) => (a.date < b.date ? -1 : 1));
  if (!mine.length) return '';
  const f = mine[0];
  const opp = g.clubs[f.home === g.userClubId ? f.away : f.home];
  return mine.length > 1
    ? ` They'll face ${opp.name}: first leg ${f.home === g.userClubId ? 'at home' : 'away'} on ${f.date}, second leg on ${mine[1].date}.`
    : ` They'll face ${opp.name} in the final on ${f.date}.`;
}

/** Competitions a club is in this season. */
export function europeFor(g: GameState, clubId: number) {
  return g.cups.filter((c) => c.type === 'continental' && (c.teams ?? c.alive).includes(clubId));
}
