import { useState } from 'react';
import { leaguePosition } from '../../game/competitions';
import { fmtDate } from '../../game/dates';
import { leagueOf } from '../../game/generate';
import { unreadCount } from '../../game/inbox';
import { continueGame, ordinal, pendingUserFixture, seasonLabel } from '../../game/season';
import { windowOpen } from '../../game/transfers';
import { mutate, saveGame, setGame, useGame } from '../../store';
import { useUI, type Screen } from '../context';
import { Crest } from './Crest';

const NAV: { id: Screen; label: string; ico: string }[] = [
  { id: 'home', label: 'Home', ico: '🏟️' },
  { id: 'squad', label: 'First Team', ico: '👕' },
  { id: 'youth', label: 'Youth Team', ico: '🌱' },
  { id: 'training', label: 'Training', ico: '🏋️' },
  { id: 'transfers', label: 'Transfers', ico: '🔁' },
  { id: 'board', label: 'Board', ico: '💼' },
];
const NAV2: { id: Screen; label: string; ico: string }[] = [
  { id: 'competitions', label: 'Competitions', ico: '🏆' },
  { id: 'inbox', label: 'Inbox', ico: '✉️' },
];

export function Sidebar() {
  const g = useGame();
  const ui = useUI();
  const unread = unreadCount(g);
  const [saving, setSaving] = useState(false);
  const btn = (n: (typeof NAV)[number]) => (
    <button key={n.id} className={`nav-btn ${ui.screen === n.id ? 'active' : ''}`} onClick={() => ui.go(n.id)}>
      <span className="ico">{n.ico}</span>
      <span>{n.label}</span>
      {n.id === 'inbox' && unread > 0 && <span className="badge">{unread}</span>}
    </button>
  );
  return (
    <nav className="sidebar">
      <div className="logo">
        <div className="logo-mark">FM</div>
        <div className="logo-text">The FM Journey<small>{g.mode === 'create' ? 'Create-a-club' : 'Manager mode'}</small></div>
      </div>
      {NAV.map(btn)}
      <div className="nav-sep" />
      {NAV2.map(btn)}
      <div className="sidebar-foot">
        <div>Manager: <b style={{ color: '#fff' }}>{g.manager}</b></div>
        <div>Season {seasonLabel(g.season)}</div>
        <button
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            try { await saveGame(); ui.toast('Game saved 💾'); } catch { ui.toast('Save failed', true); }
            setSaving(false);
          }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={async () => { await saveGame(); setGame(null); }}>Save & Exit</button>
      </div>
    </nav>
  );
}

export function TopBar() {
  const g = useGame();
  const ui = useUI();
  const [busy, setBusy] = useState(false);
  const club = g.clubs[g.userClubId];
  const league = leagueOf(g, club.id);
  const pos = leaguePosition(g, club.id);
  const matchToday = pendingUserFixture(g);

  const onContinue = async () => {
    if (matchToday) { ui.setMatchOpen(true); return; }
    setBusy(true);
    // let the button state paint before the (synchronous) simulation runs
    await new Promise((r) => setTimeout(r, 16));
    const r = mutate((gg) => continueGame(gg));
    setBusy(false);
    if (!r.ok && r.reason === 'match') ui.setMatchOpen(true);
    saveGame().catch(() => {});
  };

  return (
    <header className="topbar">
      <div className="club-chip">
        <Crest club={club} size={42} />
        <div style={{ minWidth: 0 }}>
          <h2>{club.name}</h2>
          <div className="sub">{league.name} · {pos ? ordinal(pos) : '—'} · {windowOpen(g) ? '🟢 Window open' : '🔴 Window closed'}</div>
        </div>
      </div>
      <div className="date">
        <div className="d">{fmtDate(g.date)}</div>
        <div className="s">{matchToday ? 'MATCH DAY' : `Season ${seasonLabel(g.season)}`}</div>
      </div>
      <button className={`continue-btn ${matchToday ? 'match' : ''}`} onClick={onContinue} disabled={busy}>
        {busy ? 'Processing…' : matchToday ? <>Play Match ⚽</> : <>Continue ▶</>}
      </button>
    </header>
  );
}
