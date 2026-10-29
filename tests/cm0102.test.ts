import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { autoResolveActions } from '../src/game/actions';
import { leagueTable } from '../src/game/competitions';
import { NATIONS } from '../src/game/data/names';
import { createWorld } from '../src/game/generate';
import { fullName, overall } from '../src/game/ratings';
import { advanceDay, quickPlayUserMatch, startSeason } from '../src/game/season';
import { parseCm0102, type CmWorld } from '../src/game/cm0102/parse';

// Runs only where a CM 01/02 Data folder is available (the database isn't part of this repo).
const DIR = process.env.CM0102_DATA ?? '/tmp/claude-0/cm0102';
const have = existsSync(`${DIR}/staff.dat`);
const dump = !!process.env.CM_DUMP;

let world: CmWorld;
function load() {
  if (world) return world;
  const files: Record<string, Uint8Array> = {};
  for (const f of readdirSync(DIR)) if (f.endsWith('.dat')) files[f.toLowerCase()] = new Uint8Array(readFileSync(`${DIR}/${f}`));
  return (world = parseCm0102(files));
}

describe.skipIf(!have)('CM 01/02', () => {
  it('reads clubs, leagues and players', () => {
    const w = load();
    const ars = w.clubs.findIndex((c) => c.name === 'Arsenal');
    expect(w.leagues.find((l) => l.id === 'ENG1')!.clubs).toContain(ars);
    const henry = w.players.find((p) => p.last === 'Henry' && p.first === 'Thierry')!;
    expect(henry.pos).toBe('ST');
    expect(henry.club).toBe(ars);
    expect(w.season).toBeGreaterThanOrEqual(2001);
    if (dump) {
      for (const l of w.leagues) console.log(l.id, l.clubs.length, l.clubs.slice(0, 4).map((i) => `${w.clubs[i].name}/${w.clubs[i].short}/${w.clubs[i].rep}/${w.clubs[i].level}`).join(', '));
      console.log('players', w.players.length, 'season', w.season);
    }
  }, 60000);

  it('plays a season of the CM world', () => {
    const g = createWorld({ mode: 'classic', manager: 'T', clubName: 'Arsenal', slot: 't', seed: 7, cm: load() });
    expect(g.era).toBe('cm0102');
    expect(g.date).toBe(`${load().season}-07-01`);
    const unknown = new Set(Object.values(g.players).map((p) => p.nat).filter((n) => !NATIONS[n]));
    if (unknown.size) console.log('unknown nations', [...unknown].join(','));
    startSeason(g);
    for (let i = 0; i < 330; i++) {
      const r = advanceDay(g);
      if (!r.ok && r.reason === 'action') { autoResolveActions(g); i--; continue; }
      if (!r.ok && r.reason === 'match') { quickPlayUserMatch(g); i--; continue; }
      if (!r.ok) break;
    }
    for (const l of g.leagues) {
      const t = leagueTable(g, l);
      if (dump) console.log(l.name, t.slice(0, 3).map((r) => `${g.clubs[r.clubId].name} ${r.pts}`).join(', '), '| bottom', t.slice(-1).map((r) => `${g.clubs[r.clubId].name} ${r.pts}`).join(''));
      expect(t.every((r) => r.p > 0)).toBe(true);
    }
    const pl = g.leagues[0];
    const scorers = Object.values(g.players).filter((p) => p.clubId && pl.clubIds.includes(p.clubId)).sort((a, b) => b.stats.goals - a.stats.goals).slice(0, 5);
    if (dump) {
      console.log('scorers', scorers.map((p) => `${fullName(p)} ${p.stats.goals} (${overall(p)})`).join(', '));
      console.log('cups', g.cups.map((c) => `${c.name}: ${c.winner ? g.clubs[c.winner].name : '-'}`).join('; '));
    }
    expect(scorers[0].stats.goals).toBeGreaterThan(10);
  }, 240000);
});
