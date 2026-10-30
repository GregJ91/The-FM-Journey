// CM 01/02 careers: the Community Shield, the Supercopa (two legs), Supercoppa, Trophée des Champions and the
// UEFA Super Cup, with the real 2002 line-ups in the first season and last season's winners after that.
import { existsSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { autoResolveActions } from '../src/game/actions';
import { scramble } from '../src/game/cm0102/pack';
import { CM_BUILTIN } from '../src/game/cm0102/parse';
import { leagueTable } from '../src/game/competitions';
import { addDays, weekday } from '../src/game/dates';
import { createWorld } from '../src/game/generate';
import { advanceDay, quickPlayUserMatch, startSeason } from '../src/game/season';
import { computeSuperEntrants } from '../src/game/supercups';

const DB = `public/${CM_BUILTIN}`;

describe.skipIf(!existsSync(DB))('super cups', () => {
  it('are played in August with the real 2002 line-ups', () => {
    const cm = JSON.parse(gunzipSync(scramble(Buffer.from(readFileSync(DB, 'utf8'), 'base64'))).toString());
    const g = createWorld({ mode: 'classic', manager: 'T', clubName: 'Arsenal', slot: 't', seed: 8, cm });
    startSeason(g);
    const fx = (id: string) => g.fixtures.filter((f) => f.comp === id).sort((a, b) => (a.date < b.date ? -1 : 1));
    const names = (id: string) => [g.clubs[fx(id)[0].home].name, g.clubs[fx(id)[0].away].name];
    expect(names('ECS')).toEqual(['Arsenal', 'Liverpool']);
    // The Sunday before the league starts
    const firstLeague = g.fixtures.filter((f) => f.comp === 'ENG1').map((f) => f.date).sort()[0];
    expect(fx('ECS')[0].date < firstLeague).toBe(true);
    expect(addDays(fx('ECS')[0].date, 7) >= firstLeague).toBe(true);
    expect(weekday(fx('ECS')[0].date)).toBe(0);
    expect(fx('ECS')[0].neutral).toBe(true);
    expect(names('SUC')).toEqual(['Real Madrid', 'Feyenoord']);
    expect(fx('SUC')[0].date).toBe('2002-08-30');
    expect(names('ISC')).toEqual(['Juventus', 'Parma']);
    expect(fx('ESC')).toHaveLength(2);
    expect(fx('ESC')[1].firstLeg).toBe(fx('ESC')[0].id);
    expect(fx('FTC')).toHaveLength(1);
    expect(g.inbox.some((m) => m.title === 'Community Shield v Liverpool')).toBe(true);
    // Friendlies fit round the Shield
    expect(g.fixtures.filter((f) => f.comp === 'FRN').every((f) => f.date <= '2002-08-07')).toBe(true);

    for (let i = 0; i < 200 && g.date < '2002-09-02'; i++) {
      const r = advanceDay(g);
      if (!r.ok && r.reason === 'action') { autoResolveActions(g); continue; }
      if (!r.ok && r.reason === 'match') { quickPlayUserMatch(g); continue; }
    }
    for (const id of ['ECS', 'ESC', 'ISC', 'FTC', 'SUC']) {
      const cup = g.cups.find((c) => c.id === id)!;
      expect(cup.winner).not.toBeNull();
      expect(g.clubs[cup.winner!].trophies.some((t) => t.name === cup.name && t.season === 2002)).toBe(true);
    }
    const shield = g.cups.find((c) => c.id === 'ECS')!;
    expect(g.inbox.some((m) => m.title === (shield.winner === g.userClubId ? '🏆 Community Shield winners!' : 'Community Shield lost'))).toBe(true);
    // Two legs in Spain: decided on aggregate
    expect(fx('ESC')[1].result!.agg).toBeTruthy();

    // Next season: champions v cup winners; England brings in the runners-up after a double
    const eng = g.leagues.find((l) => l.id === 'ENG1')!;
    const t = leagueTable(g, eng);
    const fac = g.cups.find((c) => c.id === 'FAC')!;
    fac.winner = t[0].clubId; fac.runnerUp = t[5].clubId;
    const ucl = g.cups.find((c) => c.id === 'UCL')!;
    const uel = g.cups.find((c) => c.id === 'UEL')!;
    ucl.winner = t[2].clubId; uel.winner = t[3].clubId;
    const next = computeSuperEntrants(g);
    expect(next.ECS).toEqual([t[0].clubId, t[1].clubId]);
    expect(next.SUC).toEqual([t[2].clubId, t[3].clubId]);
  }, 300000);
});
