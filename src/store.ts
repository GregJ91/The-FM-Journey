import { useSyncExternalStore } from 'react';
import { del, get, set } from 'idb-keyval';
import { CM_BUILTIN, CM_REV, cmFile, type CmWorld } from './game/cm0102/parse';
import { unpackWorld } from './game/cm0102/pack';
import { CM_ECONOMY, setEconomy } from './game/economy';
import { getSeed, seed } from './game/rng';
import { ATTR_KEYS, type Attrs, type GameState, type Player } from './game/types';
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

// Player fields left out of a save when they hold their usual value (a CM world has 50,000 players)
const PLAYER_DEFAULTS = { listed: false, injury: null, suspended: 0, yellowAcc: 0, monthMins: 0, lastChange: 0, focus: null } as const;
const PLAYER_LISTS = ['history', 'monthRatings', 'form'] as const;

const r2 = (v: number) => (Number.isInteger(v) ? v : Math.round(v * 100) / 100);

/** Player details that come from the CM 01/02 database and never change (unless edited). */
const STATIC = new Set(['first', 'last', 'dob', 'nat', 'foot', 'real', 'personality', 'past']);

/** One player as saved: usual values left out, numbers to 2 decimals, attributes as an array. */
function slimPlayer(p: Player, worldStart?: string) {
  const out: Record<string, unknown> = {};
  for (const k in p) {
    const v = (p as unknown as Record<string, unknown>)[k];
    if (v === undefined) continue;
    if (k in PLAYER_DEFAULTS && v === PLAYER_DEFAULTS[k as keyof typeof PLAYER_DEFAULTS]) continue;
    if ((k === 'history' || k === 'monthRatings' || k === 'form') && !(v as unknown[]).length) continue;
    if (k === 'attrs') { out.attrs = ATTR_KEYS.map((a) => r2(p.attrs[a])); continue; }
    if (k === 'stats') {
      let any = false;
      const st: Record<string, number> = {};
      for (const [sk, sv] of Object.entries(p.stats)) { st[sk] = r2(sv); if (sv) any = true; }
      if (any) out.stats = st;
      continue;
    }
    if (k === 'id' || (k === 'squad' && v === 'first') || (k === 'joined' && v === worldStart)) continue;
    // CM 01/02: what never changes comes back from the database when the save is loaded
    if (p.dbi !== undefined && !p.cmEdited && STATIC.has(k)) continue;
    if (k === 'cm' && p.dbi !== undefined && !p.cmEdited) { out.cmo = p.cm!.o; continue; }
    out[k] = typeof v === 'number' ? r2(v) : v;
  }
  return out;
}

// Players are written straight (they are almost all of a save); everything else rounds its numbers on the way.
export function compact(g: GameState) {
  const players: Record<string, unknown> = {};
  for (const id in g.players) players[id] = slimPlayer(g.players[id], g.worldStart);
  const rest = JSON.stringify({ ...g, players: '\u0000players' }, (_k, v) => (typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 100) / 100 : v));
  return rest.replace('"players":"\\u0000players"', () => `"players":${JSON.stringify(players)}`);
}

/**
 * CM 01/02 careers: put back what saves leave out (names, birth date, nationality, foot, personality, career history,
 * CM attributes) from the database revision the career was built from.
 */
export function attachCmStatic(g: GameState, w: CmWorld) {
  for (const p of Object.values(g.players)) {
    const loose = p as unknown as { cmo?: number };
    const sp = p.dbi !== undefined && !p.cmEdited ? w.players[p.dbi] : undefined;
    if (sp) {
      p.first ??= sp.first;
      p.last ??= sp.last;
      p.dob ??= sp.dob;
      p.nat ??= sp.nat;
      p.foot ??= sp.foot;
      p.real ??= true;
      p.personality ??= sp.personality;
      if (!p.past && sp.past) p.past = sp.past.map((h) => [...h] as [number, number, number, number, number]);
      if (!p.cm && sp.cm) p.cm = { v: [...sp.cm], o: loose.cmo ?? 0 };
    }
    delete loose.cmo;
  }
  if (!g.pastClubs && w.pastClubs) g.pastClubs = w.pastClubs;
}

