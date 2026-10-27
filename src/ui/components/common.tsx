import { useState, type ReactNode } from 'react';
import { compColor, compName } from '../../game/competitions';
import { fmtShort } from '../../game/dates';
import { POS_GROUP, overall, stars } from '../../game/ratings';
import type { Fixture, GameState, Player, Pos } from '../../game/types';
import { useUI } from '../context';
import { getGame } from '../../store';
import { isEligible } from '../../game/actions';
import { Crest } from './Crest';

export function Ovr({ value, lg }: { value: number; lg?: boolean }) {
  const tier = value >= 80 ? 'gold' : value >= 70 ? 'silver' : value >= 60 ? 'bronze' : 'plain';
  return <span className={`ovr ${tier} ${lg ? 'lg' : ''}`}>{value}</span>;
}

export function PosTag({ pos }: { pos: Pos }) {
  return <span className={`pos ${POS_GROUP[pos]}`}>{pos}</span>;
}

export function Stars({ ovr }: { ovr: number }) {
  const s = stars(ovr);
  const full = Math.floor(s);
  const half = s - full >= 0.5;
  return (
    <span className="stars" title={`${s} stars`}>
      {'★'.repeat(full)}
      {half ? '⯪' : ''}
      <span className="off">{'★'.repeat(5 - full - (half ? 1 : 0))}</span>
    </span>
  );
}

export function AttrVal({ v }: { v: number }) {
  const r = Math.round(v);
  const cls = r >= 16 ? 'a5' : r >= 13 ? 'a4' : r >= 10 ? 'a3' : r >= 6 ? 'a2' : 'a1';
  return <span className={`attr ${cls}`}>{r}</span>;
}

export function Spark({ values }: { values: number[] }) {
  if (!values.length) return <span className="muted small">—</span>;
  return (
    <span className="sparkline" title={values.map((v) => v.toFixed(1)).join(', ')}>
      {values.map((v, i) => (
        <div key={i} style={{ height: `${Math.max(3, (v - 4.5) * 3.4)}px`, background: v >= 7.5 ? 'var(--grass)' : v >= 6.5 ? '#a3c93a' : v >= 6 ? 'var(--yellow)' : 'var(--coral)' }} />
      ))}
    </span>
  );
}

export function CondBar({ v }: { v: number }) {
  const c = v >= 85 ? 'var(--grass)' : v >= 70 ? 'var(--yellow)' : 'var(--coral)';
  return (
    <span className="mini-bar" title={`${Math.round(v)}%`}>
      <div style={{ width: `${v}%`, background: c }} />
    </span>
  );
}

function notRegistered(p: Player) {
  const g = getGame();
  if (!g || p.clubId !== g.userClubId || !g.registration?.league) return false;
  const league = g.leagues.find((l) => l.clubIds.includes(g.userClubId));
  return !!league && !isEligible(g, p, league.id);
}

export function StatusIcons({ p }: { p: Player }) {
  return (
    <>
      {p.injury && <span className="status-ico" title={`${p.injury.name} (${p.injury.days}d)`}>🩹</span>}
      {p.suspended > 0 && <span className="status-ico" title={`Suspended ${p.suspended} match(es)`}>🟥</span>}
      {p.away && <span className="status-ico" title={`Away at the ${p.away}`}>✈️</span>}
      {notRegistered(p) && <span className="status-ico" title="Not registered for the league: can't play league games">🚫</span>}
      {p.listed && <span className="status-ico" title="Transfer listed">🏷️</span>}
    </>
  );
}

export function OvrChange({ v }: { v: number }) {
  if (!v) return null;
  return <span className="small bold" style={{ color: v > 0 ? 'var(--good)' : 'var(--bad)', marginLeft: 4 }}>{v > 0 ? `▲${v}` : `▼${-v}`}</span>;
}

