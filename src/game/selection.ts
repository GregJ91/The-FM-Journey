import { FORMATIONS } from './formations';
import { ratingAt } from './ratings';
import type { Club, Player } from './types';

export function available(p: Player) {
  return !p.injury && p.suspended <= 0;
}

/** Effective selection score: ability at position, nudged down by low condition. */
function selectionScore(p: Player, pos: Player['pos'], rotate: boolean) {
  let s = ratingAt(p, pos);
  if (rotate) {
    if (p.condition < 60) s *= 0.8;
    else if (p.condition < 75) s *= 0.93;
  }
  return s;
}

/** Greedy best-XI for the club's formation from the given squad. */
export function pickLineup(club: Club, squad: Player[], rotate = true) {
  const slots = FORMATIONS[club.tactics.formation] ?? FORMATIONS['4-4-2'];
  const pool = squad.filter(available);
  const pairs: { s: number; slot: number; p: Player }[] = [];
  slots.forEach((slot, i) => {
    for (const p of pool) pairs.push({ s: selectionScore(p, slot.pos, rotate), slot: i, p });
  });
  pairs.sort((a, b) => b.s - a.s);
  const lineup: (number | null)[] = new Array(slots.length).fill(null);
  const used = new Set<number>();
  for (const pr of pairs) {
    if (lineup[pr.slot] !== null || used.has(pr.p.id)) continue;
    lineup[pr.slot] = pr.p.id;
    used.add(pr.p.id);
  }
  const rest = pool.filter((p) => !used.has(p.id));
  const subs: number[] = [];
  const gk = rest.filter((p) => p.pos === 'GK').sort((a, b) => ratingAt(b, 'GK') - ratingAt(a, 'GK'))[0];
  if (gk) subs.push(gk.id);
  rest
    .filter((p) => p !== gk)
    .sort((a, b) => ratingAt(b, b.pos) * (b.condition / 100) - ratingAt(a, a.pos) * (a.condition / 100))
    .slice(0, 8)
    .forEach((p) => subs.push(p.id));
  return { lineup, subs };
}

/** Make sure the user's saved lineup is still valid; fill holes automatically. */
export function validateLineup(club: Club, squad: Player[]) {
  const slots = FORMATIONS[club.tactics.formation];
  if (club.lineup.length !== slots.length) club.lineup = new Array(slots.length).fill(null);
  const ok = new Set(squad.filter(available).map((p) => p.id));
  const seen = new Set<number>();
  club.lineup = club.lineup.map((id) => {
    if (id === null || !ok.has(id) || seen.has(id)) return null;
    seen.add(id);
    return id;
  });
  club.subs = club.subs.filter((id) => ok.has(id) && !seen.has(id));
  if (club.lineup.some((x) => x === null)) {
    // fill empty slots with best remaining
    const remaining = squad.filter((p) => ok.has(p.id) && !seen.has(p.id));
    club.lineup = club.lineup.map((id, i) => {
      if (id !== null) return id;
      let best: Player | null = null;
      let bs = -1;
      for (const p of remaining) {
        if (seen.has(p.id)) continue;
        const s = ratingAt(p, slots[i].pos);
        if (s > bs) { bs = s; best = p; }
      }
      if (best) { seen.add(best.id); return best.id; }
      return null;
    });
    club.subs = club.subs.filter((id) => !seen.has(id));
  }
  if (club.subs.length < 9) {
    const rest = squad.filter((p) => ok.has(p.id) && !seen.has(p.id) && !club.subs.includes(p.id));
    rest.sort((a, b) => ratingAt(b, b.pos) - ratingAt(a, a.pos));
    for (const p of rest) {
      if (club.subs.length >= 9) break;
      club.subs.push(p.id);
    }
  }
}

/** Pick the formation that gets the most out of a squad. */
export function bestFormation(club: Club, squad: Player[]) {
  let best = club.tactics.formation;
  let bestScore = -1;
  const original = club.tactics.formation;
  for (const f of Object.keys(FORMATIONS)) {
    club.tactics.formation = f;
    const { lineup } = pickLineup(club, squad, false);
    const slots = FORMATIONS[f];
    let s = 0;
    lineup.forEach((id, i) => {
      const p = id === null ? null : squad.find((x) => x.id === id);
      s += p ? ratingAt(p, slots[i].pos) : 0;
    });
    // small bias towards the common shapes
    if (f === '4-3-3' || f === '4-2-3-1' || f === '4-4-2') s += 3;
    if (s > bestScore) { bestScore = s; best = f; }
  }
  club.tactics.formation = original;
  return best;
}
