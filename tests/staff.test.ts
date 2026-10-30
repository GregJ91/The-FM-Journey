// CM 01/02 careers: coaches, physios and scouts.
import { existsSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { scramble } from '../src/game/cm0102/pack';
import { CM_BUILTIN } from '../src/game/cm0102/parse';
import { createWorld, squadOf, wageBill } from '../src/game/generate';
import { startSeason } from '../src/game/season';
import { coachFactor, coachingLevel, hireStaff, myStaff, physioInjuryRisk, physioRecovery, releaseStaff, scoutError, staffLimits, staffMonthly } from '../src/game/staff';

const DB = `public/${CM_BUILTIN}`;

describe.skipIf(!existsSync(DB))('backroom staff', () => {
  it('coaches, physios and scouts change what happens', () => {
    const cm = JSON.parse(gunzipSync(scramble(Buffer.from(readFileSync(DB, 'utf8'), 'base64'))).toString());
    const g = createWorld({ mode: 'classic', manager: 'T', clubName: 'Middlesbrough', slot: 't', seed: 51, cm });
    startSeason(g);
    const club = g.clubs[g.userClubId];
    const lim = staffLimits(g);
    expect(myStaff(g, 'coach')).toHaveLength(lim.coach - 1);
    expect(myStaff(g, 'physio')).toHaveLength(1);
    expect(myStaff(g, 'scout')).toHaveLength(1);
    // Their wages are in the wage bill, and the board added them to the budget
    const staffPay = myStaff(g).reduce((t, s) => t + s.wage, 0);
    expect(wageBill(g, club.id)).toBe(squadOf(g, club.id, 'all').reduce((t, p) => t + p.wage, 0) + staffPay);
    expect(wageBill(g, club.id)).toBeLessThanOrEqual(club.wageBudget);

    // A top specialist coach makes players in his area develop faster
    club.wageBudget += 100_000;
    const striker = squadOf(g, club.id).find((p) => p.pos === 'ST')!;
    const before = coachFactor(g, striker);
    const level = coachingLevel(g);
    const star = g.staff!.filter((s) => s.clubId === null && s.role === 'coach').sort((a, b) => b.ability - a.ability)[0];
    star.ability = 20; star.focus = 'attacking';
    expect(hireStaff(g, star.id).ok).toBe(true);
    expect(coachFactor(g, striker)).toBeGreaterThan(before);
    expect(coachingLevel(g)).toBeGreaterThan(level);
    // ...up to the limit
    const another = g.staff!.find((s) => s.clubId === null && s.role === 'coach')!;
    expect(hireStaff(g, another.id).ok).toBe(false);

    // Physios: a great one gets players back sooner and keeps more fit; none at all is worse than average
    const ph = myStaff(g, 'physio')[0];
    ph.ability = 20;
    expect(physioRecovery(g)).toBeGreaterThan(0.4);
    expect(physioInjuryRisk(g)).toBeLessThan(0.9);
    expect(releaseStaff(g, ph.id).ok).toBe(true);
    expect(physioRecovery(g)).toBeLessThan(0);
    expect(physioInjuryRisk(g)).toBeGreaterThan(1.1);

    // Scouts: better judgement, and monthly reports from their area
    const sc = myStaff(g, 'scout')[0];
    sc.ability = 5;
    const poor = scoutError(g);
    sc.ability = 19;
    expect(scoutError(g)).toBeLessThan(poor);
    sc.assign = 'YOUTH';
    staffMonthly(g);
    const report = g.inbox.find((m) => m.title === 'Scout report: young talent everywhere');
    expect(report).toBeTruthy();
    expect(report!.body.split('•').length - 1).toBeGreaterThanOrEqual(3);

    // Releasing staff costs three months' wages
    const bal = club.balance;
    const coach = myStaff(g, 'coach')[0];
    expect(releaseStaff(g, coach.id).ok).toBe(true);
    expect(bal - club.balance).toBe(coach.wage * 13);
    expect(coach.clubId).toBeNull();
  }, 300000);
});
