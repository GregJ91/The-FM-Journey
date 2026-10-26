import { FORMATIONS } from './formations';
import { POS_GROUP, ratingAt, shortName } from './ratings';
import { chance, int, normal, pick, rand, weighted } from './rng';
import { pickLineup, validateLineup } from './selection';
import type { Club, Fixture, FixtureResult, GameState, GoalRecord, MatchStats, Player, Pos, Tactics } from './types';

export interface LivePlayer {
  id: number;
  pos: Pos;
  x: number;
  y: number;
  rating: number;
  cond: number;
  goals: number;
  assists: number;
  yellow: boolean;
  red: boolean;
  injured: boolean;
  on: number; // minute came on
  off: number | null;
}

export interface Side {
  clubId: number;
  tactics: Tactics;
  onPitch: LivePlayer[];
  bench: number[];
  out: LivePlayer[];
  subsLeft: number;
  str: { att: number; mid: number; def: number; gk: number };
}

export type EventType = 'kickoff' | 'goal' | 'save' | 'miss' | 'chance' | 'yellow' | 'red' | 'injury' | 'sub' | 'ht' | 'ft' | 'pens' | 'info';

export interface MatchEvent {
  minute: number;
  type: EventType;
  team: 0 | 1 | -1;
  player?: number;
  assist?: number;
  text: string;
}

export interface LiveMatch {
  fixtureId: number;
  knockout: boolean;
  sides: [Side, Side];
  minute: number;
  score: [number, number];
  pens?: [number, number];
  events: MatchEvent[];
  goals: GoalRecord[];
  reds: { minute: number; team: 0 | 1; player: number }[];
  stats: MatchStats;
  possTeam: 0 | 1;
  ball: { x: number; y: number }; // pitch coords for home attacking right, 0-100
  finished: boolean;
  injuredOut: number[];
}

const ATT_W: Record<Pos, number> = { ST: 1, AML: 0.8, AMR: 0.8, AMC: 0.8, ML: 0.5, MR: 0.5, MC: 0.35, DM: 0.15, DL: 0.2, DR: 0.2, DC: 0.05, GK: 0 };
const MID_W: Record<Pos, number> = { MC: 1, DM: 0.9, AMC: 0.8, ML: 0.6, MR: 0.6, AML: 0.4, AMR: 0.4, DL: 0.3, DR: 0.3, ST: 0.2, DC: 0.15, GK: 0.05 };
const DEF_W: Record<Pos, number> = { DC: 1, DL: 0.85, DR: 0.85, DM: 0.8, MC: 0.35, ML: 0.3, MR: 0.3, AMC: 0.1, AML: 0.1, AMR: 0.1, ST: 0.05, GK: 0 };
const SHOOT_W: Record<Pos, number> = { ST: 5, AMC: 3, AML: 3, AMR: 3, ML: 1.5, MR: 1.5, MC: 1.4, DM: 0.6, DL: 0.4, DR: 0.4, DC: 0.5, GK: 0 };
const ASSIST_W: Record<Pos, number> = { AMC: 4, AML: 3.5, AMR: 3.5, MC: 3, ML: 3, MR: 3, ST: 2, DL: 1.8, DR: 1.8, DM: 1.5, DC: 0.4, GK: 0.1 };

function playerOf(g: GameState, id: number): Player {
  return g.players[id];
}

function computeStrength(g: GameState, side: Side) {
  let att = 0, mid = 0, def = 0, gk = 20;
  let hasGK = false;
  for (const lp of side.onPitch) {
    const p = playerOf(g, lp.id);
    const r = ratingAt(p, lp.pos) * (0.72 + 0.28 * (lp.cond / 100)) * (0.95 + p.morale / 1000);
    att += r * ATT_W[lp.pos];
    mid += r * MID_W[lp.pos];
    def += r * DEF_W[lp.pos];
    if (lp.pos === 'GK') { gk = r; hasGK = true; }
  }
  if (!hasGK) gk = 20;
  const t = side.tactics;
  const m = t.mentality;
  side.str = {
    att: (att / 3.6) * (1 + 0.06 * m),
    mid: (mid / 4.5) * (1 + 0.025 * (t.pressing - 1)) * (t.style === 'short' ? 1.03 : t.style === 'direct' ? 0.97 : 1),
    def: (def / 5.0) * (1 - 0.04 * m) * (1 + 0.02 * (t.pressing === 0 ? 1 : 0)),
    gk,
  };
}

