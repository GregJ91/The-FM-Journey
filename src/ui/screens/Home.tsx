import { useEffect } from 'react';
import { clubFixtures, compName, leagueTable } from '../../game/competitions';
import { diffDays, fmtShort } from '../../game/dates';
import { FORMATIONS, MENTALITY, PRESSING, STYLES } from '../../game/formations';
import { leagueOf, squadOf } from '../../game/generate';
import { avgRating, fmtMoney, overall } from '../../game/ratings';
import { ordinal } from '../../game/season';
import { validateLineup } from '../../game/selection';
import { mutate, useGame } from '../../store';
import { useUI } from '../context';
import { Card, FixtureRow, Meter, PlayerRow, Spark } from '../components/common';
import { Crest } from '../components/Crest';
import { ChevronRight, Target } from 'lucide-react';
import { FormationPitch } from '../components/Pitch';

export function Home() {
  const g = useGame();
  const ui = useUI();
  const club = g.clubs[g.userClubId];
  const league = leagueOf(g, club.id);
  const table = leagueTable(g, league);
  const myIdx = table.findIndex((r) => r.clubId === club.id);
  const fx = clubFixtures(g, club.id);
  const upcoming = fx.filter((f) => !f.result).slice(0, 4);
  const recent = fx.filter((f) => f.result).slice(-3).reverse();
  const next = upcoming[0];
  const squad = squadOf(g, club.id);
  const top = [...squad].sort((a, b) => overall(b) - overall(a)).slice(0, 5);
  const lo = Math.max(0, Math.min(table.length - 5, myIdx - 2));
  const mini = table.slice(lo, lo + 5);
  const avgOvr = Math.round(squad.map(overall).sort((a, b) => b - a).slice(0, 11).reduce((s, x) => s + x, 0) / Math.max(1, Math.min(11, squad.length)));

  // keep the shown lineup valid (injuries, sales, formation changes)
  const needsFix = club.lineup.length !== FORMATIONS[club.tactics.formation].length || club.lineup.some((id) => id === null || !g.players[id] || g.players[id].clubId !== club.id || !!g.players[id].injury);
  useEffect(() => {
    if (needsFix) mutate(() => validateLineup(club, squadOf(g, club.id)));
  }, [needsFix, club, g]);

  return (
    <div>
      <div className="hero">
        <div className="top">
          <Crest club={club} size={72} />
          <div style={{ minWidth: 0 }}>
            <div className="kick">Club overview</div>
            <h1>{club.name}</h1>
          </div>
        </div>
        <div className="pills">
          <span className="pill">{league.name}: {myIdx >= 0 ? ordinal(myIdx + 1) : '—'}</span>
          <span className="pill">Reputation {club.reputation}</span>
          <span className="pill"><Target size={12} className="icon-inline" /> {g.board.objective}</span>
        </div>
        {next ? (
          <div className="next-match">
            <div className="row small bold">
              <span className="comp-dot" style={{ background: league.color }} />
              <span className="ellipsis">{compName(g, next.comp)}{next.roundName ? ` · ${next.roundName}` : ''}</span>
              <span className="right muted">{diffDays(next.date, g.date) === 0 ? 'TODAY' : `in ${diffDays(next.date, g.date)}d`}</span>
            </div>
            <div className="vs">
              <div className="side"><Crest club={g.clubs[next.home]} size={46} />{g.clubs[next.home].name}</div>
              <div className="v">VS</div>
              <div className="side"><Crest club={g.clubs[next.away]} size={46} />{g.clubs[next.away].name}</div>
            </div>
            <div className="small muted bold" style={{ textAlign: 'center' }}>{fmtShort(next.date)} · {next.neutral ? 'Neutral venue' : g.clubs[next.home].stadium}</div>
          </div>
        ) : (
          <div className="next-match"><b>No fixtures scheduled</b><div className="small muted">The new season starts on 1 July.</div></div>
        )}
      </div>

      <div className="grid2" style={{ marginBottom: 14 }}>
        <div className="tile" onClick={() => ui.go('board')}><div className="k">Board</div><div className="v">{g.board.confidence}%</div><Meter value={g.board.confidence} /></div>
        <div className="tile" onClick={() => ui.go('board')}><div className="k">Balance</div><div className="v" style={{ color: club.balance < 0 ? 'var(--bad)' : undefined }}>{fmtMoney(club.balance)}</div><div className="small muted">Budget {fmtMoney(club.transferBudget)}</div></div>
        <div className="tile" onClick={() => ui.go('squad')}><div className="k">Best XI</div><div className="v">{avgOvr} <span className="small muted">OVR</span></div><div className="small muted">{squad.length} in squad</div></div>
        <div className="tile"><div className="k">Form</div><div className="row" style={{ marginTop: 8, gap: 4 }}>{(table[myIdx]?.form ?? []).length ? table[myIdx].form.map((f, i) => <span key={i} className={`res ${f}`}>{f}</span>) : <span className="muted bold small">No games yet</span>}</div></div>
      </div>

      <Card title="Tactics" tag={club.tactics.formation} right={<button className="btn sm" onClick={() => ui.go('squad', 'tactics')}>Edit</button>}>
        <div style={{ maxWidth: 300, margin: '0 auto' }}>
          <FormationPitch g={g} club={club} lineup={club.lineup} small onSlot={() => ui.go('squad', 'tactics')} />
        </div>
        <div className="row wrap" style={{ marginTop: 10, gap: 6, justifyContent: 'center' }}>
          <span className="chip">{MENTALITY[club.tactics.mentality + 2]}</span>
          <span className="chip">{PRESSING[club.tactics.pressing]}</span>
          <span className="chip">{STYLES[club.tactics.style]}</span>
        </div>
      </Card>

      <Card title="Fixtures" tag="Schedule" tagColor="var(--sky)" right={<button className="btn sm" onClick={() => ui.go('competitions', 'fixtures')}>All</button>}>
        {upcoming.length ? upcoming.map((f) => <FixtureRow key={f.id} g={g} f={f} />) : <div className="empty">Nothing scheduled</div>}
        {recent.length > 0 && <div className="section-label">Recent results</div>}
        {recent.map((f) => <FixtureRow key={f.id} g={g} f={f} />)}
      </Card>

      <Card title="Top Players" tag="Stars" tagColor="var(--yellow)" right={<button className="btn sm" onClick={() => ui.go('squad')}>Squad</button>}>
        <div className="list">
          {top.map((p) => (
            <PlayerRow key={p.id} p={p} sub={p.stats.apps ? `${p.stats.apps} apps · ${p.stats.goals} goals · ${avgRating(p).toFixed(1)} avg` : p.nat} end={<Spark values={p.form} />} />
          ))}
        </div>
      </Card>

      <Card title={league.name} tag="Table" tagColor={league.color} right={<button className="btn sm" onClick={() => ui.go('competitions')}>Full</button>}>
        <table className="t">
          <thead><tr><th>#</th><th>Club</th><th className="r">P</th><th className="r">GD</th><th className="r">Pts</th></tr></thead>
          <tbody>
            {mini.map((r) => (
              <tr key={r.clubId} className={`click ${r.clubId === club.id ? 'me' : ''}`} onClick={() => ui.go('club', r.clubId)}>
                <td className="num">{table.indexOf(r) + 1}</td>
                <td><span className="row" style={{ gap: 6 }}><Crest club={g.clubs[r.clubId]} size={18} /><span className="ellipsis" style={{ maxWidth: 170 }}>{g.clubs[r.clubId].name}</span></span></td>
                <td className="r num">{r.p}</td>
                <td className="r num">{r.gf - r.ga > 0 ? '+' : ''}{r.gf - r.ga}</td>
                <td className="r num bold">{r.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card title="Latest News" tag="Inbox" tagColor="var(--pink)" right={<button className="btn sm" onClick={() => ui.go('inbox')}>Inbox</button>}>
        <div className="list">
          {g.inbox.slice(0, 3).map((m) => (
            <div key={m.id} className="li" onClick={() => ui.go('inbox', m.id)}>
              <div className="main">
                <div className="t">{!m.read && <span className="live-dot" style={{ background: 'var(--accent)', marginRight: 7, verticalAlign: 2 }} />}{m.title}</div>
                <div className="s">{fmtShort(m.date)} · {m.from}</div>
              </div>
              <ChevronRight size={16} className="muted" />
            </div>
          ))}
          {!g.inbox.length && <div className="muted small">No messages yet.</div>}
        </div>
      </Card>
    </div>
  );
}
