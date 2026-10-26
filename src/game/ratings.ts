import { ATTR_KEYS, type AttrKey, type Attrs, type Player, type Pos } from './types';
import { ageOn } from './dates';
import { hash, normal, rand } from './rng';

export const POSITIONS: Pos[] = ['GK', 'DR', 'DC', 'DL', 'DM', 'MR', 'MC', 'ML', 'AMR', 'AMC', 'AML', 'ST'];

export const POS_GROUP: Record<Pos, 'GK' | 'DEF' | 'MID' | 'ATT'> = {
  GK: 'GK', DL: 'DEF', DC: 'DEF', DR: 'DEF', DM: 'MID', ML: 'MID', MC: 'MID', MR: 'MID',
  AML: 'ATT', AMC: 'ATT', AMR: 'ATT', ST: 'ATT',
};

export const ATTR_LABEL: Record<AttrKey, string> = {
  finishing: 'Finishing', passing: 'Passing', dribbling: 'Dribbling', firstTouch: 'First Touch',
  crossing: 'Crossing', tackling: 'Tackling', heading: 'Heading', vision: 'Vision',
  decisions: 'Decisions', composure: 'Composure', positioning: 'Positioning', workRate: 'Work Rate',
  pace: 'Pace', stamina: 'Stamina', strength: 'Strength', reflexes: 'Reflexes', handling: 'Handling',
  aerial: 'Aerial Reach', distribution: 'Distribution',
};

export const ATTR_GROUPS: { name: string; keys: AttrKey[] }[] = [
  { name: 'Technical', keys: ['finishing', 'passing', 'dribbling', 'firstTouch', 'crossing', 'tackling', 'heading'] },
  { name: 'Mental', keys: ['vision', 'decisions', 'composure', 'positioning', 'workRate'] },
  { name: 'Physical', keys: ['pace', 'stamina', 'strength'] },
  { name: 'Goalkeeping', keys: ['reflexes', 'handling', 'aerial', 'distribution'] },
];

type W = Partial<Record<AttrKey, number>>;
export const POS_WEIGHTS: Record<Pos, W> = {
  GK: { reflexes: 5, handling: 4, aerial: 3, distribution: 2, positioning: 2, decisions: 1.5, composure: 1 },
  DC: { tackling: 4, positioning: 4, heading: 3.5, strength: 2.5, pace: 1.5, decisions: 2, composure: 1.5, passing: 1, firstTouch: 0.5, workRate: 1 },
  DL: { tackling: 3, positioning: 2.5, pace: 3, crossing: 2, stamina: 2, passing: 1.5, dribbling: 1, workRate: 1.5, decisions: 1, heading: 0.5 },
  DR: { tackling: 3, positioning: 2.5, pace: 3, crossing: 2, stamina: 2, passing: 1.5, dribbling: 1, workRate: 1.5, decisions: 1, heading: 0.5 },
  DM: { tackling: 3, positioning: 3, passing: 3, decisions: 2.5, workRate: 2, stamina: 1.5, strength: 1.5, vision: 1, firstTouch: 1, composure: 1 },
  MC: { passing: 4, vision: 3, decisions: 2.5, firstTouch: 2.5, workRate: 1.5, stamina: 1.5, dribbling: 1.5, composure: 1.5, tackling: 1, finishing: 0.5 },
  ML: { crossing: 3, pace: 3, dribbling: 2.5, passing: 2, stamina: 2, workRate: 1.5, firstTouch: 1.5, vision: 1, decisions: 1 },
  MR: { crossing: 3, pace: 3, dribbling: 2.5, passing: 2, stamina: 2, workRate: 1.5, firstTouch: 1.5, vision: 1, decisions: 1 },
  AMC: { passing: 3, vision: 3.5, dribbling: 3, firstTouch: 3, finishing: 2, composure: 2, decisions: 2, pace: 1 },
  AML: { dribbling: 4, pace: 3.5, crossing: 2, finishing: 2.5, firstTouch: 2.5, vision: 1.5, composure: 1.5, passing: 1.5 },
  AMR: { dribbling: 4, pace: 3.5, crossing: 2, finishing: 2.5, firstTouch: 2.5, vision: 1.5, composure: 1.5, passing: 1.5 },
  ST: { finishing: 5, composure: 3, firstTouch: 2.5, heading: 2, pace: 2.5, dribbling: 1.5, strength: 1.5, positioning: 2, decisions: 1 },
};

