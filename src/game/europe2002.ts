// European competitions in CM 01/02 careers, in their 2002/03 formats:
// - Champions League: third qualifying round (two legs, August), group stage of 8 x 4, second group stage of 4 x 4,
//   two-legged quarter- and semi-finals, one-off final. Qualifying losers drop into the UEFA Cup first round,
//   third-placed clubs in the first group stage into its third round.
// - UEFA Cup: two-legged rounds (first to fourth, quarter- and semi-finals), one-off final.
// - Intertoto Cup: summer rounds; the three finals winners go into the UEFA Cup.
import { pay as payScale } from './economy';
import { EURO_COMPS, EURO_GUEST_LEAGUE } from './data/europe';
import { leagueTable, type TableRow, avoidLeagueClash } from './competitions';
import { addDays, nextWeekday } from './dates';
import { nextId } from './generate';
import { sendMessage } from './inbox';
import { winnerOf } from './match';
import { normal, shuffle } from './rng';
import type { Club, Cup, Fixture, GameState } from './types';

type Kind = NonNullable<Cup['kinds']>[number];
interface RoundDef { name: string; md: string; next?: boolean; kind: Kind; gap?: number; wd: number }

export const UIC = 'UECL';
const GROUP_LETTERS = 'ABCDEFGH';

const ROUNDS: Record<string, RoundDef[]> = {
  UCL: [
    { name: 'Third qualifying round', md: '08-13', kind: 'ko', gap: 14, wd: 3 },
    ...['09-17', '09-24', '10-01', '10-22', '10-29', '11-12'].map((md, i) => ({ name: `Group stage · Matchday ${i + 1}`, md, kind: 'g1' as Kind, wd: 3 })),
    ...['11-26', '12-10'].map((md, i) => ({ name: `Second group stage · Matchday ${i + 1}`, md, kind: 'g2' as Kind, wd: 3 })),
    ...['02-18', '02-25', '03-11', '03-18'].map((md, i) => ({ name: `Second group stage · Matchday ${i + 3}`, md, next: true, kind: 'g2' as Kind, wd: 3 })),
    { name: 'Quarter-finals', md: '04-08', next: true, kind: 'ko', gap: 14, wd: 3 },
    { name: 'Semi-finals', md: '05-06', next: true, kind: 'ko', gap: 7, wd: 3 },
    { name: 'Final', md: '05-28', next: true, kind: 'final', wd: 3 },
  ],
  UEL: [
    { name: 'First round', md: '09-19', kind: 'ko', gap: 14, wd: 4 },
    { name: 'Second round', md: '10-31', kind: 'ko', gap: 14, wd: 4 },
    { name: 'Third round', md: '11-28', kind: 'ko', gap: 14, wd: 4 },
    { name: 'Fourth round', md: '02-20', next: true, kind: 'ko', gap: 7, wd: 4 },
    { name: 'Quarter-finals', md: '03-13', next: true, kind: 'ko', gap: 7, wd: 4 },
    { name: 'Semi-finals', md: '04-10', next: true, kind: 'ko', gap: 14, wd: 4 },
    { name: 'Final', md: '05-21', next: true, kind: 'final', wd: 3 },
  ],
  [UIC]: [
    { name: 'Third round', md: '07-13', kind: 'ko', gap: 7, wd: 6 },
    { name: 'Semi-finals', md: '07-24', kind: 'ko', gap: 7, wd: 3 },
    { name: 'Finals', md: '08-06', kind: 'ko', gap: 14, wd: 2 },
  ],
};

/** Places for the leagues the game plays: straight into the groups, third qualifying round, UEFA Cup, Intertoto. */
const PLACES: Record<string, { d: number; q: number; uel: number; uic: number }> = {
  ENG: { d: 2, q: 2, uel: 3, uic: 2 },
  ESP: { d: 2, q: 2, uel: 3, uic: 2 },
  ITA: { d: 2, q: 2, uel: 3, uic: 2 },
  GER: { d: 2, q: 1, uel: 3, uic: 2 },
  FRA: { d: 2, q: 1, uel: 3, uic: 2 },
  SCO: { d: 0, q: 2, uel: 2, uic: 1 },
};
const SIZES = { d: 16, q: 32, uic: 24 };

