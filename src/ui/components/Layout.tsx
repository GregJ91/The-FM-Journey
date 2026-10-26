import { useState } from 'react';
import { leaguePosition } from '../../game/competitions';
import { fmtShort } from '../../game/dates';
import { leagueOf } from '../../game/generate';
import { unreadCount } from '../../game/inbox';
import { continueGame, ordinal, pendingUserFixture, seasonLabel } from '../../game/season';
import { windowOpen } from '../../game/transfers';
import { mutate, saveGame, setGame, useGame } from '../../store';
import { useUI, type Screen } from '../context';
import { Sheet } from './common';
import { BadgesSheet } from './BadgesSheet';
import { Crest } from './Crest';

const TABS: { id: Screen; label: string; ico: string }[] = [
  { id: 'home', label: 'Home', ico: '🏟️' },
  { id: 'squad', label: 'First Team', ico: '👕' },
  { id: 'youth', label: 'Youth', ico: '🌱' },
  { id: 'training', label: 'Training', ico: '🏋️' },
  { id: 'transfers', label: 'Transfers', ico: '🔁' },
  { id: 'board', label: 'Board', ico: '💼' },
];

export function Header() {
  const g = useGame();
  const ui = useUI();
  const [menu, setMenu] = useState(false);
  const [badges, setBadges] = useState(false);
  const club = g.clubs[g.userClubId];
  const league = leagueOf(g, club.id);
  const pos = leaguePosition(g, club.id);
  const unread = unreadCount(g);
  return (
    <header className="header">
      <div className="club" onClick={() => ui.go('home')}>
        <Crest club={club} size={38} />
        <div style={{ minWidth: 0 }}>
          <b>{club.name}</b>
          <span>{league.short} · {pos ? ordinal(pos) : '—'} · {windowOpen(g) ? '🟢 Window' : '🔴 Window'}</span>
        </div>
      </div>
      <button className={`icon-btn ${ui.screen === 'competitions' ? 'on' : ''}`} aria-label="Competitions" onClick={() => ui.go('competitions')}>🏆</button>
      <button className={`icon-btn ${ui.screen === 'inbox' ? 'on' : ''}`} aria-label="Inbox" onClick={() => ui.go('inbox')}>
        ✉️{unread > 0 && <span className="dot">{unread > 99 ? '99+' : unread}</span>}
      </button>
      <button className="icon-btn" aria-label="Menu" onClick={() => setMenu(true)}>☰</button>
      {menu && (
        <Sheet title="Menu" onClose={() => setMenu(false)}>
          <div className="sheet-b col">
            <div className="small muted bold">Manager {g.manager} · Season {seasonLabel(g.season)} · {g.mode === 'create' ? 'Create-a-club' : 'Classic'}</div>
            <button className="btn block" onClick={async () => { try { await saveGame(); ui.toast('Game saved 💾'); } catch { ui.toast('Save failed', true); } setMenu(false); }}>💾 Save game</button>
            <button className="btn block" onClick={() => { setMenu(false); ui.go('competitions'); }}>🏆 Competitions</button>
            <button className="btn block" onClick={() => { setMenu(false); ui.go('inbox'); }}>✉️ Inbox</button>
            <button className="btn block" onClick={() => { setMenu(false); setBadges(true); }}>🛡️ Club badges</button>
            <button className="btn block coral" onClick={async () => { await saveGame(); setMenu(false); setGame(null); }}>Save & exit to menu</button>
          </div>
        </Sheet>
      )}
      {badges && <BadgesSheet onClose={() => setBadges(false)} />}
    </header>
  );
}

export function ContinueBar() {
  const g = useGame();
  const ui = useUI();
  const [busy, setBusy] = useState(false);
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
    <div className="continue-bar">
      <div className="when">
        <b>{fmtShort(g.date)}</b>
        <span>{matchToday ? 'MATCH DAY' : g.date.slice(0, 4)}</span>
      </div>
      <button className={`continue-btn ${matchToday ? 'match' : ''}`} onClick={onContinue} disabled={busy}>
        {busy ? 'Processing…' : matchToday ? <>Play Match ⚽</> : <>Continue ▶</>}
      </button>
    </div>
  );
}

export function TabBar() {
  const ui = useUI();
  return (
    <nav className="tabbar">
      {TABS.map((t) => (
        <button key={t.id} className={ui.screen === t.id ? 'on' : ''} onClick={() => ui.go(t.id)}>
          <span className="i">{t.ico}</span>
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
