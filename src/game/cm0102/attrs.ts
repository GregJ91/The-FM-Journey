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
