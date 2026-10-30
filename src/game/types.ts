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
  personality?: string; // FM-style personality (see personality.ts); derived from the id when unset
  foot: 'L' | 'R' | 'B';
  attrs: Attrs; // floats 1-20; displayed rounded
  pa: number; // potential overall (1-99)
  clubId: number | null; // null = free agent
  squad: 'first' | 'reserve' | 'youth'; // reserve: CM 01/02 careers' reserve team
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
  shirt?: number; // squad number
  past?: [number, number, number, number, number][]; // CM careers: real career before the save began ([season, index into g.pastClubs, apps, goals, loan])
  cm?: { v: number[]; o: number };
  preContract?: PreContract; // agreed to join another club on a free in the summer
  awards?: string[]; // e.g. "Ballon d'Or 2002/03"
  clauses?: ContractClauses; // clauses in his contract with his current club (CM careers)
  sellOn?: { clubId: number; pct: number }; // a club he was sold by gets this share of his next transfer fee
  appsFee?: { clubId: number; payer: number; fee: number; apps: number; done: number }; // owed to clubId once he plays `apps` games for payer
  dbi?: number; // CM 01/02 careers: index in the database, so saves can leave out what never changes (history, CM attributes)
  cmEdited?: boolean; // the editor changed his CM attributes or personality: save them
  loan?: { from: number; until: string }; // on loan here from club `from` until the date
  loanListed?: boolean; // available for loan (your players: other clubs can ask to borrow him) // CM 01/02 careers: CM-only attributes (CM_EXTRA order) and the overall they were read at
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
  reserve?: boolean; // a reserve league (CM 01/02 careers): reserve squads plus first-teamers needing a game
  winner: number | null;
  runnerUp: number | null;
}

export interface Tactics {
  name?: string; // the manager's name for the tactic
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
  runs?: Run[]; // CM-style run arrows drawn on the tactics pitch
  instr?: PlayerInstr[]; // CM-style individual instructions, per position
}

/** -1 rarely / easy, 0 mixed / normal, 1 often / hard. */
export type Often = -1 | 0 | 1;

/** CM 01/02 player instructions for the player in `slot` of formation `f`. */
export interface PlayerInstr {
  f: string;
  slot: number;
  runs?: Often; // forward runs
  longShots?: Often;
  throughBalls?: Often;
  closing?: Often; // closing down
  tackling?: Often; // easy / normal / hard
  tight?: boolean; // tight marking
  holdUp?: boolean; // hold the ball up (forwards)
  freeRole?: boolean;
}

/** Man-marking for one match: `marker` (yours) follows `target` (theirs) everywhere. */
export interface ManMark {
  marker: number;
  target: number;
}

/** Captain and set-piece takers (player ids; anyone not on the pitch is replaced by the best available). */
export interface SetPieces {
  captain?: number;
  pens?: number;
  fk?: number;
  corners?: number;
}

/** A run arrow: the player in `slot` makes a run to (x, y) in formation coordinates (x forward, y across), with or without the ball. */
export interface Run {
  f: string; // the formation it was drawn for (arrows only apply to that formation)
  slot: number;
  x: number;
  y: number;
  ball?: boolean;
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
  marks?: { fixtureId: number; list: ManMark[] }; // man-marking set before a match (CM careers)
  setPieces?: SetPieces; // the manager's captain and set-piece takers (computer clubs: the best on the pitch)
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
  /** League Cups (CM 01/02 careers): which leagues take part; the country's other cup is the main one (FA Cup…) */
  leagues?: string[];
  /** CM 01/02 careers: the 2002/03 formats (qualifying, two group stages, two-legged knockouts, Intertoto) */
  format?: '2002';
  kinds?: ('ko' | 'g1' | 'g2' | 'final')[]; // per round: knockout round, matchday of the first / second group stage, final
  groupSets?: number[][][]; // [first group stage, second group stage]
  carry?: number[]; // clubs waiting for the next draw (winners, and clubs dropping in from other competitions)
  direct?: number[]; // Champions League: clubs going straight into the group stage
  super?: boolean; // a super cup (CM careers): last season's winners in a one-off (or two-legged) curtain-raiser
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
  kind: 'info' | 'offer' | 'board' | 'transfer' | 'injury' | 'development' | 'youth' | 'match' | 'season' | 'news' | 'training' | 'preview' | 'report' | 'award';
  offerId?: number;
  /** Routine reports don't stop Continue */
  quiet?: boolean;
  /** Needs a response: Continue is blocked until it's answered */
  action?: MessageAction;
}

export type ActionType = 'offer' | 'registration' | 'contract' | 'unhappy' | 'press' | 'job';

export interface MessageAction {
  type: ActionType;
  status: 'open' | 'done';
  options: { id: string; label: string }[];
  offerId?: number;
  playerId?: number;
  fixtureId?: number;
  scope?: 'league' | 'europe'; // registration
  clubIds?: number[]; // job offers (The Journey)
  result?: string; // what happened after the response
}

export interface Registration {
  league?: number[]; // registered players aged 21+ (under-21s are exempt)
  europe?: number[];
}

export interface Deduction {
  clubId: number;
  leagueId: string;
  season: number;
  pts: number;
  reason: string;
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
  contract?: ContractOffer; // the user's contract offer to the player once the fee is agreed
  /** transfer (default): fee agreed with his club first; free: a free agent; pre: a pre-contract with a player whose
   *  contract ends this summer (joins on a free then); renew: a new contract for one of your own players; loan: a season-long loan */
  kind?: 'transfer' | 'free' | 'pre' | 'renew' | 'loan';
  // Add-ons to a bid (CM careers)
  swap?: number; // one of the buyer's players offered in part-exchange
  sellOn?: number; // % of his next transfer fee going to the selling club
  appsFee?: { fee: number; apps: number }; // paid to the selling club once he has played this many games
}

