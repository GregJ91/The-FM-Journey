import { budget, fee } from './economy';
import { assignShirtNumbers, releaseShirt } from './shirts';
import { applyMetaProfile, isMetaClub } from './meta';
import { closeOfferAction, loanAction, offerAction, registerNewSigning } from './actions';
import { isTransferOnly } from './guests';
import { isEu, permitCheck } from './permits';
import { addDays, inTransferWindow, month } from './dates';
import { emptyStats, nextId, squadOf, wageBill } from './generate';
import { age, fmtMoney, fullName, marketValue, overall, ratingAt, roundMoney, wageFor } from './ratings';
import { chance, normal, pick, rand, weighted } from './rng';
import { pickLineup } from './selection';
import { FORMATIONS } from './formations';
import type { Club, ContractOffer, GameState, Offer, Player, SquadRole } from './types';
import { POS_GROUP } from './ratings';
import { sendMessage } from './inbox';
import { mgr, note, noteSigning } from './manager';

export function askingPrice(g: GameState, p: Player) {
  const v = marketValue(p, g.date);
  if (p.clubId === null) return 0;
  const club = g.clubs[p.clubId];
  const squad = squadOf(g, club.id);
  const better = squad.filter((x) => x.id !== p.id && POS_GROUP[x.pos] === POS_GROUP[p.pos] && overall(x) > overall(p)).length;
  const keyPlayer = better <= 1 ? 0.35 : better <= 3 ? 0.15 : 0;
  const mult = p.listed ? 0.85 : 1.15 + keyPlayer;
  return roundMoney(Math.max(fee(5_000), v * mult));
}

export function wageDemand(g: GameState, p: Player, buyer: Club) {
  const base = wageFor(overall(p), buyer.reputation);
  const a = age(p, g.date);
  const ageAdj = a >= 30 ? 0.9 : a <= 21 ? 0.85 : 1;
  return roundMoney(Math.max(p.wage * 1.08, base * ageAdj));
}

/** Will the player even consider joining? */
export function playerInterest(g: GameState, p: Player, buyer: Club): { ok: boolean; reason: string } {
  const ovr = overall(p);
  const required = (ovr - 50) * 1.6; // reputation a club needs to tempt this level of player
  const current = p.clubId !== null ? g.clubs[p.clubId] : null;
  if (current && current.id === buyer.id) return { ok: false, reason: 'Already at your club.' };
  if (buyer.reputation + 18 < required) return { ok: false, reason: `${fullName(p)} feels your club lacks the stature to make the move worthwhile.` };
  if (current && buyer.reputation + 15 < current.reputation && ovr > 60) return { ok: false, reason: `${fullName(p)} is not interested in a step down from ${current.name}.` };
  return { ok: true, reason: '' };
}

export function windowOpen(g: GameState) {
  return inTransferWindow(g.date);
}

/**
 * Why the user can't bid for `p` right now, or '' if they can. The Bid tab shows the same reason up front, so the
 * player's profile and the bid itself never disagree.
 */
export function bidBlocker(g: GameState, p: Player): string {
  const user = g.clubs[g.userClubId];
  if (g.mode === 'journey') return 'In The Journey your director of football handles signings: use Recruitment.';
  if (p.clubId === null) return 'Player not available.';
  if (p.clubId === user.id) return 'That player is already at your club.';
  if (p.loan) return `${fullName(p)} is on loan at ${g.clubs[p.clubId].name} until the end of the season.`;
  if (p.preContract) return `${fullName(p)} has agreed to join ${g.clubs[p.preContract.clubId]?.name ?? 'another club'} in the summer.`;
  const interest = playerInterest(g, p, user);
  if (!interest.ok) return interest.reason;
  const permit = permitCheck(g, p, user);
  if (!permit.ok) return permit.msg;
  if (!windowOpen(g)) return 'The transfer window is closed. It reopens in January / July.';
  return '';
}

export function userBid(g: GameState, playerId: number, fee: number): { ok: boolean; msg: string } {
  const user = g.clubs[g.userClubId];
  const p = g.players[playerId];
  if (!p || p.clubId === null) return { ok: false, msg: 'Player not available.' };
  const why = bidBlocker(g, p);
  if (why) return { ok: false, msg: why };
  if (fee > user.transferBudget) return { ok: false, msg: `That exceeds your transfer budget of ${fmtMoney(user.transferBudget)}.` };
  if (g.offers.some((o) => o.playerId === playerId && o.from === user.id && (o.status === 'pending' || o.status === 'accepted'))) {
    return { ok: false, msg: 'You already have an active bid for this player.' };
  }
  const offer: Offer = {
    id: nextId(g), playerId, from: user.id, to: p.clubId, fee, wage: wageDemand(g, p, user),
    status: 'pending', date: g.date, respondBy: addDays(g.date, 1),
  };
  g.offers.push(offer);
  return { ok: true, msg: `Bid of ${fmtMoney(fee)} submitted to ${g.clubs[p.clubId].name}. Expect a reply tomorrow.` };
}

