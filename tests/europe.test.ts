import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/game/generate';
import { advanceDay, quickPlayUserMatch, startSeason } from '../src/game/season';
import { EURO_CLUBS, EURO_COMPS, EURO_ENTRANTS_2026 } from '../src/game/data/europe';
import { europeTable } from '../src/game/europe';
import { winnerOf } from '../src/game/match';

function runDays(g: ReturnType<typeof createWorld>, n: number) {
  for (let i = 0; i < n; i++) {
    const r = advanceDay(g);
    if (!r.ok && r.reason === 'match') { quickPlayUserMatch(g); i--; continue; }
    if (!r.ok) break;
  }
}

describe('europe', () => {
  it('uses the real 2026/27 line-ups', () => {
    const g = createWorld({ mode: 'classic', manager: 'T', clubName: 'Arsenal', slot: 't', seed: 3 });
    const names = new Set(Object.values(g.clubs).map((c) => c.name));
    for (const def of EURO_COMPS) {
      const missing = EURO_ENTRANTS_2026[def.id].filter((n) => !names.has(n));
      expect(missing, def.id).toEqual([]);
      expect(new Set(EURO_ENTRANTS_2026[def.id]).size).toBe(36);
    }
    const all = Object.values(EURO_ENTRANTS_2026).flat();
    expect(new Set(all).size).toBe(108);
    // every guest club is in one of the competitions
    for (const line of EURO_CLUBS) expect(all).toContain(line.split('|')[0]);
  });

  it('plays league phases, two-legged knockouts and finals, then qualifies next season', () => {
    const g = createWorld({ mode: 'classic', manager: 'T', clubName: 'Aston Villa', slot: 't', seed: 11 });
    startSeason(g);
    for (const def of EURO_COMPS) {
      const cup = g.cups.find((c) => c.id === def.id)!;
      expect(cup.teams!.length).toBe(36);
      const fx = g.fixtures.filter((f) => f.comp === def.id);
      expect(fx.length).toBe((36 * def.games) / 2);
      for (const id of cup.teams!) {
        const mine = fx.filter((f) => f.home === id || f.away === id);
        expect(mine.length).toBe(def.games);
        expect(new Set(mine.map((f) => (f.home === id ? f.away : f.home))).size).toBe(def.games);
      }
    }
    runDays(g, 338); // to early June, before the season ends
    // No club ever has two matches on the same day
    const seen = new Set<string>();
    for (const f of g.fixtures) {
      for (const id of [f.home, f.away]) {
        const k = `${id}@${f.date}`;
        expect(seen.has(k), `${g.clubs[id].name} twice on ${f.date}`).toBe(false);
        seen.add(k);
      }
    }
    for (const def of EURO_COMPS) {
      const cup = g.cups.find((c) => c.id === def.id)!;
      expect(cup.winner, def.id).not.toBeNull();
      const table = europeTable(g, cup);
      expect(table.every((r) => r.p === def.games)).toBe(true);
      const legs2 = g.fixtures.filter((f) => f.comp === def.id && f.leg === 2);
      expect(legs2.length).toBe(8 + 8 + 4 + 2);
      for (const f of legs2) expect(f.result!.agg).toBeTruthy();
      const final = g.fixtures.find((f) => f.comp === def.id && f.roundName === 'Final')!;
      expect(winnerOf(final)).toBe(cup.winner);
      console.log(def.name, 'winner', g.clubs[cup.winner!].name, 'beat', g.clubs[cup.runnerUp!].name, '| top of league phase', table.slice(0, 3).map((r) => `${g.clubs[r.clubId].name} ${r.pts}`).join(', '));
    }
    runDays(g, 40); // into next season
    expect(g.season).toBe(2027);
    for (const def of EURO_COMPS) {
      const cup = g.cups.find((c) => c.id === def.id)!;
      expect(cup.teams!.length).toBe(36);
      expect(cup.winner).toBeNull();
    }
    const ucl = g.cups.find((c) => c.id === 'UCL')!;
    console.log('2027/28 UCL from the big five:', ucl.teams!.filter((id) => g.clubs[id].leagueId !== 'EUR').map((id) => g.clubs[id].name).join(', '));
  }, 180000);
});
