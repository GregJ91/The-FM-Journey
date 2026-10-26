import { useState } from 'react';
import { FORMATIONS, FORMATION_NAMES, MENTALITY, PRESSING, STYLES } from '../../game/formations';
import { squadOf } from '../../game/generate';
import { POS_GROUP, age, avgRating, familiarity, fmtMoney, marketValue, overall, ratingAt, scoutedPotential, shortName } from '../../game/ratings';
import { pickLineup, validateLineup } from '../../game/selection';
import type { Club, GameState, Player } from '../../game/types';
import { mutate, useGame } from '../../store';
import { useUI } from '../context';
import { Card, CondBar, OvrChange, PlayerRow, Sheet, Spark, Stars } from '../components/common';
import { FormationPitch } from '../components/Pitch';

type SortKey = 'pos' | 'ovr' | 'age' | 'value' | 'pot' | 'goals' | 'rating';
const SORTS: [SortKey, string][] = [['pos', 'Position'], ['ovr', 'Overall'], ['pot', 'Potential'], ['age', 'Age'], ['value', 'Value'], ['goals', 'Goals'], ['rating', 'Avg rating']];
const POS_ORDER = ['GK', 'DR', 'DC', 'DL', 'DM', 'MR', 'MC', 'ML', 'AMR', 'AMC', 'AML', 'ST'];
const GROUP_NAME = { GK: 'Goalkeepers', DEF: 'Defenders', MID: 'Midfielders', ATT: 'Attackers' } as const;

