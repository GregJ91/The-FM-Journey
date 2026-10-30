import { useState } from 'react';
import { shortName } from '../../game/ratings';
import type { ManMark, Often, Player, PlayerInstr, Pos, Tactics } from '../../game/types';

type OftenKey = 'runs' | 'longShots' | 'throughBalls' | 'closing' | 'tackling';
type FlagKey = 'tight' | 'holdUp' | 'freeRole';

const OFTEN: [OftenKey, string, [string, string, string]][] = [
  ['runs', 'Forward runs', ['Rarely', 'Mixed', 'Often']],
  ['longShots', 'Long shots', ['Rarely', 'Mixed', 'Often']],
  ['throughBalls', 'Through balls', ['Rarely', 'Mixed', 'Often']],
  ['closing', 'Closing down', ['Rarely', 'Mixed', 'Often']],
  ['tackling', 'Tackling', ['Easy', 'Normal', 'Hard']],
];
const FLAGS: [FlagKey, string, (pos: Pos) => boolean][] = [
  ['tight', 'Tight marking', () => true],
  ['holdUp', 'Hold up ball', (pos) => pos === 'ST' || pos === 'AMC'],
  ['freeRole', 'Free role', (pos) => pos !== 'DC' && pos !== 'DL' && pos !== 'DR'],
];

/** The instructions for one slot of the current formation, with `patch` applied (dropped when back to defaults). */
export function setInstrIn(t: Tactics, slot: number, patch: Partial<PlayerInstr>): PlayerInstr[] {
  const rest = (t.instr ?? []).filter((i) => !(i.slot === slot && i.f === t.formation));
  const cur = (t.instr ?? []).find((i) => i.slot === slot && i.f === t.formation) ?? { f: t.formation, slot };
  const next = { ...cur, ...patch };
  const empty = !next.runs && !next.longShots && !next.throughBalls && !next.closing && !next.tackling && !next.tight && !next.holdUp && !next.freeRole;
  return empty ? rest : [...rest, next];
}

/** CM 01/02 player instructions for one position. */
export function InstructionsPanel({ instr, pos, name, onChange }: { instr?: PlayerInstr; pos: Pos; name: string; onChange: (patch: Partial<PlayerInstr>) => void }) {
  if (pos === 'GK') return <div className="empty">Goalkeepers have no instructions.</div>;
  return (
    <div className="col instr" style={{ gap: 10 }}>
      <div className="small muted">Instructions for <b>{name}</b> ({pos}). They stay with this position in this formation.</div>
      {OFTEN.map(([k, label, opts]) => (
        <div key={k} className="instr-row">
          <span>{label}</span>
          <div className="seg">
            {([-1, 0, 1] as Often[]).map((v, j) => <button key={v} className={(instr?.[k] ?? 0) === v ? 'on' : ''} onClick={() => onChange({ [k]: v })}>{opts[j]}</button>)}
          </div>
        </div>
      ))}
      <div className="instr-flags">
        {FLAGS.filter(([, , ok]) => ok(pos)).map(([k, label]) => (
          <button key={k} className={`btn sm ${instr?.[k] ? 'primary' : ''}`} onClick={() => onChange({ [k]: !instr?.[k] })}>{instr?.[k] ? '✓ ' : ''}{label}</button>
        ))}
      </div>
      <div className="small muted">Forward runs and a free role get him into the attack but he tracks back less. Closing down and tight marking help defend but tire him. Hard tackling wins the ball more but means more fouls and cards.</div>
    </div>
  );
}

/** Man-marking: pick one of yours to follow one of theirs everywhere (up to three pairs). */
export function ManMarking({ mine, theirs, marks, onChange }: { mine: Player[]; theirs: Player[]; marks: ManMark[]; onChange: (marks: ManMark[]) => void }) {
  const free = mine.filter((p) => p.pos !== 'GK' && !marks.some((m) => m.marker === p.id));
  const open = theirs.filter((p) => p.pos !== 'GK' && !marks.some((m) => m.target === p.id));
  const [marker, setMarker] = useState<number | ''>('');
  const [target, setTarget] = useState<number | ''>('');
  const nameOf = (id: number, list: Player[]) => { const p = list.find((x) => x.id === id); return p ? shortName(p) : '?'; };
  return (
    <div className="col" style={{ gap: 8 }}>
      {marks.map((m) => (
        <div key={m.marker} className="row mark-row">
          <b className="ellipsis" style={{ flex: 1 }}>{nameOf(m.marker, mine)} <span className="muted">marks</span> {nameOf(m.target, theirs)}</b>
          <button className="btn sm" onClick={() => onChange(marks.filter((x) => x !== m))}>Remove</button>
        </div>
      ))}
      {marks.length < 3 && (
        <div className="row" style={{ gap: 6 }}>
          <select className="input" style={{ flex: 1 }} value={marker} onChange={(e) => setMarker(e.target.value === '' ? '' : Number(e.target.value))}>
            <option value="">Your player…</option>
            {free.map((p) => <option key={p.id} value={p.id}>{p.pos} {shortName(p)}</option>)}
          </select>
          <select className="input" style={{ flex: 1 }} value={target} onChange={(e) => setTarget(e.target.value === '' ? '' : Number(e.target.value))}>
            <option value="">…marks</option>
            {open.map((p) => <option key={p.id} value={p.id}>{p.pos} {shortName(p)}</option>)}
          </select>
          <button className="btn sm primary" disabled={marker === '' || target === ''} onClick={() => { onChange([...marks, { marker: marker as number, target: target as number }]); setMarker(''); setTarget(''); }}>Add</button>
        </div>
      )}
      <div className="small muted">A marker follows his man everywhere and gives up some of his own game. How well it works depends on the marker's Marking, Positioning and Pace against the other player's Dribbling, Off the Ball and Pace.</div>
    </div>
  );
}
