// CM 01/02 careers: the season's curtain-raisers. Last season's champions against the cup winners in England
// (the Community Shield, newly renamed in 2002), Spain (the Supercopa, over two legs), Italy and France, and the
// UEFA Super Cup between the European champions and the UEFA Cup winners in Monaco. One-off ties go to extra time
// and penalties.
import { avoidLeagueClash, leagueTable } from './competitions';
import { addDays, nextWeekday, weekday } from './dates';
import { nextId } from './generate';
import { isGuest } from './guests';
import { sendMessage } from './inbox';
import { winnerOf } from './match';
import { addRep } from './jobs';
import { clampConf } from './club';
import type { Club, Cup, Fixture, GameState } from './types';

interface SuperDef {
  id: string;
  name: string;
  short: string;
  color: string;
  country: string | null; // null: UEFA
  league?: string; // whose champions
  cup?: string; // whose cup winners
  legs: 1 | 2;
  neutral: boolean;
  /** Match date(s) for a season (the first league fixture is known by then). */
  dates: (g: GameState, s: number) => string[];
  real2002: [string, string]; // who actually played in 2002
}

/** The Sunday before the Premiership starts (11 August 2002). */
function shieldDate(g: GameState, s: number) {
  const first = g.fixtures.filter((f) => f.comp === 'ENG1').map((f) => f.date).sort()[0] ?? `${s}-08-17`;
  const d = addDays(first, -6);
  return addDays(d, -weekday(d)); // back to the Sunday
}

const SUPER_CUPS: SuperDef[] = [
  { id: 'ECS', name: 'Community Shield', short: 'CS', color: '#C8102E', country: 'ENG', league: 'ENG1', cup: 'FAC', legs: 1, neutral: true, dates: (g, s) => [shieldDate(g, s)], real2002: ['Arsenal', 'Liverpool'] },
  { id: 'ESC', name: 'Supercopa de España', short: 'SCE', color: '#AA151B', country: 'ESP', league: 'ESP1', cup: 'CDR', legs: 2, neutral: false, dates: (_g, s) => { const d = nextWeekday(`${s}-08-14`, 0); return [d, addDays(d, 7)]; }, real2002: ['Valencia', 'Deportivo'] },
  { id: 'ISC', name: 'Supercoppa Italiana', short: 'SCI', color: '#009246', country: 'ITA', league: 'ITA1', cup: 'CIT', legs: 1, neutral: true, dates: (_g, s) => [nextWeekday(`${s}-08-21`, 0)], real2002: ['Juventus', 'Parma'] },
  { id: 'FTC', name: 'Trophée des Champions', short: 'TDC', color: '#0055A4', country: 'FRA', league: 'FRA1', cup: 'CDF', legs: 1, neutral: false, dates: (_g, s) => [nextWeekday(`${s}-07-24`, 6)], real2002: ['Lyon', 'Lorient'] },
  { id: 'SUC', name: 'UEFA Super Cup', short: 'USC', color: '#0B2D6B', country: null, legs: 1, neutral: true, dates: (_g, s) => [nextWeekday(`${s}-08-27`, 5)], real2002: ['Real Madrid', 'Feyenoord'] },
];

/** Can this club play? (In a league, or a European guest club for the UEFA Super Cup.) */
function plays(g: GameState, c: Club | undefined, uefa: boolean) {
  return !!c && (g.leagues.some((l) => l.clubIds.includes(c.id)) || (uefa && isGuest(c)));
}

/**
 * End of season: who meets in next season's super cups. If one club won both, England brings in the league
 * runners-up; elsewhere the beaten cup finalists play.
 */
export function computeSuperEntrants(g: GameState): Record<string, [number, number]> {
  const out: Record<string, [number, number]> = {};
  for (const d of SUPER_CUPS) {
    let pair: [number | null, number | null];
    if (d.country === null) {
      pair = [g.cups.find((c) => c.id === 'UCL')?.winner ?? null, g.cups.find((c) => c.id === 'UEL')?.winner ?? null];
    } else {
      const league = g.leagues.find((l) => l.id === d.league);
      const cup = g.cups.find((c) => c.id === d.cup);
      if (!league || !cup) continue;
      const table = leagueTable(g, league);
      const champ = table[0]?.clubId ?? null;
      const double = cup.winner === champ;
      pair = [champ, double ? (d.country === 'ENG' ? table[1]?.clubId ?? null : cup.runnerUp) : cup.winner];
    }
    if (pair[0] !== null && pair[1] !== null && pair[0] !== pair[1]) out[d.id] = [pair[0], pair[1]];
  }
  return out;
}

