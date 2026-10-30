// CM 01/02 careers: scout reports in words, one reason why you can't bid, the inbox "To do" list and the starter guide.
import { existsSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { needsMove } from '../src/game/actions';
import { scramble } from '../src/game/cm0102/pack';
import { CM_BUILTIN } from '../src/game/cm0102/parse';
import { createWorld, squadOf } from '../src/game/generate';
import { coverFromReserves } from '../src/game/selection';
import { permitCheck } from '../src/game/permits';
import { POS_GROUP, fullName, overall } from '../src/game/ratings';
import { scoutReport } from '../src/game/reports';
import { advanceDay, startSeason } from '../src/game/season';
import { bidBlocker, openTalks, userBid } from '../src/game/transfers';

const DB = `public/${CM_BUILTIN}`;
const dump = !!process.env.CM_DUMP;

describe.skipIf(!existsSync(DB))('CM 01/02 usability', () => {
  it('describes players in words and explains why a bid is blocked', () => {
    const cm = JSON.parse(gunzipSync(scramble(Buffer.from(readFileSync(DB, 'utf8'), 'base64'))).toString());
    const g = createWorld({ mode: 'classic', manager: 'T', clubName: 'Middlesbrough', slot: 't', seed: 2, cm });
    startSeason(g);
    const user = g.clubs[g.userClubId];
    const all = Object.values(g.players);
    const byName = (last: string, first?: string) => all.find((p) => p.last === last && (!first || p.first === first))!;

    // The fringe players start in the reserves: a 25-man first-team squad with cover everywhere
    const first = squadOf(g, user.id);
    expect(first.length).toBeLessThanOrEqual(25);
    expect(squadOf(g, user.id, 'reserve').length).toBeGreaterThan(0);
    const keepers = [...first, ...squadOf(g, user.id, 'reserve')].filter((p) => p.pos === 'GK').length;
    expect(first.filter((p) => p.pos === 'GK').length).toBe(Math.min(3, keepers));
    for (const r of squadOf(g, user.id, 'reserve')) {
      const same = first.filter((p) => POS_GROUP[p.pos] === POS_GROUP[r.pos] && !p.loan);
      expect(overall(r)).toBeLessThanOrEqual(Math.min(...same.map(overall)));
    }
    expect(user.lineup.every((id) => id === null || g.players[id].squad === 'first')).toBe(true);

    // Short of fit defenders: the assistant calls up reserves, only as many as needed
    const resDef = squadOf(g, user.id, 'reserve').filter((p) => POS_GROUP[p.pos] === 'DEF');
    if (resDef.length) {
      const defs = squadOf(g, user.id).filter((p) => POS_GROUP[p.pos] === 'DEF');
      for (const d of defs.slice(0, defs.length - 3)) d.injury = { name: 'Hamstring strain', days: 20 };
      const up = coverFromReserves(g, user.id);
      expect(up.length).toBeGreaterThan(0);
      expect(up.every((p) => p.squad === 'first')).toBe(true);
      expect(squadOf(g, user.id).filter((p) => POS_GROUP[p.pos] === 'DEF' && !p.injury).length).toBe(Math.min(5, 3 + resDef.length));
      expect(coverFromReserves(g, user.id)).toHaveLength(0); // nothing more needed
      for (const d of defs) d.injury = undefined;
    }

    // Starter guide on a new career
    expect(g.inbox.some((m) => m.title === 'Getting started')).toBe(true);

    // Reports: the best players read as world class, our own players get a coach report
    const henry = byName('Henry', 'Thierry');
    const rh = scoutReport(g, henry);
    expect(rh.from).toBe('Chief Scout');
    expect(rh.level).toMatch(/world-class|best players/);
    expect(rh.fit).toMatch(/walk into|key player/);
    expect(rh.strengths.length).toBeGreaterThan(0);
    const mine = squadOf(g, user.id).sort((a, b) => overall(a) - overall(b));
    expect(scoutReport(g, mine[mine.length - 1]).from).toBe('Assistant Manager');
    expect(scoutReport(g, mine[mine.length - 1]).fit).toMatch(/best players|regular/);
    const kid = all.filter((p) => p.clubId !== null && p.pa - overall(p) >= 20 && overall(p) < 60).sort((a, b) => b.pa - a.pa)[0];
    expect(scoutReport(g, kid).potential).toMatch(/world-class|top player|very good/);
    // No numbers anywhere in a report
    for (const p of [henry, kid, ...mine.slice(0, 5)]) expect(JSON.stringify(scoutReport(g, p))).not.toMatch(/\d/);
    if (dump) for (const p of [henry, kid, byName('Zidane'), byName('Beckham'), byName('Gerrard'), ...mine.slice(-3), ...mine.slice(0, 3)]) console.log(fullName(p), overall(p), p.pa, scoutReport(g, p));

    // One reason, the same on the profile and when you try to bid
    const noPermit = all.find((p) => p.clubId !== null && !permitCheck(g, p, user).ok && overall(p) < 60)!;
    expect(bidBlocker(g, noPermit)).toMatch(/work permit/);
    expect(userBid(g, noPermit.id, 100_000).msg).toBe(bidBlocker(g, noPermit));
    const ok = all.find((p) => p.clubId !== null && p.clubId !== user.id && !bidBlocker(g, p))!;
    expect(ok).toBeTruthy();

    // A deal waiting on your contract offer is on the "To do" list until you make it
    const free = all.find((p) => p.clubId === null && !bidBlocker(g, { ...p, clubId: -1 }) && permitCheck(g, p, user).ok)
      ?? all.find((p) => p.clubId === null && permitCheck(g, p, user).ok)!;
    const t = openTalks(g, free.id, 'free');
    if (t.ok) {
      g.inbox.unshift({ id: 999999, date: g.date, from: 'Agent', kind: 'transfer', title: 'Talks', body: '', read: false, offerId: t.offerId });
      expect(needsMove(g, g.inbox[0])).toBe(true);
    }
    advanceDay(g);
  }, 300000);
});