/** Who actually qualified from 2001/02 (club names as in the CM 01/02 database). */
const REAL_2002: Record<'d' | 'q' | 'uel' | 'uic', string[]> = {
  d: ['Real Madrid', 'Valencia', 'Deportivo', 'Arsenal', 'Liverpool', 'Juventus', 'Roma', 'Dortmund', 'Leverkusen', 'Lyon', 'Lens'],
  q: ['Barcelona', 'Manchester United', 'Newcastle United', 'Inter', 'Milan', 'FC Bayern', 'Auxerre', 'Celtic', 'Rangers'],
  uel: ['Leeds United', 'Chelsea', 'Blackburn Rovers', 'Celta', 'Betis', 'Chievo', 'Lazio', 'Parma', 'Hertha BSC', 'Schalke 04', 'Werder Bremen', 'Paris-SG', 'Bordeaux', 'Livingston', 'Aberdeen'],
  uic: ['Fulham', 'Aston Villa', 'Málaga', 'Villarreal'],
};

export function isFormat2002(cup: Cup) {
  return cup.format === '2002';
}

/** The three competitions with their old names and formats. */
export function ensureEurope2002(g: GameState) {
  const names: Record<string, [string, string]> = { UCL: ['Champions League', 'UCL'], UEL: ['UEFA Cup', 'UEFA'], [UIC]: ['Intertoto Cup', 'UIC'] };
  for (const def of EURO_COMPS) {
    const existing = g.cups.find((c) => c.id === def.id);
    if (existing?.format === '2002') continue;
    g.cups = g.cups.filter((c) => c.id !== def.id);
    const [name, short] = names[def.id];
    g.cups.push({ id: def.id, name, short, type: 'continental', country: null, color: def.color, alive: [], rounds: [], current: 0, winner: null, runnerUp: null, teams: [], format: '2002' });
  }
}

// ---------- Entrants ----------

type Entrants = { UCL: number[]; UCLQ: number[]; UEL: number[]; UECL: number[] };

function fill(g: GameState, out: Entrants, holders: number | null) {
  const taken = new Set(Object.values(out).flat());
  if (holders !== null && !out.UCL.includes(holders)) {
    out.UCLQ = out.UCLQ.filter((id) => id !== holders);
    out.UEL = out.UEL.filter((id) => id !== holders);
    out.UECL = out.UECL.filter((id) => id !== holders);
    out.UCL.unshift(holders);
    taken.add(holders);
  }
  // The rest of Europe by standing (reputation, with a little luck): the best into the Champions League,
  // the smallest into the Intertoto Cup, everyone else into the UEFA Cup
  const guests = Object.values(g.clubs).filter((c) => c.leagueId === EURO_GUEST_LEAGUE && !taken.has(c.id))
    .map((c) => ({ id: c.id, s: c.reputation + normal(0, 3) })).sort((a, b) => b.s - a.s).map((x) => x.id);
  while (out.UCL.length > SIZES.d) out.UCLQ.unshift(out.UCL.pop()!);
  while (out.UCL.length < SIZES.d && guests.length) out.UCL.push(guests.shift()!);
  while (out.UCLQ.length > SIZES.q) out.UEL.unshift(out.UCLQ.pop()!);
  while (out.UCLQ.length < SIZES.q && guests.length) out.UCLQ.push(guests.shift()!);
  while (out.UECL.length < SIZES.uic && guests.length) out.UECL.push(guests.pop()!);
  out.UEL.push(...guests);
  return out;
}

function tables(g: GameState) {
  const t: Record<string, number[]> = {};
  for (const l of g.leagues.filter((x) => x.tier === 1)) {
    const rows = leagueTable(g, l);
    t[l.country] = rows.some((r) => r.p > 0) ? rows.map((r) => r.clubId) : [...l.clubIds].sort((a, b) => g.clubs[b].reputation - g.clubs[a].reputation);
  }
  return t;
}

