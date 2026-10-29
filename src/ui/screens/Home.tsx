import { useEffect } from 'react';
import { journey } from '../../game/journey';
import { clubFixtures, compName, leagueTable } from '../../game/competitions';
import { diffDays, fmtShort } from '../../game/dates';
import { FORMATIONS } from '../../game/formations';
import { leagueOf, squadOf } from '../../game/generate';
import { fmtMoney } from '../../game/ratings';
import { ordinal } from '../../game/season';
import { validateLineup } from '../../game/selection';
import { mutate, useGame } from '../../store';
import { useUI } from '../context';
import { Card } from '../components/common';
import { Crest } from '../components/Crest';

export function Home() {
  const g = useGame();
  const ui = useUI();
  const club = g.clubs[g.userClubId];
  const league = leagueOf(g, club.id);
  const table = leagueTable(g, league);
  const myIdx = table.findIndex((r) => r.clubId === club.id);
  const fx = clubFixtures(g, club.id);
  const upcoming = fx.filter((f) => !f.result).slice(0, 4);
  const next = upcoming[0];
  const squad = squadOf(g, club.id);

  // keep the shown lineup valid (injuries, sales, formation changes)
  const needsFix = club.lineup.length !== FORMATIONS[club.tactics.formation].length || club.lineup.some((id) => id === null || !g.players[id] || g.players[id].clubId !== club.id || !!g.players[id].injury || !!g.players[id].away);
  useEffect(() => {
    if (needsFix) mutate(() => validateLineup(club, squadOf(g, club.id)));
  }, [needsFix, club, g]);

  const myRow = table[myIdx];
  const form = myRow?.form.slice(-5) ?? [];
  const opp = next ? (next.home === club.id ? next.away : next.home) : null;
  const oppLeague = opp !== null ? leagueOf(g, opp) : null;
  const oppTable = oppLeague && oppLeague.id === league.id ? table : oppLeague ? leagueTable(g, oppLeague) : [];
  const oppIdx = opp !== null ? oppTable.findIndex((r) => r.clubId === opp) : -1;
  const days = next ? diffDays(next.date, g.date) : 0;
  const preseason = !myRow || myRow.p === 0;
  const unread = g.inbox.filter((m) => !m.read).length;
  const injured = squad.filter((p) => p.injury).length;
  const morale = Math.round(squad.reduce((s, p) => s + p.morale, 0) / Math.max(1, squad.length));

  const news = g.inbox.slice(0, 6);
  const j = journey(g);
  const ready = j ? j.requests.filter((r) => r.status === 'ready') : [];
  const opts = ready.reduce((n, r) => n + r.candidates.filter((c) => c.status === 'open').length, 0);

  // Championship Manager-style dashboard: one screen of windows, each showing one thing; tap to open it
  return (
    <div className="ns-home">
      <Card className="tile wide" title="Next fixture" right={next ? <span className="tile-sub">{compName(g, next.comp)}</span> : undefined}>
        {next ? (
          <div className="tile-b click" onClick={() => ui.go('competitions', 'fixtures')}>
            <div className="ns-vs">
              <Crest club={g.clubs[next.home]} size={34} />
              <span className="ns-vs-names">{g.clubs[next.home].name} <span className="muted">v</span> {g.clubs[next.away].name}</span>
              <Crest club={g.clubs[next.away]} size={34} />
            </div>
            <div className="muted small">{days === 0 ? 'Today' : fmtShort(next.date)} · {next.neutral ? 'Neutral venue' : g.clubs[next.home].stadium}{oppIdx >= 0 && !preseason ? ` · ${g.clubs[opp!].short} are ${ordinal(oppIdx + 1)}` : ''}</div>
          </div>
        ) : <div className="muted small">No fixtures scheduled. The new season starts on 1 July.</div>}
      </Card>

      <Card className="tile" title="Position">
        <div className="tile-b click" onClick={() => ui.go('competitions')}>
          <span className="big">{preseason ? '—' : ordinal(myIdx + 1)}</span>
          <span className="muted small">{preseason ? `Aim: ${ordinal(g.board.objectiveRank)}` : `${myRow.pts} pts · aim ${ordinal(g.board.objectiveRank)}`}</span>
        </div>
      </Card>
      <Card className="tile" title="Form">
        <div className="tile-b click" onClick={() => ui.go('board')}>
          {form.length ? <span className="ns-form">{form.map((x, i) => <i key={i} className={x}>{x}</i>)}</span> : <span className="muted small">No games yet</span>}
          <span className="muted small">Board: {g.board.confidence}% confident</span>
        </div>
      </Card>
      <Card className="tile" title="Morale">
        <div className="tile-b click" onClick={() => ui.go('squad')}>
          <div className="ns-bar"><i style={{ width: `${morale}%` }} /></div>
          <span className="muted small">{morale >= 75 ? 'Superb' : morale >= 60 ? 'Good' : morale >= 45 ? 'Okay' : 'Poor'} · {injured ? `${injured} injured` : 'no injuries'}</span>
        </div>
      </Card>
      <Card className="tile" title="Finances">
        <div className="tile-b click" onClick={() => ui.go('board')}>
          <span className="big" style={{ color: club.balance < 0 ? 'var(--bad)' : undefined }}>{fmtMoney(club.balance)}</span>
          <span className="muted small">Budget {fmtMoney(club.transferBudget)}</span>
        </div>
      </Card>

      {j ? (
        <Card className="tile wide" title="Director of Football" right={<span className="tile-sub">{opts} new</span>}>
          <div className="tile-b click ns-lines" onClick={() => ui.go('transfers')}>
            {ready.length ? <div>» {opts} option{opts === 1 ? '' : 's'} ready from your requests</div> : <div>» No reports waiting</div>}
            <div>» {j.requests.filter((r) => r.status === 'scouting').length} request(s) being scouted</div>
          </div>
        </Card>
      ) : (
        <Card className="tile wide" title="Inbox" right={<span className="tile-sub">{unread} new</span>}>
          <div className="tile-b click ns-lines" onClick={() => ui.go('inbox')}>
            {news.map((m) => <div key={m.id} className="ellipsis">» {m.title}</div>)}
            {!news.length && <div className="muted">No messages yet.</div>}
          </div>
        </Card>
      )}
    </div>
  );
}
