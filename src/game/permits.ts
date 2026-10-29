// CM 01/02 careers: the rules on foreign players in 2002.
// - English and Scottish clubs need a work permit for players from outside the EU/EEA. It was granted to established
//   internationals; players with a handful of caps went to appeal; others were refused. Players already playing in
//   Britain have one.
// - Spanish clubs could register three non-EU players, Italian clubs five.
import { hash } from './rng';
import { fullName } from './ratings';
import type { Club, GameState, Player } from './types';

/** EU members in 2002 plus the EEA and Switzerland (free movement). */
const EU = new Set(['ENG', 'SCO', 'WAL', 'NIR', 'IRL', 'FRA', 'GER', 'ITA', 'ESP', 'POR', 'NED', 'BEL', 'LUX', 'DEN', 'SWE', 'FIN', 'AUT', 'GRE', 'NOR', 'ISL', 'LIE', 'SUI']);
const PERMIT_COUNTRIES = new Set(['ENG', 'SCO']);
const NON_EU_LIMIT: Record<string, number> = { ESP: 3, ITA: 5 };

export function isEu(p: Player) {
  return EU.has(p.nat);
}

function nonEuAt(g: GameState, clubId: number, except: number) {
  let n = 0;
  for (const q of Object.values(g.players)) if (q.clubId === clubId && q.squad !== 'youth' && q.id !== except && !EU.has(q.nat)) n++;
  return n;
}

/** Can `club` sign `p` under the 2002 rules? (Modern careers have no such rules here.) */
export function permitCheck(g: GameState, p: Player, club: Club, nonEuCount?: number): { ok: boolean; msg: string } {
  if (g.era !== 'cm0102' || isEu(p)) return { ok: true, msg: '' };
  const limit = NON_EU_LIMIT[club.country];
  if (limit !== undefined) {
    const n = nonEuCount ?? nonEuAt(g, club.id, p.id);
    if (n >= limit) return { ok: false, msg: `${club.name} already have ${n} non-EU players (the limit in ${club.country === 'ESP' ? 'Spain' : 'Italy'} is ${limit}).` };
    return { ok: true, msg: '' };
  }
  if (!PERMIT_COUNTRIES.has(club.country)) return { ok: true, msg: '' };
  // Already playing in Britain: he has a permit
  const cur = p.clubId !== null ? g.clubs[p.clubId] : null;
  if (cur && PERMIT_COUNTRIES.has(cur.country)) return { ok: true, msg: '' };
  const caps = p.caps ?? 0;
  if (caps >= 8) return { ok: true, msg: '' };
  // A few caps: the appeal panel decides (fixed per player and season, so asking again doesn't change it)
  if (caps >= 3 && hash(p.id * 7 + g.season) < 0.55) return { ok: true, msg: '' };
  return { ok: false, msg: `${fullName(p)} would not get a work permit: as a non-EU player he needs to be an established international (${caps} cap${caps === 1 ? '' : 's'}).` };
}

/** Plain-language note for the player's profile when a permit or quota matters. */
export function permitNote(g: GameState, p: Player, club: Club) {
  if (g.era !== 'cm0102' || isEu(p) || p.clubId === club.id) return '';
  const r = permitCheck(g, p, club);
  if (!r.ok) return r.msg;
  if (PERMIT_COUNTRIES.has(club.country)) return 'Non-EU player: a work permit would be granted.';
  if (NON_EU_LIMIT[club.country] !== undefined) return `Non-EU player: counts towards the limit of ${NON_EU_LIMIT[club.country]}.`;
  return '';
}
