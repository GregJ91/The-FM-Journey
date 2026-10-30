import { useEffect, useMemo, useRef, useState } from 'react';
import { compName } from '../../game/competitions';
import { FORMATIONS, MENTALITY } from '../../game/formations';
import { squadOf } from '../../game/generate';
import { aggGoals, applyResult, changeTactics, setMarks, createMatch, makeSub, simulateToEnd, stepMinute, type LiveMatch, type MatchEvent } from '../../game/match';
import { overall, ratingAt, shortName } from '../../game/ratings';
import { finishUserMatch, numberUserSquad, pendingUserFixture } from '../../game/season';
import { validateLineup } from '../../game/selection';
import type { Club, Fixture, GameState } from '../../game/types';
import { getGame, mutate, autoSave, useGame } from '../../store';
import { useUI } from '../context';
import { Ovr, PosTag, Sheet } from '../components/common';
import { TeamInstructions } from '../components/TacticsEditor';
import { statSummary } from '../components/PlayerStats';
import { Crest, isLight } from '../components/Crest';
import { useLandscape } from '../useLandscape';
import { Fit } from '../components/Fit';
import { RunArrowsBox, RunPitch, setRunIn, type ArrowMode } from '../components/RunPitch';
import { InstructionsPanel, ManMarking, setInstrIn } from '../components/PlayerInstructions';
import { hasInstr, instrFor } from '../../game/tactics';

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
  const [flashGoal, setFlashGoal] = useState<MatchEvent | null>(null);
  const [halfTime, setHalfTime] = useState(false);
  const [subOff, setSubOff] = useState<number | null>(null);
  const [subOn, setSubOn] = useState<number | null>(null);
  const [sideTab, setSideTab] = useState<'feed' | 'stats' | 'ratings' | 'pitch'>('feed');
  const [arrows, setArrows] = useState<ArrowMode>('off');
  const [pitchOf, setPitchOf] = useState<'us' | 'them'>('us');
  const [instrSlot, setInstrSlot] = useState<number | null>(null);
  const [tacticsOpen, setTacticsOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const histRef = useRef<Snap[]>([]);
  const landscape = useLandscape();
  const pauseUntil = useRef(0);
  const finished = matchRef.current?.finished ?? false;

  // Main clock
  useEffect(() => {
    if (phase !== 'live' || paused) return;
    const iv = setInterval(() => {
      const m = matchRef.current;
      if (!m || m.finished) return;
      if (Date.now() < pauseUntil.current) return;
      const evs = stepMinute(getGame()!, m);
      histRef.current.push({ min: m.minute, xg: [...m.stats.xg] as [number, number], shots: [...m.stats.shots] as [number, number], poss: [...m.stats.poss] as [number, number] });
      const goal = evs.find((e) => e.type === 'goal');
      if (goal) {
        setFlash(m.events.length);
        setFlashGoal(goal);
        pauseUntil.current = Date.now() + 1400 / speed;
        navigator.vibrate?.(120);
      }
      // Half-time: the match stops (as in CM) until you start the second half
      if (evs.some((e) => e.type === 'ht')) {
        setHalfTime(true);
        setPaused(true);
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
    numberUserSquad(game);
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
    autoSave().catch(() => {});
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
  const mySlots = FORMATIONS[userTeam.tactics.formation];
  const myPlayers = mySlots.map((_, i) => { const lp = userTeam.onPitch.find((x) => x.slot === i); return lp ? g.players[lp.id] ?? null : null; });
  const myRuns = (userTeam.tactics.runs ?? []).filter((r) => r.f === userTeam.tactics.formation);
  // The other side's shape and runs (the Pitch tab can show either)
  const oppTeam = m.sides[userSide === 0 ? 1 : 0];
  const oppSlots = FORMATIONS[oppTeam.tactics.formation];
  const oppPlayers = oppSlots.map((_, i) => { const lp = oppTeam.onPitch.find((x) => x.slot === i); return lp ? g.players[lp.id] ?? null : null; });
  const oppRuns = (oppTeam.tactics.runs ?? []).filter((r) => r.f === oppTeam.tactics.formation);
  const total = m.stats.poss[0] + m.stats.poss[1] || 1;
  const colors: [string, string] = [hk[0], ak[0]];
  const refresh = () => setTick((t) => t + 1);
  const mom = momentum(histRef.current, userSide);
  const lastEv = [...m.events].reverse().find((e) => e.type !== 'kickoff') ?? m.events[m.events.length - 1];

  const shouts = (
    <div className="shouts">
      {SHOUTS.map((label, i) => (
        <button key={label} className={`btn sm ${userTeam.tactics.mentality === i - 2 ? 'primary' : ''}`} onClick={() => { changeTactics(getGame()!, m, userSide, { mentality: i - 2 }); refresh(); }}>{label}</button>
      ))}
    </div>
  );

  const subsPanel = paused && !m.finished && (
    <div className="panel" ref={(el) => { if (!landscape) el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }}>
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
            <div key={id} className="row small" style={{ cursor: 'pointer', padding: '6px 4px', borderRadius: 8, background: subOn === id ? 'var(--accent)' : undefined, color: subOn === id ? 'var(--accent-ink)' : undefined }} onClick={() => setSubOn(id)}>
              <b style={{ width: 30 }}>{g.players[id].pos}</b><span className="ellipsis">{g.players[id].last}</span><span className="right ab">{overall(g.players[id])}</span>
            </div>
          ))}
        </div>
      </div>
      <button className="btn primary block" style={{ marginTop: 8 }} disabled={subOff === null || subOn === null || userTeam.subsLeft <= 0} onClick={() => {
        const ev = makeSub(getGame()!, m, userSide, subOff!, subOn!);
        if (ev) m.events.push(ev);
        setSubOff(null); setSubOn(null); refresh();
      }}>Make substitution</button>
    </div>
  );

  const tacticsSheet = tacticsOpen && (
    <Sheet title={`Tactics · ${m.minute}'`} onClose={() => { setTacticsOpen(false); setPaused(halfTime); }} right={<span className="chip">{userTeam.tactics.formation}</span>}>
      <div className="sheet-b">
        {/* Redraw run arrows mid-match, CM-style */}
        <RunArrowsBox mode={arrows} onMode={setArrows} onClear={myRuns.length ? () => { changeTactics(getGame()!, m, userSide, { runs: (userTeam.tactics.runs ?? []).filter((r) => r.f !== userTeam.tactics.formation) }); refresh(); } : undefined} />
        <div className="match-runs-edit">
          <RunPitch slots={mySlots} players={myPlayers} runs={myRuns} mode={arrows} showRating={false} selected={instrSlot}
            badge={(i) => hasInstr(instrFor(userTeam.tactics, i))}
            onTapSlot={(i) => setInstrSlot(instrSlot === i ? null : i)}
            hint="Tap a player for his instructions."
            onRun={(slot, to) => { changeTactics(getGame()!, m, userSide, { runs: setRunIn(userTeam.tactics.runs, userTeam.tactics.formation, slot, to, arrows === 'ball') }); refresh(); }} />
        </div>
        {instrSlot !== null && mySlots[instrSlot] && (
          <div className="card" style={{ padding: 10, marginBottom: 12 }}>
            <InstructionsPanel instr={instrFor(userTeam.tactics, instrSlot)} pos={mySlots[instrSlot].pos} name={myPlayers[instrSlot] ? shortName(myPlayers[instrSlot]!) : mySlots[instrSlot].pos}
              onChange={(patch) => { changeTactics(getGame()!, m, userSide, { instr: setInstrIn(userTeam.tactics, instrSlot, patch) }); refresh(); }} />
          </div>
        )}
        <div className="section-label">Man-marking</div>
        <div style={{ marginBottom: 12 }}>
          <ManMarking mine={myPlayers.filter((p): p is NonNullable<typeof p> => !!p)} theirs={oppPlayers.filter((p): p is NonNullable<typeof p> => !!p)} marks={userTeam.marks ?? []}
            onChange={(list) => { setMarks(getGame()!, m, userSide, list); refresh(); }} />
        </div>
        <TeamInstructions g={g} live tactics={userTeam.tactics}
          lineup={FORMATIONS[userTeam.tactics.formation].map((_, i) => userTeam.onPitch.find((lp) => lp.slot === i)?.id ?? null)}
          onChange={(t) => { changeTactics(getGame()!, m, userSide, t); refresh(); }}
          autoSubs={g.autoSubs} onAutoSubs={(v) => { mutate((gg) => { gg.autoSubs = v; }); refresh(); }} />
        <button className="btn primary block" onClick={() => { setTacticsOpen(false); setPaused(halfTime); }}>{halfTime ? 'Back to half-time' : 'Back to the match'}</button>
      </div>
    </Sheet>
  );
  const scorerClub = flashGoal && flashGoal.team >= 0 ? (flashGoal.team === 0 ? home : away) : null;
  const goalFlash = flash !== null && (
    <div className="goal-flash" key={flash} onAnimationEnd={() => setFlash(null)} style={scorerClub ? ({ '--gf': scorerClub.colors[0] } as React.CSSProperties) : undefined}>
      <div>GOAL!</div>
      {flashGoal && (
        <p>
          {flashGoal.player !== undefined && g.players[flashGoal.player] ? `${shortName(g.players[flashGoal.player])} ${flashGoal.minute}'` : `${flashGoal.minute}'`}
          <br /><b>{home.short} {m.score[0]} - {m.score[1]} {away.short}</b>
        </p>
      )}
    </div>
  );

  // Commentary-only match view (Championship Manager style): everything fits the screen, nothing to scroll
  const pct = (a: number) => Math.round((a / total) * 100);
  const big = [...m.events].reverse().find((e) => e.type !== 'kickoff' && e.type !== 'sub') ?? lastEv;
  const keyEvents = m.events.filter((e) => e.type === 'goal' || e.type === 'red');
  return (
    <div className="match-screen">
      <div className={`comm ${landscape ? 'land' : ''}`}>
        <CommTop home={home} away={away} mid={`${m.score[0]} - ${m.score[1]}`} sub={`${m.finished ? 'FULL TIME' : halfTime ? 'HALF-TIME' : `${m.minute}'`} · ${m.agg0 ? `agg ${aggGoals(m, 0)}-${aggGoals(m, 1)}` : compName(g, fixture.comp)}`} progress={(m.minute / 90) * 100} />

        <div className="comm-body">
          {/* Championship Manager-style commentary: one bar that updates as the match goes */}
          <div className="comm-main">
            <div className={`comm-bar ${big?.type ?? ''}`} key={m.events.length}>{big && <><span className="m">{big.minute}'</span><span className="txt">{big.text}</span></>}</div>
            {keyEvents.length > 0 && (
              <div className="comm-keys">
                {keyEvents.map((e, i) => (
                  <span key={i} className={`ke ${e.team === 1 ? 'away' : 'home'}`}>
                    {e.type === 'goal' ? '⚽' : '🟥'} {e.player !== undefined && g.players[e.player] ? shortName(g.players[e.player]) : ''} {e.minute}'
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="comm-side">
            <div className="seg comm-tabs">
              <button className={sideTab !== 'ratings' && sideTab !== 'pitch' ? 'on' : ''} onClick={() => setSideTab('stats')}>Stats</button>
              <button className={sideTab === 'ratings' ? 'on' : ''} onClick={() => setSideTab('ratings')}>My players</button>
              <button className={sideTab === 'pitch' ? 'on' : ''} onClick={() => setSideTab('pitch')}>Pitch</button>
            </div>
            {sideTab === 'pitch' ? (
              // Your shape and run arrows, as on the tactics screen
              <>
                <div className="seg pitch-of">
                  <button className={pitchOf === 'us' ? 'on' : ''} onClick={() => setPitchOf('us')}>{g.clubs[userTeam.clubId].short} · {userTeam.tactics.formation}</button>
                  <button className={pitchOf === 'them' ? 'on' : ''} onClick={() => setPitchOf('them')}>{g.clubs[oppTeam.clubId].short} · {oppTeam.tactics.formation}</button>
                </div>
                {pitchOf === 'us'
                  ? <RunPitch slots={mySlots} players={myPlayers} runs={myRuns} showRating={false} className="match-runs" />
                  : <RunPitch slots={oppSlots} players={oppPlayers} runs={oppRuns} showRating={false} className="match-runs opp" />}
              </>
            ) : sideTab !== 'ratings' ? (
              <div className="comm-stats">
                <div className={`mom-strip ${mom.tone}`}><b>{mom.label}</b><div className="mom-bars"><MomBars bars={mom.bars} /></div></div>
                <StatBar label="Possession" a={pct(m.stats.poss[0])} b={pct(m.stats.poss[1])} c={colors} pct />
                <StatBar label="Shots" a={m.stats.shots[0]} b={m.stats.shots[1]} c={colors} />
                <StatBar label="On target" a={m.stats.onTarget[0]} b={m.stats.onTarget[1]} c={colors} />
                <StatBar label="xG" a={Math.round(m.stats.xg[0] * 10) / 10} b={Math.round(m.stats.xg[1] * 10) / 10} c={colors} />
                <StatBar label="Corners" a={m.stats.corners[0]} b={m.stats.corners[1]} c={colors} />
                <StatBar label="Cards" a={m.stats.yellows[0]} b={m.stats.yellows[1]} c={colors} />
              </div>
            ) : (
              <Fit className="comm-ratings"><div className="pane-list">
                {userTeam.onPitch.map((lp) => (
                  <div key={lp.id} className="cr">
                    <PosTag pos={lp.pos} />
                    <span className="ellipsis">{shortName(g.players[lp.id])}{lp.goals ? ' ⚽'.repeat(lp.goals) : ''}{lp.yellow ? ' 🟨' : ''}</span>
                    <span className="mini-bar"><div style={{ width: `${lp.cond}%`, background: lp.cond > 70 ? 'var(--grass)' : lp.cond > 55 ? 'var(--yellow)' : 'var(--coral)' }} /></span>
                    <b style={{ color: lp.rating >= 7 ? 'var(--lime)' : lp.rating < 6 ? 'var(--coral)' : '#fff' }}>{Math.max(3, Math.min(10, lp.rating)).toFixed(1)}</b>
                  </div>
                ))}
              </div></Fit>
            )}
          </div>
        </div>

        <div className="comm-bottom">
          {shouts}
          <div className="comm-actions">
            <button className="btn yellow" disabled={finished} onClick={() => { setPaused(true); setDrawer(true); }}>Subs</button>
            <button className="btn" disabled={finished} onClick={() => { setPaused(true); setTacticsOpen(true); }}>Tactics</button>
            <button className="btn" disabled={finished} onClick={() => { if (halfTime) setHalfTime(false); setPaused(!paused); }}>{halfTime ? '2nd half' : paused ? 'Play' : 'Pause'}</button>
            <div className="seg">
              {[1, 2, 4].map((sp) => <button key={sp} className={speed === sp ? 'on' : ''} onClick={() => setSpeed(sp)}>{sp}x</button>)}
            </div>
            <button className="btn" disabled={finished} onClick={skipToEnd}>Skip</button>
          </div>
        </div>
      </div>
      {drawer && (
        <Sheet title="Substitutions" onClose={() => { setDrawer(false); setPaused(halfTime); }}>
          <div className="sheet-b col" style={{ gap: 12 }}>{subsPanel}</div>
        </Sheet>
      )}
      {/* (after any goal celebration has finished) */}
      {halfTime && flash === null && !drawer && !tacticsOpen && !m.finished && (
        <Sheet title="Half-time" onClose={() => { setHalfTime(false); setPaused(false); }}>
          <div className="sheet-b col ht-panel" style={{ gap: 12 }}>
            <div className="ht-score"><b>{home.short}</b><span>{m.score[0]} - {m.score[1]}</span><b>{away.short}</b></div>
            {keyEvents.length > 0 && <div className="small muted">{keyEvents.map((e) => `${e.type === 'goal' ? '⚽' : '🟥'} ${e.player !== undefined && g.players[e.player] ? shortName(g.players[e.player]) : ''} ${e.minute}'`).join('  ·  ')}</div>}
            <div className="comm-stats">
              <StatBar label="Possession" a={pct(m.stats.poss[0])} b={pct(m.stats.poss[1])} c={colors} pct />
              <StatBar label="Shots" a={m.stats.shots[0]} b={m.stats.shots[1]} c={colors} />
              <StatBar label="On target" a={m.stats.onTarget[0]} b={m.stats.onTarget[1]} c={colors} />
            </div>
            <div className="grid2">
              <button className="btn yellow" onClick={() => setDrawer(true)}>Substitutions ({userTeam.subsLeft} left)</button>
              <button className="btn" onClick={() => setTacticsOpen(true)}>Tactics</button>
            </div>
            <button className="btn primary block" onClick={() => { setHalfTime(false); setPaused(false); }}>Second half ▶</button>
          </div>
        </Sheet>
      )}
      {goalFlash}
      {tacticsSheet}
    </div>
  );
}


/** Last 15 minutes: green bars up when we're on top, red down when they are. */
function MomBars({ bars }: { bars: number[] }) {
  return (
    <>
      {bars.map((v, i) => (
        <span key={i}>
          {Math.abs(v) > 0.02 && <i className={v > 0 ? 'up' : 'down'} style={{ height: `${Math.min(50, Math.abs(v) * 50)}%` }} />}
        </span>
      ))}
    </>
  );
}

type Snap = { min: number; xg: [number, number]; shots: [number, number]; poss: [number, number] };

/**
 * How the game is going for the manager's side, from the last few minutes of play
 * (chances, shots and possession), like FM's match momentum.
 */
function momentum(hist: Snap[], side: 0 | 1) {
  const per: number[] = [];
  for (let i = 1; i < hist.length; i++) {
    const a = hist[i - 1];
    const b = hist[i];
    const v = (t: 0 | 1) => (b.xg[t] - a.xg[t]) * 4 + (b.shots[t] - a.shots[t]) * 0.6 + (b.poss[t] - a.poss[t]) * 0.15;
    per.push(Math.max(-1, Math.min(1, (v(side) - v(side === 0 ? 1 : 0)) / 1.2)));
  }
  const recent = per.slice(-10);
  const avg = recent.length ? recent.reduce((s, x) => s + x, 0) / recent.length : 0;
  const [label, tone] = avg > 0.32 ? ['Attacking control', 'good'] : avg > 0.12 ? ['On top', 'good'] : avg > -0.12 ? ['Even contest', 'even'] : avg > -0.32 ? ['Under pressure', 'bad'] : ['Pinned back', 'bad'];
  const bars = per.slice(-15);
  while (bars.length < 15) bars.unshift(0);
  return { label, tone, bars };
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

/** Scoreboard strip shared by the pre-match, live and full-time screens. */
function CommTop({ home, away, mid, sub, progress }: { home: Club; away: Club; mid: string; sub: string; progress?: number }) {
  const landscape = useLandscape();
  return (
    <div className="comm-top">
      <span className="ct-team"><Crest club={home} size={landscape ? 26 : 30} /><b>{landscape ? home.name : home.short}</b></span>
      <div className="ct-mid">
        <b className="ct-score">{mid}</b>
        <span className="ct-clock">{sub}</span>
      </div>
      <span className="ct-team r"><b>{landscape ? away.name : away.short}</b><Crest club={away} size={landscape ? 26 : 30} /></span>
      {progress !== undefined && <div className="ct-progress"><div style={{ width: `${progress}%` }} /></div>}
    </div>
  );
}

function PreMatch({ g, fixture, onKick, onInstant, onTactics }: { g: GameState; fixture: Fixture; onKick: () => void; onInstant: () => void; onTactics: () => void }) {
  const landscape = useLandscape();
  const home = g.clubs[fixture.home];
  const away = g.clubs[fixture.away];
  const user = g.clubs[g.userClubId];
  const squad = squadOf(g, user.id);
  const slots = FORMATIONS[user.tactics.formation];
  const xi = user.lineup.map((id, i) => (id !== null && g.players[id] ? { p: g.players[id], pos: slots[i]?.pos } : null)).filter(Boolean) as { p: GameState['players'][number]; pos: (typeof slots)[number]['pos'] }[];
  const oppId = fixture.home === user.id ? fixture.away : fixture.home;
  const opp = squadOf(g, oppId).filter((p) => p.pos !== 'GK').sort((a, b) => overall(b) - overall(a)).slice(0, 4);
  const out = squad.filter((p) => p.injury || p.suspended > 0);
  const leg1 = fixture.leg === 2 ? g.fixtures.find((f) => f.id === fixture.firstLeg) : undefined;
  // Man-marking for this match (their likely XI first, then the rest of the squad)
  const [marking, setMarking] = useState(false);
  const oppClub = g.clubs[oppId];
  const oppXi = oppClub.lineup.filter((id): id is number => id !== null && g.players[id]?.clubId === oppId).map((id) => g.players[id]);
  const theirs = [...oppXi, ...squadOf(g, oppId).filter((p) => !oppXi.includes(p))];
  const marks = user.marks?.fixtureId === fixture.id ? user.marks.list : [];
  return (
    <div className="match-screen">
      <div className={`comm ${landscape ? 'land' : ''}`}>
        <CommTop home={home} away={away} mid="VS" sub={`${compName(g, fixture.comp)}${fixture.roundName ? ` · ${fixture.roundName}` : ''}`} />
        <div className="panes">
          <div className="pane">
            <div className="pane-h"><h3>Your XI</h3><span className="chip">{user.tactics.formation} · {MENTALITY[user.tactics.mentality + 2]}</span></div>
            <Fit className="pane-b"><div className="pane-list">
              {xi.map(({ p, pos }) => (
                <div key={p.id} className="row pane-row">
                  <PosTag pos={pos} /><b className="ellipsis" style={{ flex: 1 }}>{shortName(p)}</b><span className="small muted">{Math.round(p.condition)}%</span><Ovr value={Math.round(ratingAt(p, pos))} />
                </div>
              ))}
            </div></Fit>
          </div>
          <div className="pane">
            <div className="pane-h"><h3>Match info</h3></div>
            <div className="pane-b">
              <div className="small muted" style={{ marginBottom: 8 }}>{fixture.neutral ? 'Neutral venue' : home.stadium}</div>
              {leg1?.result && <div className="small bold" style={{ marginBottom: 8 }}>First leg: {g.clubs[leg1.home].short} {leg1.result.hg}-{leg1.result.ag} {g.clubs[leg1.away].short}</div>}
              <div className="section-label" style={{ marginTop: 0 }}>Danger men</div>
              {opp.map((p) => <div key={p.id} className="row pane-row"><PosTag pos={p.pos} /><b className="ellipsis" style={{ flex: 1 }}>{shortName(p)}</b>{g.era !== 'cm0102' && <Ovr value={overall(p)} />}</div>)}
              {out.length > 0 && <div className="small" style={{ marginTop: 8, color: 'var(--bad)', fontWeight: 700 }}>Unavailable: {out.map((p) => `${p.last} ${p.injury ? '🩹' : '🟥'}`).join(', ')}</div>}
            </div>
          </div>
        </div>
        <div className="comm-bottom">
          <button className="btn" onClick={onTactics}>✏️ Tactics</button>
          {g.era && <button className="btn" onClick={() => setMarking(true)}>🎯 Marking{marks.length ? ` (${marks.length})` : ''}</button>}
          <button className="btn" onClick={onInstant}>⏭ Instant result</button>
          <button className="continue-btn match comm-go" onClick={onKick}>⚽ Kick off</button>
        </div>
      </div>
      {marking && (
        <Sheet title={`Man-marking v ${oppClub.short}`} onClose={() => setMarking(false)}>
          <div className="sheet-b col" style={{ gap: 12 }}>
            <ManMarking mine={xi.map((x) => x.p)} theirs={theirs} marks={marks} onChange={(list) => mutate(() => { user.marks = { fixtureId: fixture.id, list }; })} />
            <button className="btn primary block" onClick={() => setMarking(false)}>Done</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function PostMatch({ g, fixture, m, onClose }: { g: GameState; fixture: Fixture; m: LiveMatch; onClose: () => void }) {
  const landscape = useLandscape();
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
  const c: [string, string] = [hk[0], ak[0]];
  const scorerLine = (team: 0 | 1) => r.goals.filter((x) => x.team === team).map((x) => `${g.players[x.scorer] ? g.players[x.scorer].last : '?'} ${x.minute}'${x.pen ? ' (p)' : ''}`).join(', ');
  const possT = r.stats ? Math.max(1, r.stats.poss[0] + r.stats.poss[1]) : 1;
  return (
    <div className="match-screen">
      <div className={`comm ${landscape ? 'land' : ''}`}>
        <CommTop home={home} away={away} mid={`${r.hg} - ${r.ag}`} sub={`FULL TIME${r.agg ? ` · AGG ${r.agg[0]}-${r.agg[1]}` : ''}${r.pens ? ` · ${r.pens[0]}-${r.pens[1]} pens` : ''}`} />
        <div className="panes">
          <div className="pane">
            <div className="pane-b">
              <div className="post-verdict" style={{ color: won ? 'var(--lime)' : lost ? 'var(--coral)' : 'var(--yellow)' }}>{won ? 'VICTORY!' : lost ? 'DEFEAT' : 'DRAW'}</div>
              <div className="small" style={{ color: '#a8c6b4', textAlign: 'center', marginBottom: 10 }}>{home.short}: {scorerLine(0) || '—'}<br />{away.short}: {scorerLine(1) || '—'}</div>
              {r.stats && (
                <div className="comm-stats">
                  <StatBar label="Possession" a={Math.round((r.stats.poss[0] / possT) * 100)} b={Math.round((r.stats.poss[1] / possT) * 100)} c={c} pct />
                  <StatBar label="Shots" a={r.stats.shots[0]} b={r.stats.shots[1]} c={c} />
                  <StatBar label="On target" a={r.stats.onTarget[0]} b={r.stats.onTarget[1]} c={c} />
                  <StatBar label="xG" a={r.stats.xg[0]} b={r.stats.xg[1]} c={c} />
                </div>
              )}
            </div>
          </div>
          <div className="pane">
            <div className="pane-h"><h3>Ratings</h3>{motm && <span className="chip" style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.12)', borderColor: 'rgba(251,191,36,0.3)' }}>★ MOTM {motm.last}</span>}</div>
            <Fit className="pane-b"><div className="pane-list">
              {mine.map(({ lp, p, r: rt }) => (
                <div key={lp.id} className="row pane-row">
                  <PosTag pos={lp.pos} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b className="ellipsis" style={{ display: 'block' }}>{shortName(p)} {lp.goals ? '⚽'.repeat(lp.goals) : ''}{lp.assists ? '🅰️' : ''}{lp.yellow ? '🟨' : ''}{lp.red ? '🟥' : ''}{lp.injured ? '🩹' : ''}</b>
                    <div className="statline">{statSummary(lp.s, lp.pos === 'GK')}</div>
                  </div>
                  <span className="small muted">{lp.on > 0 ? `${lp.on}'↑` : lp.off !== null && lp.off < 90 ? `${lp.off}'↓` : ''}</span>
                  <b style={{ fontFamily: 'var(--display)', fontSize: 17, width: 36, textAlign: 'right', color: rt >= 7.5 ? 'var(--good)' : rt < 6 ? 'var(--bad)' : undefined }}>{rt.toFixed(1)}</b>
                </div>
              ))}
            </div></Fit>
          </div>
        </div>
        <div className="comm-bottom">
          <button className="continue-btn comm-go" onClick={onClose}>Continue ▶</button>
        </div>
      </div>
    </div>
  );
}
