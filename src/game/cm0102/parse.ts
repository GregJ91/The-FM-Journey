// Reader for the Championship Manager 01/02 database (the .dat files in the game's Data folder).
// The files never leave the player's device: they are read in the browser and turned into a CmWorld,
// which the game keeps in IndexedDB and uses to build CM 01/02 careers.
import { LEAGUE_DEFS } from '../data/leagues';
import { EURO_CLUBS } from '../data/europe';
import { POS_WEIGHTS, rawOverallAt } from '../ratings';
import { ATTR_KEYS, type AttrKey, type Attrs, type Pos } from '../types';

export interface CmClub {
  name: string;
  short: string;
  country: string; // 3-letter code
  colors: [string, string];
  rep: number; // 1-100
  stadium: string;
  capacity: number;
  level: number; // overall of its typical starter, for generated depth players
}

export interface CmPlayer {
  club: number; // index into CmWorld.clubs, -1 = free agent
  youth: boolean;
  first: string;
  last: string;
  nat: string;
  dob: string;
  pos: Pos;
  alt: Pos[];
  foot: 'L' | 'R' | 'B';
  attrs: Attrs;
  pa: number; // potential overall
  contractEnd: number;
  shirt?: number;
  caps: number;
  intGoals: number;
  personality: string;
  cm: number[]; // CM-only attributes, in CM_EXTRA order
  past?: PastSeason[]; // career before the database date (staff_history.dat), oldest first
}

/** One season of a player's real career: [season start year, index into CmWorld.pastClubs, apps, goals, on loan 0/1]. */
export type PastSeason = [number, number, number, number, number];

/** CM attributes the game doesn't simulate itself, kept so the profile can show the full CM set. */
export const CM_EXTRA = [
  'corners', 'freeKicks', 'longShots', 'marking', 'penalties', 'throwIns',
  'aggression', 'anticipation', 'bravery', 'determination', 'flair', 'leadership', 'movement', 'teamwork',
  'acceleration', 'agility', 'balance', 'jumping', 'naturalFitness', 'oneOnOnes',
] as const;
/** The ones the database stores relative to ability (they move with the player's level). */
export const CM_RELATIVE = new Set<string>(['corners', 'freeKicks', 'longShots', 'marking', 'penalties', 'throwIns', 'anticipation', 'movement', 'oneOnOnes']);

export interface CmWorld {
  version: 1;
  rev?: number; // CM_REV of the build that made it: older copies on a device are replaced by the built-in one
  pastClubs?: string[]; // club names used by players' past careers
  season: number; // the season the database is set in (2002 = 2002/03)
  leagues: { id: string; clubs: number[] }[];
  guests: number[]; // clubs from the rest of Europe (UEFA competitions only)
  clubs: CmClub[];
  players: CmPlayer[];
}

/** The database that ships with the game (in public/, built by tests/cm0102.test.ts with CM_EXPORT=1; see pack.ts). */
export const CM_BUILTIN = 'cm0102-v2.txt';
/** Bumped whenever the built-in database gains data (2: career histories, real squads only). */
export const CM_REV = 2;

/** Our league ids → CM 01/02 club_comp names. */
export const CM_LEAGUES: Record<string, string> = {
  ENG1: 'English Premier Division', ENG2: 'English First Division', ENG3: 'English Second Division', ENG4: 'English Third Division', ENG5: 'English Conference',
  SCO1: 'Scottish Premier Division', SCO2: 'Scottish First Division', SCO3: 'Scottish Second Division', SCO4: 'Scottish Third Division',
  ESP1: 'Spanish First Division', ITA1: 'Italian Serie A', GER1: 'German First Division', FRA1: 'French First Division',
};

/** Countries whose best clubs join the UEFA competitions as guests. */
const GUEST_NATIONS = ['POR', 'NED', 'BEL', 'TUR', 'GRE', 'RUS', 'UKR', 'SUI', 'AUT', 'DEN', 'NOR', 'SWE', 'CZE', 'POL', 'CRO', 'YUG', 'ROM', 'BUL', 'ISR', 'HUN', 'SVK', 'SVN', 'CYP', 'FIN', 'IRL', 'WAL', 'NIR', 'BLR', 'GEO', 'LAT', 'LTU', 'EST', 'MDA', 'BIH', 'MKD', 'ALB', 'ISL'];
const GUESTS_PER_NATION: Record<string, number> = { POR: 6, NED: 6, BEL: 4, TUR: 5, GRE: 4, RUS: 4, UKR: 3 };