/** Process user bids awaiting a response. */
export function respondToUserBids(g: GameState) {
  for (const o of g.offers) {
    if (o.status !== 'pending' || o.from !== g.userClubId || o.kind === 'loan' || (o.respondBy && o.respondBy > g.date)) continue;
    const p = g.players[o.playerId];
    if (!p || p.clubId !== o.to) { o.status = 'collapsed'; continue; }
    // A good negotiator gets deals done for a little less (up to 8%)
    const ask = roundMoney(askingPrice(g, p) * (1 - 0.08 * mgr(g, 'negotiating')));
    const seller = g.clubs[o.to];
    if (o.fee >= ask) {
      o.status = 'accepted';
      sendMessage(g, { from: seller.name, kind: 'transfer', title: `Bid accepted for ${fullName(p)}`, body: `${seller.name} have accepted your ${fmtMoney(o.fee)} offer for ${fullName(p)}. You may now offer ${fullName(p)} a contract. His agent is asking for around ${fmtMoney(o.wage)}/week.`, offerId: o.id });
    } else if (o.fee >= ask * 0.75) {
      o.status = 'countered';
      o.counter = ask;
      sendMessage(g, { from: seller.name, kind: 'transfer', title: `Counter offer for ${fullName(p)}`, body: `${seller.name} have rejected ${fmtMoney(o.fee)} but would accept ${fmtMoney(ask)} for ${fullName(p)}.`, offerId: o.id });
    } else {
      o.status = 'rejected';
      sendMessage(g, { from: seller.name, kind: 'transfer', title: `Bid rejected for ${fullName(p)}`, body: `${seller.name} have flatly rejected your ${fmtMoney(o.fee)} bid for ${fullName(p)}. They value the player far higher.` });
    }
  }
}

export function acceptCounter(g: GameState, offerId: number): { ok: boolean; msg: string } {
  const o = g.offers.find((x) => x.id === offerId);
  if (!o || o.status !== 'countered' || !o.counter) return { ok: false, msg: 'Offer no longer valid.' };
  const user = g.clubs[g.userClubId];
  if (o.counter > user.transferBudget) return { ok: false, msg: 'You cannot afford the counter offer.' };
  o.fee = o.counter;
  o.status = 'accepted';
  return { ok: true, msg: 'Counter offer accepted. Now agree personal terms.' };
}

export const ROLE_LABEL: Record<SquadRole, string> = { key: 'Key player', first: 'First team', rotation: 'Rotation', backup: 'Backup' };
const ROLES: SquadRole[] = ['key', 'first', 'rotation', 'backup'];
/** "as a …" wording for each squad status. */
export const ROLE_AS: Record<SquadRole, string> = { key: 'a key player', first: 'a first-team player', rotation: 'a rotation player', backup: 'a backup player' };

/** The squad status a player expects at the buying club, from how he compares with the players there in his position. */
export function expectedRole(g: GameState, p: Player, buyer: Club): SquadRole {
  const ovr = overall(p);
  const better = squadOf(g, buyer.id).filter((x) => x.id !== p.id && POS_GROUP[x.pos] === POS_GROUP[p.pos] && overall(x) > ovr).length;
  return better === 0 ? 'key' : better <= 2 ? 'first' : better <= 4 ? 'rotation' : 'backup';
}

/** Contract length he'd prefer: young players and veterans want security, players in their prime keep options open. */
export function preferredYears(g: GameState, p: Player) {
  const a = age(p, g.date);
  return a <= 23 ? 5 : a <= 28 ? 4 : a <= 31 ? 3 : 2;
}

/** Is this deal with a club at all (a fee or a loan agreed first), or just with the player? */
const withClub = (o: Offer) => !o.kind || o.kind === 'transfer' || o.kind === 'loan';

/** The club the player has to be at for the deal to stand (free agents: none). */
function dealClub(o: Offer) {
  return o.kind === 'free' ? null : o.to;
}

/** What he's asking for in this negotiation. */
export function dealDemand(g: GameState, o: Offer, p: Player) {
  return o.kind === 'renew' ? renewDemand(g, p) : wageDemand(g, p, g.clubs[g.userClubId]);
}

/** Start talks with a player directly: a free agent, a pre-contract, or a new deal for one of your own players. */
export function openTalks(g: GameState, playerId: number, kind: 'free' | 'pre' | 'renew'): { ok: boolean; msg: string; offerId?: number } {
  const user = g.clubs[g.userClubId];
  const p = g.players[playerId];
  if (!p) return { ok: false, msg: 'Player not found.' };
  if (g.mode === 'journey' && kind !== 'renew') return { ok: false, msg: 'In The Journey your director of football handles signings: use Recruitment.' };
  const live = g.offers.find((o) => o.playerId === p.id && o.from === user.id && o.status === 'accepted' && (o.kind ?? 'transfer') === kind);
  if (live) return { ok: true, msg: '', offerId: live.id };
  if (p.preContract) return { ok: false, msg: `${fullName(p)} has already agreed to join ${g.clubs[p.preContract.clubId]?.name ?? 'another club'} in the summer.` };
  if (kind === 'free' && p.clubId !== null) return { ok: false, msg: 'Not a free agent.' };
  if (kind === 'renew') {
    if (p.clubId !== user.id) return { ok: false, msg: 'Not your player.' };
    if (p.loan) return { ok: false, msg: `${fullName(p)} is on loan here.` };
    if (p.morale < 25) return { ok: false, msg: `${fullName(p)} is unhappy and refuses to discuss a new deal.` };
    if (g.offers.some((o) => o.playerId === p.id && o.kind === 'renew' && o.status === 'collapsed' && o.date.slice(0, 4) === g.date.slice(0, 4) && month(g.date) - month(o.date) < 3)) {
      return { ok: false, msg: `${fullName(p)} broke off talks recently and won't discuss a new deal yet.` };
    }
  }
  if (kind === 'pre') {
    if (!preContractOpen(g, p)) return { ok: false, msg: 'Pre-contracts can only be agreed from January with players whose contracts end in the summer.' };
  }
  if (kind !== 'renew') {
    const interest = playerInterest(g, p, user);
    if (!interest.ok) return { ok: false, msg: interest.reason };
    const permit = permitCheck(g, p, user);
    if (!permit.ok) return { ok: false, msg: permit.msg };
  }
  const o: Offer = { id: nextId(g), playerId: p.id, from: user.id, to: kind === 'free' ? -1 : p.clubId!, fee: 0, wage: dealDemand(g, { kind } as Offer, p), status: 'accepted', date: g.date, kind };
  g.offers.push(o);
  return { ok: true, msg: '', offerId: o.id };
}

