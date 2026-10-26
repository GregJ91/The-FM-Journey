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
}

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
}

export interface Tactics {
  formation: string;
  mentality: number; // -2..2
  pressing: number; // 0..2
  style: 'short' | 'mixed' | 'direct';
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
  type: 'domestic' | 'continental';
  country: string | null;
  color: string;
  alive: number[];
  rounds: { name: string; date: string }[];
  current: number; // index into rounds of next round to be drawn/played
  winner: number | null;
  runnerUp: number | null;
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
  continental: number[]; // entrants for next season's continental cup
  ledgerMark?: { i: number; e: number };
}
