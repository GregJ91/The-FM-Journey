import { useState } from 'react';
import { FORMATIONS, FORMATION_NAMES, MENTALITY, PRESSING, STYLES } from '../../game/formations';
import { squadOf } from '../../game/generate';
import { age, avgRating, familiarity, fmtMoney, marketValue, overall, ratingAt, scoutedPotential, shortName } from '../../game/ratings';
import { pickLineup, validateLineup } from '../../game/selection';
import type { Club, GameState, Player } from '../../game/types';
import { mutate, useGame } from '../../store';
import { useUI } from '../context';
import { Card, CondBar, Ovr, OvrChange, PosTag, Spark, Stars, StatusIcons, useSort } from '../components/common';
import { FormationPitch } from '../components/Pitch';

type SquadKey = 'pos' | 'name' | 'age' | 'ovr' | 'pot' | 'cond' | 'morale' | 'value' | 'contract' | 'apps' | 'goals' | 'assists' | 'rating';

const POS_ORDER = ['GK', 'DR', 'DC', 'DL', 'DM', 'MR', 'MC', 'ML', 'AMR', 'AMC', 'AML', 'ST'];

export function SquadTable({ g, players, own = true, showStats = false }: { g: GameState; players: Player[]; own?: boolean; showStats?: boolean }) {
  const ui = useUI();
  const { Th, sort } = useSort<SquadKey>('pos', 1);
  const rows = sort(players, {
    pos: (p) => POS_ORDER.indexOf(p.pos) * 100 - overall(p),
    name: (p) => p.last,
    age: (p) => age(p, g.date),
    ovr: overall,
    pot: (p) => scoutedPotential(p, own),
    cond: (p) => p.condition,
    morale: (p) => p.morale,
    value: (p) => marketValue(p, g.date),
    contract: (p) => p.contractEnd,
    apps: (p) => p.stats.apps,
    goals: (p) => p.stats.goals,
    assists: (p) => p.stats.assists,
    rating: (p) => avgRating(p),
  });
  return (
    <div className="table-wrap">
      <table className="t">
        <thead>
          <tr>
            <Th k="pos">Pos</Th>
            <Th k="name">Name</Th>
            <Th k="age" className="r">Age</Th>
            <Th k="ovr" className="c">OVR</Th>
            <Th k="pot">Potential</Th>
            {showStats ? (
              <>
                <Th k="apps" className="r">Apps</Th>
                <Th k="goals" className="r">Gls</Th>
                <Th k="assists" className="r">Ast</Th>
                <Th k="rating" className="r">Avg</Th>
                <th>Form</th>
              </>
            ) : (
              <>
                <Th k="cond">Cond</Th>
                <Th k="morale">Morale</Th>
                <th>Form</th>
                <Th k="value" className="r">Value</Th>
                <Th k="contract" className="r">Contract</Th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} className="click" onClick={() => ui.openPlayer(p.id)}>
              <td><PosTag pos={p.pos} /></td>
              <td className="bold">{shortName(p)}<StatusIcons p={p} /><span className="flag"> {p.nat}</span></td>
              <td className="r num">{age(p, g.date)}</td>
              <td className="c"><Ovr value={overall(p)} /><OvrChange v={p.lastChange} /></td>
              <td><Stars ovr={scoutedPotential(p, own)} /></td>
              {showStats ? (
                <>
                  <td className="r num">{p.stats.apps}</td>
                  <td className="r num">{p.stats.goals}</td>
                  <td className="r num">{p.stats.assists}</td>
                  <td className="r num bold">{p.stats.apps ? avgRating(p).toFixed(2) : '—'}</td>
                  <td><Spark values={p.form} /></td>
                </>
              ) : (
                <>
                  <td><CondBar v={p.condition} /></td>
                  <td>{p.morale >= 75 ? '😃' : p.morale >= 55 ? '🙂' : p.morale >= 35 ? '😐' : '😠'}</td>
                  <td><Spark values={p.form} /></td>
                  <td className="r num">{fmtMoney(marketValue(p, g.date))}</td>
                  <td className="r num">{p.contractEnd}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Squad() {
  const g = useGame();
  const ui = useUI();
  const [tab, setTab] = useState<'squad' | 'tactics' | 'stats'>(ui.param === 'tactics' ? 'tactics' : 'squad');
  const club = g.clubs[g.userClubId];
  const squad = squadOf(g, club.id);
  return (
    <div>
      <div className="page-title">
        <div>
          <div className="kicker">{club.name}</div>
          <h1>First Team</h1>
        </div>
        <span className="chip">{squad.length} players</span>
        <span className="chip">Avg age {(squad.reduce((s, p) => s + age(p, g.date), 0) / Math.max(1, squad.length)).toFixed(1)}</span>
      </div>
      <div className="tabs">
        {(['squad', 'tactics', 'stats'] as const).map((t) => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t === 'squad' ? 'Squad' : t === 'tactics' ? 'Tactics & Lineup' : 'Season Stats'}</button>
        ))}
      </div>
      {tab === 'squad' && <Card><SquadTable g={g} players={squad} /></Card>}
      {tab === 'stats' && <Card><SquadTable g={g} players={squad} showStats /></Card>}
      {tab === 'tactics' && <Tactics g={g} club={club} squad={squad} />}
    </div>
  );
}

function Tactics({ g, club, squad }: { g: GameState; club: Club; squad: Player[] }) {
  const ui = useUI();
  const [sel, setSel] = useState<number | null>(null);
  const slots = FORMATIONS[club.tactics.formation];
  const lineup = club.lineup.length === slots.length ? club.lineup : new Array(slots.length).fill(null);
  const inXI = new Set(lineup.filter((x): x is number => x !== null));
  const subs = club.subs.filter((id) => g.players[id]?.clubId === club.id);

  const assign = (pid: number) => {
    if (sel === null) return;
    mutate(() => {
      const lu = [...lineup];
      const existing = lu.indexOf(pid);
      if (existing >= 0) lu[existing] = lu[sel];
      lu[sel] = pid;
      club.lineup = lu;
      club.subs = club.subs.filter((id) => id !== pid);
      validateLineup(club, squad);
    });
    setSel(null);
  };

  const candidates = sel !== null
    ? [...squad].sort((a, b) => ratingAt(b, slots[sel].pos) - ratingAt(a, slots[sel].pos))
    : [];

  return (
    <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)' }}>
      <Card title="Lineup" tag={club.tactics.formation} right={
        <>
          <button className="btn sm primary" onClick={() => mutate(() => { const r = pickLineup(club, squad); club.lineup = r.lineup; club.subs = r.subs; })}>⚡ Auto-pick best XI</button>
        </>
      }>
        <FormationPitch g={g} club={club} lineup={lineup} selected={sel} onSlot={(i) => setSel(sel === i ? null : i)} height={540} />
        <p className="small muted" style={{ textAlign: 'center', marginBottom: 0 }}>Click a position to choose who plays there. Red name tags mean a player is out of position.</p>
      </Card>
      <div className="col" style={{ gap: 18 }}>
        <Card title="Team Instructions" tag="Tactics" tagColor="var(--violet)">
          <div className="col">
            <div className="field">
              <label>Formation</label>
              <div className="row wrap" style={{ gap: 6 }}>
                {FORMATION_NAMES.map((f) => (
                  <button key={f} className={`tab ${club.tactics.formation === f ? 'active' : ''}`} onClick={() => mutate(() => { club.tactics.formation = f; club.lineup = []; validateLineup(club, squad); const r = pickLineup(club, squad); club.lineup = r.lineup; club.subs = r.subs; })}>{f}</button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Mentality</label>
              <div className="seg">
                {MENTALITY.map((m, i) => (
                  <button key={m} className={club.tactics.mentality === i - 2 ? 'on' : ''} onClick={() => mutate(() => { club.tactics.mentality = i - 2; })}>{m}</button>
                ))}
              </div>
            </div>
            <div className="row wrap" style={{ gap: 16 }}>
              <div className="field">
                <label>Pressing</label>
                <div className="seg">
                  {PRESSING.map((m, i) => (
                    <button key={m} className={club.tactics.pressing === i ? 'on' : ''} onClick={() => mutate(() => { club.tactics.pressing = i; })}>{m}</button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label>Passing</label>
                <div className="seg">
                  {(Object.keys(STYLES) as (keyof typeof STYLES)[]).map((k) => (
                    <button key={k} className={club.tactics.style === k ? 'on' : ''} onClick={() => mutate(() => { club.tactics.style = k; })}>{STYLES[k]}</button>
                  ))}
                </div>
              </div>
            </div>
            <label className="row small bold" style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={g.autoSubs} onChange={(e) => mutate((gg) => { gg.autoSubs = e.target.checked; })} />
              Assistant makes substitutions during matches
            </label>
            <div className="help">
              <b>How tactics work:</b> attacking mentality creates more chances but leaves gaps at the back. A high press wins the ball back more but tires players faster. Short passing helps keep possession; direct play creates slightly better chances.
            </div>
          </div>
        </Card>
        {sel !== null ? (
          <Card title={`Pick ${slots[sel].pos}`} tag="Select" tagColor="var(--yellow)" right={<button className="btn sm" onClick={() => setSel(null)}>Cancel</button>}>
            <div style={{ maxHeight: 420, overflowY: 'auto' }}>
              <table className="t">
                <tbody>
                  {candidates.map((p) => {
                    const fam = familiarity(p, slots[sel].pos);
                    const unavailable = !!p.injury || p.suspended > 0;
                    return (
                      <tr key={p.id} className="click" style={{ opacity: unavailable ? 0.45 : 1 }} onClick={() => !unavailable && assign(p.id)}>
                        <td><Ovr value={Math.round(ratingAt(p, slots[sel].pos))} /></td>
                        <td><PosTag pos={p.pos} /></td>
                        <td className="bold">{shortName(p)}<StatusIcons p={p} /></td>
                        <td className="small">{fam >= 1 ? 'Natural' : fam >= 0.95 ? 'Accomplished' : fam >= 0.85 ? 'Unconvincing' : 'Awkward'}</td>
                        <td><CondBar v={p.condition} /></td>
                        <td className="small muted">{inXI.has(p.id) ? 'In XI' : subs.includes(p.id) ? 'Bench' : ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <Card title="Substitutes" tag={`${subs.length}/9`} tagColor="var(--sky)">
            <table className="t">
              <tbody>
                {subs.map((id) => {
                  const p = g.players[id];
                  return (
                    <tr key={id} className="click" onClick={() => ui.openPlayer(id)}>
                      <td><Ovr value={overall(p)} /></td>
                      <td><PosTag pos={p.pos} /></td>
                      <td className="bold">{shortName(p)}<StatusIcons p={p} /></td>
                      <td><CondBar v={p.condition} /></td>
                      <td className="r"><button className="btn sm" onClick={(e) => { e.stopPropagation(); mutate(() => { club.subs = club.subs.filter((x) => x !== id); }); }}>Remove</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="small bold muted" style={{ margin: '12px 0 6px' }}>NOT IN SQUAD</div>
            <div className="row wrap" style={{ gap: 6 }}>
              {squad.filter((p) => !inXI.has(p.id) && !subs.includes(p.id)).sort((a, b) => overall(b) - overall(a)).map((p) => (
                <button key={p.id} className="chip" style={{ cursor: subs.length < 9 ? 'pointer' : 'not-allowed', opacity: p.injury || p.suspended ? 0.5 : 1 }} disabled={subs.length >= 9 || !!p.injury || p.suspended > 0} onClick={() => mutate(() => { club.subs.push(p.id); })}>
                  {p.pos} {shortName(p)} {overall(p)}
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