/** From January, a player whose contract ends in the summer can agree to join you on a free (a Bosman). */
export function preContractOpen(g: GameState, p: Player) {
  const m = month(g.date);
  return p.clubId !== null && p.clubId !== g.userClubId && !p.loan && p.contractEnd <= g.season + 1 && m >= 1 && m <= 5 && !p.preContract;
}

/** Offer personal terms (after the fee is agreed, or straight away for free agents, pre-contracts and renewals); he answers the next day. */
export function offerContract(g: GameState, offerId: number, terms: Pick<ContractOffer, 'wage' | 'years' | 'bonus' | 'role'>): { ok: boolean; msg: string } {
  const o = g.offers.find((x) => x.id === offerId);
  const p = o && g.players[o.playerId];
  if (!o || !p || o.status !== 'accepted' || p.clubId !== dealClub(o)) return { ok: false, msg: 'Offer no longer valid.' };
  if (o.contract?.state === 'pending') return { ok: false, msg: `${fullName(p)} is still considering your offer.` };
  if (o.contract?.state === 'agreed') return { ok: false, msg: `${fullName(p)} has already agreed terms.` };
  if (withClub(o) && !windowOpen(g)) { o.status = 'collapsed'; return { ok: false, msg: 'The window closed before the deal was completed.' }; }
  const user = g.clubs[g.userClubId];
  if (o.fee + terms.bonus > user.transferBudget) return { ok: false, msg: `The ${o.fee ? 'fee plus ' : ''}signing-on fee (${fmtMoney(o.fee + terms.bonus)}) is more than your transfer budget.` };
  // Pre-contracts start next season, when this season's wages have gone
  if (o.kind !== 'pre' && !canAffordWage(g, user.id, terms.wage, o.kind === 'renew' ? p.wage : 0)) return { ok: false, msg: `That wage would break your wage budget (${fmtMoney(user.wageBudget)}/wk). Ask the board for more or free up wages.` };
  o.contract = { ...terms, years: Math.max(1, Math.min(5, Math.round(terms.years))), by: addDays(g.date, 1), state: 'pending', tries: o.contract?.tries ?? 0 };
  return { ok: true, msg: `Contract offered to ${fullName(p)}. He will give his answer tomorrow.` };
}

/** Players answer the user's contract offers: accept, or say what they want instead. */
export function respondToContracts(g: GameState) {
  const user = g.clubs[g.userClubId];
  for (const o of g.offers) {
    const c = o.contract;
    if (o.from !== user.id || o.status !== 'accepted' || !c || c.state !== 'pending' || c.by > g.date) continue;
    const p = g.players[o.playerId];
    if (!p || p.clubId !== dealClub(o)) { o.status = 'collapsed'; continue; }
    const demand = dealDemand(g, o, p);
    const want = expectedRole(g, p, user);
    const gap = ROLES.indexOf(want) - ROLES.indexOf(c.role); // > 0: offered a bigger role than he expects
    const roleF = gap >= 0 ? 1 + 0.04 * gap : 1 + 0.12 * gap;
    const pref = preferredYears(g, p);
    const yearsF = 1 - 0.04 * Math.abs(c.years - pref);
    // Happy players stay for a little less; unhappy ones want more
    const moraleF = o.kind === 'renew' ? 1 + (p.morale - 60) / 400 : 1;
    const score = (c.wage / demand) * roleF * yearsF * moraleF + (c.bonus / (demand * 52)) * 0.3 + mgr(g, 'negotiating') * 0.04;
    const agent = `${fullName(p)}'s agent`;
    const terms = `${fmtMoney(c.wage)}/week for ${c.years} year${c.years > 1 ? 's' : ''} as ${ROLE_AS[c.role]}${c.bonus ? `, with a ${fmtMoney(c.bonus)} signing-on fee` : ''}`;
    if (score >= 0.97 + normal(0, 0.025)) {
      c.state = 'agreed';
      c.note = undefined;
      if (o.kind === 'renew') {
        // A new deal for your own player is done as soon as he agrees
        renewOn(g, p, c);
        o.status = 'done';
        sendMessage(g, { from: agent, kind: 'transfer', title: `${fullName(p)} signs a new contract`, body: `${fullName(p)} has agreed a new deal: ${terms}.` });
        continue;
      }
      // As in CM: he agrees terms, then you confirm
      const next = o.kind === 'free' ? 'Confirm the signing to bring him in.' : o.kind === 'pre' ? `Confirm the pre-contract: he joins on a free when his contract at ${g.clubs[o.to].name} runs out in the summer.` : `Confirm the transfer to complete the ${fmtMoney(o.fee)} deal with ${g.clubs[o.to].name}.`;
      sendMessage(g, { from: agent, kind: 'transfer', title: `${fullName(p)} accepts your contract offer`, body: `${fullName(p)} has agreed personal terms: ${terms}.\n\n${next}`, offerId: o.id });
      continue;
    }
    c.tries++;
    const reason = c.wage < demand * 0.97 ? `He wants around ${fmtMoney(demand)}/week.`
      : roleF < 1 ? `He wants to be ${ROLE_AS[want]} here.`
      : yearsF < 0.95 ? `He would prefer a ${pref}-year contract.`
      : `He is holding out for a little more.`;
    if (c.tries >= 3) {
      o.status = 'collapsed';
      const stays = o.kind === 'renew' ? ' He will leave on a free when his contract runs out unless his mood changes.' : o.kind === 'free' ? '' : ` He stays at ${g.clubs[o.to].name}.`;
      sendMessage(g, { from: agent, kind: 'transfer', title: `Talks with ${fullName(p)} break down`, body: `${fullName(p)} has rejected your contract offer for a third time and talks have broken down.${stays}` });
    } else {
      c.state = 'rejected';
      c.note = reason;
      sendMessage(g, { from: agent, kind: 'transfer', title: `${fullName(p)} rejects your contract offer`, body: `${fullName(p)} has turned down your contract offer. ${reason}\n\nYou can make ${3 - c.tries} more offer${3 - c.tries > 1 ? 's' : ''}.`, offerId: o.id });
    }
  }
}

