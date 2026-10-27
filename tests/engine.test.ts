import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/game/generate';
import { autoResolveActions } from '../src/game/actions';
import { advanceDay, pendingUserFixture, startSeason, finishUserMatch } from '../src/game/season';
import { applyResult, changeTactics, createMatch, makeSub, stepMinute } from '../src/game/match';
import { overall } from '../src/game/ratings';
import { compact, expand } from '../src/store';
import { userBid, signFreeAgent } from '../src/game/transfers';
import { boardRequest } from '../src/game/club';

function world() {
  const g = createWorld({ mode: 'classic', manager: 'T', clubName: 'Wrexham', slot: 't', seed: 99 });
  startSeason(g);
  return g;
}

describe('engine', () => {
  it('plays a live match minute by minute with subs and shouts', () => {
    const g = world();
    let guard = 0;
    while (!pendingUserFixture(g) && guard++ < 60) { if (!advanceDay(g).ok) autoResolveActions(g); }
    const f = pendingUserFixture(g)!;
    expect(f).toBeTruthy();
    const m = createMatch(g, f);
    const side = f.home === g.userClubId ? 0 : 1;
    for (let i = 0; i < 45; i++) stepMinute(g, m);
    changeTactics(g, m, side, { mentality: 2 });
    const off = m.sides[side].onPitch.find((p) => p.pos !== 'GK')!;
    const ev = makeSub(g, m, side, off.id, m.sides[side].bench.find((id) => g.players[id].pos !== 'GK')!);
    expect(ev?.type).toBe('sub');
    while (!m.finished) stepMinute(g, m);
    expect(m.minute).toBe(90);
    applyResult(g, m);
    finishUserMatch(g, f);
    expect(f.result).toBeTruthy();
    expect(f.result!.ratings).toBeTruthy();
    // Anything that needs a response (bids, press conferences) blocks the calendar until answered
    if (!advanceDay(g).ok) autoResolveActions(g);
    expect(advanceDay(g).ok).toBe(true);
  });

  it('save round-trips and stays compact', () => {
    const g = world();
    for (let i = 0; i < 20; i++) { if (!advanceDay(g).ok) autoResolveActions(g); }
    const raw = compact(g);
    const back = expand(raw);
    const p = Object.values(g.players)[10];
    expect(overall(back.players[p.id])).toBe(overall(p));
    console.log('compact KB', Math.round(raw.length / 1024));
  });

  it('transfers, free agents and board requests respond', () => {
    const g = world();
    const target = Object.values(g.players).find((p) => p.clubId !== null && p.clubId !== g.userClubId && overall(p) > 60 && overall(p) < 66)!;
    const r = userBid(g, target.id, 50_000_000_000);
    expect(r.ok).toBe(false); // over budget
    const free = Object.values(g.players).filter((p) => p.clubId === null).sort((a, b) => overall(b) - overall(a))[20];
    const s = signFreeAgent(g, free.id);
    console.log('free agent:', s.msg);
    const b = boardRequest(g, 'training');
    expect(typeof b.msg).toBe('string');
  });
});

describe('tactics & detailed stats', () => {
  it('records detailed stats and supports in-match formation changes', () => {
    const g = createWorld({ mode: 'classic', manager: 'T', clubName: 'Arsenal', slot: 't', seed: 5 });
    startSeason(g);
    let guard = 0;
    while (!pendingUserFixture(g) && guard++ < 60) { if (!advanceDay(g).ok) autoResolveActions(g); }
    const f = pendingUserFixture(g)!;
    const m = createMatch(g, f);
    const side = f.home === g.userClubId ? 0 : 1;
    for (let i = 0; i < 30; i++) stepMinute(g, m);
    changeTactics(g, m, side, { formation: '3-5-2', tempo: 2, line: 2, roles: undefined as unknown as string[] });
    expect(m.sides[side].tactics.formation).toBe('3-5-2');
    expect(new Set(m.sides[side].onPitch.map((lp) => lp.slot)).size).toBe(m.sides[side].onPitch.length);
    expect(m.sides[side].onPitch.find((lp) => lp.pos === 'GK')).toBeTruthy();
    while (!m.finished) stepMinute(g, m);
    applyResult(g, m);
    const squad = Object.values(g.players).filter((p) => p.clubId === g.userClubId && p.stats.apps > 0);
    const passes = squad.reduce((s, p) => s + p.stats.passes, 0);
    const passC = squad.reduce((s, p) => s + p.stats.passC, 0);
    const tkl = squad.reduce((s, p) => s + p.stats.tkl, 0);
    console.log('team passes', passes, 'completion', (passC / passes).toFixed(2), 'tackles', tkl, 'shots', squad.reduce((s, p) => s + p.stats.shots, 0));
    expect(passes).toBeGreaterThan(250);
    expect(passC / passes).toBeGreaterThan(0.6);
    expect(passC / passes).toBeLessThan(0.95);
  });
});