/** Next season's entrants from the final tables, domestic cups and the Champions League holders. */
export function computeEntrants2002(g: GameState): Record<string, number[]> {
  const out: Entrants = { UCL: [], UCLQ: [], UEL: [], UECL: [] };
  const taken = new Set<number>();
  const add = (k: keyof Entrants, id: number) => { if (taken.has(id)) return false; out[k].push(id); taken.add(id); return true; };
  const t = tables(g);
  for (const [country, p] of Object.entries(PLACES)) {
    const order = t[country] ?? [];
    let i = 0;
    const take = (k: keyof Entrants, n: number) => { let got = 0; while (got < n && i < order.length) if (add(k, order[i++])) got++; };
    take('UCL', p.d);
    take('UCLQ', p.q);
    // The domestic cup winner takes the first UEFA Cup place
    const cupWinner = g.cups.find((c) => c.type === 'domestic' && c.country === country)?.winner ?? null;
    let uel = p.uel;
    if (cupWinner !== null && add('UEL', cupWinner)) uel--;
    take('UEL', uel);
    take('UECL', p.uic);
  }
  return fill(g, out, g.cups.find((c) => c.id === 'UCL')?.winner ?? null);
}

/** 2002/03: the clubs that really qualified from 2001/02, topped up by league standing and reputation. */
export function initialEntrants2002(g: GameState): Record<string, number[]> {
  const byName = new Map(Object.values(g.clubs).map((c) => [c.name, c.id]));
  const out: Entrants = { UCL: [], UCLQ: [], UEL: [], UECL: [] };
  const taken = new Set<number>();
  const keys: [keyof typeof REAL_2002, keyof Entrants][] = [['d', 'UCL'], ['q', 'UCLQ'], ['uel', 'UEL'], ['uic', 'UECL']];
  for (const [k, e] of keys) for (const n of REAL_2002[k]) { const id = byName.get(n); if (id !== undefined && !taken.has(id)) { out[e].push(id); taken.add(id); } }
  // Any places still open in the playable leagues go by reputation
  const t = tables(g);
  for (const [country, p] of Object.entries(PLACES)) {
    const order = (t[country] ?? []).filter((id) => !taken.has(id));
    const count = (e: keyof Entrants) => out[e].filter((id) => g.clubs[id].country === country).length;
    for (const [e, n] of [['UCL', p.d], ['UCLQ', p.q], ['UEL', p.uel], ['UECL', p.uic]] as [keyof Entrants, number][]) {
      for (let k = count(e); k < n && order.length; k++) { const id = order.shift()!; out[e].push(id); taken.add(id); }
    }
  }
  return fill(g, out, null);
}

// ---------- Setup ----------

function roundDate(season: number, r: RoundDef) {
  return nextWeekday(`${r.next ? season + 1 : season}-${r.md}`, r.wd);
}

export function setupEurope2002(g: GameState, entrants: Record<string, number[]>) {
  for (const id of ['UCL', 'UEL', UIC]) {
    const cup = g.cups.find((c) => c.id === id);
    if (!cup) continue;
    const defs = ROUNDS[id];
    cup.rounds = defs.map((r) => ({ name: r.name, date: roundDate(g.season, r) }));
    cup.kinds = defs.map((r) => r.kind);
    cup.current = 0;
    cup.winner = null;
    cup.runnerUp = null;
    cup.groupSets = [];
    cup.carry = [];
    cup.direct = id === 'UCL' ? [...(entrants.UCL ?? [])] : [];
    cup.teams = id === 'UCL' ? [...(entrants.UCL ?? []), ...(entrants.UCLQ ?? [])] : [...(entrants[id] ?? [])];
    cup.alive = [...cup.teams];
  }
  const ucl = g.cups.find((c) => c.id === 'UCL')!;
  const uic = g.cups.find((c) => c.id === UIC)!;
  drawKnockout(g, ucl, 1, [...(entrants.UCLQ ?? [])], true);
  drawKnockout(g, uic, 1, [...uic.teams!], true);
  for (const c of [ucl, uic]) for (const id of c.alive) pay(g, id, prize(c.id).entry * (c.id === UIC ? 1 : 0.15));
}

// ---------- Draws ----------

