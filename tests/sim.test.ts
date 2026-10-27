import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/game/generate';
import { autoResolveActions } from '../src/game/actions';
import { advanceDay, continueGame, quickPlayUserMatch, startSeason } from '../src/game/season';
import { leagueTable } from '../src/game/competitions';
import { overall, age, fullName } from '../src/game/ratings';
import { NATIONS } from '../src/game/data/names';

function runDays(g: ReturnType<typeof createWorld>, n: number) {
  for (let i = 0; i < n; i++) {
    const r = advanceDay(g);
    if (!r.ok && r.reason === 'action') { autoResolveActions(g); i--; continue; }
    if (!r.ok && r.reason === 'match') { quickPlayUserMatch(g); i--; continue; }
    if (!r.ok) break;
  }
}

describe('world', () => {
  it('all nationalities are known', () => {
    const g = createWorld({ mode: 'classic', manager: 'T', clubName: 'Arsenal', slot: 't', seed: 1 });
    const unknown = new Set(Object.values(g.players).map((p) => p.nat).filter((n) => !NATIONS[n]));
    expect([...unknown]).toEqual([]);
  });

  it('simulates a full season with plausible numbers', () => {
    const t0 = Date.now();
    const g = createWorld({ mode: 'classic', manager: 'T', clubName: 'Arsenal', slot: 't', seed: 42 });
    startSeason(g);
    const ovrBefore: Record<number, number> = {};
    for (const p of Object.values(g.players)) ovrBefore[p.id] = overall(p);
    runDays(g, 330); // to late May
    const fx = g.fixtures.filter((f) => f.result && !f.knockout);
    const goals = fx.reduce((s, f) => s + f.result!.hg + f.result!.ag, 0) / fx.length;
    const home = fx.filter((f) => f.result!.hg > f.result!.ag).length / fx.length;
    const draw = fx.filter((f) => f.result!.hg === f.result!.ag).length / fx.length;
    console.log('fixtures', fx.length, 'goals/game', goals.toFixed(2), 'home', home.toFixed(2), 'draw', draw.toFixed(2), 'ms', Date.now() - t0);
    for (const l of g.leagues) {
      const t = leagueTable(g, l);
      console.log(l.name, t.slice(0, 3).map((r) => `${g.clubs[r.clubId].name} ${r.pts}`).join(', '), '| bottom', t.slice(-1).map((r) => `${g.clubs[r.clubId].name} ${r.pts}`).join(''));
    }
    const pl = g.leagues[0];
    const scorers = Object.values(g.players).filter((p) => p.clubId && pl.clubIds.includes(p.clubId)).sort((a, b) => b.stats.goals - a.stats.goals).slice(0, 5);
    console.log('PL scorers', scorers.map((p) => `${fullName(p)} ${p.stats.goals}`).join(', '));
    // development check
    const young = Object.values(g.players).filter((p) => age(p, g.date) <= 20 && ovrBefore[p.id]);
    const old = Object.values(g.players).filter((p) => age(p, g.date) >= 33 && ovrBefore[p.id]);
    const avgDelta = (arr: typeof young) => arr.reduce((s, p) => s + overall(p) - ovrBefore[p.id], 0) / arr.length;
    console.log('young delta', avgDelta(young).toFixed(2), 'old delta', avgDelta(old).toFixed(2));
    const injured = Object.values(g.players).filter((p) => p.injury).length;
    console.log('injured now', injured, 'transfers', g.transfers.length, 'cups', g.cups.map((c) => `${c.name}: ${c.winner ? g.clubs[c.winner].name : '-'}`).join('; '));
    const rated = Object.values(g.players).filter((p) => p.stats.apps >= 10);
    const avgRat = rated.reduce((s, p) => s + p.stats.ratingSum / p.stats.apps, 0) / rated.length;
    const userXI = g.clubs[g.userClubId].tactics.formation;
    console.log('avg player rating', avgRat.toFixed(2), 'user formation', userXI);
    expect(avgRat).toBeGreaterThan(6.4);
    expect(avgRat).toBeLessThan(7.1);
    expect(goals).toBeGreaterThan(2.2);
    expect(goals).toBeLessThan(3.4);
    expect(home).toBeGreaterThan(0.36);
    expect(home).toBeLessThan(0.55);
  }, 120000);

  it('runs into a second season (create mode)', () => {
    const g = createWorld({ mode: 'create', manager: 'T', slot: 't', seed: 7, custom: { name: 'Test FC', short: 'TFC', colors: ['#ff0000', '#ffffff'], crest: { shape: 'shield', pattern: 'plain' }, stadium: 'Test Park', country: 'ENG' } });
    startSeason(g);
    runDays(g, 420);
    expect(g.season).toBe(2027);
    expect(g.history.length).toBe(1);
    console.log('season2 date', g.date, 'fixtures', g.fixtures.length, 'user finish', JSON.stringify(g.history[0].userFinish), 'conf', g.board.confidence, 'balance', g.clubs[g.userClubId].balance);
    const r = continueGame(g);
    expect(r.days).toBeGreaterThanOrEqual(0);
    const size = JSON.stringify(g, (_k, v) => (typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 100) / 100 : v)).length;
    console.log('save size KB', Math.round(size / 1024), 'players', Object.keys(g.players).length);
  }, 120000);
});
