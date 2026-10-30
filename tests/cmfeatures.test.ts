// CM 01/02 careers: League Cups, 2002 youth competitions, work permits and quotas, CM-style contracts
// (renewals, free agents, pre-contracts), loans, and free-agent housekeeping, played through a real season.
import { existsSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { autoResolveActions } from '../src/game/actions';
import { scramble } from '../src/game/cm0102/pack';
import { CM_BUILTIN } from '../src/game/cm0102/parse';
import { createWorld, squadOf } from '../src/game/generate';
import { isEu, permitCheck } from '../src/game/permits';
import { age, overall } from '../src/game/ratings';
import { advanceDay, quickPlayUserMatch, startSeason } from '../src/game/season';
import { confirmTransfer, dealDemand, playerInterest, expectedRole, offerContract, openTalks, preContractOpen, preferredYears, respondIncoming, userLoanOffer } from '../src/game/transfers';
import type { GameState, Player } from '../src/game/types';

const DB = `public/${CM_BUILTIN}`;

function playUntil(g: GameState, date: string) {
  for (let i = 0; i < 4000 && g.date < date; i++) {
    const r = advanceDay(g);
    if (!r.ok && r.reason === 'action') {
      // Accept loan requests for our players (to test loans out); everything else as the autopilot would
      for (const m of g.inbox.filter((x) => x.action?.status === 'open' && x.action.type === 'offer')) {
        const o = g.offers.find((x) => x.id === m.action!.offerId);
        if (o?.kind === 'loan') respondIncoming(g, o.id, true);
      }
      autoResolveActions(g);
      continue;
    }
    if (!r.ok && r.reason === 'match') { quickPlayUserMatch(g); continue; }
    if (!r.ok) throw new Error(`stuck: ${r.reason} on ${g.date}`);
  }
}

/** A generous offer he should accept. */
function goodTerms(g: GameState, offerId: number, p: Player) {
  const o = g.offers.find((x) => x.id === offerId)!;
  return { wage: Math.round(dealDemand(g, o, p) * 1.4), years: preferredYears(g, p), bonus: 0, role: expectedRole(g, p, g.clubs[g.userClubId]) };
}

describe.skipIf(!existsSync(DB))('CM 01/02 career features', () => {
  it('works through a full season', () => {
    const cm = JSON.parse(gunzipSync(scramble(Buffer.from(readFileSync(DB, 'utf8'), 'base64'))).toString());
    const g = createWorld({ mode: 'classic', manager: 'T', clubName: 'Middlesbrough', slot: 't', seed: 9, cm });
    const user = g.clubs[g.userClubId];
    startSeason(g);
    // Room to do every deal below (the season start sets budgets)
    user.transferBudget = 50_000_000;
    user.wageBudget = 5_000_000;
    const club = (n: string) => Object.values(g.clubs).find((c) => c.name === n)!;

    // --- League Cups and 2002 youth competitions ---
    const flc = g.cups.find((c) => c.id === 'FLC')!;
    const slc = g.cups.find((c) => c.id === 'SLC')!;
    expect(flc.name).toBe('Worthington Cup');
    expect(slc.name).toBe('CIS Insurance Cup');
    const engLeague = g.leagues.filter((l) => ['ENG1', 'ENG2', 'ENG3', 'ENG4'].includes(l.id)).flatMap((l) => l.clubIds).length;
    expect(flc.alive.length).toBe(engLeague); // no Conference clubs
    expect(flc.alive.some((id) => g.clubs[id].leagueId === 'ENG5')).toBe(false);
    expect(g.youth?.some((y) => y.name === 'FA Premier Academy League')).toBe(true);
    expect(g.youth?.some((y) => y.id === 'UYL')).toBe(false);
    expect(g.youth?.some((y) => /Premier League 2|EFL|Primavera 1/.test(y.name))).toBe(false);

    // --- Work permits and quotas ---
    const all = Object.values(g.players);
    const nonEuNoCaps = all.find((p) => !isEu(p) && (p.caps ?? 0) === 0 && p.clubId !== null && !['ENG', 'SCO'].includes(g.clubs[p.clubId].country))!;
    const nonEuStar = all.find((p) => !isEu(p) && (p.caps ?? 0) >= 20 && p.clubId !== null && !['ENG', 'SCO'].includes(g.clubs[p.clubId].country))!;
    const euNoCaps = all.find((p) => isEu(p) && p.nat !== 'ENG' && (p.caps ?? 0) === 0 && p.clubId !== null)!;
    expect(permitCheck(g, nonEuNoCaps, user).ok).toBe(false);
    expect(permitCheck(g, nonEuStar, user).ok).toBe(true);
    expect(permitCheck(g, euNoCaps, user).ok).toBe(true);
    const spanish = club('Real Madrid');
    const nonEuInSpain = all.filter((p) => p.clubId === spanish.id && !isEu(p)).length;
    if (nonEuInSpain >= 3) expect(permitCheck(g, nonEuStar, spanish).ok).toBe(false);

    // --- Renewal (CM-style talks) ---
    const mine = squadOf(g, user.id).filter((p) => !p.loan).sort((a, b) => overall(b) - overall(a));
    const renewP = mine[0];
    const renewT = openTalks(g, renewP.id, 'renew');
    expect(renewT.ok).toBe(true);
    // A lowball is refused with a reason; a fair offer is then accepted and the contract updated
    expect(offerContract(g, renewT.offerId!, { wage: Math.round(renewP.wage * 0.5), years: 2, bonus: 0, role: 'backup' }).ok).toBe(true);
    playUntil(g, '2002-07-03');
    const renewO = g.offers.find((o) => o.id === renewT.offerId)!;
    expect(renewO.contract!.state).toBe('rejected');
    expect(renewO.contract!.note).toMatch(/wants/);
    expect(offerContract(g, renewO.id, goodTerms(g, renewO.id, renewP)).ok).toBe(true);
    const endBefore = renewP.contractEnd;
    playUntil(g, '2002-07-05');
    expect(renewO.status).toBe('done');
    expect(renewP.contractEnd).toBeGreaterThanOrEqual(endBefore);

    // --- Free agent: talks, his answer, then confirm ---
    const freeP = Object.values(g.players).filter((p) => p.clubId === null && permitCheck(g, p, user).ok && age(p, g.date) < 30).sort((a, b) => overall(b) - overall(a))[0];
    const freeT = openTalks(g, freeP.id, 'free');
    expect(freeT.ok).toBe(true);
    expect(offerContract(g, freeT.offerId!, goodTerms(g, freeT.offerId!, freeP))).toMatchObject({ ok: true });
    playUntil(g, '2002-07-07');
    expect(g.offers.find((o) => o.id === freeT.offerId)!.contract!.state).toBe('agreed');
    expect(confirmTransfer(g, freeT.offerId!).ok).toBe(true);
    expect(freeP.clubId).toBe(user.id);

    // --- Loan in: a fringe youngster from a big club ---
    const bigSquad = squadOf(g, club('Manchester United').id).sort((a, b) => overall(b) - overall(a));
    const loanP = bigSquad.slice(18).find((p) => age(p, g.date) <= 21 && permitCheck(g, p, user).ok)!;
    const lo = userLoanOffer(g, loanP.id); if (!lo.ok) console.log('LOAN', lo.msg, loanP.last, age(loanP, g.date)); expect(lo.ok).toBe(true);
    playUntil(g, '2002-07-09');
    expect(loanP.clubId).toBe(user.id);
    expect(loanP.loan?.from).toBe(club('Manchester United').id);

    // --- Loan out: our loan-listed players get offers (accepted in playUntil) ---
    const spare = squadOf(g, user.id).filter((p) => !p.loan).sort((a, b) => overall(a) - overall(b)).slice(0, 4);
    for (const p of spare) p.loanListed = true;
    playUntil(g, '2002-08-25');
    const loanedOut = Object.values(g.players).filter((p) => p.loan?.from === user.id);
    expect(loanedOut.length).toBeGreaterThan(0);
    // Computer clubs loan out youngsters on 20 August
    expect(Object.values(g.players).filter((p) => p.loan && p.loan.from !== user.id && p.clubId !== user.id).length).toBeGreaterThan(10);

    // --- Pre-contract (from January) ---
    playUntil(g, '2003-02-02');
    const preP = Object.values(g.players).find((p) => preContractOpen(g, p) && permitCheck(g, p, user).ok && playerInterest(g, p, user).ok && overall(p) >= 60 && age(p, g.date) < 30 && g.leagues.some((l) => l.clubIds.includes(p.clubId!)))!;
    expect(preP).toBeTruthy();
    const preT = openTalks(g, preP.id, 'pre');
    expect(preT).toMatchObject({ ok: true });
    expect(offerContract(g, preT.offerId!, goodTerms(g, preT.offerId!, preP)).ok).toBe(true);
    playUntil(g, '2003-02-04');
    expect(confirmTransfer(g, preT.offerId!).ok).toBe(true);
    expect(preP.preContract?.clubId).toBe(user.id);
    const preFrom = preP.clubId;

    // --- Into next season ---
    playUntil(g, '2003-07-02');
    expect(flc.winner ?? g.history.at(-1)).toBeTruthy();
    expect(g.history.at(-1)!.winners.some((w) => w.comp === 'Worthington Cup')).toBe(true);
    expect(preP.clubId).toBe(user.id); // joined on a free
    expect(preFrom).not.toBe(user.id);
    expect(loanP.loan).toBeUndefined(); // loans over
    expect(loanP.clubId).not.toBe(user.id);
    // Our loanees came back (or left on a free if their contract also ran out this summer)
    for (const p of loanedOut) if (g.players[p.id]) { expect(g.players[p.id].loan).toBeUndefined(); expect([user.id, null]).toContain(g.players[p.id].clubId); }
    // Real young prospects are never deleted from the free-agent pool
    const freeProspects = Object.values(g.players).filter((p) => p.clubId === null && age(p, g.date) <= 23 && p.pa >= overall(p) + 6);
    expect(freeProspects.length).toBeGreaterThan(0);
  }, 900000);
});

describe.skipIf(!existsSync(DB))('CM 01/02 reserve team', () => {
  it('plays a reserve league with the reserve squad and fringe first-teamers', () => {
    const cm = JSON.parse(gunzipSync(scramble(Buffer.from(readFileSync(DB, 'utf8'), 'base64'))).toString());
    const g = createWorld({ mode: 'classic', manager: 'T', clubName: 'Arsenal', slot: 't', seed: 4, cm });
    startSeason(g);
    const user = g.clubs[g.userClubId];
    const res = g.youth!.find((c) => c.reserve && c.clubs.includes(user.id))!;
    expect(res.name).toBe('FA Premier Reserve League');
    expect(g.youth!.filter((c) => c.reserve).map((c) => c.name)).toEqual(expect.arrayContaining(['Pontins League Premier Division', 'SPL Reserve League']));
    // Send three senior players to the reserves: they leave the first team and play reserve games
    const already = squadOf(g, user.id, 'reserve').length; // the fringe players start there
    expect(already).toBeGreaterThan(0);
    const toRes = squadOf(g, user.id).sort((a, b) => overall(a) - overall(b)).slice(0, 3);
    for (const p of toRes) p.squad = 'reserve';
    expect(squadOf(g, user.id).some((p) => toRes.includes(p))).toBe(false);
    expect(squadOf(g, user.id, 'reserve')).toHaveLength(already + 3);
    playUntil(g, '2002-10-15');
    const mine = res.fixtures.filter((f) => (f.h === user.id || f.a === user.id) && f.hg !== undefined);
    expect(mine.length).toBeGreaterThan(3);
    // The reserve squad gets first claim on the reserve side: its best players have played
    const resSquad = squadOf(g, user.id, 'reserve').sort((a, b) => overall(b) - overall(a));
    expect(resSquad.slice(0, 8).filter((p) => (p.ys?.apps ?? 0) > 0).length).toBeGreaterThanOrEqual(6);
    // Reserve games are on Tuesdays, youth games on Mondays
    expect(new Date(res.fixtures[0].d).getUTCDay()).toBe(2);
    // Reserve players aren't picked for the first team
    for (const f of g.fixtures.filter((x) => x.result && (x.home === user.id || x.away === user.id))) {
      const ids = Object.keys(f.result!.ratings ?? {}).map(Number);
      for (const p of toRes) if (p.squad === 'reserve') expect(ids).not.toContain(p.id); // unless called up when short
    }
  }, 600000);
});