/** Put agreed terms into a renewed contract. */
function renewOn(g: GameState, p: Player, c: ContractOffer) {
  const club = g.clubs[p.clubId!];
  p.wage = c.wage;
  p.contractEnd = g.season + c.years + (month(g.date) >= 7 ? 1 : 0);
  p.morale = Math.min(100, p.morale + 8);
  club.balance -= c.bonus;
  club.seasonExpense += c.bonus;
  club.transferBudget = Math.max(0, club.transferBudget - c.bonus);
}

/** He has agreed terms: complete the deal (the fee, his wage and any signing-on fee are paid now; a pre-contract waits for the summer). */
export function confirmTransfer(g: GameState, offerId: number): { ok: boolean; msg: string } {
  const o = g.offers.find((x) => x.id === offerId);
  const p = o && g.players[o.playerId];
  const c = o?.contract;
  if (!o || !p || !c || o.status !== 'accepted' || c.state !== 'agreed' || p.clubId !== dealClub(o)) return { ok: false, msg: 'This deal is no longer available.' };
  if (withClub(o) && !windowOpen(g)) { o.status = 'collapsed'; return { ok: false, msg: 'The transfer window has closed: the deal has collapsed.' }; }
  const user = g.clubs[g.userClubId];
  const permit = permitCheck(g, p, user);
  if (!permit.ok) {
    o.status = 'collapsed';
    sendMessage(g, { from: 'Director of Football', kind: 'transfer', title: `Work permit refused for ${fullName(p)}`, body: `${permit.msg} The deal has collapsed.` });
    return { ok: false, msg: permit.msg };
  }
  if (o.fee + c.bonus > user.transferBudget) return { ok: false, msg: `Not enough transfer budget (${fmtMoney(o.fee + c.bonus)} needed).` };
  if (o.kind === 'pre') {
    p.preContract = { clubId: user.id, wage: c.wage, years: c.years, bonus: c.bonus };
    o.status = 'done';
    sendMessage(g, { from: 'Director of Football', kind: 'transfer', title: `${fullName(p)} agrees a pre-contract`, body: `${fullName(p)} will join on a free transfer when his contract at ${g.clubs[o.to].name} runs out in the summer.\n\nTerms: ${fmtMoney(c.wage)}/week for ${c.years} year${c.years > 1 ? 's' : ''} as ${ROLE_AS[c.role]}${c.bonus ? `, with a ${fmtMoney(c.bonus)} signing-on fee` : ''}.` });
    return { ok: true, msg: `${fullName(p)} will join in the summer.` };
  }
  if (!canAffordWage(g, user.id, c.wage)) return { ok: false, msg: `His wage would break your wage budget (${fmtMoney(user.wageBudget)}/wk).` };
  const from = o.kind === 'free' ? null : g.clubs[o.to].name;
  completeTransfer(g, p.id, user.id, o.fee, c.wage, c.years);
  user.balance -= c.bonus;
  user.seasonExpense += c.bonus;
  user.transferBudget = Math.max(0, user.transferBudget - c.bonus);
  o.status = 'done';
  sendMessage(g, { from: 'Director of Football', kind: 'transfer', title: `${fullName(p)} signs!`, body: `${fullName(p)} has ${from ? `completed his ${fmtMoney(o.fee)} move from ${from}` : 'signed on a free transfer'}.\n\nTerms: ${fmtMoney(c.wage)}/week for ${c.years} year${c.years > 1 ? 's' : ''} as ${ROLE_AS[c.role]}${c.bonus ? `, with a ${fmtMoney(c.bonus)} signing-on fee` : ''}.` });
  return { ok: true, msg: `${fullName(p)} has signed!` };
}

/** Pull out of a deal before it completes. */
export function cancelTransfer(g: GameState, offerId: number): { ok: boolean; msg: string } {
  const o = g.offers.find((x) => x.id === offerId);
  if (!o || (o.status !== 'accepted' && o.status !== 'countered' && o.status !== 'pending')) return { ok: false, msg: 'This deal is no longer available.' };
  o.status = 'withdrawn';
  return { ok: true, msg: 'You pulled out of the deal.' };
}

/**
 * CM 01/02 careers, February to May (1st of the month): other clubs approach your players whose contracts end in the
 * summer, and some agree to join them on a free (renew them in time to keep them).
 */
export function aiPreContracts(g: GameState) {
  if (!g.era || g.date.slice(8) !== '01') return;
  const m = month(g.date);
  if (m < 2 || m > 5) return;
  const user = g.clubs[g.userClubId];
  const talking = new Set(g.offers.filter((o) => o.kind === 'renew' && o.status === 'accepted').map((o) => o.playerId));
  const leaving = Object.values(g.players).filter((p) => p.clubId === user.id && p.squad !== 'youth' && !p.loan && !p.preContract && p.contractEnd <= g.season + 1 && !talking.has(p.id) && age(p, g.date) < 33);
  const clubs = Object.values(g.clubs).filter((c) => !c.isUser && !isTransferOnly(c) && g.leagues.some((l) => l.clubIds.includes(c.id)));
  for (const p of leaving) {
    if (!chance(0.2)) continue;
    const fits = clubs.filter((c) => Math.abs(c.reputation - user.reputation) <= 15 && playerInterest(g, p, c).ok && permitCheck(g, p, c).ok);
    if (!fits.length) continue;
    const to = pick(fits);
    p.preContract = { clubId: to.id, wage: wageDemand(g, p, to), years: preferredYears(g, p), bonus: 0 };
    sendMessage(g, { from: `${fullName(p)}'s agent`, kind: 'transfer', title: `${fullName(p)} agrees to join ${to.name}`, body: `${fullName(p)} has signed a pre-contract with ${to.name} and will leave on a free transfer when his contract runs out in the summer.` });
  }
}

