import { useState } from 'react';
import { FORMATIONS } from '../../game/formations';
import { normaliseTactics } from '../../game/tactics';
import { TeamInstructions } from '../components/TacticsEditor';
import { activateCheat } from '../../game/cheats';
import { squadOf } from '../../game/generate';
import { ordinal } from '../../game/season';
import { Youth } from './Youth';
import { reserveLeagueFor, youthTable } from '../../game/youth';
import { age, avgRating, familiarity, fmtMoney, marketValue, overall, ratingAt, scoutedPotential, shortName } from '../../game/ratings';
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
          {SORTS.filter(([k]) => !g.era || (k !== 'ovr' && k !== 'pot')).map(([k, label]) => <option key={k} value={k}>Sort: {label}</option>)}
        </select>
      </div>
      <div className="card fill squad-ns">
        <div className="card-h"><h3>{title ?? 'Players'}</h3><div className="right tile-sub">{players.length} players</div></div>
        <Fit>
        <table className="t dense">
          <thead><tr><th>No</th><th>Pos</th><th>Name</th><th className="r">Age</th><th className="r ab">Ab</th><th className="r">{lastLabel}</th>{own && <th />}</tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="click" onClick={() => ui.openPlayer(p.id)}>
                <td className="muted num">{p.shirt ?? ''}</td>
                <td><PosTag pos={p.pos} /></td>
                <td className="nm"><b>{shortName(p)}</b> <StatusIcons p={p} /></td>
                <td className="r num">{age(p, g.date)}</td>
                <td className="r ab"><Ovr value={overall(p)} /></td>
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

export function Squad({ start }: { start?: 'youth' } = {}) {
  const g = useGame();
  const ui = useUI();
  const [tab, setTab] = useState<'squad' | 'reserves' | 'youth' | 'tactics'>(start ?? (ui.param === 'tactics' ? 'tactics' : 'squad'));
  const club = g.clubs[g.userClubId];
  const squad = squadOf(g, club.id);
  const reserves = squadOf(g, club.id, 'reserve');
  const avgAge = (squad.reduce((s, p) => s + age(p, g.date), 0) / Math.max(1, squad.length)).toFixed(1);
  // CM 01/02 careers have a reserve team (older saves get it as soon as a player is moved there)
  const hasReserves = !!g.era || reserves.length > 0;
  const resLeague = reserveLeagueFor(g, club.id);
  const resPos = resLeague ? youthTable(resLeague, g).findIndex((r) => r.clubId === club.id) + 1 : 0;
  const resPlayed = resLeague?.fixtures.some((f) => f.hg !== undefined && (f.h === club.id || f.a === club.id));
  // Which squad: a small dropdown (first team, reserves, youth team) beside the Tactics button
  const toolbar = (
    <div className="ns-toggle">
      <select className={`input squad-pick ${tab !== 'tactics' ? 'on' : ''}`} aria-label="Squad" value={tab === 'tactics' ? 'squad' : tab} onChange={(e) => setTab(e.target.value as typeof tab)}>
        <option value="squad">First team</option>
        {hasReserves && <option value="reserves">Reserves</option>}
        <option value="youth">Youth team</option>
      </select>
      <button className={`btn sm ${tab === 'tactics' ? 'primary' : ''}`} onClick={() => setTab('tactics')}>Tactics</button>
    </div>
  );
  if (tab === 'youth') return <Youth top={toolbar} />;
  if (tab === 'reserves') {
    const title = `Reserves${resLeague ? ` · ${resLeague.short} ${resPlayed ? ordinal(resPos) : '—'}` : ''}`;
    return reserves.length
      ? <SquadList g={g} players={reserves} title={title} toolbar={toolbar} />
      : (
        <div className="win-list">
          {toolbar}
          <div className="card fill"><div className="card-h"><h3>{title}</h3></div>
            <div className="empty">No players in the reserves. Open a player and use Manage → Reserves. First-teamers who aren't in the matchday squad play for the reserves too{resLeague ? ` in the ${resLeague.name}` : ''}.</div>
          </div>
        </div>
      );
  }
  return tab === 'squad'
    ? <SquadList g={g} players={squad} title={`First team · avg age ${avgAge}`} toolbar={toolbar} />
    : <Tactics g={g} club={club} squad={squad} toolbar={toolbar} />;
}

/** CM 01/02-style tactics: the team on a pitch in name boxes. Tap a player to see who can play in that position
 * (best first) and pick a replacement; subs and team instructions open from the buttons above the pitch. */
