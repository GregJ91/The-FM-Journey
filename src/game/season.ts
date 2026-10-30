import { boardMonthly, checkFacilityUpgrade, clampConf, monthlyFinances, prizeMoney, recordLedger, setBoardObjective, setSeasonBudgets, weeklyWages } from './club';
import { FRIENDLY, compName, ensureLeagueCups, leagueTable, progressCup, scheduleFriendlies, scheduleLeague, setupCups } from './competitions';
import { tickEurope2002 } from './europe2002';
import { computeEntrants, ensureEurope, europeFor, initialEntrants, progressEurope, setupEurope } from './europe';
import { guestLevel, isGuest, isTransferOnly } from './guests';
import { intlDay } from './intl';
import { setupYouth, youthDay } from './youth';
import { assignAllShirtNumbers, assignShirtNumbers, playersByClub } from './shirts';
import { contractTalks, openActions, pressConference, registrationDeadlines, resetRegistration, unhappyPlayers } from './actions';
import { leagueRoundup, matchPreview, matchReport, monthlyAwards, scriptedEvents, trainingReport } from './news';
import { CWC_ID, progressClubWorldCup, setupClubWorldCup } from './world';
import { addDays, dayOfMonth, diffDays, fmtDate, month, weekday } from './dates';
import { LEAGUE_DEFS } from './data/leagues';
import { cheatOn } from './cheats';
import { START_SEASON, emptyStats, fillSquad, generatePlayer, generateYouth, leagueOf, squadOf } from './generate';
import { sendMessage, unreadImportant } from './inbox';
import { applyResult, createMatch, randomInjury, simulateFixture, simulateToEnd, withSquadCache } from './match';
import { monthlyDevelopment } from './progression';
import { monthlyManager } from './manager';
import { journeyDaily, journeyMonthly } from './journey';
import { addRep, jobsDaily, jobsMonthly } from './jobs';
import { age, fmtMoney, fullName, overall, wageFor } from './ratings';
import { chance, int, normal, pick } from './rng';
import { aiBidsForUser, aiLoanOffersForUser, aiLoans, aiPreContracts, aiTransfers, completeTransfer, endLoan, expireOffers, respondToContracts, respondToLoanOffers, respondToUserBids, relegationReleases, releaseClauseBids } from './transfers';
import { matchdayIncome } from './club';
import { bestFormation } from './selection';
import { normaliseTactics } from './tactics';
import type { Cup, Fixture, GameState, Player, SeasonHistory } from './types';

export function seasonLabel(season: number) {
  return `${season}/${String(season + 1).slice(2)}`;
}

