import { useEffect, useState } from 'react';
import { clubFixtures, leagueTable } from '../../game/competitions';
import { fmtShort } from '../../game/dates';
import { leagueOf, squadOf } from '../../game/generate';
import { avgRating, fullName, overall } from '../../game/ratings';
import { mutate, useGame } from '../../store';
import { useUI } from '../context';
import { Card, FixtureRow, PlayerRow } from '../components/common';
import { Crest } from '../components/Crest';
import { luminance } from '../theme';
import { SquadList } from './Squad';
import { ClubBadgeButton } from '../components/BadgesSheet';

export function Competitions() {
  const g = useGame();
  const ui = useUI();
  const club = g.clubs[g.userClubId];
  const myLeague = leagueOf(g, club.id);
  const [comp, setComp] = useState<string>(ui.param === 'fixtures' ? 'MY' : myLeague.id);
  const [tab, setTab] = useState<'table' | 'fixtures' | 'scorers'>('table');
  const league = g.leagues.find((l) => l.id === comp);
  const cup = g.cups.find((c) => c.id === comp);

  return (
    <div>
      <div className="page-title">
        <div className="kicker">World of football</div>
        <h1>Competitions</h1>
      </div>
      <div className="field" style={{ marginBottom: 12 }}>
        <select className="input" value={comp} onChange={(e) => { setComp(e.target.value); setTab('table'); }}>
          <option value="MY">📅 My fixtures</option>
          <optgroup label="Leagues">
            {g.leagues.map((l) => <option key={l.id} value={l.id}>{l.name}{l.id === myLeague.id ? ' (yours)' : ''}</option>)}
          </optgroup>
          <optgroup label="Cups">
            {g.cups.map((c) => <option key={c.id} value={c.id}>🏆 {c.name}</option>)}
          </optgroup>
        </select>
      </div>

      {comp === 'MY' && (
        <Card title="All fixtures" tag={club.short} tagColor="var(--sky)">
          {clubFixtures(g, club.id).map((f) => <FixtureRow key={f.id} g={g} f={f} />)}
        </Card>
      )}

      {league && (
        <>
          <div className="seg" style={{ marginBottom: 12 }}>
            {(['table', 'fixtures', 'scorers'] as const).map((t) => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t === 'table' ? 'Table' : t === 'fixtures' ? 'Fixtures' : 'Players'}</button>)}
          </div>
          {tab === 'table' && <LeagueTableCard leagueId={league.id} />}
          {tab === 'fixtures' && <LeagueFixtures leagueId={league.id} />}
          {tab === 'scorers' && <Scorers clubIds={league.clubIds} />}
        </>
      )}

      {cup && (
        <>
          {cup.winner !== null && (
            <div className="card" style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.22), var(--surface))', borderColor: 'rgba(251,191,36,0.35)' }}>
              <div className="row"><span style={{ fontSize: 34 }}>🏆</span><Crest club={g.clubs[cup.winner]} size={46} /><div><div className="small bold">{cup.name} winners</div><h2 style={{ fontSize: 22 }}>{g.clubs[cup.winner].name}</h2></div></div>
            </div>
          )}
          {cup.rounds.map((r, i) => {
            const fx = g.fixtures.filter((f) => f.comp === cup.id && f.round === i + 1);
            const mine = fx.filter((f) => f.home === club.id || f.away === club.id);
            const rest = fx.filter((f) => !mine.includes(f));
            return (
              <Card key={i} title={r.name} tag={fmtShort(r.date)} tagColor="var(--muted)">
                {mine.map((f) => <FixtureRow key={f.id} g={g} f={f} showComp={false} />)}
                {rest.slice(0, 16).map((f) => <FixtureRow key={f.id} g={g} f={f} showComp={false} />)}
                {rest.length > 16 && <div className="small muted">+{rest.length - 16} more ties</div>}
                {!fx.length && <div className="muted small">{i < cup.current ? 'Completed' : 'Draw not made yet'}</div>}
              </Card>
            );
          })}
        </>
      )}
    </div>
  );
}

