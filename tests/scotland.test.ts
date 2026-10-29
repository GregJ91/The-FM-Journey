import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/game/generate';
import { startSeason } from '../src/game/season';

describe('scotland', () => {
  it('has four SPFL divisions with the right fixture counts and the Scottish Cup', () => {
    const g = createWorld({ mode: 'classic', manager: 'T', clubName: 'Celtic', slot: 't', seed: 4 });
    startSeason(g);
    const sizes: Record<string, [number, number]> = { SCO1: [12, 33], SCO2: [10, 36], SCO3: [10, 36], SCO4: [10, 36] };
    for (const [id, [n, games]] of Object.entries(sizes)) {
      const league = g.leagues.find((l) => l.id === id)!;
      expect(league.clubIds.length, id).toBe(n);
      const fx = g.fixtures.filter((f) => f.comp === id);
      expect(fx.length, id).toBe((n * games) / 2);
      for (const c of league.clubIds) expect(fx.filter((f) => f.home === c || f.away === c).length).toBe(games);
    }
    expect(g.cups.find((c) => c.id === 'SCC')).toBeTruthy();
    const celtic = Object.values(g.clubs).find((c) => c.name === 'Celtic')!;
    expect(celtic.leagueId).toBe('SCO1');
  });
});