export function startSeason(g: GameState) {
  // Keep this summer's Club World Cup results; everything else starts afresh
  g.fixtures = g.fixtures.filter((f) => f.comp === CWC_ID && diffDays(g.date, f.date) < 60);
  for (const league of g.leagues) scheduleLeague(g, league);
  assignAllShirtNumbers(g); // new signings, regens and youth graduates
  ensureEurope(g);
  resetRegistration(g);
  ensureLeagueCups(g);
  setupCups(g);
  // First season: the real line-ups (2026/27, or 2002/03 in CM 01/02 careers)
  setupEurope(g, g.europe ?? (g.season === START_SEASON || (g.era && !g.history.length) ? initialEntrants(g) : computeEntrants(g)));
  g.europe = undefined;
  setupYouth(g);
  const friendlies = scheduleFriendlies(g);
  setSeasonBudgets(g);
  setBoardObjective(g);
  const byClub = playersByClub(g);
  // A brand-new world already picked every club's formation
  const fresh = !!g.worldStart && g.date === g.worldStart && !g.history.length;
  for (const c of Object.values(g.clubs)) {
    if (fresh || c.isUser || isTransferOnly(c)) continue; // transfer-only clubs never play
    c.tactics = normaliseTactics({ ...c.tactics, formation: bestFormation(c, (byClub.get(c.id) ?? []).filter((p) => p.squad === 'first')), roles: [] });
  }
  for (const p of Object.values(g.players)) {
    p.stats = emptyStats();
    p.yellowAcc = 0;
    p.suspended = 0;
  }
  const club = g.clubs[g.userClubId];
  const league = leagueOf(g, club.id);
  const euro = europeFor(g, club.id).map((c) => c.name);
  sendMessage(g, {
    from: 'The Board',
    kind: 'board',
    title: `Welcome to the ${seasonLabel(g.season)} season`,
    body: `The board expects: ${g.board.objective}.\n\nCompetitions: ${league.name}, ${compName(g, g.cups.find((c) => c.country === club.country)!.id)}${euro.length ? `, ${euro.join(', ')}` : ''}.\nTransfer budget: ${fmtMoney(club.transferBudget)}. Wage budget: ${fmtMoney(club.wageBudget)}/week.\n\nThe summer transfer window is open until 31 August.`,
  });
  if (friendlies.length) {
    sendMessage(g, {
      from: 'Assistant Manager',
      kind: 'news',
      title: 'Pre-season friendlies arranged',
      body: `I've arranged these friendlies to get the players fit for the new season:\n\n${friendlies.map((f) => `${fmtDate(f.date)}: ${f.home === club.id ? `${g.clubs[f.away].name} (home)` : `${g.clubs[f.home].name} (away)`}`).join('\n')}\n\nThey don't count for anything: no stats, cards or suspensions, just match fitness. A good chance to give the fringe players and youngsters a run-out.`,
    });
  }
  // A brand-new CM 01/02 career: a short guide to how things work
  if (g.era && fresh) {
    sendMessage(g, {
      from: 'Assistant Manager',
      kind: 'info',
      title: 'Getting started',
      body: [
        `Welcome to ${club.name}, boss. A few pointers to get you going:`,
        '• Continue moves on a day at a time. It stops when there\'s a match or something needs your answer.',
        '• Mails marked TO DO need a decision from you: bids, contract talks and questions from the board. The "To do" filter in the inbox lists them all.',
        '• Squad: pick your team and tactics. The dropdown at the top switches to the reserves and the youth team.',
        '• Transfers: search for players, then open one and use the Bid tab. It tells you straight away if he can\'t join you and why.',
        '• Abilities are hidden, as in CM. The scout report on each player tells you how good he is, how he\'d fit in and how good he could become.',
        '• Non-EU players need a work permit to play in Britain, which only established internationals get.',
        '• From January you can agree pre-contracts with players whose deals end in the summer, and sign them on a free.',
      ].join('\n\n'),
    });
  }
}

export function userFixtureOn(g: GameState, date: string): Fixture | undefined {
  return g.fixtures.find((f) => f.date === date && (f.home === g.userClubId || f.away === g.userClubId));
}

/** Make sure the manager's players all have squad numbers (e.g. after promoting a youngster). */
export function numberUserSquad(g: GameState) {
  assignShirtNumbers(g, g.userClubId);
}

export function pendingUserFixture(g: GameState) {
  const f = userFixtureOn(g, g.date);
  return f && !f.result ? f : undefined;
}

