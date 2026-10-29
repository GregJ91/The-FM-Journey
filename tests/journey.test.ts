import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/game/generate';
import { autoResolveActions } from '../src/game/actions';
import { advanceDay, quickPlayUserMatch, startSeason } from '../src/game/season';
import { drawJourneyClub, initJourney, journeySacked, pursue, requestPlayer, upgradeStaff, JOURNEY_LEAGUES } from '../src/game/journey';
import { userBid } from '../src/game/transfers';
import { openActions, respondAction } from '../src/game/actions';

function journeyWorld(seed = 0.3) {
  const name = drawJourneyClub(seed);
  const g = createWorld({ mode: 'classic', manager: 'T', clubName: name, slot: 't', seed: 21 });
  startSeason(g);
  initJourney(g, 'semi', { tactical: 2, motivating: 2, youth: 2 });
  return g;
}
function days(g: ReturnType<typeof createWorld>, n: number) {
  for (let i = 0; i < n; i++) {
    const r = advanceDay(g);
    if (!r.ok && r.reason === 'action') { autoResolveActions(g); i--; continue; }
    if (!r.ok && r.reason === 'match') { quickPlayUserMatch(g); i--; continue; }
  }
}

describe('the journey', () => {
  it('starts at a bottom-tier club in England or Scotland', () => {
    for (const s of [0, 0.25, 0.5, 0.99]) {
      const g = journeyWorld(s);
      expect(JOURNEY_LEAGUES).toContain(g.clubs[g.userClubId].leagueId);
      expect(g.mode).toBe('journey');
      expect(g.managerProfile!.skills.tactical).toBe(11);
    }
  }, 60000);

  it('finds candidates through the director of football and signs one', () => {
    const g = journeyWorld();
    expect(userBid(g, Object.values(g.players).find((p) => p.clubId !== g.userClubId)!.id, 1000).ok).toBe(false);
    expect(requestPlayer(g, 9, 30, 5000).ok).toBe(true);
    days(g, 8);
    const req = g.journey!.requests[0];
    expect(req.status).toBe('ready');
    expect(req.candidates.length).toBeGreaterThanOrEqual(1);
    expect(req.candidates.length).toBeLessThanOrEqual(3);
    for (const c of req.candidates) { expect(c.chance).toBeGreaterThanOrEqual(5); expect(c.chance).toBeLessThanOrEqual(95); expect(c.reasons.length).toBeGreaterThan(0); }
    const best = [...req.candidates].sort((a, b) => b.chance - a.chance)[0];
    g.clubs[g.userClubId].transferBudget = Math.max(g.clubs[g.userClubId].transferBudget, best.fee);
    best.chance = 95;
    expect(pursue(g, req.id, best.playerId).ok).toBe(true);
    days(g, 4);
    expect(['signed', 'failed']).toContain(best.status);
  }, 60000);

  it('asks the board for staff upgrades and moves on after a sacking', () => {
    const g = journeyWorld();
    g.board.confidence = 100;
    g.clubs[g.userClubId].balance = 10_000_000;
    expect(upgradeStaff(g, 'scouting').ok).toBe(true);
    days(g, 11);
    expect(g.journey!.scouting).toBe(2);
    const from = g.userClubId;
    journeySacked(g);
    const job = openActions(g).find((m) => m.action!.type === 'job')!;
    expect(job.action!.options.some((o) => o.id === 'stay')).toBe(false);
    respondAction(g, job.id, job.action!.options[0].id);
    expect(g.userClubId).not.toBe(from);
    expect(g.clubs[g.userClubId].isUser).toBe(true);
    expect(g.clubs[from].isUser).toBe(false);
  }, 60000);
});
