import { useEffect, useRef, useState } from 'react';
import { LEAGUE_DEFS } from '../../game/data/leagues';
import { NATIONS } from '../../game/data/names';
import { createWorld } from '../../game/generate';
import { BACKGROUNDS, BONUS_POINTS, JOURNEY_LEAGUES, drawJourneyClub, initJourney } from '../../game/journey';
import { MANAGER_ATTRS } from '../../game/manager';
import { hashString } from '../../game/rng';
import { startSeason } from '../../game/season';
import type { CrestPattern, CrestShape, ManagerAttr } from '../../game/types';
import { saveGame, setGame } from '../../store';
import { CrestSvg } from '../components/Crest';

const SHAPES: CrestShape[] = ['shield', 'circle', 'diamond', 'badge'];
const HOME_NATIONS = ['ENG', 'SCO', 'WAL', 'NIR', 'IRL'];

interface ClubCard { n: string; short: string; colors: [string, string]; pattern: CrestPattern; league: string; stadium: string; capacity: number; rep: number }

const POOL: ClubCard[] = LEAGUE_DEFS.filter((d) => JOURNEY_LEAGUES.includes(d.id)).flatMap((d) => d.clubs.map((line) => {
  const [n, short, c1, c2, rep, , stadium, cap, pattern] = line.split('|');
  return { n, short, colors: [c1, c2] as [string, string], pattern: (pattern || 'plain') as CrestPattern, league: d.name, stadium, capacity: Number(cap), rep: Number(rep) };
}));

function Crest({ c, size }: { c: ClubCard; size: number }) {
  return <CrestSvg name={c.n} short={c.short} colors={c.colors} crest={{ shape: SHAPES[hashString(c.n) % 4], pattern: c.pattern }} size={size} />;
}

