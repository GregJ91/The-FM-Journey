// End-of-season awards, CM 01/02-style: in every league a Player and Young Player of the Year, a Team of the Year,
// the Golden Boot (league goals) and the Manager of the Year; across Europe the Ballon d'Or (European Footballer of
// the Year, top three). Your manager awards (these and Manager of the Month) build your reputation.
import { clampConf } from './club';
import { leagueTable } from './competitions';
import { isGuest } from './guests';
import { sendMessage } from './inbox';
import { addRep } from './jobs';
import { age, avgRating, fullName, overall } from './ratings';
import { seasonLabel } from './season';
import type { Award, GameState, League, Player, Pos } from './types';

/** Who's been good this season: average rating, plus a little for goals and assists. */
function form(p: Player) {
  return avgRating(p) + 0.02 * p.stats.goals + 0.012 * p.stats.assists;
}

/** League goals this season, from the league's own fixtures (own goals don't count). */
function leagueGoals(g: GameState, league: League) {
  const goals = new Map<number, number>();
  for (const f of g.fixtures) {
    if (f.comp !== league.id || !f.result) continue;
    for (const gl of f.result.goals) if (!gl.og) goals.set(gl.scorer, (goals.get(gl.scorer) ?? 0) + 1);
  }
  return goals;
}

/** Team of the Year shape (4-4-2) and who can fill each place. */
const TOTY: [string, Pos[]][] = [
  ['GK', ['GK']], ['DR', ['DR']], ['DC', ['DC']], ['DC', ['DC']], ['DL', ['DL']],
  ['MR', ['MR', 'AMR']], ['MC', ['MC', 'DM', 'AMC']], ['MC', ['MC', 'DM', 'AMC']], ['ML', ['ML', 'AML']],
  ['ST', ['ST']], ['ST', ['ST', 'AMC']],
];

function give(g: GameState, a: Award, p?: Player) {
  (g.awards ??= []).push(a);
  if (p) {
    (p.awards ??= []).push(`${a.award} ${seasonLabel(a.season)}`);
    p.morale = Math.min(100, p.morale + 8);
  }
}

/** The awards for one league (call at the end of the season, before stats are archived). Returns the mail text. */
function leagueAwards(g: GameState, league: League): string {
  const table = leagueTable(g, league);
  const games = table[0]?.p ?? 0;
  if (games < 10) return '';
  const clubs = new Set(league.clubIds);
  const minApps = Math.max(8, Math.round(games * 0.5));
  const pool = Object.values(g.players).filter((p) => p.clubId !== null && clubs.has(p.clubId) && p.stats.apps >= minApps);
  if (!pool.length) return '';
  const lines: string[] = [];
  const base = { season: g.season, comp: league.id };
  const who = (p: Player) => `${fullName(p)} (${g.clubs[p.clubId!].name})`;

  const poty = [...pool].sort((a, b) => form(b) - form(a))[0];
  give(g, { ...base, award: 'Player of the Year', playerId: poty.id, name: fullName(poty), clubId: poty.clubId! }, poty);
  lines.push(`Player of the Year: ${who(poty)}, ${avgRating(poty).toFixed(2)} average, ${poty.stats.goals} goals`);

  const ypoty = pool.filter((p) => age(p, g.date) <= 23 && p !== poty).sort((a, b) => form(b) - form(a))[0];
  if (ypoty) {
    give(g, { ...base, award: 'Young Player of the Year', playerId: ypoty.id, name: fullName(ypoty), clubId: ypoty.clubId! }, ypoty);
    lines.push(`Young Player of the Year: ${who(ypoty)}, ${avgRating(ypoty).toFixed(2)} average`);
  }

  // Golden Boot: most league goals (fewer games breaks a tie)
  const goals = leagueGoals(g, league);
  const boot = [...goals.entries()].filter(([id]) => g.players[id]).sort((a, b) => b[1] - a[1] || g.players[a[0]].stats.apps - g.players[b[0]].stats.apps)[0];
  if (boot) {
    const p = g.players[boot[0]];
    const club = p.clubId !== null ? g.clubs[p.clubId] : null;
    give(g, { ...base, award: 'Golden Boot', playerId: p.id, name: fullName(p), clubId: club?.id ?? -1, detail: `${boot[1]} goals` }, p);
    lines.push(`Golden Boot: ${fullName(p)}${club ? ` (${club.name})` : ''}, ${boot[1]} league goals`);
  }

  // Team of the Year: the best in each position (form, not reputation)
  const used = new Set<number>();
  const team: string[] = [];
  for (const [slot, fits] of TOTY) {
    const p = pool.filter((x) => !used.has(x.id) && fits.includes(x.pos)).sort((a, b) => avgRating(b) - avgRating(a))[0];
    if (!p) continue;
    used.add(p.id);
    give(g, { ...base, award: 'Team of the Year', playerId: p.id, name: fullName(p), clubId: p.clubId!, detail: slot }, p);
    team.push(`${slot} ${fullName(p)} (${g.clubs[p.clubId!].short})`);
  }
  if (team.length) lines.push(`Team of the Year: ${team.join(', ')}`);

  // Manager of the Year: the champions' manager, unless someone did something remarkable further down
  const champ = table[0].clubId;
  const me = g.userClubId;
  const mine = champ === me;
  give(g, { ...base, award: 'Manager of the Year', name: mine ? g.manager : `${g.clubs[champ].name} manager`, clubId: champ });
  lines.push(`Manager of the Year: ${mine ? `${g.manager} (${g.clubs[me].name})` : `the ${g.clubs[champ].name} manager`}`);
  if (mine) { addRep(g, 4); g.board.confidence = clampConf(g.board.confidence + 5); }
  return lines.join('\n');
}

