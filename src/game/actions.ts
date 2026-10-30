// Inbox items that need a response, like Football Manager: transfer bids, squad registration,
// contract talks, unhappy players and pre-match press conferences. While any is open, the
// calendar won't move on (advanceDay returns reason 'action').
import { leagueTable } from './competitions';
import { squadOf } from './generate';
import { sendMessage } from './inbox';
import { age, fmtMoney, fullName, marketValue, overall, roundMoney } from './ratings';
import { chance } from './rng';
import { mgr, note } from './manager';
import { respondJob } from './journey';
import { completeTransfer, openTalks, renewContract, renewDemand, respondIncoming, wageDemand, windowOpen } from './transfers';
import type { ActionType, Fixture, GameState, Message, MessageAction, Player } from './types';

export const SQUAD_LIMIT = 25;
export const REGISTRATION_AGE = 21; // players under this age don't need registering

export function openActions(g: GameState) {
  return g.inbox.filter((m) => m.action?.status === 'open');
}

function send(g: GameState, m: Omit<Message, 'id' | 'date' | 'read' | 'action'>, action: Omit<MessageAction, 'status'>) {
  sendMessage(g, { ...m, action: { ...action, status: 'open' } });
}

function close(m: Message, result: string) {
  m.action!.status = 'done';
  m.action!.result = result;
}

function findAction(g: GameState, type: ActionType, pred: (a: MessageAction) => boolean) {
  return g.inbox.find((m) => m.action?.type === type && m.action.status === 'open' && pred(m.action));
}

// ---------- Transfer bids ----------

export function offerAction(g: GameState, offerId: number, title: string, body: string, from: string) {
  send(g, { from, kind: 'offer', title, body, offerId }, {
    type: 'offer', offerId,
    options: [{ id: 'accept', label: 'Accept' }, { id: 'counter', label: 'Ask for 25% more' }, { id: 'reject', label: 'Reject' }],
  });
}

/** Another club asks to borrow one of your players: accept or reject. */
export function loanAction(g: GameState, offerId: number, title: string, body: string, from: string) {
  send(g, { from, kind: 'offer', title, body, offerId }, {
    type: 'offer', offerId,
    options: [{ id: 'accept', label: 'Accept the loan' }, { id: 'reject', label: 'Reject' }],
  });
}

/** Close the inbox action when an offer is handled elsewhere (e.g. the Transfers screen). */
export function closeOfferAction(g: GameState, offerId: number, result: string) {
  const m = findAction(g, 'offer', (a) => a.offerId === offerId);
  if (m) close(m, result);
}

function counterOffer(g: GameState, offerId: number): string {
  const o = g.offers.find((x) => x.id === offerId);
  if (!o || o.status !== 'pending') return 'The offer is no longer valid.';
  const p = g.players[o.playerId];
  const buyer = g.clubs[o.from];
  const ask = roundMoney(o.fee * 1.25);
  const value = marketValue(p, g.date);
  if (windowOpen(g) && ask <= buyer.transferBudget && (ask <= value * 1.15 || chance(0.4))) {
    completeTransfer(g, p.id, buyer.id, ask, wageDemand(g, p, buyer));
    o.status = 'done';
    return `${buyer.name} agreed to pay ${fmtMoney(ask)}. ${fullName(p)} has joined them.`;
  }
  o.status = 'rejected';
  return `${buyer.name} refused to pay ${fmtMoney(ask)} and walked away.`;
}

// ---------- Squad registration ----------

/** Can this player play in this competition (registered, or too young to need registering)? */
export function isEligible(g: GameState, p: Player, comp: string) {
  if (p.clubId !== g.userClubId) return true;
  const reg = g.registration;
  if (!reg) return true;
  const isLeague = g.leagues.some((l) => l.id === comp);
  const isEurope = g.cups.some((c) => c.id === comp && c.type === 'continental');
  const list = isLeague ? reg.league : isEurope ? reg.europe : undefined;
  if (!list) return true;
  return age(p, g.date) < REGISTRATION_AGE || list.includes(p.id);
}

export function seniors(g: GameState) {
  return squadOf(g, g.userClubId, 'all').filter((p) => age(p, g.date) >= REGISTRATION_AGE).sort((a, b) => overall(b) - overall(a));
}

