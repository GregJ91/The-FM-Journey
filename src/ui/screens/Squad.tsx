import { useState } from 'react';
import { FORMATIONS } from '../../game/formations';
import { normaliseTactics } from '../../game/tactics';
import { TeamInstructions } from '../components/TacticsEditor';
import { activateCheat } from '../../game/cheats';
import { squadOf } from '../../game/generate';
import { POS_GROUP, age, avgRating, familiarity, fmtMoney, marketValue, overall, ratingAt, scoutedPotential, shortName } from '../../game/ratings';
import { pickLineup, validateLineup } from '../../game/selection';
import type { Club, GameState, Player, Tactics as TacticsT } from '../../game/types';
import { mutate, useGame } from '../../store';
import { useUI } from '../context';
import { CondBar, Ovr, OvrChange, PosTag, Sheet, Spark, Stars, StatusIcons } from '../components/common';
import { useLandscape } from '../useLandscape';
import { Fit } from '../components/Fit';

type SortKey = 'pos' | 'ovr' | 'age' | 'value' | 'pot' | 'goals' | 'rating' | 'xg' | 'kp' | 'pass' | 'def';
const SORTS: [SortKey, string][] = [['pos', 'Position'], ['ovr', 'Overall'], ['pot', 'Potential'], ['age', 'Age'], ['value', 'Value'], ['rating', 'Avg rating'], ['goals', 'Goals'], ['xg', 'xG'], ['kp', 'Key passes'], ['pass', 'Pass %'], ['def', 'Tackles + Int']];
const STAT_SORTS: SortKey[] = ['goals', 'rating', 'xg', 'kp', 'pass', 'def'];
const passPct = (p: Player) => (p.stats.passes ? (p.stats.passC / p.stats.passes) * 100 : 0);
const POS_ORDER = ['GK', 'DR', 'DC', 'DL', 'DM', 'MR', 'MC', 'ML', 'AMR', 'AMC', 'AML', 'ST'];

/** Mobile squad list with sort chips; grouped by position when sorted by position. */
export function SquadList({ g, players, own = true, title, toolbar }: { g: GameState; players: Player[]; own?: boolean; title?: string; toolbar?: React.ReactNode }) {
  const [sort, setSort] = useState<SortKey>('pos');
  const get: Record<SortKey, (p: Player) => number> = {
    pos: (p) => POS_ORDER.indexOf(p.pos) * 100 - overall(p),
    ovr: (p) => -overall(p),
    pot: (p) => -scoutedPotential(p, own),
    age: (p) => age(p, g.date),
    value: (p) => -marketValue(p, g.date),
    goals: (p) => -p.stats.goals,
    rating: (p) => -avgRating(p),
    xg: (p) => -p.stats.xg,
    kp: (p) => -p.stats.kp,
    pass: (p) => -(p.stats.passes >= 20 ? passPct(p) : 0),
    def: (p) => -(p.stats.tkl + p.stats.int),
  };
  const rows = [...players].sort((a, b) => get[sort](a) - get[sort](b));
  const end = (p: Player) => {
    if (!p.stats.apps && STAT_SORTS.includes(sort)) return '—';
    if (sort === 'rating') return avgRating(p).toFixed(2);
    if (sort === 'goals') return p.stats.goals;
    if (sort === 'xg') return p.stats.xg.toFixed(1);
    if (sort === 'kp') return p.stats.kp;
    if (sort === 'pass') return p.stats.passes ? `${passPct(p).toFixed(0)}%` : '—';
    if (sort === 'def') return p.stats.tkl + p.stats.int;
    if (sort === 'pot') return <Stars ovr={scoutedPotential(p, own)} />;
    return <Spark values={p.form} />;
  };
  const landscape = useLandscape();
  if (landscape) return <SquadTable g={g} rows={rows} own={own} sort={sort} setSort={setSort} />;
  const ui = useUI();
  const stat = STAT_SORTS.includes(sort) || sort === 'value';
  const lastLabel = stat ? SORTS.find(([k]) => k === sort)![1].replace('Avg rating', 'Rat').replace('Key passes', 'KP').replace('Tackles + Int', 'T+I') : own ? 'Fit' : 'Con';
  const last = (p: Player) => {
    if (sort === 'value') return fmtMoney(marketValue(p, g.date));
    if (STAT_SORTS.includes(sort)) return end(p);
    if (!own) return p.contractEnd;
    return <span className={p.condition < 85 ? 'bad' : 'ok'}>{Math.round(p.condition)}%</span>;
  };
  // Championship Manager-style squad list: dense rows, sorted from a dropdown, paged instead of scrolled
  return (
    <div className="win-list">
      <div className="ns-bar-row">
        {toolbar}
        <select className="input" aria-label="Sort by" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          {SORTS.map(([k, label]) => <option key={k} value={k}>Sort: {label}</option>)}
        </select>
      </div>
      <div className="card fill squad-ns">
        <div className="card-h"><h3>{title ?? 'Players'}</h3><div className="right tile-sub">{players.length} players</div></div>
        <Fit>
        <table className="t dense">
          <thead><tr><th>No</th><th>Pos</th><th>Name</th><th className="r">Age</th><th className="r">Ab</th><th className="r">{lastLabel}</th>{own && <th />}</tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="click" onClick={() => ui.openPlayer(p.id)}>
                <td className="muted num">{p.shirt ?? ''}</td>
                <td><PosTag pos={p.pos} /></td>
                <td className="nm"><b>{shortName(p)}</b> <StatusIcons p={p} /></td>
                <td className="r num">{age(p, g.date)}</td>
                <td className="r"><Ovr value={overall(p)} /></td>
                <td className="r num">{last(p)}</td>
                {own && <td><span className="mood-dot" style={{ background: MORALE(p.morale)[1] }} title={`Morale: ${MORALE(p.morale)[0]}`} /></td>}
              </tr>
            ))}
          </tbody>
        </table>
        </Fit>
      </div>
    </div>
  );
}