function buildSide(g: GameState, club: Club, isUser: boolean): Side {
  const squad = Object.values(g.players).filter((p) => p.clubId === club.id && p.squad === 'first');
  if (isUser) {
    validateLineup(club, squad);
  } else {
    const { lineup, subs } = pickLineup(club, squad);
    club.lineup = lineup;
    club.subs = subs;
  }
  const slots = FORMATIONS[club.tactics.formation];
  const onPitch: LivePlayer[] = [];
  club.lineup.forEach((id, i) => {
    if (id === null) return;
    onPitch.push(newLive(g, id, slots[i].pos, slots[i].x, slots[i].y, 0));
  });
  const side: Side = {
    clubId: club.id,
    tactics: { ...club.tactics },
    onPitch,
    bench: [...club.subs].slice(0, 9),
    out: [],
    subsLeft: 5,
    str: { att: 1, mid: 1, def: 1, gk: 1 },
  };
  computeStrength(g, side);
  return side;
}

function newLive(g: GameState, id: number, pos: Pos, x: number, y: number, minute: number): LivePlayer {
  const p = playerOf(g, id);
  return { id, pos, x, y, rating: 6.55, cond: p.condition, goals: 0, assists: 0, yellow: false, red: false, injured: false, on: minute, off: null };
}

export function createMatch(g: GameState, f: Fixture): LiveMatch {
  const home = g.clubs[f.home];
  const away = g.clubs[f.away];
  const m: LiveMatch = {
    fixtureId: f.id,
    knockout: !!f.knockout,
    sides: [buildSide(g, home, home.isUser), buildSide(g, away, away.isUser)],
    minute: 0,
    score: [0, 0],
    events: [],
    goals: [],
    reds: [],
    stats: { poss: [0, 0], shots: [0, 0], onTarget: [0, 0], xg: [0, 0], corners: [0, 0], fouls: [0, 0], yellows: [0, 0] },
    possTeam: 0,
    ball: { x: 50, y: 50 },
    finished: false,
    injuredOut: [],
  };
  m.events.push({ minute: 0, type: 'kickoff', team: -1, text: `Kick-off at ${f.neutral ? 'a neutral venue' : home.stadium}! ${home.name} v ${away.name}.` });
  return m;
}

function name(g: GameState, id: number) {
  return shortName(g.players[id]);
}

function attr(g: GameState, id: number, k: keyof Player['attrs']) {
  return g.players[id].attrs[k];
}