/** Clauses in a player's contract (CM 01/02). */
export interface ContractClauses {
  release?: number; // he can talk to any club that bids this much
  relegation?: boolean; // he may leave on a free if the club is relegated
}

/** A pre-contract: he joins this club on a free when his contract runs out in the summer. */
export interface PreContract {
  clubId: number;
  wage: number;
  years: number;
  bonus: number;
  clauses?: ContractClauses;
}

export type SquadRole = 'key' | 'first' | 'rotation' | 'backup';

/** Personal terms offered to a player (CM-style): he answers the next day. */
export interface ContractOffer {
  wage: number;
  years: number;
  bonus: number; // signing-on fee
  role: SquadRole;
  by: string; // date he answers
  state: 'pending' | 'rejected' | 'agreed'; // agreed: he accepted, the transfer waits for your confirmation
  tries: number; // offers he has turned down
  note?: string; // why he turned the last one down
  release?: number; // minimum release fee clause
  relegation?: boolean; // relegation release clause
}

export interface TransferRecord {
  date: string;
  playerId: number;
  name: string;
  from: number | null;
  to: number | null;
  fee: number; // 0 = free
  loan?: boolean;
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

/** An award (end of season, Ballon d'Or, or Manager of the Month). */
export interface Award {
  season: number;
  comp: string; // league id, or 'EUR' for the Ballon d'Or
  award: string;
  playerId?: number;
  name: string;
  clubId: number;
  detail?: string; // position in the Team of the Year, goals, the month…
}

export interface SeasonHistory {
  season: number;
  winners: { comp: string; name: string; clubId: number }[];
  userFinish: { comp: string; pos: number } | null;
  topScorer?: { playerId: number; name: string; goals: number; clubId: number };
}

export type ManagerAttr = 'attacking' | 'defending' | 'tactical' | 'youth' | 'motivating' | 'manManagement' | 'negotiating' | 'media';

/** The user's manager profile: attributes 1-20 and this month's tendency points. */
export interface ManagerProfile {
  skills: Record<ManagerAttr, number>;
  tally: Record<ManagerAttr, number>;
  last: Partial<Record<ManagerAttr, number>>; // change at the last monthly update
}

/** The Journey: a player your director of football has found for a request. */
export interface Candidate {
  playerId: number;
  chance: number; // 0-100 likelihood of signing
  reasons: { good: boolean; text: string }[];
  fee: number;
  wage: number;
  status: 'open' | 'pursuing' | 'signed' | 'failed' | 'rejected';
  resolveOn?: string;
}

export interface RecruitRequest {
  id: number;
  slot: number; // formation slot the player is for
  pos: Pos;
  role: string;
  maxAge: number;
  maxWage: number;
  created: string;
  ready: string;
  status: 'scouting' | 'ready' | 'closed';
  candidates: Candidate[];
}

/** CM 01/02 careers: the manager's reputation and the job market. */
export interface Jobs {
  rep: number; // manager reputation 1-100
  vacancies: { clubId: number; since: string; offered?: boolean; applied?: string; answered?: boolean }[];
  career: { clubId: number; from: string; to?: string }[];
}

export interface Journey {
  background: string;
  nat?: string; // manager nationality
  age?: number; // manager age at the start
  rep: number; // manager reputation 1-100
  dof: number; // director of football level 1-5
  scouting: number; // scouting department level 1-5
  requests: RecruitRequest[];
  upgrade: { kind: 'dof' | 'scouting'; ready: string } | null;
  lastAsk: string | null; // month of the last upgrade request (YYYY-MM)
  vacancies: { clubId: number; since: string; offered?: boolean }[];
  career: { clubId: number; from: string; to?: string }[];
}

export interface GameState {
  saveVersion: number;
  slot: string;
  mode: 'classic' | 'create' | 'journey';
  era?: 'cm0102'; // built from the player's own Championship Manager 01/02 database
  manager: string;
  pastClubs?: string[]; // CM careers: club names for players' pre-save careers
  cmRev?: number; // CM careers: revision of the database the career was built from
  worldStart?: string; // the date the world was created (players who joined then don't save it)
  editor?: boolean; // the in-game editor is unlocked for this save (CM careers: tactic named "Editor")
  econ?: number; // CM careers: 1 once the save runs at 2002 prices (older CM saves are converted on load)
  managerNat?: string; // nationality code (The Journey keeps its own in journey.nat)
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
  managerProfile?: ManagerProfile;
  journey?: Journey;
  superNext?: Record<string, [number, number]>; // who meets in next season's super cups (set at the end of the season)
  awards?: Award[]; // awards given out (end of season, Ballon d'Or, Manager of the Month)
  jobs?: Jobs; // CM 01/02 careers: reputation, vacancies and the clubs managed
  intl?: IntlTournament[]; // international tournaments (current and recent)
  youth?: YouthComp[]; // this season's youth competitions
  deductions?: Deduction[]; // points deductions (this and past seasons)
  events?: string[]; // one-off scripted events that have already fired
  registration?: Registration; // the manager's squad registration // qualified clubs for next season's European competitions
  ledgerMark?: { i: number; e: number };
}
