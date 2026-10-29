import { budget, setEconomy } from './economy';
import { CUP_DEFS, LEAGUE_DEFS, REAL_PLAYERS } from './data/leagues';
import { YOUTH_PLAYERS } from './data/youthPlayers';
import { ensureEurope } from './europe';
import { NAME_POOLS, NAT_MIX } from './data/names';
import { addDays, ageOn, iso, toDate } from './dates';
import { NEIGHBOURS, altPositionsFor, generateAttrs, overall, ratingAt, wageFor } from './ratings';

/** Real players can always play their most natural second position (an AMC like Ødegaard in midfield). */
export function withNaturalAlt(alt: Pos[], pos: Pos, real?: boolean): Pos[] {
  const first = NEIGHBOURS[pos][0];
  return real && first && !alt.includes(first) ? [first, ...alt] : alt;
}
import { chance, hash, hashString, int, normal, pick, rand, seed, weighted } from './rng';
import { bestFormation, pickLineup } from './selection';
import { normaliseTactics } from './tactics';
import { applyMetaProfile, isMetaClub, metaStyle } from './meta';
import { assignAllShirtNumbers, assignShirtNumbers } from './shirts';
import { SHIRT_NUMBERS } from './data/shirtNumbers';
import type { Attrs, Club, CrestPattern, CrestShape, GameState, League, Player, Pos, SeasonStats } from './types';
import { EURO_GUEST_LEAGUE } from './data/europe';
import type { CmWorld } from './cm0102/parse';

export const START_DATE = '2026-07-01';
export const START_SEASON = 2026;
export const SAVE_VERSION = 1;

export function emptyStats(): SeasonStats {
  return {
    apps: 0, goals: 0, assists: 0, mins: 0, ratingSum: 0, yellows: 0, reds: 0, cleanSheets: 0, motm: 0,
    shots: 0, sot: 0, xg: 0, kp: 0, xa: 0, passes: 0, passC: 0, drb: 0, drbA: 0, tkl: 0, int: 0, clr: 0, fouls: 0, saves: 0, conceded: 0,
  };
}

export function nextId(g: GameState) {
  return g.nextId++;
}

// Squad template: positions for a 24-man squad (in depth order)
const SQUAD_TEMPLATE: Pos[] = [
  'GK', 'DR', 'DC', 'DC', 'DL', 'DM', 'MC', 'MC', 'AMR', 'AML', 'ST',
  'GK', 'DR', 'DC', 'DL', 'MC', 'AMC', 'MR', 'ML', 'ST',
  'GK', 'DC', 'MC', 'ST',
];

function dobFromAge(age: number, date: string) {
  const d = toDate(date);
  const y = d.getUTCFullYear() - age - 1;
  const day = int(0, 364);
  const born = new Date(Date.UTC(y, 6, 2));
  return iso(new Date(born.getTime() + day * 86400000));
}

function natFor(country: string) {
  const mix = NAT_MIX[country] ?? NAT_MIX.ENG;
  return weighted(mix, (m) => m[1])[0];
}

export function randomName(nat: string) {
  const pool = NAME_POOLS[nat] ?? NAME_POOLS.ENG;
  return { first: pick(pool.first), last: pick(pool.last) };
}

function potentialFor(ovr: number, age: number) {
  if (age >= 29) return ovr;
  const yearsLeft = Math.max(0, 27 - age);
  const extra = yearsLeft * (0.8 + rand() * 1.6) + normal(0, 2);
  return Math.round(Math.max(ovr, Math.min(96, ovr + extra)));
}

export interface PlayerSpec {
  first: string;
  last: string;
  nat: string;
  age: number;
  pos: Pos;
  ovr: number;
  pa?: number;
  style?: string;
  real?: boolean;
  // Exact details (CM 01/02 database)
  attrs?: Attrs;
  dob?: string;
  alt?: Pos[];
  foot?: 'L' | 'R' | 'B';
}

