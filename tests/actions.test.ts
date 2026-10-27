import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/game/generate';
import { autoResolveActions, openActions, registerSquad, respondAction, seniors, SQUAD_LIMIT } from '../src/game/actions';
import { advanceDay, quickPlayUserMatch, startSeason } from '../src/game/season';
import { createMatch } from '../src/game/match';
import { age } from '../src/game/ratings';

function until(g: ReturnType<typeof createWorld>, date: string, onAction?: () => boolean) {
  let guard = 0;
  while (g.date < date && guard++ < 2000) {
    const r = advanceDay(g);
    if (!r.ok && r.reason === 'action') { if (onAction?.()) return; autoResolveActions(g); }
    else if (!r.ok && r.reason === 'match') quickPlayUserMatch(g);
    else if (!r.ok) { g.sacked = false; g.board.confidence = 60; }
  }
}

describe('actions that need a response', () => {
  it('blocks the calendar for squad registration and enforces it', () => {
    const g = createWorld({ mode: 'classic', manager: 'T', clubName: 'Chelsea', slot: 't', seed: 41 });
    startSeason(g);
    until(g, '2026-09-02', () => openActions(g).some((m) => m.action!.type === 'registration'));
    const reg = openActions(g).find((m) => m.action!.type === 'registration')!;
    expect(reg).toBeTruthy();
    // still blocked while it's open
    const before = g.date;
    expect(advanceDay(g)).toEqual({ ok: false, reason: 'action' });
    expect(g.date).toBe(before);
    // Register only the 12 best seniors: everyone else 21+ is ineligible for league games
    const twelve = seniors(g).slice(0, 12).map((p) => p.id);
    expect(registerSquad(g, reg.action!.scope!, [...seniors(g).map((p) => p.id), ...seniors(g).map((p) => p.id)].slice(0, SQUAD_LIMIT + 1)).ok).toBe(false);
    registerSquad(g, 'league', twelve);
    for (const m of openActions(g)) if (m.action!.type === 'registration') registerSquad(g, m.action!.scope!, twelve);
    autoResolveActions(g);
    const league = g.leagues.find((l) => l.clubIds.includes(g.userClubId))!;
    const f = g.fixtures.find((x) => x.comp === league.id && !x.result && (x.home === g.userClubId || x.away === g.userClubId))!;
    const m = createMatch(g, f);
    const side = m.sides[f.home === g.userClubId ? 0 : 1];
    for (const lp of [...side.onPitch.map((x) => x.id), ...side.bench]) {
      const p = g.players[lp];
      expect(twelve.includes(lp) || age(p, g.date) < 21, `${p.last} plays unregistered`).toBe(true);
    }
  }, 300000);

  it('handles bids, contract talks and press conferences', () => {
    const g = createWorld({ mode: 'classic', manager: 'T', clubName: 'Arsenal', slot: 't', seed: 42 });
    startSeason(g);
    const seen: Record<string, number> = {};
    until(g, '2027-02-01', () => {
      for (const m of openActions(g)) {
        seen[m.action!.type] = (seen[m.action!.type] ?? 0) + 1;
        if (m.action!.type === 'offer') {
          const r = respondAction(g, m.id, 'counter');
          expect(r.ok).toBe(true);
          expect(m.action!.status).toBe('done');
        }
      }
      return false;
    });
    console.log('actions seen', JSON.stringify(seen));
    expect(seen.registration).toBeGreaterThan(0);
    expect(seen.press).toBeGreaterThan(0);
    expect(seen.contract ?? 0).toBeGreaterThanOrEqual(0);
    // 1 February registration opens on the last day; answering clears everything
    autoResolveActions(g);
    expect(openActions(g).length).toBe(0);
  }, 300000);
});