export function suggestedRegistration(g: GameState) {
  return seniors(g).slice(0, SQUAD_LIMIT).map((p) => p.id);
}

export function registrationAction(g: GameState, scope: 'league' | 'europe', compName: string) {
  if (findAction(g, 'registration', (a) => a.scope === scope)) return;
  const n = seniors(g).length;
  send(g, {
    from: 'Director of Football', kind: 'board',
    title: `Register your ${compName} squad`,
    body: `The registration deadline for the ${compName} has arrived. Name up to ${SQUAD_LIMIT} players aged ${REGISTRATION_AGE} or over; younger players don't need registering.\n\nYou have ${n} senior players.${n > SQUAD_LIMIT ? ` ${n - SQUAD_LIMIT} will have to miss out, and anyone left out can't play in the ${compName} until the next registration window.` : ''}\n\nPick the squad yourself, or use the suggested ${Math.min(n, SQUAD_LIMIT)}${g.era ? '' : ' (best by overall)'}.`,
  }, {
    type: 'registration', scope,
    options: [{ id: 'pick', label: 'Pick squad' }, { id: 'suggested', label: 'Use suggested squad' }],
  });
}

/** Save the registration for a scope (from the registration screen or the suggested squad). */
export function registerSquad(g: GameState, scope: 'league' | 'europe', ids: number[]): { ok: boolean; msg: string } {
  const valid = ids.filter((id) => g.players[id]?.clubId === g.userClubId && age(g.players[id], g.date) >= REGISTRATION_AGE);
  if (valid.length > SQUAD_LIMIT) return { ok: false, msg: `Too many players: ${valid.length}/${SQUAD_LIMIT}.` };
  g.registration = { ...(g.registration ?? {}), [scope]: valid };
  const m = findAction(g, 'registration', (a) => a.scope === scope);
  const left = seniors(g).filter((p) => !valid.includes(p.id));
  if (m) close(m, `Squad registered: ${valid.length} senior players.${left.length ? ` Left out: ${left.map((p) => fullName(p)).join(', ')}.` : ''}`);
  return { ok: true, msg: `${valid.length} players registered.` };
}

/** 1 September and 1 February: the windows have shut, so squads must be registered. */
export function registrationDeadlines(g: GameState) {
  const md = g.date.slice(5);
  if (md !== '09-01' && md !== '02-01') return;
  const me = g.userClubId;
  const league = g.leagues.find((l) => l.clubIds.includes(me));
  if (league) registrationAction(g, 'league', league.name);
  const euro = g.cups.filter((c) => c.type === 'continental' && c.winner === null && (md === '09-01' ? (c.teams ?? []).includes(me) : c.alive.includes(me)));
  if (euro.length) registrationAction(g, 'europe', euro.map((c) => c.name).join(' / '));
}

/** New season: last season's registration no longer applies (everyone's eligible until the deadline). */
export function resetRegistration(g: GameState) {
  g.registration = undefined;
}

/** Players who join after the deadline are registered automatically if there's room. */
export function registerNewSigning(g: GameState, p: Player) {
  const reg = g.registration;
  if (!reg || p.clubId !== g.userClubId || age(p, g.date) < REGISTRATION_AGE) return;
  for (const scope of ['league', 'europe'] as const) {
    const list = reg[scope];
    if (list && !list.includes(p.id) && list.length < SQUAD_LIMIT) list.push(p.id);
  }
}

// ---------- Contracts and morale ----------