/** Mobile squad list with sort chips; grouped by position when sorted by position. */
export function SquadList({ g, players, own = true }: { g: GameState; players: Player[]; own?: boolean }) {
  const [sort, setSort] = useState<SortKey>('pos');
  const get: Record<SortKey, (p: Player) => number> = {
    pos: (p) => POS_ORDER.indexOf(p.pos) * 100 - overall(p),
    ovr: (p) => -overall(p),
    pot: (p) => -scoutedPotential(p, own),
    age: (p) => age(p, g.date),
    value: (p) => -marketValue(p, g.date),
    goals: (p) => -p.stats.goals,
    rating: (p) => -avgRating(p),
  };
  const rows = [...players].sort((a, b) => get[sort](a) - get[sort](b));
  const line = (p: Player) => {
    const bits = [`${age(p, g.date)}y`, p.nat];
    if (sort === 'goals' || sort === 'rating') bits.push(`${p.stats.apps} apps · ${p.stats.goals}G ${p.stats.assists}A`);
    else bits.push(fmtMoney(marketValue(p, g.date)));
    return bits.join(' · ');
  };
  const end = (p: Player) => {
    if (sort === 'rating' || sort === 'goals') return p.stats.apps ? avgRating(p).toFixed(2) : '—';
    if (sort === 'pot') return <Stars ovr={scoutedPotential(p, own)} />;
    return <Spark values={p.form} />;
  };
  const endSub = (p: Player) => (own ? <CondBar v={p.condition} /> : <>{p.contractEnd}</>);
  let lastGroup = '';
  return (
    <>
      <div className="tabs">
        {SORTS.map(([k, label]) => <button key={k} className={`tab ${sort === k ? 'active' : ''}`} onClick={() => setSort(k)}>{label}</button>)}
      </div>
      <div className="card" style={{ paddingTop: 4, paddingBottom: 4 }}>
        <div className="list">
          {rows.map((p) => {
            const grp = POS_GROUP[p.pos];
            const header = sort === 'pos' && grp !== lastGroup;
            lastGroup = grp;
            return (
              <div key={p.id}>
                {header && <div className="section-label">{GROUP_NAME[grp]}</div>}
                <PlayerRow p={p} sub={<>{line(p)}<OvrChange v={p.lastChange} /></>} end={end(p)} endSub={endSub(p)} />
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

export function Squad() {
  const g = useGame();
  const ui = useUI();
  const [tab, setTab] = useState<'squad' | 'tactics'>(ui.param === 'tactics' ? 'tactics' : 'squad');
  const club = g.clubs[g.userClubId];
  const squad = squadOf(g, club.id);
  return (
    <div>
      <div className="page-title">
        <div className="kicker">{club.name}</div>
        <h1>First Team</h1>
        <div className="chips">
          <span className="chip">{squad.length} players</span>
          <span className="chip">Avg age {(squad.reduce((s, p) => s + age(p, g.date), 0) / Math.max(1, squad.length)).toFixed(1)}</span>
          <span className="chip">{club.tactics.formation}</span>
        </div>
      </div>
      <div className="seg" style={{ marginBottom: 12 }}>
        <button className={tab === 'squad' ? 'on' : ''} onClick={() => setTab('squad')}>Squad</button>
        <button className={tab === 'tactics' ? 'on' : ''} onClick={() => setTab('tactics')}>Tactics & Lineup</button>
      </div>
      {tab === 'squad' ? <SquadList g={g} players={squad} /> : <Tactics g={g} club={club} squad={squad} />}
    </div>
  );
}

const MENTALITY_SHORT = ['V.Def', 'Def', 'Bal', 'Att', 'V.Att'];

function Tactics({ g, club, squad }: { g: GameState; club: Club; squad: Player[] }) {
  const [sel, setSel] = useState<number | null>(null);
  const [benchPick, setBenchPick] = useState(false);
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
  const autoPick = () => mutate(() => { const r = pickLineup(club, squad); club.lineup = r.lineup; club.subs = r.subs; });

  return (
    <div>
      <Card title="Lineup" tag={club.tactics.formation} right={<button className="btn sm primary" onClick={autoPick}>⚡ Auto-pick</button>}>
        <FormationPitch g={g} club={club} lineup={lineup} selected={sel} onSlot={setSel} />
        <p className="small muted" style={{ textAlign: 'center', margin: '8px 0 0' }}>Tap a position to choose a player. Red names are out of position.</p>
      </Card>

      <Card title="Formation" tag="Shape" tagColor="var(--sky)">
        <div className="tabs" style={{ marginBottom: 0 }}>
          {FORMATION_NAMES.map((f) => (
            <button key={f} className={`tab ${club.tactics.formation === f ? 'active' : ''}`} onClick={() => mutate(() => { club.tactics.formation = f; const r = pickLineup(club, squad); club.lineup = r.lineup; club.subs = r.subs; })}>{f}</button>
          ))}
        </div>
      </Card>

      <Card title="Team Instructions" tag="Tactics" tagColor="var(--violet)">
        <div className="col">
          <div className="field">
            <label>Mentality · {MENTALITY[club.tactics.mentality + 2]}</label>
            <div className="seg">
              {MENTALITY_SHORT.map((m, i) => <button key={m} className={club.tactics.mentality === i - 2 ? 'on' : ''} onClick={() => mutate(() => { club.tactics.mentality = i - 2; })}>{m}</button>)}
            </div>
          </div>
          <div className="field">
            <label>Pressing</label>
            <div className="seg">
              {PRESSING.map((m, i) => <button key={m} className={club.tactics.pressing === i ? 'on' : ''} onClick={() => mutate(() => { club.tactics.pressing = i; })}>{m}</button>)}
            </div>
          </div>
          <div className="field">
            <label>Passing</label>
            <div className="seg">
              {(Object.keys(STYLES) as (keyof typeof STYLES)[]).map((k) => <button key={k} className={club.tactics.style === k ? 'on' : ''} onClick={() => mutate(() => { club.tactics.style = k; })}>{STYLES[k]}</button>)}
            </div>
          </div>
          <label className="row small bold" style={{ cursor: 'pointer' }}>
            <input type="checkbox" style={{ width: 20, height: 20 }} checked={g.autoSubs} onChange={(e) => mutate((gg) => { gg.autoSubs = e.target.checked; })} />
            Assistant makes subs during matches
          </label>
          <div className="help">Attacking mentality creates more chances but leaves gaps. A high press wins the ball back but tires players. Short passing keeps possession; direct play makes slightly better chances.</div>
        </div>
      </Card>

      <Card title="Substitutes" tag={`${subs.length}/9`} tagColor="var(--yellow)" right={<button className="btn sm" disabled={subs.length >= 9} onClick={() => setBenchPick(true)}>+ Add</button>}>
        <div className="list">
          {subs.map((id) => {
            const p = g.players[id];
            return (
              <PlayerRow key={id} p={p} sub={<CondBar v={p.condition} />} end={<button className="btn sm" onClick={(e) => { e.stopPropagation(); mutate(() => { club.subs = club.subs.filter((x) => x !== id); }); }}>Remove</button>} />
            );
          })}
          {!subs.length && <div className="muted small">No substitutes selected.</div>}
        </div>
      </Card>

      {sel !== null && (
        <Sheet title={`Choose ${slots[sel].pos}`} onClose={() => setSel(null)}>
          <div className="sheet-b list">
            {[...squad].sort((a, b) => ratingAt(b, slots[sel].pos) - ratingAt(a, slots[sel].pos)).map((p) => {
              const fam = familiarity(p, slots[sel].pos);
              const out = !!p.injury || p.suspended > 0;
              return (
                <div key={p.id} style={{ opacity: out ? 0.45 : 1 }}>
                  <PlayerRow p={p} ovr={Math.round(ratingAt(p, slots[sel].pos))}
                    sub={`${fam >= 1 ? 'Natural' : fam >= 0.95 ? 'Accomplished' : fam >= 0.85 ? 'Unconvincing' : 'Awkward'}${inXI.has(p.id) ? ' · in XI' : subs.includes(p.id) ? ' · bench' : ''}`}
                    end={<CondBar v={p.condition} />}
                    onClick={() => !out && assign(p.id)} />
                </div>
              );
            })}
          </div>
        </Sheet>
      )}
      {benchPick && (
        <Sheet title="Add to bench" onClose={() => setBenchPick(false)}>
          <div className="sheet-b list">
            {squad.filter((p) => !inXI.has(p.id) && !subs.includes(p.id)).sort((a, b) => overall(b) - overall(a)).map((p) => {
              const out = !!p.injury || p.suspended > 0;
              return (
                <div key={p.id} style={{ opacity: out ? 0.45 : 1 }}>
                  <PlayerRow p={p} sub={shortName(p)} end={<CondBar v={p.condition} />} onClick={() => { if (out) return; mutate(() => { club.subs.push(p.id); }); if (subs.length + 1 >= 9) setBenchPick(false); }} />
                </div>
              );
            })}
          </div>
        </Sheet>
      )}
    </div>
  );
}