/** Simulate every unplayed fixture today (except the user's, which must be played interactively). */
export function playDayFixtures(g: GameState) {
  const today = g.fixtures.filter((f) => f.date === g.date && !f.result);
  withSquadCache(g, () => {
    for (const f of today) {
      if (f.home === g.userClubId || f.away === g.userClubId) continue;
      simulateFixture(g, f);
      postFixture(g, f);
    }
  });
  // CM 01/02: European competitions in their 2002/03 formats run themselves (draws wait for the competitions feeding them)
  if (g.era) for (const cup of tickEurope2002(g)) cupWon(g, cup, g.fixtures.some((f) => f.comp === cup.id && f.knockout && f.neutral && (f.home === g.userClubId || f.away === g.userClubId)));
  for (const cup of g.cups) {
    if (cup.winner || cup.format === '2002') continue;
    const before = cup.current;
    const round = g.fixtures.filter((f) => f.comp === cup.id && f.round === cup.current + 1);
    if (cup.lp !== undefined || cup.type === 'world') {
      // European competitions and the Club World Cup send their own draw / elimination news
      const progress = cup.type === 'world' ? progressClubWorldCup : progressEurope;
      if (round.length && round.every((f) => f.result) && progress(g, cup) && cup.winner !== null) cupWon(g, cup, round.some((f) => f.home === g.userClubId || f.away === g.userClubId));
      continue;
    }
    if (round.length && round.every((f) => f.result) && round[0].date <= g.date) {
      progressCup(g, cup);
      const club = g.clubs[g.userClubId];
      const userWasIn = round.some((f) => f.home === club.id || f.away === club.id);
      if (cup.winner !== null) {
        cupWon(g, cup, userWasIn);
      } else if (cup.current > before && userWasIn) {
        if (cup.alive.includes(club.id)) {
          const next = g.fixtures.find((f) => f.comp === cup.id && f.round === cup.current + 1 && (f.home === club.id || f.away === club.id));
          const opp = next ? g.clubs[next.home === club.id ? next.away : next.home] : null;
          sendMessage(g, { from: 'Media', kind: 'match', title: `${cup.name}: ${cup.rounds[cup.current]?.name ?? 'next round'} draw`, body: opp ? `${club.name} will face ${opp.name}${next!.home === club.id ? ' at home' : ' away'} on ${next!.date}.` : `${club.name} have a bye into the next round.` });
        } else {
          sendMessage(g, { from: 'Media', kind: 'match', title: `Knocked out of the ${cup.name}`, body: `${club.name}'s ${cup.name} run is over.` });
        }
      }
    }
  }
}

function cupWon(g: GameState, cup: Cup, userWasIn: boolean) {
  const club = g.clubs[g.userClubId];
  const w = g.clubs[cup.winner!];
  w.trophies.push({ season: g.season, name: cup.name });
  // Played in June after the season review: add it to that season's honours
  if (cup.type === 'world') g.history[g.history.length - 1]?.winners.push({ comp: `${cup.name} ${g.date.slice(0, 4)}`, name: w.name, clubId: w.id });
  w.reputation = Math.min(100, w.reputation + (cup.type === 'continental' ? 3 : 2));
  if (cup.winner === club.id) {
    addRep(g, cup.type === 'continental' ? 6 : 3);
    g.board.confidence = clampConf(g.board.confidence + (cup.id === 'UCL' ? 25 : 15));
    sendMessage(g, { from: 'The Board', kind: 'season', title: `🏆 ${cup.name} winners!`, body: `Incredible! ${club.name} have won the ${cup.name}. The board is delighted.` });
  } else if (userWasIn) {
    sendMessage(g, { from: 'Media', kind: 'match', title: `${cup.name} final lost`, body: `${w.name} lift the ${cup.name} after beating ${club.name} in the final.` });
  }
}

/** Matchday side effects: gate receipts, injuries news. */
export function postFixture(g: GameState, f: Fixture) {
  const home = g.clubs[f.home];
  if (f.comp !== FRIENDLY) matchdayIncome(g, home, !g.leagues.some((l) => l.id === f.comp));
  if (f.home === g.userClubId || f.away === g.userClubId) {
    for (const p of squadOf(g, g.userClubId)) {
      if (p.injury && f.result?.ratings && p.id in f.result.ratings && !p.injury.reported) {
        sendMessage(g, { from: 'Medical Team', kind: 'injury', title: `${fullName(p)} injured`, body: `${fullName(p)} suffered a ${p.injury.name.toLowerCase()} and will be out for around ${Math.ceil(p.injury.days / 7)} week(s).` });
        p.injury.reported = true;
      }
    }
  }
}

/** Play the user's live match result into the world (called after the UI finishes the match). */
export function finishUserMatch(g: GameState, f: Fixture) {
  postFixture(g, f);
  matchReport(g, f);
  playDayFixtures(g);
}

