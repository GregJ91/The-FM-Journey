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

const INK = '#0a0c11';
const WHITE = '#ffffff';

/** Pick whichever of ink or white has the higher WCAG contrast ratio against c. */
function inkOn(c: string) {
  const l = luminance(c);
  const vsWhite = 1.05 / (l + 0.05);
  const vsInk = (l + 0.05) / (luminance(INK) + 0.05);
  return vsInk >= vsWhite ? INK : WHITE;
}

/** Darken c towards black until white text on it reads (luminance <= maxL). */
function darkTo(c: string, maxL: number) {
  let out = c;
  for (let t = 0.1; luminance(out) > maxL && t <= 1; t += 0.1) out = mix(c, INK, t);
  return out;
}

export interface Theme {
  [cssVar: string]: string;
}

export function clubTheme(colors: [string, string]): Theme {
  const [p, s] = colors;
  const isWhite = (c: string) => luminance(c) > 0.85;
  const isBlack = (c: string) => luminance(c) < 0.03;

  // Team colour for glows and gradients: the primary, unless it's white
  const team = isWhite(p) ? (isWhite(s) ? '#3b4252' : s) : p;
  const other = team === p ? s : p;

  // Accent for buttons and selected states on the dark UI: the most vivid kit
  // colour that is bright enough to read on near-black; very dark kits get lifted.
  const visible = [p, s].filter((c) => !isBlack(c) && luminance(c) > 0.07);
  let accent = visible.length
    ? visible.sort((a, b) => saturation(b) - saturation(a) || luminance(b) - luminance(a))[0]
    : mix(p, WHITE, 0.55);
  if (luminance(accent) < 0.07) accent = mix(accent, WHITE, 0.45);

  return {
    '--team': team,
    '--team-ink': inkOn(team),
    '--team-2': other,
    '--accent': accent,
    '--accent-ink': inkOn(accent),
    // Championship Manager-style title bars: a gradient in the club's colour, dark enough for white text
    '--cm-1': darkTo(team, 0.045),
    '--cm-2': darkTo(team, 0.16),
  };
}

const KEYS = ['--team', '--team-ink', '--team-2', '--accent', '--accent-ink', '--cm-1', '--cm-2'];

export function applyTheme(t: Theme | null) {
  const root = document.documentElement.style;
  for (const k of KEYS) {
    if (t && t[k]) root.setProperty(k, t[k]);
    else root.removeProperty(k);
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', '#0a0c11');
}
