// Squad numbers: first-choice players get the traditional number for their position
// (1 keeper, 2/3 full-backs, 4/5 centre-backs, 6 holding midfield, 7/11 wingers, 8/10 central
// midfield, 9 striker); everyone else gets the next free number from 12 up. Numbers stay with
// a player while they're at the club.
import { overall } from './ratings';
import type { GameState, Player, Pos } from './types';

const PREFERRED: Record<Pos, number[]> = {
  GK: [1, 13, 31],
  DR: [2, 22, 24],
  DL: [3, 23, 26],
  DC: [4, 5, 6, 15, 16],
  DM: [6, 16, 18],
  MC: [8, 14, 16, 18],
  ML: [11, 17, 21],
  MR: [7, 17, 20],
  AMC: [10, 8, 19],
  AML: [11, 17, 21],
  AMR: [7, 17, 20],
  ST: [9, 19, 20],
};

/** Give a number to every player at the club who doesn't have one, best players first. */
export function assignShirtNumbers(g: GameState, clubId: number, squad = Object.values(g.players).filter((p) => p.clubId === clubId)) {
  const taken = new Set(squad.map((p) => p.shirt).filter((n): n is number => n !== undefined));
  const need = squad.filter((p) => p.shirt === undefined).sort((a, b) => Number(a.squad === 'youth') - Number(b.squad === 'youth') || overall(b) - overall(a));
  for (const p of need) {
    let n = PREFERRED[p.pos].find((x) => !taken.has(x));
    if (n === undefined) {
      n = p.squad === 'youth' ? 30 : 12;
      while (taken.has(n) || n === 1) n++;
    }
    p.shirt = n;
    taken.add(n);
  }
}

export function assignAllShirtNumbers(g: GameState) {
  for (const [id, squad] of playersByClub(g)) assignShirtNumbers(g, id, squad);
}

/** Every club's players (first team and academy), grouped in one pass over the world. */
export function playersByClub(g: GameState) {
  const out = new Map<number, Player[]>();
  for (const p of Object.values(g.players)) {
    if (p.clubId === null) continue;
    const list = out.get(p.clubId);
    if (list) list.push(p);
    else out.set(p.clubId, [p]);
  }
  return out;
}

/** A player changing clubs gives up their old number. */
export function releaseShirt(p: Player) {
  p.shirt = undefined;
}
