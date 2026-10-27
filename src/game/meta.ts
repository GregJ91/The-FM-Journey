// "Meta" clubs: their players get attribute profiles shaped towards what wins matches in the engine
// (pace, dribbling, finishing, composure; see the 'm'/'n'/'k' styles in ratings.ts), and the club gets
// a small extra team-strength edge. Overall ratings are unchanged.
import { applyStyle, clampAttr, rawOverallAt, POS_WEIGHTS } from './ratings';
import { ATTR_KEYS, type AttrKey, type Club, type Player, type Pos } from './types';

export const META_CLUBS = new Set(['Arsenal']);

/**
 * Team-strength multiplier for meta clubs. Calibrated so Arsenal win about 65% of games
 * against the rest of the big six (tests/meta.test.ts).
 */
export const META_TUNING = { edge: 1.095 };

export function isMetaClub(club: Club | undefined) {
  return !!club && META_CLUBS.has(club.name);
}

export function metaStyle(pos: Pos) {
  return pos === 'GK' ? 'k' : pos === 'DC' || pos === 'DL' || pos === 'DR' ? 'n' : 'm';
}

/** Reshape an existing player's attributes to the meta profile, keeping their overall (used for signings). */
export function applyMetaProfile(p: Player) {
  if (p.meta) return;
  const target = rawOverallAt(p.attrs, p.pos);
  applyStyle(p.attrs, metaStyle(p.pos));
  const w = POS_WEIGHTS[p.pos];
  for (let i = 0; i < 8; i++) {
    for (const k of ATTR_KEYS) p.attrs[k] = clampAttr(p.attrs[k]);
    const diff = target - rawOverallAt(p.attrs, p.pos);
    if (Math.abs(diff) < 0.05) break;
    for (const k in w) p.attrs[k as AttrKey] += diff / 4.6;
  }
  for (const k of ATTR_KEYS) p.attrs[k] = clampAttr(p.attrs[k]);
  p.meta = true;
}
