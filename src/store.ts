import { useSyncExternalStore } from 'react';
import { del, get, set } from 'idb-keyval';
import { getSeed, seed } from './game/rng';
import { ATTR_KEYS, type Attrs, type GameState } from './game/types';
import { SAVE_VERSION, emptyStats } from './game/generate';
import { normaliseTactics } from './game/tactics';
import { assignAllShirtNumbers } from './game/shirts';

let game: GameState | null = null;
let version = 0;
const listeners = new Set<() => void>();

function emit() {
  version++;
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getGame() {
  return game;
}

export function setGame(g: GameState | null) {
  game = g;
  if (g) seed(g.rng || 1);
  emit();
}

/** Run a mutation against the game state and re-render subscribers. */
export function mutate<T>(fn: (g: GameState) => T): T {
  if (!game) throw new Error('No game loaded');
  const out = fn(game);
  game.rng = getSeed();
  emit();
  return out;
}

export function useGame(): GameState {
  useSyncExternalStore(subscribe, () => version);
  return game!;
}

export function useVersion() {
  return useSyncExternalStore(subscribe, () => version);
}

// ---------------- Persistence (IndexedDB) ----------------

export interface SaveMeta {
  slot: string;
  manager: string;
  club: string;
  colors: [string, string];
  date: string;
  mode: GameState['mode'];
  savedAt: number;
}

const META_KEY = 'fmj-saves';
const saveKey = (slot: string) => `fmj-save-${slot}`;

// Attributes are stored as arrays in ATTR_KEYS order to keep saves small.
export function compact(g: GameState) {
  return JSON.stringify(g, (k, v) => {
    if (k === 'attrs' && v && typeof v === 'object' && !Array.isArray(v)) return ATTR_KEYS.map((a) => Math.round((v as Attrs)[a] * 100) / 100);
    return typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 100) / 100 : v;
  });
}

export function expand(raw: string): GameState {
  const g = JSON.parse(raw) as GameState;
  const blank = emptyStats();
  for (const p of Object.values(g.players)) {
    const a = p.attrs as unknown;
    if (Array.isArray(a)) p.attrs = Object.fromEntries(ATTR_KEYS.map((k, i) => [k, a[i]])) as Attrs;
    // saves from before detailed stats existed
    p.stats = { ...blank, ...p.stats };
  }
  for (const c of Object.values(g.clubs)) c.tactics = normaliseTactics(c.tactics);
  // saves from before squad numbers existed
  if (Object.values(g.players).some((p) => p.clubId !== null && p.shirt === undefined)) assignAllShirtNumbers(g);
  return g;
}

export async function listSaves(): Promise<SaveMeta[]> {
  try {
    return ((await get(META_KEY)) as SaveMeta[] | undefined) ?? [];
  } catch {
    return [];
  }
}

export async function saveGame(g: GameState = game!) {
  if (!g) return;
  g.rng = getSeed();
  const club = g.clubs[g.userClubId];
  await set(saveKey(g.slot), compact(g));
  const metas = (await listSaves()).filter((m) => m.slot !== g.slot);
  metas.unshift({ slot: g.slot, manager: g.manager, club: club.name, colors: club.colors, date: g.date, mode: g.mode, savedAt: Date.now() });
  await set(META_KEY, metas);
}

export async function loadGame(slot: string) {
  const raw = (await get(saveKey(slot))) as string | undefined;
  if (!raw) throw new Error('Save not found');
  const g = expand(raw);
  if (g.saveVersion !== SAVE_VERSION) throw new Error('This save is from an incompatible version.');
  // JSON turns numeric record keys into strings; that's fine for lookups.
  setGame(g);
}

export async function deleteSave(slot: string) {
  await del(saveKey(slot));
  await set(META_KEY, (await listSaves()).filter((m) => m.slot !== slot));
}
