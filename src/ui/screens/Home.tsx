import { useEffect } from 'react';
import { clubFixtures, compColor, compName, leagueTable } from '../../game/competitions';
import { europeFor, europeTable } from '../../game/europe';
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
  const formStrip = (f: string[]) => (f.length ? <span className="form-strip">{f.map((x, i) => <i key={i} className={`res ${x}`}>{x}</i>)}</span> : null);

  return (
    <div className="cols home">
      {next ? (
        <section className="card match-card" style={{ '--h': g.clubs[next.home].colors[0], '--a': g.clubs[next.away].colors[0] } as React.CSSProperties} onClick={() => ui.go('competitions', 'fixtures')}>
          <div className="mc-comp"><span className="comp-dot" style={{ background: compColor(g, next.comp) }} />{compName(g, next.comp)}{next.roundName ? ` · ${next.roundName}` : ''}</div>
          <div className="mc-teams">
            <div className="mc-side"><Crest club={g.clubs[next.home]} size={54} /><b>{g.clubs[next.home].short}</b></div>
            <div className="mc-mid">
              <div className={`mc-count ${days === 0 ? 'today' : ''}`}>{days === 0 ? 'TODAY' : days}</div>
              <div className="mc-unit">{days === 0 ? 'Match day' : days === 1 ? 'day to go' : 'days to go'}</div>
            </div>
            <div className="mc-side"><Crest club={g.clubs[next.away]} size={54} /><b>{g.clubs[next.away].short}</b></div>
          </div>
          <div className="mc-when">{fmtShort(next.date)} · {next.neutral ? 'Neutral venue' : g.clubs[next.home].stadium}</div>
          {!preseason && (
            <div className="mc-compare">
              <span>{myIdx >= 0 ? ordinal(myIdx + 1) : '—'} {formStrip(form.slice(-3))}</span>
              <span className="muted">vs</span>
              <span>{formStrip(oppTable[oppIdx]?.form.slice(-3) ?? [])} {oppIdx >= 0 ? ordinal(oppIdx + 1) : '—'}</span>
            </div>
          )}
        </section>
      ) : (
        <Card title="Next match"><div className="empty">No fixtures scheduled. The new season starts on 1 July.</div></Card>
      )}

      <Card title="Club status" tag={league.short} tagColor={league.color}>
        <div className="kpis">
          <div className="kpi" style={{ '--k': league.color } as React.CSSProperties} onClick={() => ui.go('competitions')}>
            <span className="kk">League</span>
            <span className="kv">{preseason ? '—' : ordinal(myIdx + 1)}</span>
            <span className="ks">{preseason ? `Pre-season · aim ${ordinal(g.board.objectiveRank)}` : `${myRow.pts} pts · aim ${ordinal(g.board.objectiveRank)}`}</span>
          </div>
          <div className="kpi" style={{ '--k': g.board.confidence >= 60 ? 'var(--grass)' : g.board.confidence >= 30 ? 'var(--yellow)' : 'var(--coral)' } as React.CSSProperties} onClick={() => ui.go('board')}>
            <span className="kk">Board</span>
            <span className="kv">{g.board.confidence}%</span>
            <Meter value={g.board.confidence} />
          </div>
          <div className="kpi" style={{ '--k': club.balance < 0 ? 'var(--coral)' : 'var(--sky)' } as React.CSSProperties} onClick={() => ui.go('board')}>
            <span className="kk">Balance</span>
            <span className="kv" style={{ color: club.balance < 0 ? 'var(--bad)' : undefined }}>{fmtMoney(club.balance)}</span>
            <span className="ks">Budget {fmtMoney(club.transferBudget)}</span>
          </div>
          <div className="kpi" style={{ '--k': 'var(--yellow)' } as React.CSSProperties} onClick={() => ui.go('squad')}>
            <span className="kk">Best XI</span>
            <span className="kv">{avgOvr}</span>
            <span className="ks">{squad.length} players · morale {morale}%</span>
          </div>
        </div>
        <div className="status-line">
          <span>Form {formStrip(form) ?? <span className="muted">no games yet</span>}</span>
          {injured > 0 && <span className="chip" onClick={() => ui.go('squad')}>🩹 {injured} injured</span>}
          {unread > 0 && <span className="chip" onClick={() => ui.go('inbox')}>✉️ {unread} unread</span>}
        </div>
        <div className="objective"><Target size={13} className="icon-inline" /> {g.board.objective}</div>
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
                <td className="r num bold">{r.pts}{r.ded ? <span className="ded"> −{r.ded}</span> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card title="Fixtures" tag="Schedule" tagColor="var(--sky)" right={<button className="btn sm" onClick={() => ui.go('competitions', 'fixtures')}>All</button>}>
        {upcoming.length ? upcoming.map((f) => <FixtureRow key={f.id} g={g} f={f} />) : <div className="empty">Nothing scheduled</div>}
        {recent.length > 0 && <div className="section-label">Recent results</div>}
        {recent.map((f) => <FixtureRow key={f.id} g={g} f={f} />)}
      </Card>

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

      {europeFor(g, club.id).map((cup) => {
        const lp = cup.lp ?? 0;
        const et = europeTable(g, cup);
        const pos = et.findIndex((r) => r.clubId === club.id);
        const elo = Math.max(0, Math.min(et.length - 5, pos - 2));
        const status = cup.winner === club.id ? '🏆 Winners!' : cup.current < lp ? null : cup.alive.includes(club.id) && cup.winner === null ? `Still in: ${cup.rounds[cup.current]?.name ?? 'final'}` : 'Knocked out';
        return (
          <Card key={cup.id} title={cup.name} tag={cup.short} tagColor={cup.color} right={<button className="btn sm" onClick={() => ui.go('competitions', cup.id)}>Open</button>}>
            {status ? <div className="bold">{status}</div> : (
              <table className="t">
                <tbody>
                  {et.slice(elo, elo + 5).map((r) => (
                    <tr key={r.clubId} className={`click ${r.clubId === club.id ? 'me' : ''}`} onClick={() => ui.go('club', r.clubId)}>
                      <td className="num">{et.indexOf(r) + 1}</td>
                      <td><span className="row" style={{ gap: 6 }}><Crest club={g.clubs[r.clubId]} size={18} /><span className="ellipsis" style={{ maxWidth: 170 }}>{g.clubs[r.clubId].name}</span></span></td>
                      <td className="r num">{r.p}</td>
                      <td className="r num bold">{r.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        );
      })}

      <Card title="Top Players" tag="Stars" tagColor="var(--yellow)" right={<button className="btn sm" onClick={() => ui.go('squad')}>Squad</button>}>
        <div className="list">
          {top.map((p) => (
            <PlayerRow key={p.id} p={p} sub={p.stats.apps ? `${p.stats.apps} apps · ${p.stats.goals} goals · ${avgRating(p).toFixed(1)} avg` : p.nat} end={<Spark values={p.form} />} />
          ))}
        </div>
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
