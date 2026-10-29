import { existsSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { autoResolveActions } from '../src/game/actions';
import { scramble } from '../src/game/cm0102/pack';
import { CM_BUILTIN } from '../src/game/cm0102/parse';
import { createWorld } from '../src/game/generate';
import { advanceDay, quickPlayUserMatch, startSeason } from '../src/game/season';

const DB = `public/${CM_BUILTIN}`;
const dump = !!process.env.CM_DUMP;

describe.skipIf(!existsSync(DB))('European competitions in CM 01/02 careers (2002/03 formats)', () => {
  it('plays qualifying, two group stages, knockouts and the Intertoto Cup through to the finals', () => {
    const cm = JSON.parse(gunzipSync(scramble(Buffer.from(readFileSync(DB, 'utf8'), 'base64'))).toString());
    const g = createWorld({ mode: 'classic', manager: 'T', clubName: 'Arsenal', slot: 't', seed: 5, cm });
    startSeason(g);
    const ucl = g.cups.find((c) => c.id === 'UCL')!;
    const uel = g.cups.find((c) => c.id === 'UEL')!;
    const uic = g.cups.find((c) => c.id === 'UECL')!;
    expect(ucl.name).toBe('Champions League');
    expect(uel.name).toBe('UEFA Cup');
    expect(uic.name).toBe('Intertoto Cup');
    // 2002/03 line-ups: the real qualifiers from 2001/02
    const named = (ids: number[]) => ids.map((id) => g.clubs[id].name);
    expect(named(ucl.direct!)).toEqual(expect.arrayContaining(['Arsenal', 'Liverpool', 'Real Madrid', 'Juventus']));
    expect(g.fixtures.filter((f) => f.comp === 'UCL' && f.round === 1)).toHaveLength(32);
    expect(g.fixtures.filter((f) => f.comp === 'UECL' && f.round === 1)).toHaveLength(24);
    const end = `${g.season + 1}-06-01`;
    for (let i = 0; i < 3000 && g.date < end; i++) {
      const r = advanceDay(g);
      if (!r.ok && r.reason === 'action') { autoResolveActions(g); continue; }
      if (!r.ok && r.reason === 'match') { quickPlayUserMatch(g); continue; }
      if (!r.ok) break;
    }
    const count = (id: string, round: number) => g.fixtures.filter((f) => f.comp === id && f.round === round).length;
    expect(ucl.groupSets).toHaveLength(2);
    expect(ucl.groupSets![0].flat()).toHaveLength(32);
    expect(ucl.groupSets![1].flat()).toHaveLength(16);
    expect(count('UCL', 2)).toBe(16); // 8 groups x 2 matches on matchday 1
    expect(count('UCL', 14)).toBe(8); // quarter-finals: 4 ties, two legs
    expect(ucl.winner).not.toBeNull();
    expect(count('UEL', 2)).toBe(48); // second round: 24 ties
    expect(count('UEL', 3)).toBe(32); // third round: 16 ties incl. the Champions League third-placed clubs
    expect(uel.winner).not.toBeNull();
    expect(uic.current).toBe(uic.rounds.length);
    if (dump) {
      console.log('UCL', ucl.rounds.map((r, i) => `${r.name} ${r.date} (${count('UCL', i + 1)})`).join(' | '));
      console.log('UEL', uel.rounds.map((r, i) => `${r.name} ${r.date} (${count('UEL', i + 1)})`).join(' | '));
      console.log('winners', g.clubs[ucl.winner!].name, 'beat', g.clubs[ucl.runnerUp!].name, '| UEFA', g.clubs[uel.winner!].name);
      console.log('groups', ucl.groupSets![0].map((grp) => grp.map((id) => g.clubs[id].short).join('/')).join('  '));
      console.log('arsenal mail', g.inbox.filter((m) => /Champions League|UEFA|Group/.test(m.title)).map((m) => `${m.date} ${m.title}`).join('\n'));
    }
  }, 600000);
});