const MORALE = (m: number) => (m >= 80 ? ['Superb', 'var(--grass)'] : m >= 65 ? ['Good', 'var(--grass)'] : m >= 45 ? ['Okay', 'var(--yellow)'] : m >= 30 ? ['Poor', 'var(--orange)'] : ['Very poor', 'var(--coral)']);

/** Landscape: an FM-style squad table; tap a column heading to sort by it. */
function SquadTable({ g, rows, own, sort, setSort }: { g: GameState; rows: Player[]; own: boolean; sort: SortKey; setSort: (k: SortKey) => void }) {
  const ui = useUI();
  const cols: { label: string; key?: SortKey; cls?: string }[] = [
    { label: 'No.' }, { label: 'Pos', key: 'pos' }, { label: 'Name' }, { label: 'Age', key: 'age', cls: 'r' }, { label: 'Nat' },
    { label: 'Ovr', key: 'ovr', cls: 'c' }, { label: 'Pot', key: 'pot' }, { label: own ? 'Cond' : 'Contract' }, ...(own ? [{ label: 'Morale' }] : []),
    { label: 'Apps', cls: 'r' }, { label: 'Gls', key: 'goals', cls: 'r' }, { label: 'Ast', cls: 'r' }, { label: 'Av Rat', key: 'rating', cls: 'r' }, { label: 'Value', key: 'value', cls: 'r' },
  ];
  return (
    <div className="card fill squad-table">
      <Fit>
      <table className="t fm">
        <thead>
          <tr>{cols.map((c) => <th key={c.label} className={`${c.cls ?? ''} ${c.key ? 'sortable' : ''} ${c.key && c.key === sort ? 'sorted' : ''}`} onClick={c.key ? () => setSort(c.key!) : undefined}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const [mood, moodC] = MORALE(p.morale);
            return (
              <tr key={p.id} className="click" onClick={() => ui.openPlayer(p.id)}>
                <td className="muted num">{p.shirt ?? ''}</td>
                <td><PosTag pos={p.pos} /></td>
                <td className="nm"><b>{shortName(p)}</b> <StatusIcons p={p} /><OvrChange v={p.lastChange} /></td>
                <td className="r num">{age(p, g.date)}</td>
                <td className="muted">{p.nat}</td>
                <td className="c"><Ovr value={overall(p)} /></td>
                <td><Stars ovr={scoutedPotential(p, own)} /></td>
                <td>{own ? <CondBar v={p.condition} /> : <span className="num">{p.contractEnd}</span>}</td>
                {own && <td style={{ color: moodC, fontWeight: 650 }}>{mood}</td>}
                <td className="r num">{p.stats.apps}</td>
                <td className="r num">{p.stats.goals}</td>
                <td className="r num">{p.stats.assists}</td>
                <td className="r num">{p.stats.apps ? avgRating(p).toFixed(2) : '-'}</td>
                <td className="r num">{fmtMoney(marketValue(p, g.date))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </Fit>
    </div>
  );
}

export function Squad() {
  const g = useGame();
  const ui = useUI();
  const [tab, setTab] = useState<'squad' | 'tactics'>(ui.param === 'tactics' ? 'tactics' : 'squad');
  const club = g.clubs[g.userClubId];
  const squad = squadOf(g, club.id);
  const avgAge = (squad.reduce((s, p) => s + age(p, g.date), 0) / Math.max(1, squad.length)).toFixed(1);
  const toolbar = (
    <div className="ns-toggle">
      <button className={`btn sm ${tab === 'squad' ? 'primary' : ''}`} onClick={() => setTab('squad')}>Squad</button>
      <button className={`btn sm ${tab === 'tactics' ? 'primary' : ''}`} onClick={() => setTab('tactics')}>Tactics</button>
    </div>
  );
  return tab === 'squad'
    ? <SquadList g={g} players={squad} title={`First team · avg age ${avgAge}`} toolbar={toolbar} />
    : <Tactics g={g} club={club} squad={squad} toolbar={toolbar} />;
}

type Pick = { kind: 'xi'; i: number } | { kind: 'sub' | 'res'; id: number };

/** CM 01/02-style tactics: the team on a pitch in name boxes, the selection listed underneath (1-11, subs, reserves);
 * tap one player then another to swap them. Team instructions open in a sheet. */
function Tactics({ g, club, squad, toolbar }: { g: GameState; club: Club; squad: Player[]; toolbar: React.ReactNode }) {
  const ui = useUI();
  const [pick, setPick] = useState<Pick | null>(null);
  const [instr, setInstr] = useState(false);
  const slots = FORMATIONS[club.tactics.formation];
  const lineup = club.lineup.length === slots.length ? club.lineup : new Array(slots.length).fill(null);
  const inXI = new Set(lineup.filter((x): x is number => x !== null));
  const subs = club.subs.filter((id) => g.players[id]?.clubId === club.id && !inXI.has(id));
  const reserves = squad.filter((p) => !inXI.has(p.id) && !subs.includes(p.id)).sort((a, b) => overall(b) - overall(a));
  const out = (p: Player) => !!p.injury || p.suspended > 0 || !!p.away;

  const idOf = (k: Pick) => (k.kind === 'xi' ? lineup[k.i] : k.id);
  const tap = (k: Pick) => {
    if (!pick) { setPick(k); return; }
    const a = pick;
    setPick(null);
    if (a.kind === k.kind && (a.kind === 'xi' ? a.i === (k as { i: number }).i : a.id === (k as { id: number }).id)) return;
    const [x, y] = a.kind === 'xi' ? [a, k] : k.kind === 'xi' ? [k, a] : [a, k];
    const incoming = idOf(y);
    if (x.kind === 'xi' && incoming !== null && y.kind !== 'xi' && out(g.players[incoming])) { ui.toast(`${shortName(g.players[incoming])} isn't available`, true); return; }
    mutate(() => {
      const lu = [...lineup];
      let sb = [...subs];
      if (x.kind === 'xi' && y.kind === 'xi') { [lu[x.i], lu[y.i]] = [lu[y.i], lu[x.i]]; }
      else if (x.kind === 'xi') {
        const leaving = lu[x.i];
        lu[x.i] = incoming;
        if (y.kind === 'sub') sb = sb.map((id) => (id === incoming ? leaving : id)).filter((id): id is number => id !== null);
      } else if (x.kind === 'sub' && y.kind === 'res') sb = sb.map((id) => (id === x.id ? y.id : id));
      else if (x.kind === 'res' && y.kind === 'sub') sb = sb.map((id) => (id === y.id ? x.id : id));
      club.lineup = lu;
      club.subs = sb;
      validateLineup(club, squad);
    });
  };
  const isPicked = (k: Pick) => !!pick && pick.kind === k.kind && (k.kind === 'xi' ? (pick as { i: number }).i === k.i : (pick as { id: number }).id === (k as { id: number }).id);
  const autoPick = () => mutate(() => { const r = pickLineup(club, squad); club.lineup = r.lineup; club.subs = r.subs; });
  const updateTactics = (t: Partial<TacticsT>) => {
    const msg = mutate((gg) => {
      const formationChanged = !!t.formation && t.formation !== club.tactics.formation;
      // a new formation brings default roles unless the change supplied its own (presets)
      club.tactics = normaliseTactics({ ...club.tactics, ...t, roles: t.roles ?? (formationChanged ? [] : club.tactics.roles) });
      if (formationChanged) { const r = pickLineup(club, squad); club.lineup = r.lineup; club.subs = r.subs; }
      return t.name !== undefined ? activateCheat(gg) : null;
    });
    if (msg) ui.toast(msg);
  };

  const row = (p: Player, k: Pick, no: string, pos: string, rating: number, warn = false) => (
    <tr key={`${k.kind}-${p.id}`} className={`click ${isPicked(k) ? 'me' : ''}`} style={{ opacity: out(p) ? 0.5 : 1 }} onClick={() => tap(k)}>
      <td className="muted num">{no}</td>
      <td><span className={`pos ${POS_GROUP[pos as keyof typeof POS_GROUP] ?? ''}`}>{pos}</span></td>
      <td className={`nm ${warn ? 'bad' : ''}`}><b>{shortName(p)}</b> <StatusIcons p={p} /></td>
      <td className="r"><Ovr value={Math.round(rating)} /></td>
      <td className="r num"><span className={p.condition < 85 ? 'bad' : 'ok'}>{Math.round(p.condition)}%</span></td>
    </tr>
  );

  return (
    <div className="cm-tactics">
      <div className="ns-bar-row">
        {toolbar}
        <select className="input" aria-label="Formation" value={club.tactics.formation} onChange={(e) => updateTactics({ formation: e.target.value })}>
          {Object.keys(FORMATIONS).map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
      <section className="card cm-pitch-win">
        <div className="card-h"><h3>{club.tactics.name?.trim() || 'Tactics'}</h3><div className="right" style={{ display: 'flex', gap: 4 }}>
          <button className="btn sm" onClick={() => setInstr(true)}>Instructions</button>
          <button className="btn sm" onClick={autoPick}>Auto</button>
        </div></div>
        <div className="cm-pitch">
          {slots.map((s, i) => {
            const id = lineup[i];
            const p = id !== null && id !== undefined ? g.players[id] : null;
            const warn = !!p && familiarity(p, s.pos) < 0.9;
            const top = 92 - (s.x - 5) * (84 / 79);
            const left = 9 + s.y * 0.82;
            return (
              <button key={i} className={`cm-box ${isPicked({ kind: 'xi', i }) ? 'sel' : ''} ${warn ? 'warn' : ''}`} style={{ top: `${top}%`, left: `${left}%` }} onClick={() => tap({ kind: 'xi', i })}>
                <i>{p?.shirt ?? i + 1}</i>{p ? p.last : s.pos}
              </button>
            );
          })}
        </div>
      </section>
      <div className="card fill squad-ns">
        <div className="card-h"><h3>Selection</h3><div className="right tile-sub">{pick ? 'Now tap who to swap with' : 'Tap two players to swap'}</div></div>
        <Fit>
        <table className="t dense">
          <tbody>
            {slots.map((s, i) => { const id = lineup[i]; const p = id !== null ? g.players[id] : null; return p ? row(p, { kind: 'xi', i }, String(i + 1), s.pos, ratingAt(p, s.pos), familiarity(p, s.pos) < 0.9) : null; })}
            <tr className="grp"><td colSpan={5}>Substitutes</td></tr>
            {subs.map((id, n) => row(g.players[id], { kind: 'sub', id }, `S${n + 1}`, g.players[id].pos, overall(g.players[id])))}
            <tr className="grp"><td colSpan={5}>Reserves</td></tr>
            {reserves.map((p) => row(p, { kind: 'res', id: p.id }, '', p.pos, overall(p)))}
          </tbody>
        </table>
        </Fit>
      </div>
      {instr && (
        <Sheet title="Team instructions" onClose={() => setInstr(false)}>
          <div className="sheet-b">
            <TeamInstructions g={g} tactics={club.tactics} lineup={lineup} onChange={updateTactics} autoSubs={g.autoSubs} onAutoSubs={(v) => mutate((gg) => { gg.autoSubs = v; })} />
          </div>
        </Sheet>
      )}
    </div>
  );
}
