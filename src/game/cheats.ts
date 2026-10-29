// CM 01/02 careers: old-school cheats, switched on by giving your tactic a secret name.
//   "Champions" - your team wins about 90% of its games
//   "Moneybags" - £25m (2002 money) for transfers, once a season
//   "Iron Men"  - your players never get injured
import type { GameState, Tactics } from './types';

export type CheatId = 'champions' | 'moneybags' | 'ironmen';

export const CHEAT_NAMES: Record<CheatId, string> = { champions: 'Champions', moneybags: 'Moneybags', ironmen: 'Iron Men' };

/** Team-strength multiplier for "Champions", calibrated to about 90% wins (tests/cheats.test.ts). */
export const CHAMPIONS_EDGE = 1.48;

/** "Moneybags": £25m (cheats only work in CM careers, which run at 2002 prices). */
const MONEYBAGS = 25_000_000;

export function cheatOf(name: string | undefined): CheatId | null {
  const n = (name ?? '').toLowerCase().replace(/[^a-z]/g, '');
  return (Object.keys(CHEAT_NAMES) as CheatId[]).find((id) => CHEAT_NAMES[id].toLowerCase().replace(/[^a-z]/g, '') === n) ?? null;
}

/** Cheats only work in CM 01/02 careers, for the user's club. */
export function cheatOn(g: GameState, id: CheatId, tactics?: Tactics) {
  return g.era === 'cm0102' && cheatOf((tactics ?? g.clubs[g.userClubId]?.tactics)?.name) === id;
}

/** Called when the user names a tactic; returns a message when a cheat kicks in. */
export function activateCheat(g: GameState): string | null {
  const id = g.era === 'cm0102' ? cheatOf(g.clubs[g.userClubId].tactics.name) : null;
  if (!id) return null;
  if (id === 'moneybags') {
    const key = `cheat-moneybags-${g.season}`;
    g.events = g.events ?? [];
    if (g.events.includes(key)) return 'Moneybags: already used this season';
    g.events.push(key);
    const club = g.clubs[g.userClubId];
    club.transferBudget += MONEYBAGS;
    club.balance += MONEYBAGS;
    return 'Cheat activated: Moneybags';
  }
  return `Cheat activated: ${CHEAT_NAMES[id]}`;
}
