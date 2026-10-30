// Run arrows: forward runs push a player into the attack (more shots, less defending), runs back the opposite,
// and arrows drawn for another formation do nothing.
import { describe, expect, it } from 'vitest';
import { FORMATIONS } from '../src/game/formations';
import { createWorld } from '../src/game/generate';
import { createMatch } from '../src/game/match';
import { pendingUserFixture, advanceDay, startSeason } from '../src/game/season';
import { autoResolveActions } from '../src/game/actions';
import { autoRuns, normaliseTactics, roleFor, withRun } from '../src/game/tactics';

describe('run arrows', () => {
  it('change how a player plays', () => {
    const r = roleFor('MC', undefined);
    const from = { x: 50, y: 50 };
    const fwd = withRun(r, from, { f: '4-4-2', slot: 6, x: 85, y: 50 });
    expect(fwd.shoot).toBeGreaterThan(r.shoot);
    expect(fwd.att).toBeGreaterThan(r.att);
    expect(fwd.def).toBeLessThan(r.def);
    expect(fwd.fatigue).toBeGreaterThan(r.fatigue);
    const ball = withRun(r, from, { f: '4-4-2', slot: 6, x: 85, y: 50, ball: true });
    expect(ball.create).toBeGreaterThan(fwd.create);
    const back = withRun(r, from, { f: '4-4-2', slot: 6, x: 25, y: 50 });
    expect(back.def).toBeGreaterThan(r.def);
    expect(back.att).toBeLessThan(r.att);
  });

  it('are used in matches for the formation they were drawn for', () => {
    const g = createWorld({ mode: 'classic', manager: 'T', clubName: 'Chelsea', slot: 't', seed: 11 });
    startSeason(g);
    for (let i = 0; i < 80 && !pendingUserFixture(g); i++) if (!advanceDay(g).ok) autoResolveActions(g);
    const f = pendingUserFixture(g)!;
    const club = g.clubs[g.userClubId];
    const side = f.home === club.id ? 0 : 1;
    const base = createMatch(g, f).sides[side].str;
    const slots = FORMATIONS[club.tactics.formation];
    const mids = slots.map((s, i) => [s, i] as const).filter(([s]) => ['MC', 'ML', 'MR', 'DL', 'DR'].includes(s.pos));
    club.tactics = { ...club.tactics, runs: mids.map(([s, i]) => ({ f: club.tactics.formation, slot: i, x: Math.min(95, s.x + 35), y: s.y })) };
    const pushed = createMatch(g, f).sides[side].str;
    expect(pushed.att).toBeGreaterThan(base.att);
    expect(pushed.def).toBeLessThan(base.def);
    club.tactics = { ...club.tactics, runs: club.tactics.runs!.map((r) => ({ ...r, f: 'other' })) };
    expect(createMatch(g, f).sides[side].str.att).toBeCloseTo(base.att, 6);
  });

  it('computer sides make their own runs, fewer when defensive', () => {
    const bold = normaliseTactics({ formation: '4-4-2', mentality: 1, width: 2, roles: [] });
    const runs = autoRuns(bold, 3);
    expect(runs.length).toBeGreaterThanOrEqual(3);
    expect(runs.every((r) => r.f === '4-4-2' && r.x >= 0 && r.x <= 97)).toBe(true);
    const wb = normaliseTactics({ formation: '4-4-2', mentality: 0, roles: ['gk', 'fb', 'cd', 'cd', 'wb'] });
    expect(autoRuns(wb, 3).some((r) => r.slot === 4)).toBe(true); // the wing-back overlaps
    const parked = normaliseTactics({ formation: '4-4-2', mentality: -2, width: 2, roles: [] });
    expect(autoRuns(parked, 3).length).toBeLessThan(runs.length);
  });
});