/** Pair clubs for a knockout round. Seeded: the stronger half meets the weaker half. Clubs from the same country are kept apart where possible. */
function pairUp(g: GameState, teams: number[], seeded: boolean): [number, number][] {
  const rep = (id: number) => g.clubs[id].reputation;
  let best: [number, number][] = [];
  let bestClash = Infinity;
  for (let attempt = 0; attempt < 40 && bestClash > 0; attempt++) {
    const pairs: [number, number][] = [];
    if (seeded) {
      const sorted = [...teams].sort((a, b) => rep(b) - rep(a));
      const top = shuffle(sorted.slice(0, sorted.length / 2));
      const bottom = shuffle(sorted.slice(sorted.length / 2));
      top.forEach((t, i) => pairs.push([t, bottom[i]]));
    } else {
      const arr = shuffle([...teams]);
      for (let i = 0; i + 1 < arr.length; i += 2) pairs.push([arr[i], arr[i + 1]]);
    }
    const clash = pairs.filter(([a, b]) => g.clubs[a].country === g.clubs[b].country).length;
    if (clash < bestClash) { bestClash = clash; best = pairs; }
  }
  return best;
}

function drawKnockout(g: GameState, cup: Cup, round: number, teams: number[], seeded: boolean) {
  const def = ROUNDS[cup.id][round - 1];
  const r = cup.rounds[round - 1];
  pairUp(g, teams, seeded).forEach(([high, low], tie) => {
    if (def.kind === 'final') {
      const fin: Fixture = { id: nextId(g), comp: cup.id, date: r.date, round, roundName: r.name, home: high, away: low, result: null, knockout: true, neutral: true, tie };
      g.fixtures.push(fin);
      avoidLeagueClash(g, fin);
      return;
    }
    // The stronger (seeded) club is at home in the second leg
    const l1: Fixture = { id: nextId(g), comp: cup.id, date: r.date, round, roundName: `${r.name} · 1st leg`, home: low, away: high, result: null, leg: 1, tie };
    const l2: Fixture = { id: nextId(g), comp: cup.id, date: addDays(r.date, def.gap ?? 7), round, roundName: `${r.name} · 2nd leg`, home: high, away: low, result: null, knockout: true, leg: 2, firstLeg: l1.id, tie };
    g.fixtures.push(l1, l2);
    avoidLeagueClash(g, l1);
    avoidLeagueClash(g, l2);
  });
  cup.carry = [];
}

// Double round robin for a group of four over six matchdays
const GROUP_PATTERN: [number, number][][] = [[[0, 1], [2, 3]], [[3, 0], [1, 2]], [[0, 2], [3, 1]], [[1, 0], [3, 2]], [[0, 3], [2, 1]], [[2, 0], [1, 3]]];

/** Group draw: four pots by standing (`seeds` fill the top pots), no two clubs from one country, or from the same earlier group, together where possible. */
function drawGroups(g: GameState, cup: Cup, firstRound: number, teams: number[], nGroups: number, seeds?: number[], apart?: number[][]) {
  const rep = (id: number) => g.clubs[id].reputation;
  // Seeds (group winners) fill the top pots, strongest first; everyone else by standing
  const top = [...(seeds ?? [])].sort((a, b) => rep(b) - rep(a));
  const ordered = [...top, ...teams.filter((id) => !top.includes(id)).sort((a, b) => rep(b) - rep(a))];
  const pots = [0, 1, 2, 3].map((k) => ordered.slice(k * nGroups, (k + 1) * nGroups));
  const sameOld = (a: number, b: number) => (apart ?? []).some((grp) => grp.includes(a) && grp.includes(b));
  let best: number[][] = [];
  let bestClash = Infinity;
  for (let attempt = 0; attempt < 80 && bestClash > 0; attempt++) {
    const groups: number[][] = Array.from({ length: nGroups }, () => []);
    let clash = 0;
    for (const pot of pots) {
      const order = shuffle([...pot]);
      const free = shuffle(groups.map((_, i) => i));
      for (const id of order) {
        const gi = free.findIndex((k) => groups[k].every((x) => g.clubs[x].country !== g.clubs[id].country && !sameOld(x, id)));
        const pick = gi >= 0 ? free.splice(gi, 1)[0] : free.splice(0, 1)[0];
        if (gi < 0) clash++;
        groups[pick].push(id);
      }
    }
    if (clash < bestClash) { bestClash = clash; best = groups; }
  }
  best.forEach((grp, gi) => {
    GROUP_PATTERN.forEach((pairs, md) => {
      const round = firstRound + md;
      const r = cup.rounds[round - 1];
      for (const [h, a] of pairs) {
        if (grp[h] === undefined || grp[a] === undefined) continue;
        const f: Fixture = { id: nextId(g), comp: cup.id, date: r.date, round, roundName: `${r.name} · Group ${GROUP_LETTERS[gi]}`, home: grp[h], away: grp[a], result: null };
        g.fixtures.push(f);
        avoidLeagueClash(g, f);
      }
    });
  });
  cup.groupSets = [...(cup.groupSets ?? []), best];
  cup.carry = [];
  return best;
}

