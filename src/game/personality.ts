// FM-style personalities. Every player has one (fixed per player, derived from their id unless set), with
// small effects on development and on how keen they are to sign for a club.
import { hash } from './rng';
import type { Player } from './types';

export type Personality =
  | 'Model Professional' | 'Professional' | 'Determined' | 'Ambitious' | 'Loyal' | 'Balanced'
  | 'Fairly Professional' | 'Mercenary' | 'Temperamental' | 'Casual' | 'Unambitious';

export interface PersonalityDef {
  name: Personality;
  weight: number; // how common
  dev: number; // development multiplier
  blurb: string;
  good: boolean | null; // shown green / red / neutral
}

export const PERSONALITIES: PersonalityDef[] = [
  { name: 'Model Professional', weight: 3, dev: 1.15, blurb: 'Trains hard, looks after himself and sets the standard.', good: true },
  { name: 'Professional', weight: 8, dev: 1.08, blurb: 'Diligent and reliable on and off the pitch.', good: true },
  { name: 'Determined', weight: 8, dev: 1.05, blurb: 'Never gives up and bounces back from setbacks.', good: true },
  { name: 'Ambitious', weight: 8, dev: 1.05, blurb: 'Wants to play at the highest level and win trophies.', good: null },
  { name: 'Loyal', weight: 6, dev: 1.0, blurb: 'Values stability and is hard to prise away from his club.', good: null },
  { name: 'Balanced', weight: 30, dev: 1.0, blurb: 'Steady temperament, no strong traits either way.', good: null },
  { name: 'Fairly Professional', weight: 14, dev: 1.03, blurb: 'Usually puts the work in.', good: true },
  { name: 'Mercenary', weight: 7, dev: 1.0, blurb: 'Follows the money above all else.', good: false },
  { name: 'Temperamental', weight: 6, dev: 0.97, blurb: 'Volatile: can lose his head or sulk.', good: false },
  { name: 'Casual', weight: 6, dev: 0.92, blurb: 'Does the minimum in training.', good: false },
  { name: 'Unambitious', weight: 4, dev: 0.96, blurb: 'Content where he is; happy at a smaller club.', good: false },
];

const TOTAL = PERSONALITIES.reduce((s, x) => s + x.weight, 0);

export function personalityOf(p: Player): PersonalityDef {
  if (p.personality) return PERSONALITIES.find((x) => x.name === p.personality) ?? PERSONALITIES[5];
  let r = hash(p.id * 7919 + 13) * TOTAL;
  for (const def of PERSONALITIES) {
    r -= def.weight;
    if (r < 0) return def;
  }
  return PERSONALITIES[5];
}
