import { useSyncExternalStore } from 'react';
import { del, get, set } from 'idb-keyval';
import { CM_REV, type CmWorld } from './game/cm0102/parse';
import { CM_ECONOMY, setEconomy } from './game/economy';
import { getSeed, seed } from './game/rng';
import { ATTR_KEYS, type Attrs, type GameState } from './game/types';
import { SAVE_VERSION, emptyStats, withNaturalAlt } from './game/generate';
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
  setEconomy(g);
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
  era?: GameState['era'];
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
    // saves from before real players always had their natural second position
    if (p.pos !== 'GK') p.alt = withNaturalAlt(p.alt ?? [], p.pos, p.real);
  }
  for (const c of Object.values(g.clubs)) c.tactics = normaliseTactics(c.tactics);
  // CM 01/02 saves from before the 2002 economy: convert today's prices to 2002 ones
  if (g.era === 'cm0102' && !g.econ) {
    const f = (v: number) => Math.round(v * CM_ECONOMY.fee);
    const b = (v: number) => Math.round(v * CM_ECONOMY.budget);
    const w = (v: number) => Math.round(v * CM_ECONOMY.pay);
    for (const p of Object.values(g.players)) p.wage = w(p.wage);
    for (const c of Object.values(g.clubs)) {
      c.balance = b(c.balance); c.transferBudget = b(c.transferBudget); c.wageBudget = w(c.wageBudget);
      c.seasonIncome = w(c.seasonIncome); c.seasonExpense = w(c.seasonExpense);
    }
    for (const l of g.ledger) { l.income = w(l.income); l.expense = w(l.expense); l.balance = b(l.balance); }
    if (g.ledgerMark) g.ledgerMark = { i: w(g.ledgerMark.i), e: w(g.ledgerMark.e) };
    for (const o of g.offers) { o.fee = f(o.fee); o.wage = w(o.wage); if (o.counter) o.counter = f(o.counter); }
    for (const t of g.transfers) t.fee = f(t.fee);
    g.econ = 1;
  }
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

// Game date of the last save per slot, so autosave only writes once a game week.
const lastSaved: Record<string, string> = {};
const AUTOSAVE_DAYS = 7;
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

/** Autosave: overwrites the career's single save file, at most once every 7 game days. */
export async function autoSave(g: GameState | null = game, force = false) {
  if (!g) return;
  const last = lastSaved[g.slot];
  if (!force && last && daysBetween(last, g.date) < AUTOSAVE_DAYS) return;
  await saveGame(g);
}

export async function saveGame(g: GameState = game!) {
  if (!g) return;
  lastSaved[g.slot] = g.date;
  g.rng = getSeed();
  const club = g.clubs[g.userClubId];
  await set(saveKey(g.slot), compact(g));
  const metas = (await listSaves()).filter((m) => m.slot !== g.slot);
  metas.unshift({ slot: g.slot, manager: g.manager, club: club.name, colors: club.colors, date: g.date, mode: g.mode, era: g.era, savedAt: Date.now() });
  await set(META_KEY, metas);
}

export async function loadGame(slot: string) {
  const raw = (await get(saveKey(slot))) as string | undefined;
  if (!raw) throw new Error('Save not found');
  const g = expand(raw);
  if (g.saveVersion !== SAVE_VERSION) throw new Error('This save is from an incompatible version.');
  // JSON turns numeric record keys into strings; that's fine for lookups.
  lastSaved[g.slot] = g.date;
  setGame(g);
}

export async function deleteSave(slot: string) {
  await del(saveKey(slot));
  await set(META_KEY, (await listSaves()).filter((m) => m.slot !== slot));
}

// Closing or backgrounding the app saves too, so weekly autosave never loses progress.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') autoSave(game, true).catch(() => {});
  });
}

// The player's imported CM 01/02 database (kept on this device only)
const CM_KEY = 'fmj-cm0102';

export async function loadCmWorld(): Promise<CmWorld | null> {
  try {
    const w = (await get(CM_KEY)) as CmWorld | undefined;
    // An older copy of the built-in database is replaced by the current one
    return w && (w.rev ?? 1) >= CM_REV ? w : null;
  } catch {
    return null;
  }
}

export async function saveCmWorld(w: CmWorld | null) {
  if (w) await set(CM_KEY, w);
  else await del(CM_KEY);
}
