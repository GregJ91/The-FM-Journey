import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { autoResolveActions } from '../src/game/actions';
import { activateCheat, cheatOf } from '../src/game/cheats';
import { parseMoney } from '../src/ui/screens/Editor';
import { createWorld } from '../src/game/generate';
import { advanceDay, quickPlayUserMatch, startSeason } from '../src/game/season';

const DB = 'public/cm0102-v1.json';

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
    const cm = JSON.parse(readFileSync(DB, 'utf8'));
    let w = 0, n = 0;
    for (const club of ['Fulham', 'Burnley', 'Forfar Athletic']) {
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
    }
    expect(w / n).toBeGreaterThan(0.82);
    expect(w / n).toBeLessThan(0.97);
  }, 600000);
});
