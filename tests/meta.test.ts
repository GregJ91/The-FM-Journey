import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/game/generate';
import { createMatch, simulateToEnd } from '../src/game/match';
import { overall } from '../src/game/ratings';
import { completeTransfer } from '../src/game/transfers';

const BIG_SIX = ['Manchester City', 'Liverpool', 'Chelsea', 'Manchester United', 'Tottenham Hotspur'];

describe('meta clubs', () => {
  it('Arsenal win about 65% against the rest of the big six', () => {
    const g = createWorld({ mode: 'classic', manager: 'T', clubName: 'Wrexham', slot: 't', seed: 31 });
    const id = (name: string) => Object.values(g.clubs).find((c) => c.name === name)!.id;
    const ars = id('Arsenal');
    let w = 0, n = 0;
    for (const opp of BIG_SIX) for (let i = 0; i < 120; i++) {
      const home = i % 2 === 0;
      const m = createMatch(g, { id: -1, comp: 'X', date: g.date, round: 1, home: home ? ars : id(opp), away: home ? id(opp) : ars, result: null });
      simulateToEnd(g, m);
      const a = home ? m.score[0] : m.score[1], b = home ? m.score[1] : m.score[0];
      n++; if (a > b) w++;
    }
    console.log('Arsenal win rate v big six', (w / n).toFixed(3));
    expect(w / n).toBeGreaterThan(0.58);
    expect(w / n).toBeLessThan(0.72);
  }, 300000);

  it('signings get the meta profile with the same overall', () => {
    const g = createWorld({ mode: 'classic', manager: 'T', clubName: 'Wrexham', slot: 't', seed: 32 });
    const ars = Object.values(g.clubs).find((c) => c.name === 'Arsenal')!;
    const p = Object.values(g.players).find((x) => x.last === 'Mbeumo' || (x.pos === 'AMR' && x.clubId !== ars.id && overall(x) > 80))!;
    const before = { ovr: overall(p), pace: p.attrs.pace, comp: p.attrs.composure };
    completeTransfer(g, p.id, ars.id, 0, p.wage, 3);
    expect(p.meta).toBe(true);
    expect(overall(p)).toBe(before.ovr);
    expect(p.attrs.pace + p.attrs.composure).toBeGreaterThan(before.pace + before.comp);
    console.log(p.last, 'ovr', before.ovr, '→', overall(p), 'pace', before.pace.toFixed(1), '→', p.attrs.pace.toFixed(1), 'composure', before.comp.toFixed(1), '→', p.attrs.composure.toFixed(1));
  });
});
