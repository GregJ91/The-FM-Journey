// Youth competitions: youth leagues (Premier League 2, Primavera …), the FA Youth Cup and the
// UEFA Youth League. Youth matches are simulated from the strength of each club's youth XI (not
// with the full match engine). Players get minutes, ratings, goals and development from them.
// Fringe first-team players under the age limit play too, as at real clubs.
import { FA_YOUTH_CUP, UEFA_YOUTH_LEAGUE, YOUTH_LEAGUES } from './data/youth';
import { addDays, nextWeekday } from './dates';
import { FORMATIONS } from './formations';
import { sendMessage } from './inbox';
import { randomInjury } from './match';
import { age, ratingAt } from './ratings';
import { chance, normal, rand, shuffle, weighted } from './rng';
import { pickLineup } from './selection';
import type { Club, GameState, Player, YouthComp, YouthFixture } from './types';

const SHOOT: Record<string, number> = { ST: 4, AMC: 3, AML: 3, AMR: 3, ML: 1.5, MR: 1.5, MC: 1.4, DM: 0.6, DL: 0.4, DR: 0.4, DC: 0.5, GK: 0 };
const CREATE: Record<string, number> = { AMC: 4, AML: 3.5, AMR: 3.5, MC: 3, ML: 3, MR: 3, ST: 2, DL: 1.8, DR: 1.8, DM: 1.5, DC: 0.4, GK: 0.1 };
/** Youth minutes count for half as much as first-team minutes towards development. */
export const YOUTH_MINS_WEIGHT = 0.5;

/** Level used for youth-team places the club has no eligible player for. */
function fillLevel(club: Club) {
  return 34 + club.reputation * 0.22 + club.facilities.youth * 2;
}

function roundRobinOnce(ids: number[]) {
  const arr = shuffle([...ids]);
  if (arr.length % 2) arr.push(-1);
  const n = arr.length;
  const rounds: [number, number][][] = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs: [number, number][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a !== -1 && b !== -1) pairs.push(r % 2 ? [b, a] : [a, b]);
    }
    rounds.push(pairs);
    arr.splice(1, 0, arr.pop()!);
  }
  return rounds;
}

/** Evenly spaced Mondays between two dates. */
function mondays(from: string, to: string, n: number) {
  const first = nextWeekday(from, 1);
  const span = Math.max(1, Math.round((Date.parse(to) - Date.parse(first)) / 86400000 / 7));
  return Array.from({ length: n }, (_, i) => addDays(first, 7 * Math.round((i * span) / Math.max(1, n - 1))));
}

function seedOrder(n: number): number[] {
  if (n === 1) return [0];
  return seedOrder(n / 2).flatMap((s) => [s, n - 1 - s]);
}