/** Advance the match by one minute. Returns events produced this minute. */
export function stepMinute(g: GameState, m: LiveMatch): MatchEvent[] {
  if (m.finished) return [];
  m.minute++;
  const minute = m.minute;
  const evs: MatchEvent[] = [];
  const [H, A] = m.sides;

  if (minute % 5 === 0) {
    computeStrength(g, H);
    computeStrength(g, A);
  }

  // Fatigue
  for (const side of m.sides) {
    const press = side.tactics.pressing - 1;
    for (const lp of side.onPitch) {
      const st = attr(g, lp.id, 'stamina');
      const rate = (lp.pos === 'GK' ? 0.08 : 0.34 + 0.07 * press) * (1.35 - (st / 20) * 0.75);
      lp.cond = Math.max(15, lp.cond - rate);
    }
  }

  // Possession
  const mh = Math.pow(H.str.mid, 2.5);
  const ma = Math.pow(A.str.mid, 2.5);
  let pH = mh / (mh + ma) + 0.02;
  pH = Math.min(0.8, Math.max(0.2, pH));
  const t: 0 | 1 = rand() < pH ? 0 : 1;
  const o: 0 | 1 = t === 0 ? 1 : 0;
  m.possTeam = t;
  m.stats.poss[t]++;
  const att = m.sides[t];
  const def = m.sides[o];
  const dir = t === 0 ? 1 : -1;
  m.ball = { x: 50 + dir * (rand() * 30 - 5), y: 15 + rand() * 70 };

  // Chance creation
  const ratio = (att.str.att) / Math.max(1, def.str.def);
  const homeAdv = t === 0 ? 1.06 : 0.97;
  const styleQ = att.tactics.style === 'direct' ? 1.05 : att.tactics.style === 'short' ? 0.98 : 1;
  const pShot = 0.22 * Math.pow(ratio, 1.6) * homeAdv * (1 + 0.05 * att.tactics.mentality);
  if (rand() < pShot && att.onPitch.length > 0) {
    evs.push(...shot(g, m, t, ratio * styleQ));
  }

  // Fouls & cards
  if (rand() < 0.2) {
    const fouler = weighted(def.onPitch, (lp) => (lp.pos === 'GK' ? 0.05 : POS_GROUP[lp.pos] === 'DEF' ? 1.4 : POS_GROUP[lp.pos] === 'MID' ? 1.2 : 0.7) * (24 - attr(g, lp.id, 'decisions')));
    if (fouler) {
      m.stats.fouls[o]++;
      fouler.rating -= 0.04;
      const straightRed = rand() < 0.004;
      if (straightRed || (rand() < 0.14)) {
        if (straightRed || fouler.yellow) {
          fouler.red = true;
          fouler.rating -= 1.4;
          sendOff(g, m, o, fouler, straightRed);
          evs.push({ minute, type: 'red', team: o, player: fouler.id, text: straightRed ? `RED CARD! ${name(g, fouler.id)} is sent off for a reckless challenge!` : `Second yellow! ${name(g, fouler.id)} has to go.` });
        } else {
          fouler.yellow = true;
          fouler.rating -= 0.3;
          m.stats.yellows[o]++;
          evs.push({ minute, type: 'yellow', team: o, player: fouler.id, text: `Yellow card for ${name(g, fouler.id)}.` });
        }
      }
    }
  }

  // Injuries
  for (const side of [0, 1] as const) {
    const s = m.sides[side];
    if (rand() < 0.0012 * (1 + 0.3 * (s.tactics.pressing - 1)) && s.onPitch.length > 0) {
      const lp = pick(s.onPitch.filter((x) => x.pos !== 'GK').length ? s.onPitch.filter((x) => x.pos !== 'GK') : s.onPitch);
      lp.injured = true;
      m.injuredOut.push(lp.id);
      evs.push({ minute, type: 'injury', team: side, player: lp.id, text: `${name(g, lp.id)} is down injured and can't continue.` });
      const subEv = autoSub(g, m, side, lp, true);
      if (subEv) evs.push(subEv);
      else removeFromPitch(m, side, lp, minute);
    }
  }

  // AI substitutions
  if (minute >= 58 && minute <= 86 && minute % 7 === 2) {
    for (const side of [0, 1] as const) {
      const club = g.clubs[m.sides[side].clubId];
      if (club.isUser && !g.autoSubs) continue;
      const ev = aiSub(g, m, side);
      if (ev) evs.push(ev);
    }
  }

  if (!evs.length && rand() < 0.14) {
    const c = g.clubs[att.clubId];
    const p = pick(att.onPitch);
    if (p) {
      const nm = name(g, p.id);
      evs.push({ minute, type: 'info', team: t, text: pick([
        `${c.short} keep the ball well, ${nm} probing for an opening.`,
        `${nm} drives forward for ${c.name}.`,
        `Patient build-up from ${c.name} at the back.`,
        `${nm} switches play with a raking pass.`,
        `${c.name} win a free-kick in midfield.`,
        `Lovely footwork from ${nm} to escape the press.`,
        `${c.name} pinning their opponents back now.`,
        `Corner to ${c.name}... cleared.`,
      ]) });
    }
  }
  if (minute === 45) evs.push({ minute, type: 'ht', team: -1, text: `Half-time: ${g.clubs[H.clubId].short} ${m.score[0]} - ${m.score[1]} ${g.clubs[A.clubId].short}` });
  if (minute >= 90) finishLive(g, m, evs);
  m.events.push(...evs);
  return evs;
}

