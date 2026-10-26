import { FORMATIONS } from '../../game/formations';
import { familiarity, ratingAt, shortName } from '../../game/ratings';
import type { Club, GameState } from '../../game/types';
import { textOn } from './Crest';

export function PitchLines({ vertical }: { vertical?: boolean }) {
  // Lines drawn for a vertical pitch (attacking upward) on a 68x105 viewBox, or horizontal 105x68
  if (vertical) {
    return (
      <svg className="lines" viewBox="0 0 68 105" preserveAspectRatio="none">
        <g fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="0.5">
          <rect x="1.5" y="1.5" width="65" height="102" />
          <line x1="1.5" y1="52.5" x2="66.5" y2="52.5" />
          <circle cx="34" cy="52.5" r="9.15" />
          <rect x="13.84" y="1.5" width="40.32" height="16.5" />
          <rect x="24.84" y="1.5" width="18.32" height="5.5" />
          <rect x="13.84" y="87" width="40.32" height="16.5" />
          <rect x="24.84" y="98" width="18.32" height="5.5" />
        </g>
      </svg>
    );
  }
  return (
    <svg className="lines" viewBox="0 0 105 68" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <g fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.45">
        <rect x="1" y="1" width="103" height="66" />
        <line x1="52.5" y1="1" x2="52.5" y2="67" />
        <circle cx="52.5" cy="34" r="9.15" />
        <rect x="1" y="13.84" width="16.5" height="40.32" />
        <rect x="1" y="24.84" width="5.5" height="18.32" />
        <rect x="87.5" y="13.84" width="16.5" height="40.32" />
        <rect x="98.5" y="24.84" width="5.5" height="18.32" />
        <rect x="-1" y="30.34" width="2" height="7.32" fill="rgba(255,255,255,0.9)" />
        <rect x="104" y="30.34" width="2" height="7.32" fill="rgba(255,255,255,0.9)" />
      </g>
    </svg>
  );
}

export function FormationPitch({
  g, club, lineup, selected, onSlot, height = 420, compact,
}: {
  g: GameState;
  club: Club;
  lineup: (number | null)[];
  selected?: number | null;
  onSlot?: (i: number) => void;
  height?: number;
  compact?: boolean;
}) {
  const slots = FORMATIONS[club.tactics.formation];
  const [c1, c2] = club.colors;
  return (
    <div className="pitch vertical" style={{ height, width: '100%', maxWidth: height * 0.72, margin: '0 auto' }}>
      <PitchLines vertical />
      {slots.map((s, i) => {
        const id = lineup[i];
        const p = id !== null && id !== undefined ? g.players[id] : null;
        const fam = p ? familiarity(p, s.pos) : 1;
        const top = 91 - (s.x - 5) * (80 / 79);
        const left = s.y;
        return (
          <div
            key={i}
            className={`slot ${p ? '' : 'empty'} ${selected === i ? 'sel' : ''} ${p && fam < 0.9 ? 'warn' : ''}`}
            style={{ top: `${top}%`, left: `${left}%` }}
            onClick={() => onSlot?.(i)}
            title={p ? `${shortName(p)} — ${s.pos} rating ${Math.round(ratingAt(p, s.pos))}${fam < 0.9 ? ' (out of position)' : ''}` : `Empty ${s.pos} slot`}
          >
            <div className="dot" style={{ background: p ? c1 : undefined, color: textOn(c1), borderColor: '#15120f', boxShadow: `inset 0 0 0 3px ${c2}, 2px 2px 0 rgba(0,0,0,.35)` }}>
              {p ? Math.round(ratingAt(p, s.pos)) : '+'}
            </div>
            {!compact && <div className="nm">{p ? shortName(p) : s.pos}</div>}
            {compact && p && <div className="nm">{p.last}</div>}
            {!compact && <div className="pp">{s.pos}</div>}
          </div>
        );
      })}
    </div>
  );
}