const WEIGHT_SUM: Record<Pos, number> = Object.fromEntries(
  POSITIONS.map((p) => [p, Object.values(POS_WEIGHTS[p]).reduce((a, b) => a + (b ?? 0), 0)]),
) as Record<Pos, number>;

/** Attribute average (1-20) → overall (1-99). */
export function avgToOvr(avg: number) {
  return avg * 4.6 + 10;
}

export function rawOverallAt(attrs: Attrs, pos: Pos) {
  const w = POS_WEIGHTS[pos];
  let s = 0;
  for (const k in w) s += attrs[k as AttrKey] * (w[k as AttrKey] ?? 0);
  return avgToOvr(s / WEIGHT_SUM[pos]);
}

export function familiarity(p: Player, pos: Pos) {
  if (p.pos === pos) return 1;
  if (p.alt.includes(pos)) return 0.97;
  const g1 = POS_GROUP[p.pos];
  const g2 = POS_GROUP[pos];
  if (g1 === 'GK' || g2 === 'GK') return 0.45;
  if (g1 === g2) return 0.9;
  if (g1 === 'MID' || g2 === 'MID') return 0.82;
  return 0.72;
}

/** Effective rating of a player when played at `pos` (1-99). */
export function ratingAt(p: Player, pos: Pos) {
  return Math.max(1, Math.min(99, rawOverallAt(p.attrs, pos) * familiarity(p, pos)));
}

export function overall(p: Player) {
  return Math.round(Math.max(1, Math.min(99, rawOverallAt(p.attrs, p.pos))));
}

export function age(p: Player, date: string) {
  return ageOn(p.dob, date);
}

/** Generate attributes for a position hitting a target overall. */
export function generateAttrs(pos: Pos, target: number, style?: string): Attrs {
  const base = (target - 10) / 4.6;
  const w = POS_WEIGHTS[pos];
  const attrs = {} as Attrs;
  const isGK = pos === 'GK';
  for (const k of ATTR_KEYS) {
    const weight = w[k] ?? 0;
    let v: number;
    const gkAttr = k === 'reflexes' || k === 'handling' || k === 'aerial' || k === 'distribution';
    if (isGK && !gkAttr && weight === 0) v = base * 0.45 + normal(0, 1.5);
    else if (!isGK && gkAttr) v = 1 + rand() * 3;
    else if (weight > 0) v = base + weight * 0.25 + normal(0, 1);
    else v = base - 2.5 + normal(0, 2);
    attrs[k] = v;
  }
  if (style) applyStyle(attrs, style);
  // Shift weighted attributes so the overall hits the target
  for (let i = 0; i < 6; i++) {
    for (const k of ATTR_KEYS) attrs[k] = clampAttr(attrs[k]);
    const diff = target - rawOverallAt(attrs, pos);
    if (Math.abs(diff) < 0.2) break;
    const step = diff / 4.6;
    for (const k in w) attrs[k as AttrKey] += step;
  }
  for (const k of ATTR_KEYS) attrs[k] = clampAttr(attrs[k]);
  return attrs;
}

function applyStyle(a: Attrs, style: string) {
  for (const s of style.split('')) {
    if (s === 'p') { a.pace += 3; a.strength -= 1; }
    if (s === 's') { a.strength += 3; a.heading += 2; a.pace -= 1.5; }
    if (s === 't') { a.dribbling += 2; a.firstTouch += 2; a.vision += 1; }
    if (s === 'v') { a.vision += 3; a.passing += 2; }
    if (s === 'f') { a.finishing += 2; a.composure += 2; }
    if (s === 'w') { a.workRate += 3; a.stamina += 2; }
    if (s === 'h') { a.heading += 3; a.aerial += 1; }
    if (s === 'c') { a.crossing += 3; }
  }
}

