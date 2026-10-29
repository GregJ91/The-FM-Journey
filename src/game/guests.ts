// Guest clubs: clubs outside the playable leagues that only appear in international club competitions
// (the rest of Europe for UEFA competitions, the rest of the world for the Club World Cup).
import { EURO_CLUBS, EURO_GUEST_LEAGUE, TRANSFER_ONLY_LEAGUE } from './data/europe';
import { SHIRT_NUMBERS } from './data/shirtNumbers';
import { WORLD_CLUBS, WORLD_GUEST_LEAGUE } from './data/world';
import { createPlayer, fillSquad, nextId, parseClub, parsePlayer, setClubFinances, squadOf, wageBill } from './generate';
import { hash } from './rng';
import { bestFormation, pickLineup } from './selection';
import { normaliseTactics } from './tactics';
import type { Club, GameState } from './types';

export const GUEST_LEAGUES = [EURO_GUEST_LEAGUE, WORLD_GUEST_LEAGUE, TRANSFER_ONLY_LEAGUE];

/** CM 01/02 clubs that only buy and sell players. */
export function isTransferOnly(club: Club) {
  return club.leagueId === TRANSFER_ONLY_LEAGUE;
}

export function isGuest(club: Club) {
  return GUEST_LEAGUES.includes(club.leagueId);
}

export function guestLeagueName(leagueId: string) {
  return leagueId === WORLD_GUEST_LEAGUE ? 'Rest of the world' : leagueId === TRANSFER_ONLY_LEAGUE ? 'Other clubs' : 'Rest of Europe';
}

/** Generated-player level for a guest club. */
export function guestLevel(club: Club) {
  const line = [...EURO_CLUBS, ...WORLD_CLUBS].find((l) => l.split('|')[0] === club.name);
  return line ? Number(line.split('|')[5]) : 60 + (club.reputation - 50) * 0.2;
}

/** Add any guest clubs that are missing (new games and older saves), with squads. */
export function addGuestClubs(g: GameState, lines: string[], players: Record<string, string[]>, leagueId: string) {
  const byName = new Set(Object.values(g.clubs).map((c) => c.name));
  for (const line of lines) {
    const name = line.split('|')[0];
    if (byName.has(name)) continue;
    const country = line.split('|')[9];
    const id = nextId(g);
    const { level, ...club } = parseClub(line, leagueId, country, id);
    g.clubs[id] = club;
    setClubFinances(club, 2);
    for (const pl of players[name] ?? []) {
      const p = createPlayer(g, parsePlayer(pl), id, club.reputation);
      p.contractEnd = g.season + 1 + Math.floor(hash(p.id) * 3);
      const num = SHIRT_NUMBERS[name]?.[pl.split('|')[0]];
      if (num !== undefined) p.shirt = num;
    }
    fillSquad(g, club, level, 22);
    const squad = squadOf(g, id);
    club.wageBudget = Math.round(wageBill(g, id) * 1.12);
    club.tactics = normaliseTactics({ ...club.tactics, formation: bestFormation(club, squad), roles: [] });
    const { lineup, subs } = pickLineup(club, squad);
    club.lineup = lineup;
    club.subs = subs;
  }
}