export function canAffordWage(g: GameState, clubId: number, wage: number, replacingWage = 0) {
  const club = g.clubs[clubId];
  return wageBill(g, clubId) - replacingWage + wage <= club.wageBudget;
}

export function agreeTerms(g: GameState, offerId: number): { ok: boolean; msg: string } {
  const o = g.offers.find((x) => x.id === offerId);
  if (!o || o.status !== 'accepted' || !g.players[o.playerId] || g.players[o.playerId].clubId !== o.to) return { ok: false, msg: 'Offer no longer valid.' };
  if (!windowOpen(g)) { o.status = 'collapsed'; return { ok: false, msg: 'The window closed before the deal was completed.' }; }
  const user = g.clubs[g.userClubId];
  if (o.fee > user.transferBudget) return { ok: false, msg: 'Not enough transfer budget.' };
  if (!canAffordWage(g, user.id, o.wage)) return { ok: false, msg: `This signing would break your wage budget (${fmtMoney(user.wageBudget)}/wk). Ask the board for more or free up wages.` };
  completeTransfer(g, o.playerId, o.from, o.fee, o.wage);
  o.status = 'done';
  return { ok: true, msg: `${fullName(g.players[o.playerId])} has signed!` };
}

export function completeTransfer(g: GameState, playerId: number, toId: number, fee: number, wage: number, years = 0) {
  const p = g.players[playerId];
  const fromId = p.clubId;
  const to = g.clubs[toId];
  if (to.isUser) noteSigning(g, fee, marketValue(p, g.date));
  else if (fromId === g.userClubId) note(g, 'negotiating', fee >= marketValue(p, g.date) ? 1.5 : 0.8);
  if (fromId !== null) {
    const from = g.clubs[fromId];
    from.balance += fee;
    from.seasonIncome += fee;
    from.transferBudget += Math.round(fee * (from.isUser ? 0.75 : 0.6));
    from.lineup = from.lineup.map((id) => (id === playerId ? null : id));
    from.subs = from.subs.filter((id) => id !== playerId);
  }
  to.balance -= fee;
  to.seasonExpense += fee;
  to.transferBudget = Math.max(0, to.transferBudget - fee);
  // archive stats for the old club
  if (p.stats.apps > 0 && fromId !== null) {
    p.history.push({ season: g.season, clubId: fromId, apps: p.stats.apps, goals: p.stats.goals, avg: p.stats.apps ? p.stats.ratingSum / p.stats.apps : 0 });
    p.stats = emptyStats();
  }
  p.clubId = toId;
  // Keep the same number if it's free at the new club
  const keep = p.shirt !== undefined && !Object.values(g.players).some((x) => x !== p && x.clubId === toId && x.shirt === p.shirt) ? p.shirt : undefined;
  releaseShirt(p);
  p.shirt = keep;
  assignShirtNumbers(g, toId);
  // Signings for meta clubs get the meta attribute profile
  if (isMetaClub(to, g)) applyMetaProfile(p);
  registerNewSigning(g, p);
  p.squad = 'first';
  p.wage = wage;
  const a = age(p, g.date);
  p.contractEnd = g.season + (years || (a >= 31 ? 2 : a >= 28 ? 3 : 4)) + (month(g.date) >= 7 ? 0 : -1) + 1;
  p.listed = false;
  p.joined = g.date;
  p.morale = Math.min(100, p.morale + 10);
  g.transfers.push({ date: g.date, playerId, name: fullName(p), from: fromId, to: toId, fee });
  for (const o of g.offers) if (o.playerId === playerId && (o.status === 'pending' || o.status === 'countered' || o.status === 'accepted')) o.status = 'collapsed';
  if (fromId !== null && g.clubs[fromId].isUser) {
    sendMessage(g, { from: 'Director of Football', kind: 'transfer', title: `${fullName(p)} sold`, body: `${fullName(p)} has completed a ${fee ? fmtMoney(fee) : 'free'} move to ${to.name}.` });
  }
}

export function signFreeAgent(g: GameState, playerId: number): { ok: boolean; msg: string } {
  const user = g.clubs[g.userClubId];
  const p = g.players[playerId];
  if (p.clubId !== null) return { ok: false, msg: 'Not a free agent.' };
  if (g.mode === 'journey') return { ok: false, msg: 'In The Journey your director of football handles signings: use Recruitment.' };
  const interest = playerInterest(g, p, user);
  if (!interest.ok) return { ok: false, msg: interest.reason };
  const wage = wageDemand(g, p, user);
  if (!canAffordWage(g, user.id, wage)) return { ok: false, msg: `Not enough room in the wage budget (${fmtMoney(wage)}/wk needed).` };
  completeTransfer(g, playerId, user.id, 0, wage, 2);
  return { ok: true, msg: `${fullName(p)} signs on a free transfer!` };
}

export function releasePlayer(g: GameState, playerId: number): { ok: boolean; msg: string } {
  const p = g.players[playerId];
  if (p.clubId === null) return { ok: false, msg: '' };
  // A loanee goes back to his club instead
  if (p.loan) { const back = g.clubs[p.loan.from]?.name; endLoan(g, p); return { ok: true, msg: `${fullName(p)}'s loan has ended: he goes back to ${back}.` }; }
  const club = g.clubs[p.clubId];
  const weeksLeft = Math.max(0, (p.contractEnd - g.season) * 52 - 26);
  const payoff = Math.round(p.wage * weeksLeft * 0.5);
  club.balance -= payoff;
  club.seasonExpense += payoff;
  club.lineup = club.lineup.map((id) => (id === playerId ? null : id));
  club.subs = club.subs.filter((id) => id !== playerId);
  g.transfers.push({ date: g.date, playerId, name: fullName(p), from: club.id, to: null, fee: 0 });
  p.clubId = null;
  p.listed = false;
  p.contractEnd = g.season;
  return { ok: true, msg: `${fullName(p)} released. Pay-off: ${fmtMoney(payoff)}.` };
}