/** CM nation codes that differ from the game's. */
const NAT_MAP: Record<string, string> = {
  HOL: 'NED', BGR: 'BUL', HRV: 'CRO', ROM: 'ROU', MOR: 'MAR', AGO: 'ANG', BOS: 'BIH', LVA: 'LAT', MOL: 'MDA', TGO: 'TOG',
  HND: 'HON', HTI: 'HAI', GRD: 'GRN', CYM: 'CAY', BSI: 'BDI', BVI: 'VGB', BHM: 'BAH', LIB: 'LBN', PAL: 'PLE', MST: 'MSR',
  TTO: 'TRI', DRC: 'COD', GMB: 'GAM', MYS: 'MAS', VNM: 'VIE', SDN: 'SUD', BWA: 'BOT', COG: 'CGO', CHD: 'CHA', MDG: 'MAD',
  MUS: 'MRI', SYC: 'SEY', LSO: 'LES', OMN: 'OMA', NCD: 'NCL', BGD: 'BAN', NPL: 'NEP', MMR: 'MYA', WSM: 'SAM', TON: 'TGA',
  ASM: 'ASA', TIM: 'TLS', LUC: 'LCA', KNA: 'SKN', VCT: 'VIN', USV: 'ISV', TCI: 'TCA', AGL: 'AIA', Cze: 'TCH', 'E G': 'GDR',
  'W G': 'FRG', Pay: 'BAS', UAE: 'UAE', KSA: 'KSA',
};

/** Modern short codes for clubs that still exist, keyed by a simplified name. */
const KNOWN_SHORT = (() => {
  const out = new Map<string, string>();
  for (const line of [...LEAGUE_DEFS.flatMap((d) => d.clubs), ...EURO_CLUBS]) {
    const [name, short] = line.split('|');
    out.set(simplify(name), short);
  }
  return out;
})();

function simplify(name: string) {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
}

/** UK clubs keep their full names (with a few tidy-ups); elsewhere the database's short name reads better. */
const RENAME: Record<string, string> = { 'Glasgow Celtic': 'Celtic', 'Glasgow Rangers': 'Rangers', 'Heart Of Midlothian': 'Heart of Midlothian' };
const UK = ['ENG', 'SCO', 'WAL', 'NIR'];

const REQUIRED = ['club.dat', 'club_comp.dat', 'colour.dat', 'nation.dat', 'stadium.dat', 'staff.dat', 'first_names.dat', 'second_names.dat', 'common_names.dat', 'index.dat'];

export function missingFiles(files: Record<string, Uint8Array>) {
  return REQUIRED.filter((f) => !files[f]);
}

class Reader {
  v: DataView;
  b: Uint8Array;
  constructor(b: Uint8Array) {
    this.b = b;
    this.v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  }
  i32(o: number) { return this.v.getInt32(o, true); }
  i16(o: number) { return this.v.getInt16(o, true); }
  u8(o: number) { return this.b[o]; }
  str(o: number, n: number) {
    let s = '';
    for (let i = o; i < o + n && this.b[i]; i++) s += String.fromCharCode(this.b[i]); // Latin-1
    return s;
  }
}

