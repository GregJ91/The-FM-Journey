import { useEffect, useState } from 'react';
import { LEAGUE_DEFS } from '../../game/data/leagues';
import { fmtDate } from '../../game/dates';
import { createWorld } from '../../game/generate';
import { startSeason } from '../../game/season';
import type { CrestPattern, CrestShape } from '../../game/types';
import { deleteSave, listSaves, loadGame, saveGame, setGame, type SaveMeta } from '../../store';
import { CrestSvg } from '../components/Crest';

type Step = 'menu' | 'classic' | 'create' | 'load';

const PALETTE = ['#e5484d', '#ff8a3d', '#ffd23f', '#c6f432', '#19b866', '#0f7a4a', '#3ec1f3', '#1d4ed8', '#0b1f5b', '#7b5cff', '#ff7ac6', '#7a1e3a', '#15120f', '#ffffff', '#9a9187', '#f5b700'];
const SHAPES: CrestShape[] = ['shield', 'circle', 'diamond', 'badge'];
const PATTERNS: CrestPattern[] = ['plain', 'stripes', 'halves', 'sash', 'hoops', 'chevron'];

export function Title() {
  const [step, setStep] = useState<Step>('menu');
  const [saves, setSaves] = useState<SaveMeta[]>([]);
  useEffect(() => { listSaves().then(setSaves); }, [step]);

  return (
    <div className="title-screen">
      <div className="title-wrap">
        {step === 'menu' && (
          <>
            <div className="title-logo" style={{ marginBottom: 14 }}>The <span>FM</span><br />Journey<em>.</em></div>
            <p style={{ fontSize: 18, fontWeight: 600, maxWidth: 620, marginBottom: 30 }}>
              Football management, fast. Real leagues, real players, one-minute matches — and a career that's yours to build.
            </p>
            <div className="grid g3">
              <button className="mode-card" style={{ background: 'var(--lime)' }} onClick={() => setStep('create')}>
                <span className="chip">🌱 Start from the bottom</span>
                <h2>Create a Club</h2>
                <p>Design your own club — name, colours, crest — and start in the National League. Climb five divisions to the very top.</p>
              </button>
              <button className="mode-card" style={{ background: 'var(--sky)' }} onClick={() => setStep('classic')}>
                <span className="chip">⚽ Classic</span>
                <h2>Choose a Club</h2>
                <p>Take charge of any club in England, Spain, Italy, Germany or France. Win the league, the cup, and Europe.</p>
              </button>
              <button className="mode-card" style={{ background: 'var(--yellow)' }} onClick={() => setStep('load')} disabled={!saves.length}>
                <span className="chip">💾 {saves.length} save{saves.length === 1 ? '' : 's'}</span>
                <h2>Load Game</h2>
                <p>{saves.length ? `Continue as ${saves[0].manager} at ${saves[0].club}.` : 'No saved games yet.'}</p>
              </button>
            </div>
          </>
        )}
        {step === 'classic' && <ClassicSetup onBack={() => setStep('menu')} />}
        {step === 'create' && <CreateSetup onBack={() => setStep('menu')} />}
        {step === 'load' && <LoadList saves={saves} onBack={() => setStep('menu')} onChange={() => listSaves().then(setSaves)} />}
      </div>
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

function ClassicSetup({ onBack }: { onBack: () => void }) {
  const [league, setLeague] = useState(LEAGUE_DEFS[0].id);
  const [club, setClub] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const def = LEAGUE_DEFS.find((l) => l.id === league)!;
  const clubs = def.clubs.map((line) => {
    const [n, short, c1, c2, rep, , stadium, , pattern] = line.split('|');
    return { n, short, colors: [c1, c2] as [string, string], rep: Number(rep), stadium, pattern: (pattern || 'plain') as CrestPattern };
  }).sort((a, b) => b.rep - a.rep);
  const start = async () => {
    if (!club) return;
    setBusy(true);
    await new Promise((r) => setTimeout(r, 30));
    const g = createWorld({ mode: 'classic', manager: name.trim() || 'The Gaffer', clubName: club, slot: slotId() });
    await begin(g);
  };
  return (
    <div className="card" style={{ padding: 24 }}>
      <div className="row" style={{ marginBottom: 14 }}>
        <button className="btn sm" onClick={onBack}>← Back</button>
        <h1 style={{ fontSize: 32 }}>Choose your club</h1>
      </div>
      <div className="tabs">
        {LEAGUE_DEFS.map((l) => (
          <button key={l.id} className={`tab ${league === l.id ? 'active' : ''}`} onClick={() => { setLeague(l.id); setClub(null); }}>
            <span className="comp-dot" style={{ background: l.color, marginRight: 6 }} />{l.name}
          </button>
        ))}
      </div>
      <div className="grid g4" style={{ gap: 10, maxHeight: '48vh', overflowY: 'auto', padding: 4 }}>
        {clubs.map((c) => (
          <button key={c.n} className={`club-pick ${club === c.n ? 'sel' : ''}`} onClick={() => setClub(c.n)}>
            <CrestSvg name={c.n} short={c.short} colors={c.colors} crest={{ shape: SHAPES[hashName(c.n) % 4], pattern: c.pattern }} size={36} />
            <div style={{ minWidth: 0 }}>
              <div className="bold" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.n}</div>
              <div className="small muted">{'★'.repeat(Math.max(1, Math.round(c.rep / 20)))} · rep {c.rep}</div>
            </div>
          </button>
        ))}
      </div>
      <div className="row wrap" style={{ marginTop: 18, gap: 14, alignItems: 'flex-end' }}>
        <div className="field" style={{ flex: '1 1 240px' }}>
          <label>Manager name</label>
          <input className="input" value={name} placeholder="The Gaffer" onChange={(e) => setName(e.target.value)} />
        </div>
        <button className="continue-btn" disabled={!club || busy} onClick={start}>{busy ? 'Building the world…' : club ? `Manage ${club} ▶` : 'Pick a club'}</button>
      </div>
    </div>
  );
}

// matches generate.ts crest shape choice (hashString % 4)
function hashName(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
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
    const g = createWorld({
      mode: 'create', manager: manager.trim() || 'The Gaffer', slot: slotId(),
      custom: { name: nm, short: sh, colors: [c1, c2], crest: { shape, pattern }, stadium: stadium.trim() || `${nm.split(' ')[0]} Park`, country: 'ENG' },
    });
    await begin(g);
  };
  return (
    <div className="card" style={{ padding: 24 }}>
      <div className="row" style={{ marginBottom: 14 }}>
        <button className="btn sm" onClick={onBack}>← Back</button>
        <h1 style={{ fontSize: 32 }}>Create your club</h1>
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', alignItems: 'start' }}>
        <div className="col" style={{ gap: 14 }}>
          <div className="row wrap" style={{ gap: 12 }}>
            <div className="field" style={{ flex: '2 1 220px' }}><label>Club name</label><input className="input" value={clubName} placeholder="Journey FC" onChange={(e) => setClubName(e.target.value)} /></div>
            <div className="field" style={{ flex: '0 1 100px' }}><label>Short (3)</label><input className="input" maxLength={3} value={short} placeholder={sh} onChange={(e) => setShort(e.target.value)} /></div>
          </div>
          <div className="field"><label>Stadium</label><input className="input" value={stadium} placeholder={`${nm.split(' ')[0]} Park`} onChange={(e) => setStadium(e.target.value)} /></div>
          <div className="field"><label>Primary colour</label><div className="row wrap" style={{ gap: 6 }}>{PALETTE.map((c) => <div key={c} className={`swatch ${c1 === c ? 'on' : ''}`} style={{ background: c }} onClick={() => setC1(c)} />)}</div></div>
          <div className="field"><label>Secondary colour</label><div className="row wrap" style={{ gap: 6 }}>{PALETTE.map((c) => <div key={c} className={`swatch ${c2 === c ? 'on' : ''}`} style={{ background: c }} onClick={() => setC2(c)} />)}</div></div>
          <div className="field"><label>Crest shape</label><div className="seg">{SHAPES.map((s) => <button key={s} className={shape === s ? 'on' : ''} onClick={() => setShape(s)}>{s}</button>)}</div></div>
          <div className="field"><label>Pattern</label><div className="seg" style={{ flexWrap: 'wrap' }}>{PATTERNS.map((p) => <button key={p} className={pattern === p ? 'on' : ''} onClick={() => setPattern(p)}>{p}</button>)}</div></div>
          <div className="field"><label>Manager name</label><input className="input" value={manager} placeholder="The Gaffer" onChange={(e) => setManager(e.target.value)} /></div>
        </div>
        <div className="col" style={{ alignItems: 'center', gap: 16 }}>
          <div className="card" style={{ background: c1, width: '100%', display: 'grid', placeItems: 'center', padding: 28 }}>
            <CrestSvg name={nm} short={sh} colors={[c1, c2]} crest={{ shape, pattern }} size={170} />
          </div>
          <h2 style={{ fontSize: 28, textAlign: 'center' }}>{nm}</h2>
          <div className="help">
            🏁 You start in the <b>National League</b> (5th tier) with a squad of journeymen, a £150k transfer budget and a tiny stadium.
            Sign free agents, develop youngsters, win promotion — and keep climbing.
          </div>
          <button className="continue-btn" disabled={busy} onClick={start}>{busy ? 'Building the world…' : 'Found the club ▶'}</button>
        </div>
      </div>
    </div>
  );
}