export function renewDemand(g: GameState, p: Player) {
  const club = g.clubs[p.clubId!];
  return roundMoney(Math.max(p.wage * 1.05, wageFor(overall(p), club.reputation)));
}

export function renewContract(g: GameState, playerId: number, years: number): { ok: boolean; msg: string } {
  const p = g.players[playerId];
  const club = g.clubs[p.clubId!];
  if (p.morale < 25) return { ok: false, msg: `${fullName(p)} is unhappy and refuses to discuss a new deal.` };
  const wage = renewDemand(g, p);
  if (!canAffordWage(g, club.id, wage, p.wage)) return { ok: false, msg: `The new deal (${fmtMoney(wage)}/wk) would exceed the wage budget.` };
  p.wage = wage;
  p.contractEnd = g.season + years + (month(g.date) >= 7 ? 1 : 0);
  p.morale = Math.min(100, p.morale + 8);
  return { ok: true, msg: `${fullName(p)} signs a new ${years}-year deal at ${fmtMoney(wage)}/wk.` };
}

// ---------------- AI market ----------------

function weakestSlot(g: GameState, club: Club, squad: Player[]) {
  const { lineup } = pickLineup(club, squad, false);
  const slots = FORMATIONS[club.tactics.formation];
  let worst = { idx: 0, r: 999 };
  lineup.forEach((id, i) => {
    const r = id === null ? 0 : ratingAt(g.players[id], slots[i].pos);
    if (r < worst.r) worst = { idx: i, r };
  });
  return { pos: slots[worst.idx].pos, rating: worst.r };
}

export function aiTransfers(g: GameState) {
  if (!windowOpen(g)) return;
  const attempts = month(g.date) === 1 ? 2 : 4;
  // Transfer-only clubs (CM 01/02) sell but never buy
  const clubs = Object.values(g.clubs).filter((c) => !c.isUser && !isTransferOnly(c) && c.transferBudget > budget(50_000));
  if (!clubs.length) return;
  // Index players by position group once
  const all = Object.values(g.players);
  for (let i = 0; i < attempts; i++) {
    const buyer = weighted(clubs, (c) => c.reputation);
    const squad = all.filter((p) => p.clubId === buyer.id && p.squad === 'first');
    if (squad.length >= 30) continue;
    const nonEu = squad.filter((p) => !isEu(p)).length;
    const weak = weakestSlot(g, buyer, squad);
    const group = POS_GROUP[weak.pos];
    let best: Player | null = null;
    let bestScore = -1;
    for (let k = 0; k < 220; k++) {
      const p = all[Math.floor(rand() * all.length)];
      if (p.clubId === buyer.id || POS_GROUP[p.pos] !== group || p.squad === 'youth') continue;
      if (p.clubId !== null && g.clubs[p.clubId].isUser) continue; // user players handled via offers
      if (p.loan || p.preContract) continue;
      if (g.era && !permitCheck(g, p, buyer, nonEu).ok) continue;
      const r = ratingAt(p, weak.pos);
      if (r < weak.rating + 2) continue;
      const a = age(p, g.date);
      if (a > 32) continue;
      const seller = p.clubId !== null ? g.clubs[p.clubId] : null;
      if (seller && seller.reputation > buyer.reputation + 8) continue;
      // Cheap estimate while searching (the exact asking price scans the seller's squad)
      const fee = p.clubId === null ? 0 : marketValue(p, g.date) * (p.listed ? 0.85 : 1.15);
      if (fee > buyer.transferBudget) continue;
      if (p.clubId === null && !playerInterest(g, p, buyer).ok) continue;
      const score = r - Math.max(0, a - 27) * 1.2 + (p.clubId === null ? 1 : 0);
      if (score > bestScore) { bestScore = score; best = p; }
    }
    if (!best) continue;
    if (best.clubId !== null && !isTransferOnly(g.clubs[best.clubId])) {
      const sellerSquad = all.filter((p) => p.clubId === best!.clubId && p.squad === 'first');
      if (sellerSquad.length <= 18) continue;
    }
    const fee = best.clubId === null ? 0 : askingPrice(g, best);
    if (fee > buyer.transferBudget) continue;
    completeTransfer(g, best.id, buyer.id, fee, wageDemand(g, best, buyer));
  }
  // Squad trimming: AI clubs with bloated squads release their weakest
  if (chance(0.3)) {
    const c = pick(clubs);
    const squad = all.filter((p) => p.clubId === c.id && p.squad === 'first');
    if (squad.length > 29) {
      const worst = squad.sort((a, b) => overall(a) - overall(b))[0];
      releasePlayer(g, worst.id);
    }
  }
}

/** AI clubs occasionally bid for the user's players. */
export function aiBidsForUser(g: GameState) {
  if (!windowOpen(g)) return;
  const user = g.clubs[g.userClubId];
  const squad = squadOf(g, user.id).filter((p) => !p.loan); // loanees aren't yours to sell
  const listed = squad.filter((p) => p.listed);
  const pChance = 0.05 + listed.length * 0.04;
  if (!chance(pChance)) return;
  const target = listed.length && chance(0.6) ? pick(listed) : weighted(squad, (p) => Math.pow(overall(p), 2));
  if (!target) return;
  if (g.offers.some((o) => o.playerId === target.id && o.status === 'pending')) return;
  const value = marketValue(target, g.date);
  const buyers = Object.values(g.clubs).filter((c) => !c.isUser && c.transferBudget >= value * 0.8 && c.reputation >= user.reputation - 15 && playerInterest(g, target, c).ok);
  if (!buyers.length) return;
  const buyer = pick(buyers);
  const fee = roundMoney(value * (target.listed ? 0.75 + rand() * 0.3 : 0.9 + rand() * 0.45));
  if (fee > buyer.transferBudget) return;
  const o: Offer = { id: nextId(g), playerId: target.id, from: buyer.id, to: user.id, fee, wage: 0, status: 'pending', date: g.date, respondBy: addDays(g.date, 4) };
  g.offers.push(o);
  offerAction(g, o.id, `${buyer.name} bid ${fmtMoney(fee)} for ${fullName(target)}`, `${buyer.name} have submitted a ${fmtMoney(fee)} offer for ${fullName(target)} (valued at ${fmtMoney(value)}${g.era ? '' : `, ${overall(target)} overall`}).\n\nYou need to respond before the game can continue.`, buyer.name);
}

