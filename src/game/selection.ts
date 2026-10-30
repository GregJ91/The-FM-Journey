import { FORMATIONS } from './formations';
import { POS_GROUP, age, overall, ratingAt } from './ratings';
import type { Club, GameState, Player } from './types';

export function available(p: Player) {
  return !p.injury && p.suspended <= 0 && !p.away;
}

/** AI clubs give young prospects minutes: a selection bonus for players aged 21 or under with room to grow. */
export interface YouthPolicy { date: string; bonus: number }

/** Effective selection score: ability at position, nudged down by low condition. */
function selectionScore(p: Player, pos: Player['pos'], rotate: boolean, youth?: YouthPolicy) {
  let s = ratingAt(p, pos);
  if (youth && p.pa >= overall(p) + 4 && age(p, youth.date) <= 21) s += youth.bonus;
  if (rotate) {
    if (p.condition < 60) s *= 0.8;
    else if (p.condition < 75) s *= 0.93;
  }
  return s;
}

/** Greedy best-XI for the club's formation from the given squad. */
export function pickLineup(club: Club, squad: Player[], rotate = true, youth?: YouthPolicy) {
  const slots = FORMATIONS[club.tactics.formation] ?? FORMATIONS['4-4-2'];
  const pool = squad.filter(available);
  const pairs: { s: number; slot: number; p: Player }[] = [];
  slots.forEach((slot, i) => {
    for (const p of pool) pairs.push({ s: selectionScore(p, slot.pos, rotate, youth), slot: i, p });
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

/** A first-team squad CM-style: this many players, with at least this cover in each part of the pitch. */
const FIRST_TEAM_SIZE = 25;
const FIRST_TEAM_COVER: Record<'GK' | 'DEF' | 'MID' | 'ATT', number> = { GK: 3, DEF: 7, MID: 7, ATT: 4 };

/**
 * Send the weaker senior players to the reserves, keeping the best first-team squad with cover in every position
 * (loanees stay: they came to play). Returns the players moved.
 */
export function sendFringeToReserves(g: GameState, clubId: number, size = FIRST_TEAM_SIZE): Player[] {
  const club = g.clubs[clubId];
  const first = Object.values(g.players).filter((p) => p.clubId === clubId && p.squad === 'first');
  if (first.length <= size) return [];
  const best = [...first].sort((a, b) => overall(b) - overall(a));
  const keep = new Set<number>(first.filter((p) => p.loan).map((p) => p.id));
  for (const [grp, n] of Object.entries(FIRST_TEAM_COVER)) {
    best.filter((p) => POS_GROUP[p.pos] === grp).slice(0, n).forEach((p) => keep.add(p.id));
  }
  for (const p of best) { if (keep.size >= size) break; keep.add(p.id); }
  const moved = first.filter((p) => !keep.has(p.id));
  for (const p of moved) p.squad = 'reserve';
  // If any of them were in the team or on the bench, pick the side again from the first-team squad
  const gone = new Set(moved.map((p) => p.id));
  if (club.lineup.some((id) => id !== null && gone.has(id)) || club.subs.some((id) => gone.has(id))) {
    const r = pickLineup(club, first.filter((p) => keep.has(p.id)));
    club.lineup = r.lineup;
    club.subs = r.subs;
  }
  return moved;
}

/** What a matchday squad needs fit: enough players for a team and a bench, and cover in each part of the pitch. */
const MATCH_COVER: Record<'GK' | 'DEF' | 'MID' | 'ATT', number> = { GK: 2, DEF: 5, MID: 5, ATT: 3 };
const MATCH_SQUAD = 16;

/**
 * The assistant calls players up from the reserves when the first team is short (injuries, suspensions,
 * internationals, sales): the best fit reserves for the positions that need cover, then for numbers. They stay in
 * the first-team squad afterwards; you can send them back. Returns the players promoted.
 */
export function coverFromReserves(g: GameState, clubId: number): Player[] {
  const fit = (p: Player) => !p.injury && p.suspended <= 0 && !p.away;
  const first: Player[] = [];
  const reserves: Player[] = [];
  for (const p of Object.values(g.players)) {
    if (p.clubId !== clubId) continue;
    if (p.squad === 'first') first.push(p);
    else if (p.squad === 'reserve' && fit(p)) reserves.push(p);
  }
  if (!reserves.length) return [];
  reserves.sort((a, b) => overall(b) - overall(a));
  const up: Player[] = [];
  const promote = (p: Player) => { p.squad = 'first'; up.push(p); reserves.splice(reserves.indexOf(p), 1); first.push(p); };
  for (const [grp, n] of Object.entries(MATCH_COVER)) {
    let have = first.filter((p) => fit(p) && POS_GROUP[p.pos] === grp).length;
    while (have < n) {
      const r = reserves.find((p) => POS_GROUP[p.pos] === grp);
      if (!r) break;
      promote(r);
      have++;
    }
  }
  while (first.filter(fit).length < MATCH_SQUAD && reserves.length) promote(reserves[0]);
  return up;
}
