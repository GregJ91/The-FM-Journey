// CM 01/02 careers hide ability numbers, so the staff describe players in words instead, like CM's scout and coach
// reports: how good he is, how he'd fit your side, how good he could become, and what stands out.
import { cmAttributes } from './cm0102/attrs';
import { squadOf } from './generate';
import { hash } from './rng';
import { age, overall, scoutedPotential } from './ratings';
import type { GameState, Player } from './types';

export interface ScoutReport {
  from: string;
  level: string;
  fit: string;
  potential: string;
  strengths: string[];
  weaknesses: string[];
}

/** Average ability of a club's best XI (first team only). */
function xiLevel(g: GameState, clubId: number) {
  const best = squadOf(g, clubId).map(overall).sort((a, b) => b - a).slice(0, 11);
  return best.length ? best.reduce((s, v) => s + v, 0) / best.length : 50;
}

// Ability bands (the best XI of a mid-table Premiership side is about 78, a Third Division side about 55)
const LEVELS: [number, string, string][] = [
  [89, 'A world-class player', 'Could become a world-class player'],
  [85, 'A top international player', 'Could become a top international'],
  [80, 'An excellent player', 'Has the potential to be an excellent player'],
  [75, 'A very good top-flight player', 'Could become a very good top-flight player'],
  [70, 'A decent top-flight player', 'Could make it in the top flight'],
  [63, 'A good lower-division player', 'Could become a good lower-division player'],
  [56, 'A decent lower-division player', 'Could become a decent lower-division player'],
  [0, 'A limited player', 'Has limited potential'],
];
const band = (v: number) => LEVELS.findIndex(([min]) => v >= min);

/** Plain-language report on `p` from the user's staff. Scouts judge other clubs' players a little less exactly. */
export function scoutReport(g: GameState, p: Player): ScoutReport {
  const own = p.clubId === g.userClubId;
  const err = own ? 0 : Math.round((hash(p.id * 13 + 5) - 0.5) * 4); // scouts can be a point or two out
  const ovr = overall(p) + err;
  const pot = Math.max(ovr, scoutedPotential(p, own));
  const years = age(p, g.date);
  const level = LEVELS[band(ovr)][1];
  const d = ovr - xiLevel(g, g.userClubId);
  const fit = own
    ? d >= 4 ? 'One of the best players at the club' : d >= -2 ? 'A first-team regular' : d >= -7 ? 'A useful squad player' : 'Not up to first-team standard yet'
    : d >= 6 ? 'Would walk into your first team' : d >= 2 ? 'Would be a key player for you' : d >= -3 ? 'Would be a regular in your side' : d >= -8 ? 'Would be a useful squad player' : 'Not good enough for your first team';
  const growth = pot - ovr;
  const potential = years >= 33 ? 'Past his best'
    : years >= 30 || growth <= 2 ? (years >= 25 ? 'Has reached his peak' : 'Has limited room to improve')
    : band(pot) < band(ovr) ? LEVELS[band(pot)][2]
    : years >= 27 ? 'Unlikely to improve much more'
    : 'Can still improve';
  // What stands out on his attributes (leaving out the ones that hardly matter for his position)
  const skip = p.pos === 'GK' ? ['Throw Ins', 'Off the Ball', 'Flair', 'Creativity'] : ['Throw Ins', 'Corners', 'Penalties', 'Free Kicks'];
  const rows = (cmAttributes(p) ?? []).flatMap((gr) => gr.rows).filter(([k]) => !skip.includes(k));
  const sorted = [...rows].sort((a, b) => b[1] - a[1]);
  const strengths = sorted.filter(([, v]) => v >= 14).slice(0, 3).map(([k]) => k);
  const weaknesses = sorted.reverse().filter(([, v]) => v <= 8).slice(0, 2).map(([k]) => k);
  return { from: own ? 'Assistant Manager' : 'Chief Scout', level, fit, potential, strengths, weaknesses };
}