export function createPlayer(g: GameState, spec: PlayerSpec, clubId: number | null, rep = 50): Player {
  // Meta clubs' players (real, generated and academy intakes) get meta attribute profiles
  const meta = !spec.attrs && clubId !== null && isMetaClub(g.clubs[clubId]);
  const attrs = spec.attrs ? { ...spec.attrs } : generateAttrs(spec.pos, spec.ovr, meta ? (spec.style ?? '') + metaStyle(spec.pos) : spec.style);
  const id = nextId(g);
  const pa = spec.pa ?? potentialFor(spec.ovr, spec.age);
  const foot = spec.foot ?? (spec.pos.endsWith('L') ? (chance(0.75) ? 'L' : 'R') : chance(0.2) ? 'L' : chance(0.08) ? 'B' : 'R');
  const p: Player = {
    id,
    first: spec.first,
    last: spec.last,
    nat: spec.nat,
    dob: spec.dob ?? dobFromAge(spec.age, g.date),
    pos: spec.pos,
    alt: spec.pos === 'GK' ? [] : withNaturalAlt(spec.alt ?? altPositionsFor(spec.pos), spec.pos, spec.real),
    foot,
    attrs,
    pa: Math.max(pa, spec.ovr),
    clubId,
    squad: 'first',
    wage: 0,
    contractEnd: g.season + int(1, 4),
    morale: 70,
    condition: 95,
    form: [],
    injury: null,
    suspended: 0,
    yellowAcc: 0,
    stats: emptyStats(),
    history: [],
    listed: false,
    real: !!spec.real,
    focus: null,
    monthMins: 0,
    monthRatings: [],
    lastChange: 0,
    joined: g.date,
  };
  p.wage = wageFor(spec.attrs ? Math.max(overall(p), Math.round(p.pa * 0.3 + overall(p) * 0.7)) : overall(p), rep);
  g.players[id] = p;
  if (meta) p.meta = true;
  return p;
}

export function generatePlayer(g: GameState, opts: { pos: Pos; ovr: number; age: number; country: string; clubId: number | null; rep?: number; pa?: number }) {
  const nat = natFor(opts.country);
  const { first, last } = randomName(nat);
  return createPlayer(g, { first, last, nat, age: opts.age, pos: opts.pos, ovr: Math.round(opts.ovr), pa: opts.pa }, opts.clubId, opts.rep);
}

export function parsePlayer(line: string): PlayerSpec {
  const [name, pos, age, nat, ovr, pa, style] = line.split('|');
  const parts = name.split(' ');
  // Mononyms (e.g. "Rodri") keep the whole name as surname
  const first = parts.length > 1 ? parts[0] : '';
  const last = parts.length > 1 ? parts.slice(1).join(' ') : parts[0];
  return { first, last, nat, age: Number(age), pos: pos as Pos, ovr: Number(ovr), pa: pa ? Number(pa) : undefined, style: style || undefined, real: true };
}

const SHAPES: CrestShape[] = ['shield', 'circle', 'diamond', 'badge'];

export function parseClub(line: string, leagueId: string, country: string, id: number): Club & { level: number } {
  const [name, short, c1, c2, rep, level, stadium, cap, pattern] = line.split('|');
  const r = Number(rep);
  const shape = SHAPES[hashString(name) % SHAPES.length];
  return {
    id,
    name,
    short,
    colors: [c1, c2],
    crest: { shape, pattern: (pattern || 'plain') as CrestPattern },
    leagueId,
    country,
    reputation: r,
    stadium,
    capacity: Number(cap),
    balance: 0,
    transferBudget: 0,
    wageBudget: 0,
    facilities: { training: facilityFor(r), youth: facilityFor(r - 4) },
    tactics: normaliseTactics({ formation: pick(['4-3-3', '4-2-3-1', '4-4-2', '4-2-3-1', '4-3-3', '3-5-2', '4-1-4-1']) }),
    lineup: [],
    subs: [],
    isUser: false,
    custom: false,
    seasonIncome: 0,
    seasonExpense: 0,
    trophies: [],
    level: Number(level),
  };
}

function facilityFor(rep: number) {
  return Math.max(1, Math.min(5, Math.round(rep / 20)));
}

