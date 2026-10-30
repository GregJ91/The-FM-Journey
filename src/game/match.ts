import { FORMATIONS } from './formations';
import { isEligible } from './actions';
import { isMetaClub, META_TUNING } from './meta';
import { CHAMPIONS_EDGE, cheatOn } from './cheats';
import { mgr, noteMatch, noteTactics } from './manager';
import { POS_GROUP, ratingAt, rawOverallAt, shortName } from './ratings';
import { chance, int, normal, pick, rand, weighted } from './rng';
import { pickLineup, validateLineup } from './selection';
import { autoRuns, normaliseTactics, roleFor, ROLES, withRun, type Role } from './tactics';
import type { Club, Fixture, FixtureResult, GameState, GoalRecord, MatchStats, Player, Pos, Run, StatLine, Tactics } from './types';
import { playersByClub } from './shirts';

export function emptyLine(): StatLine {
  return { goals: 0, assists: 0, mins: 0, yellows: 0, reds: 0, shots: 0, sot: 0, xg: 0, kp: 0, xa: 0, passes: 0, passC: 0, drb: 0, drbA: 0, tkl: 0, int: 0, clr: 0, fouls: 0, saves: 0, conceded: 0 };
}

export interface LivePlayer {
  id: number;
  slot: number; // index into the formation's slots
  pos: Pos;
  x: number;
  y: number;
  s: StatLine; // detailed match stats (fractional passes, rounded at full time)
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
  agg0?: [number, number]; // second leg: first-leg goals for (home, away) of this match
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
const SHOOT_W: Record<Pos, number> = { ST: 4, AMC: 3.2, AML: 3.2, AMR: 3.2, ML: 1.5, MR: 1.5, MC: 1.4, DM: 0.6, DL: 0.4, DR: 0.4, DC: 0.5, GK: 0 };
const ASSIST_W: Record<Pos, number> = { AMC: 4, AML: 3.5, AMR: 3.5, MC: 3, ML: 3, MR: 3, ST: 2, DL: 1.8, DR: 1.8, DM: 1.5, DC: 0.4, GK: 0.1 };

function playerOf(g: GameState, id: number): Player {
  return g.players[id];
}

/** Roles adjusted by run arrows, cached per arrow (arrows are replaced, never changed, when redrawn). */
const runRoles = new WeakMap<Run, Map<string, Role>>();

function role(side: Side, lp: LivePlayer) {
  const r = roleFor(lp.pos, side.tactics.roles[lp.slot]);
  const runs = side.tactics.runs;
  if (!runs?.length) return r;
  for (const run of runs) {
    if (run.slot !== lp.slot || run.f !== side.tactics.formation) continue;
    let cache = runRoles.get(run);
    if (!cache) runRoles.set(run, (cache = new Map()));
    let out = cache.get(r.id);
    if (!out) cache.set(r.id, (out = withRun(r, FORMATIONS[run.f][run.slot], run)));
    return out;
  }
  return r;
}

/**
 * Players whose match-winning attributes (pace and composure, plus dribbling and finishing going forward or
 * tackling and positioning at the back) are above what their overall suggests contribute a little more, and
 * vice versa. Capped at ±4%; for a typical player it's about 1.
 */
function metaFactor(p: Player, pos: Pos) {
  if (pos === 'GK') return 1;
  const a = p.attrs;
  const key = POS_GROUP[pos] === 'DEF' ? a.tackling + a.positioning : a.dribbling + a.finishing;
  const keyAvg = (a.pace + a.composure + key) / 4;
  const level = (rawOverallAt(a, pos) - 10) / 4.6;
  return 1 + Math.max(-0.04, Math.min(0.04, (keyAvg - level) * 0.015));
}

function computeStrength(g: GameState, side: Side) {
  let att = 0, mid = 0, def = 0, gk = 20;
  let hasGK = false;
  let backPass = 0, backN = 0;
  for (const lp of side.onPitch) {
    const p = playerOf(g, lp.id);
    const rl = role(side, lp);
    const r = ratingAt(p, lp.pos) * (0.72 + 0.28 * (lp.cond / 100)) * (0.95 + p.morale / 1000) * metaFactor(p, lp.pos);
    att += r * ATT_W[lp.pos] * rl.att;
    mid += r * MID_W[lp.pos] * rl.mid;
    def += r * DEF_W[lp.pos] * rl.def;
    if (lp.pos === 'GK') { gk = r; hasGK = true; }
    if (lp.pos === 'GK' || lp.pos === 'DC') { backPass += p.attrs.passing; backN++; }
  }
  if (!hasGK) gk = 20;
  const t = side.tactics;
  const m = t.mentality;
  let attM = 1 + 0.06 * m;
  let midM = 1 + 0.025 * (t.pressing - 1);
  let defM = (1 - 0.04 * m) * (1 + 0.015 * (t.pressing - 1));
  if (t.style === 'short') { midM *= 1.025; attM *= 0.96; }
  if (t.style === 'direct') { midM *= 0.96; attM *= 1.03; }
  if (t.tempo === 2) { attM *= 1.03; midM *= 0.98; }
  if (t.tempo === 0) { attM *= 0.95; midM *= 1.02; }
  if (t.width === 2) attM *= 1.02;
  if (t.width === 0) midM *= 1.01;
  if (t.tackling === 2) defM *= 1.03;
  if (t.tackling === 0) defM *= 0.98;
  // Playing out from the back only pays off with good passers at the back
  if (t.playOutBack && backN) midM *= 1 + Math.max(-0.05, Math.min(0.05, (backPass / backN - 12) * 0.008));
  // The user's manager profile: a small edge where they're strong (±2%)
  if (side.clubId === g.userClubId) {
    attM *= 1 + 0.02 * mgr(g, 'attacking');
    defM *= 1 + 0.02 * mgr(g, 'defending');
    midM *= 1 + 0.015 * mgr(g, 'tactical');
  }
  let edge = isMetaClub(g.clubs[side.clubId], g) ? META_TUNING.edge : 1;
  if (side.clubId === g.userClubId && cheatOn(g, 'champions', side.tactics)) edge *= CHAMPIONS_EDGE;
  side.str = { att: (att / 3.6) * attM * edge, mid: (mid / 4.5) * midM * edge, def: (def / 5.0) * defM * edge, gk };
}

/**
 * CM 01/02 careers: possession and chance creation follow strength less steeply, and there are slightly fewer
 * chances, so scores look like 2002/03 (about 2.6 goals a game; big wins rare). Tuned in tests/cmscores.test.ts.
 */
export const CM_TUNE = { possExp: 1.8, shotExp: 1.0, shotBase: 0.21 };

/** Which flank a slot is on, for attacking focus. */
function flank(lp: LivePlayer): 'left' | 'centre' | 'right' {
  return lp.y < 35 ? 'left' : lp.y > 65 ? 'right' : 'centre';
}

function focusMult(side: Side, lp: LivePlayer) {
  const f = side.tactics.focus;
  if (f === 'mixed') return 1;
  return flank(lp) === f ? 1.6 : 0.85;
}

/** Average of an attribute over the given players. */
function avgAttr(g: GameState, list: LivePlayer[], k: keyof Player['attrs']) {
  if (!list.length) return 10;
  return list.reduce((s, lp) => s + g.players[lp.id].attrs[k], 0) / list.length;
}

// While a day's computer fixtures are simulated, squads come from one grouping of the world (a CM world has 50,000 players)
let squadCache: Map<number, Player[]> | null = null;
export function withSquadCache<T>(g: GameState, fn: () => T): T {
  squadCache = playersByClub(g);
  try {
    return fn();
  } finally {
    squadCache = null;
  }
}

function buildSide(g: GameState, club: Club, isUser: boolean, cupTie = false, comp = ''): Side {
  // The manager's unregistered senior players can't play in league or European games
  const pool = squadCache?.get(club.id) ?? Object.values(g.players).filter((p) => p.clubId === club.id);
  const squad = pool.filter((p) => p.clubId === club.id && p.squad === 'first' && (!isUser || isEligible(g, p, comp)));
  if (isUser) {
    validateLineup(club, squad);
  } else {
    // AI clubs blood young prospects, more so in domestic cup ties
    const { lineup, subs } = pickLineup(club, squad, true, { date: g.date, bonus: cupTie ? 6 : 2 });
    club.lineup = lineup;
    club.subs = subs;
  }
  club.tactics = normaliseTactics(club.tactics);
  const slots = FORMATIONS[club.tactics.formation];
  const onPitch: LivePlayer[] = [];
  club.lineup.forEach((id, i) => {
    if (id === null) return;
    onPitch.push(newLive(g, id, i, slots[i].pos, slots[i].x, slots[i].y, 0));
  });
  const side: Side = {
    clubId: club.id,
    // Computer sides make their own runs (yours are the arrows you drew)
    tactics: { ...club.tactics, roles: [...club.tactics.roles], runs: isUser ? club.tactics.runs : autoRuns(club.tactics, club.id) },
    onPitch,
    bench: [...club.subs].slice(0, 9),
    out: [],
    subsLeft: 5,
    str: { att: 1, mid: 1, def: 1, gk: 1 },
  };
  computeStrength(g, side);
  return side;
}

function newLive(g: GameState, id: number, slot: number, pos: Pos, x: number, y: number, minute: number): LivePlayer {
  const p = playerOf(g, id);
  return { id, slot, pos, x, y, s: emptyLine(), rating: 6.55, cond: p.condition, goals: 0, assists: 0, yellow: false, red: false, injured: false, on: minute, off: null };
}

/** Second leg: first-leg goals from the point of view of this fixture's home and away sides. */
function firstLeg(g: GameState, f: Fixture): [number, number] | undefined {
  if (f.leg !== 2 || f.firstLeg === undefined) return undefined;
  const l1 = g.fixtures.find((x) => x.id === f.firstLeg);
  if (!l1?.result) return undefined;
  return l1.home === f.away ? [l1.result.ag, l1.result.hg] : [l1.result.hg, l1.result.ag];
}

/** Goals for a side, including the first leg of a two-legged tie. */
export function aggGoals(m: LiveMatch, side: 0 | 1) {
  return m.score[side] + (m.agg0?.[side] ?? 0);
}

export function createMatch(g: GameState, f: Fixture): LiveMatch {
  const cupTie = g.cups.some((c) => c.id === f.comp && c.type === 'domestic');
  const home = g.clubs[f.home];
  const away = g.clubs[f.away];
  const m: LiveMatch = {
    fixtureId: f.id,
    knockout: !!f.knockout,
    agg0: firstLeg(g, f),
    sides: [buildSide(g, home, home.isUser, cupTie, f.comp), buildSide(g, away, away.isUser, cupTie, f.comp)],
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

  // Fatigue: pressing, tempo and role all add to the running
  for (const side of m.sides) {
    const t = side.tactics;
    const teamRate = (1 + 0.3 * (t.pressing - 1)) * (t.tempo === 2 ? 1.1 : t.tempo === 0 ? 0.94 : 1);
    for (const lp of side.onPitch) {
      const st = attr(g, lp.id, 'stamina');
      const base = lp.pos === 'GK' ? 0.08 : 0.34 * teamRate * role(side, lp).fatigue;
      lp.cond = Math.max(15, lp.cond - base * (1.35 - (st / 20) * 0.75));
    }
  }

  // AI managers react to the scoreline
  if (minute === 70 || minute === 80) {
    for (const side of [0, 1] as const) {
      const s = m.sides[side];
      if (g.clubs[s.clubId].isUser) continue;
      const diff = aggGoals(m, side) - aggGoals(m, side === 0 ? 1 : 0);
      if (diff < 0 && s.tactics.mentality < 2) changeTactics(g, m, side, { mentality: s.tactics.mentality + 1 });
      if (diff > 0 && minute === 80 && s.tactics.mentality > -1) changeTactics(g, m, side, { mentality: s.tactics.mentality - 1 });
    }
  }

  // Possession
  // CM 01/02 careers are tuned to 2002/03 football: fewer goals and fewer thrashings (gentler curves below)
  const cmTune = g.era === 'cm0102' ? CM_TUNE : null;
  const mh = Math.pow(H.str.mid, cmTune?.possExp ?? 2.5);
  const ma = Math.pow(A.str.mid, cmTune?.possExp ?? 2.5);
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
  const at = att.tactics;
  const dt = def.tactics;
  const leading = (side: 0 | 1) => aggGoals(m, side) > aggGoals(m, side === 0 ? 1 : 0);

  // Passing: share out this minute's passes by role, completion by skill & style
  passMinute(g, att, dt.pressing);
  // Duels: dribbles, tackles, interceptions
  duelMinute(g, att, def);

  // Chance creation
  const ratio = att.str.att / Math.max(1, def.str.def);
  const homeAdv = t === 0 ? 1.06 : 0.97;
  let shotMult = homeAdv * (1 + 0.05 * at.mentality);
  shotMult *= at.tempo === 2 ? 1.06 : at.tempo === 0 ? 0.94 : 1;
  shotMult *= at.width === 2 ? 1.04 : at.width === 0 ? 0.97 : 1;
  const attShare = t === 0 ? pH : 1 - pH;
  // counter-attacking pays off for the side with less of the ball; it's wasted when you dominate
  const counterOn = at.counter && attShare < 0.5;
  if (counterOn) shotMult *= 1.06 + (0.5 - attShare) * 0.6;
  if (at.timeWasting && leading(t)) shotMult *= 0.85;
  if (dt.line === 0) shotMult *= 1.05; // deep line concedes more (but worse) shots
  if (dt.offsideTrap) shotMult *= 0.94;
  if (dt.timeWasting && leading(o)) shotMult *= 0.95;
  // Chance quality
  let quality = at.style === 'direct' ? 1.05 : at.style === 'short' ? 0.98 : 1;
  quality *= at.width === 0 ? 1.04 : at.width === 2 ? 0.95 : 1;
  if (counterOn) quality *= 1.08;
  if (dt.line === 2) {
    // a high line is exposed by quick forwards
    const fwdPace = avgAttr(g, att.onPitch.filter((lp) => POS_GROUP[lp.pos] === 'ATT'), 'pace');
    const cbPace = avgAttr(g, def.onPitch.filter((lp) => lp.pos === 'DC'), 'pace');
    quality *= Math.max(0.9, Math.min(1.15, 1 + (fwdPace - cbPace) * 0.012));
    quality *= 1.04; // space in behind
  } else if (dt.line === 0) quality *= 0.93;
  if (dt.pressing === 2) quality *= 1.05; // beat the press and there's room to attack
  if (dt.pressing === 0) quality *= 0.97;
  const pShot = (cmTune?.shotBase ?? 0.22) * Math.pow(ratio, cmTune?.shotExp ?? 1.6) * shotMult;
  if (rand() < pShot && att.onPitch.length > 0) {
    const beatTrap = dt.offsideTrap && rand() < 0.05;
    evs.push(...shot(g, m, t, ratio * quality, beatTrap));
  } else if (rand() < 0.12) {
    // ball cleared from danger
    const cb = def.onPitch.filter((lp) => POS_GROUP[lp.pos] === 'DEF' || lp.pos === 'DM');
    if (cb.length) weighted(cb, (lp) => (lp.pos === 'DC' ? 2 : 1) * attr(g, lp.id, 'heading')).s.clr++;
  }

  // Fouls & cards (tackling style matters)
  const foulRate = 0.2 * (dt.tackling === 2 ? 1.45 : dt.tackling === 0 ? 0.6 : 1);
  const cardRate = 0.14 * (dt.tackling === 2 ? 1.3 : dt.tackling === 0 ? 0.65 : 1) * (dt.timeWasting && leading(o) ? 1.2 : 1);
  if (rand() < foulRate) {
    const fouler = weighted(def.onPitch, (lp) => (lp.pos === 'GK' ? 0.05 : POS_GROUP[lp.pos] === 'DEF' ? 1.4 : POS_GROUP[lp.pos] === 'MID' ? 1.2 : 0.7) * (24 - attr(g, lp.id, 'decisions')));
    if (fouler) {
      m.stats.fouls[o]++;
      fouler.s.fouls++;
      fouler.rating -= 0.04;
      const straightRed = rand() < 0.004;
      if (straightRed || rand() < cardRate) {
        if (straightRed || fouler.yellow) {
          fouler.red = true;
          fouler.rating -= 1.4;
          sendOff(g, m, o, fouler);
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
    const ironMen = s.clubId === g.userClubId && cheatOn(g, 'ironmen', s.tactics);
    if (!ironMen && rand() < 0.0012 * (1 + 0.3 * (s.tactics.pressing - 1)) * (s.tactics.tackling === 2 ? 1.1 : 1) && s.onPitch.length > 0) {
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

/** About ten passes per minute of possession, shared out by role and completed by skill. */
function passMinute(g: GameState, side: Side, oppPress: number) {
  const t = side.tactics;
  const attempts = 11 * (t.tempo === 2 ? 0.88 : t.tempo === 0 ? 1.15 : 1) * (t.style === 'short' ? 1.15 : t.style === 'direct' ? 0.8 : 1);
  const shares = side.onPitch.map((lp) => (lp.pos === 'GK' ? (t.playOutBack ? 0.35 : 0.15) : MID_W[lp.pos] * role(side, lp).mid + 0.2));
  const total = shares.reduce((a, b) => a + b, 0) || 1;
  side.onPitch.forEach((lp, i) => {
    const n = (attempts * shares[i]) / total;
    const pa = attr(g, lp.id, 'passing');
    const grp = POS_GROUP[lp.pos];
    let c = 0.7 + 0.016 * (pa - 10) + (t.style === 'short' ? 0.05 : t.style === 'direct' ? -0.08 : 0) - 0.025 * (oppPress - 1);
    c += grp === 'DEF' || grp === 'GK' ? 0.05 : grp === 'ATT' ? -0.06 : 0;
    c = Math.max(0.45, Math.min(0.95, c));
    lp.s.passes += n;
    lp.s.passC += n * c;
  });
}

function duelMinute(g: GameState, att: Side, def: Side) {
  const defenders = def.onPitch.filter((lp) => lp.pos !== 'GK');
  if (!defenders.length || !att.onPitch.length) return;
  const tackleStyle = def.tactics.tackling === 2 ? 1.2 : def.tactics.tackling === 0 ? 0.8 : 1;
  // Dribble attempt
  if (rand() < 0.32) {
    const runner = weighted(att.onPitch.filter((lp) => lp.pos !== 'GK'), (lp) => (ATT_W[lp.pos] * role(att, lp).att + 0.1) * attr(g, lp.id, 'dribbling'));
    if (runner) {
      runner.s.drbA++;
      const tackler = weighted(defenders, (lp) => DEF_W[lp.pos] * role(def, lp).def + 0.1);
      const p = Math.max(0.2, Math.min(0.85, 0.48 + (attr(g, runner.id, 'dribbling') - attr(g, tackler.id, 'tackling')) * 0.03));
      if (rand() < p) { runner.s.drb++; runner.rating += 0.03; }
      else { tackler.s.tkl++; tackler.rating += 0.04; }
    }
  }
  // Tackles in open play
  if (rand() < 0.3 * tackleStyle) {
    const tk = weighted(defenders, (lp) => (DEF_W[lp.pos] * role(def, lp).def + 0.15) * attr(g, lp.id, 'tackling'));
    if (rand() < 0.5 + (attr(g, tk.id, 'tackling') - 10) * 0.025) { tk.s.tkl++; tk.rating += 0.03; }
  }
  // Interceptions
  if (rand() < 0.3) {
    const ic = weighted(defenders, (lp) => (DEF_W[lp.pos] * role(def, lp).def + 0.15) * attr(g, lp.id, 'positioning'));
    ic.s.int++;
    ic.rating += 0.02;
  }
}

function shot(g: GameState, m: LiveMatch, t: 0 | 1, ratio: number, beatTrap = false): MatchEvent[] {
  const minute = m.minute;
  const att = m.sides[t];
  const def = m.sides[t === 0 ? 1 : 0];
  const evs: MatchEvent[] = [];
  const shooter = weighted(att.onPitch, (lp) => SHOOT_W[lp.pos] * role(att, lp).shoot * focusMult(att, lp) * (attr(g, lp.id, 'finishing') + attr(g, lp.id, 'composure')) / 2);
  const isPen = !beatTrap && rand() < 0.025;
  let xg = isPen ? 0.78 : Math.min(0.65, Math.max(0.02, -Math.log(1 - rand() * 0.999) * 0.1 * Math.pow(ratio, 0.3)));
  if (beatTrap) xg = Math.max(xg, 0.32);
  // The pass that made the chance
  const others = att.onPitch.filter((lp) => lp !== shooter);
  const creator = !isPen && others.length && rand() < 0.78
    ? weighted(others, (lp) => ASSIST_W[lp.pos] * role(att, lp).create * focusMult(att, lp) * (attr(g, lp.id, 'passing') + attr(g, lp.id, 'vision') + attr(g, lp.id, 'crossing')) / 3)
    : null;
  if (creator) { creator.s.kp++; creator.s.xa += xg; creator.rating += 0.08; }
  const fin = attr(g, shooter.id, 'finishing');
  const comp = attr(g, shooter.id, 'composure');
  const keeper = def.onPitch.find((lp) => lp.pos === 'GK');
  const gkSkill = keeper ? (attr(g, keeper.id, 'reflexes') + attr(g, keeper.id, 'handling') + attr(g, keeper.id, 'positioning')) / 3 : 4;
  const shooterF = 0.65 + 0.7 * (fin + comp) / 40;
  const keeperF = 0.65 + 0.7 * gkSkill / 20;
  const goalP = Math.min(0.92, xg * shooterF / keeperF);
  m.stats.shots[t]++;
  m.stats.xg[t] += xg;
  shooter.s.shots++;
  shooter.s.xg += xg;
  const dir = t === 0 ? 1 : -1;
  m.ball = { x: 50 + dir * (38 + rand() * 10), y: 30 + rand() * 40 };
  const onTargetP = Math.min(0.95, 0.28 + 0.22 * fin / 20 + xg * 0.8);
  const sName = name(g, shooter.id);
  const club = g.clubs[att.clubId];
  if (rand() < goalP) {
    m.score[t]++;
    m.stats.onTarget[t]++;
    shooter.s.sot++;
    shooter.goals++;
    shooter.rating += 1.1;
    const assistId = creator && rand() < 0.92 ? creator.id : null;
    if (creator && assistId) { creator.assists++; creator.rating += 0.55; }
    for (const lp of def.onPitch) {
      if (lp.pos === 'GK') { lp.rating -= 0.35; lp.s.conceded++; }
      else if (POS_GROUP[lp.pos] === 'DEF') lp.rating -= 0.18;
    }
    m.goals.push({ minute, team: t, scorer: shooter.id, assist: assistId, pen: isPen });
    m.ball = { x: t === 0 ? 99 : 1, y: 50 };
    const how = isPen
      ? `PENALTY converted by ${sName}!`
      : beatTrap
        ? `GOAL! ${sName} beats the offside trap and slots it home!`
        : assistId
          ? pick([`GOAL! ${sName} finishes after a lovely ball from ${name(g, assistId)}!`, `GOAL! ${name(g, assistId)} sets it up and ${sName} buries it!`, `GOAL! ${sName} turns in ${name(g, assistId)}'s cross!`])
          : pick([`GOAL! ${sName} hammers it into the top corner!`, `GOAL! What a strike from ${sName}!`, `GOAL! ${sName} goes it alone and scores!`]);
    evs.push({ minute, type: 'goal', team: t, player: shooter.id, assist: assistId ?? undefined, text: `${how} ${club.short} ${m.score[0]}-${m.score[1]}` });
  } else if (rand() < onTargetP) {
    m.stats.onTarget[t]++;
    shooter.s.sot++;
    shooter.rating += 0.12;
    if (keeper) { keeper.rating += 0.14; keeper.s.saves++; }
    if (chance(0.35)) m.stats.corners[t]++;
    if (xg > 0.22 || chance(0.35)) {
      evs.push({ minute, type: 'save', team: t, player: shooter.id, text: isPen ? `Penalty SAVED! ${keeper ? name(g, keeper.id) : 'The keeper'} denies ${sName}!` : pick([`${sName} forces a fine save from ${keeper ? name(g, keeper.id) : 'the keeper'}.`, `Big chance! ${sName} is denied at the near post.`, `${sName} tests the keeper from range.`]) });
    }
  } else {
    shooter.rating -= 0.05;
    if (chance(0.25)) m.stats.corners[t]++;
    if (chance(0.3)) {
      const blockers = def.onPitch.filter((lp) => POS_GROUP[lp.pos] === 'DEF');
      if (blockers.length) pick(blockers).s.clr++;
    }
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

function sendOff(g: GameState, m: LiveMatch, side: 0 | 1, lp: LivePlayer) {
  m.reds.push({ minute: m.minute, team: side, player: lp.id });
  removeFromPitch(m, side, lp, m.minute);
  // If the keeper is sent off, an outfield player goes in goal
  if (lp.pos === 'GK') {
    const s = m.sides[side];
    if (s.onPitch.length) s.onPitch[0].pos = 'GK';
  }
  computeStrength(g, m.sides[side]);
}

/** Bring on the best bench replacement for `off` (same position preferred). */
export function makeSub(g: GameState, m: LiveMatch, side: 0 | 1, offId: number, onId: number, manual = true): MatchEvent | null {
  const s = m.sides[side];
  if (s.subsLeft <= 0) return null;
  const off = s.onPitch.find((x) => x.id === offId);
  if (!off || !s.bench.includes(onId)) return null;
  const on = newLive(g, onId, off.slot, off.pos, off.x, off.y, m.minute);
  s.onPitch = s.onPitch.map((x) => (x === off ? on : x));
  off.off = m.minute;
  s.out.push(off);
  s.bench = s.bench.filter((id) => id !== onId);
  s.subsLeft--;
  if (manual && s.clubId === g.userClubId) noteTactics(g, undefined, false);
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
  return makeSub(g, m, side, lp.id, on, false);
}

function aiSub(g: GameState, m: LiveMatch, side: 0 | 1): MatchEvent | null {
  const s = m.sides[side];
  if (s.subsLeft <= 0 || !s.bench.length) return null;
  const tired = s.onPitch.filter((lp) => lp.pos !== 'GK').sort((a, b) => a.cond - b.cond)[0];
  const losing = aggGoals(m, side) < aggGoals(m, side === 0 ? 1 : 0);
  if (!tired) return null;
  if (tired.cond < 68 || (losing && m.minute > 64) || tired.rating < 5.8) {
    return autoSub(g, m, side, tired, false);
  }
  return null;
}

function finishLive(g: GameState, m: LiveMatch, evs: MatchEvent[]) {
  m.finished = true;
  const [H, A] = m.sides;
  if (m.knockout && aggGoals(m, 0) === aggGoals(m, 1)) {
    const pens = shootout(g, m);
    m.pens = pens;
    evs.push({ minute: 90, type: 'pens', team: pens[0] > pens[1] ? 0 : 1, text: `Penalties! ${g.clubs[(pens[0] > pens[1] ? H : A).clubId].name} win the shootout ${pens[0]}-${pens[1]}!` });
  }
  const agg = m.agg0 ? ` (${aggGoals(m, 0)}-${aggGoals(m, 1)} on aggregate)` : '';
  evs.push({ minute: 90, type: 'ft', team: -1, text: `Full-time: ${g.clubs[H.clubId].name} ${m.score[0]} - ${m.score[1]} ${g.clubs[A.clubId].name}${agg}${m.pens ? ` (${m.pens[0]}-${m.pens[1]} pens)` : ''}` });
  if (m.agg0 && !m.pens) {
    const w = aggGoals(m, 0) > aggGoals(m, 1) ? H : A;
    evs.push({ minute: 90, type: 'info', team: -1, text: `${g.clubs[w.clubId].name} go through ${Math.max(aggGoals(m, 0), aggGoals(m, 1))}-${Math.min(aggGoals(m, 0), aggGoals(m, 1))} on aggregate.` });
  }
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
  // Friendlies count for fitness and match practice only: no stats, cards, suspensions or manager record
  const friendly = f.comp === 'FRN';
  if (!friendly) noteMatch(g, m);
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
    if (friendly) {
      p.condition = Math.round(lp.cond);
      p.monthMins += mins * 0.6;
      if (lp.injured && chance(0.5)) p.injury = randomInjury(0.5);
      continue;
    }
    // Player updates
    p.stats.apps++;
    p.stats.mins += mins;
    p.stats.goals += lp.goals;
    p.stats.assists += lp.assists;
    p.stats.ratingSum += r;
    if (lp.yellow) { p.stats.yellows++; p.yellowAcc++; }
    if (lp.red) { p.stats.reds++; p.suspended += lp.yellow ? 1 : 3; }
    // detailed numbers (passes accumulate fractionally during the match)
    lp.s.mins = mins;
    lp.s.goals = lp.goals;
    lp.s.assists = lp.assists;
    lp.s.passes = Math.round(lp.s.passes);
    lp.s.passC = Math.min(lp.s.passes, Math.round(lp.s.passC));
    const st = p.stats;
    st.shots += lp.s.shots; st.sot += lp.s.sot; st.xg += lp.s.xg; st.kp += lp.s.kp; st.xa += lp.s.xa;
    st.passes += lp.s.passes; st.passC += lp.s.passC; st.drb += lp.s.drb; st.drbA += lp.s.drbA;
    st.tkl += lp.s.tkl; st.int += lp.s.int; st.clr += lp.s.clr; st.fouls += lp.s.fouls; st.saves += lp.s.saves; st.conceded += lp.s.conceded;
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
  if (motm && !friendly) g.players[motm.id].stats.motm++;
  const result: FixtureResult = {
    hg: m.score[0],
    ag: m.score[1],
    pens: m.pens,
    agg: m.agg0 ? [aggGoals(m, 0), aggGoals(m, 1)] : undefined,
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
  // Suspensions served: players of both clubs who were suspended and not involved (not in friendlies)
  for (const clubId of friendly ? [] : [f.home, f.away]) {
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
  const [h, a] = r.agg ?? [r.hg, r.ag];
  if (h > a) return f.home;
  if (a > h) return f.away;
  if (r.pens) return r.pens[0] > r.pens[1] ? f.home : f.away;
  return null;
}

export function changeTactics(g: GameState, m: LiveMatch, side: 0 | 1, t: Partial<Tactics>) {
  const s = m.sides[side];
  if (s.clubId === g.userClubId && !m.finished) {
    noteTactics(g, t.mentality !== undefined && t.mentality !== s.tactics.mentality ? t.mentality : undefined, !!t.formation && t.formation !== s.tactics.formation);
    // A good motivator's shouts lift the players a little
    if (t.mentality !== undefined && t.mentality !== s.tactics.mentality) {
      const lift = Math.max(0, 2 * mgr(g, 'motivating'));
      for (const lp of s.onPitch) { const p = g.players[lp.id]; p.morale = Math.min(100, p.morale + lift); }
    }
  }
  if (t.formation && t.formation !== s.tactics.formation) changeFormation(g, m, side, t.formation);
  for (const [k, v] of Object.entries(t)) {
    if (k !== 'formation' && v !== undefined) (s.tactics as unknown as Record<string, unknown>)[k] = v;
  }
  computeStrength(g, s);
}

/** Switch formation mid-match: players on the pitch are re-slotted to the positions that suit them best. */
export function changeFormation(g: GameState, m: LiveMatch, side: 0 | 1, formation: string) {
  const s = m.sides[side];
  const slots = FORMATIONS[formation];
  if (!slots) return;
  const pairs: { r: number; slot: number; lp: LivePlayer }[] = [];
  slots.forEach((slot, i) => {
    for (const lp of s.onPitch) {
      const p = g.players[lp.id];
      // keepers stay in goal; outfielders never go in goal unless there's no keeper
      const gkPenalty = (slot.pos === 'GK') !== (lp.pos === 'GK') ? -200 : 0;
      pairs.push({ r: ratingAt(p, slot.pos) + gkPenalty, slot: i, lp });
    }
  });
  pairs.sort((a, b) => b.r - a.r);
  const usedSlots = new Set<number>();
  const placed = new Set<LivePlayer>();
  for (const pr of pairs) {
    if (usedSlots.has(pr.slot) || placed.has(pr.lp)) continue;
    usedSlots.add(pr.slot);
    placed.add(pr.lp);
    const sl = slots[pr.slot];
    pr.lp.slot = pr.slot;
    pr.lp.pos = sl.pos;
    pr.lp.x = sl.x;
    pr.lp.y = sl.y;
  }
  // keep a role choice where the new slot has the same position as before
  const oldSlots = FORMATIONS[s.tactics.formation];
  const roles = slots.map((sl) => {
    const j = oldSlots.findIndex((o) => o.pos === sl.pos);
    const prev = j >= 0 ? s.tactics.roles[j] : undefined;
    return ROLES[sl.pos].some((r) => r.id === prev) ? prev! : ROLES[sl.pos][0].id;
  });
  s.tactics = normaliseTactics({ ...s.tactics, formation, roles });
  if (s.clubId !== g.userClubId) s.tactics.runs = autoRuns(s.tactics, s.clubId);
  computeStrength(g, s);
  m.events.push({ minute: m.minute, type: 'info', team: side, text: `${g.clubs[s.clubId].short} switch to a ${formation}.` });
}
