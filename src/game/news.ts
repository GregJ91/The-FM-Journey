// FM-style inbox: match previews and reports, weekly training reports, league round-ups,
// monthly awards, and scripted breaking news. Routine reports are "quiet" so they don't stop Continue.
import { compName, leagueTable } from './competitions';
import { addDays, diffDays, month, monthName } from './dates';
import { START_SEASON, leagueOf, squadOf } from './generate';
import { managerOfTheMonth } from './awards';
import { sendMessage } from './inbox';
import { age, fullName, overall, shortName } from './ratings';
import { normal } from './rng';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
import type { Fixture, GameState, Player } from './types';

function nth(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function clubByName(g: GameState, name: string) {
  return Object.values(g.clubs).find((c) => c.name === name);
}

function fired(g: GameState, id: string) {
  return (g.events ?? []).includes(id);
}

function fire(g: GameState, id: string) {
  g.events = [...(g.events ?? []), id];
}

// ---------- Scripted events ----------

/** 2026/27: with five league games left, Manchester City are docked 60 points for breaching financial rules. */
function cityFfp(g: GameState) {
  const id = 'city-ffp-2026';
  if (g.season !== START_SEASON || fired(g, id)) return;
  const city = clubByName(g, 'Manchester City');
  if (!city) return;
  const league = g.leagues.find((l) => l.clubIds.includes(city.id) && l.tier === 1);
  if (!league) return;
  const games = g.fixtures.filter((f) => f.comp === league.id && (f.home === city.id || f.away === city.id));
  const left = games.filter((f) => !f.result).length;
  if (left !== 5) return;
  fire(g, id);
  const before = leagueTable(g, league);
  const posBefore = before.findIndex((r) => r.clubId === city.id) + 1;
  const ptsBefore = before[posBefore - 1].pts;
  (g.deductions ??= []).push({ clubId: city.id, leagueId: league.id, season: g.season, pts: 60, reason: 'Breaches of financial regulations (FFP / PSR)' });
  const after = leagueTable(g, league);
  const posAfter = after.findIndex((r) => r.clubId === city.id) + 1;
  const safety = after[after.length - league.down - 1];
  const gap = safety ? safety.pts - after[posAfter - 1].pts : 0;
  const isUser = city.id === g.userClubId;
  sendMessage(g, {
    from: 'Sky Sports News', kind: 'news',
    title: '🚨 BREAKING: Manchester City docked 60 points',
    body:
      `Manchester City have been deducted 60 points with immediate effect after an independent commission found the club guilty of breaching the Premier League's financial rules.\n\n` +
      `City drop from ${nth(posBefore)} (${ptsBefore} pts) to ${nth(posAfter)} (${ptsBefore - 60} pts) with five games of the season left.` +
      (gap > 0 ? ` They are now ${gap} points from safety, with only 15 left to play for, so relegation looks almost certain.` : ` They still sit above the relegation zone, but only just.`) +
      `\n\nThe ruling is the biggest punishment in the league's history. A club statement said City were "extremely disappointed" and "considering all options", but the deduction stands for this season.\n\n` +
      `Across the league, clubs chasing Europe and fighting relegation have all had their targets changed overnight.` +
      (isUser ? `\n\nThe board have asked for calm. Nobody holds you responsible, but survival is now the only target.` : ''),
  });
  if (isUser) g.board.confidence = Math.max(g.board.confidence, 50);
}

export function scriptedEvents(g: GameState) {
  cityFfp(g);
}

// ---------- Match preview and report ----------

function lastResults(g: GameState, clubId: number, n = 5) {
  return g.fixtures
    .filter((f) => f.result && (f.home === clubId || f.away === clubId))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .slice(-n)
    .map((f) => {
      const r = f.result!;
      const us = f.home === clubId ? r.hg : r.ag;
      const them = f.home === clubId ? r.ag : r.hg;
      if (us !== them) return us > them ? 'W' : 'L';
      if (r.pens) return (f.home === clubId ? r.pens[0] > r.pens[1] : r.pens[1] > r.pens[0]) ? 'W' : 'L';
      return 'D';
    });
}

function bestXiAvg(g: GameState, clubId: number) {
  const s = squadOf(g, clubId).map(overall).sort((a, b) => b - a).slice(0, 11);
  return s.reduce((a, b) => a + b, 0) / Math.max(1, s.length);
}

function unavailable(p: Player) {
  return p.injury ? `injured (${p.injury.name.toLowerCase()}, ~${Math.ceil(p.injury.days / 7)}w)` : p.suspended > 0 ? 'suspended' : p.away ? `away at the ${p.away}` : null;
}

/** On match day: a preview of today's opponent from the assistant manager. */
export function matchPreview(g: GameState) {
  const me = g.userClubId;
  const f = g.fixtures.find((x) => x.date === g.date && !x.result && (x.home === me || x.away === me));
  if (!f) return;
  const oppId = f.home === me ? f.away : f.home;
  const opp = g.clubs[oppId];
  const league = g.leagues.find((l) => l.clubIds.includes(oppId));
  const oppPos = league ? leagueTable(g, league).findIndex((r) => r.clubId === oppId) + 1 : 0;
  const oppSquad = squadOf(g, oppId);
  const star = [...oppSquad].sort((a, b) => overall(b) - overall(a))[0];
  const scorer = [...oppSquad].sort((a, b) => b.stats.goals - a.stats.goals)[0];
  const outOpp = oppSquad.filter((p) => unavailable(p) && overall(p) >= bestXiAvg(g, oppId) - 4);
  const outUs = squadOf(g, me).map((p) => ({ p, why: unavailable(p) })).filter((x) => x.why);
  const diff = bestXiAvg(g, me) - bestXiAvg(g, oppId) + (f.home === me ? 1.5 : -1.5);
  const verdict = diff > 5 ? `We should be strong favourites. Anything but a win would be a disappointment.`
    : diff > 1.5 ? `We're favourites, but they can hurt us if we're careless.`
    : diff > -1.5 ? `This one's finely balanced. Small details will decide it.`
    : diff > -5 ? `They're slight favourites. A point wouldn't be a bad result.`
    : `We're big underdogs. Stay compact, frustrate them and look for a moment on the break.`;
  const form = lastResults(g, oppId);
  sendMessage(g, {
    from: 'Assistant Manager', kind: 'preview', quiet: true,
    title: `Match preview: ${g.clubs[f.home].short} v ${g.clubs[f.away].short}`,
    body:
      `${compName(g, f.comp)}${f.roundName ? ` · ${f.roundName}` : ''} · ${f.neutral ? 'neutral venue' : g.clubs[f.home].stadium}\n\n` +
      `OPPOSITION: ${opp.name}${oppPos ? ` (${nth(oppPos)} in the ${league!.name})` : ''}\n` +
      `Form: ${form.length ? form.join(' ') : 'no games yet'}\n` +
      `Usual shape: ${opp.tactics.formation}\n` +
      (star ? `Danger man: ${fullName(star)} (${star.pos}${g.era ? '' : `, ${overall(star)}`})\n` : '') +
      (scorer && scorer.stats.goals > 0 ? `Top scorer: ${fullName(scorer)}, ${scorer.stats.goals} goals\n` : '') +
      (outOpp.length ? `Missing for them: ${outOpp.map((p) => shortName(p)).join(', ')}\n` : '') +
      `\nOUR TEAM NEWS\n` +
      (outUs.length ? outUs.map((x) => `• ${fullName(x.p)}: ${x.why}`).join('\n') : '• Everyone is available.') +
      `\n\nASSISTANT'S VIEW\n${verdict}`,
  });
}

/** After the manager's match: a full report. */
export function matchReport(g: GameState, f: Fixture) {
  const me = g.userClubId;
  const r = f.result;
  if (!r) return;
  const side = f.home === me ? 0 : 1;
  const us = side === 0 ? r.hg : r.ag;
  const them = side === 0 ? r.ag : r.hg;
  const won = us > them || (r.pens && r.pens[side] > r.pens[1 - side]);
  const lost = us < them || (r.pens && r.pens[side] < r.pens[1 - side]);
  const home = g.clubs[f.home];
  const away = g.clubs[f.away];
  const goals = r.goals.map((x) => {
    const p = g.players[x.scorer];
    return `${x.minute}' ${p ? shortName(p) : 'Unknown'}${x.pen ? ' (pen)' : ''}${x.og ? ' (og)' : ''} — ${x.team === 0 ? home.short : away.short}`;
  });
  const ratings = Object.entries(r.ratings ?? {})
    .map(([id, rt]) => ({ p: g.players[Number(id)], rt }))
    .filter((x) => x.p && x.p.clubId === me)
    .sort((a, b) => b.rt - a.rt);
  const s = r.stats;
  const motm = r.motm !== undefined ? g.players[r.motm] : undefined;
  const league = g.leagues.find((l) => l.id === f.comp);
  const pos = league ? leagueTable(g, league).findIndex((x) => x.clubId === me) + 1 : 0;
  const comment = won ? (us - them >= 3 ? 'A statement performance. The players were outstanding from first minute to last.' : 'A good win. That\'s the standard we need to keep.')
    : lost ? (them - us >= 3 ? 'That was unacceptable. We need a response in training this week.' : 'Disappointing. We did enough in spells, but the details let us down.')
    : 'A point. We\'ll take the positives and go again.';
  sendMessage(g, {
    from: 'Assistant Manager', kind: 'report', quiet: true,
    title: `Match report: ${home.short} ${r.hg}-${r.ag} ${away.short}${r.pens ? ` (${r.pens[0]}-${r.pens[1]} pens)` : ''}`,
    body:
      `${compName(g, f.comp)}${f.roundName ? ` · ${f.roundName}` : ''}\n${home.name} ${r.hg} - ${r.ag} ${away.name}${r.agg ? ` (aggregate ${r.agg[0]}-${r.agg[1]})` : ''}\n\n` +
      (goals.length ? `GOALS\n${goals.join('\n')}\n\n` : 'No goals.\n\n') +
      (s ? `STATS (${home.short} v ${away.short})\nPossession ${Math.round((s.poss[0] / Math.max(1, s.poss[0] + s.poss[1])) * 100)}% - ${100 - Math.round((s.poss[0] / Math.max(1, s.poss[0] + s.poss[1])) * 100)}%\nShots ${s.shots[0]} - ${s.shots[1]} (on target ${s.onTarget[0]} - ${s.onTarget[1]})\nxG ${s.xg[0].toFixed(2)} - ${s.xg[1].toFixed(2)}\nCorners ${s.corners[0]} - ${s.corners[1]}\n\n` : '') +
      (motm ? `Player of the match: ${fullName(motm)} (${g.clubs[motm.clubId ?? -1]?.short ?? ''})\n\n` : '') +
      (ratings.length ? `OUR RATINGS\nBest: ${ratings.slice(0, 3).map((x) => `${shortName(x.p)} ${x.rt.toFixed(1)}`).join(', ')}\nWorst: ${ratings.slice(-2).reverse().map((x) => `${shortName(x.p)} ${x.rt.toFixed(1)}`).join(', ')}\n\n` : '') +
      (pos ? `League position: ${nth(pos)}\n\n` : '') +
      `ASSISTANT'S VIEW\n${comment}`,
  });
}

// ---------- Weekly ----------

/** Monday: training report for the first team and academy. */
export function trainingReport(g: GameState) {
  if (month(g.date) === 6) return; // off-season
  const me = g.userClubId;
  const intensity = g.training.intensity;
  const first = squadOf(g, me);
  const youth = squadOf(g, me, 'youth');
  const bonus = intensity === 'high' ? 0.15 : intensity === 'low' ? -0.1 : 0;
  const perf = (p: Player) => clamp(6.5 + (p.morale - 65) / 35 + (p.attrs.workRate - 10) / 14 + bonus + normal(0, 0.45), 5, 9.6);
  const rated = first.filter((p) => !p.injury && !p.away).map((p) => ({ p, r: perf(p) })).sort((a, b) => b.r - a.r);
  // Good weeks lift morale a little; poor ones dent it
  for (const x of rated.slice(0, 3)) x.p.morale = Math.min(100, x.p.morale + 2);
  for (const x of rated.slice(-2)) x.p.morale = Math.max(5, x.p.morale - 1);
  const yRated = youth.filter((p) => !p.injury).map((p) => ({ p, r: perf(p) })).sort((a, b) => b.r - a.r);
  const injured = first.filter((p) => p.injury);
  const tired = first.filter((p) => !p.injury && p.condition < 75);
  const unhappy = first.filter((p) => p.morale < 40);
  const ready = youth.filter((p) => age(p, g.date) <= 20 && p.pa >= 75 && overall(p) >= bestXiAvg(g, me) - 14).sort((a, b) => b.pa - a.pa).slice(0, 2);
  sendMessage(g, {
    from: 'First-Team Coach', kind: 'training', quiet: true,
    title: `Weekly training report`,
    body:
      `Intensity: ${intensity[0].toUpperCase() + intensity.slice(1)} · First-team focus: ${g.training.firstFocus} · Youth focus: ${g.training.youthFocus}\n\n` +
      `STAND-OUT TRAINERS\n${rated.slice(0, 3).map((x) => `• ${fullName(x.p)} ${x.r.toFixed(1)}`).join('\n') || '• —'}\n\n` +
      `POOR WEEK\n${rated.slice(-2).reverse().map((x) => `• ${fullName(x.p)} ${x.r.toFixed(1)}`).join('\n') || '• —'}\n\n` +
      (yRated.length ? `ACADEMY\nBest in the youth group: ${fullName(yRated[0].p)} (${yRated[0].r.toFixed(1)})\n` : '') +
      (ready.length ? `Pushing for a first-team chance: ${ready.map((p) => (g.era ? fullName(p) : `${fullName(p)} (${overall(p)}, pot ${p.pa})`)).join(', ')}\n` : '') +
      `\nMEDICAL\n` +
      (injured.length ? injured.map((p) => `• ${fullName(p)}: ${p.injury!.name.toLowerCase()}, ~${p.injury!.days} days`).join('\n') : '• No injuries.') +
      (tired.length ? `\nNeed a rest: ${tired.map((p) => `${shortName(p)} (${Math.round(p.condition)}%)`).join(', ')}` : '') +
      (unhappy.length ? `\n\nMORALE\nUnhappy: ${unhappy.map((p) => shortName(p)).join(', ')}. A chat might help.` : '') +
      (intensity === 'high' ? `\n\nHigh intensity is sharpening the squad, but the injury risk is up.` : ''),
  });
}

/** Monday: results and table from the manager's league over the weekend. */
export function leagueRoundup(g: GameState) {
  const me = g.userClubId;
  const league = leagueOf(g, me);
  if (!league) return;
  const recent = g.fixtures.filter((f) => f.comp === league.id && f.result && diffDays(g.date, f.date) >= 1 && diffDays(g.date, f.date) <= 3);
  if (!recent.length) return;
  const table = leagueTable(g, league);
  const myPos = table.findIndex((r) => r.clubId === me);
  const biggest = [...recent].sort((a, b) => Math.abs(b.result!.hg - b.result!.ag) - Math.abs(a.result!.hg - a.result!.ag))[0];
  sendMessage(g, {
    from: 'Media', kind: 'news', quiet: true,
    title: `${league.name} round-up`,
    body:
      `RESULTS\n${recent.map((f) => `${g.clubs[f.home].short} ${f.result!.hg}-${f.result!.ag} ${g.clubs[f.away].short}`).join('\n')}\n\n` +
      `Biggest win: ${g.clubs[biggest.result!.hg >= biggest.result!.ag ? biggest.home : biggest.away].name} (${biggest.result!.hg}-${biggest.result!.ag})\n\n` +
      `TOP OF THE TABLE\n${table.slice(0, 4).map((r, i) => `${i + 1}. ${g.clubs[r.clubId].name} ${r.pts}${r.ded ? ` (−${r.ded})` : ''}`).join('\n')}` +
      (myPos >= 4 ? `\n…\n${myPos + 1}. ${g.clubs[me].name} ${table[myPos].pts}` : ''),
  });
}

// ---------- Monthly ----------

/** 1st of the month: Player, Young Player and Manager of the Month in the manager's league. Call before monthly development resets the month's ratings. */
export function monthlyAwards(g: GameState) {
  const m = month(g.date);
  if (m === 7 || m === 8) return; // nothing played the previous month
  const me = g.userClubId;
  const league = leagueOf(g, me);
  if (!league) return;
  const clubs = new Set(league.clubIds);
  const prev = addDays(g.date, -1);
  const players = Object.values(g.players).filter((p) => p.clubId !== null && clubs.has(p.clubId) && p.monthRatings.length >= 3);
  if (!players.length) return;
  const score = (p: Player) => p.monthRatings.reduce((a, b) => a + b, 0) / p.monthRatings.length;
  const potm = [...players].sort((a, b) => score(b) - score(a))[0];
  const young = players.filter((p) => age(p, g.date) <= 21).sort((a, b) => score(b) - score(a))[0];
  // Manager of the month: most league points from last month's games
  const pts: Record<number, number> = {};
  for (const f of g.fixtures) {
    if (f.comp !== league.id || !f.result || f.date.slice(0, 7) !== prev.slice(0, 7)) continue;
    const r = f.result;
    pts[f.home] = (pts[f.home] ?? 0) + (r.hg > r.ag ? 3 : r.hg === r.ag ? 1 : 0);
    pts[f.away] = (pts[f.away] ?? 0) + (r.ag > r.hg ? 3 : r.hg === r.ag ? 1 : 0);
  }
  const mom = Object.entries(pts).sort((a, b) => b[1] - a[1])[0];
  if (mom) managerOfTheMonth(g, league, Number(mom[0]), monthName(month(prev)));
  const winners = [potm, young].filter(Boolean).map((p) => p.clubId);
  const mine = winners.includes(me) || (mom && Number(mom[0]) === me);
  for (const p of [potm, young]) if (p) p.morale = Math.min(100, p.morale + 5);
  sendMessage(g, {
    from: league.name, kind: 'award', quiet: !mine,
    title: `${league.name} awards: ${monthName(month(prev))}${mine ? ' 🏅' : ''}`,
    body:
      `Player of the Month: ${fullName(potm)} (${g.clubs[potm.clubId!].name}), average rating ${score(potm).toFixed(2)}\n` +
      (young ? `Young Player of the Month: ${fullName(young)} (${g.clubs[young.clubId!].name}), ${score(young).toFixed(2)}\n` : '') +
      (mom ? `Manager of the Month: ${Number(mom[0]) === me ? `you, ${g.manager} (${g.clubs[me].name})` : `the ${g.clubs[Number(mom[0])].name} manager`}, ${mom[1]} points\n` : '') +
      (mine ? `\nCongratulations. The award has gone down well around the club.` : ''),
  });
}