/** Set up this season's youth competitions (called at the start of the season, after the European draws). */
export function setupYouth(g: GameState) {
  const comps: YouthComp[] = [];
  const s = g.season;
  for (const def of YOUTH_LEAGUES) {
    const league = g.leagues.find((l) => l.id === def.league);
    if (!league) continue;
    const rr = roundRobinOnce(league.clubIds);
    const dates = mondays(`${s}-08-17`, `${s + 1}-05-03`, rr.length);
    const comp: YouthComp = {
      id: def.id, name: def.name, short: def.short, color: def.color, kind: 'league', age: def.age,
      clubs: [...league.clubIds], alive: [...league.clubIds], current: 0, winner: null, runnerUp: null,
      rounds: dates.map((date, i) => ({ name: `Matchday ${i + 1}`, date })), fixtures: [],
    };
    rr.forEach((pairs, i) => { for (const [h, a] of pairs) comp.fixtures.push({ id: g.nextId++, d: dates[i], r: i + 1, h, a }); });
    comps.push(comp);
  }
  // FA Youth Cup: clubs from the top four English divisions, single-match knockout
  const fa = g.leagues.filter((l) => FA_YOUTH_CUP.leagues.includes(l.id)).flatMap((l) => l.clubIds);
  const faRounds = Math.ceil(Math.log2(fa.length));
  const faDates = [`${s}-11-05`, `${s}-12-03`, `${s + 1}-01-14`, `${s + 1}-02-04`, `${s + 1}-03-04`, `${s + 1}-03-25`, `${s + 1}-04-15`, `${s + 1}-04-29`].slice(-faRounds).map((d) => nextWeekday(d, 4));
  const faNames = ['First round', 'Round of 64', 'Round of 32', 'Round of 16', 'Quarter-finals', 'Semi-finals', 'Final'].slice(-faRounds);
  const faComp: YouthComp = {
    id: FA_YOUTH_CUP.id, name: FA_YOUTH_CUP.name, short: FA_YOUTH_CUP.short, color: FA_YOUTH_CUP.color, kind: 'cup', age: FA_YOUTH_CUP.age,
    clubs: [...fa], alive: [...fa], current: 0, winner: null, runnerUp: null,
    rounds: faNames.map((name, i) => ({ name, date: faDates[i] })), fixtures: [],
  };
  drawCupRound(g, faComp);
  comps.push(faComp);
  // UEFA Youth League: the Champions League clubs' youth teams; 6-game league phase, top 16 into knockouts
  const ucl = g.cups.find((c) => c.id === 'UCL');
  if (ucl?.teams?.length) {
    const teams = ucl.teams;
    const lpDates = ucl.rounds.slice(0, 6).map((r) => r.date);
    const koDates = [`${s + 1}-02-10`, `${s + 1}-03-10`, `${s + 1}-04-16`, `${s + 1}-04-19`];
    const comp: YouthComp = {
      id: UEFA_YOUTH_LEAGUE.id, name: UEFA_YOUTH_LEAGUE.name, short: UEFA_YOUTH_LEAGUE.short, color: UEFA_YOUTH_LEAGUE.color, kind: 'uyl', age: UEFA_YOUTH_LEAGUE.age,
      clubs: [...teams], alive: [...teams], current: 0, lp: 6, winner: null, runnerUp: null,
      rounds: [...lpDates.map((date, i) => ({ name: `League phase · Matchday ${i + 1}`, date })), ...['Round of 16', 'Quarter-finals', 'Semi-finals', 'Final'].map((name, i) => ({ name, date: koDates[i] }))],
      fixtures: [],
    };
    roundRobinOnce(teams).slice(0, 6).forEach((pairs, i) => { for (const [h, a] of pairs) comp.fixtures.push({ id: g.nextId++, d: lpDates[i], r: i + 1, h, a }); });
    comps.push(comp);
  }
  g.youth = comps;
  for (const p of Object.values(g.players)) p.ys = undefined;
}

function drawCupRound(g: GameState, comp: YouthComp) {
  const r = comp.current;
  if (r >= comp.rounds.length) return;
  const pow = Math.pow(2, Math.floor(Math.log2(comp.alive.length)));
  // Extra first-round ties bring the field down to a power of two; the rest get a bye
  const playing = comp.alive.length > pow ? shuffle([...comp.alive]).slice(0, (comp.alive.length - pow) * 2) : shuffle([...comp.alive]);
  for (let i = 0; i + 1 < playing.length; i += 2) comp.fixtures.push({ id: g.nextId++, d: comp.rounds[r].date, r: r + 1, h: playing[i], a: playing[i + 1], t: i / 2 });
}

// ---------- Match simulation ----------

interface YouthSide { club: Club; xi: { p: Player; pos: string }[]; bench: Player[]; strength: number }

function youthSide(g: GameState, clubId: number, ageLimit: number): YouthSide {
  const club = g.clubs[clubId];
  const lineup = new Set(club.lineup);
  const eligible: Player[] = [];
  for (const p of Object.values(g.players)) {
    if (p.clubId !== clubId || p.injury || p.away || p.suspended > 0) continue;
    if (age(p, g.date) > ageLimit) continue;
    // First-team regulars don't play for the youth team; fringe youngsters do
    if (p.squad === 'first' && lineup.has(p.id)) continue;
    eligible.push(p);
  }
  const slots = FORMATIONS[club.tactics.formation] ?? FORMATIONS['4-3-3'];
  const { lineup: xiIds, subs } = pickLineup(club, eligible, true);
  const base = fillLevel(club);
  const xi: { p: Player; pos: string }[] = [];
  let sum = 0;
  xiIds.forEach((id, i) => {
    const p = id !== null ? g.players[id] : null;
    if (p) { xi.push({ p, pos: slots[i].pos }); sum += Math.max(ratingAt(p, slots[i].pos), base - 6); } else sum += base;
  });
  return { club, xi, bench: subs.slice(0, 5).map((id) => g.players[id]).filter(Boolean), strength: sum / slots.length };
}

