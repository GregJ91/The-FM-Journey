import { useEffect, useState } from 'react';
import { LEAGUE_DEFS } from '../../game/data/leagues';
import { fmtDate } from '../../game/dates';
import { createWorld } from '../../game/generate';
import { hashString } from '../../game/rng';
import { startSeason } from '../../game/season';
import type { CrestPattern, CrestShape } from '../../game/types';
import { deleteSave, listSaves, loadGame, saveGame, setGame, type SaveMeta } from '../../store';
import { CrestSvg } from '../components/Crest';
import { ConfirmButton } from '../components/common';
import { BadgesSheet } from '../components/BadgesSheet';

type Step = 'menu' | 'classic' | 'create' | 'load';

/** Create a Club is switched off for now (existing create-a-club saves still load). */
const CREATE_CLUB_ENABLED = false;

const PALETTE = ['#e5484d', '#ff8a3d', '#ffd23f', '#c6f432', '#19b866', '#0f7a4a', '#3ec1f3', '#1d4ed8', '#0b1f5b', '#7b5cff', '#ff7ac6', '#7a1e3a', '#15120f', '#ffffff', '#9a9187', '#f5b700'];
const SHAPES: CrestShape[] = ['shield', 'circle', 'diamond', 'badge'];
const PATTERNS: CrestPattern[] = ['plain', 'stripes', 'halves', 'sash', 'hoops', 'chevron'];

export function Title() {
  const [step, setStep] = useState<Step>('menu');
  const [saves, setSaves] = useState<SaveMeta[]>([]);
  const [badgesOpen, setBadgesOpen] = useState(false);
  useEffect(() => { listSaves().then(setSaves); }, [step]);

  return (
    <div className="title-screen">
      {step === 'menu' && (
        <div className="title-menu" style={{ paddingBottom: 28 }}>
          <div className="title-intro">
          <div className="title-logo" style={{ margin: '10px 0 16px' }}>The <span>FM</span><br />Journey<em>.</em></div>
          <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 22 }}>Football management, fast. Real leagues, real players, one-minute matches.</p>
          </div>
          <div className="title-actions">
          {saves.length > 0 && (
            <button className="mode-card" style={{ '--glow': 'rgba(251,191,36,0.3)' } as React.CSSProperties} onClick={() => loadGame(saves[0].slot)}>
              <span className="chip">▶ Continue</span>
              <h2>{saves[0].club}</h2>
              <p>{saves[0].manager} · {fmtDate(saves[0].date)}</p>
            </button>
          )}
          {CREATE_CLUB_ENABLED && (
            <button className="mode-card" style={{ '--glow': 'rgba(198,244,50,0.3)' } as React.CSSProperties} onClick={() => setStep('create')}>
              <span className="chip">🌱 Start from the bottom</span>
              <h2>Create a Club</h2>
              <p>Design your own club and start in the National League. Climb five divisions to the top.</p>
            </button>
          )}
          <button className="mode-card" style={{ '--glow': 'rgba(56,189,248,0.32)' } as React.CSSProperties} onClick={() => setStep('classic')}>
            <span className="chip">⚽ Classic</span>
            <h2>Choose a Club</h2>
            <p>Manage any club in England, Spain, Italy, Germany or France.</p>
          </button>
          {saves.length > 0 && <button className="btn block" onClick={() => setStep('load')}>💾 All saves ({saves.length})</button>}
          <button className="btn block" style={{ marginTop: 10 }} onClick={() => setBadgesOpen(true)}>🛡️ Club badges</button>
          {badgesOpen && <BadgesSheet onClose={() => setBadgesOpen(false)} />}
          </div>
        </div>
      )}
      {step === 'classic' && <ClassicSetup onBack={() => setStep('menu')} />}
      {CREATE_CLUB_ENABLED && step === 'create' && <CreateSetup onBack={() => setStep('menu')} />}
      {step === 'load' && <LoadList saves={saves} onBack={() => setStep('menu')} onChange={() => listSaves().then(setSaves)} />}
    </div>
  );
}

function slotId() {
  return `s${Date.now().toString(36)}`;
}

async function begin(g: ReturnType<typeof createWorld>) {
  startSeason(g);
  setGame(g);
  await saveGame(g);
}

function Back({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <div className="row" style={{ marginBottom: 14 }}>
      <button className="btn sm" onClick={onBack}>←</button>
      <h1 style={{ fontSize: 28 }}>{title}</h1>
    </div>
  );
}

