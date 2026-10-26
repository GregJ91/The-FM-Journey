// User-supplied club badges ("logo packs"). Real crests are trademarks, so none
// ship with the game: players import their own images, which are matched to
// clubs by file name, shrunk, and kept in this browser's IndexedDB.
import { useSyncExternalStore } from 'react';
import { get, set } from 'idb-keyval';

const KEY = 'fmj-badges';
const TRAY_KEY = 'fmj-badge-tray';
const SIZE = 160;
const TRAY_MAX = 400;

let badges: Record<string, string> = {}; // club name -> data URL

/** Images that couldn't be matched by file name (e.g. FM logo packs, which use numeric club IDs). */
export interface TrayItem {
  id: string;
  file: string;
  data: string;
}
let tray: TrayItem[] = [];
let version = 0;
const listeners = new Set<() => void>();

function emit() {
  version++;
  for (const l of listeners) l();
}

export function useBadgesVersion() {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => version,
  );
}

export function badgeFor(clubName: string): string | undefined {
  return badges[clubName];
}

export function badgeCount() {
  return Object.keys(badges).length;
}

export function trayItems() {
  return tray;
}

export async function loadBadges() {
  try {
    badges = ((await get(KEY)) as Record<string, string> | undefined) ?? {};
    tray = ((await get(TRAY_KEY)) as TrayItem[] | undefined) ?? [];
  } catch {
    badges = {};
    tray = [];
  }
  emit();
}

async function persist() {
  try {
    await set(KEY, badges);
    await set(TRAY_KEY, tray);
  } catch { /* storage unavailable: badges last for this session */ }
  emit();
}

export async function assignFromTray(itemId: string, clubName: string) {
  const item = tray.find((t) => t.id === itemId);
  if (!item) return;
  badges[clubName] = item.data;
  tray = tray.filter((t) => t.id !== itemId);
  await persist();
}

export async function discardTray(itemId: string) {
  tray = tray.filter((t) => t.id !== itemId);
  await persist();
}

export async function clearTray() {
  tray = [];
  await persist();
}

// ---------------- Matching ----------------

const STOP = new Set(['fc', 'afc', 'cf', 'ac', 'as', 'sc', 'ssc', 'cd', 'rc', 'rcd', 'ud', 'sv', 'vfl', 'tsg', 'club', 'calcio', 'football', 'logo', 'badge', 'crest', 'png', 'svg']);

export function slug(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/ø/g, 'o').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function core(s: string) {
  return slug(s).split('-').filter((w) => w && !STOP.has(w) && !/^\d+$/.test(w)).join('-');
}

// Common alternative names used by logo packs
const ALIASES: Record<string, string[]> = {
  'Manchester United': ['man-utd', 'man-united', 'manchester-utd'],
  'Manchester City': ['man-city'],
  'Tottenham Hotspur': ['tottenham', 'spurs'],
  'Wolves': ['wolverhampton', 'wolverhampton-wanderers'],
  'Brighton': ['brighton-hove-albion', 'brighton-and-hove-albion'],
  'Nottingham Forest': ['nottm-forest', 'notts-forest'],
  'West Ham United': ['west-ham'],
  'Newcastle United': ['newcastle'],
  'Leeds United': ['leeds'],
  'Inter': ['inter-milan', 'internazionale'],
  'AC Milan': ['milan'],
  'Bayern Munich': ['bayern', 'bayern-munchen'],
  'Paris Saint-Germain': ['psg', 'paris-sg'],
  'Athletic Club': ['athletic-bilbao', 'bilbao'],
  'Atlético Madrid': ['atletico', 'atleti'],
  'Lyon': ['olympique-lyonnais', 'ol'],
  'Marseille': ['olympique-de-marseille', 'olympique-marseille', 'om'],
  'Borussia Mönchengladbach': ['gladbach', 'monchengladbach', 'borussia-monchengladbach'],
  'Borussia Dortmund': ['dortmund', 'bvb'],
  'Bayer Leverkusen': ['leverkusen'],
  'Eintracht Frankfurt': ['frankfurt'],
  'VfB Stuttgart': ['stuttgart'],
  'Sheffield Wednesday': ['sheff-wed', 'sheffield-wed'],
  'Sheffield United': ['sheff-utd', 'sheffield-utd'],
  'Queens Park Rangers': ['qpr'],
  'West Bromwich Albion': ['west-brom', 'wba'],
  'MK Dons': ['milton-keynes-dons'],
};

/** Keys a file name could use to refer to this club. */
function clubKeys(name: string, short: string) {
  const keys = new Set([slug(name), core(name), slug(short)]);
  for (const a of ALIASES[name] ?? []) keys.add(a);
  keys.delete('');
  return keys;
}

export interface ClubRef {
  name: string;
  short: string;
}

export function matchFile(fileName: string, clubs: ClubRef[]): ClubRef | null {
  const base = fileName.replace(/\.[a-z0-9]+$/i, '');
  const candidates = [slug(base), core(base)];
  // Exact full-name matches first, then cores/aliases, then short codes
  for (const c of clubs) if (slug(c.name) === candidates[0]) return c;
  for (const c of clubs) {
    const keys = clubKeys(c.name, c.short);
    if (candidates.some((k) => k && keys.has(k) && k !== slug(c.short))) return c;
  }
  for (const c of clubs) if (slug(c.short) === candidates[0]) return c;
  return null;
}

// ---------------- Import ----------------

/** Resize an image file to a small square PNG data URL. */
async function shrink(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Not an image'));
      i.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d')!;
    const w = img.naturalWidth || SIZE;
    const h = img.naturalHeight || SIZE;
    const scale = Math.min(SIZE / w, SIZE / h);
    ctx.drawImage(img, (SIZE - w * scale) / 2, (SIZE - h * scale) / 2, w * scale, h * scale);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

function isImage(f: File) {
  return f.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(f.name);
}

/** Import badge files. Name matches are applied straight away; anything else goes to the tray for manual matching. */
export async function importBadgeFiles(files: File[], clubs: ClubRef[]) {
  const matched: string[] = [];
  const unmatched: string[] = [];
  const skipped: string[] = [];
  for (const f of files) {
    if (!isImage(f)) { skipped.push(f.name); continue; }
    const club = matchFile(f.name, clubs);
    try {
      if (club) {
        badges[club.name] = await shrink(f);
        matched.push(club.name);
      } else if (tray.length < TRAY_MAX) {
        tray.push({ id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, file: f.name, data: await shrink(f) });
        unmatched.push(f.name);
      } else {
        skipped.push(f.name);
      }
    } catch {
      skipped.push(f.name);
    }
  }
  await persist();
  return { matched, unmatched, skipped };
}

export async function setBadge(clubName: string, file: File) {
  badges[clubName] = await shrink(file);
  await persist();
}

export async function removeBadge(clubName: string) {
  delete badges[clubName];
  await persist();
}

export async function clearBadges() {
  badges = {};
  await persist();
}