export function LeagueTableCard({ leagueId }: { leagueId: string }) {
  const g = useGame();
  const ui = useUI();
  const league = g.leagues.find((l) => l.id === leagueId)!;
  const table = leagueTable(g, league);
  const n = table.length;
  const higher = g.leagues.find((l) => l.country === league.country && l.tier === league.tier - 1);
  return (
    <Card title={league.name} tag={league.short} tagColor={league.color}>
      <table className="t">
        <thead><tr><th>#</th><th>Club</th><th className="r">P</th><th className="r">W-D-L</th><th className="r">GD</th><th className="r">Pts</th></tr></thead>
        <tbody>
          {table.map((r, i) => {
            const zone = league.tier === 1 ? (i < 4 ? 'zone-up' : league.down && i >= n - league.down ? 'zone-down' : '') : (higher && i < league.up ? 'zone-up' : league.down > 0 && i >= n - league.down ? 'zone-down' : '');
            const c = g.clubs[r.clubId];
            return (
              <tr key={r.clubId} className={`click ${zone} ${r.clubId === g.userClubId ? 'me' : ''}`} onClick={() => ui.go('club', r.clubId)}>
                <td className="num bold">{i + 1}</td>
                <td><span className="row" style={{ gap: 6 }}><Crest club={c} size={18} /><span className="ellipsis" style={{ maxWidth: 120 }}>{c.name}</span></span></td>
                <td className="r num">{r.p}</td>
                <td className="r num small">{r.w}-{r.d}-{r.l}</td>
                <td className="r num">{r.gf - r.ga > 0 ? '+' : ''}{r.gf - r.ga}</td>
                <td className="r num bold">{r.pts}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="row small muted" style={{ marginTop: 10, gap: 12 }}>
        <span><span className="comp-dot" style={{ background: 'var(--grass)' }} /> {league.tier === 1 ? 'Champions League' : 'Promotion'}</span>
        {league.down > 0 && <span><span className="comp-dot" style={{ background: 'var(--coral)' }} /> Relegation</span>}
      </div>
    </Card>
  );
}

function LeagueFixtures({ leagueId }: { leagueId: string }) {
  const g = useGame();
  const fx = g.fixtures.filter((f) => f.comp === leagueId);
  const rounds = Math.max(1, ...fx.map((f) => f.round));
  const current = fx.find((f) => !f.result)?.round ?? rounds;
  const [round, setRound] = useState(current);
  return (
    <Card>
      <div className="row" style={{ marginBottom: 8 }}>
        <button className="btn sm" disabled={round <= 1} onClick={() => setRound(round - 1)}>◀</button>
        <b style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--display)', fontSize: 17 }}>Matchday {round}</b>
        <button className="btn sm" disabled={round >= rounds} onClick={() => setRound(round + 1)}>▶</button>
      </div>
      {fx.filter((f) => f.round === round).map((f) => <FixtureRow key={f.id} g={g} f={f} showComp={false} />)}
    </Card>
  );
}

function Scorers({ clubIds }: { clubIds: number[] }) {
  const g = useGame();
  const [kind, setKind] = useState<'goals' | 'assists' | 'rating'>('goals');
  const set = new Set(clubIds);
  const players = Object.values(g.players).filter((p) => p.clubId !== null && set.has(p.clubId) && p.stats.apps > 0);
  const rows = kind === 'goals'
    ? [...players].sort((a, b) => b.stats.goals - a.stats.goals || a.stats.apps - b.stats.apps)
    : kind === 'assists' ? [...players].sort((a, b) => b.stats.assists - a.stats.assists)
    : [...players].filter((p) => p.stats.apps >= 5).sort((a, b) => avgRating(b) - avgRating(a));
  return (
    <>
      <div className="tabs">
        <button className={`tab ${kind === 'goals' ? 'active' : ''}`} onClick={() => setKind('goals')}>⚽ Goals</button>
        <button className={`tab ${kind === 'assists' ? 'active' : ''}`} onClick={() => setKind('assists')}>🅰️ Assists</button>
        <button className={`tab ${kind === 'rating' ? 'active' : ''}`} onClick={() => setKind('rating')}>⭐ Avg rating</button>
      </div>
      <Card>
        <div className="list">
          {rows.slice(0, 20).map((p) => (
            <PlayerRow key={p.id} p={p} me={p.clubId === g.userClubId} sub={`${g.clubs[p.clubId!].name} · ${p.stats.apps} apps`} end={kind === 'goals' ? p.stats.goals : kind === 'assists' ? p.stats.assists : avgRating(p).toFixed(2)} />
          ))}
          {!rows.length && <div className="empty">No matches played yet.</div>}
        </div>
      </Card>
    </>
  );
}

export function ClubView() {
  const g = useGame();
  const ui = useUI();
  const id = Number(ui.param);
  const club = g.clubs[id];
  const [tab, setTab] = useState<'squad' | 'fixtures'>('squad');
  if (!club) return <div className="empty">Club not found.</div>;
  const league = leagueOf(g, id);
  const squad = squadOf(g, id);
  const best = [...squad].sort((a, b) => overall(b) - overall(a))[0];
  return (
    <div>
      <div className="hero" style={{ '--team': luminance(club.colors[0]) > 0.85 ? club.colors[1] : club.colors[0], '--team-2': club.colors[1] } as React.CSSProperties}>
        <div className="top">
          <Crest club={club} size={64} />
          <div style={{ minWidth: 0 }}><h1>{club.name}</h1></div>
        </div>
        <div className="pills">
          <span className="pill">{league.name}</span>
          <span className="pill">🏟️ {club.stadium}</span>
          <span className="pill">⭐ Rep {club.reputation}</span>
          <span className="pill">🏆 {club.trophies.length}</span>
          {best && <span className="pill">Star: {fullName(best)} ({overall(best)})</span>}
        </div>
        <div style={{ marginTop: 12 }}><ClubBadgeButton club={club} /></div>
      </div>
      <div className="seg" style={{ marginBottom: 12 }}>
        <button className={tab === 'squad' ? 'on' : ''} onClick={() => setTab('squad')}>Squad ({squad.length})</button>
        <button className={tab === 'fixtures' ? 'on' : ''} onClick={() => setTab('fixtures')}>Fixtures</button>
      </div>
      {tab === 'squad' ? <SquadList g={g} players={squad} own={id === g.userClubId} /> : <Card>{clubFixtures(g, id).map((f) => <FixtureRow key={f.id} g={g} f={f} />)}</Card>}
    </div>
  );
}

const ICON: Record<string, string> = { info: 'ℹ️', offer: '💰', board: '💼', transfer: '🔁', injury: '🩹', development: '📈', youth: '🌱', match: '⚽', season: '🏆' };

export function Inbox() {
  const g = useGame();
  const ui = useUI();
  const [sel, setSel] = useState<number | null>(typeof ui.param === 'number' ? ui.param : null);
  const msg = g.inbox.find((m) => m.id === sel);
  useEffect(() => {
    if (msg && !msg.read) mutate(() => { msg.read = true; });
  }, [msg]);

  if (msg) {
    return (
      <div>
        <button className="btn sm" style={{ marginBottom: 12 }} onClick={() => setSel(null)}>← Inbox</button>
        <Card>
          <div className="small muted bold">{fmtShort(msg.date)} · From {msg.from}</div>
          <h2 style={{ margin: '6px 0 12px', fontSize: 23 }}>{ICON[msg.kind]} {msg.title}</h2>
          <div className="msg-body">{msg.body}</div>
          {msg.offerId && <button className="btn primary block" style={{ marginTop: 16 }} onClick={() => ui.go('transfers')}>Go to Transfers →</button>}
          {msg.kind === 'youth' && <button className="btn primary block" style={{ marginTop: 16 }} onClick={() => ui.go('youth')}>See youth team →</button>}
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="page-title">
        <div className="kicker">Messages</div>
        <h1>Inbox</h1>
        <div className="chips"><button className="chip" onClick={() => mutate((gg) => gg.inbox.forEach((m) => { m.read = true; }))}>Mark all read</button></div>
      </div>
      <Card style={{ paddingTop: 4, paddingBottom: 4 }}>
        <div className="list">
          {g.inbox.map((m) => (
            <div key={m.id} className="li" onClick={() => setSel(m.id)}>
              <span style={{ fontSize: 20, width: 26, textAlign: 'center' }}>{ICON[m.kind] ?? '✉️'}</span>
              <div className="main">
                <div className="t" style={{ fontWeight: m.read ? 600 : 800 }}>{!m.read && '🔵 '}{m.title}</div>
                <div className="s">{fmtShort(m.date)} · {m.from}</div>
              </div>
              <span className="muted">›</span>
            </div>
          ))}
          {!g.inbox.length && <div className="empty">No messages.</div>}
        </div>
      </Card>
    </div>
  );
}