export function respondIncoming(g: GameState, offerId: number, accept: boolean): { ok: boolean; msg: string } {
  const o = g.offers.find((x) => x.id === offerId);
  if (!o || o.status !== 'pending' || !g.players[o.playerId] || g.players[o.playerId].clubId !== o.to) return { ok: false, msg: 'Offer no longer valid.' };
  if (!accept) { o.status = 'rejected'; closeOfferAction(g, offerId, 'You rejected the offer.'); return { ok: true, msg: 'Offer rejected.' }; }
  if (!windowOpen(g)) { o.status = 'collapsed'; closeOfferAction(g, offerId, 'The window closed before the deal could go through.'); return { ok: false, msg: 'The window has closed.' }; }
  const p = g.players[o.playerId];
  const buyer = g.clubs[o.from];
  if (o.kind === 'loan') {
    startLoan(g, p, buyer.id);
    o.status = 'done';
    closeOfferAction(g, offerId, `${fullName(p)} has gone on loan to ${buyer.name} until the end of the season.`);
    return { ok: true, msg: `${fullName(p)} goes on loan to ${buyer.name}.` };
  }
  completeTransfer(g, p.id, buyer.id, o.fee, wageDemand(g, p, buyer));
  o.status = 'done';
  closeOfferAction(g, offerId, `${fullName(p)} sold to ${buyer.name} for ${fmtMoney(o.fee)}.`);
  return { ok: true, msg: `${fullName(p)} sold to ${buyer.name} for ${fmtMoney(o.fee)}.` };
}

export function expireOffers(g: GameState) {
  for (const o of g.offers) {
    if (!g.players[o.playerId] && (o.status === 'pending' || o.status === 'accepted' || o.status === 'countered')) { o.status = 'collapsed'; continue; }
    if (o.status === 'pending' && o.to === g.userClubId && o.respondBy && o.respondBy < g.date && !g.inbox.some((m) => m.action?.status === 'open' && m.action.offerId === o.id)) o.status = 'rejected';
    if ((o.status === 'accepted' || o.status === 'countered') && !windowOpen(g) && (!o.kind || o.kind === 'transfer' || o.kind === 'loan')) o.status = 'collapsed';
    // Pre-contract talks lapse at the end of May, or once his club has given him a new deal
    if (o.status === 'accepted' && o.kind === 'pre' && (month(g.date) >= 6 || (g.players[o.playerId]?.contractEnd ?? 0) > g.season + 1)) o.status = 'collapsed';
  }
  // Keep the offers list small
  if (g.offers.length > 200) g.offers = g.offers.slice(-150);
}

// ---------------- Loans (CM 01/02 careers) ----------------

/** Send `p` on a season-long loan to `toId`. */
export function startLoan(g: GameState, p: Player, toId: number) {
  const from = p.clubId!;
  const parent = g.clubs[from];
  parent.lineup = parent.lineup.map((id) => (id === p.id ? null : id));
  parent.subs = parent.subs.filter((id) => id !== p.id);
  p.loan = { from, until: `${g.season + 1}-06-30` };
  p.clubId = toId;
  p.squad = 'first';
  p.listed = false;
  p.loanListed = false;
  p.joined = g.date;
  releaseShirt(p);
  assignShirtNumbers(g, toId);
  g.transfers.push({ date: g.date, playerId: p.id, name: fullName(p), from, to: toId, fee: 0, loan: true });
}

/** Bring a loanee back to his club. */
export function endLoan(g: GameState, p: Player) {
  if (!p.loan) return;
  const here = p.clubId !== null ? g.clubs[p.clubId] : null;
  if (here) {
    here.lineup = here.lineup.map((id) => (id === p.id ? null : id));
    here.subs = here.subs.filter((id) => id !== p.id);
  }
  const back = p.loan.from;
  p.loan = undefined;
  p.clubId = g.clubs[back] ? back : null;
  p.squad = 'first';
  releaseShirt(p);
  if (p.clubId !== null) assignShirtNumbers(g, p.clubId);
}

/** Ask to borrow another club's player until the end of the season; they answer the next day. */
export function userLoanOffer(g: GameState, playerId: number): { ok: boolean; msg: string } {
  const user = g.clubs[g.userClubId];
  const p = g.players[playerId];
  if (!g.era) return { ok: false, msg: 'Loans are part of CM 01/02 careers.' };
  if (!p || p.clubId === null) return { ok: false, msg: 'Free agents can be signed instead.' };
  if (p.clubId === user.id) return { ok: false, msg: 'That player is already at your club.' };
  if (!windowOpen(g)) return { ok: false, msg: 'The transfer window is closed. It reopens in January / July.' };
  if (p.loan) return { ok: false, msg: `${fullName(p)} is already on loan at ${g.clubs[p.clubId].name}.` };
  if (p.preContract) return { ok: false, msg: `${fullName(p)} has agreed to join ${g.clubs[p.preContract.clubId]?.name ?? 'another club'} in the summer.` };
  if (g.offers.some((o) => o.playerId === playerId && o.from === user.id && o.status === 'pending')) return { ok: false, msg: 'You already have an offer in for this player.' };
  // Players happily go out on loan to smaller clubs for games: no "step down" refusal here
  const permit = permitCheck(g, p, user);
  if (!permit.ok) return { ok: false, msg: permit.msg };
  if (!canAffordWage(g, user.id, p.wage)) return { ok: false, msg: `His wages (${fmtMoney(p.wage)}/wk) would break your wage budget.` };
  g.offers.push({ id: nextId(g), playerId, from: user.id, to: p.clubId, fee: 0, wage: p.wage, status: 'pending', date: g.date, respondBy: addDays(g.date, 1), kind: 'loan' });
  return { ok: true, msg: `Loan offer sent to ${g.clubs[p.clubId].name}. Expect a reply tomorrow.` };
}