// ---------- Tables ----------

/** Table for one group of a group stage (stage 0 = first, 1 = second). */
export function groupTable(g: GameState, cup: Cup, stage: number, group: number): TableRow[] {
  const teams = cup.groupSets?.[stage]?.[group] ?? [];
  const kind = stage === 0 ? 'g1' : 'g2';
  const rounds = new Set((cup.kinds ?? []).map((k, i) => (k === kind ? i + 1 : 0)).filter(Boolean));
  const rows: Record<number, TableRow> = {};
  for (const id of teams) rows[id] = { clubId: id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, form: [] };
  for (const f of g.fixtures) {
    if (f.comp !== cup.id || !rounds.has(f.round) || !f.result || !rows[f.home] || !rows[f.away]) continue;
    const r = f.result;
    const h = rows[f.home];
    const a = rows[f.away];
    h.p++; a.p++;
    h.gf += r.hg; h.ga += r.ag; a.gf += r.ag; a.ga += r.hg;
    if (r.hg > r.ag) { h.w++; a.l++; h.pts += 3; h.form.push('W'); a.form.push('L'); }
    else if (r.hg < r.ag) { a.w++; h.l++; a.pts += 3; a.form.push('W'); h.form.push('L'); }
    else { h.d++; a.d++; h.pts++; a.pts++; h.form.push('D'); a.form.push('D'); }
  }
  return Object.values(rows).sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || g.clubs[y.clubId].reputation - g.clubs[x.clubId].reputation);
}

export function groupLetter(i: number) {
  return GROUP_LETTERS[i];
}

// ---------- Money ----------

function prize(id: string) {
  return (EURO_COMPS.find((c) => c.id === id) ?? EURO_COMPS[2]).prize;
}

function pay(g: GameState, clubId: number, amount: number) {
  const c = g.clubs[clubId];
  if (!c || !amount) return;
  const v = Math.round(payScale(amount));
  c.balance += v;
  c.seasonIncome += v;
}

// ---------- Progress ----------

const cupOf = (g: GameState, id: string) => g.cups.find((c) => c.id === id && c.format === '2002');

/**
 * Daily: finish completed rounds and make the draws that are due (a draw waits for every competition that feeds it).
 * Returns the competitions won today.
 */
export function tickEurope2002(g: GameState): Cup[] {
  const won: Cup[] = [];
  for (let pass = 0; pass < 3; pass++) {
    for (const id of [UIC, 'UCL', 'UEL']) {
      const cup = cupOf(g, id);
      if (!cup || cup.winner !== null) continue;
      for (;;) {
        const round = cup.current + 1;
        if (round > cup.rounds.length) break;
        const fx = g.fixtures.filter((f) => f.comp === cup.id && f.round === round);
        if (!fx.length) { if (!drawRound(g, cup, round)) break; continue; }
        if (fx.some((f) => !f.result)) break;
        finishRound(g, cup, round, fx);
        if (cup.winner !== null) { won.push(cup); break; }
      }
    }
  }
  return won;
}

