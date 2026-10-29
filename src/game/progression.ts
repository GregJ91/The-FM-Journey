import { GUEST_LEAGUES } from './guests';
import { ATTR_GROUPS, POS_WEIGHTS, age, clampAttr, overall, rawOverallAt } from './ratings';
import { normal } from './rng';
import { mgr } from './manager';
import { personalityOf } from './personality';
import type { AttrKey, GameState, Player, TrainingFocus } from './types';

/**
 * Monthly development model
 * -------------------------
 * At the end of every month each player's overall (OVR) moves by:
 *
 *   change = (yearly age curve / 12) × modifiers + random noise
 *
 * Yearly age curve (OVR points per year, before modifiers):
 *   ≤17: +6   18: +5.5   19: +5   20: +4.5   21: +3.5   22: +2.5   23: +1.8   24: +1.2
 *   25: +0.6  26: +0.3   27: 0    28: -0.3   29: -0.6   30: -1.2   31: -1.8   32: -2.5
 *   33: -3.2  34: -4     35+: -5
 *
 * Growth (positive curve) is scaled by:
 *   potential gap   × clamp(gap / 10, 0, 1.2)  – far from potential = faster growth, none at potential
 *   training        × 0.75 / 1.0 / 1.25          (low / normal / high intensity)
 *   facilities      × 0.8 + 0.1 × level          (level 1-5 → 0.9 – 1.3)
 *   playing time    × 0.35 + 0.85 × min(1, minutes / 300) (youth-team minutes count half; youth
 *                   squad players count at least 0.2)
 *   match form      × 1 + clamp((avg rating − 6.8) × 0.3, −0.2, +0.25)
 * Decline (negative curve) is softened by playing regularly (×0.9) and good facilities,
 * and is worse with low playing time (×1.1).
 * Noise: normal(0, 0.25) OVR per month. Growth never pushes a player past their potential, and
 * players at their potential in their prime (27 or under) stay within about a point of it.
 *
 * The OVR change is then spread across attributes: training focus attributes get 2×,
 * position-relevant attributes 1.5×. Ageing players lose physical attributes first, while
 * mental attributes (decisions, composure, positioning) can still improve.
 */

const AGE_CURVE: [number, number][] = [
  [17, 6], [18, 5.5], [19, 5], [20, 4.5], [21, 3.5], [22, 2.5], [23, 1.8], [24, 1.2], [25, 0.6], [26, 0.3],
  [27, 0], [28, -0.3], [29, -0.6], [30, -1.2], [31, -1.8], [32, -2.5], [33, -3.2], [34, -4], [35, -5],
];

export function yearlyCurve(a: number) {
  if (a <= 17) return 6;
  if (a >= 35) return -5 - (a - 35) * 0.8;
  return AGE_CURVE.find(([x]) => x === a)![1];
}

const FOCUS_ATTRS: Record<TrainingFocus, AttrKey[]> = {
  balanced: [],
  attacking: ['finishing', 'dribbling', 'firstTouch', 'composure', 'crossing'],
  defending: ['tackling', 'positioning', 'heading', 'strength'],
  technical: ['passing', 'firstTouch', 'dribbling', 'vision', 'crossing'],
  physical: ['pace', 'stamina', 'strength', 'workRate'],
  mental: ['decisions', 'composure', 'vision', 'positioning', 'workRate'],
};

const PHYSICAL: AttrKey[] = ['pace', 'stamina', 'strength'];
const WISE: AttrKey[] = ['decisions', 'composure', 'positioning', 'vision'];
const GK_ATTRS: AttrKey[] = ['reflexes', 'handling', 'aerial', 'distribution'];

export function intensityFactor(i: GameState['training']['intensity']) {
  return i === 'low' ? 0.75 : i === 'high' ? 1.25 : 1;
}

export interface DevResult {
  player: Player;
  before: number;
  after: number;
}

export function monthlyDevelopment(g: GameState): DevResult[] {
  const out: DevResult[] = [];
  for (const p of Object.values(g.players)) {
    const before = overall(p);
    developPlayer(g, p);
    const after = overall(p);
    p.lastChange = after - before;
    p.monthMins = 0;
    p.monthRatings = [];
    if (p.clubId === g.userClubId) out.push({ player: p, before, after });
  }
  return out;
}