/** Would `club` let `p` go on loan? Not their key players; youngsters and fringe players yes. */
function loanable(g: GameState, p: Player, club: Club): string {
  if (isTransferOnly(club)) return '';
  const squad = squadOf(g, club.id);
  if (squad.length <= 18) return `${club.name} can't spare any players.`;
  const better = squad.filter((x) => x.id !== p.id && POS_GROUP[x.pos] === POS_GROUP[p.pos] && overall(x) > overall(p)).length;
  const top11 = [...squad].sort((a, b) => overall(b) - overall(a)).slice(0, 11).some((x) => x.id === p.id);
  if (better < 2 && top11) return `${club.name} see ${fullName(p)} as a key player and won't let him go on loan.`;
  if (top11 && age(p, g.date) > 21) return `${club.name} want to keep ${fullName(p)} for their first team.`;
  return '';
}

/** Your loan offers get their answer. */
export function respondToLoanOffers(g: GameState) {
  const user = g.clubs[g.userClubId];
  for (const o of g.offers) {
    if (o.kind !== 'loan' || o.status !== 'pending' || o.from !== user.id || (o.respondBy && o.respondBy > g.date)) continue;
    const p = g.players[o.playerId];
    if (!p || p.clubId !== o.to || p.loan) { o.status = 'collapsed'; continue; }
    const club = g.clubs[o.to];
    const no = loanable(g, p, club) || (!windowOpen(g) ? 'The window has closed.' : '') || (!canAffordWage(g, user.id, p.wage) ? `His wages would break your wage budget.` : '');
    if (no) {
      o.status = 'rejected';
      sendMessage(g, { from: club.name, kind: 'transfer', title: `Loan request for ${fullName(p)} turned down`, body: no });
      continue;
    }
    startLoan(g, p, user.id);
    o.status = 'done';
    sendMessage(g, { from: club.name, kind: 'transfer', title: `${fullName(p)} joins on loan`, body: `${club.name} have agreed to loan ${fullName(p)} to ${user.name} until the end of the season. You pay his wages (${fmtMoney(p.wage)}/week).` });
  }
}

/** Other clubs ask to borrow your loan-listed players (you accept or reject in the inbox). */
export function aiLoanOffersForUser(g: GameState) {
  if (!g.era || !windowOpen(g)) return;
  const user = g.clubs[g.userClubId];
  const listed = Object.values(g.players).filter((p) => p.clubId === user.id && p.loanListed && !p.loan);
  for (const p of listed) {
    if (!chance(0.06) || g.offers.some((o) => o.playerId === p.id && o.status === 'pending')) continue;
    const ovr = overall(p);
    const clubs = Object.values(g.clubs).filter((c) => !c.isUser && !isTransferOnly(c) && g.leagues.some((l) => l.clubIds.includes(c.id)) && c.reputation <= user.reputation + 5 && c.reputation >= user.reputation - 40 && permitCheck(g, p, c).ok);
    // Somewhere he'd play: a club whose level is around his
    const fits = clubs.filter((c) => Math.abs(c.reputation * 0.35 + 40 - ovr) < 12);
    const to = fits.length ? pick(fits) : null;
    if (!to) continue;
    const o: Offer = { id: nextId(g), playerId: p.id, from: to.id, to: user.id, fee: 0, wage: p.wage, status: 'pending', date: g.date, respondBy: addDays(g.date, 4), kind: 'loan' };
    g.offers.push(o);
    loanAction(g, o.id, `${to.name} want ${fullName(p)} on loan`, `${to.name} would like to take ${fullName(p)} on loan until the end of the season, paying his wages.\n\nYou need to respond before the game can continue.`, to.name);
  }
}

/** Computer clubs loan out youngsters who aren't getting games (late August and January). */
export function aiLoans(g: GameState) {
  if (!g.era || (g.date.slice(5) !== '08-20' && g.date.slice(5) !== '01-10')) return;
  const byClub = new Map<number, Player[]>();
  for (const p of Object.values(g.players)) if (p.clubId !== null) (byClub.get(p.clubId) ?? byClub.set(p.clubId, []).get(p.clubId)!).push(p);
  const leagueClubs = Object.values(g.clubs).filter((c) => !c.isUser && g.leagues.some((l) => l.clubIds.includes(c.id)));
  for (const club of leagueClubs) {
    if (club.reputation < 55) continue;
    const squad = (byClub.get(club.id) ?? []).filter((p) => p.squad === 'first' && !p.loan);
    if (squad.length <= 22) continue;
    const keep = new Set([...squad].sort((a, b) => overall(b) - overall(a)).slice(0, 18).map((p) => p.id));
    const kids = squad.filter((p) => !keep.has(p.id) && age(p, g.date) <= 21 && !p.preContract).slice(0, 2);
    for (const p of kids) {
      const to = leagueClubs.filter((c) => c.country === club.country && c.reputation < club.reputation - 8 && c.reputation > club.reputation - 40 && (byClub.get(c.id)?.length ?? 0) < 26);
      if (!to.length) continue;
      startLoan(g, p, pick(to).id);
    }
  }
}