/** Make the draw for `round` if everything feeding it is decided. */
function drawRound(g: GameState, cup: Cup, round: number): boolean {
  const kind = cup.kinds![round - 1];
  const ucl = cupOf(g, 'UCL');
  const uic = cupOf(g, UIC);
  if (cup.id === 'UEL' && round === 1) {
    // Waits for the Champions League qualifying losers and the Intertoto winners
    if ((ucl && ucl.current < 1) || (uic && uic.current < uic.rounds.length)) return false;
    // 96 clubs make 48 in the second round; with fewer, the strongest get byes (2 x pool - 96 still play, an even number)
    const sorted = [...new Set([...cup.teams!, ...(cup.carry ?? [])])].sort((a, b) => g.clubs[b].reputation - g.clubs[a].reputation);
    const pool = sorted.slice(0, 96);
    const bye = pool.slice(0, Math.max(0, 96 - pool.length));
    const play = pool.filter((id) => !bye.includes(id));
    if (play.length % 2) bye.push(play.pop()!);
    cup.alive = [...new Set([...cup.alive, ...pool])];
    cup.teams = [...new Set([...cup.teams!, ...pool])];
    drawKnockout(g, cup, 1, play, true);
    cup.carry = bye;
    notifyDraw(g, cup, round);
    return true;
  }
  if (cup.id === 'UEL' && round === 3 && ucl && ucl.current < 7) return false; // waits for the Champions League group stage
  if (kind === 'g1') {
    drawGroups(g, cup, round, [...(cup.direct ?? []), ...(cup.carry ?? [])], 8);
    notifyGroup(g, cup, 0);
    return true;
  }
  if (kind === 'g2') {
    const seeds = (cup.carry ?? []).filter((_, i) => i % 2 === 0); // group winners
    drawGroups(g, cup, round, cup.carry ?? [], 4, seeds, cup.groupSets?.[0]);
    notifyGroup(g, cup, 1);
    return true;
  }
  const teams = cup.carry ?? [];
  if (teams.length < 2) return false;
  if (teams.length % 2) teams.pop();
  for (const id of teams) if (!cup.teams!.includes(id)) cup.teams!.push(id);
  cup.alive = [...new Set([...cup.alive, ...teams])];
  drawKnockout(g, cup, round, [...teams], round <= 2 && cup.id !== 'UCL');
  notifyDraw(g, cup, round);
  return true;
}

