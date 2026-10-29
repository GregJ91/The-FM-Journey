import { useEffect, useState } from 'react';
import { LEAGUE_DEFS } from '../../game/data/leagues';
import { fmtDate } from '../../game/dates';
import { CM_LEAGUE_NAMES, cmClubLine, createWorld } from '../../game/generate';
import { CM_BUILTIN, missingFiles, parseCm0102, type CmWorld } from '../../game/cm0102/parse';
import { unzip } from '../../game/cm0102/unzip';
import { hashString } from '../../game/rng';
import { startSeason } from '../../game/season';
import type { CrestPattern, CrestShape } from '../../game/types';
import { deleteSave, listSaves, loadCmWorld, loadGame, saveCmWorld, saveGame, setGame, type SaveMeta } from '../../store';
import { CrestSvg } from '../components/Crest';
import { NATIONS } from '../../game/data/names';

const HOME_NATIONS = ['ENG', 'SCO', 'WAL', 'NIR', 'IRL'];
import { ConfirmButton } from '../components/common';
import { BadgesSheet } from '../components/BadgesSheet';
import { JourneySetup } from './JourneySetup';
import { Fit } from '../components/Fit';

type Step = 'menu' | 'classic' | 'create' | 'load' | 'journey' | 'cm';

/** Create a Club is switched off for now (existing create-a-club saves still load). */
const CREATE_CLUB_ENABLED = false;
/** Only CM 01/02 careers can be started for now; the modern modes show as locked. */
const MODERN_LOCKED = true;

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
        <div className="title-menu">
          <div className="title-intro">
            <div className="title-logo">The <span>FM</span><br />Journey<em>.</em></div>
            <p>Football management, fast. Real leagues, real players, one-minute matches.</p>
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
                <p>Design your own club and climb five divisions.</p>
              </button>
            )}
            <button className={`mode-card journey-card ${MODERN_LOCKED ? 'locked' : ''}`} disabled={MODERN_LOCKED} style={{ '--glow': 'rgba(250,204,21,0.32)' } as React.CSSProperties} onClick={() => setStep('journey')}>
              <span className="chip">{MODERN_LOCKED ? '🔒 Locked' : '🧭 Career'}</span>
              <h2>The Journey</h2>
              <p>Random bottom-league club. Your DoF finds the players.</p>
            </button>
            <button className={`mode-card ${MODERN_LOCKED ? 'locked' : ''}`} disabled={MODERN_LOCKED} style={{ '--glow': 'rgba(56,189,248,0.32)' } as React.CSSProperties} onClick={() => setStep('classic')}>
              <span className="chip">{MODERN_LOCKED ? '🔒 Locked' : '⚽ Classic'}</span>
              <h2>Choose a Club</h2>
              <p>Any club in England, Scotland, Spain, Italy, Germany or France.</p>
            </button>
            <button className="mode-card cm-card" style={{ '--glow': 'rgba(52,255,106,0.22)' } as React.CSSProperties} onClick={() => setStep('cm')}>
              <span className="chip">💾 Retro</span>
              <h2>CM 01/02</h2>
              <p>Championship Manager 01/02's database: every club and player.</p>
            </button>
            <div className="title-small">
              {saves.length > 0 && <button className="btn" onClick={() => setStep('load')}>💾 Saves ({saves.length})</button>}
              <button className="btn" onClick={() => setBadgesOpen(true)}>🛡️ Club badges</button>
            </div>
            {badgesOpen && <BadgesSheet onClose={() => setBadgesOpen(false)} />}
          </div>
        </div>
      )}
      {step === 'classic' && <ClassicSetup onBack={() => setStep('menu')} />}
      {step === 'journey' && <JourneySetup onBack={() => setStep('menu')} />}
      {step === 'cm' && <CmSetup onBack={() => setStep('menu')} />}
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

