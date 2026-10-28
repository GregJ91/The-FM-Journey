import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/game/generate';
import { completeTransfer } from '../src/game/transfers';
import { overall } from '../src/game/ratings';

describe('squad numbers', () => {
  it('gives every player a unique number at their club, and a new one when they move', () => {
    const g = createWorld({ mode: 'classic', manager: 'T', clubName: 'Arsenal', slot: 't', seed: 5 });
    for (const c of Object.values(g.clubs)) {
      const nums = Object.values(g.players).filter((p) => p.clubId === c.id).map((p) => p.shirt);
      expect(nums.every((n) => n !== undefined), c.name).toBe(true);
      expect(new Set(nums).size, c.name).toBe(nums.length);
    }
    const ars = Object.values(g.clubs).find((c) => c.name === 'Arsenal')!;
    const xi = Object.values(g.players).filter((p) => p.clubId === ars.id && p.squad === 'first').sort((a, b) => a.shirt! - b.shirt!);
    console.log(xi.slice(0, 14).map((p) => `${p.shirt} ${p.last}`).join(', '));
    const mover = Object.values(g.players).find((p) => p.clubId !== ars.id && p.clubId !== null && overall(p) > 80)!;
    completeTransfer(g, mover.id, ars.id, 0, mover.wage, 3);
    const nums = Object.values(g.players).filter((p) => p.clubId === ars.id).map((p) => p.shirt);
    expect(new Set(nums).size).toBe(nums.length);
    console.log('signing', mover.last, mover.pos, '→', mover.shirt);
  });
});
