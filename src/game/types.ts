export type Pos = 'GK' | 'DL' | 'DC' | 'DR' | 'DM' | 'ML' | 'MC' | 'MR' | 'AML' | 'AMC' | 'AMR' | 'ST';

export const ATTR_KEYS = [
  'finishing', 'passing', 'dribbling', 'firstTouch', 'crossing', 'tackling', 'heading',
  'vision', 'decisions', 'composure', 'positioning', 'workRate',
  'pace', 'stamina', 'strength',
  'reflexes', 'handling', 'aerial', 'distribution',
] as const;
export type AttrKey = (typeof ATTR_KEYS)[number];
export type Attrs = Record<AttrKey, number>;

export type TrainingFocus = 'balanced' | 'attacking' | 'defending' | 'technical' | 'physical' | 'mental';
export type Intensity = 'low' | 'normal' | 'high';

export interface SeasonStats {
  apps: number;
  goals: number;
  assists: number;
  mins: number;
  ratingSum: number;
  yellows: number;
  reds: number;
  cleanSheets: number;
  motm: number;
  // detailed
  shots: number;
  sot: number; // shots on target
  xg: number;
  kp: number; // key passes (passes leading to a shot)
  xa: number;
  passes: number; // attempted
  passC: number; // completed
  drb: number; // dribbles completed
  drbA: number; // dribbles attempted
  tkl: number; // tackles won
  int: number; // interceptions
  clr: number; // clearances
  fouls: number;
  saves: number;
  conceded: number;
}

/** Per-match stat line (same detailed fields, used live and in match reports). */
export type StatLine = Omit<SeasonStats, 'apps' | 'ratingSum' | 'cleanSheets' | 'motm'>;

export interface CareerEntry {
  season: number;
  clubId: number;
  apps: number;
  goals: number;
  avg: number;
}

export interface Injury {
  name: string;
  days: number;
  reported?: boolean;
}

export interface Player {
  id: number;
  first: string;
  last: string;
  nat: string;
  dob: string; // ISO date
  pos: Pos;
  alt: Pos[];
  foot: 'L' | 'R' | 'B';
  attrs: Attrs; // floats 1-20; displayed rounded
  pa: number; // potential overall (1-99)
  clubId: number | null; // null = free agent
  squad: 'first' | 'youth';
  wage: number; // weekly
  contractEnd: number; // year contract ends (June 30 of that year)
  morale: number; // 0-100
  condition: number; // 0-100 match fitness
  form: number[]; // last 5 match ratings
  injury: Injury | null;
  suspended: number; // matches
  yellowAcc: number; // accumulated yellow cards
  stats: SeasonStats;
  history: CareerEntry[];
  listed: boolean;
  real: boolean;
  focus: TrainingFocus | null; // individual focus
  monthMins: number;
  monthRatings: number[];
  lastChange: number; // overall change last month
  joined: string; // date joined current club
  caps?: number; // international appearances
  intGoals?: number;
  away?: string; // on international duty (tournament name) — not available to the club
  ys?: YouthStats; // this season's youth-team matches
  meta?: boolean; // has a meta attribute profile (see meta.ts)
}

export interface YouthStats { apps: number; mins: number; goals: number; assists: number; rs: number }

export interface YouthFixture {
  id: number;
  d: string; // date
  r: number; // round (1-based)
  h: number;
  a: number;
  hg?: number;
  ag?: number;
  p?: [number, number]; // penalties
  t?: number; // knockout tie index (bracket order)
}

export interface YouthComp {
  id: string;
  name: string;
  short: string;
  color: string;
  kind: 'league' | 'cup' | 'uyl';
  age: number;
  clubs: number[];
  rounds: { name: string; date: string }[];
  fixtures: YouthFixture[];
  current: number; // rounds completed
  alive: number[];
  lp?: number; // UEFA Youth League: league-phase rounds
  winner: number | null;
  runnerUp: number | null;
}

export interface Tactics {
  formation: string;
  mentality: number; // -2..2 (very defensive .. very attacking)
  pressing: number; // 0 low block, 1 mid, 2 high press
  style: 'short' | 'mixed' | 'direct'; // passing style
  tempo: number; // 0 slow, 1 normal, 2 fast
  width: number; // 0 narrow, 1 balanced, 2 wide
  line: number; // defensive line: 0 deep, 1 standard, 2 high
  tackling: number; // 0 stay on feet, 1 normal, 2 get stuck in
  focus: 'mixed' | 'left' | 'centre' | 'right'; // attacking focus
  counter: boolean; // break quickly when winning the ball
  offsideTrap: boolean;
  playOutBack: boolean;
  timeWasting: boolean;
  roles: string[]; // role id per formation slot
}

export interface Facilities {
  training: number; // 1-5
  youth: number; // 1-5
}

export interface Club {
  id: number;
  name: string;
  short: string;
  colors: [string, string];
  crest: { shape: CrestShape; pattern: CrestPattern };
  leagueId: string;
  country: string;
  reputation: number; // 1-100
  stadium: string;
  capacity: number;
  balance: number;
  transferBudget: number;
  wageBudget: number; // weekly
  facilities: Facilities;
  tactics: Tactics;
  lineup: (number | null)[]; // 11 player ids in formation slot order
  subs: number[];
  isUser: boolean;
  custom: boolean;
  seasonIncome: number;
  seasonExpense: number;
  trophies: { season: number; name: string }[];
  youthTrophies?: { season: number; name: string }[];
}

