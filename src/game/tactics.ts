import { FORMATIONS } from './formations';
import type { Pos, Run, Tactics } from './types';

/**
 * Player roles. Each role nudges how much a player contributes to the team's
 * attack / build-up / defence, how often they shoot or create, and how fast
 * they tire. Multipliers are relative to the position's defaults (1 = no change).
 */
export interface Role {
  id: string;
  name: string;
  desc: string;
  att: number;
  mid: number;
  def: number;
  shoot: number;
  create: number;
  fatigue: number;
}

const R = (id: string, name: string, desc: string, att = 1, mid = 1, def = 1, shoot = 1, create = 1, fatigue = 1): Role => ({ id, name, desc, att, mid, def, shoot, create, fatigue });

export const ROLES: Record<Pos, Role[]> = {
  GK: [
    R('gk', 'Goalkeeper', 'Stays on the line and keeps it simple.', 1, 1, 1),
    R('sk', 'Sweeper Keeper', 'Sweeps behind a high line and starts attacks.', 1, 1.15, 1.03),
  ],
  DC: [
    R('cd', 'Central Defender', 'Balanced defender.'),
    R('bpd', 'Ball-Playing Defender', 'Steps out and plays forward passes.', 1, 1.35, 0.96, 1, 1.2),
    R('ncb', 'No-Nonsense Defender', 'Wins it and clears it. Nothing fancy.', 1, 0.7, 1.08),
  ],
  DL: [
    R('fb', 'Full-Back', 'Supports attacks but defends first.'),
    R('wb', 'Wing-Back', 'Bombs forward on the overlap.', 1.6, 1.1, 0.88, 1.1, 1.35, 1.2),
    R('ifb', 'Inverted Full-Back', 'Tucks into midfield in possession.', 1, 1.5, 0.95, 1, 1.1),
  ],
  DR: [
    R('fb', 'Full-Back', 'Supports attacks but defends first.'),
    R('wb', 'Wing-Back', 'Bombs forward on the overlap.', 1.6, 1.1, 0.88, 1.1, 1.35, 1.2),
    R('ifb', 'Inverted Full-Back', 'Tucks into midfield in possession.', 1, 1.5, 0.95, 1, 1.1),
  ],
  DM: [
    R('dm', 'Defensive Midfielder', 'Screens the back line.'),
    R('dlp', 'Deep-Lying Playmaker', 'Dictates play from deep.', 1, 1.2, 0.9, 0.9, 1.4),
    R('anc', 'Anchor', 'Holds position and protects the defence.', 0.7, 0.95, 1.15, 0.6, 0.8, 0.9),
  ],
  MC: [
    R('cm', 'Central Midfielder', 'All-round midfielder.'),
    R('b2b', 'Box-to-Box', 'Gets up and down the pitch.', 1.25, 1, 1.12, 1.2, 1, 1.25),
    R('ap', 'Advanced Playmaker', 'Finds the killer pass between the lines.', 1.2, 1.1, 0.8, 1, 1.5),
    R('mez', 'Mezzala', 'Drifts into the half-spaces to attack.', 1.35, 0.95, 0.85, 1.35, 1.15, 1.1),
  ],
  ML: [
    R('wm', 'Wide Midfielder', 'Works the flank both ways.'),
    R('w', 'Winger', 'Stays wide, beats the full-back, crosses.', 1.3, 0.9, 0.75, 1, 1.4, 1.1),
    R('dw', 'Defensive Winger', 'Tracks back and presses the full-back.', 0.8, 1, 1.35, 0.8, 0.9, 1.15),
  ],
  MR: [
    R('wm', 'Wide Midfielder', 'Works the flank both ways.'),
    R('w', 'Winger', 'Stays wide, beats the full-back, crosses.', 1.3, 0.9, 0.75, 1, 1.4, 1.1),
    R('dw', 'Defensive Winger', 'Tracks back and presses the full-back.', 0.8, 1, 1.35, 0.8, 0.9, 1.15),
  ],
  AML: [
    R('w', 'Winger', 'Hugs the touchline and delivers crosses.', 1, 1, 1, 0.8, 1.4),
    R('if', 'Inside Forward', 'Cuts inside onto the stronger foot to shoot.', 1.15, 0.9, 0.9, 1.6, 0.85),
    R('iw', 'Inverted Winger', 'Comes inside to create.', 1.05, 1.2, 0.9, 1, 1.35),
  ],
  AMR: [
    R('w', 'Winger', 'Hugs the touchline and delivers crosses.', 1, 1, 1, 0.8, 1.4),
    R('if', 'Inside Forward', 'Cuts inside onto the stronger foot to shoot.', 1.15, 0.9, 0.9, 1.6, 0.85),
    R('iw', 'Inverted Winger', 'Comes inside to create.', 1.05, 1.2, 0.9, 1, 1.35),
  ],
  AMC: [
    R('am', 'Attacking Midfielder', 'Links midfield and attack.'),
    R('ap', 'Advanced Playmaker', 'The creative hub of the team.', 1, 1.25, 0.85, 0.85, 1.5),
    R('ss', 'Shadow Striker', 'Arrives late in the box to score.', 1.25, 0.85, 0.85, 1.6, 0.85, 1.05),
  ],
  ST: [
    R('af', 'Advanced Forward', 'Runs in behind and leads the line.'),
    R('p', 'Poacher', 'Lives in the box, all about goals.', 1.1, 0.7, 0.6, 1.45, 0.6, 0.85),
    R('tm', 'Target Man', 'Holds it up and wins headers.', 1, 1.1, 1, 1.05, 1.25),
    R('f9', 'False Nine', 'Drops deep to link play.', 0.95, 1.4, 0.9, 0.85, 1.5),
    R('pf', 'Pressing Forward', 'Harries defenders from the front.', 0.95, 1, 1.35, 1, 1, 1.25),
  ],
};