/** 15 January: key players in the last year of their contract want an answer. */
export function contractTalks(g: GameState) {
  if (g.date.slice(5) !== '01-15') return;
  const me = g.userClubId;
  const squad = squadOf(g, me);
  const xi = squad.map(overall).sort((a, b) => b - a).slice(0, 11);
  const level = xi.reduce((a, b) => a + b, 0) / Math.max(1, xi.length);
  const key = squad
    .filter((p) => p.contractEnd <= g.season + 1 && age(p, g.date) < 33 && (overall(p) >= level - 6 || (age(p, g.date) <= 23 && p.pa >= 80)))
    .sort((a, b) => overall(b) - overall(a))
    .slice(0, 4);
  for (const p of key) {
    if (p.preContract) continue;
    if (g.era) {
      // CM 01/02: talks open with a contract offer in the mail (offer, answer the next day, try again if he refuses)
      const r = openTalks(g, p.id, 'renew');
      if (!r.ok || r.offerId === undefined) continue;
      sendMessage(g, { from: `${fullName(p)}'s agent`, kind: 'transfer', title: `${fullName(p)} wants to talk about a new contract`, body: `${fullName(p)}'s contract runs out this summer. His agent is asking for around ${fmtMoney(renewDemand(g, p))}/week (currently ${fmtMoney(p.wage)}/week).\n\nWithout a new deal he'll leave on a free in June, and other clubs can sign him on a pre-contract from now.`, offerId: r.offerId });
      continue;
    }
    const wage = renewDemand(g, p);
    send(g, {
      from: `${fullName(p)}'s agent`, kind: 'transfer',
      title: `${fullName(p)} wants to talk about a new contract`,
      body: `${fullName(p)}'s contract runs out this summer. Their agent says they'd sign a new 3-year deal at ${fmtMoney(wage)}/wk (currently ${fmtMoney(p.wage)}/wk).\n\nWithout an offer, they'll leave on a free in June and their morale will drop.`,
    }, {
      type: 'contract', playerId: p.id,
      options: [{ id: 'offer', label: `Offer 3 years at ${fmtMoney(wage)}/wk` }, { id: 'refuse', label: 'Let it run down' }],
    });
  }
}

/** 1st of the month: the unhappiest player asks to see you. */
export function unhappyPlayers(g: GameState) {
  if (g.date.slice(8) !== '01') return;
  const p = squadOf(g, g.userClubId).filter((x) => x.morale < 35 && !x.listed).sort((a, b) => a.morale - b.morale)[0];
  if (!p || findAction(g, 'unhappy', (a) => a.playerId === p.id)) return;
  send(g, {
    from: fullName(p), kind: 'info',
    title: `${fullName(p)} wants a word`,
    body: `${fullName(p)} isn't happy with their situation at the club (morale ${Math.round(p.morale)}). They've asked to see you.`,
  }, {
    type: 'unhappy', playerId: p.id,
    options: [{ id: 'promise', label: 'Promise more game time' }, { id: 'list', label: 'Transfer-list them' }, { id: 'fight', label: 'Tell them to fight for their place' }],
  });
}

// ---------- Press conferences ----------

function bigMatch(g: GameState, f: Fixture) {
  const me = g.userClubId;
  const oppId = f.home === me ? f.away : f.home;
  const cup = g.cups.find((c) => c.id === f.comp);
  if (cup && (f.knockout || f.leg) && (cup.type !== 'domestic' || /Semi|Final/.test(f.roundName ?? ''))) return true;
  const league = g.leagues.find((l) => l.id === f.comp);
  if (league) {
    const top = leagueTable(g, league).slice(0, 6).map((r) => r.clubId);
    const big = [...league.clubIds].sort((a, b) => g.clubs[b].reputation - g.clubs[a].reputation).slice(0, 6);
    return top.includes(oppId) || big.includes(oppId);
  }
  return false;
}

/** Match day: a press conference before big games. */
export function pressConference(g: GameState) {
  const me = g.userClubId;
  const f = g.fixtures.find((x) => x.date === g.date && !x.result && (x.home === me || x.away === me));
  if (!f || !bigMatch(g, f) || findAction(g, 'press', (a) => a.fixtureId === f.id)) return;
  const opp = g.clubs[f.home === me ? f.away : f.home];
  send(g, {
    from: 'Press Officer', kind: 'news',
    title: `Press conference: ${opp.name}`,
    body: `The media are waiting before today's game against ${opp.name}. "How do you see the game going?"`,
  }, {
    type: 'press', fixtureId: f.id,
    options: [{ id: 'confident', label: '"We expect to win."' }, { id: 'cautious', label: '"It\'ll be a tough game."' }, { id: 'mind', label: '"They\'re feeling the pressure."' }],
  });
}

// ---------- Responding ----------

