import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/game/generate';
import { autoResolveActions } from '../src/game/actions';
import { advanceDay, pendingUserFixture, quickPlayUserMatch, startSeason } from '../src/game/season';
import { createMatch } from '../src/game/match';
import { managerProfile, monthlyManager, note } from '../src/game/manager';
import { compact, expand } from '../src/store';

const world = () => {
  const g = createWorld({ mode: 'classic', manager: 'T', clubName: 'Everton', slot: 't', seed: 5 });
  startSeason(g);
  return g;
};

describe('manager profile', () => {
  it('drifts towards what the manager does', () => {
    const g = world();
    const before = { ...managerProfile(g).skills };
    for (let i = 0; i < 6; i++) note(g, 'attacking');
    monthlyManager(g);
    const after = managerProfile(g).skills;
    expect(after.attacking).toBeGreaterThan(before.attacking);
    expect(after.negotiating).toBeLessThan(before.negotiating); // unused: fades
    for (const v of Object.values(after)) { expect(v).toBeGreaterThanOrEqual(1); expect(v).toBeLessThanOrEqual(20); }
  });

  it('a strong attacking manager gives a small attacking edge', () => {
    const g = world();
    let guard = 0;
    while (!pendingUserFixture(g) && guard++ < 60) { if (!advanceDay(g).ok) autoResolveActions(g); }
    const f = pendingUserFixture(g)!;
    const side = f.home === g.userClubId ? 0 : 1;
    const base = createMatch(g, f).sides[side].str.att;
    managerProfile(g).skills.attacking = 20;
    const strong = createMatch(g, f).sides[side].str.att;
    expect(strong / base).toBeCloseTo(1.02, 2);
  });

  it('builds up over real play and survives a save', () => {
    const g = world();
    for (let i = 0; i < 70; i++) {
      const r = advanceDay(g);
      if (!r.ok && r.reason === 'action') { autoResolveActions(g); i--; continue; }
      if (!r.ok && r.reason === 'match') { quickPlayUserMatch(g); i--; continue; }
    }
    const prof = managerProfile(g);
    expect(Object.values(prof.last).some((d) => d !== 0)).toBe(true);
    const back = expand(compact(g));
    for (const [k, v] of Object.entries(prof.skills)) expect(back.managerProfile!.skills[k as keyof typeof prof.skills]).toBeCloseTo(v, 2);
  }, 120000);
});
