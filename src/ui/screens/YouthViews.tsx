import { useState } from 'react';
import { fmtShort } from '../../game/dates';
import { youthTable, youthWinner } from '../../game/youth';
import type { GameState, YouthComp, YouthFixture } from '../../game/types';
import { useGame } from '../../store';
import { useUI } from '../context';
import { Card } from '../components/common';
import { Crest } from '../components/Crest';

export function YouthFixtureRow({ g, f, comp }: { g: GameState; f: YouthFixture; comp?: YouthComp }) {
  const ui = useUI();
  const me = g.userClubId;
  const h = g.clubs[f.h];
  const a = g.clubs[f.a];
  const played = f.hg !== undefined;
  const w = youthWinner(f);
  let res: 'W' | 'D' | 'L' | null = null;
  if (played && (f.h === me || f.a === me)) res = w === null ? 'D' : w === me ? 'W' : 'L';
  return (
    <div className="fx">
      <div className="when">
        {fmtShort(f.d)}
        {comp && <div className="row" style={{ gap: 4, marginTop: 2 }}><span className="comp-dot" style={{ background: comp.color }} /><span>{comp.short}</span></div>}
      </div>
      <div className={`h ${f.h === me ? 'me' : ''}`} onClick={() => ui.go('club', h.id)} style={{ cursor: 'pointer' }}><span title={h.name}>{h.name.length > 13 ? h.short : h.name}</span><Crest club={h} size={20} /></div>
      <div className={`score ${played ? '' : 'tbd'}`}>{played ? `${f.hg} - ${f.ag}` : 'v'}{f.p && <span className="agg">{f.p[0]}-{f.p[1]} pens</span>}</div>
      <div className={`a ${f.a === me ? 'me' : ''}`} onClick={() => ui.go('club', a.id)} style={{ cursor: 'pointer' }}><Crest club={a} size={20} /><span title={a.name}>{a.name.length > 13 ? a.short : a.name}</span></div>
      <div>{res && <span className={`res ${res}`}>{res}</span>}</div>
    </div>
  );
}

export function YouthTableCard({ comp, highlight, around }: { comp: YouthComp; highlight?: number; around?: boolean }) {
  const g = useGame();
  const ui = useUI();
  const rows = youthTable(comp, g);
  const idx = rows.findIndex((r) => r.clubId === highlight);
  const lo = around && idx >= 0 ? Math.max(0, Math.min(rows.length - 5, idx - 2)) : 0;
  const shown = around ? rows.slice(lo, lo + 5) : rows;
  return (
    <table className="t">
      <thead><tr><th>#</th><th>Club</th><th className="r">P</th><th className="r">GD</th><th className="r">Pts</th></tr></thead>
      <tbody>
        {shown.map((r) => {
          const i = rows.indexOf(r);
          const zone = comp.kind === 'uyl' ? (i < 16 ? 'zone-up' : 'zone-down') : i === 0 ? 'zone-up' : '';
          return (
            <tr key={r.clubId} className={`click ${zone} ${r.clubId === highlight ? 'me' : ''}`} onClick={() => ui.go('club', r.clubId)}>
              <td className="num bold">{i + 1}</td>
              <td><span className="row" style={{ gap: 6 }}><Crest club={g.clubs[r.clubId]} size={18} /><span className="ellipsis" style={{ maxWidth: 150 }}>{g.clubs[r.clubId].name}</span></span></td>
              <td className="r num">{r.p}</td>
              <td className="r num">{r.gf - r.ga > 0 ? '+' : ''}{r.gf - r.ga}</td>
              <td className="r num bold">{r.pts}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** A youth competition in the Competitions screen. */
export function YouthCompView({ comp }: { comp: YouthComp }) {
  const g = useGame();
  const me = g.userClubId;
  const leagueRounds = comp.kind === 'league' ? comp.rounds.length : comp.kind === 'uyl' ? comp.lp! : 0;
  const [tab, setTab] = useState<'table' | 'matches' | 'ko'>(comp.kind === 'cup' || (comp.kind === 'uyl' && comp.current >= comp.lp!) ? 'ko' : 'table');
  const firstOpen = comp.fixtures.find((f) => f.r <= leagueRounds && f.hg === undefined)?.r ?? leagueRounds;
  const [round, setRound] = useState(Math.max(1, firstOpen));
  const mineFirst = (a: YouthFixture, b: YouthFixture) => Number(b.h === me || b.a === me) - Number(a.h === me || a.a === me);
  return (
    <>
      {comp.winner !== null && (
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.22), var(--surface))', borderColor: 'rgba(251,191,36,0.35)' }}>
          <div className="row"><span style={{ fontSize: 34 }}>🏆</span><Crest club={g.clubs[comp.winner]} size={46} /><div><div className="small bold">{comp.name} winners</div><h2 style={{ fontSize: 22 }}>{g.clubs[comp.winner].name}</h2></div></div>
        </div>
      )}
      <div className="small muted" style={{ marginBottom: 10 }}>
        U{comp.age} · {comp.clubs.length} clubs. Fringe first-team players under the age limit play too.
        {comp.kind === 'uyl' && ' The Champions League clubs\' youth teams: 6 league-phase games, top 16 into the knockouts.'}
      </div>
      {comp.kind !== 'cup' && (
        <div className="seg" style={{ marginBottom: 12 }}>
          <button className={tab === 'table' ? 'on' : ''} onClick={() => setTab('table')}>Table</button>
          <button className={tab === 'matches' ? 'on' : ''} onClick={() => setTab('matches')}>Matches</button>
          {comp.kind === 'uyl' && <button className={tab === 'ko' ? 'on' : ''} onClick={() => setTab('ko')}>Knockouts</button>}
        </div>
      )}
      {tab === 'table' && comp.kind !== 'cup' && <Card title={comp.name} tag={comp.short} tagColor={comp.color}><YouthTableCard comp={comp} highlight={me} /></Card>}
      {tab === 'matches' && (
        <Card>
          <div className="row" style={{ marginBottom: 8 }}>
            <button className="btn sm" disabled={round <= 1} onClick={() => setRound(round - 1)}>◀</button>
            <b style={{ flex: 1, textAlign: 'center', fontSize: 17 }}>Matchday {round}</b>
            <button className="btn sm" disabled={round >= leagueRounds} onClick={() => setRound(round + 1)}>▶</button>
          </div>
          {comp.fixtures.filter((f) => f.r === round).sort(mineFirst).map((f) => <YouthFixtureRow key={f.id} g={g} f={f} />)}
        </Card>
      )}
      {tab === 'ko' && comp.rounds.slice(leagueRounds).map((r, i) => {
        const fx = comp.fixtures.filter((f) => f.r === leagueRounds + i + 1).sort(mineFirst);
        return (
          <Card key={r.name} title={r.name} tag={fmtShort(r.date)} tagColor="var(--muted)">
            {fx.slice(0, 24).map((f) => <YouthFixtureRow key={f.id} g={g} f={f} />)}
            {fx.length > 24 && <div className="small muted">+{fx.length - 24} more ties</div>}
            {!fx.length && <div className="muted small">{comp.current < leagueRounds + i ? 'Draw after the previous round' : 'Completed'}</div>}
          </Card>
        );
      })}
    </>
  );
}
