import { useEffect, useMemo, useRef, useState } from 'react';
import { compName } from '../../game/competitions';
import { FORMATIONS, MENTALITY } from '../../game/formations';
import { squadOf } from '../../game/generate';
import { applyResult, changeTactics, createMatch, makeSub, simulateToEnd, stepMinute, type LiveMatch, type MatchEvent } from '../../game/match';
import { overall, ratingAt, shortName } from '../../game/ratings';
import { finishUserMatch, pendingUserFixture } from '../../game/season';
import { validateLineup } from '../../game/selection';
import type { Club, Fixture, GameState } from '../../game/types';
import { getGame, mutate, saveGame, useGame } from '../../store';
import { useUI } from '../context';
import { Ovr, PosTag } from '../components/common';
import { Crest, isLight } from '../components/Crest';
import { PitchLines } from '../components/Pitch';

const MS_PER_MIN = 667; // 90 minutes ≈ 60 seconds at 1x
const SHOUTS = ['V.Defensive', 'Defensive', 'Balanced', 'Attacking', 'All-out attack'];

type Phase = 'pre' | 'live' | 'post';

function colorDistance(a: string, b: string) {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = p(a);
  const [r2, g2, b2] = p(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

/** Kit colours: away side switches to its secondary colour if the primaries clash. */
function kits(home: Club, away: Club): [[string, string], [string, string]] {
  const h: [string, string] = [home.colors[0], home.colors[1]];
  let a: [string, string] = [away.colors[0], away.colors[1]];
  if (colorDistance(h[0], a[0]) < 120) a = [away.colors[1], away.colors[0]];
  if (colorDistance(h[0], a[0]) < 120) a = [isLight(h[0]) ? '#15120f' : '#ffffff', '#ff5a5f'];
  return [h, a];
}

function Scoreboard({ home, away, score, clock, progress }: { home: Club; away: Club; score: string; clock: string; progress?: number }) {
  return (
    <div className="scoreboard">
      <div className="team"><Crest club={home} size={40} /><span>{home.name}</span></div>
      <div>
        <div className="score">{score}</div>
        <div className="clock">{clock}</div>
        {progress !== undefined && <div className="progress"><div style={{ width: `${progress}%` }} /></div>}
      </div>
      <div className="team"><Crest club={away} size={40} /><span>{away.name}</span></div>
    </div>
  );
}

export function MatchScreen() {
  const g = useGame();
  const ui = useUI();
  const fixture = useMemo(() => pendingUserFixture(g), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [phase, setPhase] = useState<Phase>('pre');
  const matchRef = useRef<LiveMatch | null>(null);
  const appliedRef = useRef(false);
  const [, setTick] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [flash, setFlash] = useState<number | null>(null);
  const [halfTime, setHalfTime] = useState(false);
  const [subOff, setSubOff] = useState<number | null>(null);
  const [subOn, setSubOn] = useState<number | null>(null);
  const [sideTab, setSideTab] = useState<'feed' | 'stats' | 'ratings'>('feed');
  const [ballPhase, setBallPhase] = useState(0);
  const pauseUntil = useRef(0);
  const finished = matchRef.current?.finished ?? false;

  // Main clock
  useEffect(() => {
    if (phase !== 'live' || paused) return;
    const iv = setInterval(() => {
      const m = matchRef.current;
      if (!m || m.finished) return;
      if (Date.now() < pauseUntil.current) return;
      setBallPhase((b) => b + 1);
      const evs = stepMinute(getGame()!, m);
      if (evs.some((e) => e.type === 'goal')) {
        setFlash(m.events.length);
        pauseUntil.current = Date.now() + 1400 / speed;
        navigator.vibrate?.(120);
      }
      if (evs.some((e) => e.type === 'ht')) {
        setHalfTime(true);
        pauseUntil.current = Date.now() + 2500 / speed;
        setTimeout(() => setHalfTime(false), 2500 / speed);
      }
      setTick((t) => t + 1);
      if (m.finished) finish();
    }, MS_PER_MIN / speed);
    return () => clearInterval(iv);
  }, [phase, paused, speed]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!fixture) {
    return (
      <div className="match-screen"><div className="match-inner" style={{ display: 'grid', placeItems: 'center' }}>
        <div className="col" style={{ alignItems: 'center' }}><h2>No match today</h2><button className="btn primary" onClick={() => ui.setMatchOpen(false)}>Back</button></div>
      </div></div>
    );
  }

  const home = g.clubs[fixture.home];
  const away = g.clubs[fixture.away];
  const userSide: 0 | 1 = fixture.home === g.userClubId ? 0 : 1;
  const [hk, ak] = kits(home, away);

  function kickOff(instant = false) {
    const game = getGame()!;
    const club = game.clubs[game.userClubId];
    validateLineup(club, squadOf(game, club.id));
    const m = createMatch(game, fixture!);
    matchRef.current = m;
    if (instant) {
      simulateToEnd(game, m);
      finish();
    } else {
      setPhase('live');
    }
  }

  function finish() {
    if (appliedRef.current || !matchRef.current) return;
    appliedRef.current = true;
    const m = matchRef.current;
    mutate((game) => {
      applyResult(game, m);
      finishUserMatch(game, fixture!);
    });
    saveGame().catch(() => {});
    setTimeout(() => setPhase('post'), 900);
  }

  function skipToEnd() {
    const m = matchRef.current;
    if (!m) return;
    simulateToEnd(getGame()!, m);
    setTick((t) => t + 1);
    finish();
  }

  if (phase === 'pre') return <PreMatch g={g} fixture={fixture} onKick={() => kickOff(false)} onInstant={() => kickOff(true)} onTactics={() => { ui.setMatchOpen(false); ui.go('squad', 'tactics'); }} />;

  const m = matchRef.current!;
  if (phase === 'post') return <PostMatch g={g} fixture={fixture} m={m} onClose={() => ui.setMatchOpen(false)} />;

  const userTeam = m.sides[userSide];
  const total = m.stats.poss[0] + m.stats.poss[1] || 1;
  const colors: [string, string] = [hk[0], ak[0]];

  return (
    <div className="match-screen">
      <div className="match-inner">
        <Scoreboard home={home} away={away} score={`${m.score[0]} - ${m.score[1]}`} clock={`${m.finished ? 'FULL TIME' : halfTime ? 'HALF-TIME' : `${m.minute}'`} · ${compName(g, fixture.comp)}`} progress={(m.minute / 90) * 100} />
        <div className="match-scroll">
          <LivePitch m={m} kits={[hk, ak]} ballPhase={ballPhase} />
          <div className="shouts">
            {SHOUTS.map((label, i) => (
              <button key={label} className={`btn sm ${userTeam.tactics.mentality === i - 2 ? 'primary' : ''}`} onClick={() => { changeTactics(getGame()!, m, userSide, { mentality: i - 2 }); setTick((t) => t + 1); }}>{label}</button>
            ))}
          </div>

          {paused && !m.finished && (
            <div className="panel" ref={(el) => el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })}>
              <div className="row"><h3>Substitutions</h3><span className="right chip">{userTeam.subsLeft} left</span></div>
              <div className="grid2" style={{ marginTop: 8, gap: 8 }}>
                <div>
                  <div className="small bold muted">OFF</div>
                  {userTeam.onPitch.map((lp) => (
                    <div key={lp.id} className="row small" style={{ cursor: 'pointer', padding: '6px 4px', borderRadius: 8, background: subOff === lp.id ? 'var(--coral)' : undefined, color: subOff === lp.id ? '#fff' : undefined }} onClick={() => setSubOff(lp.id)}>
                      <b style={{ width: 30 }}>{lp.pos}</b><span className="ellipsis">{g.players[lp.id].last}</span><span className="right">{Math.round(lp.cond)}%</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="small bold muted">ON</div>
                  {userTeam.bench.map((id) => (
                    <div key={id} className="row small" style={{ cursor: 'pointer', padding: '6px 4px', borderRadius: 8, background: subOn === id ? 'var(--lime)' : undefined }} onClick={() => setSubOn(id)}>
                      <b style={{ width: 30 }}>{g.players[id].pos}</b><span className="ellipsis">{g.players[id].last}</span><span className="right">{overall(g.players[id])}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button className="btn primary block" style={{ marginTop: 8 }} disabled={subOff === null || subOn === null || userTeam.subsLeft <= 0} onClick={() => {
                const ev = makeSub(getGame()!, m, userSide, subOff!, subOn!);
                if (ev) m.events.push(ev);
                setSubOff(null); setSubOn(null); setTick((t) => t + 1);
              }}>Make substitution</button>
            </div>
          )}

          <div className="tabs dark-tabs" style={{ margin: '0 -12px', padding: '2px 12px 4px' }}>
            {(['feed', 'stats', 'ratings'] as const).map((t) => (
              <button key={t} className={`tab ${sideTab === t ? 'active' : ''}`} onClick={() => setSideTab(t)}>{t === 'feed' ? 'Commentary' : t === 'stats' ? 'Stats' : 'My Players'}</button>
            ))}
          </div>
          {sideTab === 'feed' && <div className="feed">{[...m.events].reverse().map((e, i) => <EventRow key={m.events.length - i} e={e} />)}</div>}
          {sideTab === 'stats' && (
            <div className="mstats">
              <StatBar label="Possession" a={Math.round((m.stats.poss[0] / total) * 100)} b={Math.round((m.stats.poss[1] / total) * 100)} c={colors} pct />
              <StatBar label="Shots" a={m.stats.shots[0]} b={m.stats.shots[1]} c={colors} />
              <StatBar label="On target" a={m.stats.onTarget[0]} b={m.stats.onTarget[1]} c={colors} />
              <StatBar label="xG" a={Math.round(m.stats.xg[0] * 10) / 10} b={Math.round(m.stats.xg[1] * 10) / 10} c={colors} />
              <StatBar label="Corners" a={m.stats.corners[0]} b={m.stats.corners[1]} c={colors} />
              <StatBar label="Fouls" a={m.stats.fouls[0]} b={m.stats.fouls[1]} c={colors} />
              <StatBar label="Yellow cards" a={m.stats.yellows[0]} b={m.stats.yellows[1]} c={colors} />
            </div>
          )}
          {sideTab === 'ratings' && (
            <div className="feed">
              {userTeam.onPitch.map((lp) => (
                <div key={lp.id} className="row" style={{ fontSize: 13.5, padding: '6px 8px', background: '#1f3428', borderRadius: 8 }}>
                  <PosTag pos={lp.pos} />
                  <b className="ellipsis" style={{ flex: 1 }}>{shortName(g.players[lp.id])}{lp.goals ? ' ⚽'.repeat(lp.goals) : ''}{lp.yellow ? ' 🟨' : ''}</b>
                  <span className="mini-bar" style={{ background: '#2d4a3a' }}><div style={{ width: `${lp.cond}%`, background: lp.cond > 70 ? 'var(--grass)' : lp.cond > 55 ? 'var(--yellow)' : 'var(--coral)' }} /></span>
                  <b style={{ width: 30, textAlign: 'right', color: lp.rating >= 7 ? 'var(--lime)' : lp.rating < 6 ? 'var(--coral)' : '#fff' }}>{Math.max(3, Math.min(10, lp.rating)).toFixed(1)}</b>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="match-controls">
          <button className="btn yellow" disabled={finished} onClick={() => setPaused(!paused)}>{paused ? '▶ Play' : '⏸ Subs'}</button>
          <div className="seg" style={{ flex: 1 }}>
            {[1, 2, 4].map((s) => <button key={s} className={speed === s ? 'on' : ''} onClick={() => setSpeed(s)}>{s}x</button>)}
          </div>
          <button className="btn" disabled={finished} onClick={skipToEnd}>⏭ Skip</button>
        </div>
      </div>
      {flash !== null && <div className="goal-flash" key={flash} onAnimationEnd={() => setFlash(null)}><div>GOAL!</div></div>}
    </div>
  );
}

function EventRow({ e }: { e: MatchEvent }) {
  const ico: Partial<Record<MatchEvent['type'], string>> = { goal: '⚽', yellow: '🟨', red: '🟥', injury: '🩹', sub: '🔁', save: '🧤', miss: '💨', ft: '🏁', ht: '⏸️', kickoff: '📣', pens: '🎯' };
  return (
    <div className={`ev ${e.type}`}>
      <span className="m">{`${e.minute}'`}</span>
      <span>{ico[e.type] ?? ''} {e.text}</span>
    </div>
  );
}

function StatBar({ label, a, b, c, pct }: { label: string; a: number; b: number; c: [string, string]; pct?: boolean }) {
  const t = a + b || 1;
  return (
    <div className="mstat">
      <div className="lbl">{label}</div>
      <span>{a}{pct ? '%' : ''}</span>
      <div className="b"><div style={{ width: `${(a / t) * 100}%`, background: c[0] }} /><div style={{ width: `${(b / t) * 100}%`, background: c[1] }} /></div>
      <span className="r">{b}{pct ? '%' : ''}</span>
    </div>
  );
}

/** Portrait pitch: home attacks upwards, away downwards. */
function LivePitch({ m, kits: k, ballPhase }: { m: LiveMatch; kits: [[string, string], [string, string]]; ballPhase: number }) {
  const poss = m.possTeam;
  const dots: { key: number; left: number; top: number; fill: string; stroke: string; num: string }[] = [];
  m.sides.forEach((side, si) => {
    side.onPitch.forEach((lp, idx) => {
      const push = lp.pos === 'GK' ? 0 : poss === si ? 8 : -5;
      const jx = Math.sin(m.minute * 1.7 + lp.id) * 3;
      const jy = Math.cos(m.minute * 1.3 + lp.id * 2) * 3;
      const fwd = Math.max(3, Math.min(95, lp.x * 0.9 + 4 + push + jx)); // 0 = own goal
      const lat = Math.max(6, Math.min(94, lp.y + jy));
      const top = si === 0 ? 100 - fwd : fwd;
      const left = si === 0 ? lat : 100 - lat;
      dots.push({ key: lp.id, left, top, fill: k[si][0], stroke: k[si][1], num: String(idx + 1) });
    });
  });
  // Between minutes the ball drifts through midfield; on the minute it jumps to the action
  const bx = ballPhase % 2 === 0 ? m.ball.x : 50 + (m.ball.x - 50) * 0.4;
  const by = ballPhase % 2 === 0 ? m.ball.y : 50 + (m.ball.y - 50) * 0.6;
  return (
    <div className="match-pitch">
      <PitchLines vertical />
      {dots.map((d) => (
        <div key={d.key} className="pl" style={{ left: `${d.left}%`, top: `${d.top}%`, background: d.fill, borderColor: d.stroke, color: isLight(d.fill) ? '#15120f' : '#fff' }}>{d.num}</div>
      ))}
      <div className="ball" style={{ left: `${Math.max(2, Math.min(98, by))}%`, top: `${Math.max(1, Math.min(99, 100 - bx))}%` }} />
    </div>
  );
}

function PreMatch({ g, fixture, onKick, onInstant, onTactics }: { g: GameState; fixture: Fixture; onKick: () => void; onInstant: () => void; onTactics: () => void }) {
  const home = g.clubs[fixture.home];
  const away = g.clubs[fixture.away];
  const user = g.clubs[g.userClubId];
  const squad = squadOf(g, user.id);
  const slots = FORMATIONS[user.tactics.formation];
  const xi = user.lineup.map((id, i) => (id !== null && g.players[id] ? { p: g.players[id], pos: slots[i]?.pos } : null)).filter(Boolean) as { p: GameState['players'][number]; pos: (typeof slots)[number]['pos'] }[];
  const oppId = fixture.home === user.id ? fixture.away : fixture.home;
  const opp = squadOf(g, oppId).sort((a, b) => overall(b) - overall(a)).slice(0, 3);
  const out = squad.filter((p) => p.injury || p.suspended > 0);
  return (
    <div className="match-screen">
      <div className="match-inner">
        <Scoreboard home={home} away={away} score="VS" clock={`${compName(g, fixture.comp)}${fixture.roundName ? ` · ${fixture.roundName}` : ''}`} />
        <div className="match-scroll">
          <div className="small" style={{ color: '#a8c6b4', textAlign: 'center' }}>{fixture.neutral ? 'Neutral venue' : home.stadium} · {user.tactics.formation} · {MENTALITY[user.tactics.mentality + 2]}</div>
          <div className="panel">
            <h3>Your XI</h3>
            <div className="list" style={{ marginTop: 4 }}>
              {xi.map(({ p, pos }) => (
                <div key={p.id} className="row" style={{ padding: '5px 0', borderBottom: '1px solid var(--soft)' }}>
                  <PosTag pos={pos} /><b className="ellipsis" style={{ flex: 1 }}>{shortName(p)}</b><span className="small muted">{Math.round(p.condition)}%</span><Ovr value={Math.round(ratingAt(p, pos))} />
                </div>
              ))}
            </div>
            {out.length > 0 && <div className="small" style={{ marginTop: 8, color: 'var(--bad)', fontWeight: 700 }}>Unavailable: {out.map((p) => `${p.last} ${p.injury ? '🩹' : '🟥'}`).join(', ')}</div>}
          </div>
          <div className="panel">
            <h3>Danger men</h3>
            {opp.map((p) => <div key={p.id} className="row" style={{ padding: '5px 0' }}><PosTag pos={p.pos} /><b style={{ flex: 1 }}>{shortName(p)}</b><Ovr value={overall(p)} /></div>)}
          </div>
          <div className="small" style={{ color: '#a8c6b4', textAlign: 'center' }}>About a minute long. Tap ⏸ Subs to make changes, and use shouts to change mentality.</div>
        </div>
        <div className="match-controls" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <button className="continue-btn match" onClick={onKick}>⚽ Kick off</button>
          <div className="grid2">
            <button className="btn" onClick={onTactics}>✏️ Tactics</button>
            <button className="btn" onClick={onInstant}>⏭ Instant result</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PostMatch({ g, fixture, m, onClose }: { g: GameState; fixture: Fixture; m: LiveMatch; onClose: () => void }) {
  const home = g.clubs[fixture.home];
  const away = g.clubs[fixture.away];
  const r = fixture.result!;
  const userSide: 0 | 1 = fixture.home === g.userClubId ? 0 : 1;
  const ratings = r.ratings ?? {};
  const mine = [...m.sides[userSide].onPitch, ...m.sides[userSide].out].map((lp) => ({ lp, p: g.players[lp.id], r: ratings[lp.id] ?? 6 })).filter((x) => x.p).sort((a, b) => b.r - a.r);
  const won = (userSide === 0 ? r.hg > r.ag : r.ag > r.hg) || (r.pens && r.pens[userSide] > r.pens[1 - userSide]);
  const lost = !won && r.hg !== r.ag;
  const motm = r.motm ? g.players[r.motm] : null;
  const [hk, ak] = kits(home, away);
  const scorerLine = (team: 0 | 1) => r.goals.filter((x) => x.team === team).map((x) => `${g.players[x.scorer] ? g.players[x.scorer].last : '?'} ${x.minute}'${x.pen ? ' (p)' : ''}`).join(', ');
  return (
    <div className="match-screen">
      <div className="match-inner">
        <Scoreboard home={home} away={away} score={`${r.hg} - ${r.ag}`} clock={`FULL TIME${r.pens ? ` · ${r.pens[0]}-${r.pens[1]} pens` : ''}`} />
        <div className="match-scroll">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 40, color: won ? 'var(--lime)' : lost ? 'var(--coral)' : 'var(--yellow)' }}>{won ? 'VICTORY!' : lost ? 'DEFEAT' : 'DRAW'}</div>
            <div className="small" style={{ color: '#a8c6b4' }}>{home.short}: {scorerLine(0) || '—'}<br />{away.short}: {scorerLine(1) || '—'}</div>
          </div>
          {r.stats && (
            <div className="panel">
              <div className="mstats">
                <StatBar label="Possession" a={Math.round((r.stats.poss[0] / Math.max(1, r.stats.poss[0] + r.stats.poss[1])) * 100)} b={Math.round((r.stats.poss[1] / Math.max(1, r.stats.poss[0] + r.stats.poss[1])) * 100)} c={[hk[0], ak[0]]} pct />
                <StatBar label="Shots" a={r.stats.shots[0]} b={r.stats.shots[1]} c={[hk[0], ak[0]]} />
                <StatBar label="On target" a={r.stats.onTarget[0]} b={r.stats.onTarget[1]} c={[hk[0], ak[0]]} />
                <StatBar label="xG" a={r.stats.xg[0]} b={r.stats.xg[1]} c={[hk[0], ak[0]]} />
              </div>
            </div>
          )}
          <div className="panel">
            <div className="row"><h3>Ratings</h3>{motm && <span className="right chip" style={{ background: 'var(--yellow)' }}>⭐ {motm.last}</span>}</div>
            {mine.map(({ lp, p, r: rt }) => (
              <div key={lp.id} className="row" style={{ padding: '6px 0', borderBottom: '1px solid var(--soft)' }}>
                <PosTag pos={lp.pos} />
                <b className="ellipsis" style={{ flex: 1 }}>{shortName(p)} {lp.goals ? '⚽'.repeat(lp.goals) : ''}{lp.assists ? '🅰️' : ''}{lp.yellow ? '🟨' : ''}{lp.red ? '🟥' : ''}{lp.injured ? '🩹' : ''}</b>
                <span className="small muted">{lp.on > 0 ? `${lp.on}'↑` : lp.off !== null && lp.off < 90 ? `${lp.off}'↓` : ''}</span>
                <b style={{ fontFamily: 'var(--display)', fontSize: 17, width: 36, textAlign: 'right', color: rt >= 7.5 ? 'var(--good)' : rt < 6 ? 'var(--bad)' : undefined }}>{rt.toFixed(1)}</b>
              </div>
            ))}
          </div>
        </div>
        <div className="match-controls">
          <button className="continue-btn" onClick={onClose}>Continue ▶</button>
        </div>
      </div>
    </div>
  );
}
