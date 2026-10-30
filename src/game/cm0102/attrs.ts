// The full Championship Manager 01/02 attribute list for a player in a CM career. Attributes the game simulates
// come from the live values; the CM-only ones were read from the database and drift with the player's level.
import { overall } from '../ratings';
import type { Player } from '../types';
import { CM_EXTRA, CM_RELATIVE } from './parse';

export interface CmAttrGroup { name: string; rows: [string, number][] }

export function cmAttributes(p: Player): CmAttrGroup[] | null {
  if (!p.cm) return null;
  const drift = (overall(p) - p.cm.o) / 4.6;
  const x = (k: (typeof CM_EXTRA)[number]) => {
    const v = p.cm!.v[CM_EXTRA.indexOf(k)] ?? 10;
    return Math.max(1, Math.min(20, v + (CM_RELATIVE.has(k) ? drift : 0)));
  };
  const a = p.attrs;
  const physical: [string, number][] = [
    ['Acceleration', x('acceleration')], ['Agility', x('agility')], ['Balance', x('balance')], ['Jumping', x('jumping')],
    ['Natural Fitness', x('naturalFitness')], ['Pace', a.pace], ['Stamina', a.stamina], ['Strength', a.strength],
  ];
  const mental: [string, number][] = [
    ['Aggression', x('aggression')], ['Anticipation', x('anticipation')], ['Bravery', x('bravery')], ['Creativity', a.vision],
    ['Decisions', a.decisions], ['Determination', x('determination')], ['Flair', x('flair')], ['Influence', x('leadership')],
    ['Off the Ball', x('movement')], ['Positioning', a.positioning], ['Teamwork', x('teamwork')], ['Work Rate', a.workRate],
  ];
  const technical: [string, number][] = p.pos === 'GK'
    ? [['Aerial Ability', a.aerial], ['Handling', a.handling], ['Kicking', a.distribution], ['One on Ones', x('oneOnOnes')], ['Reflexes', a.reflexes], ['Throw Ins', x('throwIns')]]
    : [
      ['Corners', x('corners')], ['Crossing', a.crossing], ['Dribbling', a.dribbling], ['Finishing', a.finishing], ['Free Kicks', x('freeKicks')],
      ['Heading', a.heading], ['Long Shots', x('longShots')], ['Marking', x('marking')], ['Passing', a.passing], ['Penalties', x('penalties')],
      ['Tackling', a.tackling], ['Technique', a.firstTouch], ['Throw Ins', x('throwIns')],
    ];
  return [
    { name: p.pos === 'GK' ? 'Goalkeeping' : 'Technical', rows: technical },
    { name: 'Mental', rows: mental },
    { name: 'Physical', rows: physical },
  ];
}

/**
 * One CM-only attribute (penalties, free kicks, corners, influence…) on the 1-20 scale. Players without CM data
 * (regens, modern careers) get a fair estimate from the attributes the game does simulate.
 */
export function cmExtra(p: Player, k: (typeof CM_EXTRA)[number]): number {
  if (p.cm) {
    const drift = (overall(p) - p.cm.o) / 4.6;
    const v = p.cm.v[CM_EXTRA.indexOf(k)] ?? 10;
    return Math.max(1, Math.min(20, v + (CM_RELATIVE.has(k) ? drift : 0)));
  }
  const a = p.attrs;
  switch (k) {
    case 'penalties': return (a.finishing + a.composure) / 2;
    case 'freeKicks': return (a.passing + a.finishing + a.vision) / 3;
    case 'corners': return (a.crossing + a.passing) / 2;
    case 'leadership': return (a.composure + a.decisions) / 2;
    default: return 10;
  }
}

type Live = keyof Player['attrs'];
type Extra = (typeof CM_EXTRA)[number];
/** Every CM attribute by its on-screen name: one the game simulates, or a CM-only one. */
const BY_LABEL: Record<string, ['a', Live] | ['x', Extra]> = {
  Corners: ['x', 'corners'], Crossing: ['a', 'crossing'], Dribbling: ['a', 'dribbling'], Finishing: ['a', 'finishing'], 'Free Kicks': ['x', 'freeKicks'],
  Heading: ['a', 'heading'], 'Long Shots': ['x', 'longShots'], Marking: ['x', 'marking'], Passing: ['a', 'passing'], Penalties: ['x', 'penalties'],
  Tackling: ['a', 'tackling'], Technique: ['a', 'firstTouch'], 'Throw Ins': ['x', 'throwIns'],
  Aggression: ['x', 'aggression'], Anticipation: ['x', 'anticipation'], Bravery: ['x', 'bravery'], Creativity: ['a', 'vision'], Decisions: ['a', 'decisions'],
  Determination: ['x', 'determination'], Flair: ['x', 'flair'], Influence: ['x', 'leadership'], 'Off the Ball': ['x', 'movement'], Positioning: ['a', 'positioning'],
  Teamwork: ['x', 'teamwork'], 'Work Rate': ['a', 'workRate'],
  Acceleration: ['x', 'acceleration'], Agility: ['x', 'agility'], Balance: ['x', 'balance'], Jumping: ['x', 'jumping'], 'Natural Fitness': ['x', 'naturalFitness'],
  Pace: ['a', 'pace'], Stamina: ['a', 'stamina'], Strength: ['a', 'strength'],
  'Aerial Ability': ['a', 'aerial'], Handling: ['a', 'handling'], Kicking: ['a', 'distribution'], 'One on Ones': ['x', 'oneOnOnes'], Reflexes: ['a', 'reflexes'],
};
/** The attribute names a search can use, grouped as on the profile. */
export const SEARCH_ATTRS: [string, string[]][] = [
  ['Technical', ['Corners', 'Crossing', 'Dribbling', 'Finishing', 'Free Kicks', 'Heading', 'Long Shots', 'Marking', 'Passing', 'Penalties', 'Tackling', 'Technique', 'Throw Ins']],
  ['Mental', ['Aggression', 'Anticipation', 'Bravery', 'Creativity', 'Decisions', 'Determination', 'Flair', 'Influence', 'Off the Ball', 'Positioning', 'Teamwork', 'Work Rate']],
  ['Physical', ['Acceleration', 'Agility', 'Balance', 'Jumping', 'Natural Fitness', 'Pace', 'Stamina', 'Strength']],
  ['Goalkeeping', ['Aerial Ability', 'Handling', 'Kicking', 'One on Ones', 'Reflexes']],
];
/** A player's attribute by its on-screen name, rounded as the profile shows it (quick enough to search everyone). */
export function attrByLabel(p: Player, label: string): number {
  const m = BY_LABEL[label];
  if (!m) return 0;
  return Math.round(m[0] === 'a' ? p.attrs[m[1]] : cmExtra(p, m[1]));
}

