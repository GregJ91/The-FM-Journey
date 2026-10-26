import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/game/generate';
import { advanceDay, quickPlayUserMatch, startSeason } from '../src/game/season';
import { youthTable } from '../src/game/youth';
import { age, overall } from '../src/game/ratings';

describe('youth football', () => {
  it('plays youth leagues and cups through a season', () => {
    const g = createWorld({ mode: 'classic', manager: 'T', clubName: 'Arsenal', slot: 't', seed: 8 });
    startSeason(g);
    const before: Record<number, number> = {};
    for (const p of Object.values(g.players)) before[p.id] = overall(p);
    const t0 = Date.now();
    while (g.date < '2027-06-01') {
      const r = advanceDay(g);
      if (!r.ok && r.reason === 'match') quickPlayUserMatch(g);
      else if (!r.ok && r.reason === 'sacked') { g.sacked = false; g.board.confidence = 60; }
    }
    console.log('season ms', Date.now() - t0);
    for (const comp of g.youth!) {
      expect(comp.winner, comp.name).not.toBeNull();
      expect(comp.fixtures.every((f) => f.hg !== undefined), comp.name).toBe(true);
      const top = comp.kind === 'cup' ? '' : youthTable(comp, g).slice(0, 2).map((r) => `${g.clubs[r.clubId].name} ${r.pts}`).join(', ');
      console.log(comp.name, '→', g.clubs[comp.winner!].name, top ? `| ${top}` : '', '| matches', comp.fixtures.length);
    }
    const youth = Object.values(g.players).filter((p) => p.ys && p.ys.apps > 0);
    expect(youth.length).toBeGreaterThan(1000);
    const best = [...youth].sort((a, b) => b.ys!.goals - a.ys!.goals)[0];
    console.log('youth players with games', youth.length, '| top youth scorer', best.first, best.last, best.ys!.goals, 'goals in', best.ys!.apps);
    const yp = Object.values(g.players).filter((p) => p.squad === 'youth' && before[p.id]);
    const played = yp.filter((p) => (p.ys?.apps ?? 0) >= 10);
    const unplayed = yp.filter((p) => (p.ys?.apps ?? 0) < 3);
    const d = (a: typeof yp) => (a.reduce((s, p) => s + overall(p) - before[p.id], 0) / Math.max(1, a.length)).toFixed(2);
    console.log('youth squad growth: 10+ youth games', d(played), `(${played.length})`, '| <3 games', d(unplayed), `(${unplayed.length})`);
    const young = Object.values(g.players).filter((p) => age(p, g.date) <= 20 && before[p.id]);
    console.log('all u20 delta', d(young));
  }, 300000);
});
