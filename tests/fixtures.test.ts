import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/game/generate';
import { startSeason } from '../src/game/season';

describe('real fixtures', () => {
  it('uses the real 2026/27 schedule for the big leagues', () => {
    const g = createWorld({ mode: 'classic', manager: 'T', clubName: 'Arsenal', slot: 't', seed: 9 });
    startSeason(g);
    const id = (n: string) => Object.values(g.clubs).find((c) => c.name === n)!.id;
    const opener = g.fixtures.filter((f) => f.comp === 'ENG1' && (f.home === id('Arsenal') || f.away === id('Arsenal'))).sort((a, b) => (a.date < b.date ? -1 : 1))[0];
    expect(opener.home).toBe(id('Arsenal'));
    expect(opener.away).toBe(id('Coventry City'));
    expect(opener.date).toBe('2026-08-21');
    for (const lg of ['ENG1', 'ENG2', 'ESP1', 'ITA1', 'GER1', 'FRA1']) {
      const league = g.leagues.find((l) => l.id === lg)!;
      const n = league.clubIds.length;
      expect(g.fixtures.filter((f) => f.comp === lg).length, lg).toBe(n * (n - 1));
    }
  });
});