export function respondAction(g: GameState, messageId: number, option: string): { ok: boolean; msg: string } {
  const m = g.inbox.find((x) => x.id === messageId);
  const a = m?.action;
  if (!m || !a || a.status !== 'open') return { ok: false, msg: 'Nothing to respond to.' };
  const p = a.playerId !== undefined ? g.players[a.playerId] : undefined;
  let result = '';
  switch (a.type) {
    case 'offer': {
      if (option === 'counter') { note(g, 'negotiating', 1); result = counterOffer(g, a.offerId!); }
      else result = respondIncoming(g, a.offerId!, option === 'accept').msg;
      break;
    }
    case 'registration': {
      if (option === 'pick') return { ok: true, msg: 'pick' }; // the UI opens the registration screen
      registerSquad(g, a.scope!, suggestedRegistration(g));
      return { ok: true, msg: m.action!.result ?? 'Registered.' };
    }
    case 'contract': {
      if (!p || p.clubId !== g.userClubId) { result = 'The player has already left.'; break; }
      note(g, 'manManagement', 0.6);
      if (option === 'offer') {
        const r = renewContract(g, p.id, 3);
        result = r.msg;
        if (!r.ok) p.morale = Math.max(5, p.morale - 10);
      } else {
        p.morale = Math.max(5, p.morale - 15);
        result = `${fullName(p)} is disappointed and will leave on a free in the summer.`;
      }
      break;
    }
    case 'unhappy': {
      if (!p || p.clubId !== g.userClubId) { result = 'The player has already left.'; break; }
      note(g, 'manManagement', option === 'list' ? 0.6 : 1.2);
      if (option === 'promise') { p.morale = Math.min(100, p.morale + 20); result = `${fullName(p)} is happier, and will expect to play more.`; }
      else if (option === 'list') { p.listed = true; p.morale = Math.min(100, p.morale + 8); result = `${fullName(p)} has been transfer-listed. Clubs will be told he's available.`; }
      else if (chance(0.5 + 0.25 * mgr(g, 'manManagement'))) { p.morale = Math.min(100, p.morale + 10); result = `${fullName(p)} took it well and is determined to prove you wrong.`; }
      else { p.morale = Math.max(5, p.morale - 8); result = `${fullName(p)} didn't take it well.`; }
      break;
    }
    case 'job': {
      result = respondJob(g, option);
      break;
    }
    case 'press': {
      const squad = squadOf(g, g.userClubId);
      note(g, 'media', 1);
      // Good motivators get more out of a lift; good media handlers' mind games land more often
      const nudge = (d: number) => squad.forEach((x) => { x.morale = Math.max(5, Math.min(100, x.morale + (d > 0 ? d * (1 + 0.5 * mgr(g, 'motivating')) : d * (1 - 0.4 * mgr(g, 'media'))))); });
      if (option === 'confident') { nudge(4); result = 'The players liked the confidence. Morale is up.'; }
      else if (option === 'cautious') { nudge(1); result = 'A calm, measured answer. No headlines.'; }
      else if (chance(0.62 + 0.2 * mgr(g, 'media'))) { note(g, 'media', 0.5); nudge(3); result = 'The mind games made the back pages. The squad are fired up.'; }
      else { nudge(-3); result = 'It backfired: the press turned it on you, and the squad are a little rattled.'; }
      break;
    }
  }
  close(m, result);
  return { ok: true, msg: result };
}

/** Headless play (tests, simulations): the assistant answers everything sensibly. */
export function autoResolveActions(g: GameState) {
  for (const m of openActions(g)) {
    const a = m.action!;
    if (a.type === 'registration') registerSquad(g, a.scope!, suggestedRegistration(g));
    else respondAction(g, m.id, a.type === 'offer' ? 'reject' : a.type === 'contract' ? 'offer' : a.type === 'unhappy' ? 'promise' : a.type === 'job' ? (a.options.some((o) => o.id === 'stay') ? 'stay' : a.options[0].id) : 'cautious');
  }
}

/** Does this mail need you to do something? A question to answer, or the next step of one of your deals. */
export function needsMove(g: GameState, m: Message) {
  if (m.action) return m.action.status === 'open';
  if (!m.offerId) return false;
  const o = g.offers.find((x) => x.id === m.offerId);
  if (!o || o.from !== g.userClubId || o.status !== 'accepted' || o.contract?.state === 'pending') return false;
  // Only the newest mail about a deal carries its next step
  return !g.inbox.some((x) => x.offerId === o.id && x.id > m.id);
}
