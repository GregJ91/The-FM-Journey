import { useEffect } from 'react';
import { clubFixtures, compName, leagueTable } from '../../game/competitions';
import { diffDays, fmtShort } from '../../game/dates';
import { FORMATIONS, MENTALITY, PRESSING, STYLES } from '../../game/formations';
import { leagueOf, squadOf } from '../../game/generate';
import { avgRating, fmtMoney, overall, shortName } from '../../game/ratings';
import { ordinal } from '../../game/season';
import { mutate, useGame } from '../../store';
import { useUI } from '../context';
import { Card, ClubLink, FixtureRow, Meter, Ovr, PosTag, Spark, StatusIcons } from '../components/common';
import { Crest, textOn } from '../components/Crest';
import { FormationPitch } from '../components/Pitch';
import { validateLineup } from '../../game/selection';

export function Home() {
  const g = useGame();
  const ui = useUI();
  const club = g.clubs[g.userClubId];
  const league = leagueOf(g, club.id);
  const table = leagueTable(g, league);
  const myIdx = table.findIndex((r) => r.clubId === club.id);
  const fx = clubFixtures(g, club.id);
  const upcoming = fx.filter((f) => !f.result).slice(0, 5);
  const recent = fx.filter((f) => f.result).slice(-5).reverse();
  const next = upcoming[0];
  const squad = squadOf(g, club.id);
  const top = [...squad].sort((a, b) => overall(b) - overall(a)).slice(0, 6);
  const fg = textOn(club.colors[0]);
  const lo = Math.max(0, Math.min(table.length - 7, myIdx - 3));
  const mini = table.slice(lo, lo + 7);
  const avgOvr = Math.round(squad.map(overall).sort((a, b) => b - a).slice(0, 11).reduce((s, x) => s + x, 0) / Math.min(11, squad.length));

  // keep the shown lineup valid (injuries, sales, formation changes)
  const needsFix = club.lineup.length !== FORMATIONS[club.tactics.formation].length || club.lineup.some((id) => id === null || !g.players[id] || g.players[id].clubId !== club.id || !!g.players[id].injury);
  useEffect(() => {
    if (needsFix) mutate(() => validateLineup(club, squadOf(g, club.id)));
  }, [needsFix, club, g]);

  return (
    <div>
      <div className="hero" style={{ background: `linear-gradient(120deg, ${club.colors[0]} 0%, ${club.colors[0]} 55%, ${club.colors[1]} 55.2%, ${club.colors[1]} 62%, ${club.colors[0]} 62.2%)`, color: fg }}>
        <Crest club={club} size={110} />
        <div>
          <div className="small bold" style={{ letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.85 }}>Club overview</div>
          <h1>{club.name}</h1>
          <div className="meta">
            <span className="pill" style={{ color: '#fff' }}>🏟️ {club.stadium}</span>
            <span className="pill" style={{ color: '#fff' }}>{league.name}: {myIdx >= 0 ? ordinal(myIdx + 1) : '—'}</span>
            <span className="pill" style={{ color: '#fff' }}>⭐ Rep {club.reputation}</span>
            <span className="pill" style={{ color: '#fff' }}>🎯 {g.board.objective}</span>
          </div>
        </div>
        {next ? (
          <div className="next-match">
            <div className="row small bold">
              <span className="comp-dot" style={{ background: league.color }} /> {compName(g, next.comp)}{next.roundName ? ` · ${next.roundName}` : ''}
              <span className="right muted">{diffDays(next.date, g.date) === 0 ? 'TODAY' : `in ${diffDays(next.date, g.date)}d`}</span>
            </div>
            <div className="vs">
              <div className="side"><Crest club={g.clubs[next.home]} size={52} />{g.clubs[next.home].name}</div>
              <div className="v">VS</div>
              <div className="side"><Crest club={g.clubs[next.away]} size={52} />{g.clubs[next.away].name}</div>
            </div>
            <div className="small muted bold" style={{ textAlign: 'center' }}>{fmtShort(next.date)} · {next.neutral ? 'Neutral venue' : g.clubs[next.home].stadium}</div>
          </div>
        ) : (
          <div className="next-match"><b>No fixtures scheduled</b><div className="small muted">The new season starts on 1 July.</div></div>
        )}
      </div>

      <div className="grid g4" style={{ marginBottom: 18 }}>
        <div className="stat-tile"><div className="k">Board confidence</div><div className="v">{g.board.confidence}%</div><Meter value={g.board.confidence} /></div>
        <div className="stat-tile"><div className="k">Balance</div><div className="v" style={{ color: club.balance < 0 ? 'var(--bad)' : undefined }}>{fmtMoney(club.balance)}</div><div className="small muted">Transfer budget {fmtMoney(club.transferBudget)}</div></div>
        <div className="stat-tile"><div className="k">Starting XI average</div><div className="v">{avgOvr} <span className="small muted">OVR</span></div><div className="small muted">{squad.length} players in first team</div></div>
        <div className="stat-tile"><div className="k">Form (last 5)</div><div className="row" style={{ marginTop: 6, gap: 5 }}>{(table[myIdx]?.form ?? []).length ? table[myIdx].form.map((f, i) => <span key={i} className={`res ${f}`}>{f}</span>) : <span className="muted bold">No games yet</span>}</div></div>
      </div>

      <div className="grid g3">
        <Card title="Tactics" tag={club.tactics.formation} right={<button className="btn sm" onClick={() => ui.go('squad', 'tactics')}>Edit</button>}>
          <FormationPitch g={g} club={club} lineup={club.lineup} height={360} compact onSlot={() => ui.go('squad', 'tactics')} />
          <div className="row wrap" style={{ marginTop: 12, gap: 6 }}>
            <span className="chip">🧠 {MENTALITY[club.tactics.mentality + 2]}</span>
            <span className="chip">⚡ {PRESSING[club.tactics.pressing]}</span>
            <span className="chip">🎯 {STYLES[club.tactics.style]}</span>
          </div>
        </Card>

        <Card title="Fixtures & Results" tag="Schedule" tagColor="var(--sky)" right={<button className="btn sm" onClick={() => ui.go('competitions', 'fixtures')}>All</button>}>
          <div className="small bold muted" style={{ marginBottom: 4 }}>UPCOMING</div>
          {upcoming.length ? upcoming.map((f) => <FixtureRow key={f.id} g={g} f={f} compact />) : <div className="empty">Nothing scheduled</div>}
          <div className="small bold muted" style={{ margin: '12px 0 4px' }}>RECENT</div>
          {recent.length ? recent.map((f) => <FixtureRow key={f.id} g={g} f={f} compact />) : <div className="muted small">No results yet.</div>}
        </Card>

        <div className="col" style={{ gap: 18 }}>
          <Card title="Top Players" tag="Stars" tagColor="var(--yellow)" right={<button className="btn sm" onClick={() => ui.go('squad')}>Squad</button>}>
            <table className="t">
              <tbody>
                {top.map((p) => (
                  <tr key={p.id} className="click" onClick={() => ui.openPlayer(p.id)}>
                    <td style={{ width: 40 }}><Ovr value={overall(p)} /></td>
                    <td><PosTag pos={p.pos} /></td>
                    <td className="bold">{shortName(p)}<StatusIcons p={p} /></td>
                    <td className="r"><Spark values={p.form} /></td>
                    <td className="r small muted">{p.stats.apps ? `${p.stats.goals}G · ${avgRating(p).toFixed(1)}` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card title={league.name} tag="Table" tagColor={league.color} right={<button className="btn sm" onClick={() => ui.go('competitions')}>Full</button>}>
            <table className="t">
              <thead><tr><th>#</th><th>Club</th><th className="r">P</th><th className="r">GD</th><th className="r">Pts</th></tr></thead>
              <tbody>
                {mini.map((r) => {
                  const pos = table.indexOf(r) + 1;
                  return (
                    <tr key={r.clubId} className={r.clubId === club.id ? 'me' : ''}>
                      <td className="num">{pos}</td>
                      <td><ClubLink g={g} id={r.clubId} size={18} /></td>
                      <td className="r num">{r.p}</td>
                      <td className="r num">{r.gf - r.ga > 0 ? '+' : ''}{r.gf - r.ga}</td>
                      <td className="r num bold">{r.pts}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>

        <Card title="Latest News" tag="Inbox" tagColor="var(--pink)" className="span3" right={<button className="btn sm" onClick={() => ui.go('inbox')}>Open inbox</button>}>
          <div className="grid g3" style={{ gap: 12 }}>
            {g.inbox.slice(0, 3).map((m) => (
              <div key={m.id} className="card" style={{ boxShadow: 'none', cursor: 'pointer', padding: 12 }} onClick={() => ui.go('inbox', m.id)}>
                <div className="small muted bold">{fmtShort(m.date)} · {m.from}</div>
                <div className="bold" style={{ margin: '4px 0' }}>{!m.read && '🔵 '}{m.title}</div>
                <div className="small muted" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', whiteSpace: 'pre-wrap' }}>{m.body}</div>
              </div>
            ))}
            {!g.inbox.length && <div className="muted">No messages yet.</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}
