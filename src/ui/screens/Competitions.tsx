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
import type { Cup, Message, Player } from '../../game/types';
import { EURO_PLACES } from '../../game/data/europe';
import { europeFor, europeTable } from '../../game/europe';
import { guestLeagueName } from '../../game/guests';
import { CwcView, IntlView, NationsCard, UpcomingCard } from './WorldViews';
import { respondAction } from '../../game/actions';
import { DealStep } from '../components/TransferDeal';
import { RegistrationSheet } from '../components/RegistrationSheet';
import { YouthCompView } from './YouthViews';
import { useLandscape } from '../useLandscape';
import { winnerOf } from '../../game/match';
import { ClubBadgeButton } from '../components/BadgesSheet';

export function Competitions() {
  const g = useGame();
  const ui = useUI();
  const club = g.clubs[g.userClubId];
  const myLeague = leagueOf(g, club.id);
  const [comp, setComp] = useState<string>(ui.param === 'fixtures' ? 'MY' : typeof ui.param === 'string' && (g.cups.some((c) => c.id === ui.param) || ui.param.startsWith('YOUTH:')) ? ui.param : myLeague.id);
  const [tab, setTab] = useState<'table' | 'fixtures' | 'scorers'>('table');
  const league = g.leagues.find((l) => l.id === comp);
  const cup = g.cups.find((c) => c.id === comp);
  const intl = comp.startsWith('INTL:') ? g.intl?.find((t) => t.id === comp.slice(5)) : undefined;
  const youthComp = comp.startsWith('YOUTH:') ? g.youth?.find((c) => c.id === comp.slice(6)) : undefined;

  // One window at a time, filling the screen (no columns to swipe to)
  return (
    <div className="win-list comp-page">
      <div className="ns-bar-row">
        <select className="input" aria-label="Competition" value={comp} onChange={(e) => { setComp(e.target.value); setTab('table'); }}>
          <option value="MY">📅 My fixtures</option>
          <optgroup label="Leagues">
            {g.leagues.map((l) => <option key={l.id} value={l.id}>{l.name}{l.id === myLeague.id ? ' (yours)' : ''}</option>)}
          </optgroup>
          <optgroup label="Europe">
            {g.cups.filter((c) => c.type === 'continental').map((c) => <option key={c.id} value={c.id}>⭐ {c.name}{europeFor(g, club.id).includes(c) ? ' (yours)' : ''}</option>)}
          </optgroup>
          {(g.cups.some((c) => c.type === 'world') || (g.intl ?? []).length > 0) && (
            <optgroup label="World">
              {g.cups.filter((c) => c.type === 'world').map((c) => <option key={c.id} value={c.id}>🌍 {c.name} {c.rounds[0]?.date.slice(0, 4)}</option>)}
              {[...(g.intl ?? [])].reverse().map((t) => <option key={t.id} value={`INTL:${t.id}`}>🌍 {t.name}</option>)}
            </optgroup>
          )}
          {(g.youth ?? []).length > 0 && (
            <optgroup label="Youth">
              {g.youth!.map((c) => <option key={c.id} value={`YOUTH:${c.id}`}>🌱 {c.name}{c.clubs.includes(club.id) ? ' (yours)' : ''}</option>)}
            </optgroup>
          )}
          <optgroup label="Domestic cups">
            {g.cups.filter((c) => c.type === 'domestic').map((c) => <option key={c.id} value={c.id}>🏆 {c.name}</option>)}
          </optgroup>
        </select>
      </div>

      {comp === 'MY' && (
        <Card title="All fixtures" tag={club.short} tagColor="var(--sky)">
          <div className="list">{clubFixtures(g, club.id).map((f) => <FixtureRow key={f.id} g={g} f={f} />)}</div>
        </Card>
      )}

      {league && (
        <>
          <div className="seg" style={{ flex: 'none' }}>
            {(['table', 'fixtures', 'scorers'] as const).map((t) => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t === 'table' ? 'Table' : t === 'fixtures' ? 'Fixtures' : 'Players'}</button>)}
          </div>
          {tab === 'table' && <LeagueTableCard leagueId={league.id} />}
          {tab === 'fixtures' && <LeagueFixtures leagueId={league.id} />}
          {tab === 'scorers' && <Scorers clubIds={league.clubIds} />}
        </>
      )}

      {cup && cup.lp !== undefined && <EuropeView key={cup.id} cup={cup} />}
      {cup && cup.type === 'world' && <CwcView key={cup.id} cup={cup} />}
      {intl && <IntlView key={intl.id} t={intl} />}
      {youthComp && <YouthCompView key={youthComp.id} comp={youthComp} />}
      {(comp === 'MY' || intl) && <UpcomingCard />}
      {(comp === 'MY' || intl) && <NationsCard />}

      {cup && cup.lp === undefined && cup.type !== 'world' && (
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
  const places = league.tier === 1 ? EURO_PLACES[league.country] : undefined;
  const euroZone = (i: number) => !places ? '' : i < places.UCL ? 'zone-ucl' : i < places.UCL + places.UEL ? 'zone-uel' : i < places.UCL + places.UEL + places.UECL ? 'zone-uecl' : '';
  return (
    <Card title={league.name} tag={league.short} tagColor={league.color}>
      <table className="t">
        <thead><tr><th>#</th><th>Club</th><th className="r">P</th><th className="r">W-D-L</th><th className="r">GD</th><th className="r">Pts</th></tr></thead>
        <tbody>
          {table.map((r, i) => {
            const zone = league.down > 0 && i >= n - league.down ? 'zone-down' : places ? euroZone(i) : higher && i < league.up ? 'zone-up' : '';
            const c = g.clubs[r.clubId];
            return (
              <tr key={r.clubId} className={`click ${zone} ${r.clubId === g.userClubId ? 'me' : ''}`} onClick={() => ui.go('club', r.clubId)}>
                <td className="num bold">{i + 1}</td>
                <td><span className="row" style={{ gap: 6 }}><Crest club={c} size={18} /><span className="ellipsis" style={{ maxWidth: 120 }}>{c.name}</span></span></td>
                <td className="r num">{r.p}</td>
                <td className="r num small">{r.w}-{r.d}-{r.l}</td>
                <td className="r num">{r.gf - r.ga > 0 ? '+' : ''}{r.gf - r.ga}</td>
                <td className="r num bold">{r.pts}{r.ded ? <span className="ded" title={`${r.ded} points deducted`}> −{r.ded}</span> : null}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="row wrap small muted" style={{ marginTop: 10, gap: 12 }}>
        {places ? (
          <>
            <span><span className="comp-dot" style={{ background: 'var(--sky)' }} /> Champions League</span>
            <span><span className="comp-dot" style={{ background: 'var(--orange)' }} /> Europa League</span>
            <span><span className="comp-dot" style={{ background: 'var(--grass)' }} /> Conference League</span>
          </>
        ) : higher && <span><span className="comp-dot" style={{ background: 'var(--grass)' }} /> Promotion</span>}
        {league.down > 0 && <span><span className="comp-dot" style={{ background: 'var(--coral)' }} /> Relegation</span>}
      </div>
    </Card>
  );
}

function EuropeView({ cup }: { cup: Cup }) {
  const g = useGame();
  const ui = useUI();
  const me = g.userClubId;
  const lp = cup.lp!;
  const [tab, setTab] = useState<'table' | 'matches' | 'ko'>(cup.current >= lp ? 'ko' : 'table');
  const fx = g.fixtures.filter((f) => f.comp === cup.id);
  const firstOpen = fx.find((f) => f.round <= lp && !f.result)?.round ?? lp;
  const [round, setRound] = useState(Math.min(lp, Math.max(1, firstOpen)));
  const table = europeTable(g, cup);
  const inIt = (cup.teams ?? []).includes(me);
  return (
    <>
      {cup.winner !== null && (
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.22), var(--surface))', borderColor: 'rgba(251,191,36,0.35)' }}>
          <div className="row"><span style={{ fontSize: 34 }}>🏆</span><Crest club={g.clubs[cup.winner]} size={46} /><div><div className="small bold">{cup.name} winners</div><h2 style={{ fontSize: 22 }}>{g.clubs[cup.winner].name}</h2></div></div>
        </div>
      )}
      <div className="small muted" style={{ marginBottom: 10 }}>
        36 clubs, {lp} league-phase games each. Top 8 go to the round of 16, 9th–24th play two-legged knockout play-offs.{inIt ? '' : ` ${g.clubs[me].name} aren't in it this season.`}
      </div>
      <div className="seg" style={{ marginBottom: 12 }}>
        <button className={tab === 'table' ? 'on' : ''} onClick={() => setTab('table')}>League phase</button>
        <button className={tab === 'matches' ? 'on' : ''} onClick={() => setTab('matches')}>Matches</button>
        <button className={tab === 'ko' ? 'on' : ''} onClick={() => setTab('ko')}>Knockouts</button>
      </div>
      {tab === 'table' && (
        <Card title={cup.name} tag={cup.short} tagColor={cup.color}>
          <table className="t">
            <thead><tr><th>#</th><th>Club</th><th className="r">P</th><th className="r">W-D-L</th><th className="r">GD</th><th className="r">Pts</th></tr></thead>
            <tbody>
              {table.map((r, i) => {
                const c = g.clubs[r.clubId];
                const zone = i < 8 ? 'zone-up' : i < 24 ? 'zone-po' : 'zone-down';
                return (
                  <tr key={r.clubId} className={`click ${zone} ${r.clubId === me ? 'me' : ''}`} onClick={() => ui.go('club', r.clubId)}>
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
          <div className="row wrap small muted" style={{ marginTop: 10, gap: 12 }}>
            <span><span className="comp-dot" style={{ background: 'var(--grass)' }} /> Round of 16</span>
            <span><span className="comp-dot" style={{ background: 'var(--yellow)' }} /> Play-offs</span>
            <span><span className="comp-dot" style={{ background: 'var(--coral)' }} /> Eliminated</span>
          </div>
        </Card>
      )}
      {tab === 'matches' && (
        <Card>
          <div className="row" style={{ marginBottom: 8 }}>
            <button className="btn sm" disabled={round <= 1} onClick={() => setRound(round - 1)}>◀</button>
            <b style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--display)', fontSize: 17 }}>Matchday {round}</b>
            <button className="btn sm" disabled={round >= lp} onClick={() => setRound(round + 1)}>▶</button>
          </div>
          {[...fx.filter((f) => f.round === round)].sort((a, b) => Number(b.home === me || b.away === me) - Number(a.home === me || a.away === me)).map((f) => <FixtureRow key={f.id} g={g} f={f} showComp={false} />)}
        </Card>
      )}
      {tab === 'ko' && cup.rounds.slice(lp).map((r, i) => {
        const rf = fx.filter((f) => f.round === lp + i + 1);
        const ties = [...new Set(rf.map((f) => f.tie ?? f.id))].map((t) => rf.filter((f) => (f.tie ?? f.id) === t).sort((a, b) => (a.date < b.date ? -1 : 1)));
        ties.sort((a, b) => Number(b.some((f) => f.home === me || f.away === me)) - Number(a.some((f) => f.home === me || f.away === me)));
        return (
          <Card key={r.name} title={r.name} tag={fmtShort(r.date)} tagColor="var(--muted)">
            {ties.map((legs) => {
              const last = legs[legs.length - 1];
              const w = winnerOf(last);
              return (
                <div key={last.id} className="tie">
                  {legs.map((f) => <FixtureRow key={f.id} g={g} f={f} showComp={false} />)}
                  {w !== null && <div className="through">{g.clubs[w].name} {r.name === 'Final' ? 'win the trophy' : 'go through'}{last.result?.pens ? ' on penalties' : ''}</div>}
                </div>
              );
            })}
            {!rf.length && <div className="muted small">{cup.current < lp ? 'Decided by the league phase' : 'Draw after the previous round'}</div>}
          </Card>
        );
      })}
    </>
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

type Board = { id: string; label: string; value: (p: Player) => number; show: (p: Player) => string; min?: (p: Player) => boolean };
const BOARDS: Board[] = [
  { id: 'goals', label: 'Goals', value: (p) => p.stats.goals, show: (p) => String(p.stats.goals) },
  { id: 'assists', label: 'Assists', value: (p) => p.stats.assists, show: (p) => String(p.stats.assists) },
  { id: 'rating', label: 'Avg rating', value: (p) => avgRating(p), show: (p) => avgRating(p).toFixed(2), min: (p) => p.stats.apps >= 5 },
  { id: 'xg', label: 'xG', value: (p) => p.stats.xg, show: (p) => p.stats.xg.toFixed(1) },
  { id: 'shots', label: 'Shots', value: (p) => p.stats.shots, show: (p) => String(p.stats.shots) },
  { id: 'kp', label: 'Key passes', value: (p) => p.stats.kp, show: (p) => String(p.stats.kp) },
  { id: 'xa', label: 'xA', value: (p) => p.stats.xa, show: (p) => p.stats.xa.toFixed(1) },
  { id: 'pass', label: 'Pass %', value: (p) => p.stats.passC / Math.max(1, p.stats.passes), show: (p) => `${Math.round((p.stats.passC / Math.max(1, p.stats.passes)) * 100)}%`, min: (p) => p.stats.mins >= 450 },
  { id: 'drb', label: 'Dribbles', value: (p) => p.stats.drb, show: (p) => String(p.stats.drb) },
  { id: 'tkl', label: 'Tackles', value: (p) => p.stats.tkl, show: (p) => String(p.stats.tkl) },
  { id: 'int', label: 'Interceptions', value: (p) => p.stats.int, show: (p) => String(p.stats.int) },
  { id: 'cs', label: 'Clean sheets', value: (p) => p.stats.cleanSheets, show: (p) => String(p.stats.cleanSheets), min: (p) => p.pos === 'GK' },
  { id: 'saves', label: 'Saves', value: (p) => p.stats.saves, show: (p) => String(p.stats.saves), min: (p) => p.pos === 'GK' },
  { id: 'cards', label: 'Cards', value: (p) => p.stats.yellows + p.stats.reds * 3, show: (p) => `${p.stats.yellows}🟨 ${p.stats.reds}🟥` },
];

function Scorers({ clubIds }: { clubIds: number[] }) {
  const g = useGame();
  const [kind, setKind] = useState('goals');
  const set = new Set(clubIds);
  const board = BOARDS.find((b) => b.id === kind)!;
  const players = Object.values(g.players).filter((p) => p.clubId !== null && set.has(p.clubId) && p.stats.apps > 0 && (!board.min || board.min(p)));
  const rows = [...players].sort((a, b) => board.value(b) - board.value(a) || a.stats.mins - b.stats.mins);
  return (
    <>
      <div className="tabs">
        {BOARDS.map((b) => <button key={b.id} className={`tab ${kind === b.id ? 'active' : ''}`} onClick={() => setKind(b.id)}>{b.label}</button>)}
      </div>
      <Card>
        <div className="list">
          {rows.slice(0, 20).map((p, i) => (
            <PlayerRow key={p.id} p={p} me={p.clubId === g.userClubId} sub={`${i + 1}. ${g.clubs[p.clubId!].name} · ${p.stats.apps} apps`} end={board.show(p)} />
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
          <span className="pill">{league?.name ?? guestLeagueName(club.leagueId)}</span>
          {europeFor(g, id).map((c) => <span key={c.id} className="pill">⭐ {c.name}</span>)}
          <span className="pill">🏟️ {club.stadium}</span>
          <span className="pill">⭐ Rep {club.reputation}</span>
          <span className="pill">🏆 {club.trophies.length}</span>
          {best && <span className="pill">Star: {fullName(best)}{g.era === 'cm0102' && id !== g.userClubId ? '' : ` (${overall(best)})`}</span>}
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

const ICON: Record<string, string> = { info: 'ℹ️', offer: '💰', board: '💼', transfer: '🔁', injury: '🩹', development: '📈', youth: '🌱', match: '⚽', season: '🏆', news: '📰', training: '🏋️', preview: '🔭', report: '📋', award: '🏅' };

type InboxFilter = 'all' | 'news' | 'matches' | 'squad' | 'club';
const FILTERS: [InboxFilter, string, Message['kind'][] | null][] = [
  ['all', 'All', null],
  ['news', 'News', ['news', 'award', 'season']],
  ['matches', 'Matches', ['preview', 'report', 'match']],
  ['squad', 'Squad', ['training', 'injury', 'development', 'youth']],
  ['club', 'Club', ['board', 'transfer', 'offer', 'info']],
];
const isBreaking = (m: Message) => m.kind === 'news' && m.title.startsWith('🚨');

export function Inbox() {
  const g = useGame();
  const ui = useUI();
  const [sel, setSel] = useState<number | null>(typeof ui.param === 'number' ? ui.param : null);
  const [filter, setFilter] = useState<InboxFilter>('all');
  const msg = g.inbox.find((m) => m.id === sel);
  const kinds = FILTERS.find((f) => f[0] === filter)![2];
  const open = g.inbox.filter((m) => m.action?.status === 'open');
  const shown = [...open, ...(kinds ? g.inbox.filter((m) => kinds.includes(m.kind)) : g.inbox).filter((m) => m.action?.status !== 'open')];
  const [regScope, setRegScope] = useState<'league' | 'europe' | null>(null);
  useEffect(() => { if (typeof ui.param === 'number') setSel(ui.param); }, [ui.param]);
  useEffect(() => {
    if (msg && !msg.read) mutate(() => { msg.read = true; });
  }, [msg]);

  const landscape = useLandscape();
  const detail = msg && (
      <div>
        {!landscape && <button className="btn sm" style={{ marginBottom: 12 }} onClick={() => setSel(null)}>← Inbox</button>}
        <Card style={isBreaking(msg) ? { borderColor: 'rgba(251,113,133,0.5)', background: 'linear-gradient(135deg, rgba(251,113,133,0.16), var(--surface))' } : undefined}>
          {isBreaking(msg) && <div className="breaking">BREAKING NEWS</div>}
          <div className="small muted bold">{fmtShort(msg.date)} · From {msg.from}</div>
          <h2 style={{ margin: '6px 0 12px', fontSize: 23 }}>{isBreaking(msg) ? '' : `${ICON[msg.kind]} `}{msg.title}</h2>
          <div className="msg-body">{msg.body}</div>
          {msg.action && (
            <div className={`action-box ${msg.action.status}`}>
              {msg.action.status === 'open' ? (
                <>
                  <div className="action-tag">ACTION REQUIRED</div>
                  <div className="col" style={{ gap: 8 }}>
                    {msg.action.options.map((o) => (
                      <button key={o.id} className={`btn block ${o.id === msg.action!.options[0].id ? 'primary' : ''}`} onClick={() => {
                        const r = mutate((gg) => respondAction(gg, msg.id, o.id));
                        if (r.msg === 'pick') setRegScope(msg.action!.scope!);
                        else ui.toast(r.msg);
                      }}>{o.label}</button>
                    ))}
                  </div>
                </>
              ) : (
                <div><b>✓ Done.</b> {msg.action.result}</div>
              )}
            </div>
          )}
          {regScope && <RegistrationSheet scope={regScope} onClose={() => setRegScope(null)} />}
          {msg.offerId && !msg.action && (() => {
            const o = g.offers.find((x) => x.id === msg.offerId);
            if (!o || o.from !== g.userClubId) return <button className="btn primary block" style={{ marginTop: 16 }} onClick={() => ui.go('transfers')}>Go to Transfers →</button>;
            // Your own deal, CM-style: the newest mail about it carries the next step (contract, answer, confirm)
            const latest = [...g.inbox].filter((m) => m.offerId === o.id).sort((a, b) => b.id - a.id)[0];
            return (
              <div style={{ marginTop: 16 }} className="col">
                {latest?.id === msg.id && <DealStep g={g} o={o} />}
                <button className="btn block" onClick={() => ui.openPlayer(o.playerId)}>View player</button>
              </div>
            );
          })()}
          {msg.kind === 'youth' && <button className="btn primary block" style={{ marginTop: 16 }} onClick={() => ui.go('youth')}>See youth team →</button>}
        </Card>
      </div>
  );
  if (detail && !landscape) return detail;

  const list = (
    <div>
      <div className="page-title">
        <div className="kicker">Messages</div>
        <h1>Inbox</h1>
        <div className="chips"><button className="chip" onClick={() => mutate((gg) => gg.inbox.forEach((m) => { m.read = true; }))}>Mark all read</button></div>
      </div>
      <div className="tabs" style={{ marginBottom: 10 }}>
        {FILTERS.map(([id, label, ks]) => {
          const n = (ks ? g.inbox.filter((m) => ks.includes(m.kind)) : g.inbox).filter((m) => !m.read).length;
          return <button key={id} className={`tab ${filter === id ? 'active' : ''}`} onClick={() => setFilter(id)}>{label}{n > 0 ? ` (${n})` : ''}</button>;
        })}
      </div>
      <Card style={{ paddingTop: 4, paddingBottom: 4 }}>
        <div className="list">
          {shown.map((m) => (
            <div key={m.id} className={`li ${isBreaking(m) ? 'breaking-row' : ''} ${m.id === sel ? 'sel' : ''}`} onClick={() => setSel(m.id)}>
              <span style={{ fontSize: 20, width: 26, textAlign: 'center' }}>{isBreaking(m) ? '🚨' : ICON[m.kind] ?? '✉️'}</span>
              <div className="main">
                <div className="t" style={{ fontWeight: m.read ? 600 : 800 }}>{m.action?.status === 'open' ? <span className="action-pill">RESPOND</span> : !m.read && '🔵 '}{isBreaking(m) ? m.title.replace('🚨 ', '') : m.title}</div>
                <div className="s">{fmtShort(m.date)} · {m.from}</div>
              </div>
              <span className="muted">›</span>
            </div>
          ))}
          {!shown.length && <div className="empty">No messages.</div>}
        </div>
      </Card>
    </div>
  );
  if (!landscape) return list;
  // Landscape: list on the left, the open message on the right
  return (
    <div className="inbox-split">
      <div className="inbox-list">{list}</div>
      <div className="inbox-detail">{detail ?? <div className="empty" style={{ marginTop: 80 }}>Select a message to read it.</div>}</div>
    </div>
  );
}