/** Headless: simulate the user's match too (used by tests and "instant result"). */
export function quickPlayUserMatch(g: GameState) {
  const f = pendingUserFixture(g);
  if (!f) return;
  const m = createMatch(g, f);
  simulateToEnd(g, m);
  applyResult(g, m);
  finishUserMatch(g, f);
}

function daily(g: GameState) {
  journeyDaily(g);
  jobsDaily(g);
  const intensity = g.training.intensity;
  const userTrainMult = intensity === 'low' ? 0.6 : intensity === 'high' ? 1.8 : 1;
  const ironMen = cheatOn(g, 'ironmen');
  const userRecovery = intensity === 'low' ? 2 : intensity === 'high' ? -2 : 0;
  for (const p of Object.values(g.players)) {
    const isUser = p.clubId === g.userClubId && p.clubId !== null;
    if (p.injury) {
      p.injury.days--;
      if (p.injury.days <= 0) {
        if (isUser) sendMessage(g, { from: 'Medical Team', kind: 'injury', title: `${fullName(p)} is fit again`, body: `${fullName(p)} has recovered from a ${p.injury.name.toLowerCase()} and is available for selection.` });
        p.injury = null;
        p.condition = 75;
      }
      continue;
    }
    if (p.condition < 100) p.condition = Math.min(100, p.condition + 7 + p.attrs.stamina * 0.25 + (isUser ? userRecovery : 0));
    if (p.clubId !== null && !(isUser && ironMen) && chance(0.0005 * (isUser ? userTrainMult : 1))) {
      const inj = randomInjury(0.3);
      p.injury = inj;
      if (isUser) sendMessage(g, { from: 'Medical Team', kind: 'injury', title: `${fullName(p)} injured in training`, body: `${fullName(p)} picked up a ${inj.name.toLowerCase()} in training and will miss around ${Math.ceil(inj.days / 7)} week(s).` });
      p.injury.reported = true;
    }
    p.morale += (65 - p.morale) * 0.01;
  }
  respondToUserBids(g);
  respondToContracts(g);
  respondToLoanOffers(g);
  aiTransfers(g);
  aiPreContracts(g);
  aiLoans(g);
  aiLoanOffersForUser(g);
  aiBidsForUser(g);
  releaseClauseBids(g);
  expireOffers(g);
}

function newDay(g: GameState) {
  const d = g.date;
  const m = month(d);
  const day = dayOfMonth(d);
  if (day === 1) {
    monthlyAwards(g);
    monthlyManager(g);
    journeyMonthly(g);
    jobsMonthly(g);
    recordLedger(g);
    monthlyFinances(g);
    const dev = monthlyDevelopment(g);
    developmentReport(g, dev);
    boardMonthly(g);
  }
  if (weekday(d) === 1) {
    weeklyWages(g);
    trainingReport(g);
    leagueRoundup(g);
  }
  matchPreview(g);
  pressConference(g);
  registrationDeadlines(g);
  contractTalks(g);
  unhappyPlayers(g);
  if (m === 7 && day === 1) startSeason(g);
  if (m === 6 && day === 5) endSeason(g);
  if (m === 3 && day === 15) { youthIntake(g); assignAllShirtNumbers(g); }
  if (m === 1 && day === 1) sendMessage(g, { from: 'Director of Football', kind: 'transfer', title: 'January transfer window open', body: 'The winter window is open until 31 January. Now is the time to strengthen for the second half of the season.' });
  if ((m === 9 || m === 2) && day === 1) sendMessage(g, { from: 'Director of Football', kind: 'transfer', title: 'Transfer window closed', body: `The window has closed. Free agents can still be signed at any time.` });
  if (m === 1 && day === 15) contractWarnings(g);
  checkFacilityUpgrade(g);
}

