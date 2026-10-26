import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/game/generate';
import { advanceDay, quickPlayUserMatch, startSeason } from '../src/game/season';
import { groupTable, matchWinner, nationName, topScorers } from '../src/game/intl';
import { CWC_ID, cwcGroupTable } from '../src/game/world';

function runUntil(g: ReturnType<typeof createWorld>, date: string) {
  let guard = 0;
  while (g.date < date && guard++ < 5000) {
    const r = advanceDay(g);
    if (!r.ok && r.reason === 'match') quickPlayUserMatch(g);
    else if (!r.ok && r.reason === 'sacked') { g.sacked = false; g.board.confidence = 60; }
  }
}

describe('world football', () => {
  it('plays international tournaments and the 2029 Club World Cup', () => {
    const g = createWorld({ mode: 'classic', manager: 'T', clubName: 'Real Madrid', slot: 't', seed: 21 });
    startSeason(g);
    runUntil(g, '2027-02-10');
    const asian = g.intl!.find((t) => t.id === 'ASIAN-2027')!;
    expect(asian.winner).toBeTruthy();
    expect(asian.teams.length).toBe(24);
    runUntil(g, '2028-07-20');
    for (const id of ['AFCON-2027', 'EURO-2028', 'COPA-2028']) {
      const t = g.intl!.find((x) => x.id === id)!;
      expect(t, id).toBeTruthy();
      expect(t.winner, id).toBeTruthy();
      const final = t.matches[t.matches.length - 1];
      expect(matchWinner(final)).toBe(t.winner);
      const scorers = topScorers(g, t, 3).map((s) => `${s.name} (${s.nat}) ${s.goals}`).join(', ');
      console.log(t.name, '→', nationName(t.winner!), 'beat', nationName(t.runnerUp!), '| fav strength', Object.entries(t.strength).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c, s]) => `${c} ${s}`).join(' '), '| scorers', scorers);
      if (id === 'EURO-2028') console.log('Group A', groupTable(t, 0).map((r) => `${r.nat} ${r.pts}`).join(', '));
    }
    // nobody is left "away" once tournaments end
    expect(Object.values(g.players).filter((p) => p.away).length).toBe(0);
    runUntil(g, '2029-07-02');
    const cwc = g.cups.find((c) => c.id === CWC_ID)!;
    expect(cwc).toBeTruthy();
    expect(cwc.teams!.length).toBe(32);
    expect(cwc.winner).not.toBeNull();
    console.log('CWC 2029 winner', g.clubs[cwc.winner!].name, 'beat', g.clubs[cwc.runnerUp!].name, '| group A', cwcGroupTable(g, cwc, 0).map((r) => `${g.clubs[r.clubId].name} ${r.pts}`).join(', '));
    console.log('caps leaders', Object.values(g.players).filter((p) => p.caps).sort((a, b) => (b.intGoals ?? 0) - (a.intGoals ?? 0)).slice(0, 5).map((p) => `${p.first} ${p.last} ${p.caps} caps ${p.intGoals ?? 0} goals`).join('; '));
    expect(g.season).toBe(2029);
  }, 300000);
});