/** The Journey: create your manager, then the randomiser draws your first club. */
export function JourneySetup({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<'manager' | 'draw'>('manager');
  const [name, setName] = useState('');
  const [nat, setNat] = useState('ENG');
  const [mgrAge, setAge] = useState(36);
  const [bg, setBg] = useState<string>('semi');
  const [bonus, setBonus] = useState<Partial<Record<ManagerAttr, number>>>({});
  const base = BACKGROUNDS.find((b) => b.id === bg)!.skill;
  const left = BONUS_POINTS - Object.values(bonus).reduce((s, v) => s + (v ?? 0), 0);
  const bump = (k: ManagerAttr, d: number) => setBonus((b) => {
    const v = (b[k] ?? 0) + d;
    if (v < 0 || v > 3 || (d > 0 && left <= 0)) return b;
    return { ...b, [k]: v };
  });

  if (step === 'draw') return <Draw manager={name.trim() || 'The Gaffer'} bg={bg} bonus={bonus} nat={nat} mgrAge={mgrAge} onBack={() => setStep('manager')} />;

  return (
    <div className="journey-setup">
      <div className="row" style={{ marginBottom: 12 }}>
        <button className="btn sm" onClick={onBack}>←</button>
        <h1 style={{ fontSize: 26 }}>The Journey</h1>
        <span className="chip right">Step 1 of 2 · Your manager</span>
      </div>
      <div className="js-grid">
        <section className="card">
          <div className="card-h"><h3>Manager</h3></div>
          <div className="col" style={{ gap: 8 }}>
            <input className="input" value={name} placeholder="Your name" onChange={(e) => setName(e.target.value)} />
            <div className="row" style={{ gap: 8 }}>
              <select className="input" value={nat} onChange={(e) => setNat(e.target.value)}>
                {[...HOME_NATIONS, ...Object.keys(NATIONS).filter((c) => !HOME_NATIONS.includes(c)).sort((a, b) => NATIONS[a].localeCompare(NATIONS[b]))].map((c) => <option key={c} value={c}>{NATIONS[c]}</option>)}
              </select>
              <select className="input" value={mgrAge} onChange={(e) => setAge(Number(e.target.value))} style={{ maxWidth: 110 }}>
                {Array.from({ length: 36 }, (_, i) => 28 + i).map((a) => <option key={a} value={a}>{a} years</option>)}
              </select>
            </div>
            <div className="section-label" style={{ margin: '6px 0 0' }}>Playing background</div>
            <div className="js-bgs">
              {BACKGROUNDS.map((b) => (
                <button key={b.id} className={`js-bg ${bg === b.id ? 'on' : ''}`} onClick={() => setBg(b.id)}>
                  <b>{b.name}</b><span>{b.desc}</span><em>Skills {b.skill} · reputation {b.rep}</em>
                </button>
              ))}
            </div>
          </div>
        </section>
        <section className="card">
          <div className="card-h"><h3>Coaching style</h3><span className="chip right" style={{ marginLeft: 'auto' }}>{left} points left</span></div>
          <div className="js-attrs">
            {MANAGER_ATTRS.map((a) => {
              const v = base + (bonus[a.key] ?? 0);
              return (
                <div key={a.key} className="js-attr">
                  <span>{a.label}</span>
                  <button className="btn sm" onClick={() => bump(a.key, -1)} disabled={!bonus[a.key]}>−</button>
                  <b className={(bonus[a.key] ?? 0) > 0 ? 'up' : ''}>{v}</b>
                  <button className="btn sm" onClick={() => bump(a.key, 1)} disabled={left <= 0 || (bonus[a.key] ?? 0) >= 3}>+</button>
                </div>
              );
            })}
          </div>
          <div className="small muted" style={{ marginTop: 8 }}>Spend {BONUS_POINTS} points (up to 3 per attribute). They grow with how you manage, as in every mode.</div>
        </section>
      </div>
      <button className="continue-btn" style={{ marginTop: 12, width: '100%' }} onClick={() => setStep('draw')}>Next: draw your club 🎲</button>
    </div>
  );
}

function Draw({ manager, bg, bonus, nat, mgrAge, onBack }: { manager: string; bg: string; bonus: Partial<Record<ManagerAttr, number>>; nat: string; mgrAge: number; onBack: () => void }) {
  const [phase, setPhase] = useState<'ready' | 'spinning' | 'done'>('ready');
  const [shown, setShown] = useState(0);
  const [picked, setPicked] = useState<ClubCard | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const spin = () => {
    const name = drawJourneyClub();
    const target = Math.max(0, POOL.findIndex((c) => c.n === name));
    setPhase('spinning');
    const steps = 34 + Math.floor(Math.random() * 8);
    let i = 0;
    const tick = () => {
      i++;
      const idx = i >= steps ? target : Math.floor(Math.random() * POOL.length);
      setShown(idx);
      if (i >= steps) { setPicked(POOL[target]); setPhase('done'); return; }
      timer.current = window.setTimeout(tick, 40 + Math.pow(i / steps, 3) * 420);
    };
    tick();
  };
  const start = async () => {
    if (!picked) return;
    setBusy(true);
    await new Promise((r) => setTimeout(r, 30));
    const g = createWorld({ mode: 'classic', manager, clubName: picked.n, slot: `s${Date.now().toString(36)}` });
    startSeason(g);
    initJourney(g, bg, bonus, nat, mgrAge);
    setGame(g);
    await saveGame(g);
  };
  const c = POOL[shown] ?? POOL[0];
  return (
    <div className="journey-setup">
      <div className="row" style={{ marginBottom: 12 }}>
        <button className="btn sm" onClick={onBack} disabled={phase === 'spinning' || busy}>←</button>
        <h1 style={{ fontSize: 26 }}>The Journey</h1>
        <span className="chip right">Step 2 of 2 · Your first club</span>
      </div>
      <div className={`js-slot ${phase}`} style={{ '--c1': c.colors[0], '--c2': c.colors[1] } as React.CSSProperties}>
        {phase === 'ready' ? (
          <div className="js-slot-q">?</div>
        ) : (
          <>
            <Crest c={c} size={phase === 'done' ? 96 : 80} />
            <div className="js-slot-name">{c.n}</div>
            <div className="js-slot-league">{c.league}</div>
          </>
        )}
      </div>
      {phase === 'done' && picked && (
        <div className="js-reveal">
          <div><span>Ground</span><b>{picked.stadium} ({picked.capacity.toLocaleString()})</b></div>
          <div><span>League</span><b>{picked.league}</b></div>
          <div><span>Reputation</span><b>{'★'.repeat(Math.max(1, Math.round(picked.rep / 20)))} {picked.rep}</b></div>
          <div><span>Manager</span><b>{manager}</b></div>
        </div>
      )}
      {phase === 'ready' && <div className="small muted" style={{ textAlign: 'center', margin: '10px 0' }}>{POOL.length} clubs in the draw: every National League and Scottish League Two side. No re-spins.</div>}
      {phase === 'ready' && <button className="continue-btn" style={{ width: '100%' }} onClick={spin}>🎲 Spin</button>}
      {phase === 'done' && <button className="continue-btn" style={{ width: '100%', marginTop: 10 }} disabled={busy} onClick={start}>{busy ? 'Building the world…' : `Start the Journey at ${picked?.n} ▶`}</button>}
    </div>
  );
}