function hex(r: Reader, o: number) {
  return '#' + [0, 1, 2].map((i) => r.u8(o + i).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** CM current ability (1-200) → overall (1-99), calibrated so each division lands where the modern game's does. */
export function ovrFromCa(ca: number) {
  return Math.max(25, Math.min(97, 22.8 + 0.371 * ca));
}

/** Negative potentials in the database are ranges; take a point inside the range. */
function potential(pa: number, ca: number, seed: number) {
  if (pa > 0) return Math.max(pa, ca);
  const n = Math.min(10, Math.max(1, -pa));
  const lo = n * 20 - 20;
  return Math.max(ca, lo + Math.round((seed % 1000) / 1000 * 20));
}

// Player record attribute order (offset 27 onwards)
const CM_ATTRS = [
  'acceleration', 'aggression', 'agility', 'anticipation', 'balance', 'bravery', 'consistency', 'corners', 'crossing', 'decisions',
  'dirtiness', 'dribbling', 'finishing', 'flair', 'freeKicks', 'handling', 'heading', 'importantMatches', 'injuryProneness', 'jumping',
  'leadership', 'leftFoot', 'longShots', 'marking', 'movement', 'naturalFitness', 'oneOnOnes', 'pace', 'passing', 'penalties',
  'positioning', 'reflexes', 'rightFoot', 'stamina', 'strength', 'tackling', 'teamwork', 'technique', 'throwIns', 'versatility',
  'vision', 'workRate',
] as const;
type CmAttr = (typeof CM_ATTRS)[number];

const clamp = (v: number) => Math.max(1, Math.min(20, v));

function positions(r: Reader, o: number): { pos: Pos; alt: Pos[] } {
  const [gk, sw, d, dm, m, am, st, wb] = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => r.u8(o + 15 + i));
  const [R, L, C] = [0, 1, 2].map((i) => r.u8(o + 23 + i));
  const score: [Pos, number][] = [
    ['GK', gk],
    ['ST', st],
    ['AMC', Math.min(am, C)], ['AMR', Math.min(am, R)], ['AML', Math.min(am, L)],
    ['MC', Math.min(m, C)], ['MR', Math.min(m, R)], ['ML', Math.min(m, L)],
    ['DM', dm],
    ['DC', Math.min(Math.max(d, sw), C)],
    ['DR', Math.max(Math.min(d, R), Math.min(wb, R))], ['DL', Math.max(Math.min(d, L), Math.min(wb, L))],
  ];
  const sorted = [...score].sort((a, b) => b[1] - a[1]);
  const pos = sorted[0][0];
  const alt = pos === 'GK' ? [] : sorted.slice(1).filter(([p, s]) => s >= 15 && p !== 'GK').slice(0, 3).map(([p]) => p);
  return { pos, alt };
}

function mapAttrs(a: Record<CmAttr, number>, pos: Pos, target: number): { attrs: Attrs; shift: number } {
  const gk = pos === 'GK';
  const group = gk ? 'GK' : ['DC', 'DL', 'DR'].includes(pos) ? 'DEF' : ['ST', 'AMC', 'AML', 'AMR'].includes(pos) ? 'ATT' : 'MID';
  const out: Attrs = {
    finishing: a.finishing, passing: a.passing, dribbling: a.dribbling, firstTouch: a.technique, crossing: a.crossing,
    tackling: a.tackling, heading: a.heading, vision: a.vision, decisions: a.decisions,
    composure: (a.importantMatches + a.consistency) / 2,
    positioning: group === 'ATT' ? a.movement : group === 'MID' ? (a.positioning + a.movement) / 2 : a.positioning,
    workRate: a.workRate, pace: (a.pace + a.acceleration) / 2, stamina: a.stamina, strength: a.strength,
    reflexes: gk ? a.reflexes : Math.min(4, a.reflexes), handling: gk ? a.handling : Math.min(4, a.handling),
    aerial: gk ? (a.jumping + a.handling) / 2 : 1 + (a.jumping % 3), distribution: gk ? (a.passing + a.throwIns) / 2 : 2,
  };
  for (const k of ATTR_KEYS) out[k] = clamp(out[k]);
  // The database's technical values are relative to ability; shift the position's key attributes so the
  // overall matches the player's current ability, keeping his strengths and weaknesses.
  const w = POS_WEIGHTS[pos];
  let shift = 0;
  for (let i = 0; i < 8; i++) {
    const diff = target - rawOverallAt(out, pos);
    if (Math.abs(diff) < 0.2) break;
    shift += diff / 4.6;
    for (const k in w) out[k as AttrKey] = clamp(out[k as AttrKey] + diff / 4.6);
  }
  for (const k of ATTR_KEYS) out[k] = Math.round(out[k] * 10) / 10;
  return { attrs: out, shift };
}

function personalityFrom(r: Reader, o: number) {
  const [, amb, det, loy, , pro, , tem] = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => r.u8(o + 86 + i));
  if (pro >= 18 && det >= 15) return 'Model Professional';
  if (pro >= 15) return 'Professional';
  if (det >= 17) return 'Determined';
  if (loy <= 4 && amb >= 14) return 'Mercenary';
  if (amb >= 17) return 'Ambitious';
  if (loy >= 17) return 'Loyal';
  if (tem <= 6) return 'Temperamental';
  if (pro <= 6) return 'Casual';
  if (amb <= 5) return 'Unambitious';
  if (pro >= 12) return 'Fairly Professional';
  return 'Balanced';
}

