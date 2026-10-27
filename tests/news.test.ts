import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/game/generate';
import { advanceDay, continueGame, quickPlayUserMatch, startSeason } from '../src/game/season';
import { leagueTable } from '../src/game/competitions';

describe('news and inbox', () => {
  it('fires the City FFP deduction and sends FM-style reports', () => {
    const g = createWorld({ mode: 'classic', manager: 'T', clubName: 'Arsenal', slot: 't', seed: 77 });
    startSeason(g);
    const pl = g.leagues[0];
    const city = Object.values(g.clubs).find((c) => c.name === 'Manchester City')!;
    let firedAt: string | null = null;
    while (g.date < '2027-06-06') {
      const r = advanceDay(g);
      if (!r.ok && r.reason === 'match') quickPlayUserMatch(g);
      else if (!r.ok) { g.sacked = false; g.board.confidence = 60; }
      if (!firedAt && g.deductions?.length) {
        firedAt = g.date;
        const left = g.fixtures.filter((f) => f.comp === pl.id && !f.result && (f.home === city.id || f.away === city.id)).length;
        expect(left).toBe(5);
        const t = leagueTable(g, pl);
        console.log('FFP fired', g.date, 'City now', t.findIndex((x) => x.clubId === city.id) + 1, 'with', t.find((x) => x.clubId === city.id)!.pts, 'pts');
      }
      if (g.date === '2027-06-04') {
        const t = leagueTable(g, pl);
        console.log('final: City', t.findIndex((x) => x.clubId === city.id) + 1, t.find((x) => x.clubId === city.id)!.pts, 'pts | bottom 3', t.slice(-3).map((x) => g.clubs[x.clubId].name).join(', '));
      }
    }
    expect(firedAt).not.toBeNull();
    const breaking = g.inbox.find((m) => m.title.includes('BREAKING'));
    expect(breaking).toBeTruthy();
    console.log(breaking!.body.split('\n')[2]);
    expect(g.leagues.find((l) => l.id === 'ENG2')!.clubIds).toContain(city.id); // relegated
    const kinds: Record<string, number> = {};
    for (const m of g.inbox) kinds[m.kind] = (kinds[m.kind] ?? 0) + 1;
    console.log('inbox (last 200)', JSON.stringify(kinds));
    for (const k of ['preview', 'report', 'training', 'award']) expect(kinds[k], k).toBeGreaterThan(0);
    console.log('\n' + g.inbox.find((m) => m.kind === 'report')!.title + '\n' + g.inbox.find((m) => m.kind === 'report')!.body);
    console.log('\n' + g.inbox.find((m) => m.kind === 'training')!.body);
  }, 300000);

  it('routine reports do not stop Continue', () => {
    const g = createWorld({ mode: 'classic', manager: 'T', clubName: 'Arsenal', slot: 't', seed: 78 });
    startSeason(g);
    for (const m of g.inbox) m.read = true;
    const r = continueGame(g, 7);
    expect(r.days).toBeGreaterThan(1); // the Monday training report alone doesn't stop it
  });
});
