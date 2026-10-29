import { useMemo, useState, type ComponentType } from 'react';
import { ArrowLeftRight, Briefcase, Dumbbell, House, LoaderCircle, LogOut, Mail, Menu, Play, Save, Shield, Shirt, Sprout, Trophy } from 'lucide-react';
import { leaguePosition } from '../../game/competitions';
import { fmtShort } from '../../game/dates';
import { leagueOf } from '../../game/generate';
import { unreadCount } from '../../game/inbox';
import { continueGame, ordinal, pendingUserFixture, seasonLabel } from '../../game/season';
import { windowOpen } from '../../game/transfers';
import { getGame, mutate, autoSave, saveGame, setGame, useGame } from '../../store';
import { openActions } from '../../game/actions';
import { useUI, type Screen } from '../context';
import { Sheet } from './common';
import { BadgesSheet } from './BadgesSheet';
import { Crest } from './Crest';

const TABS: { id: Screen; label: string; Icon: ComponentType<{ strokeWidth?: number }> }[] = [
  { id: 'home', label: 'Home', Icon: House },
  { id: 'squad', label: 'First Team', Icon: Shirt },
  { id: 'youth', label: 'Youth', Icon: Sprout },
  { id: 'training', label: 'Training', Icon: Dumbbell },
  { id: 'transfers', label: 'Transfers', Icon: ArrowLeftRight },
  { id: 'board', label: 'Board', Icon: Briefcase },
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
        <Crest club={club} size={40} />
        <div style={{ minWidth: 0 }}>
          <b>{club.name}</b>
          <span>{league.name} · {pos ? ordinal(pos) : '—'} <span className="live-dot" style={{ background: windowOpen(g) ? 'var(--grass)' : 'var(--coral)' }} title={windowOpen(g) ? 'Transfer window open' : 'Transfer window closed'} /></span>
        </div>
      </div>
      <button className={`icon-btn ${ui.screen === 'competitions' ? 'on' : ''}`} aria-label="Competitions" onClick={() => ui.go('competitions')}><Trophy size={18} /></button>
      <button className={`icon-btn ${ui.screen === 'inbox' ? 'on' : ''}`} aria-label="Inbox" onClick={() => ui.go('inbox')}>
        <Mail size={18} />{unread > 0 && <span className="dot">{unread > 99 ? '99+' : unread}</span>}
      </button>
      <button className="icon-btn" aria-label="Menu" onClick={() => setMenu(true)}><Menu size={18} /></button>
      {menu && (
        <Sheet title="Menu" onClose={() => setMenu(false)}>
          <div className="sheet-b col">
            <div className="small muted bold">Manager {g.manager} · Season {seasonLabel(g.season)} · {g.mode === 'create' ? 'Create-a-club' : 'Classic'}</div>
            <button className="btn block" onClick={async () => { try { await saveGame(); ui.toast('Game saved'); } catch { ui.toast('Save failed', true); } setMenu(false); }}><Save /> Save game</button>
            <button className="btn block" onClick={() => { setMenu(false); ui.go('competitions'); }}><Trophy /> Competitions</button>
            <button className="btn block" onClick={() => { setMenu(false); ui.go('inbox'); }}><Mail /> Inbox</button>
            <button className="btn block" onClick={() => { setMenu(false); setBadges(true); }}><Shield /> Club badges</button>
            <button className="btn block coral" onClick={async () => { await saveGame(); setMenu(false); setGame(null); }}><LogOut /> Save & exit to menu</button>
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
  const actions = openActions(g);
  const onContinue = async () => {
    // Anything that needs a response has to be answered first (including before kick-off)
    if (actions.length) { ui.go('inbox', actions[actions.length - 1].id); ui.toast('Respond to this before continuing'); return; }
    if (matchToday) { ui.setMatchOpen(true); return; }
    setBusy(true);
    // let the button state paint before the (synchronous) simulation runs
    await new Promise((r) => setTimeout(r, 16));
    const r = mutate((gg) => continueGame(gg));
    setBusy(false);
    if (!r.ok && r.reason === 'match') ui.setMatchOpen(true);
    if (!r.ok && r.reason === 'action') { const a = openActions(getGame()!); if (a.length) ui.go('inbox', a[a.length - 1].id); }
    autoSave().catch(() => {});
  };
  return (
    <div className="continue-bar">
      <div className="when">
        <b>{fmtShort(g.date)}</b>
        <span>{matchToday ? 'Match day' : `Season ${seasonLabel(g.season)}`}</span>
      </div>
      <button className={`continue-btn ${matchToday && !actions.length ? 'match' : ''} ${actions.length ? 'respond' : ''}`} onClick={onContinue} disabled={busy}>
        {busy ? <><LoaderCircle className="spin" /> Simulating…</> : actions.length ? <>Respond ({actions.length}) <Mail /></> : matchToday ? <>Play match <Play fill="currentColor" /></> : <>Continue <Play fill="currentColor" /></>}
      </button>
    </div>
  );
}

export function TabBar() {
  const ui = useUI();
  const g = useGame();
  return (
    <nav className="tabbar">
      {TABS.map((t) => (
        <button key={t.id} className={ui.screen === t.id ? 'on' : ''} onClick={() => ui.go(t.id)}>
          <t.Icon strokeWidth={ui.screen === t.id ? 2.4 : 2} />
          <span>{t.id === 'transfers' && g.mode === 'journey' ? 'Recruitment' : t.label}</span>
        </button>
      ))}
    </nav>
  );
}

/** Teletext-style strip with the latest results from the user's league. */
export function Ticker() {
  const g = useGame();
  const league = leagueOf(g, g.userClubId);
  const items = useMemo(() => {
    const played = g.fixtures.filter((f) => f.comp === league.id && f.result && f.date <= g.date);
    const last = played.reduce((d, f) => (f.date > d ? f.date : d), '');
    return played.filter((f) => f.date === last).map((f) => `${g.clubs[f.home].name} ${f.result!.hg}-${f.result!.ag} ${g.clubs[f.away].name}`);
  }, [g.date, g.fixtures.length, league.id]);
  return (
    <div className="ticker" aria-label="Latest results">
      <b>{items.length ? 'LATEST' : league.short}</b>
      <div className="marq"><span>{items.length ? items.join(' · ') : `${league.name}: no results yet this season`}</span></div>
    </div>
  );
}
