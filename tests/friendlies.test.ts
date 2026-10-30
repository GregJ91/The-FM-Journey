import { existsSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { autoResolveActions } from '../src/game/actions';
import { scramble } from '../src/game/cm0102/pack';
import { CM_BUILTIN } from '../src/game/cm0102/parse';
import { FRIENDLY } from '../src/game/competitions';
import { createWorld } from '../src/game/generate';
import { advanceDay, quickPlayUserMatch, startSeason } from '../src/game/season';

const DB = `public/${CM_BUILTIN}`;

describe.skipIf(!existsSync(DB))('CM 01/02 pre-season friendlies', () => {
  it('arranges friendlies before the season that count only for fitness', () => {
    const cm = JSON.parse(gunzipSync(scramble(Buffer.from(readFileSync(DB, 'utf8'), 'base64'))).toString());
    const g = createWorld({ mode: 'classic', manager: 'T', clubName: 'Middlesbrough', slot: 't', seed: 3, cm });
    startSeason(g);
    const me = g.userClubId;
    const fr = g.fixtures.filter((f) => f.comp === FRIENDLY);
    expect(fr.length).toBeGreaterThanOrEqual(4);
    expect(fr.length).toBeLessThanOrEqual(5);
    expect(fr.every((f) => f.home === me || f.away === me)).toBe(true);
    expect(new Set(fr.map((f) => (f.home === me ? f.away : f.home))).size).toBe(fr.length);
    const firstComp = g.fixtures.filter((f) => f.comp !== FRIENDLY && (f.home === me || f.away === me)).map((f) => f.date).sort()[0];
    expect(fr.every((f) => f.date < firstComp)).toBe(true);
    expect(g.inbox.some((m) => m.title === 'Pre-season friendlies arranged')).toBe(true);
    for (let i = 0; i < 200 && g.date < firstComp; i++) {
      const r = advanceDay(g);
      if (!r.ok && r.reason === 'action') { autoResolveActions(g); continue; }
      if (!r.ok && r.reason === 'match') { quickPlayUserMatch(g); continue; }
      if (!r.ok) throw new Error(r.reason);
    }
    expect(fr.every((f) => f.result)).toBe(true);
    const played = new Set(fr.flatMap((f) => Object.keys(f.result!.ratings ?? {}).map(Number)));
    expect(played.size).toBeGreaterThan(11);
    for (const id of played) if (g.players[id].clubId === me) expect(g.players[id].stats.apps).toBe(0);
  }, 300000);
});