function finishRound(g: GameState, cup: Cup, round: number, fx: Fixture[]) {
  const kind = cup.kinds![round - 1];
  const p = prize(cup.id);
  const user = g.userClubId;
  cup.current++;
  if (kind === 'g1' || kind === 'g2') {
    for (const f of fx) {
      const r = f.result!;
      if (r.hg > r.ag) pay(g, f.home, p.win);
      else if (r.ag > r.hg) pay(g, f.away, p.win);
      else { pay(g, f.home, p.draw); pay(g, f.away, p.draw); }
    }
    const lastMd = cup.kinds![round] !== kind;
    if (!lastMd) return;
    const stage = kind === 'g1' ? 0 : 1;
    const groups = cup.groupSets![stage].map((_, gi) => groupTable(g, cup, stage, gi).map((r) => r.clubId));
    // Winners and runners-up go through (listed winner, runner-up, winner, runner-up…)
    const through = groups.flatMap((t) => [t[0], t[1]]);
    cup.carry = through;
    cup.alive = through;
    for (const id of through) pay(g, id, p.ko[stage + 1]);
    if (stage === 0) {
      // Third place drops into the UEFA Cup third round
      const uel = cupOf(g, 'UEL');
      if (uel) uel.carry = [...(uel.carry ?? []), ...groups.map((t) => t[2]).filter((id) => id !== undefined)];
    }
    const mine = groups.findIndex((t) => t.includes(user));
    if (mine >= 0) {
      const pos = groups[mine].indexOf(user) + 1;
      sendMessage(g, {
        from: 'Media', kind: 'match', title: `${cup.name}: ${pos <= 2 ? 'through' : 'out'} after finishing ${['1st', '2nd', '3rd', '4th'][pos - 1]} in Group ${GROUP_LETTERS[mine]}`,
        body: pos <= 2 ? `${g.clubs[user].name} go through to the ${stage === 0 ? 'second group stage' : 'quarter-finals'}.` : pos === 3 && stage === 0 ? `${g.clubs[user].name} drop into the UEFA Cup third round.` : `${g.clubs[user].name} are out of the ${cup.name}.`,
      });
    }
    return;
  }
  // Knockout round
  const ties = fx.filter((f) => f.leg !== 1).sort((a, b) => (a.tie ?? 0) - (b.tie ?? 0));
  const winners = ties.map((f) => winnerOf(f)!).filter((id) => id !== null);
  const losers = ties.map((f) => (winnerOf(f) === f.home ? f.away : f.home));
  if (kind === 'final') {
    cup.winner = winners[0];
    cup.runnerUp = losers[0];
    pay(g, winners[0], p.winner);
    return;
  }
  for (const id of winners) pay(g, id, cup.id === UIC ? p.ko[0] : p.ko[Math.min(4, round)]);
  const uel = cupOf(g, 'UEL');
  if (cup.id === 'UCL' && round === 1 && uel) uel.carry = [...(uel.carry ?? []), ...losers];
  if (cup.id === UIC && round === cup.rounds.length) {
    // The three Intertoto winners go into the UEFA Cup
    if (uel) uel.carry = [...(uel.carry ?? []), ...winners];
    cup.alive = [];
    for (const id of winners) g.clubs[id].trophies.push({ season: g.season, name: cup.name });
    if (winners.includes(user)) sendMessage(g, { from: 'Media', kind: 'match', title: 'Intertoto Cup winners!', body: `${g.clubs[user].name} win the Intertoto Cup and go into the UEFA Cup first round.` });
  } else {
    cup.carry = [...(cup.carry ?? []), ...winners];
    cup.alive = [...cup.carry];
  }
  // UCL third qualifying round winners join the clubs already in the groups
  if (cup.id === 'UCL' && round === 1) cup.alive = [...(cup.direct ?? []), ...winners];
  const lost = ties.find((f) => (f.home === user || f.away === user) && winnerOf(f) !== user);
  if (lost) {
    const into = cup.id === 'UCL' && round === 1 ? ' They drop into the UEFA Cup first round.' : '';
    sendMessage(g, { from: 'Media', kind: 'match', title: `Out of the ${cup.name}`, body: `${g.clubs[winnerOf(lost)!].name} knocked ${g.clubs[user].name} out in the ${cup.rounds[round - 1].name.toLowerCase()}.${into}` });
  }
}

function notifyDraw(g: GameState, cup: Cup, round: number) {
  const mine = g.fixtures.filter((f) => f.comp === cup.id && f.round === round && (f.home === g.userClubId || f.away === g.userClubId)).sort((a, b) => (a.date < b.date ? -1 : 1));
  if (!mine.length) return;
  const f = mine[0];
  const opp: Club = g.clubs[f.home === g.userClubId ? f.away : f.home];
  const name = cup.rounds[round - 1].name;
  sendMessage(g, {
    from: 'UEFA', kind: 'match', title: `${cup.name} ${name.toLowerCase()} draw: ${opp.name}`,
    body: mine.length > 1
      ? `${g.clubs[g.userClubId].name} will play ${opp.name} (${opp.country}) in the ${cup.name} ${name.toLowerCase()}: first leg ${f.home === g.userClubId ? 'at home' : 'away'} on ${f.date}, second leg on ${mine[1].date}.`
      : `${g.clubs[g.userClubId].name} will play ${opp.name} in the ${cup.name} final on ${f.date}.`,
  });
}

function notifyGroup(g: GameState, cup: Cup, stage: number) {
  const groups = cup.groupSets?.[stage] ?? [];
  const gi = groups.findIndex((grp) => grp.includes(g.userClubId));
  if (gi < 0) return;
  const others = groups[gi].filter((id) => id !== g.userClubId).map((id) => g.clubs[id].name);
  sendMessage(g, {
    from: 'UEFA', kind: 'match', title: `${cup.name} ${stage === 0 ? 'group stage' : 'second group stage'} draw: Group ${GROUP_LETTERS[gi]}`,
    body: `${g.clubs[g.userClubId].name} have been drawn in Group ${GROUP_LETTERS[gi]} with ${others.slice(0, -1).join(', ')} and ${others[others.length - 1]}.`,
  });
}
