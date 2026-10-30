// Player instructions and man-marking change what players do in matches.
import { describe, expect, it } from 'vitest';
import { autoResolveActions } from '../src/game/actions';
import { createWorld } from '../src/game/generate';
import { createMatch, setMarks, simulateToEnd, type LiveMatch } from '../src/game/match';
import { advanceDay, pendingUserFixture, startSeason } from '../src/game/season';
import { roleFor, withInstr } from '../src/game/tactics';

describe('player instructions and man-marking', () => {
  it('instructions shift a player between attack and defence', () => {
    const r = roleFor('MC', undefined);
    const bomb = withInstr(r, { f: '4-4-2', slot: 6, runs: 1, longShots: 1 });
    expect(bomb.shoot).toBeGreaterThan(r.shoot * 1.4);
    expect(bomb.def).toBeLessThan(r.def);
    const stay = withInstr(r, { f: '4-4-2', slot: 6, runs: -1, closing: 1, tight: true });
    expect(stay.def).toBeGreaterThan(r.def * 1.2);
    expect(stay.shoot).toBeLessThan(r.shoot);
    const playmaker = withInstr(r, { f: '4-4-2', slot: 6, throughBalls: 1, freeRole: true });
    expect(playmaker.create).toBeGreaterThan(r.create * 1.4);
  });

  it('in matches: long shots mean more shots, man-marking quietens a star', () => {
    const g = createWorld({ mode: 'classic', manager: 'T', clubName: 'Chelsea', slot: 't', seed: 31 });
    startSeason(g);
    for (let i = 0; i < 80 && !pendingUserFixture(g); i++) if (!advanceDay(g).ok) autoResolveActions(g);
    const f = pendingUserFixture(g)!;
    const club = g.clubs[g.userClubId];
    const me = f.home === club.id ? 0 : 1;
    const them = me === 0 ? 1 : 0;
    const shotsBy = (prep: (m: LiveMatch) => void, id: (m: LiveMatch) => number, n = 200) => {
      let total = 0;
      for (let k = 0; k < n; k++) {
        const m = createMatch(g, f);
        prep(m);
        const pid = id(m);
        simulateToEnd(g, m);
        const lp = [...m.sides[0].onPitch, ...m.sides[0].out, ...m.sides[1].onPitch, ...m.sides[1].out].find((x) => x.id === pid);
        total += lp?.s.shots ?? 0;
      }
      return total / n;
    };
    // One of our midfielders told to shoot from distance and get forward
    const slot = club.lineup.findIndex((id, i) => id !== null && ['MC', 'ML', 'MR', 'DM'].includes(createMatch(g, f).sides[me].onPitch.find((lp) => lp.slot === i)?.pos ?? ''));
    const midId = (m: LiveMatch) => m.sides[me].onPitch.find((lp) => lp.slot === slot)!.id;
    const before = shotsBy(() => {}, midId);
    club.tactics = { ...club.tactics, instr: [{ f: club.tactics.formation, slot, longShots: 1, runs: 1 }] };
    const after = shotsBy(() => {}, midId);
    expect(after).toBeGreaterThan(before * 1.25);
    club.tactics = { ...club.tactics, instr: [] };

    // Their main striker, man-marked by our best defender
    const star = (m: LiveMatch) => m.sides[them].onPitch.filter((lp) => lp.pos === 'ST' || lp.pos.startsWith('AM')).sort((a, b) => g.players[b.id].attrs.finishing - g.players[a.id].attrs.finishing)[0].id;
    const free = shotsBy(() => {}, star, 60);
    const marked = shotsBy((m) => {
      const dc = m.sides[me].onPitch.filter((lp) => lp.pos === 'DC').sort((a, b) => g.players[b.id].attrs.positioning - g.players[a.id].attrs.positioning)[0];
      setMarks(g, m, me, [{ marker: dc.id, target: star(m) }]);
      expect(m.sides[them].markedBy?.has(star(m))).toBe(true);
    }, star, 60);
    expect(marked).toBeLessThan(free * 0.85);
  }, 300000);
});