export function Card({ title, tag, tagColor, right, children, className = '', style }: { title?: ReactNode; tag?: string; tagColor?: string; right?: ReactNode; children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <section className={`card ${className}`} style={style}>
      {(title || right) && (
        <div className="card-h">
          {tag && <span className="tag" style={tagColor ? ({ '--tag': tagColor } as React.CSSProperties) : undefined}>{tag}</span>}
          {title && <h3>{title}</h3>}
          {right && <div className="right">{right}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function ClubLink({ g, id, size = 20, bold }: { g: GameState; id: number; size?: number; bold?: boolean }) {
  const ui = useUI();
  const c = g.clubs[id];
  return (
    <span className="row" style={{ gap: 6, cursor: 'pointer', minWidth: 0, fontWeight: bold ? 800 : undefined }} onClick={(e) => { e.stopPropagation(); ui.go('club', id); }}>
      <Crest club={c} size={size} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
    </span>
  );
}

export function FixtureRow({ g, f, showComp = true, compact }: { g: GameState; f: Fixture; showComp?: boolean; compact?: boolean }) {
  const ui = useUI();
  const me = g.userClubId;
  const r = f.result;
  let res: 'W' | 'D' | 'L' | null = null;
  if (r && (f.home === me || f.away === me)) {
    const mine = f.home === me ? r.hg : r.ag;
    const theirs = f.home === me ? r.ag : r.hg;
    res = mine > theirs ? 'W' : mine < theirs ? 'L' : r.pens ? ((f.home === me ? r.pens[0] > r.pens[1] : r.pens[1] > r.pens[0]) ? 'W' : 'L') : 'D';
  }
  const h = g.clubs[f.home];
  const a = g.clubs[f.away];
  return (
    <div className="fx">
      <div className="when">
        {fmtShort(f.date)}
        {showComp && (
          <div className="row" style={{ gap: 4, marginTop: 2 }}>
            <span className="comp-dot" style={{ background: compColor(g, f.comp) }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 48 }} title={`${compName(g, f.comp)}${f.roundName ? ' · ' + f.roundName : ''}`}>{f.roundName ?? compName(g, f.comp)}</span>
          </div>
        )}
      </div>
      <div className={`h ${f.home === me ? 'me' : ''}`} onClick={() => ui.go('club', h.id)} style={{ cursor: 'pointer' }}>
        <span title={h.name}>{compact || h.name.length > 13 ? h.short : h.name}</span>
        <Crest club={h} size={20} />
      </div>
      <div className={`score ${r ? '' : 'tbd'}`}>{r ? `${r.hg} - ${r.ag}` : 'v'}{r?.agg && <span className="agg">agg {r.agg[0]}-{r.agg[1]}</span>}</div>
      <div className={`a ${f.away === me ? 'me' : ''}`} onClick={() => ui.go('club', a.id)} style={{ cursor: 'pointer' }}>
        <Crest club={a} size={20} />
        <span title={a.name}>{compact || a.name.length > 13 ? a.short : a.name}</span>
      </div>
      <div>{res && <span className={`res ${res}`}>{res}</span>}{r?.pens && <span className="small muted" title="penalties"> p</span>}</div>
    </div>
  );
}

export function Meter({ value }: { value: number }) {
  return (
    <div className="meter">
      <div className="needle" style={{ left: `${value}%` }} />
    </div>
  );
}

/** Sortable column state for tables. */
export function useSort<K extends string>(initial: K, dir: 1 | -1 = -1) {
  const [state, setState] = useState<{ key: K; dir: 1 | -1 }>({ key: initial, dir });
  const toggle = (key: K) => setState((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: -1 }));
  const Th = ({ k, children, className = '' }: { k: K; children: ReactNode; className?: string }) => (
    <th className={`sortable ${className}`} onClick={() => toggle(k)}>
      {children}
      {state.key === k ? (state.dir === -1 ? ' ▾' : ' ▴') : ''}
    </th>
  );
  function sort<T>(rows: T[], get: Record<K, (r: T) => number | string>) {
    const f = get[state.key];
    return [...rows].sort((a, b) => {
      const x = f(a);
      const y = f(b);
      return (x < y ? -1 : x > y ? 1 : 0) * state.dir;
    });
  }
  return { Th, sort, state };
}

/** Bottom sheet used for pickers, player profiles and detail views. */
export function Sheet({ title, onClose, right, children }: { title?: ReactNode; onClose: () => void; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="sheet-wrap" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grab" />
        {title !== undefined && (
          <div className="sheet-h">
            <h3 className="ellipsis">{title}</h3>
            <div className="right row">{right}<button className="btn sm" onClick={onClose}>Close</button></div>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/** Tappable player row: OVR, position, name with a sub line, and a right-hand value. */
export function PlayerRow({ p, sub, end, endSub, ovr, onClick, me }: { p: Player; sub?: ReactNode; end?: ReactNode; endSub?: ReactNode; ovr?: number; onClick?: () => void; me?: boolean }) {
  const ui = useUI();
  return (
    <div className={`li ${me ? 'me' : ''}`} onClick={onClick ?? (() => ui.openPlayer(p.id))}>
      <Ovr value={ovr ?? overall(p)} />
      <PosTag pos={p.pos} />
      <div className="main">
        <div className="t">{p.first ? `${p.first[0]}. ${p.last}` : p.last}<StatusIcons p={p} /></div>
        {sub !== undefined && <div className="s">{sub}</div>}
      </div>
      {(end !== undefined || endSub !== undefined) && (
        <div className="end">
          {end !== undefined && <div className="v">{end}</div>}
          {endSub !== undefined && <div className="s">{endSub}</div>}
        </div>
      )}
    </div>
  );
}

/** A button that needs a second tap to confirm (browser confirm() dialogs aren't available everywhere). */
export function ConfirmButton({ className, label, confirmLabel, onConfirm }: { className?: string; label: ReactNode; confirmLabel: string; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  return (
    <button className={className} onClick={() => { if (armed) { setArmed(false); onConfirm(); } else { setArmed(true); setTimeout(() => setArmed(false), 4000); } }}>
      {armed ? confirmLabel : label}
    </button>
  );
}