function developmentReport(g: GameState, dev: { player: { id: number; first: string; last: string }; before: number; after: number }[]) {
  if (!dev.length) return;
  const up = dev.filter((x) => x.after > x.before).sort((a, b) => b.after - b.before - (a.after - a.before));
  const down = dev.filter((x) => x.after < x.before).sort((a, b) => a.after - a.before - (b.after - b.before));
  // CM 01/02 careers never show ability: just who has improved or declined
  const fmt = (x: (typeof dev)[number]) => `${x.player.first ? x.player.first[0] + '. ' : ''}${x.player.last}${g.era ? '' : ` ${x.before} → ${x.after}`}`;
  const body = [
    up.length ? `📈 Improved (${up.length}):\n${up.slice(0, 8).map(fmt).join('\n')}` : '📈 Nobody improved noticeably this month.',
    down.length ? `\n📉 Declined (${down.length}):\n${down.slice(0, 6).map(fmt).join('\n')}` : '',
  ].join('\n');
  sendMessage(g, { from: 'Coaching Staff', kind: 'development', title: 'Monthly development report', body });
}

function contractWarnings(g: GameState) {
  const expiring = squadOf(g, g.userClubId, 'all').filter((p) => p.contractEnd <= g.season + 1);
  if (!expiring.length) return;
  sendMessage(g, { from: 'Director of Football', kind: 'info', title: `${expiring.length} contract(s) expire this summer`, body: `These players will leave on a free at the end of the season unless you renew them (open the player and choose "Renew contract"):\n\n${expiring.map((p) => `• ${fullName(p)}${g.era ? '' : ` (${overall(p)})`}`).join('\n')}` });
}

function youthIntake(g: GameState) {
  const byClub = g.era === 'cm0102' ? playersByClub(g) : null;
  for (const club of Object.values(g.clubs)) {
    if (club.isUser) {
      const n = 3 + club.facilities.youth + int(0, 2);
      const kids = generateYouth(g, club, n, true);
      const best = [...kids].sort((a, b) => b.pa - a.pa)[0];
      sendMessage(g, { from: 'Head of Youth Development', kind: 'youth', title: `Youth intake: ${n} new prospects`, body: `This year's youth intake has arrived!\n\n${kids.map((p) => `• ${fullName(p)} (${p.pos}, ${age(p, g.date)})${g.era ? '' : ` — OVR ${overall(p)}`}`).join('\n')}\n\nThe pick of the bunch looks to be ${fullName(best)}. Visit the Youth Team page to have a look.` });
    } else if (g.era === 'cm0102') {
      // CM 01/02: every club's regens arrive each year, so the world never runs out of players
      // (transfer-only clubs produce fewer, more when they're running short, so they stay worth buying from)
      if (!isTransferOnly(club)) generateYouth(g, club, int(2, 4), true);
      else {
        const size = byClub!.get(club.id)?.length ?? 0;
        const n = size < 4 ? 2 : size < 10 ? (chance(0.6) ? 1 : 0) : chance(0.25) ? 1 : 0;
        if (n) generateYouth(g, club, n, true);
      }
    } else if (!isGuest(club) && chance(0.7)) {
      generateYouth(g, club, int(1, 3), true);
    }
  }
}

function leagueLevel(leagueId: string) {
  return LEAGUE_DEFS.find((l) => l.id === leagueId)?.level ?? 55;
}

