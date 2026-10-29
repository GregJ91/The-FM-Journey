// How well a player fits a slot in a team's system: his rating in the position, the key attributes for the
// role, and the demands of the team's tactics (pressing, defensive line, passing style).
import { ATTR_LABEL, overall, ratingAt } from './ratings';
import { roleFor } from './tactics';
import type { AttrKey, Player, Pos, Tactics } from './types';

/** Key attributes for each role (FM's highlighted attributes, simplified). */
export const ROLE_KEYS: Record<string, AttrKey[]> = {
  gk: ['reflexes', 'handling', 'positioning'], sk: ['reflexes', 'distribution', 'composure'],
  cd: ['tackling', 'positioning', 'heading'], bpd: ['passing', 'composure', 'tackling'], ncb: ['tackling', 'heading', 'strength'],
  fb: ['tackling', 'positioning', 'stamina'], wb: ['stamina', 'pace', 'crossing'], ifb: ['passing', 'decisions', 'tackling'],
  dm: ['tackling', 'positioning', 'workRate'], dlp: ['passing', 'vision', 'composure'], anc: ['positioning', 'tackling', 'decisions'],
  cm: ['passing', 'workRate', 'decisions'], b2b: ['stamina', 'workRate', 'tackling'], ap: ['vision', 'passing', 'firstTouch'], mez: ['dribbling', 'passing', 'workRate'],
  wm: ['workRate', 'crossing', 'stamina'], w: ['pace', 'dribbling', 'crossing'], dw: ['workRate', 'tackling', 'stamina'],
  if: ['finishing', 'dribbling', 'pace'], iw: ['passing', 'dribbling', 'vision'],
  am: ['passing', 'vision', 'firstTouch'], ss: ['finishing', 'composure', 'workRate'],
  af: ['finishing', 'pace', 'composure'], p: ['finishing', 'composure', 'positioning'], tm: ['heading', 'strength', 'firstTouch'],
  f9: ['passing', 'vision', 'firstTouch'], pf: ['workRate', 'stamina', 'pace'],
};

export interface FitLine { good: boolean; text: string }
export interface Fit { score: number; label: string; lines: FitLine[]; role: string }

const DEF: Pos[] = ['DC', 'DL', 'DR', 'DM'];
const WIDE: Pos[] = ['AML', 'AMR', 'ML', 'MR', 'DL', 'DR'];

/** Fit of `p` for a slot (position + role id) in a team playing `t`. Score 0-100. */
export function systemFit(p: Player, pos: Pos, roleId: string | undefined, t: Tactics): Fit {
  const role = roleFor(pos, roleId);
  const lines: FitLine[] = [];
  const rating = ratingAt(p, pos);
  const natural = p.pos === pos || p.alt.includes(pos);
  lines.push({ good: natural, text: natural ? `Natural ${pos}` : `Not a natural ${pos} (rated ${Math.round(rating)} there)` });

  const keys = ROLE_KEYS[role.id] ?? [];
  let keyAvg = 0;
  for (const k of keys) {
    const v = Math.round(p.attrs[k]);
    keyAvg += v;
    if (v >= 14) lines.push({ good: true, text: `${ATTR_LABEL[k]} ${v}: suits a ${role.name}` });
    else if (v <= 9) lines.push({ good: false, text: `${ATTR_LABEL[k]} ${v}: weak for a ${role.name}` });
  }
  keyAvg = keys.length ? keyAvg / keys.length : 10;

  // What the team's tactics ask of this position
  let tactical = 0;
  const demand = (cond: boolean, k: AttrKey, why: string) => {
    if (!cond) return;
    const v = Math.round(p.attrs[k]);
    if (v >= 14) { tactical += 1; lines.push({ good: true, text: `${ATTR_LABEL[k]} ${v}: ${why}` }); }
    else if (v <= 10) { tactical -= 1; lines.push({ good: false, text: `${ATTR_LABEL[k]} ${v}: ${why}` }); }
  };
  demand(t.pressing === 2, 'workRate', 'your high press needs work rate');
  demand(t.pressing === 2 && !DEF.includes(pos) && pos !== 'GK', 'stamina', 'pressing all game needs stamina');
  demand(t.line === 2 && DEF.includes(pos), 'pace', 'your high line needs quick defenders');
  demand((t.playOutBack || t.style === 'short') && (DEF.includes(pos) || pos === 'GK'), pos === 'GK' ? 'distribution' : 'passing', 'you play out from the back');
  demand(t.style === 'direct' && pos === 'ST', 'heading', 'direct balls need a strong aerial striker');
  demand(t.counter && WIDE.includes(pos), 'pace', 'counter-attacks need pace out wide');

  // Score = suitability, not quality (quality shows separately): are the role's key attributes his strengths,
  // is it his position, and does he suit the tactics?
  const own = (Object.keys(p.attrs) as AttrKey[]).filter((k) => (pos === 'GK') === ['reflexes', 'handling', 'aerial', 'distribution'].includes(k) || ['decisions', 'composure', 'positioning'].includes(k));
  const base = own.reduce((s, k) => s + p.attrs[k], 0) / Math.max(1, own.length);
  const posFit = natural ? 15 : Math.max(-25, Math.min(5, (rating - overall(p)) * 2));
  const score = Math.max(0, Math.min(100, Math.round(55 + (keyAvg - base) * 6 + posFit + tactical * 5)));
  return { score, label: fitLabel(score), lines: lines.slice(0, 6), role: role.name };
}

export function fitLabel(score: number) {
  return score >= 80 ? 'Excellent fit' : score >= 70 ? 'Good fit' : score >= 60 ? 'Decent fit' : score >= 50 ? 'Poor fit' : 'Doesn\'t fit';
}
