import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/game/generate';
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
    while (!pendingUserFixture(g) && guard++ < 60) advanceDay(g);
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
    expect(advanceDay(g).ok).toBe(true);
  });

  it('save round-trips and stays compact', () => {
    const g = world();
    for (let i = 0; i < 20; i++) advanceDay(g);
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