function shot(g: GameState, m: LiveMatch, t: 0 | 1, ratio: number): MatchEvent[] {
  const minute = m.minute;
  const att = m.sides[t];
  const def = m.sides[t === 0 ? 1 : 0];
  const evs: MatchEvent[] = [];
  const shooter = weighted(att.onPitch, (lp) => SHOOT_W[lp.pos] * (attr(g, lp.id, 'finishing') + attr(g, lp.id, 'composure')) / 2);
  const isPen = rand() < 0.025;
  let xg = isPen ? 0.78 : Math.min(0.65, Math.max(0.02, -Math.log(1 - rand() * 0.999) * 0.1 * Math.pow(ratio, 0.3)));
  const fin = attr(g, shooter.id, 'finishing');
  const comp = attr(g, shooter.id, 'composure');
  const keeper = def.onPitch.find((lp) => lp.pos === 'GK');
  const gkSkill = keeper ? (attr(g, keeper.id, 'reflexes') + attr(g, keeper.id, 'handling') + attr(g, keeper.id, 'positioning')) / 3 : 4;
  const shooterF = 0.65 + 0.7 * (fin + comp) / 40;
  const keeperF = 0.65 + 0.7 * gkSkill / 20;
  const goalP = Math.min(0.92, xg * shooterF / keeperF);
  m.stats.shots[t]++;
  m.stats.xg[t] += xg;
  const dir = t === 0 ? 1 : -1;
  m.ball = { x: 50 + dir * (38 + rand() * 10), y: 30 + rand() * 40 };
  const onTargetP = Math.min(0.95, 0.28 + 0.22 * fin / 20 + xg * 0.8);
  const sName = name(g, shooter.id);
  const club = g.clubs[att.clubId];
  if (rand() < goalP) {
    m.score[t]++;
    m.stats.onTarget[t]++;
    shooter.goals++;
    shooter.rating += 1.1;
    let assistId: number | null = null;
    if (!isPen && rand() < 0.75) {
      const others = att.onPitch.filter((lp) => lp !== shooter);
      if (others.length) {
        const a = weighted(others, (lp) => ASSIST_W[lp.pos] * (attr(g, lp.id, 'passing') + attr(g, lp.id, 'vision') + attr(g, lp.id, 'crossing')) / 3);
        a.assists++;
        a.rating += 0.6;
        assistId = a.id;
      }
    }
    for (const lp of def.onPitch) {
      if (lp.pos === 'GK') lp.rating -= 0.35;
      else if (POS_GROUP[lp.pos] === 'DEF') lp.rating -= 0.18;
    }
    m.goals.push({ minute, team: t, scorer: shooter.id, assist: assistId, pen: isPen });
    m.ball = { x: t === 0 ? 99 : 1, y: 50 };
    const how = isPen
      ? `PENALTY converted by ${sName}!`
      : assistId
        ? pick([`GOAL! ${sName} finishes after a lovely ball from ${name(g, assistId)}!`, `GOAL! ${name(g, assistId)} sets it up and ${sName} buries it!`, `GOAL! ${sName} turns in ${name(g, assistId)}'s cross!`])
        : pick([`GOAL! ${sName} hammers it into the top corner!`, `GOAL! What a strike from ${sName}!`, `GOAL! ${sName} goes it alone and scores!`]);
    evs.push({ minute, type: 'goal', team: t, player: shooter.id, assist: assistId ?? undefined, text: `${how} ${club.short} ${m.score[0]}-${m.score[1]}` });
  } else if (rand() < onTargetP) {
    m.stats.onTarget[t]++;
    shooter.rating += 0.12;
    if (keeper) keeper.rating += 0.14;
    if (chance(0.35)) m.stats.corners[t]++;
    if (xg > 0.22 || chance(0.35)) {
      evs.push({ minute, type: 'save', team: t, player: shooter.id, text: isPen ? `Penalty SAVED! ${keeper ? name(g, keeper.id) : 'The keeper'} denies ${sName}!` : pick([`${sName} forces a fine save from ${keeper ? name(g, keeper.id) : 'the keeper'}.`, `Big chance! ${sName} is denied at the near post.`, `${sName} tests the keeper from range.`]) });
    }
  } else {
    shooter.rating -= 0.05;
    if (chance(0.25)) m.stats.corners[t]++;
    if (xg > 0.25 || chance(0.25)) {
      evs.push({ minute, type: 'miss', team: t, player: shooter.id, text: pick([`${sName} blazes over the bar!`, `${sName} drags it wide.`, `So close! ${sName} hits the post!`, `${sName}'s header goes just over.`]) });
    }
  }
  return evs;
}