function dateFrom(r: Reader, o: number) {
  const day = r.i16(o);
  const year = r.i16(o + 2);
  if (year < 1900 || day < 0) return null;
  const d = new Date(Date.UTC(year, 0, 1) + Math.min(365, day) * 86400000);
  return d.toISOString().slice(0, 10);
}

function nameTable(b: Uint8Array) {
  const r = new Reader(b);
  const out = new Map<number, string>();
  for (let o = 0; o + 60 <= b.length; o += 60) out.set(r.i32(o + 51), r.str(o, 51));
  return out;
}

/** Table offsets and counts from index.dat (staff.dat holds several tables). */
function indexOf(b: Uint8Array) {
  const r = new Reader(b);
  const out: { file: string; type: number; count: number; offset: number }[] = [];
  for (let o = 8; o + 67 <= b.length; o += 67) out.push({ file: r.str(o, 51), type: r.i32(o + 51), count: r.i32(o + 55), offset: r.i32(o + 59) });
  return out;
}

export function parseCm0102(files: Record<string, Uint8Array>): CmWorld {
  const miss = missingFiles(files);
  if (miss.length) throw new Error(`Missing ${miss.join(', ')}`);
  const index = indexOf(files['index.dat']);
  const staffT = index.find((t) => t.file === 'staff.dat' && t.type === 6)!;
  const playerT = index.find((t) => t.file === 'staff.dat' && t.type === 10)!;
  const staffSize = Math.round((index.find((t) => t.file === 'staff.dat' && t.type === 8)?.offset ?? 0) / staffT.count) || 157;
  const playerSize = Math.round((files['staff.dat'].length - playerT.offset) / playerT.count);
  if (playerSize !== 70) throw new Error('Unrecognised staff.dat (is this CM 01/02?)');

  // Lookups
  const colours = new Reader(files['colour.dat']);
  const colour = (id: number) => (id >= 0 && id * 58 + 58 <= files['colour.dat'].length ? hex(colours, id * 58 + 55) : '#888888');
  const nationR = new Reader(files['nation.dat']);
  const NS = 290;
  const nationCode = new Map<number, string>();
  for (let o = 0; o + NS <= files['nation.dat'].length; o += NS) {
    const code = nationR.str(o + 83, 3) || '???';
    nationCode.set(nationR.i32(o), NAT_MAP[code] ?? code);
  }
  const stadR = new Reader(files['stadium.dat']);
  const stadium = new Map<number, { name: string; cap: number }>();
  for (let o = 0; o + 78 <= files['stadium.dat'].length; o += 78) stadium.set(stadR.i32(o), { name: stadR.str(o + 4, 51), cap: stadR.i32(o + 60) });
  const compR = new Reader(files['club_comp.dat']);
  const compId = new Map<string, number>();
  for (let o = 0; o + 107 <= files['club_comp.dat'].length; o += 107) compId.set(compR.str(o + 4, 51), compR.i32(o));

  // Clubs
  const clubR = new Reader(files['club.dat']);
  const CR = 581;
  type Raw = { id: number; name: string; short: string; nation: string; div: number; rep: number; fg: number; bg: number; stad: number };
  const raw: Raw[] = [];
  for (let o = 0; o + CR <= files['club.dat'].length; o += CR) {
    raw.push({
      id: clubR.i32(o), name: clubR.str(o + 4, 51), short: clubR.str(o + 56, 26) || clubR.str(o + 4, 51), nation: nationCode.get(clubR.i32(o + 83)) ?? '???',
      div: clubR.i32(o + 87), stad: clubR.i32(o + 105), rep: clubR.i16(o + 128), fg: clubR.i32(o + 131), bg: clubR.i32(o + 135),
    });
  }
  const leagues: CmWorld['leagues'] = [];
  const picked = new Map<number, number>(); // CM club id → our club index
  const clubs: CmClub[] = [];
  const usedShort = new Set<string>();
  const addClub = (c: Raw) => {
    const s = stadium.get(c.stad);
    const name = RENAME[c.name] ?? (UK.includes(c.nation) ? c.name : c.short);
    let short = KNOWN_SHORT.get(simplify(name)) ?? KNOWN_SHORT.get(simplify(c.name)) ?? abbreviation(name, usedShort);
    if (usedShort.has(short) && !KNOWN_SHORT.has(simplify(name))) short = abbreviation(name, usedShort);
    usedShort.add(short);
    picked.set(c.id, clubs.length);
    clubs.push({
      name, short, country: c.nation,
      colors: [colour(c.bg), colour(c.fg)], rep: Math.max(5, Math.min(99, Math.round(12 + c.rep * 0.0083))),
      stadium: s?.name || `${c.name} Ground`, capacity: s?.cap || 5000, level: 50,
    });
    return clubs.length - 1;
  };
  for (const [id, compName] of Object.entries(CM_LEAGUES)) {
    const cid = compId.get(compName);
    const list = raw.filter((c) => c.div === cid).sort((a, b) => a.name.localeCompare(b.name));
    leagues.push({ id, clubs: list.map(addClub) });
  }
  // Guests: the strongest clubs of the other European countries
  const guests: number[] = [];
  for (const nat of GUEST_NATIONS) {
    const best = raw.filter((c) => c.nation === nat && !picked.has(c.id) && c.rep >= 4500).sort((a, b) => b.rep - a.rep).slice(0, GUESTS_PER_NATION[nat] ?? 2);
    for (const c of best) guests.push(addClub(c));
  }

  // People
  const staff = new Reader(files['staff.dat']);
  const first = nameTable(files['first_names.dat']);
  const second = nameTable(files['second_names.dat']);
  const common = nameTable(files['common_names.dat']);
  type RawP = CmPlayer & { ca: number };
  // Career histories (optional file): staff id → seasons
  const clubName = new Map<number, string>();
  for (const c of raw) clubName.set(c.id, RENAME[c.name] ?? (UK.includes(c.nation) ? c.name : c.short));
  const pastClubs: string[] = [];
  const pastIdx = new Map<string, number>();
  const history = new Map<number, PastSeason[]>();
  const hist = files['staff_history.dat'];
  if (hist && hist.length % 17 === 0) {
    const hr = new Reader(hist);
    for (let o = 0; o + 17 <= hist.length; o += 17) {
      const name = clubName.get(hr.i32(o + 10));
      if (!name) continue;
      let ci = pastIdx.get(name);
      if (ci === undefined) { ci = pastClubs.length; pastClubs.push(name); pastIdx.set(name, ci); }
      const sid = hr.i32(o + 4);
      const list = history.get(sid) ?? history.set(sid, []).get(sid)!;
      list.push([hr.i16(o + 8), ci, hr.u8(o + 15), hr.u8(o + 16), hr.u8(o + 14) ? 1 : 0]);
    }
  }
  // The database's date: almost every transfer in it happened before then
  const joins: string[] = [];
  const byClub = new Map<number, RawP[]>();
  const free: RawP[] = [];
  for (let i = 0; i < staffT.count; i++) {
    const o = staffT.offset + i * staffSize;
    const joined = dateFrom(staff, o + 62);
    if (joined && joined < '2010') joins.push(joined);
    const pd = staff.i32(o + 145);
    if (pd < 0 || pd >= playerT.count) continue;
    const clubCm = staff.i32(o + 57);
    const ci = picked.get(clubCm);
    if (ci === undefined && clubCm >= 0) continue; // contracted to a club outside the game
    const po = playerT.offset + pd * playerSize;
    const ca = staff.i16(po + 5);
    if (ca <= 0) continue;
    let dob = dateFrom(staff, o + 16);
    // A few records have no real birth date: assume mid-twenties
    if (!dob || dob < '1955') dob = `${1977 + (i % 6)}-0${1 + (i % 9)}-15`;
    const a = {} as Record<CmAttr, number>;
    CM_ATTRS.forEach((k, j) => { a[k] = staff.u8(po + 27 + j); });
    const { pos, alt } = positions(staff, po);
    const target = ovrFromCa(ca);
    const mapped = mapAttrs(a, pos, target);
    const extra: Record<string, number> = { ...a, determination: staff.u8(o + 88) };
    const cmVals = CM_EXTRA.map((k) => Math.round(clamp(extra[k] + (CM_RELATIVE.has(k) ? mapped.shift : 0))));
    const cn = common.get(staff.i32(o + 12));
    const fn = first.get(staff.i32(o + 4)) ?? '';
    const sn = second.get(staff.i32(o + 8)) ?? '';
    const lf = a.leftFoot;
    const rf = a.rightFoot;
    const shirt = staff.u8(po + 4);
    const p: RawP = {
      club: ci ?? -1, youth: false,
      first: cn ? '' : fn, last: cn || sn || fn, nat: nationCode.get(staff.i32(o + 26)) ?? (ci !== undefined ? clubs[ci].country : 'ENG'), dob,
      pos, alt, foot: lf >= 15 && rf >= 15 ? 'B' : lf > rf ? 'L' : 'R',
      attrs: mapped.attrs,
      cm: cmVals,
      pa: Math.round(ovrFromCa(potential(staff.i16(po + 7), ca, i * 7919))),
      contractEnd: Number((dateFrom(staff, o + 70) ?? '0').slice(0, 4)),
      shirt: shirt > 0 && shirt < 100 ? shirt : undefined,
      caps: staff.u8(o + 34), intGoals: staff.u8(o + 35),
      personality: personalityFrom(staff, o),
      ca,
    };
    const past = history.get(staff.i32(o));
    if (past?.length) p.past = past.sort((x, y) => x[0] - y[0]);
    if (ci === undefined) free.push(p);
    else (byClub.get(ci) ?? byClub.set(ci, []).get(ci)!).push(p);
  }

  joins.sort();
  const snap = joins[Math.floor(joins.length * 0.995)] ?? '2001-07-01';
  const season = Number(snap.slice(5, 7)) >= 6 ? Number(snap.slice(0, 4)) : Number(snap.slice(0, 4)) - 1;
  // Contracts that have run out (or were never set) get one to three more years
  for (const list of [free, ...byClub.values()]) for (const p of list) if (p.contractEnd <= season) p.contractEnd = season + 1 + (p.ca % 3);

  // Squads: the best 30 make the first team, up to 8 more teenagers make the academy
  const players: CmPlayer[] = [];
  const strip = ({ ca: _ca, ...p }: RawP) => p;
  for (const [ci, list] of byClub) {
    list.sort((x, y) => y.ca - x.ca);
    const firstTeam = list.slice(0, 30);
    const youth = list.slice(30).filter((p) => p.dob >= '1982-07-01').slice(0, 8);
    const starters = firstTeam.slice(0, 11);
    clubs[ci].level = Math.round(starters.reduce((s, p) => s + ovrFromCa(p.ca), 0) / Math.max(1, starters.length)) - 3;
    for (const p of firstTeam) players.push(strip(p));
    for (const p of youth) players.push({ ...strip(p), youth: true });
  }
  free.sort((x, y) => y.ca - x.ca);
  // A deep pool of real free agents: clubs short of players sign these before anyone is invented
  for (const p of free.slice(0, 400)) players.push(strip(p));
  // Only the clubs someone in the game actually played for
  const used = new Set<number>();
  for (const p of players) for (const h of p.past ?? []) used.add(h[1]);
  const remap = new Map<number, number>();
  const keptClubs: string[] = [];
  for (const i of [...used].sort((a, b) => a - b)) { remap.set(i, keptClubs.length); keptClubs.push(pastClubs[i]); }
  for (const p of players) for (const h of p.past ?? []) h[1] = remap.get(h[1])!;
  return { version: 1, rev: CM_REV, season, leagues, guests, clubs, players, pastClubs: keptClubs };
}

/** Three-letter club code: "Manchester Utd" → MUN, "Arsenal" → ARS. */
function abbreviation(name: string, used: Set<string>) {
  const words = name.normalize('NFD').replace(/[^A-Za-z ]/g, ' ').split(' ').filter((w) => w.length > 1 && !['FC', 'AFC', 'CF', 'SC', 'AC', 'de', 'of', 'the', 'and'].includes(w));
  const w0 = (words[0] ?? name).toUpperCase();
  const w1 = (words[1] ?? '').toUpperCase();
  const tries = [w0.slice(0, 3), w1 ? w0[0] + w1.slice(0, 2) : '', w1 ? w0.slice(0, 2) + w1[0] : '', w0[0] + w0.slice(2, 4)].filter((x) => x.length === 3);
  return tries.find((t) => !used.has(t)) ?? tries[0] ?? 'CLB';
}