export function expand(raw: string): GameState {
  const g = JSON.parse(raw) as GameState;
  const blank = emptyStats();
  for (const [id, p] of Object.entries(g.players)) {
    p.id ??= Number(id);
    p.squad ??= 'first';
    p.joined ??= g.worldStart ?? g.date;
    for (const [k, v] of Object.entries(PLAYER_DEFAULTS)) if (!(k in p)) (p as unknown as Record<string, unknown>)[k] = v;
    for (const k of PLAYER_LISTS) p[k] ??= [];
    const a = p.attrs as unknown;
    if (Array.isArray(a)) p.attrs = Object.fromEntries(ATTR_KEYS.map((k, i) => [k, a[i]])) as Attrs;
    // saves from before detailed stats existed
    p.stats = { ...blank, ...p.stats };
    // saves from before real players always had their natural second position
    if (p.pos !== 'GK' && p.dbi === undefined) p.alt = withNaturalAlt(p.alt ?? [], p.pos, p.real);
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

// Game date of the last save per slot, so autosave only writes once a game week
// (once a game month in CM 01/02 careers, whose 50,000-player worlds take a moment to write;
// leaving or backgrounding the app still saves straight away).
const lastSaved: Record<string, string> = {};
const AUTOSAVE_DAYS = 7;
const CM_AUTOSAVE_DAYS = 28;
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

/** Autosave: overwrites the career's single save file, at most once every 7 (CM: 28) game days. */
export async function autoSave(g: GameState | null = game, force = false) {
  if (!g) return;
  const last = lastSaved[g.slot];
  if (!force && last && daysBetween(last, g.date) < (g.era === 'cm0102' ? CM_AUTOSAVE_DAYS : AUTOSAVE_DAYS)) return;
  await saveGame(g);
}

// Saves are gzipped (a CM 01/02 world is tens of megabytes of JSON); older saves are plain strings
async function gzip(text: string) {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function gunzip(data: Uint8Array) {
  const stream = new Blob([data as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

export async function saveGame(g: GameState = game!) {
  if (!g) return;
  lastSaved[g.slot] = g.date;
  g.rng = getSeed();
  const club = g.clubs[g.userClubId];
  await set(saveKey(g.slot), await gzip(compact(g)));
  const metas = (await listSaves()).filter((m) => m.slot !== g.slot);
  metas.unshift({ slot: g.slot, manager: g.manager, club: club.name, colors: club.colors, date: g.date, mode: g.mode, era: g.era, savedAt: Date.now() });
  await set(META_KEY, metas);
}

export async function loadGame(slot: string) {
  const stored = (await get(saveKey(slot))) as string | Uint8Array | undefined;
  if (!stored) throw new Error('Save not found');
  const g = expand(typeof stored === 'string' ? stored : await gunzip(stored));
  if (g.saveVersion !== SAVE_VERSION) throw new Error('This save is from an incompatible version.');
  if (g.era === 'cm0102' && Object.values(g.players).some((p) => p.dbi !== undefined && p.last === undefined)) {
    const w = await getCmWorld(g.cmRev);
    if (!w) throw new Error('This career needs the CM 01/02 database: connect to the internet once to download it.');
    attachCmStatic(g, w);
  }
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

/** The CM 01/02 database: the copy on this device, or the built-in one (downloaded and kept). */
export async function getCmWorld(rev = CM_REV): Promise<CmWorld | null> {
  const stored = await loadCmWorld();
  if (stored && (stored.rev ?? 1) === rev) return stored;
  // A career built from an older revision loads its own copy (every revision's file stays published)
  try {
    const res = await fetch(`./${rev === CM_REV ? CM_BUILTIN : cmFile(rev)}`);
    if (!res.ok) return null;
    const w = await unpackWorld(await res.text());
    if (rev === CM_REV) await saveCmWorld(w);
    return w;
  } catch {
    return null;
  }
}

export async function saveCmWorld(w: CmWorld | null) {
  if (w) await set(CM_KEY, w);
  else await del(CM_KEY);
}