function Tactics({ g, club, squad, toolbar }: { g: GameState; club: Club; squad: Player[]; toolbar: React.ReactNode }) {
  const ui = useUI();
  const [sel, setSel] = useState<number | null>(null);
  const [instr, setInstr] = useState(false);
  const [subsOpen, setSubsOpen] = useState(false);
  const slots = FORMATIONS[club.tactics.formation];
  const lineup = club.lineup.length === slots.length ? club.lineup : new Array(slots.length).fill(null);
  const inXI = new Set(lineup.filter((x): x is number => x !== null));
  const subs = club.subs.filter((id) => g.players[id]?.clubId === club.id && !inXI.has(id));
  const out = (p: Player) => !!p.injury || p.suspended > 0 || !!p.away;

  /** Put a player into slot i; whoever was there takes the incoming player's old place (another slot or the bench). */
  const assign = (i: number, pid: number) => {
    mutate(() => {
      const lu = [...lineup];
      const leaving = lu[i];
      const from = lu.indexOf(pid);
      if (from >= 0) lu[from] = leaving;
      lu[i] = pid;
      let sb = [...subs];
      if (from < 0 && sb.includes(pid)) sb = sb.map((id) => (id === pid ? leaving : id)).filter((id): id is number => id !== null);
      club.lineup = lu;
      club.subs = sb;
      validateLineup(club, squad);
    });
    setSel(null);
  };
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
  const famLabel = (f: number) => (f >= 1 ? 'Natural' : f >= 0.95 ? 'Accomplished' : f >= 0.85 ? 'Unconvincing' : 'Awkward');

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
          <button className="btn sm" onClick={() => setSubsOpen(true)}>Subs {subs.length}</button>
          <button className="btn sm" onClick={autoPick}>Auto</button>
        </div></div>
        <div className="cm-pitch">
          {slots.map((s, i) => {
            const id = lineup[i];
            const p = id !== null && id !== undefined ? g.players[id] : null;
            const warn = !!p && familiarity(p, s.pos) < 0.9;
            const top = 93 - (s.x - 5) * (86 / 79);
            const left = 9 + s.y * 0.82;
            return (
              <button key={i} className={`cm-box ${sel === i ? 'sel' : ''} ${warn ? 'warn' : ''}`} style={{ top: `${top}%`, left: `${left}%` }} onClick={() => setSel(i)}>
                <i>{p?.shirt ?? i + 1}</i>{p ? p.last : s.pos}
                {p && <em className="cm-box-r">{Math.round(ratingAt(p, s.pos))}</em>}
              </button>
            );
          })}
        </div>
        <div className="small muted" style={{ textAlign: 'center', padding: '0 0 6px' }}>Tap a player to see who can play there. Red names are out of position.</div>
      </section>

      {sel !== null && (
        <Sheet title={`Who can play ${slots[sel].pos}?`} onClose={() => setSel(null)}>
          <div className="sheet-b">
            <Fit className="pick-fit">
              <table className="t dense">
                <thead><tr><th>Pos</th><th>Name</th><th>Fits</th><th className="r ab">Here</th><th className="r">Fit</th></tr></thead>
                <tbody>
                  {[...squad].sort((a, b) => ratingAt(b, slots[sel].pos) - ratingAt(a, slots[sel].pos)).map((p) => {
                    const fam = familiarity(p, slots[sel].pos);
                    const where = inXI.has(p.id) ? (lineup[sel] === p.id ? ' · playing here' : ' · in XI') : subs.includes(p.id) ? ' · sub' : '';
                    return (
                      <tr key={p.id} className={`click ${lineup[sel] === p.id ? 'me' : ''}`} style={{ opacity: out(p) ? 0.45 : 1 }} onClick={() => { if (out(p)) { ui.toast(`${shortName(p)} isn't available`, true); return; } assign(sel, p.id); }}>
                        <td><PosTag pos={p.pos} /></td>
                        <td className="nm"><b>{shortName(p)}</b><span className="muted small">{where}</span> <StatusIcons p={p} /></td>
                        <td className={fam >= 0.95 ? 'ok' : fam >= 0.85 ? '' : 'bad'} style={{ fontSize: 11 }}>{famLabel(fam)}</td>
                        <td className="r ab"><Ovr value={Math.round(ratingAt(p, slots[sel].pos))} /></td>
                        <td className="r num"><span className={p.condition < 85 ? 'bad' : 'ok'}>{Math.round(p.condition)}%</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Fit>
          </div>
        </Sheet>
      )}

      {subsOpen && (
        <Sheet title={`Substitutes ${subs.length}/9`} onClose={() => setSubsOpen(false)}>
          <div className="sheet-b">
            <Fit className="pick-fit">
              <table className="t dense">
                <tbody>
                  {subs.map((id) => { const p = g.players[id]; return (
                    <tr key={id} className="me">
                      <td><PosTag pos={p.pos} /></td><td className="nm"><b>{shortName(p)}</b></td><td className="r"><Ovr value={overall(p)} /></td>
                      <td className="r"><button className="btn sm" onClick={() => mutate(() => { club.subs = club.subs.filter((x) => x !== id); })}>Remove</button></td>
                    </tr>
                  ); })}
                  <tr className="grp"><td colSpan={4}>Add to the bench</td></tr>
                  {squad.filter((p) => !inXI.has(p.id) && !subs.includes(p.id)).sort((a, b) => overall(b) - overall(a)).map((p) => (
                    <tr key={p.id} className="click" style={{ opacity: out(p) ? 0.45 : 1 }} onClick={() => { if (out(p) || subs.length >= 9) return; mutate(() => { club.subs.push(p.id); }); }}>
                      <td><PosTag pos={p.pos} /></td><td className="nm"><b>{shortName(p)}</b> <StatusIcons p={p} /></td><td className="r"><Ovr value={overall(p)} /></td>
                      <td className="r num"><span className={p.condition < 85 ? 'bad' : 'ok'}>{Math.round(p.condition)}%</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Fit>
          </div>
        </Sheet>
      )}

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
