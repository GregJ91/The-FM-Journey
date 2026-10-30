import { existsSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { CM_BUILTIN } from '../src/game/cm0102/parse';
import { scramble } from '../src/game/cm0102/pack';
import { autoResolveActions } from '../src/game/actions';
import { activateCheat, cheatOf } from '../src/game/cheats';
import { parseMoney } from '../src/ui/screens/Editor';
import { createWorld } from '../src/game/generate';
import { advanceDay, quickPlayUserMatch, startSeason } from '../src/game/season';

const DB = `public/${CM_BUILTIN}`;

describe('cheats', () => {
  it('recognises names loosely', () => {
    expect(cheatOf('champions')).toBe('champions');
    expect(cheatOf(' Iron-Men ')).toBe('ironmen');
    expect(cheatOf('Champs')).toBe(null);
    expect(cheatOf('Editor')).toBe('editor');
  });

  it('reads editor money shorthand', () => {
    expect(parseMoney('25m')).toBe(25_000_000);
    expect(parseMoney('£3.5m')).toBe(3_500_000);
    expect(parseMoney('500k')).toBe(500_000);
    expect(parseMoney('lots')).toBe(null);
  });

  it.skipIf(!existsSync(DB))('"Champions" wins about 90% of games in a CM career', () => {
    const cm = JSON.parse(gunzipSync(scramble(Buffer.from(readFileSync(DB, 'utf8'), 'base64'))).toString('utf8'));
    let w = 0, n = 0, gf = 0, biggest = 0;
    // Small clubs and a big one: the cheat lifts you above each opponent, so it plays the same everywhere
    for (const club of ['Fulham', 'Burnley', 'Forfar Athletic', 'Arsenal']) {
      const g = createWorld({ mode: 'classic', manager: 'T', clubName: club, slot: 't', seed: 3, cm });
      g.clubs[g.userClubId].tactics.name = 'Champions';
      expect(activateCheat(g)).toBe('Cheat activated: Champions');
      startSeason(g);
      for (let i = 0; i < 300; i++) {
        const r = advanceDay(g);
        if (!r.ok && r.reason === 'action') { autoResolveActions(g); i--; continue; }
        if (!r.ok && r.reason === 'match') { quickPlayUserMatch(g); i--; continue; }
        if (!r.ok) break;
      }
      const games = g.fixtures.filter((f) => f.result && (f.home === g.userClubId || f.away === g.userClubId));
      const wins = games.filter((f) => (f.home === g.userClubId ? f.result!.hg > f.result!.ag : f.result!.ag > f.result!.hg)).length;
      console.log(club, `${wins}/${games.length}`);
      w += wins; n += games.length;
      for (const f of games) {
        const [a, b] = f.home === g.userClubId ? [f.result!.hg, f.result!.ag] : [f.result!.ag, f.result!.hg];
        gf += a; biggest = Math.max(biggest, a - b);
      }
    }
    expect(w / n).toBeGreaterThan(0.82);
    expect(w / n).toBeLessThan(0.97);
    // ...by realistic scores (2-0s and 3-0s, not 11-0s)
    expect(gf / n).toBeLessThan(3.5);
    expect(biggest).toBeLessThanOrEqual(8);
  }, 600000);
});