export function setClubFinances(club: Club, tier: number) {
  const r = club.reputation;
  // Money scales steeply with reputation and division
  const tierMult = [0, 1, 0.12, 0.035, 0.015, 0.005][tier] ?? 0.005;
  const base = budget(Math.pow(r / 100, 2.2) * 250_000_000 * tierMult);
  club.transferBudget = Math.round(base / 10_000) * 10_000;
  club.balance = Math.round(base * 1.6 + budget(200_000));
}

export function wageBill(g: GameState, clubId: number) {
  let s = 0;
  for (const p of Object.values(g.players)) if (p.clubId === clubId) s += p.wage;
  return s;
}

/** CM 01/02 careers: a squad short of numbers signs the best-fitting real free agents; a player is only invented when none are left. */
function fillCmSquad(g: GameState, club: Club, level: number, min: number) {
  const squad = Object.values(g.players).filter((p) => p.clubId === club.id && p.squad === 'first');
  if (squad.length >= min) return;
  const counts: Partial<Record<Pos, number>> = {};
  for (const p of squad) counts[p.pos] = (counts[p.pos] ?? 0) + 1;
  const free = Object.values(g.players).filter((p) => p.clubId === null && overall(p) <= level + 2);
  for (let n = squad.length; n < min; n++) {
    const pos = SQUAD_TEMPLATE.find((x, i) => (counts[x] ?? 0) <= SQUAD_TEMPLATE.slice(0, i).filter((y) => y === x).length) ?? pick(SQUAD_TEMPLATE);
    const best = free.filter((p) => p.clubId === null).sort((a, b) => ratingAt(b, pos) - ratingAt(a, pos))[0];
    if (best && ratingAt(best, pos) >= level - 12) {
      best.clubId = club.id;
      best.squad = 'first';
      best.joined = g.date;
      best.contractEnd = g.season + 1 + int(0, 2);
      best.wage = wageFor(overall(best), club.reputation);
      if (isMetaClub(club)) applyMetaProfile(best);
      counts[best.pos] = (counts[best.pos] ?? 0) + 1;
    } else {
      generatePlayer(g, { pos, ovr: Math.max(25, level - 6 + normal(0, 2.5)), age: int(19, 31), country: club.country, clubId: club.id, rep: club.reputation });
      counts[pos] = (counts[pos] ?? 0) + 1;
    }
  }
  assignShirtNumbers(g, club.id);
}

export function fillSquad(g: GameState, club: Club, level: number, target = 24) {
  if (g.era === 'cm0102') return fillCmSquad(g, club, level, Math.min(target, 16));
  const squad = Object.values(g.players).filter((p) => p.clubId === club.id && p.squad === 'first');
  const counts: Partial<Record<Pos, number>> = {};
  for (const p of squad) counts[p.pos] = (counts[p.pos] ?? 0) + 1;
  // Walk the template in depth order; each missing entry remembers how deep it sits
  const need: { pos: Pos; depth: number; idx: number }[] = [];
  const seen: Partial<Record<Pos, number>> = {};
  SQUAD_TEMPLATE.forEach((pos, idx) => {
    const depth = seen[pos] ?? 0;
    seen[pos] = depth + 1;
    if ((counts[pos] ?? 0) <= depth) need.push({ pos, depth, idx });
  });
  let total = squad.length;
  for (const { pos, depth, idx } of need) {
    if (total >= target && (counts[pos] ?? 0) > 0) continue;
    // starters near the club level, backups a little weaker
    const penalty = idx < 11 ? 0 : Math.min(7, 2 + depth * 2);
    const ovr = level - penalty + normal(0, 2.5);
    const age = Math.round(Math.min(35, Math.max(17, normal(26, 4))));
    generatePlayer(g, { pos, ovr: Math.max(25, ovr), age, country: club.country, clubId: club.id, rep: club.reputation });
    counts[pos] = (counts[pos] ?? 0) + 1;
    total++;
  }
}