/**
 * The Ballon d'Or (European Footballer of the Year): the best players in Europe's top divisions and the European
 * cups, on their season's form, their standing in the game and what they won.
 */
function ballonDor(g: GameState) {
  const topClubs = new Set<number>();
  for (const l of g.leagues) if (l.tier === 1) l.clubIds.forEach((id) => topClubs.add(id));
  for (const c of Object.values(g.clubs)) if (isGuest(c)) topClubs.add(c.id);
  const champions = new Set(g.leagues.filter((l) => l.tier === 1).map((l) => leagueTable(g, l)[0]?.clubId));
  const ucl = g.cups.find((c) => c.id === 'UCL');
  const uel = g.cups.find((c) => c.id === 'UEL');
  const score = (p: Player) => form(p) + overall(p) / 30 + (champions.has(p.clubId!) ? 0.25 : 0)
    + (ucl?.winner === p.clubId ? 0.45 : ucl?.runnerUp === p.clubId ? 0.15 : 0) + (uel?.winner === p.clubId ? 0.15 : 0);
  const pool = Object.values(g.players).filter((p) => p.clubId !== null && topClubs.has(p.clubId) && p.stats.apps >= 20);
  const top = pool.sort((a, b) => score(b) - score(a)).slice(0, 3);
  if (!top.length) return;
  top.forEach((p, i) => give(g, { season: g.season, comp: 'EUR', award: i === 0 ? "Ballon d'Or" : `Ballon d'Or ${i === 1 ? '2nd' : '3rd'}`, playerId: p.id, name: fullName(p), clubId: p.clubId! }, i === 0 ? p : undefined));
  const mine = top.some((p) => p.clubId === g.userClubId);
  sendMessage(g, {
    from: 'France Football', kind: 'award',
    title: `Ballon d'Or ${seasonLabel(g.season)}: ${fullName(top[0])}${mine ? ' 🏅' : ''}`,
    body: `European Footballer of the Year\n\n${top.map((p, i) => `${i + 1}. ${fullName(p)} (${g.clubs[p.clubId!].name}), ${p.stats.goals} goals, ${avgRating(p).toFixed(2)} average`).join('\n')}${mine ? '\n\nA proud day for the club.' : ''}`,
  });
}

/** End of season: every league's awards (yours mailed to you) and the Ballon d'Or. */
export function seasonAwards(g: GameState) {
  const mine = g.leagues.find((l) => l.clubIds.includes(g.userClubId));
  for (const league of g.leagues) {
    const text = leagueAwards(g, league);
    if (league === mine && text) {
      const won = (g.awards ?? []).some((a) => a.season === g.season && a.comp === league.id && a.clubId === g.userClubId);
      sendMessage(g, { from: league.name, kind: 'award', title: `${league.name} awards ${seasonLabel(g.season)}${won ? ' 🏅' : ''}`, body: text + (won ? '\n\nCongratulations to everyone at the club.' : '') });
    }
  }
  ballonDor(g);
}

/** Manager of the Month for you: a little reputation and a happier board. */
export function managerOfTheMonth(g: GameState, league: League, clubId: number, month: string) {
  give(g, { season: g.season, comp: league.id, award: 'Manager of the Month', name: clubId === g.userClubId ? g.manager : `${g.clubs[clubId].name} manager`, clubId, detail: month });
  if (clubId === g.userClubId) { addRep(g, 1); g.board.confidence = clampConf(g.board.confidence + 3); }
}

/** Awards won by a player, newest first (for his profile). */
export function playerAwards(p: Player) {
  return [...(p.awards ?? [])].reverse();
}