export function monthlyChange(g: GameState, p: Player) {
  const a = age(p, g.date);
  const club = p.clubId !== null ? g.clubs[p.clubId] : null;
  const isUser = club?.isUser;
  const curve = yearlyCurve(a);
  const ovr = rawOverallAt(p.attrs, p.pos);
  const gap = p.pa - ovr;
  const intensity = isUser ? intensityFactor(g.training.intensity) : 1;
  const facilities = club ? 0.8 + 0.1 * club.facilities.training : 0.7;
  // Guest clubs' domestic league games aren't simulated: regular starters count as playing
  const mins = club && GUEST_LEAGUES.includes(club.leagueId) ? Math.max(p.monthMins, club.lineup.includes(p.id) ? 300 : 120) : p.monthMins;
  // Youth-team matches count at half weight (see youth.ts); a youth player with no games at all still trains
  const minsRatio = p.squad === 'youth' ? Math.max(0.2, Math.min(1, mins / 300)) : Math.min(1, mins / 300);
  const playing = club ? 0.35 + 0.85 * minsRatio : 0.3;
  const avg = p.monthRatings.length ? p.monthRatings.reduce((s, x) => s + x, 0) / p.monthRatings.length : 6.8;
  const form = 1 + Math.max(-0.2, Math.min(0.25, (avg - 6.8) * 0.3));
  let change: number;
  if (curve > 0) {
    const gapF = Math.max(0, Math.min(1.2, gap / 10));
    change = (curve / 12) * gapF * intensity * facilities * playing * form;
    change = Math.min(change, Math.max(0, gap));
  } else {
    const soften = (minsRatio > 0.6 ? 0.9 : minsRatio < 0.2 ? 1.1 : 1) * (1.15 - 0.06 * (club?.facilities.training ?? 1));
    change = (curve / 12) * soften;
  }
  if (curve >= 0 && gap < 2) {
    // At their ceiling in their prime: small ups and downs around their potential, no drift
    change += normal(0, 0.12) + (p.pa - 0.6 - ovr) * 0.15;
  } else {
    change += normal(0, 0.25);
  }
  // A manager good with youngsters gets more out of their under-21s (up to +25%)
  if (isUser && a <= 21 && change > 0) change *= 1 + 0.25 * mgr(g, 'youth');
  // Personality: model professionals get more out of training, casual players less
  if (change > 0) change *= personalityOf(p).dev;
  if (curve >= 0 && change > 0 && ovr + change > p.pa) change = Math.max(0, p.pa - ovr);
  return change;
}

function developPlayer(g: GameState, p: Player) {
  const target = monthlyChange(g, p);
  if (Math.abs(target) < 0.01) return;
  const a = age(p, g.date);
  const isUser = p.clubId === g.userClubId;
  const focus: TrainingFocus = p.focus ?? (isUser ? (p.squad === 'youth' ? g.training.youthFocus : g.training.firstFocus) : 'balanced');
  const focusSet = new Set(FOCUS_ATTRS[focus]);
  const posW = POS_WEIGHTS[p.pos];
  const isGK = p.pos === 'GK';
  const weights: Partial<Record<AttrKey, number>> = {};
  for (const grp of ATTR_GROUPS) {
    for (const k of grp.keys) {
      if (!isGK && GK_ATTRS.includes(k)) continue;
      let w = 1;
      if (posW[k]) w *= 1.5;
      if (focusSet.has(k)) w *= 2;
      if (target < 0) {
        if (PHYSICAL.includes(k)) w *= a >= 29 ? 2.5 : 1;
        if (WISE.includes(k)) w *= 0.3;
      } else if (a <= 21 && PHYSICAL.includes(k)) w *= 1.2;
      weights[k] = w;
    }
  }
  // Unit distribution, then scale so the overall moves by `target`
  const keys = Object.keys(weights) as AttrKey[];
  const sumW = keys.reduce((s, k) => s + weights[k]!, 0);
  const trial = { ...p.attrs };
  for (const k of keys) trial[k] = trial[k] + weights[k]! / sumW * keys.length * 0.1;
  const unit = rawOverallAt(trial, p.pos) - rawOverallAt(p.attrs, p.pos);
  if (unit <= 0) return;
  const scale = (target / unit) * 0.1;
  for (const k of keys) {
    p.attrs[k] = clampAttr(p.attrs[k] + (weights[k]! / sumW) * keys.length * scale);
  }
  // Experienced players keep learning the mental side of the game
  if (a >= 28 && target < 0) {
    for (const k of WISE) p.attrs[k] = clampAttr(p.attrs[k] + 0.03);
  }
}