function poisson(l: number) {
  const L = Math.exp(-l);
  let k = 0;
  let p = 1;
  do { k++; p *= rand(); } while (p > L);
  return k - 1;
}

function playYouthMatch(g: GameState, comp: YouthComp, f: YouthFixture, knockout: boolean) {
  const sides = [youthSide(g, f.h, comp.age), youthSide(g, f.a, comp.age)];
  const neutral = comp.kind !== 'league' && f.r === comp.rounds.length;
  const home = neutral ? 0 : 1.5;
  const la = 1.4 * Math.exp((sides[0].strength + home - sides[1].strength) / 14);
  const lb = 1.4 * Math.exp((sides[1].strength - home - sides[0].strength) / 14);
  const goals = [poisson(la), poisson(lb)];
  f.hg = goals[0];
  f.ag = goals[1];
  if (knockout && goals[0] === goals[1]) {
    const aWins = chance(0.5 + (sides[0].strength - sides[1].strength) * 0.01);
    const lose = 2 + Math.floor(rand() * 3);
    f.p = aWins ? [lose + 1, lose] : [lose, lose + 1];
  }
  sides.forEach((side, si) => {
    const scored = goals[si];
    const conceded = goals[1 - si];
    const tally: Record<number, { g: number; a: number }> = {};
    const missing = 11 - side.xi.length;
    for (let k = 0; k < scored; k++) {
      const shooter = weighted([...side.xi.map((x) => ({ id: x.p.id, w: SHOOT[x.pos] ?? 1 })), { id: -1, w: missing * 1.5 }], (o) => o.w).id;
      if (shooter !== -1) (tally[shooter] ??= { g: 0, a: 0 }).g++;
      if (chance(0.75)) {
        const creator = weighted([...side.xi.filter((x) => x.p.id !== shooter).map((x) => ({ id: x.p.id, w: CREATE[x.pos] ?? 1 })), { id: -1, w: missing * 1.5 }], (o) => o.w).id;
        if (creator !== -1) (tally[creator] ??= { g: 0, a: 0 }).a++;
      }
    }
    const teamBonus = (scored - conceded) * 0.18 + (scored > conceded ? 0.2 : scored < conceded ? -0.2 : 0);
    const played: { p: Player; mins: number }[] = [...side.xi.map((x) => ({ p: x.p, mins: 90 })), ...side.bench.slice(0, 3).map((p) => ({ p, mins: 25 }))];
    for (const { p, mins } of played) {
      const t = tally[p.id] ?? { g: 0, a: 0 };
      const r = Math.max(4.5, Math.min(9.8, 6.5 + teamBonus + t.g * 0.8 + t.a * 0.45 + normal(0, 0.45) - (mins < 90 ? 0.2 : 0)));
      const ys = (p.ys ??= { apps: 0, mins: 0, goals: 0, assists: 0, rs: 0 });
      ys.apps++;
      ys.mins += mins;
      ys.goals += t.g;
      ys.assists += t.a;
      ys.rs += r;
      p.monthMins += mins * YOUTH_MINS_WEIGHT;
      p.monthRatings.push(r);
      if (p.squad === 'first') p.condition = Math.min(p.condition, 85);
      if (mins === 90 && chance(0.004)) {
        p.injury = randomInjury(0.6);
        if (p.clubId === g.userClubId) {
          sendMessage(g, { from: 'Medical Team', kind: 'injury', title: `${p.first ? p.first[0] + '. ' : ''}${p.last} injured playing for the youth team`, body: `${p.first} ${p.last} picked up a ${p.injury.name.toLowerCase()} in a ${comp.name} match and will be out for around ${Math.ceil(p.injury.days / 7)} week(s).` });
          p.injury.reported = true;
        }
      }
    }
  });
}

export function youthWinner(f: YouthFixture) {
  if (f.hg === undefined || f.ag === undefined) return null;
  if (f.hg !== f.ag) return f.hg > f.ag ? f.h : f.a;
  if (f.p) return f.p[0] > f.p[1] ? f.h : f.a;
  return null;
}

export interface YouthRow { clubId: number; p: number; w: number; d: number; l: number; gf: number; ga: number; pts: number }