function ClassicSetup({ onBack, cm }: { onBack: () => void; cm?: CmWorld }) {
  const defs = cm
    ? cm.leagues.map((l) => ({ id: l.id, name: CM_LEAGUE_NAMES[l.id]?.[0] ?? l.id, clubs: l.clubs.map((i) => cmClubLine(cm.clubs[i])) }))
    : LEAGUE_DEFS;
  const [league, setLeague] = useState(defs[0].id);
  const [club, setClub] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [nat, setNat] = useState('ENG');
  const [profileDone, setProfileDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const def = defs.find((l) => l.id === league)!;
  const clubs = def.clubs.map((line) => {
    const [n, short, c1, c2, rep, , , , pattern] = line.split('|');
    return { n, short, colors: [c1, c2] as [string, string], rep: Number(rep), pattern: (pattern || 'plain') as CrestPattern };
  }).sort((a, b) => b.rep - a.rep);
  const start = async () => {
    if (!club) return;
    setBusy(true);
    await new Promise((r) => setTimeout(r, 30));
    await begin(createWorld({ mode: 'classic', manager: name.trim() || 'The Gaffer', managerNat: nat, clubName: club, slot: slotId(), cm }));
  };
  // Step 1: the manager profile (just name and nationality)
  if (!profileDone) {
    return (
      <div className="setup-page">
        <Back onBack={onBack} title="Manager profile" />
        <div className="setup-fill js-page">
          <section className="card js-panel">
            <div className="card-h"><h3>Who are you?</h3></div>
            <div className="col" style={{ gap: 10 }}>
              <label className="js-field"><span>Name</span><input className="input" value={name} placeholder="Your name" onChange={(e) => setName(e.target.value)} /></label>
              <label className="js-field"><span>Nationality</span>
                <select className="input" value={nat} onChange={(e) => setNat(e.target.value)}>
                  {[...HOME_NATIONS, ...Object.keys(NATIONS).filter((c) => !HOME_NATIONS.includes(c)).sort((a, b) => NATIONS[a].localeCompare(NATIONS[b]))].map((c) => <option key={c} value={c}>{NATIONS[c]}</option>)}
                </select>
              </label>
            </div>
          </section>
        </div>
        <div className="setup-cta">
          <button className="continue-btn" disabled={!name.trim()} onClick={() => setProfileDone(true)}>{name.trim() ? 'Next: choose your club ▶' : 'Enter your name'}</button>
        </div>
      </div>
    );
  }
  return (
    <div className="setup-page">
      <Back onBack={() => setProfileDone(false)} title={cm ? `CM 01/02 · ${cm.season}/${String(cm.season + 1).slice(2)}` : 'Choose a club'} />
      <div className="row" style={{ marginBottom: 12, gap: 8 }}>
        <select className="input" style={{ flex: 1 }} value={league} onChange={(e) => { setLeague(e.target.value); setClub(null); }}>
          {defs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>
      <Fit className="setup-fill"><div className="list club-list">
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
      </div></Fit>
      <div className="setup-cta">
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
    <div className="setup-page">
      <Back onBack={onBack} title="Saved games" />
      {err && <div className="banner closed">{err}</div>}
      <Fit className="setup-fill"><div className="list save-list">
        {saves.map((s) => (
          <div key={s.slot} className="card" style={{ marginBottom: 0 }}>
            <div className="row">
              <div style={{ width: 14, height: 40, borderRadius: 5, background: `linear-gradient(${s.colors[0]} 50%, ${s.colors[1]} 50%)`, flex: 'none' }} />
              <div style={{ minWidth: 0 }}>
                <div className="bold ellipsis">{s.club}</div>
                <div className="small muted">{s.era === 'cm0102' ? 'CM 01/02' : s.mode === 'create' ? 'Create-a-club' : s.mode === 'journey' ? 'The Journey' : 'Classic'} · {s.manager} · {fmtDate(s.date, false)}</div>
              </div>
            </div>
            <div className="grid2" style={{ marginTop: 10 }}>
              <button className="btn primary" onClick={() => loadGame(s.slot).catch((e) => setErr(String(e.message ?? e)))}>Load</button>
              <ConfirmButton className="btn coral" label="Delete" confirmLabel="Sure?" onConfirm={async () => { await deleteSave(s.slot); onChange(); }} />
            </div>
          </div>
        ))}
      </div></Fit>
    </div>
  );
}

/** CM 01/02: the built-in database (kept on the device after the first download), then pick a club from it. */
function CmSetup({ onBack }: { onBack: () => void }) {
  const [world, setWorld] = useState<CmWorld | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => {
    (async () => {
      const stored = await loadCmWorld();
      if (stored) return setWorld(stored);
      try {
        const res = await fetch(`./${CM_BUILTIN}`);
        if (!res.ok) throw new Error(String(res.status));
        const w = (await res.json()) as CmWorld;
        await saveCmWorld(w);
        setWorld(w);
      } catch {
        // Offline on first use: fall back to importing the files
        setWorld(null);
      }
    })();
  }, []);
  if (world === undefined) {
    return (
      <div className="setup-page">
        <Back onBack={onBack} title="CM 01/02" />
        <div className="empty">Loading the CM 01/02 database…</div>
      </div>
    );
  }
  if (world) return <ClassicSetup cm={world} onBack={onBack} />;
  const onFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    setBusy(true);
    setErr('');
    try {
      const files: Record<string, Uint8Array> = {};
      for (const f of Array.from(list)) {
        const name = f.name.toLowerCase();
        const buf = new Uint8Array(await f.arrayBuffer());
        if (name.endsWith('.zip')) Object.assign(files, await unzip(buf, (n) => n.endsWith('.dat')));
        else if (name.endsWith('.dat')) files[name] = buf;
      }
      const miss = missingFiles(files);
      if (miss.length) throw new Error(`Missing ${miss.join(', ')}. Pick every file in CM's Data folder, or a zip of the folder.`);
      await new Promise((r) => setTimeout(r, 30));
      const w = parseCm0102(files);
      await saveCmWorld(w);
      setWorld(w);
    } catch (e) {
      setErr(String((e as Error).message ?? e));
    }
    setBusy(false);
  };
  return (
    <div className="setup-page">
      <Back onBack={onBack} title="CM 01/02" />
      <Fit className="setup-fill">
        <section className="card cm-import">
          <div className="card-h"><h3>Couldn't download the database</h3></div>
          <p>You need to be online the first time you open CM 01/02. Go back and try again with a connection, or import the files yourself below.</p>
          <p>Play with every club and player from your copy of Championship Manager 01/02: the English, Scottish, Spanish, Italian, German and French leagues, plus Europe's best clubs in the UEFA competitions.</p>
          <p className="muted small">Pick the files in CM's <b>Data</b> folder (staff.dat, club.dat, nation.dat, the name files and the rest), or a .zip of the folder. Your database stays on this device and isn't uploaded anywhere.</p>
          {err && <div className="banner closed">{err}</div>}
        </section>
      </Fit>
      <div className="setup-cta">
        <label className={`continue-btn ${busy ? 'disabled' : ''}`} style={{ flex: 1 }}>
          {busy ? 'Reading your database…' : '📂 Choose files'}
          <input type="file" multiple accept=".dat,.zip" hidden disabled={busy} onChange={(e) => onFiles(e.target.files)} />
        </label>
      </div>
    </div>
  );
}