function LoadList({ saves, onBack, onChange }: { saves: SaveMeta[]; onBack: () => void; onChange: () => void }) {
  const [err, setErr] = useState('');
  return (
    <div className="card" style={{ padding: 24 }}>
      <div className="row" style={{ marginBottom: 14 }}>
        <button className="btn sm" onClick={onBack}>← Back</button>
        <h1 style={{ fontSize: 32 }}>Load game</h1>
      </div>
      {err && <div className="banner closed">{err}</div>}
      <div className="col">
        {saves.map((s) => (
          <div key={s.slot} className="club-pick" style={{ cursor: 'default' }}>
            <div style={{ width: 16, height: 40, borderRadius: 6, background: `linear-gradient(${s.colors[0]} 50%, ${s.colors[1]} 50%)`, border: '2px solid var(--ink)' }} />
            <div>
              <div className="bold">{s.club} <span className="chip">{s.mode === 'create' ? 'Create-a-club' : 'Classic'}</span></div>
              <div className="small muted">{s.manager} · {fmtDate(s.date)} · saved {new Date(s.savedAt).toLocaleString()}</div>
            </div>
            <div className="right row">
              <button className="btn sm primary" onClick={() => loadGame(s.slot).catch((e) => setErr(String(e.message ?? e)))}>Load</button>
              <button className="btn sm coral" onClick={async () => { if (confirm(`Delete save for ${s.club}?`)) { await deleteSave(s.slot); onChange(); } }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