export function endSeason(g: GameState) {
  const user = g.clubs[g.userClubId];
  const hist: SeasonHistory = { season: g.season, winners: [], userFinish: null };
  const finalTables: Record<string, number[]> = {};
  for (const league of g.leagues) {
    const table = leagueTable(g, league);
    finalTables[league.id] = table.map((r) => r.clubId);
    const champ = g.clubs[table[0].clubId];
    champ.trophies.push({ season: g.season, name: league.name });
    hist.winners.push({ comp: league.name, name: champ.name, clubId: champ.id });
    prizeMoney(g, league);
    // reputation drift by finishing position
    table.forEach((row, i) => {
      const c = g.clubs[row.clubId];
      const expected = [...league.clubIds].sort((a, b) => g.clubs[b].reputation - g.clubs[a].reputation).indexOf(c.id);
      c.reputation = Math.max(1, Math.min(100, c.reputation + Math.round((expected - i) * 0.35) + (i === 0 ? 2 : 0)));
    });
    if (league.clubIds.includes(user.id)) {
      const pos = table.findIndex((r) => r.clubId === user.id) + 1;
      hist.userFinish = { comp: league.name, pos };
      if (pos === 1) addRep(g, 6);
      const target = g.board.objectiveRank;
      const delta = pos <= target ? 12 + (target - pos) * 3 : -(pos - target) * 6;
      g.board.confidence = clampConf(g.board.confidence + delta);
      // league top scorer
      const scorers = Object.values(g.players).filter((p) => p.clubId !== null && league.clubIds.includes(p.clubId)).sort((a, b) => b.stats.goals - a.stats.goals);
      if (scorers[0]) hist.topScorer = { playerId: scorers[0].id, name: fullName(scorers[0]), goals: scorers[0].stats.goals, clubId: scorers[0].clubId! };
    }
  }
  for (const cup of g.cups) if (cup.winner !== null && cup.type !== 'world') hist.winners.push({ comp: cup.name, name: g.clubs[cup.winner].name, clubId: cup.winner });
  g.history.push(hist);

  // European places for next season (before promotion and relegation)
  g.europe = computeEntrants(g);

  // Promotion & relegation within each country's pyramid (England, Scotland)
  const moves: { id: number; to: string }[] = [];
  for (const country of [...new Set(g.leagues.map((l) => l.country))]) {
  const eng = g.leagues.filter((l) => l.country === country).sort((a, b) => a.tier - b.tier);
  for (let i = 0; i < eng.length - 1; i++) {
    const upper = eng[i];
    const lower = eng[i + 1];
    const n = Math.min(upper.down, lower.up);
    const down = finalTables[upper.id].slice(-n);
    const up = finalTables[lower.id].slice(0, n);
    for (const id of down) moves.push({ id, to: lower.id });
    for (const id of up) moves.push({ id, to: upper.id });
  }
  }
  for (const mv of moves) {
    const from = g.leagues.find((l) => l.clubIds.includes(mv.id))!;
    const to = g.leagues.find((l) => l.id === mv.to)!;
    from.clubIds = from.clubIds.filter((x) => x !== mv.id);
    to.clubIds.push(mv.id);
    const c = g.clubs[mv.id];
    c.leagueId = to.id;
    const promoted = to.tier < from.tier;
    c.reputation = Math.max(1, Math.min(100, c.reputation + (promoted ? 5 : -5)));
    if (promoted) c.capacity = Math.max(c.capacity, Math.round(c.capacity * (c.custom ? 1.6 : 1.05)));
    if (c.id === user.id) {
      addRep(g, promoted ? 4 : -8);
      if (promoted) {
        g.board.confidence = clampConf(g.board.confidence + 20);
        user.trophies.push({ season: g.season, name: `Promotion to ${to.name}` });
      }
      sendMessage(g, { from: 'The Board', kind: 'season', title: promoted ? `⬆️ Promoted to the ${to.name}!` : `⬇️ Relegated to the ${to.name}`, body: promoted ? `What a season! ${c.name} will play in the ${to.name} next season. The board is thrilled.` : `${c.name} have been relegated to the ${to.name}. The board expects an immediate response.` });
      // Relegation release clauses: those players can walk away
      const gone = promoted ? [] : relegationReleases(g, c.id);
      if (gone.length) sendMessage(g, { from: 'Director of Football', kind: 'transfer', title: 'Relegation release clauses', body: `With relegation, ${gone.join(', ')} ${gone.length > 1 ? 'have' : 'has'} used the release clause in ${gone.length > 1 ? 'their contracts' : 'his contract'} and left on a free.` });
    }
  }

  // Archive player stats, contracts, retirements
  const expiredUser: string[] = [];
  const retiredUser: string[] = [];
  const loansBack: string[] = [];
  for (const p of Object.values(g.players)) {
    if (p.clubId !== null && p.stats.apps > 0) {
      p.history.push({ season: g.season, clubId: p.clubId, apps: p.stats.apps, goals: p.stats.goals, avg: Math.round((p.stats.ratingSum / p.stats.apps) * 100) / 100 });
    }
    const a = age(p, g.date);
    const retire = a >= 38 || (a >= 34 && chance((a - 33) * 0.22)) || (p.clubId === null && a >= 33 && chance(0.5));
    if (retire) {
      if (p.clubId === g.userClubId) retiredUser.push(fullName(p));
      delete g.players[p.id];
      continue;
    }
    // Loans end with the season: back to his club before contracts are looked at
    if (p.loan) {
      if (p.loan.from === g.userClubId || p.clubId === g.userClubId) loansBack.push(`${fullName(p)} (${p.loan.from === g.userClubId ? `back from ${g.clubs[p.clubId!]?.name}` : `back to ${g.clubs[p.loan.from]?.name}`})`);
      endLoan(g, p);
    }
    // Pre-contracts: he moves on a free now his contract has run out
    if (p.preContract && p.clubId !== null && p.contractEnd <= g.season + 1 && g.clubs[p.preContract.clubId]) {
      const pc = p.preContract;
      const fromName = g.clubs[p.clubId].name;
      const leavingUser = p.clubId === g.userClubId;
      p.preContract = undefined;
      completeTransfer(g, p.id, pc.clubId, 0, pc.wage, pc.years);
      if (pc.clauses) p.clauses = pc.clauses;
      const to = g.clubs[pc.clubId];
      to.balance -= pc.bonus;
      to.seasonExpense += pc.bonus;
      if (to.isUser) sendMessage(g, { from: 'Director of Football', kind: 'transfer', title: `${fullName(p)} arrives on a free`, body: `${fullName(p)} has joined from ${fromName} on the pre-contract he agreed.` });
      else if (leavingUser) expiredUser.push(`${fullName(p)} (joins ${to.name})`);
      continue;
    }
    p.preContract = undefined;
    if (p.clubId !== null && p.contractEnd <= g.season + 1) {
      const club = g.clubs[p.clubId];
      if (club.isUser) {
        expiredUser.push(fullName(p));
        p.clubId = null;
        p.squad = 'first';
      } else if (a < 33 && (chance(0.7) || (a <= 23 && p.pa >= overall(p) + 6) || overall(p) >= leagueLevel(club.leagueId) + 4)) {
        // AI clubs keep most players, and always tie down their best players and top prospects
        p.contractEnd = g.season + 1 + int(1, 3);
        p.wage = wageFor(overall(p), club.reputation);
      } else {
        p.clubId = null;
        p.squad = 'first';
      }
    }
    // Youth graduation for AI clubs
    if (p.clubId !== null && p.squad === 'youth' && !g.clubs[p.clubId].isUser && a >= 18) {
      p.squad = 'first';
    }
  }
  // Clean up dangling references
  for (const c of Object.values(g.clubs)) {
    c.lineup = c.lineup.map((id) => (id !== null && g.players[id] && g.players[id].clubId === c.id ? id : null));
    c.subs = c.subs.filter((id) => g.players[id] && g.players[id].clubId === c.id);
  }
  g.shortlist = g.shortlist.filter((id) => g.players[id]);
  if (loansBack.length) sendMessage(g, { from: 'Director of Football', kind: 'transfer', title: 'Loans over', body: `These loans have ended with the season:\n\n${loansBack.map((n) => '• ' + n).join('\n')}` });
  if (expiredUser.length || retiredUser.length) {
    sendMessage(g, { from: 'Director of Football', kind: 'info', title: 'Summer departures', body: `${expiredUser.length ? `Contracts expired:\n${expiredUser.map((n) => '• ' + n).join('\n')}` : ''}${retiredUser.length ? `\n\nRetired:\n${retiredUser.map((n) => '• ' + n).join('\n')}` : ''}` });
  }

  // AI squads: trim to 28, fill to 22+
  const byClub = playersByClub(g);
  for (const club of Object.values(g.clubs)) {
    if (club.isUser || isTransferOnly(club)) continue;
    let all = byClub.get(club.id) ?? [];
    const squad = all.filter((p) => p.squad === 'first');
    if (squad.length > 28) {
      squad.sort((a, b) => overall(a) - overall(b)).slice(0, squad.length - 28).forEach((p) => { p.clubId = null; });
      all = all.filter((p) => p.clubId === club.id);
    }
    const lvl = isGuest(club) ? guestLevel(club) : leagueLevel(club.leagueId) + (club.reputation - 50) * 0.12;
    fillSquad(g, club, Math.round(lvl), 22, all);
  }
  // Refresh free-agent pool
  const free = Object.values(g.players).filter((p) => p.clubId === null);
  const keep = g.era === 'cm0102' ? 1500 : 450;
  if (free.length > keep) {
    // Young prospects are never thrown away (a real wonderkid between clubs stays findable); the weakest others go
    const prospect = (p: Player) => age(p, g.date) <= 23 && p.pa >= Math.max(overall(p) + 6, 62);
    free.filter((p) => !prospect(p)).sort((a, b) => overall(a) - overall(b)).slice(0, free.length - keep).forEach((p) => delete g.players[p.id]);
  }
  for (let i = 0; i < (g.era === 'cm0102' ? 0 : 40); i++) {
    generatePlayer(g, { pos: pick(['GK', 'DC', 'DL', 'DR', 'DM', 'MC', 'AMC', 'AML', 'AMR', 'ST', 'ST', 'MC'] as const), ovr: Math.max(30, Math.round(normal(54, 9))), age: int(19, 30), country: pick(['ENG', 'ENG', 'ESP', 'ITA', 'GER', 'FRA']), clubId: null }).contractEnd = g.season;
  }

  const pos = hist.userFinish?.pos;
  sendMessage(g, {
    from: 'The Board', kind: 'season', title: `Season ${seasonLabel(g.season)} review`,
    body: `${user.name} finished ${pos ? ordinal(pos) : '—'} in the ${hist.userFinish?.comp ?? 'league'} (target: ${g.board.objective}).\nBoard confidence is now ${g.board.confidence}%.\n\nChampions:\n${hist.winners.map((w) => `• ${w.comp}: ${w.name}`).join('\n')}${hist.topScorer ? `\n\nGolden Boot: ${hist.topScorer.name} (${hist.topScorer.goals})` : ''}`,
  });
  g.season++;
  setupClubWorldCup(g);
  // New contracts for the custom club's squad are cheap; keep going
}

export function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export type AdvanceResult = { ok: true } | { ok: false; reason: 'match' | 'sacked' | 'action' };

/** Move the game forward by one day. */
export function advanceDay(g: GameState): AdvanceResult {
  if (g.sacked) return { ok: false, reason: 'sacked' };
  if (openActions(g).length) return { ok: false, reason: 'action' };
  if (pendingUserFixture(g)) return { ok: false, reason: 'match' };
  playDayFixtures(g);
  intlDay(g);
  youthDay(g);
  scriptedEvents(g);
  daily(g);
  g.date = addDays(g.date, 1);
  newDay(g);
  return { ok: true };
}

/** Continue: advance days until something needs the manager (match, new message) or a week passes. */
export function continueGame(g: GameState, maxDays = 7): AdvanceResult & { days: number } {
  const startUnread = unreadImportant(g);
  let days = 0;
  while (days < maxDays) {
    const r = advanceDay(g);
    if (!r.ok) return { ...r, days };
    days++;
    if (pendingUserFixture(g)) break;
    if (openActions(g).length) break;
    if (unreadImportant(g) > startUnread) break;
    if (g.sacked) break;
  }
  return { ok: true, days };
}
