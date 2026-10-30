// CM 01/02 transfer add-ons: part-exchange, sell-on and appearance fees, release and relegation clauses.
import { existsSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { scramble } from '../src/game/cm0102/pack';
import { CM_BUILTIN } from '../src/game/cm0102/parse';
import { createWorld, squadOf } from '../src/game/generate';
import { age, marketValue, overall } from '../src/game/ratings';
import { advanceDay, quickPlayUserMatch, startSeason } from '../src/game/season';
import { autoResolveActions } from '../src/game/actions';
import { addOnValue, appearanceMade, askingPrice, clauseAppeal, completeTransfer, confirmTransfer, dealDemand, expectedRole, offerContract, preferredYears, relegationReleases, releaseClauseBids, userBid } from '../src/game/transfers';
import { permitCheck } from '../src/game/permits';
import type { GameState } from '../src/game/types';

const DB = `public/${CM_BUILTIN}`;
const day = (g: GameState) => { const r = advanceDay(g); if (!r.ok && r.reason === 'match') quickPlayUserMatch(g); else if (!r.ok && r.reason === 'action') autoResolveActions(g); };

describe.skipIf(!existsSync(DB))('CM 01/02 transfer add-ons', () => {
  it('part-exchange, sell-on, appearance fees and contract clauses', () => {
    const cm = JSON.parse(gunzipSync(scramble(Buffer.from(readFileSync(DB, 'utf8'), 'base64'))).toString());
    const g = createWorld({ mode: 'classic', manager: 'T', clubName: 'Middlesbrough', slot: 't', seed: 41, cm });
    startSeason(g);
    const user = g.clubs[g.userClubId];
    user.transferBudget = 30_000_000;
    user.wageBudget = 5_000_000;
    // A first-division player, bought with a part-exchange that makes up the rest of the price
    const seller = Object.values(g.clubs).find((c) => c.leagueId === 'ENG2' && c.reputation > 50)!;
    const target = squadOf(g, seller.id).filter((p) => permitCheck(g, p, user).ok && age(p, g.date) <= 24).sort((a, b) => overall(b) - overall(a))[0];
    const ask = askingPrice(g, target);
    const swap = squadOf(g, user.id).filter((p) => !p.loan && p.pos !== 'GK').sort((a, b) => overall(a) - overall(b))[Math.floor(squadOf(g, user.id).length / 2)];
    const offer = { swap: swap.id, sellOn: 20, appsFee: { fee: 200_000, apps: 25 } };
    expect(userBid(g, target.id, Math.round(ask * 0.5), offer).ok).toBe(true);
    const o = g.offers.at(-1)!;
    expect(addOnValue(g, o, target)).toBeGreaterThan(0);
    day(g); day(g);
    // Accepted, or countered with the add-ons kept in
    if (o.status === 'countered') { o.fee = o.counter!; o.status = 'accepted'; }
    expect(o.status).toBe('accepted');
    const terms = { wage: Math.round(dealDemand(g, o, target) * 1.3), years: preferredYears(g, target), bonus: 0, role: expectedRole(g, target, user), release: 20_000_000, relegation: true };
    expect(offerContract(g, o.id, terms).ok).toBe(true);
    day(g); day(g);
    expect(o.contract!.state).toBe('agreed');
    expect(confirmTransfer(g, o.id).ok).toBe(true);
    expect(target.clubId).toBe(user.id);
    expect(swap.clubId).toBe(seller.id); // went the other way
    expect(target.sellOn).toEqual({ clubId: seller.id, pct: 20 });
    expect(target.appsFee).toMatchObject({ clubId: seller.id, payer: user.id, fee: 200_000, apps: 25, done: 0 });
    expect(target.clauses).toEqual({ release: 20_000_000, relegation: true });

    // Appearance fee falls due after 25 games
    const before = seller.balance;
    for (let i = 0; i < 25; i++) appearanceMade(g, target);
    expect(target.appsFee).toBeUndefined();
    expect(seller.balance - before).toBe(200_000);

    // Selling him on: 20% of the fee goes back to the old club
    const buyer = Object.values(g.clubs).find((c) => c.leagueId === 'ENG1' && !c.isUser)!;
    const sb = seller.balance, ub = user.balance;
    completeTransfer(g, target.id, buyer.id, 5_000_000, target.wage);
    expect(seller.balance - sb).toBe(1_000_000);
    expect(user.balance - ub).toBe(4_000_000);
    expect(target.sellOn).toBeUndefined();
    expect(target.clauses).toBeUndefined();

    // Clauses sweeten a contract: a release fee near his value most
    const p = squadOf(g, user.id)[3];
    const v = marketValue(p, g.date);
    expect(clauseAppeal(g, p, { release: v * 1.5 })).toBeGreaterThan(clauseAppeal(g, p, { release: v * 3 }));
    expect(clauseAppeal(g, p, { relegation: true })).toBeGreaterThan(0);

    // A release fee a big club can afford gets met
    const star = squadOf(g, user.id).filter((x) => !x.loan).sort((a, b) => overall(b) - overall(a))[0];
    star.clauses = { release: Math.round(marketValue(star, g.date) * 1.2) };
    for (let i = 0; i < 200 && star.clubId === user.id; i++) releaseClauseBids(g);
    expect(star.clubId).not.toBe(user.id);
    expect(g.inbox.some((m) => /release clause/.test(m.title))).toBe(true);

    // Relegation: players with the clause walk away
    const walker = squadOf(g, user.id).filter((x) => !x.loan)[2];
    walker.clauses = { relegation: true };
    expect(relegationReleases(g, user.id)).toContain(`${walker.first} ${walker.last}`.trim());
    expect(walker.clubId).toBeNull();
  }, 300000);
});
