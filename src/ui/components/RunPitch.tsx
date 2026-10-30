import { useEffect, useRef, useState } from 'react';
import { ratingAt } from '../../game/ratings';
import type { Player, Pos, Run } from '../../game/types';

export type ArrowMode = 'off' | 'run' | 'ball';
type Slot = { pos: Pos; x: number; y: number };

/** Formation coordinates (x forward, y across) → % from the top / left of the pitch box. */
const spot = (x: number, y: number) => ({ top: 93 - (x - 5) * (86 / 79), left: 9 + y * 0.82 });

/** The run arrows box: off, run, run with the ball, and clear. */
export function RunArrowsBox({ mode, onMode, onClear }: { mode: ArrowMode; onMode: (m: ArrowMode) => void; onClear?: () => void }) {
  return (
    <div className="runs-box">
      <span className="runs-t">Run arrows</span>
      <div className="seg">
        {([['off', 'Off'], ['run', 'Run'], ['ball', 'With ball']] as const).map(([k, l]) => <button key={k} className={mode === k ? 'on' : ''} onClick={() => onMode(k)}>{l}</button>)}
      </div>
      {onClear && <button className="btn sm" onClick={onClear}>Clear</button>}
    </div>
  );
}

/**
 * CM 01/02-style tactics pitch: a box per player and his run arrow. In arrow mode, drag from a player to where he
 * should run (or tap him, then the spot; tap him again to remove it). Read-only when `onRun` is left out.
 */
export function RunPitch({
  slots, players, runs, mode = 'off', selected, onTapSlot, onRun, warn, showRating = true, hint, className = '',
}: {
  slots: Slot[];
  players: (Player | null)[];
  runs: Run[];
  mode?: ArrowMode;
  selected?: number | null;
  onTapSlot?: (i: number) => void;
  onRun?: (slot: number, to: { x: number; y: number } | null) => void;
  warn?: (i: number) => boolean;
  showRating?: boolean;
  hint?: string;
  className?: string;
}) {
  const pitchRef = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ slot: number; x: number; y: number; moved: boolean } | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = pitchRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => { setArmed(null); setDrag(null); }, [mode]);
  const drawing = mode !== 'off' && !!onRun;
  const shown = runs.filter((r) => players[r.slot]);

  const toPitch = (cx: number, cy: number) => {
    const r = pitchRef.current!.getBoundingClientRect();
    const top = ((cy - r.top) / r.height) * 100;
    const left = ((cx - r.left) / r.width) * 100;
    return { x: Math.max(0, Math.min(100, 5 + (93 - top) * (79 / 86))), y: Math.max(0, Math.min(100, (left - 9) / 0.82)) };
  };
  const far = (slot: number, to: { x: number; y: number }) => Math.hypot(to.x - slots[slot].x, to.y - slots[slot].y) >= 7;
  const pitchUp = (e: React.PointerEvent) => {
    if (!drawing) return;
    const to = toPitch(e.clientX, e.clientY);
    if (drag) {
      if (drag.moved) { if (far(drag.slot, to)) onRun!(drag.slot, to); setArmed(null); }
      else if (armed === drag.slot) { onRun!(drag.slot, null); setArmed(null); } // tap him again: no run
      else setArmed(drag.slot);
      setDrag(null);
    } else if (armed !== null) {
      if (far(armed, to)) onRun!(armed, to);
      setArmed(null);
    }
  };
  const arrow = (from: { x: number; y: number }, to: { x: number; y: number }, ball: boolean | undefined, key: string | number, ghost?: boolean) => {
    const a = spot(from.x, from.y);
    const b = spot(to.x, to.y);
    const [x1, y1, x2, y2] = [(a.left / 100) * size.w, (a.top / 100) * size.h, (b.left / 100) * size.w, (b.top / 100) * size.h];
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const head = (d: number) => `${x2 - 11 * Math.cos(ang + d)},${y2 - 11 * Math.sin(ang + d)}`;
    const col = ball ? '#ffffff' : '#ffe866';
    const [ex, ey] = [x2 - 6 * Math.cos(ang), y2 - 6 * Math.sin(ang)];
    return (
      <g key={key} opacity={ghost ? 0.6 : 1}>
        <line x1={x1} y1={y1} x2={ex} y2={ey} stroke="rgba(0,0,0,.45)" strokeWidth={5} strokeLinecap="round" />
        <line x1={x1} y1={y1} x2={ex} y2={ey} stroke={col} strokeWidth={3} strokeDasharray={ball ? undefined : '7 5'} strokeLinecap="round" />
        <polygon points={`${x2},${y2} ${head(0.45)} ${head(-0.45)}`} fill={col} stroke="rgba(0,0,0,.45)" strokeWidth={1} />
      </g>
    );
  };

  return (
    <>
      <div
        ref={pitchRef}
        className={`cm-pitch ${drawing ? 'drawing' : ''} ${className}`}
        onPointerMove={(e) => { if (!drag) return; const to = toPitch(e.clientX, e.clientY); setDrag({ ...drag, ...to, moved: drag.moved || far(drag.slot, to) }); }}
        onPointerUp={pitchUp}
        onPointerCancel={() => setDrag(null)}
      >
        <svg className="cm-runs" width={size.w} height={size.h}>
          {shown.map((r) => arrow(slots[r.slot], r, r.ball, r.slot))}
          {drag?.moved && arrow(slots[drag.slot], drag, mode === 'ball', 'drag', true)}
        </svg>
        {slots.map((s, i) => {
          const p = players[i];
          const { top, left } = spot(s.x, s.y);
          return (
            <button
              key={i}
              className={`cm-box ${selected === i || armed === i ? 'sel' : ''} ${p && warn?.(i) ? 'warn' : ''}`}
              style={{ top: `${top}%`, left: `${left}%` }}
              onClick={() => { if (!drawing) onTapSlot?.(i); }}
              onPointerDown={(e) => {
                if (!drawing || !p) return;
                e.preventDefault();
                pitchRef.current?.setPointerCapture(e.pointerId);
                setDrag({ slot: i, ...toPitch(e.clientX, e.clientY), moved: false });
              }}
            >
              <i>{p?.shirt ?? i + 1}</i>{p ? p.last : s.pos}
              {p && showRating && <em className="cm-box-r">{Math.round(ratingAt(p, s.pos))}</em>}
            </button>
          );
        })}
      </div>
      {(hint !== undefined || drawing) && (
        <div className="small muted" style={{ textAlign: 'center', padding: '0 0 6px' }}>
          {!drawing ? hint
            : armed !== null ? 'Now tap where he should run to. Tap him again to remove his run.'
            : `Drag from a player to where he should run${mode === 'ball' ? ' with the ball' : ''}, or tap him and then the spot.`}
        </div>
      )}
    </>
  );
}

/** Replace (or remove) the run for one slot of `formation`, keeping every other arrow. */
export function setRunIn(runs: Run[] | undefined, formation: string, slot: number, to: { x: number; y: number } | null, ball: boolean): Run[] {
  const rest = (runs ?? []).filter((r) => !(r.slot === slot && r.f === formation));
  return to ? [...rest, { f: formation, slot, x: Math.round(to.x), y: Math.round(to.y), ball: ball || undefined }] : rest;
}