/** The real 2002 line-ups (anyone missing from the game is replaced by the next best club in that league). */
function initialEntrants(g: GameState): Record<string, [number, number]> {
  const byName = new Map(Object.values(g.clubs).map((c) => [c.name, c]));
  const out: Record<string, [number, number]> = {};
  for (const d of SUPER_CUPS) {
    const uefa = d.country === null;
    const pick: number[] = [];
    for (const n of d.real2002) {
      const c = byName.get(n);
      if (plays(g, c, uefa)) pick.push(c!.id);
    }
    const league = g.leagues.find((l) => l.id === d.league);
    const fill = league ? [...league.clubIds].sort((a, b) => g.clubs[b].reputation - g.clubs[a].reputation) : [];
    for (const id of fill) { if (pick.length >= 2) break; if (!pick.includes(id)) pick.push(id); }
    if (pick.length === 2) out[d.id] = [pick[0], pick[1]];
  }
  return out;
}

/** Start of season (CM careers): set up and schedule this summer's super cups. */
export function setupSuperCups(g: GameState) {
  if (!g.era) return;
  const entrants = g.superNext ?? (g.history.length ? {} : initialEntrants(g));
  g.superNext = undefined;
  for (const d of SUPER_CUPS) {
    let cup = g.cups.find((c) => c.id === d.id);
    if (!cup) {
      cup = { id: d.id, name: d.name, short: d.short, type: 'domestic', country: d.country, color: d.color, alive: [], rounds: [], current: 0, winner: null, runnerUp: null, super: true };
      g.cups.push(cup);
    }
    cup.winner = null;
    cup.runnerUp = null;
    cup.current = 0;
    const pair = entrants[d.id];
    if (!pair || pair.some((id) => !g.clubs[id])) { cup.alive = []; cup.rounds = []; continue; }
    cup.alive = [...pair];
    const dates = d.dates(g, g.season);
    cup.rounds = dates.map((date, i) => ({ name: d.legs === 2 ? (i ? '2nd leg' : '1st leg') : 'Final', date }));
    let first: Fixture | undefined;
    dates.forEach((date, i) => {
      const leg2 = d.legs === 2 && i === 1;
      const f: Fixture = {
        id: nextId(g), comp: d.id, date, round: i + 1, roundName: cup!.rounds[i].name,
        home: leg2 ? pair[1] : pair[0], away: leg2 ? pair[0] : pair[1], result: null,
        knockout: d.legs === 1 || leg2, neutral: d.neutral,
        ...(d.legs === 2 ? { leg: (i + 1) as 1 | 2 } : {}),
        ...(leg2 && first ? { firstLeg: first.id } : {}),
      };
      if (i === 0) first = f;
      g.fixtures.push(f);
      avoidLeagueClash(g, f);
    });
    const me = g.userClubId;
    if (pair.includes(me)) {
      const opp = g.clubs[pair[0] === me ? pair[1] : pair[0]];
      sendMessage(g, { from: 'The Board', kind: 'board', title: `${d.name} v ${opp.name}`, body: `We open the season in the ${d.name} against ${opp.name} on ${dates[0]}${d.legs === 2 ? ` (second leg ${dates[1]})` : d.neutral ? ', at a neutral ground' : ''}. Silverware is silverware: the board would like it in the cabinet.` });
    }
  }
}

/** After the day's games: a super cup whose tie is complete has a winner. */
export function superCupsDone(g: GameState) {
  for (const cup of g.cups) {
    if (!cup.super || cup.winner !== null || cup.alive.length !== 2) continue;
    const fx = g.fixtures.filter((f) => f.comp === cup.id).sort((a, b) => (a.date < b.date ? -1 : 1));
    if (!fx.length || fx.some((f) => !f.result)) continue;
    const w = winnerOf(fx[fx.length - 1]);
    if (w === null) continue;
    cup.winner = w;
    cup.runnerUp = cup.alive.find((id) => id !== w) ?? null;
    cup.current = cup.rounds.length;
    const club = g.clubs[w];
    club.trophies.push({ season: g.season, name: cup.name });
    const me = g.userClubId;
    if (w === me) {
      g.board.confidence = clampConf(g.board.confidence + 4);
      addRep(g, 1);
      sendMessage(g, { from: 'The Board', kind: 'season', title: `🏆 ${cup.name} winners!`, body: `${club.name} have won the ${cup.name}, beating ${g.clubs[cup.runnerUp!].name}. A fine start to the season.` });
    } else if (cup.runnerUp === me) {
      sendMessage(g, { from: 'Media', kind: 'match', title: `${cup.name} lost`, body: `${club.name} take the ${cup.name} after beating ${g.clubs[me].name}.` });
    }
  }
}

export function isSuperCup(cup: Cup) {
  return !!cup.super;
}
