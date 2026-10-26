import { useId } from 'react';
import { badgeFor, useBadgesVersion } from '../badges';
import type { Club, CrestPattern, CrestShape } from '../../game/types';

const SHAPE_PATHS: Record<CrestShape, string> = {
  shield: 'M50 4 L92 16 L90 58 C88 80 70 92 50 98 C30 92 12 80 10 58 L8 16 Z',
  circle: 'M50 4 A46 46 0 1 1 49.9 4 Z',
  diamond: 'M50 3 L95 50 L50 97 L5 50 Z',
  badge: 'M20 6 H80 Q94 6 94 20 V64 Q94 78 82 86 L50 98 L18 86 Q6 78 6 64 V20 Q6 6 20 6 Z',
};

function patternEls(pattern: CrestPattern, c2: string) {
  switch (pattern) {
    case 'stripes':
      return [18, 42, 66, 90].map((x) => <rect key={x} x={x - 6} y={0} width={12} height={100} fill={c2} />);
    case 'halves':
      return <rect x={50} y={0} width={50} height={100} fill={c2} />;
    case 'sash':
      return <polygon points="0,22 22,0 100,78 78,100" fill={c2} />;
    case 'hoops':
      return [20, 44, 68, 92].map((y) => <rect key={y} x={0} y={y - 6} width={100} height={12} fill={c2} />);
    case 'chevron':
      return <polygon points="0,30 50,62 100,30 100,50 50,82 0,50" fill={c2} />;
    default:
      return null;
  }
}

/** Is a colour light enough to need dark text? */
export function isLight(hex: string) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}

export function textOn(hex: string) {
  return isLight(hex) ? '#15120f' : '#ffffff';
}

export function CrestSvg({ name, short, colors, crest, size = 40 }: { name: string; short: string; colors: [string, string]; crest: Club['crest']; size?: number }) {
  const id = `cr${useId().replace(/:/g, '')}`;
  useBadgesVersion();
  const badge = badgeFor(name);
  if (badge) {
    return <img src={badge} width={size} height={size} alt={`${name} badge`} style={{ flex: 'none', objectFit: 'contain', display: 'block' }} draggable={false} />;
  }
  const [c1, c2] = colors;
  const letters = short.slice(0, 3);
  // initials badge colour contrasts with primary
  const badgeFill = isLight(c1) && isLight(c2) ? '#15120f' : isLight(c1) ? '#15120f' : '#ffffff';
  const badgeText = badgeFill === '#ffffff' ? '#15120f' : '#ffffff';
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`${name} crest`} style={{ flex: 'none' }}>
      <defs>
        <clipPath id={id}>
          <path d={SHAPE_PATHS[crest.shape]} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <rect width={100} height={100} fill={c1} />
        {patternEls(crest.pattern, c2)}
      </g>
      <path d={SHAPE_PATHS[crest.shape]} fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth={4} strokeLinejoin="round" />
      <rect x={18} y={38} width={64} height={26} rx={13} fill={badgeFill} />
      <text x={50} y={57.5} textAnchor="middle" fontFamily="'Inter Variable', sans-serif" fontWeight={800} letterSpacing={-0.5} fontSize={letters.length > 2 ? 18 : 21} fill={badgeText}>
        {letters}
      </text>
    </svg>
  );
}

export function Crest({ club, size = 40 }: { club: Club; size?: number }) {
  return <CrestSvg name={club.name} short={club.short} colors={club.colors} crest={club.crest} size={size} />;
}