function removeFromPitch(m: LiveMatch, side: 0 | 1, lp: LivePlayer, minute: number) {
  const s = m.sides[side];
  s.onPitch = s.onPitch.filter((x) => x !== lp);
  lp.off = minute;
  s.out.push(lp);
}

function sendOff(g: GameState, m: LiveMatch, side: 0 | 1, lp: LivePlayer, straight: boolean) {
  m.reds.push({ minute: m.minute, team: side, player: lp.id });
  removeFromPitch(m, side, lp, m.minute);
  // If the keeper is sent off, an outfield player goes in goal
  if (lp.pos === 'GK') {
    const s = m.sides[side];
    if (s.onPitch.length) s.onPitch[0].pos = 'GK';
  }
  computeStrength(g, m.sides[side]);
  void straight;
}

/** Bring on the best bench replacement for `off` (same position preferred). */
export function makeSub(g: GameState, m: LiveMatch, side: 0 | 1, offId: number, onId: number): MatchEvent | null {
  const s = m.sides[side];
  if (s.subsLeft <= 0) return null;
  const off = s.onPitch.find((x) => x.id === offId);
  if (!off || !s.bench.includes(onId)) return null;
  const on = newLive(g, onId, off.pos, off.x, off.y, m.minute);
  s.onPitch = s.onPitch.map((x) => (x === off ? on : x));
  off.off = m.minute;
  s.out.push(off);
  s.bench = s.bench.filter((id) => id !== onId);
  s.subsLeft--;
  computeStrength(g, s);
  return { minute: m.minute, type: 'sub', team: side, player: onId, text: `Substitution ${g.clubs[s.clubId].short}: ${name(g, onId)} replaces ${name(g, offId)}.` };
}

function bestBenchFor(g: GameState, s: Side, pos: Pos) {
  let best: number | null = null;
  let bs = -1;
  for (const id of s.bench) {
    const p = g.players[id];
    if (pos !== 'GK' && p.pos === 'GK') continue;
    const r = ratingAt(p, pos);
    if (r > bs) { bs = r; best = id; }
  }
  return best;
}

function autoSub(g: GameState, m: LiveMatch, side: 0 | 1, lp: LivePlayer, injury: boolean): MatchEvent | null {
  const s = m.sides[side];
  if (s.subsLeft <= 0) return null;
  const club = g.clubs[s.clubId];
  if (club.isUser && !g.autoSubs && !injury) return null;
  const on = bestBenchFor(g, s, lp.pos);
  if (on === null) return null;
  return makeSub(g, m, side, lp.id, on);
}