export function clampAttr(v: number) {
  return Math.max(1, Math.min(20, v));
}

export function altPositionsFor(pos: Pos): Pos[] {
  const opts: Record<Pos, Pos[]> = {
    GK: [],
    DC: ['DM', 'DR', 'DL'],
    DL: ['ML', 'DC', 'DR'],
    DR: ['MR', 'DC', 'DL'],
    DM: ['MC', 'DC'],
    MC: ['DM', 'AMC', 'MR', 'ML'],
    ML: ['AML', 'DL', 'MC', 'MR'],
    MR: ['AMR', 'DR', 'MC', 'ML'],
    AMC: ['MC', 'ST', 'AML', 'AMR'],
    AML: ['ML', 'AMR', 'ST', 'AMC'],
    AMR: ['MR', 'AML', 'ST', 'AMC'],
    ST: ['AMC', 'AML', 'AMR'],
  };
  const pool = opts[pos];
  const out: Pos[] = [];
  for (const p of pool) if (rand() < (out.length === 0 ? 0.6 : 0.25)) out.push(p);
  return out;
}

// ---------- Value & wages ----------

export function marketValue(p: Player, date: string) {
  const ovr = overall(p);
  const a = age(p, date);
  let v = Math.pow(10, (ovr - 40) / 12.5) * 12000;
  const ageMult = a <= 19 ? 1.6 : a <= 21 ? 1.5 : a <= 24 ? 1.3 : a <= 27 ? 1.0 : a <= 29 ? 0.8 : a <= 31 ? 0.55 : a <= 33 ? 0.35 : 0.15;
  v *= ageMult;
  if (a < 24) v *= 1 + Math.max(0, p.pa - ovr) * 0.04;
  const yearsLeft = p.contractEnd - Number(date.slice(0, 4)) + (Number(date.slice(5, 7)) <= 6 ? 0 : -1);
  if (yearsLeft <= 0) v *= 0.45;
  else if (yearsLeft === 1) v *= 0.75;
  if (p.injury && p.injury.days > 30) v *= 0.85;
  return roundMoney(v);
}

export function wageFor(ovr: number, rep = 50) {
  const w = 400 * Math.pow(10, (ovr - 40) / 18) * (0.85 + rep / 300);
  return roundMoney(w);
}

export function roundMoney(v: number) {
  if (v >= 10_000_000) return Math.round(v / 500_000) * 500_000;
  if (v >= 1_000_000) return Math.round(v / 100_000) * 100_000;
  if (v >= 100_000) return Math.round(v / 5_000) * 5_000;
  if (v >= 10_000) return Math.round(v / 1_000) * 1_000;
  if (v >= 1_000) return Math.round(v / 100) * 100;
  return Math.max(0, Math.round(v / 10) * 10);
}

export function fmtMoney(v: number) {
  const neg = v < 0;
  const a = Math.abs(v);
  let s: string;
  if (a >= 1_000_000_000) s = `£${(a / 1_000_000_000).toFixed(2)}bn`;
  else if (a >= 1_000_000) s = `£${(a / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1)}m`;
  else if (a >= 1_000) s = `£${Math.round(a / 1_000)}k`;
  else s = `£${Math.round(a)}`;
  return neg ? `-${s}` : s;
}

/** Star rating (0.5 - 5) relative to an overall scale. */
export function stars(ovr: number) {
  const s = (ovr - 40) / 10;
  return Math.max(0.5, Math.min(5, Math.round(s * 2) / 2));
}

/** Scouted potential: exact for own players, fuzzed for others. */
export function scoutedPotential(p: Player, isOwn: boolean) {
  if (isOwn) return p.pa;
  const fuzz = Math.round((hash(p.id) - 0.5) * 8);
  return Math.max(overall(p), Math.min(99, p.pa + fuzz));
}

export function avgRating(p: Player) {
  return p.stats.apps ? p.stats.ratingSum / p.stats.apps : 0;
}

export function fullName(p: Player) {
  return p.first ? `${p.first} ${p.last}` : p.last;
}

export function shortName(p: Player) {
  return p.first ? `${p.first[0]}. ${p.last}` : p.last;
}