export function generateYouth(g: GameState, club: Club, n: number, intake = false) {
  const out: Player[] = [];
  const posPool: Pos[] = ['GK', 'DC', 'DC', 'DL', 'DR', 'DM', 'MC', 'MC', 'AMC', 'AML', 'AMR', 'ML', 'MR', 'ST', 'ST'];
  for (let i = 0; i < n; i++) {
    const age = intake ? int(15, 16) : int(16, 18);
    const yf = club.facilities.youth;
    const base = 28 + club.reputation * 0.22 + yf * 2 + (age - 15) * 3;
    const ovr = Math.round(Math.max(20, base + normal(0, 4)));
    // Potential: youth facilities and reputation shift the distribution; rare wonderkids possible.
    // CM 01/02 careers are stingier (as CM was): otherwise big academies turn out world-class players every year
    // and a long career fills up with them.
    const cmEra = g.era === 'cm0102';
    let pa = cmEra
      ? Math.round(ovr + 6 + club.reputation * 0.1 + yf * 1.5 + normal(0, 6))
      : Math.round(ovr + 12 + club.reputation * 0.15 + yf * 2.5 + normal(0, 7));
    if (chance(cmEra ? 0.012 + yf * 0.004 : 0.03 + yf * 0.01)) pa += int(8, 16);
    pa = Math.max(ovr + 4, Math.min(95, pa));
    const p = generatePlayer(g, { pos: pick(posPool), ovr, age, country: club.country, clubId: club.id, rep: club.reputation, pa });
    p.squad = 'youth';
    p.wage = Math.max(100, Math.round(p.wage * 0.3));
    p.contractEnd = g.season + 3;
    out.push(p);
  }
  return out;
}

export interface NewGameOptions {
  mode: 'classic' | 'create';
  manager: string;
  clubId?: number; // classic: index into generated club list (by club name lookup)
  clubName?: string; // classic: chosen club name
  custom?: {
    name: string;
    short: string;
    colors: [string, string];
    crest: { shape: CrestShape; pattern: CrestPattern };
    stadium: string;
    country: string;
  };
  slot: string;
  seed?: number;
  managerNat?: string;
  /** Build the world from the player's CM 01/02 database instead of today's. */
  cm?: CmWorld;
}

/** League names and codes as they were in the early 2000s. */
export const CM_LEAGUE_NAMES: Record<string, [string, string]> = {
  ENG1: ['Premier League', 'PL'], ENG2: ['First Division', 'D1'], ENG3: ['Second Division', 'D2'], ENG4: ['Third Division', 'D3'], ENG5: ['Conference', 'CNF'],
  SCO1: ['Scottish Premier League', 'SPL'], SCO2: ['Scottish First Division', 'SD1'], SCO3: ['Scottish Second Division', 'SD2'], SCO4: ['Scottish Third Division', 'SD3'],
  ESP1: ['La Liga', 'LL'], ITA1: ['Serie A', 'SA'], GER1: ['Bundesliga', 'BL'], FRA1: ['Division 1', 'D1'],
};

/** Club line ("Name|SHORT|c1|c2|rep|level|Stadium|cap|pattern") for a CM club. */
export function cmClubLine(c: CmWorld['clubs'][number]) {
  return [c.name, c.short, c.colors[0], c.colors[1], c.rep, c.level, c.stadium, c.capacity, 'plain'].join('|');
}

/** CM players for one club (or free agents when clubId is null). */
function addCmPlayers(g: GameState, cm: CmWorld, idx: number, clubId: number | null) {
  const club = clubId !== null ? g.clubs[clubId] : null;
  const taken = new Set<number>();
  for (const sp of cm.players) {
    if (sp.club !== idx) continue;
    const age = Math.max(16, ageOn(sp.dob, g.date));
    const p = createPlayer(g, { ...sp, age, ovr: 0, real: true }, clubId, club?.reputation ?? 40);
    p.pa = Math.max(sp.pa, overall(p));
    p.personality = sp.personality;
    if (sp.cm) p.cm = { v: sp.cm, o: overall(p) };
    if (sp.past) p.past = sp.past.map((h) => [...h] as [number, number, number, number, number]);
    // Meta clubs (Arsenal) are overpowered here too: same overall, profile shaped towards what wins matches
    if (club && isMetaClub(club)) applyMetaProfile(p);
    p.contractEnd = clubId === null ? g.season : sp.contractEnd;
    p.caps = sp.caps || undefined;
    p.intGoals = sp.intGoals || undefined;
    if (sp.youth) { p.squad = 'youth'; p.wage = Math.max(100, Math.round(p.wage * 0.3)); }
    if (sp.shirt !== undefined && !sp.youth && !taken.has(sp.shirt)) { p.shirt = sp.shirt; taken.add(sp.shirt); }
  }
}