function aiSub(g: GameState, m: LiveMatch, side: 0 | 1): MatchEvent | null {
  const s = m.sides[side];
  if (s.subsLeft <= 0 || !s.bench.length) return null;
  const tired = s.onPitch.filter((lp) => lp.pos !== 'GK').sort((a, b) => a.cond - b.cond)[0];
  const losing = m.score[side] < m.score[side === 0 ? 1 : 0];
  if (!tired) return null;
  if (tired.cond < 68 || (losing && m.minute > 64) || tired.rating < 5.8) {
    return autoSub(g, m, side, tired, false);
  }
  return null;
}

function finishLive(g: GameState, m: LiveMatch, evs: MatchEvent[]) {
  m.finished = true;
  const [H, A] = m.sides;
  if (m.knockout && m.score[0] === m.score[1]) {
    const pens = shootout(g, m);
    m.pens = pens;
    evs.push({ minute: 90, type: 'pens', team: pens[0] > pens[1] ? 0 : 1, text: `Penalties! ${g.clubs[(pens[0] > pens[1] ? H : A).clubId].name} win the shootout ${pens[0]}-${pens[1]}!` });
  }
  evs.push({ minute: 90, type: 'ft', team: -1, text: `Full-time: ${g.clubs[H.clubId].name} ${m.score[0]} - ${m.score[1]} ${g.clubs[A.clubId].name}${m.pens ? ` (${m.pens[0]}-${m.pens[1]} pens)` : ''}` });
}

function shootout(g: GameState, m: LiveMatch): [number, number] {
  const takers = m.sides.map((s) => [...s.onPitch].sort((a, b) => attr(g, b.id, 'composure') + attr(g, b.id, 'finishing') - attr(g, a.id, 'composure') - attr(g, a.id, 'finishing')));
  const score: [number, number] = [0, 0];
  const kick = (side: 0 | 1, i: number) => {
    const list = takers[side];
    if (!list.length) return;
    const t = list[i % list.length];
    const p = 0.62 + 0.012 * attr(g, t.id, 'composure') + 0.006 * attr(g, t.id, 'finishing');
    if (rand() < p) score[side]++;
  };
  for (let i = 0; i < 5; i++) {
    kick(0, i);
    kick(1, i);
  }
  let i = 5;
  while (score[0] === score[1] && i < 30) {
    kick(0, i);
    kick(1, i);
    i++;
  }
  if (score[0] === score[1]) score[rand() < 0.5 ? 0 : 1]++;
  return score;
}

export function simulateToEnd(g: GameState, m: LiveMatch) {
  while (!m.finished) stepMinute(g, m);
}

const INJURIES: [string, number, number, number][] = [
  // name, min days, max days, weight
  ['Hamstring strain', 10, 25, 14],
  ['Twisted ankle', 5, 18, 14],
  ['Calf strain', 5, 14, 12],
  ['Groin strain', 7, 16, 10],
  ['Thigh strain', 10, 21, 9],
  ['Bruised ribs', 3, 9, 8],
  ['Back spasms', 3, 8, 8],
  ['Concussion', 7, 12, 4],
  ['Knee ligament damage', 30, 75, 5],
  ['Broken metatarsal', 40, 70, 3],
  ['Torn ACL', 180, 260, 1],
];

export function randomInjury(severity = 1) {
  const inj = weighted(INJURIES, (x) => x[3] * (x[2] > 60 ? severity : 1));
  return { name: inj[0], days: int(inj[1], inj[2]) };
}

