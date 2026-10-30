// CM 01/02 careers: the job market (vacancies, applying, approaches, the sack and moving club), attribute search
// values, and captains / set-piece takers.
import { existsSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { autoResolveActions, respondAction } from '../src/game/actions';
import { cmAttributes, attrByLabel } from '../src/game/cm0102/attrs';
import { scramble } from '../src/game/cm0102/pack';
import { CM_BUILTIN } from '../src/game/cm0102/parse';
import { checkSacking } from '../src/game/club';
import { createWorld, squadOf } from '../src/game/generate';
import { applyForJob, jobsOf } from '../src/game/jobs';
import { createMatch, setPieceSkill, setPieceTaker } from '../src/game/match';
import { advanceDay, pendingUserFixture, quickPlayUserMatch, startSeason } from '../src/game/season';

const DB = `public/${CM_BUILTIN}`;
const load = () => JSON.parse(gunzipSync(scramble(Buffer.from(readFileSync(DB, 'utf8'), 'base64'))).toString());

function playUntil(g: ReturnType<typeof createWorld>, date: string) {
  for (let i = 0; i < 2000 && g.date < date; i++) {
    const r = advanceDay(g);
    if (!r.ok && r.reason === 'action') { autoResolveActions(g); continue; }
    if (!r.ok && r.reason === 'match') { quickPlayUserMatch(g); continue; }
    if (!r.ok) throw new Error(r.reason);
  }
}

describe.skipIf(!existsSync(DB))('CM 01/02 career', () => {
  it('runs a job market: vacancies, applications, approaches, the sack and moving club', () => {
    const g = createWorld({ mode: 'classic', manager: 'T', clubName: 'Middlesbrough', slot: 't', seed: 21, cm: load() });
    startSeason(g);
    const boro = g.userClubId;
    playUntil(g, '2002-12-02');
    const j = jobsOf(g);
    expect(j.vacancies.length).toBeGreaterThan(0);
    expect(j.career[0].clubId).toBe(boro);

    // Apply for a job a notch below: offered after a few days, and taking it moves the career
    const target = j.vacancies.map((v) => g.clubs[v.clubId]).filter((c) => c.reputation < g.clubs[boro].reputation)[0]
      ?? Object.values(g.clubs).find((c) => c.leagueId === 'ENG2')!;
    if (!j.vacancies.some((v) => v.clubId === target.id)) j.vacancies.push({ clubId: target.id, since: g.date });
    expect(applyForJob(g, target.id).ok).toBe(true);
    expect(applyForJob(g, target.id).ok).toBe(false);
    for (let i = 0; i < 4; i++) { const r = advanceDay(g); if (!r.ok && r.reason === 'match') quickPlayUserMatch(g); }
    const offer = g.inbox.find((m) => m.action?.type === 'job' && m.action.status === 'open')!;
    expect(offer).toBeTruthy();
    const res = squadOf(g, boro)[0];
    res.squad = 'reserve';
    respondAction(g, offer.id, String(target.id));
    expect(g.userClubId).toBe(target.id);
    expect(g.clubs[target.id].isUser).toBe(true);
    expect(g.clubs[boro].isUser).toBe(false);
    expect(res.squad).toBe('first'); // the new man at Boro picks from everyone
    expect(j.career.map((c) => c.clubId)).toEqual([boro, target.id]);
    expect(j.vacancies.some((v) => v.clubId === boro)).toBe(true);

    // Sacked: a choice of smaller clubs, one of which must be taken
    g.board.confidence = 0;
    checkSacking(g);
    expect(g.sacked).toBe(false);
    const sack = g.inbox.find((m) => m.action?.type === 'job' && m.action.status === 'open')!;
    expect(sack.action!.options.some((o) => o.id === 'stay')).toBe(false);
    const next = Number(sack.action!.options[0].id);
    expect(g.clubs[next].reputation).toBeLessThan(target.reputation);
    respondAction(g, sack.id, String(next));
    expect(g.userClubId).toBe(next);
    expect(j.career).toHaveLength(3);
    playUntil(g, '2003-01-10'); // carries on at the new club
    expect(g.fixtures.some((f) => f.result && (f.home === next || f.away === next) && f.date > '2002-12-10')).toBe(true);
  }, 600000);

  it('searches attributes as the profile shows them, and uses the captain and set-piece takers', () => {
    const g = createWorld({ mode: 'classic', manager: 'T', clubName: 'Manchester United', slot: 't', seed: 22, cm: load() });
    startSeason(g);
    const beckham = Object.values(g.players).find((p) => p.last === 'Beckham' && p.first === 'David')!;
    const shown = Object.fromEntries(cmAttributes(beckham)!.flatMap((gr) => gr.rows).map(([k, v]) => [k, Math.round(v)]));
    for (const k of ['Free Kicks', 'Crossing', 'Corners', 'Pace', 'Influence']) expect(attrByLabel(beckham, k)).toBe(shown[k]);
    expect(attrByLabel(beckham, 'Free Kicks')).toBeGreaterThanOrEqual(17);

    for (let i = 0; i < 80 && !pendingUserFixture(g); i++) if (!advanceDay(g).ok) autoResolveActions(g);
    const f = pendingUserFixture(g)!;
    const club = g.clubs[g.userClubId];
    const side = createMatch(g, f).sides[f.home === club.id ? 0 : 1];
    // Auto: the best on the pitch at each
    const fk = setPieceTaker(g, side, 'fk')!;
    for (const lp of side.onPitch) if (lp.pos !== 'GK') expect(setPieceSkill(g.players[fk.id], 'fk')).toBeGreaterThanOrEqual(setPieceSkill(g.players[lp.id], 'fk'));
    // The manager's choice while he's on the pitch
    const pick = side.onPitch.find((lp) => lp.pos !== 'GK' && lp.id !== fk.id)!;
    club.setPieces = { fk: pick.id, captain: pick.id };
    expect(setPieceTaker(g, side, 'fk')!.id).toBe(pick.id);
    expect(setPieceTaker(g, side, 'captain')!.id).toBe(pick.id);
    club.setPieces = { fk: -1 };
    expect(setPieceTaker(g, side, 'fk')!.id).toBe(fk.id);
  }, 300000);
});
