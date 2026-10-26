// Builds a UI colour theme from a club's two kit colours, keeping text readable
// whatever the kit (white shirts, black shirts, two light colours, etc.).

type RGB = [number, number, number];

function rgb(hex: string): RGB {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
}

function hex([r, g, b]: RGB) {
  return '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
}

/** Relative luminance (WCAG), 0 = black, 1 = white. */
export function luminance(c: string) {
  const [r, g, b] = rgb(c).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function mix(a: string, b: string, t: number) {
  const x = rgb(a);
  const y = rgb(b);
  return hex([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * t) as RGB);
}

function saturation(c: string) {
  const [r, g, b] = rgb(c);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

const INK = '#15120f';
const WHITE = '#ffffff';

/** Pick whichever of ink or white has the higher WCAG contrast ratio against c. */
function inkOn(c: string) {
  const l = luminance(c);
  const vsWhite = 1.05 / (l + 0.05);
  const vsInk = (l + 0.05) / (luminance(INK) + 0.05);
  return vsInk >= vsWhite ? INK : WHITE;
}

export interface Theme {
  [cssVar: string]: string;
}

export function clubTheme(colors: [string, string]): Theme {
  const [p, s] = colors;
  const isWhite = (c: string) => luminance(c) > 0.85;
  const isBlack = (c: string) => luminance(c) < 0.03;

  // Main team colour for big surfaces (header, Continue): primary unless it's white
  const team = isWhite(p) ? (isWhite(s) ? INK : s) : p;

  // Highlight for selected states on light surfaces: must not be near-white
  const candidates = [p, s].filter((c) => !isWhite(c));
  const hl = candidates.length
    ? candidates.sort((a, b) => saturation(b) - saturation(a) || luminance(b) - luminance(a))[0]
    : INK;

  // Highlight on the dark tab bar: must not be near-black
  const lightish = [p, s].filter((c) => !isBlack(c) && luminance(c) > 0.06);
  const hld = lightish.length ? lightish.sort((a, b) => saturation(b) - saturation(a) || luminance(b) - luminance(a))[0] : '#c6f432';

  const other = team === p ? s : p;
  const deep = mix(team, INK, isBlack(team) ? 0 : 0.62);

  return {
    '--team': team,
    '--team-ink': inkOn(team),
    '--team-2': other,
    '--team-deep': deep,
    '--hl': hl,
    '--hl-ink': inkOn(hl),
    '--hld': hld,
    '--hld-ink': inkOn(hld),
    '--tint': mix(hl, '#fffdf8', 0.82),
    '--bg': mix(team, '#f4f0e6', isBlack(team) ? 0.9 : 0.9),
  };
}

const KEYS = ['--team', '--team-ink', '--team-2', '--team-deep', '--hl', '--hl-ink', '--hld', '--hld-ink', '--tint', '--bg'];

export function applyTheme(t: Theme | null) {
  const root = document.documentElement.style;
  for (const k of KEYS) {
    if (t && t[k]) root.setProperty(k, t[k]);
    else root.removeProperty(k);
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t ? t['--team'] : '#14110F');
}
