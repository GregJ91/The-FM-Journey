import { assignShirtNumbers, releaseShirt } from './shirts';
import { applyMetaProfile, isMetaClub } from './meta';
import { closeOfferAction, offerAction, registerNewSigning } from './actions';
import { addDays, inTransferWindow, month } from './dates';
import { emptyStats, nextId, squadOf, wageBill } from './generate';
import { age, fmtMoney, fullName, marketValue, overall, ratingAt, roundMoney, wageFor } from './ratings';
import { chance, pick, rand, weighted } from './rng';
import { pickLineup } from './selection';
import { FORMATIONS } from './formations';
import type { Club, GameState, Offer, Player } from './types';
import { POS_GROUP } from './ratings';
import { sendMessage } from './inbox';

export function askingPrice(g: GameState, p: Player) {
  const v = marketValue(p, g.date);
  if (p.clubId === null) return 0;
  const club = g.clubs[p.clubId];
  const squad = squadOf(g, club.id);
  const better = squad.filter((x) => x.id !== p.id && POS_GROUP[x.pos] === POS_GROUP[p.pos] && overall(x) > overall(p)).length;
  const keyPlayer = better <= 1 ? 0.35 : better <= 3 ? 0.15 : 0;
  const mult = p.listed ? 0.85 : 1.15 + keyPlayer;
  return roundMoney(Math.max(5_000, v * mult));
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

export function userBid(g: GameState, playerId: number, fee: number): { ok: boolean; msg: string } {
  const user = g.clubs[g.userClubId];
  const p = g.players[playerId];
  if (!p || p.clubId === null) return { ok: false, msg: 'Player not available.' };
  if (p.clubId === user.id) return { ok: false, msg: 'That player is already at your club.' };
  if (!windowOpen(g)) return { ok: false, msg: 'The transfer window is closed. It reopens in January / July.' };
  if (fee > user.transferBudget) return { ok: false, msg: `That exceeds your transfer budget of ${fmtMoney(user.transferBudget)}.` };
  if (g.offers.some((o) => o.playerId === playerId && o.from === user.id && (o.status === 'pending' || o.status === 'accepted'))) {
    return { ok: false, msg: 'You already have an active bid for this player.' };
  }
  const interest = playerInterest(g, p, user);
  if (!interest.ok) return { ok: false, msg: interest.reason };
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
    if (o.status !== 'pending' || o.from !== g.userClubId || (o.respondBy && o.respondBy > g.date)) continue;
    const p = g.players[o.playerId];
    if (!p || p.clubId !== o.to) { o.status = 'collapsed'; continue; }
    const ask = askingPrice(g, p);
    const seller = g.clubs[o.to];
    if (o.fee >= ask) {
      o.status = 'accepted';
      sendMessage(g, { from: seller.name, kind: 'transfer', title: `Bid accepted for ${fullName(p)}`, body: `${seller.name} have accepted your ${fmtMoney(o.fee)} offer for ${fullName(p)}. Agree personal terms (${fmtMoney(o.wage)}/week) from the Transfers screen to complete the deal.`, offerId: o.id });
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
  if (isMetaClub(to)) applyMetaProfile(p);
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
  const clubs = Object.values(g.clubs).filter((c) => !c.isUser && c.transferBudget > 50_000);
  if (!clubs.length) return;
  // Index players by position group once
  const all = Object.values(g.players);
  for (let i = 0; i < attempts; i++) {
    const buyer = weighted(clubs, (c) => c.reputation);
    const squad = all.filter((p) => p.clubId === buyer.id && p.squad === 'first');
    if (squad.length >= 30) continue;
    const weak = weakestSlot(g, buyer, squad);
    const group = POS_GROUP[weak.pos];
    let best: Player | null = null;
    let bestScore = -1;
    for (let k = 0; k < 220; k++) {
      const p = all[Math.floor(rand() * all.length)];
      if (p.clubId === buyer.id || POS_GROUP[p.pos] !== group || p.squad === 'youth') continue;
      if (p.clubId !== null && g.clubs[p.clubId].isUser) continue; // user players handled via offers
      const r = ratingAt(p, weak.pos);
      if (r < weak.rating + 2) continue;
      const a = age(p, g.date);
      if (a > 32) continue;
      const seller = p.clubId !== null ? g.clubs[p.clubId] : null;
      if (seller && seller.reputation > buyer.reputation + 8) continue;
      const fee = p.clubId === null ? 0 : askingPrice(g, p);
      if (fee > buyer.transferBudget) continue;
      if (p.clubId === null && !playerInterest(g, p, buyer).ok) continue;
      const score = r - Math.max(0, a - 27) * 1.2 + (p.clubId === null ? 1 : 0);
      if (score > bestScore) { bestScore = score; best = p; }
    }
    if (!best) continue;
    if (best.clubId !== null) {
      const sellerSquad = all.filter((p) => p.clubId === best!.clubId && p.squad === 'first');
      if (sellerSquad.length <= 18) continue;
    }
    const fee = best.clubId === null ? 0 : askingPrice(g, best);
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
  const squad = squadOf(g, user.id);
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
  offerAction(g, o.id, `${buyer.name} bid ${fmtMoney(fee)} for ${fullName(target)}`, `${buyer.name} have submitted a ${fmtMoney(fee)} offer for ${fullName(target)} (valued at ${fmtMoney(value)}, ${overall(target)} overall).\n\nYou need to respond before the game can continue.`, buyer.name);
}

export function respondIncoming(g: GameState, offerId: number, accept: boolean): { ok: boolean; msg: string } {
  const o = g.offers.find((x) => x.id === offerId);
  if (!o || o.status !== 'pending' || !g.players[o.playerId] || g.players[o.playerId].clubId !== o.to) return { ok: false, msg: 'Offer no longer valid.' };
  if (!accept) { o.status = 'rejected'; closeOfferAction(g, offerId, 'You rejected the offer.'); return { ok: true, msg: 'Offer rejected.' }; }
  if (!windowOpen(g)) { o.status = 'collapsed'; closeOfferAction(g, offerId, 'The window closed before the deal could go through.'); return { ok: false, msg: 'The window has closed.' }; }
  const p = g.players[o.playerId];
  const buyer = g.clubs[o.from];
  completeTransfer(g, p.id, buyer.id, o.fee, wageDemand(g, p, buyer));
  o.status = 'done';
  closeOfferAction(g, offerId, `${fullName(p)} sold to ${buyer.name} for ${fmtMoney(o.fee)}.`);
  return { ok: true, msg: `${fullName(p)} sold to ${buyer.name} for ${fmtMoney(o.fee)}.` };
}

export function expireOffers(g: GameState) {
  for (const o of g.offers) {
    if (!g.players[o.playerId] && (o.status === 'pending' || o.status === 'accepted' || o.status === 'countered')) { o.status = 'collapsed'; continue; }
    if (o.status === 'pending' && o.to === g.userClubId && o.respondBy && o.respondBy < g.date && !g.inbox.some((m) => m.action?.status === 'open' && m.action.offerId === o.id)) o.status = 'rejected';
    if ((o.status === 'accepted' || o.status === 'countered') && !windowOpen(g)) o.status = 'collapsed';
  }
  // Keep the offers list small
  if (g.offers.length > 200) g.offers = g.offers.slice(-150);
}