export function createWorld(opts: NewGameOptions): GameState {
  seed(opts.seed ?? (Date.now() % 2147483647));
  const cm = opts.cm;
  setEconomy(cm ? { era: 'cm0102' } : null);
  const g: GameState = {
    saveVersion: SAVE_VERSION,
    slot: opts.slot,
    mode: opts.mode,
    ...(cm ? { era: 'cm0102' as const, econ: 1 } : {}),
    manager: opts.manager,
    ...(opts.managerNat ? { managerNat: opts.managerNat } : {}),
    date: cm ? `${cm.season}-07-01` : START_DATE,
    season: cm ? cm.season : START_SEASON,
    userClubId: -1,
    rng: 0,
    nextId: 1,
    players: {},
    clubs: {},
    leagues: [],
    cups: [],
    fixtures: [],
    inbox: [],
    offers: [],
    transfers: [],
    board: { confidence: 60, objective: '', objectiveRank: 10, patience: 3, lastRequest: null, facilityUpgrade: null },
    training: { intensity: 'normal', firstFocus: 'balanced', youthFocus: 'technical' },
    history: [],
    sacked: false,
    autoSubs: true,
    shortlist: [],
    ledger: [],
    continental: [],
  };

  const levels: Record<number, number> = {};
  const cmIndex: Record<number, number> = {}; // our club id → CM club index
  for (const def of LEAGUE_DEFS) {
    const [name, short] = cm ? CM_LEAGUE_NAMES[def.id] ?? [def.name, def.short] : [def.name, def.short];
    const league: League = {
      id: def.id, name, short, country: def.country, tier: def.tier,
      clubIds: [], up: def.up, down: def.down, color: def.color,
    };
    const cmClubs = cm?.leagues.find((l) => l.id === def.id)?.clubs ?? [];
    let lines = cm ? cmClubs.map((i) => cmClubLine(cm.clubs[i])) : def.clubs;
    // Create-a-club: the new club takes the place of the lowest-reputation National League side
    if (opts.mode === 'create' && def.id === 'ENG5') {
      const sorted = [...lines].sort((a, b) => Number(a.split('|')[4]) - Number(b.split('|')[4]));
      lines = lines.filter((l) => l !== sorted[0]);
    }
    lines.forEach((line, i) => {
      const id = nextId(g);
      const { level, ...club } = parseClub(line, def.id, def.country, id);
      g.clubs[id] = club;
      levels[id] = level;
      league.clubIds.push(id);
      setClubFinances(club, def.tier);
      if (cm) cmIndex[id] = cmClubs[i];
    });
    if (opts.mode === 'create' && def.id === 'ENG5' && opts.custom) {
      const id = nextId(g);
      const c = opts.custom;
      const club: Club = {
        id, name: c.name, short: c.short.toUpperCase().slice(0, 3), colors: c.colors, crest: c.crest,
        leagueId: def.id, country: 'ENG', reputation: 12, stadium: c.stadium, capacity: 2500,
        balance: 400_000, transferBudget: 150_000, wageBudget: 0,
        facilities: { training: 1, youth: 1 },
        tactics: normaliseTactics({ formation: '4-4-2' }),
        lineup: [], subs: [], isUser: true, custom: true, seasonIncome: 0, seasonExpense: 0, trophies: [],
      };
      g.clubs[id] = club;
      levels[id] = 49;
      league.clubIds.push(id);
      g.userClubId = id;
    }
    g.leagues.push(league);
  }

  // CM 01/02: the rest of Europe's best clubs (UEFA competitions only), then every player from the database
  if (cm) {
    for (const i of cm.guests) {
      const c = cm.clubs[i];
      const id = nextId(g);
      const { level, ...club } = parseClub(cmClubLine(c), EURO_GUEST_LEAGUE, c.country, id);
      g.clubs[id] = club;
      levels[id] = level;
      cmIndex[id] = i;
      setClubFinances(club, 2);
    }
    g.pastClubs = cm.pastClubs;
    for (const [id, i] of Object.entries(cmIndex)) addCmPlayers(g, cm, i, Number(id));
    addCmPlayers(g, cm, -1, null);
  }

  // Real players
  const byName: Record<string, Club> = {};
  for (const c of Object.values(g.clubs)) byName[c.name] = c;
  for (const [clubName, lines] of Object.entries(cm ? {} : REAL_PLAYERS)) {
    const club = byName[clubName];
    if (!club) continue;
    for (const line of lines) {
      const spec = parsePlayer(line);
      const p = createPlayer(g, spec, club.id, club.reputation);
      // Stable, plausible contract lengths for real players
      p.contractEnd = g.season + 1 + Math.floor(hash(p.id) * 4);
      // Real squad number where we know it
      const num = SHIRT_NUMBERS[clubName]?.[line.split('|')[0]];
      if (num !== undefined) p.shirt = num;
    }
  }

  // Real academy prospects
  for (const [clubName, lines] of Object.entries(cm ? {} : YOUTH_PLAYERS)) {
    const club = byName[clubName];
    if (!club) continue;
    for (const line of lines) {
      const p = createPlayer(g, parsePlayer(line), club.id, club.reputation);
      p.squad = 'youth';
      p.wage = Math.max(100, Math.round(p.wage * 0.3));
      p.contractEnd = g.season + 2 + Math.floor(hash(p.id) * 2);
    }
  }

  // Fill squads + youth (academies are topped up to 7-10 with generated players)
  const youthCount: Record<number, number> = {};
  for (const p of Object.values(g.players)) if (p.squad === 'youth' && p.clubId !== null) youthCount[p.clubId] = (youthCount[p.clubId] ?? 0) + 1;
  for (const club of Object.values(g.clubs)) {
    fillSquad(g, club, levels[club.id]);
    // CM 01/02: squads and academies are the database's; new names only arrive through yearly intakes
    if (cm) continue;
    generateYouth(g, club, club.custom ? 4 : Math.max(2, int(7, 10) - (youthCount[club.id] ?? 0)));
  }

  // Free agents
  for (let i = 0; i < (cm ? 0 : 160); i++) {
    const ovr = Math.max(30, Math.round(normal(55, 9)));
    const age = int(19, 34);
    const p = generatePlayer(g, { pos: pick(SQUAD_TEMPLATE), ovr, age, country: pick(['ENG', 'ENG', 'ENG', 'ESP', 'ITA', 'GER', 'FRA']), clubId: null });
    p.contractEnd = g.season;
  }

  // Classic mode: pick club
  if (opts.mode === 'classic') {
    const club = Object.values(g.clubs).find((c) => c.name === opts.clubName) ?? Object.values(g.clubs)[0];
    club.isUser = true;
    g.userClubId = club.id;
  }

  for (const club of Object.values(g.clubs)) {
    club.wageBudget = Math.round(wageBill(g, club.id) * (club.custom ? 1.4 : 1.12));
    const squad = squadOf(g, club.id);
    club.tactics = normaliseTactics({ ...club.tactics, formation: bestFormation(club, squad), roles: [] });
    const { lineup, subs } = pickLineup(club, squad);
    club.lineup = lineup;
    club.subs = subs;
  }

  // Cups
  for (const def of CUP_DEFS) {
    g.cups.push({ id: def.id, name: def.name, short: def.short, type: 'domestic', country: def.country, color: def.color, alive: [], rounds: [], current: 0, winner: null, runnerUp: null });
  }
  // European competitions and the guest clubs from the rest of Europe
  ensureEurope(g);
  assignAllShirtNumbers(g);

  return g;
}

export function leagueOf(g: GameState, clubId: number) {
  return g.leagues.find((l) => l.clubIds.includes(clubId))!;
}

export function squadOf(g: GameState, clubId: number, which: 'first' | 'youth' | 'all' = 'first') {
  const out: Player[] = [];
  for (const p of Object.values(g.players)) {
    if (p.clubId !== clubId) continue;
    if (which !== 'all' && p.squad !== which) continue;
    out.push(p);
  }
  return out;
}

export { addDays };