/**
 * A run arrow changes how the player plays: forward runs get him into the box (more shots, more of the attack) at the
 * cost of tracking back and extra running; runs with the ball mean more dribbling and creating; wide runs more
 * crosses; runs back more defending.
 */
export function withRun(r: Role, from: { x: number; y: number }, run: Run): Role {
  const fwd = Math.max(-1, Math.min(1, (run.x - from.x) / 30));
  const go = Math.max(0, fwd);
  const back = Math.max(0, -fwd);
  const wide = Math.min(1, Math.abs(run.y - from.y) / 40);
  return {
    ...r,
    att: r.att * (1 + 0.12 * go - 0.2 * back),
    mid: r.mid * (1 - 0.1 * go + 0.05 * back),
    def: r.def * (1 - 0.3 * go + 0.2 * back),
    shoot: r.shoot * (1 + (run.ball ? 0.25 : 0.5) * go - 0.3 * back),
    create: r.create * (1 + (run.ball ? 0.35 : 0.1) * go + 0.2 * wide),
    fatigue: r.fatigue * (1 + 0.12 * go + 0.06 * wide),
  };
}

export function roleFor(pos: Pos, id: string | undefined): Role {
  const list = ROLES[pos];
  return list.find((r) => r.id === id) ?? list[0];
}

export const DEFAULT_TACTICS: Omit<Tactics, 'formation' | 'roles'> = {
  mentality: 0,
  pressing: 1,
  style: 'mixed',
  tempo: 1,
  width: 1,
  line: 1,
  tackling: 1,
  focus: 'mixed',
  counter: false,
  offsideTrap: false,
  playOutBack: false,
  timeWasting: false,
};

export function defaultRoles(formation: string) {
  return (FORMATIONS[formation] ?? FORMATIONS['4-4-2']).map((s) => ROLES[s.pos][0].id);
}

/** Fill in any missing fields (older saves, new formations). */
export function normaliseTactics(t: Partial<Tactics> & { formation: string }): Tactics {
  const formation = FORMATIONS[t.formation] ? t.formation : '4-4-2';
  const slots = FORMATIONS[formation];
  const roles = slots.map((s, i) => (t.roles && ROLES[s.pos].some((r) => r.id === t.roles![i]) ? t.roles[i] : ROLES[s.pos][0].id));
  return { ...DEFAULT_TACTICS, ...t, formation, roles } as Tactics;
}

export interface Preset {
  id: string;
  name: string;
  desc: string;
  formation: string;
  t: Partial<Tactics>;
  roles?: Partial<Record<Pos, string>>;
}

export const PRESETS: Preset[] = [
  { id: 'gegen', name: 'Gegenpress', desc: 'Win it back high and fast. Exhausting.', formation: '4-3-3', t: { mentality: 1, pressing: 2, tempo: 2, line: 2, tackling: 2, style: 'mixed', width: 1, counter: true, offsideTrap: true, playOutBack: false, timeWasting: false, focus: 'mixed' }, roles: { ST: 'pf', MC: 'b2b', DL: 'wb', DR: 'wb' } },
  { id: 'tiki', name: 'Tiki-Taka', desc: 'Keep the ball, short passes, patient build-up.', formation: '4-3-3', t: { mentality: 0, pressing: 2, tempo: 0, line: 2, tackling: 1, style: 'short', width: 0, counter: false, offsideTrap: false, playOutBack: true, timeWasting: false, focus: 'centre' }, roles: { ST: 'f9', DM: 'dlp', MC: 'ap', DC: 'bpd', GK: 'sk', AML: 'iw', AMR: 'iw' } },
  { id: 'counter', name: 'Counter-Attack', desc: 'Sit deep, then break with pace.', formation: '4-2-3-1', t: { mentality: -1, pressing: 0, tempo: 2, line: 0, tackling: 1, style: 'direct', width: 1, counter: true, offsideTrap: false, playOutBack: false, timeWasting: false, focus: 'mixed' }, roles: { ST: 'af', AML: 'if', AMR: 'if', DM: 'anc' } },
  { id: 'wing', name: 'Wing Play', desc: 'Get it wide and cross into a target man.', formation: '4-4-2', t: { mentality: 1, pressing: 1, tempo: 1, line: 1, tackling: 1, style: 'mixed', width: 2, counter: false, offsideTrap: false, playOutBack: false, timeWasting: false, focus: 'mixed' }, roles: { ST: 'tm', ML: 'w', MR: 'w', DL: 'wb', DR: 'wb' } },
  { id: 'bus', name: 'Park the Bus', desc: 'Everyone behind the ball. Protect a lead.', formation: '5-3-2', t: { mentality: -2, pressing: 0, tempo: 0, line: 0, tackling: 2, style: 'direct', width: 0, counter: true, offsideTrap: false, playOutBack: false, timeWasting: true, focus: 'mixed' }, roles: { DC: 'ncb', MC: 'cm' } },
  { id: 'route1', name: 'Route One', desc: 'Long balls to the big man up top.', formation: '4-4-2', t: { mentality: 1, pressing: 1, tempo: 2, line: 1, tackling: 2, style: 'direct', width: 1, counter: false, offsideTrap: false, playOutBack: false, timeWasting: false, focus: 'centre' }, roles: { ST: 'tm', DC: 'ncb' } },
];

export function applyPreset(p: Preset): Tactics {
  const slots = FORMATIONS[p.formation];
  const roles = slots.map((s) => p.roles?.[s.pos] ?? ROLES[s.pos][0].id);
  return normaliseTactics({ ...DEFAULT_TACTICS, ...p.t, formation: p.formation, roles });
}