export type CrestShape = 'shield' | 'circle' | 'diamond' | 'badge';
export type CrestPattern = 'plain' | 'stripes' | 'halves' | 'sash' | 'hoops' | 'chevron';

export interface GoalRecord {
  minute: number;
  team: 0 | 1;
  scorer: number;
  assist: number | null;
  pen?: boolean;
  og?: boolean;
}

export interface FixtureResult {
  hg: number;
  ag: number;
  pens?: [number, number];
  agg?: [number, number]; // two-legged tie: aggregate after this match (home, away)
  goals: GoalRecord[];
  reds: { minute: number; team: 0 | 1; player: number }[];
  stats?: MatchStats;
  ratings?: Record<number, number>;
  motm?: number;
}

export interface Fixture {
  id: number;
  comp: string; // league id or cup id
  date: string;
  round: number;
  roundName?: string;
  home: number;
  away: number;
  result: FixtureResult | null;
  neutral?: boolean;
  knockout?: boolean;
  leg?: 1 | 2; // two-legged ties
  firstLeg?: number; // leg 2: id of the first leg
  tie?: number; // knockout tie index (bracket order)
}

export interface League {
  id: string;
  name: string;
  short: string;
  country: string;
  tier: number;
  clubIds: number[];
  up: number; // promoted to tier above
  down: number; // relegated to tier below
  color: string;
}

export interface Cup {
  id: string;
  name: string;
  short: string;
  type: 'domestic' | 'continental' | 'world';
  country: string | null;
  color: string;
  alive: number[];
  rounds: { name: string; date: string }[];
  current: number; // index into rounds of next round to be drawn/played
  winner: number | null;
  runnerUp: number | null;
  /** European format: league phase (one round per matchday) then two-legged knockouts */
  teams?: number[]; // league-phase entrants
  lp?: number; // number of league-phase matchdays
  groups?: number[][]; // Club World Cup groups
}

export interface IntlMatch {
  id: number;
  date: string;
  stage: number; // index into IntlTournament.stages
  group?: number;
  tie?: number;
  a: string; // nation codes
  b: string;
  ga?: number;
  gb?: number;
  et?: boolean;
  pens?: [number, number];
  scorers?: { nat: string; pid: number | null; min: number }[];
}

export interface IntlTournament {
  id: string;
  comp: string;
  name: string;
  short: string;
  color: string;
  year: number;
  hosts: string[];
  teams: string[];
  groups: string[][];
  stages: { name: string; date: string }[];
  stage: number;
  matches: IntlMatch[];
  squads: Record<string, number[]>;
  xi: Record<string, number[]>;
  strength: Record<string, number>;
  out: string[];
  winner?: string;
  runnerUp?: string;
}

export interface MatchStats {
  poss: [number, number];
  shots: [number, number];
  onTarget: [number, number];
  xg: [number, number];
  corners: [number, number];
  fouls: [number, number];
  yellows: [number, number];
}

export interface Message {
  id: number;
  date: string;
  from: string;
  title: string;
  body: string;
  read: boolean;
  kind: 'info' | 'offer' | 'board' | 'transfer' | 'injury' | 'development' | 'youth' | 'match' | 'season';
  offerId?: number;
}

export interface Offer {
  id: number;
  playerId: number;
  from: number; // buying club
  to: number; // selling club
  fee: number;
  wage: number;
  status: 'pending' | 'accepted' | 'rejected' | 'countered' | 'done' | 'withdrawn' | 'collapsed';
  counter?: number;
  date: string;
  respondBy?: string;
  note?: string;
}

export interface TransferRecord {
  date: string;
  playerId: number;
  name: string;
  from: number | null;
  to: number | null;
  fee: number; // 0 = free
}

export interface Board {
  confidence: number; // 0-100
  objective: string;
  objectiveRank: number; // expected finishing position or better
  patience: number;
  lastRequest: string | null;
  facilityUpgrade: { kind: 'training' | 'youth'; ready: string } | null;
}

export interface Training {
  intensity: Intensity;
  firstFocus: TrainingFocus;
  youthFocus: TrainingFocus;
}

export interface SeasonHistory {
  season: number;
  winners: { comp: string; name: string; clubId: number }[];
  userFinish: { comp: string; pos: number } | null;
  topScorer?: { playerId: number; name: string; goals: number; clubId: number };
}

export interface GameState {
  saveVersion: number;
  slot: string;
  mode: 'classic' | 'create';
  manager: string;
  date: string;
  season: number; // year season started
  userClubId: number;
  rng: number;
  nextId: number;
  players: Record<number, Player>;
  clubs: Record<number, Club>;
  leagues: League[];
  cups: Cup[];
  fixtures: Fixture[];
  inbox: Message[];
  offers: Offer[];
  transfers: TransferRecord[];
  board: Board;
  training: Training;
  history: SeasonHistory[];
  sacked: boolean;
  autoSubs: boolean;
  shortlist: number[];
  ledger: { month: string; income: number; expense: number; balance: number }[];
  continental: number[]; // legacy (pre-Europe saves)
  europe?: Record<string, number[]>;
  intl?: IntlTournament[]; // international tournaments (current and recent)
  youth?: YouthComp[]; // this season's youth competitions // qualified clubs for next season's European competitions
  ledgerMark?: { i: number; e: number };
}
