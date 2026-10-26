import { useEffect, useState } from 'react';
import { clubFixtures, compColor, leagueTable } from '../../game/competitions';
import { leagueOf, squadOf } from '../../game/generate';
import { avgRating, fullName, overall, shortName } from '../../game/ratings';
import { mutate, useGame } from '../../store';
import { useUI } from '../context';
import { Card, ClubLink, FixtureRow } from '../components/common';
import { Crest, textOn } from '../components/Crest';
import { SquadTable } from './Squad';
import { fmtShort } from '../../game/dates';

export function Competitions() {
  const g = useGame();
  const ui = useUI();
  const club = g.clubs[g.userClubId];
  const myLeague = leagueOf(g, club.id);
  const [comp, setComp] = useState<string>(ui.param === 'fixtures' ? 'MY' : myLeague.id);
  const [tab, setTab] = useState<'table' | 'fixtures' | 'scorers'>('table');
  const league = g.leagues.find((l) => l.id === comp);
  const cup = g.cups.find((c) => c.id === comp);
  const myCups = g.cups.filter((c) => c.country === club.country || (c.type === 'continental' && g.fixtures.some((f) => f.comp === c.id && (f.home === club.id || f.away === club.id))));

  return (
    <div>
      <div className="page-title">
        <div>
          <div className="kicker">World of football</div>
          <h1>Competitions</h1>
        </div>
      </div>
      <div className="tabs">
        <button className={`tab ${comp === 'MY' ? 'active' : ''}`} onClick={() => setComp('MY')}>📅 My Fixtures</button>
        {g.leagues.map((l) => (
          <button key={l.id} className={`tab ${comp === l.id ? 'active' : ''}`} onClick={() => setComp(l.id)}>
            <span className="comp-dot" style={{ background: l.color, marginRight: 6 }} />{l.name}
          </button>
        ))}
        {g.cups.map((c) => (
          <button key={c.id} className={`tab ${comp === c.id ? 'active' : ''}`} onClick={() => setComp(c.id)}>🏆 {c.name}{myCups.includes(c) ? ' •' : ''}</button>
        ))}
      </div>

      {comp === 'MY' && (
        <Card title={`${club.name} — all fixtures`} tag="Season" tagColor="var(--sky)">
          {clubFixtures(g, club.id).map((f) => <FixtureRow key={f.id} g={g} f={f} />)}
        </Card>
      )}

      {league && (
        <>
          <div className="tabs">
            {(['table', 'fixtures', 'scorers'] as const).map((t) => <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t === 'table' ? 'Table' : t === 'fixtures' ? 'Fixtures' : 'Top Scorers'}</button>)}
          </div>
          {tab === 'table' && <LeagueTableCard leagueId={league.id} />}
          {tab === 'fixtures' && <LeagueFixtures leagueId={league.id} />}
          {tab === 'scorers' && <Scorers clubIds={league.clubIds} />}
        </>
      )}

      {cup && (
        <div className="grid g2">
          {cup.winner !== null && (
            <Card className="span2" style={{ background: 'var(--yellow)' }}>
              <div className="row"><span style={{ fontSize: 40 }}>🏆</span><Crest club={g.clubs[cup.winner]} size={56} /><div><div className="small bold">{cup.name} winners</div><h2>{g.clubs[cup.winner].name}</h2></div></div>
            </Card>
          )}
          {cup.rounds.map((r, i) => {
            const fx = g.fixtures.filter((f) => f.comp === cup.id && f.round === i + 1);
            return (
              <Card key={i} title={r.name} tag={fmtShort(r.date)} tagColor={compColor(g, cup.id) === '#111111' ? 'var(--soft)' : 'var(--paper)'}>
                {fx.length ? fx.map((f) => <FixtureRow key={f.id} g={g} f={f} showComp={false} />) : <div className="muted small">{i < cup.current ? 'Completed' : 'Draw not made yet'}</div>}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function LeagueTableCard({ leagueId }: { leagueId: string }) {
  const g = useGame();
  const league = g.leagues.find((l) => l.id === leagueId)!;
  const table = leagueTable(g, league);
  const n = table.length;
  const higher = g.leagues.find((l) => l.country === league.country && l.tier === league.tier - 1);
  return (
    <Card title={league.name} tag={league.short} tagColor={league.color}>
      <div className="table-wrap">
        <table className="t">
          <thead>
            <tr><th>#</th><th>Club</th><th className="r">P</th><th className="r">W</th><th className="r">D</th><th className="r">L</th><th className="r">GF</th><th className="r">GA</th><th className="r">GD</th><th className="r">Pts</th><th>Form</th></tr>
          </thead>
          <tbody>
            {table.map((r, i) => {
              const zone = league.tier === 1 && league.country !== 'ENG' ? (i < 4 ? 'zone-up' : '') :
                league.tier === 1 ? (i < 4 ? 'zone-up' : i >= n - league.down ? 'zone-down' : '') :
                (higher && i < league.up ? 'zone-up' : i >= n - league.down && league.down > 0 ? 'zone-down' : '');
              return (
                <tr key={r.clubId} className={`${zone} ${r.clubId === g.userClubId ? 'me' : ''}`}>
                  <td className="num bold">{i + 1}</td>
                  <td><ClubLink g={g} id={r.clubId} /></td>
                  <td className="r num">{r.p}</td>
                  <td className="r num">{r.w}</td>
                  <td className="r num">{r.d}</td>
                  <td className="r num">{r.l}</td>
                  <td className="r num">{r.gf}</td>
                  <td className="r num">{r.ga}</td>
                  <td className="r num">{r.gf - r.ga > 0 ? '+' : ''}{r.gf - r.ga}</td>
                  <td className="r num bold">{r.pts}</td>
                  <td><div className="row" style={{ gap: 3 }}>{r.form.map((f, k) => <span key={k} className={`res ${f}`} style={{ width: 18, height: 18, fontSize: 10 }}>{f}</span>)}</div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="row small muted" style={{ marginTop: 10, gap: 14 }}>
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
    <Card title={`Matchday ${round}`} right={
      <div className="row">
        <button className="btn sm" disabled={round <= 1} onClick={() => setRound(round - 1)}>◀</button>
        <select className="input" value={round} onChange={(e) => setRound(Number(e.target.value))}>{Array.from({ length: rounds }, (_, i) => <option key={i} value={i + 1}>Round {i + 1}</option>)}</select>
        <button className="btn sm" disabled={round >= rounds} onClick={() => setRound(round + 1)}>▶</button>
      </div>
    }>
      {fx.filter((f) => f.round === round).map((f) => <FixtureRow key={f.id} g={g} f={f} showComp={false} />)}
    </Card>
  );
}

function Scorers({ clubIds }: { clubIds: number[] }) {
  const g = useGame();
  const ui = useUI();
  const set = new Set(clubIds);
  const players = Object.values(g.players).filter((p) => p.clubId !== null && set.has(p.clubId) && p.stats.apps > 0);
  const scorers = [...players].sort((a, b) => b.stats.goals - a.stats.goals || a.stats.apps - b.stats.apps).slice(0, 20);
  const assisters = [...players].sort((a, b) => b.stats.assists - a.stats.assists).slice(0, 10);
  const rated = [...players].filter((p) => p.stats.apps >= 5).sort((a, b) => avgRating(b) - avgRating(a)).slice(0, 10);
  const List = ({ title, rows, val }: { title: string; rows: typeof players; val: (p: (typeof players)[number]) => string }) => (
    <Card title={title}>
      <table className="t">
        <tbody>
          {rows.map((p, i) => (
            <tr key={p.id} className="click" onClick={() => ui.openPlayer(p.id)}>
              <td className="num bold">{i + 1}</td>
              <td className="bold">{shortName(p)}</td>
              <td><ClubLink g={g} id={p.clubId!} size={18} /></td>
              <td className="r num bold">{val(p)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
  return (
    <div className="grid g3">
      <List title="⚽ Goals" rows={scorers} val={(p) => String(p.stats.goals)} />
      <List title="🅰️ Assists" rows={assisters} val={(p) => String(p.stats.assists)} />
      <List title="⭐ Avg rating (5+ apps)" rows={rated} val={(p) => avgRating(p).toFixed(2)} />
    </div>
  );
}

export function ClubView() {
  const g = useGame();
  const ui = useUI();
  const id = Number(ui.param);
  const club = g.clubs[id];
  if (!club) return <div className="empty">Club not found.</div>;
  const league = leagueOf(g, id);
  const squad = squadOf(g, id);
  const best = [...squad].sort((a, b) => overall(b) - overall(a))[0];
  const fx = clubFixtures(g, id);
  return (
    <div>
      <div className="hero" style={{ background: club.colors[0], color: textOn(club.colors[0]), gridTemplateColumns: 'auto 1fr' }}>
        <Crest club={club} size={96} />
        <div>
          <h1>{club.name}</h1>
          <div className="meta">
            <span className="pill" style={{ color: '#fff' }}>{league.name}</span>
            <span className="pill" style={{ color: '#fff' }}>🏟️ {club.stadium} ({club.capacity.toLocaleString()})</span>
            <span className="pill" style={{ color: '#fff' }}>⭐ Rep {club.reputation}</span>
            <span className="pill" style={{ color: '#fff' }}>🏆 {club.trophies.length}</span>
            {best && <span className="pill" style={{ color: '#fff' }}>Star: {fullName(best)} ({overall(best)})</span>}
          </div>
        </div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)' }}>
        <Card title="Squad" tag={`${squad.length}`}>
          <SquadTable g={g} players={squad} own={id === g.userClubId} />
        </Card>
        <Card title="Fixtures">
          {fx.slice(-12).map((f) => <FixtureRow key={f.id} g={g} f={f} />)}
        </Card>
      </div>
    </div>
  );
}

export function Inbox() {
  const g = useGame();
  const ui = useUI();
  const [sel, setSel] = useState<number | null>(typeof ui.param === 'number' ? ui.param : g.inbox[0]?.id ?? null);
  const msg = g.inbox.find((m) => m.id === sel);
  const ICON: Record<string, string> = { info: 'ℹ️', offer: '💰', board: '💼', transfer: '🔁', injury: '🩹', development: '📈', youth: '🌱', match: '⚽', season: '🏆' };
  const open = (id: number) => {
    setSel(id);
    mutate((gg) => { const m = gg.inbox.find((x) => x.id === id); if (m) m.read = true; });
  };
  useEffect(() => {
    if (msg && !msg.read) mutate(() => { msg.read = true; });
  }, [msg]);
  return (
    <div>
      <div className="page-title">
        <div><div className="kicker">Messages</div><h1>Inbox</h1></div>
        <button className="btn sm" onClick={() => mutate((gg) => gg.inbox.forEach((m) => { m.read = true; }))}>Mark all read</button>
      </div>
      <div className="inbox">
        <Card style={{ padding: 8, maxHeight: '75vh', overflowY: 'auto' }}>
          {g.inbox.map((m) => (
            <div key={m.id} className={`msg-item ${m.read ? '' : 'unread'} ${sel === m.id ? 'sel' : ''}`} onClick={() => open(m.id)}>
              <div className="ico">{ICON[m.kind] ?? '✉️'}</div>
              <div>
                <div className="tt">{m.title}</div>
                <div className="small muted">{fmtShort(m.date)} · {m.from}</div>
              </div>
            </div>
          ))}
          {!g.inbox.length && <div className="empty">No messages.</div>}
        </Card>
        <Card>
          {msg ? (
            <>
              <div className="small muted bold">{fmtShort(msg.date)} · From {msg.from}</div>
              <h2 style={{ margin: '6px 0 14px', fontSize: 26 }}>{ICON[msg.kind]} {msg.title}</h2>
              <div className="msg-body">{msg.body}</div>
              {msg.offerId && <div style={{ marginTop: 18 }}><button className="btn primary" onClick={() => ui.go('transfers')}>Go to Transfers →</button></div>}
              {msg.kind === 'youth' && <div style={{ marginTop: 18 }}><button className="btn primary" onClick={() => ui.go('youth')}>See youth team →</button></div>}
            </>
          ) : <div className="empty">Select a message.</div>}
        </Card>
      </div>
    </div>
  );
}