/** Write the result back to the fixture and update player states. */
export function applyResult(g: GameState, m: LiveMatch) {
  const f = g.fixtures.find((x) => x.id === m.fixtureId)!;
  const ratings: Record<number, number> = {};
  const sides = m.sides;
  const all: { lp: LivePlayer; side: 0 | 1 }[] = [];
  for (const side of [0, 1] as const) {
    for (const lp of [...sides[side].onPitch, ...sides[side].out]) all.push({ lp, side });
  }
  const oppStr = [sides[1].str, sides[0].str];
  let motm: { id: number; r: number } | null = null;
  for (const { lp, side } of all) {
    const p = g.players[lp.id];
    const scored = m.score[side];
    const conceded = m.score[side === 0 ? 1 : 0];
    const won = scored > conceded || (m.pens && m.pens[side] > m.pens[side === 0 ? 1 : 0]);
    const lost = scored < conceded;
    const mins = (lp.off ?? 90) - lp.on;
    let r = lp.rating;
    r += won ? 0.3 : lost ? -0.3 : 0;
    if (conceded === 0 && (lp.pos === 'GK' || POS_GROUP[lp.pos] === 'DEF') && mins >= 60) r += 0.35;
    const o = oppStr[side];
    const ability = ratingAt(p, lp.pos);
    r += (ability - (o.att + o.mid + o.def) / 3) / 45;
    r += normal(0, 0.35);
    if (mins < 25) r = 6 + (r - 6) * 0.5;
    r = Math.max(3, Math.min(10, r));
    r = Math.round(r * 10) / 10;
    ratings[lp.id] = r;
    if (!motm || r > motm.r) motm = { id: lp.id, r };
    // Player updates
    p.stats.apps++;
    p.stats.mins += mins;
    p.stats.goals += lp.goals;
    p.stats.assists += lp.assists;
    p.stats.ratingSum += r;
    if (lp.yellow) { p.stats.yellows++; p.yellowAcc++; }
    if (lp.red) { p.stats.reds++; p.suspended += lp.yellow ? 1 : 3; }
    if (p.yellowAcc >= 5) { p.suspended += 1; p.yellowAcc = 0; }
    if (conceded === 0 && mins >= 60 && (lp.pos === 'GK' || POS_GROUP[lp.pos] === 'DEF')) p.stats.cleanSheets++;
    p.form = [...p.form.slice(-4), r];
    p.condition = Math.round(lp.cond);
    p.monthMins += mins;
    p.monthRatings.push(r);
    p.morale = Math.max(5, Math.min(100, p.morale + (r - 6.6) * 4 + (won ? 3 : lost ? -3 : 0)));
    if (lp.injured) {
      p.injury = randomInjury();
    }
  }
  if (motm) g.players[motm.id].stats.motm++;
  const result: FixtureResult = {
    hg: m.score[0],
    ag: m.score[1],
    pens: m.pens,
    goals: m.goals,
    reds: m.reds,
    motm: motm?.id,
  };
  // Detailed stats are only kept for the manager's own matches (keeps saves small)
  if (g.clubs[f.home].isUser || g.clubs[f.away].isUser) {
    result.stats = { ...m.stats, xg: [Math.round(m.stats.xg[0] * 100) / 100, Math.round(m.stats.xg[1] * 100) / 100] };
    result.ratings = ratings;
  }
  f.result = result;
  // Suspensions served: players of both clubs who were suspended and not involved
  for (const clubId of [f.home, f.away]) {
    for (const p of Object.values(g.players)) {
      if (p.clubId === clubId && p.suspended > 0 && !(p.id in ratings)) p.suspended--;
    }
  }
  return result;
}

export function simulateFixture(g: GameState, f: Fixture) {
  const m = createMatch(g, f);
  simulateToEnd(g, m);
  return applyResult(g, m);
}

export function winnerOf(f: Fixture): number | null {
  if (!f.result) return null;
  const r = f.result;
  if (r.hg > r.ag) return f.home;
  if (r.ag > r.hg) return f.away;
  if (r.pens) return r.pens[0] > r.pens[1] ? f.home : f.away;
  return null;
}

export function changeTactics(g: GameState, m: LiveMatch, side: 0 | 1, t: Partial<Tactics>) {
  Object.assign(m.sides[side].tactics, t);
  computeStrength(g, m.sides[side]);
}
