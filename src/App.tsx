import { useEffect } from 'react';
import { setGame, useGame, useVersion } from './store';
import { UIProvider, useUI } from './ui/context';
import { Sidebar, TopBar } from './ui/components/Layout';
import { Home } from './ui/screens/Home';
import { Squad } from './ui/screens/Squad';
import { Youth } from './ui/screens/Youth';
import { Training } from './ui/screens/Training';
import { Transfers } from './ui/screens/Transfers';
import { Board } from './ui/screens/Board';
import { ClubView, Competitions, Inbox } from './ui/screens/Competitions';
import { PlayerModal } from './ui/screens/PlayerModal';
import { MatchScreen } from './ui/screens/Match';
import { Title } from './ui/screens/Title';

function Game() {
  const g = useGame();
  const ui = useUI();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') ui.openPlayer(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ui]);

  if (g.sacked) {
    return (
      <div className="sacked">
        <div className="card" style={{ maxWidth: 520, textAlign: 'center', padding: 30 }}>
          <div style={{ fontSize: 60 }}>📦</div>
          <h1 style={{ fontSize: 40 }}>You're sacked!</h1>
          <p>The board of {g.clubs[g.userClubId].name} has lost confidence in you. Clear your desk, gaffer.</p>
          <button className="btn primary" onClick={() => setGame(null)}>Back to main menu</button>
        </div>
      </div>
    );
  }

  const screen = (() => {
    switch (ui.screen) {
      case 'home': return <Home />;
      case 'squad': return <Squad key={String(ui.param)} />;
      case 'youth': return <Youth />;
      case 'training': return <Training />;
      case 'transfers': return <Transfers />;
      case 'board': return <Board />;
      case 'competitions': return <Competitions key={String(ui.param)} />;
      case 'inbox': return <Inbox key={String(ui.param)} />;
      case 'club': return <ClubView key={String(ui.param)} />;
    }
  })();

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <TopBar />
        <main className="content">{screen}</main>
      </div>
      <PlayerModal />
      {ui.matchOpen && <MatchScreen />}
    </div>
  );
}

function Root() {
  useVersion();
  const g = useGame();
  return g ? <Game /> : <Title />;
}

export default function App() {
  return (
    <UIProvider>
      <Root />
    </UIProvider>
  );
}