function ClassicSetup({ onBack }: { onBack: () => void }) {
  const [league, setLeague] = useState(LEAGUE_DEFS[0].id);
  const [club, setClub] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const def = LEAGUE_DEFS.find((l) => l.id === league)!;
  const clubs = def.clubs.map((line) => {
    const [n, short, c1, c2, rep, , , , pattern] = line.split('|');
    return { n, short, colors: [c1, c2] as [string, string], rep: Number(rep), pattern: (pattern || 'plain') as CrestPattern };
  }).sort((a, b) => b.rep - a.rep);
  const start = async () => {
    if (!club) return;
    setBusy(true);
    await new Promise((r) => setTimeout(r, 30));
    await begin(createWorld({ mode: 'classic', manager: name.trim() || 'The Gaffer', clubName: club, slot: slotId() }));
  };
  return (
    <div>
      <Back onBack={onBack} title="Choose a club" />
      <select className="input" value={league} onChange={(e) => { setLeague(e.target.value); setClub(null); }} style={{ marginBottom: 12 }}>
        {LEAGUE_DEFS.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>
      <div className="col" style={{ gap: 8 }}>
        {clubs.map((c) => (
          <button key={c.n} className={`club-pick ${club === c.n ? 'sel' : ''}`} onClick={() => setClub(c.n)}>
            <CrestSvg name={c.n} short={c.short} colors={c.colors} crest={{ shape: SHAPES[hashString(c.n) % 4], pattern: c.pattern }} size={36} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="bold ellipsis">{c.n}</div>
              <div className="small muted">{'★'.repeat(Math.max(1, Math.round(c.rep / 20)))} · reputation {c.rep}</div>
            </div>
            {club === c.n && <span>✓</span>}
          </button>
        ))}
      </div>
      <div className="sticky-cta col" style={{ gap: 8 }}>
        <input className="input" value={name} placeholder="Manager name (optional)" onChange={(e) => setName(e.target.value)} />
        <button className="continue-btn" disabled={!club || busy} onClick={start}>{busy ? 'Building the world…' : club ? `Manage ${club} ▶` : 'Pick a club'}</button>
      </div>
    </div>
  );
}

function CreateSetup({ onBack }: { onBack: () => void }) {
  const [clubName, setClubName] = useState('');
  const [short, setShort] = useState('');
  const [c1, setC1] = useState('#7b5cff');
  const [c2, setC2] = useState('#c6f432');
  const [shape, setShape] = useState<CrestShape>('shield');
  const [pattern, setPattern] = useState<CrestPattern>('stripes');
  const [stadium, setStadium] = useState('');
  const [manager, setManager] = useState('');
  const [busy, setBusy] = useState(false);
  const nm = clubName.trim() || 'Journey FC';
  const sh = (short.trim() || nm.replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 3) || 'JFC').toUpperCase();
  const start = async () => {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 30));
    await begin(createWorld({
      mode: 'create', manager: manager.trim() || 'The Gaffer', slot: slotId(),
      custom: { name: nm, short: sh, colors: [c1, c2], crest: { shape, pattern }, stadium: stadium.trim() || `${nm.split(' ')[0]} Park`, country: 'ENG' },
    }));
  };
  return (
    <div>
      <Back onBack={onBack} title="Create your club" />
      <div className="card" style={{ background: c1, display: 'grid', placeItems: 'center', padding: 20 }}>
        <CrestSvg name={nm} short={sh} colors={[c1, c2]} crest={{ shape, pattern }} size={130} />
      </div>
      <div className="col" style={{ gap: 14 }}>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div className="field" style={{ flex: 1 }}><label>Club name</label><input className="input" value={clubName} placeholder="Journey FC" onChange={(e) => setClubName(e.target.value)} /></div>
          <div className="field" style={{ width: 80 }}><label>Short</label><input className="input" maxLength={3} value={short} placeholder={sh} onChange={(e) => setShort(e.target.value)} /></div>
        </div>
        <div className="field"><label>Primary colour</label><div className="swatches">{PALETTE.map((c) => <div key={c} className={`swatch ${c1 === c ? 'on' : ''}`} style={{ background: c }} onClick={() => setC1(c)} />)}</div></div>
        <div className="field"><label>Secondary colour</label><div className="swatches">{PALETTE.map((c) => <div key={c} className={`swatch ${c2 === c ? 'on' : ''}`} style={{ background: c }} onClick={() => setC2(c)} />)}</div></div>
        <div className="field"><label>Crest shape</label><div className="seg">{SHAPES.map((s) => <button key={s} className={shape === s ? 'on' : ''} onClick={() => setShape(s)}>{s}</button>)}</div></div>
        <div className="field"><label>Pattern</label><div className="seg" style={{ flexWrap: 'wrap' }}>{PATTERNS.map((p) => <button key={p} className={pattern === p ? 'on' : ''} onClick={() => setPattern(p)}>{p}</button>)}</div></div>
        <div className="field"><label>Stadium</label><input className="input" value={stadium} placeholder={`${nm.split(' ')[0]} Park`} onChange={(e) => setStadium(e.target.value)} /></div>
        <div className="field"><label>Manager name</label><input className="input" value={manager} placeholder="The Gaffer" onChange={(e) => setManager(e.target.value)} /></div>
        <div className="help">🏁 You start in the <b>National League</b> (5th tier) with journeymen, a £150k budget and a tiny ground. Sign free agents, develop youngsters, win promotion.</div>
      </div>
      <div className="sticky-cta">
        <button className="continue-btn" style={{ width: '100%' }} disabled={busy} onClick={start}>{busy ? 'Building the world…' : `Found ${nm} ▶`}</button>
      </div>
    </div>
  );
}

function LoadList({ saves, onBack, onChange }: { saves: SaveMeta[]; onBack: () => void; onChange: () => void }) {
  const [err, setErr] = useState('');
  return (
    <div style={{ paddingBottom: 28 }}>
      <Back onBack={onBack} title="Saved games" />
      {err && <div className="banner closed">{err}</div>}
      <div className="col">
        {saves.map((s) => (
          <div key={s.slot} className="card" style={{ marginBottom: 0 }}>
            <div className="row">
              <div style={{ width: 14, height: 40, borderRadius: 5, background: `linear-gradient(${s.colors[0]} 50%, ${s.colors[1]} 50%)`, flex: 'none' }} />
              <div style={{ minWidth: 0 }}>
                <div className="bold ellipsis">{s.club}</div>
                <div className="small muted">{s.mode === 'create' ? 'Create-a-club' : 'Classic'} · {s.manager} · {fmtDate(s.date, false)}</div>
              </div>
            </div>
            <div className="grid2" style={{ marginTop: 10 }}>
              <button className="btn primary" onClick={() => loadGame(s.slot).catch((e) => setErr(String(e.message ?? e)))}>Load</button>
              <ConfirmButton className="btn coral" label="Delete" confirmLabel="Sure?" onConfirm={async () => { await deleteSave(s.slot); onChange(); }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