export function youthTable(comp: YouthComp, g?: GameState): YouthRow[] {
  const rows: Record<number, YouthRow> = {};
  for (const id of comp.clubs) rows[id] = { clubId: id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
  const lp = comp.kind === 'uyl' ? comp.lp! : Infinity;
  for (const f of comp.fixtures) {
    if (f.r > lp || f.hg === undefined || f.ag === undefined || !rows[f.h] || !rows[f.a]) continue;
    const h = rows[f.h];
    const a = rows[f.a];
    h.p++; a.p++;
    h.gf += f.hg; h.ga += f.ag; a.gf += f.ag; a.ga += f.hg;
    if (f.hg > f.ag) { h.w++; a.l++; h.pts += 3; } else if (f.ag > f.hg) { a.w++; h.l++; a.pts += 3; } else { h.d++; a.d++; h.pts++; a.pts++; }
  }
  return Object.values(rows).sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || (g ? g.clubs[y.clubId].reputation - g.clubs[x.clubId].reputation : 0));
}

function awardYouth(g: GameState, comp: YouthComp, winner: number, runnerUp: number | null) {
  comp.winner = winner;
  comp.runnerUp = runnerUp;
  const c = g.clubs[winner];
  (c.youthTrophies ??= []).push({ season: g.season, name: comp.name });
  if (winner === g.userClubId) sendMessage(g, { from: 'Head of Youth Development', kind: 'youth', title: `🏆 ${comp.name} winners!`, body: `${c.name}'s youngsters have won the ${comp.name}. A great sign for the future of the club.` });
  else if (runnerUp === g.userClubId) sendMessage(g, { from: 'Head of Youth Development', kind: 'youth', title: `${comp.name} final lost`, body: `${c.name} beat our youth team in the ${comp.name} final.` });
}

function advance(g: GameState, comp: YouthComp) {
  const round = comp.current + 1;
  const fx = comp.fixtures.filter((f) => f.r === round);
  if (fx.some((f) => f.hg === undefined)) return;
  comp.current++;
  if (comp.kind === 'league') {
    if (comp.current === comp.rounds.length) {
      const t = youthTable(comp, g);
      awardYouth(g, comp, t[0].clubId, t[1]?.clubId ?? null);
    }
    return;
  }
  if (comp.kind === 'uyl' && round <= comp.lp!) {
    if (round < comp.lp!) return;
    const seeds = youthTable(comp, g).slice(0, 16).map((r) => r.clubId);
    comp.alive = seeds;
    const order = seedOrder(16);
    for (let i = 0; i < 16; i += 2) comp.fixtures.push({ id: g.nextId++, d: comp.rounds[round].date, r: round + 1, h: seeds[order[i]], a: seeds[order[i + 1]], t: i / 2 });
    return;
  }
  // Knockout round done
  const done = fx.sort((a, b) => (a.t ?? 0) - (b.t ?? 0));
  for (const f of done) {
    const w = youthWinner(f)!;
    comp.alive = comp.alive.filter((id) => id !== (w === f.h ? f.a : f.h));
  }
  if (comp.alive.length === 1) {
    const final = done[done.length - 1];
    awardYouth(g, comp, comp.alive[0], final.h === comp.alive[0] ? final.a : final.h);
    return;
  }
  if (comp.kind === 'uyl') {
    const winners = done.map((f) => youthWinner(f)!);
    for (let i = 0; i + 1 < winners.length; i += 2) comp.fixtures.push({ id: g.nextId++, d: comp.rounds[comp.current].date, r: comp.current + 1, h: winners[i], a: winners[i + 1], t: i / 2 });
  } else {
    drawCupRound(g, comp);
  }
}

/** Play today's youth matches. */
export function youthDay(g: GameState) {
  for (const comp of g.youth ?? []) {
    if (comp.winner !== null) continue;
    const today = comp.fixtures.filter((f) => f.d === g.date && f.hg === undefined);
    if (!today.length) continue;
    const ko = comp.kind === 'cup' || (comp.kind === 'uyl' && today[0].r > comp.lp!);
    for (const f of today) playYouthMatch(g, comp, f, ko);
    advance(g, comp);
  }
}

/** The youth competitions a club is in this season. */
export function youthCompsFor(g: GameState, clubId: number) {
  return (g.youth ?? []).filter((c) => c.clubs.includes(clubId));
}
