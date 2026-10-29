// CM 01/02 careers: a season's scores should look like 2002/03 (about 2.6 goals a game, few thrashings).
import { existsSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { autoResolveActions } from '../src/game/actions';
import { scramble } from '../src/game/cm0102/pack';
import { CM_BUILTIN } from '../src/game/cm0102/parse';
import { leagueTable } from '../src/game/competitions';
import { createWorld } from '../src/game/generate';
import { advanceDay, quickPlayUserMatch, startSeason } from '../src/game/season';

const DB = `public/${CM_BUILTIN}`;

describe.skipIf(!existsSync(DB))('CM 01/02 scores', () => {
  it('plays a realistic 2002/03 season', () => {
    const cm = JSON.parse(gunzipSync(scramble(Buffer.from(readFileSync(DB, 'utf8'), 'base64'))).toString());
    const g = createWorld({ mode: 'classic', manager: 'T', clubName: 'Middlesbrough', slot: 't', seed: Number(process.env.SEED ?? 31), cm });
    startSeason(g);
    for (let i = 0; i < 2000 && g.date < `${g.season + 1}-05-20`; i++) {
      g.board.confidence = 80;
      const r = advanceDay(g);
      if (!r.ok && r.reason === 'action') { autoResolveActions(g); continue; }
      if (!r.ok && r.reason === 'match') { quickPlayUserMatch(g); continue; }
      if (!r.ok) break;
    }
    for (const lid of ['ENG1', 'ENG2', 'ESP1', 'ITA1']) {
      const fx = g.fixtures.filter((f) => f.comp === lid && f.result);
      const gpg = fx.reduce((a, f) => a + f.result!.hg + f.result!.ag, 0) / fx.length;
      const fivePlus = fx.filter((f) => Math.abs(f.result!.hg - f.result!.ag) >= 5).length / fx.length;
      const biggest = Math.max(...fx.map((f) => Math.abs(f.result!.hg - f.result!.ag)));
      const t = leagueTable(g, g.leagues.find((l) => l.id === lid)!);
      const draws = fx.filter((f) => f.result!.hg === f.result!.ag).length / fx.length;
      if (process.env.CM_DUMP) console.log(`${lid}: ${gpg.toFixed(2)} goals/game, draws ${Math.round(draws * 100)}%, 5+ margins ${(fivePlus * 100).toFixed(1)}%, biggest ${biggest} | top ${t.slice(0, 3).map((r) => `${g.clubs[r.clubId].short} ${r.pts}`).join(', ')} bottom ${t.at(-1)!.pts}`);
      expect(gpg).toBeGreaterThan(2.2);
      expect(gpg).toBeLessThan(3.0);
      expect(fivePlus).toBeLessThan(0.03);
      expect(biggest).toBeLessThanOrEqual(8);
      expect(t[0].pts).toBeLessThan(100);
    }
  }, 1800000);
});
