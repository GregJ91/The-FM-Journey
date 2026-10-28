// The manager's own profile: eight FM-style attributes (1-20) that drift each month towards how you
// actually manage. Each one has a small, real effect on the game.
import { age, fullName } from './ratings';
import { sendMessage } from './inbox';
import type { LiveMatch } from './match';
import type { GameState, ManagerAttr, ManagerProfile, Player } from './types';

export const MANAGER_ATTRS: { key: ManagerAttr; label: string; how: string; effect: string }[] = [
  { key: 'attacking', label: 'Attacking', how: 'Play on the front foot: attacking mentality and shouts, scoring goals.', effect: 'Your attack is a little sharper in matches.' },
  { key: 'defending', label: 'Defending', how: 'Sit deeper: defensive mentality and shouts, keeping clean sheets.', effect: 'Your defence is a little tighter in matches.' },
  { key: 'tactical', label: 'Tactical Knowledge', how: 'Change tactics and formations during matches and make substitutions.', effect: 'Your midfield control is a little better in matches.' },
  { key: 'youth', label: 'Working with Youngsters', how: 'Give under-21s minutes and promote academy players.', effect: 'Your young players develop faster.' },
  { key: 'motivating', label: 'Motivating', how: 'Keep squad morale high and use shouts to lift the team.', effect: 'Morale boosts in matches and press conferences go further.' },
  { key: 'manManagement', label: 'Man Management', how: 'Deal with unhappy players and contract talks.', effect: 'Difficult conversations go better more often.' },
  { key: 'negotiating', label: 'Negotiating', how: 'Do deals in the transfer market and haggle over offers.', effect: 'Selling clubs accept slightly lower bids.' },
  { key: 'media', label: 'Media Handling', how: 'Face the press before big games.', effect: 'Mind games work more often and backfire less.' },
];

const START = 10;
const MONTHLY_FADE = 0.05; // unused attributes drift down slowly
const GAIN_PER_POINT = 0.08;
const MAX_GAIN = 0.6;

export function defaultProfile(): ManagerProfile {
  const attrs = Object.fromEntries(MANAGER_ATTRS.map((a) => [a.key, START])) as Record<ManagerAttr, number>;
  const tally = Object.fromEntries(MANAGER_ATTRS.map((a) => [a.key, 0])) as Record<ManagerAttr, number>;
  return { skills: attrs, tally, last: {} };
}

export function managerProfile(g: GameState): ManagerProfile {
  return (g.managerProfile ??= defaultProfile());
}

/** Record something the manager did that leans towards an attribute. */
export function note(g: GameState, key: ManagerAttr, points = 1) {
  managerProfile(g).tally[key] += points;
}

/** -0.9 (attribute 1) .. +1 (attribute 20): how far above or below an average manager. */
export function mgr(g: GameState, key: ManagerAttr) {
  return ((g.managerProfile?.skills[key] ?? START) - START) / 10;
}

/** A one-line description of the manager's style from their strongest attributes. */
export function managerStyle(g: GameState) {
  const a = (g.managerProfile ?? defaultProfile()).skills;
  const top = [...MANAGER_ATTRS].sort((x, y) => a[y.key] - a[x.key]);
  if (a[top[0].key] < START + 1) return 'All-rounder';
  const names: Record<ManagerAttr, string> = {
    attacking: 'Attack-minded', defending: 'Pragmatist', tactical: 'Tactician', youth: 'Youth developer',
    motivating: 'Motivator', manManagement: "Players' manager", negotiating: 'Wheeler-dealer', media: 'Media darling',
  };
  return a[top[1].key] >= START + 1 ? `${names[top[0].key]} · ${names[top[1].key]}` : names[top[0].key];
}

// ---------- Tendencies ----------

/** In-match tactical changes by the user: mentality leanings and tinkering. */
export function noteTactics(g: GameState, mentality: number | undefined, changedShape: boolean) {
  if (mentality !== undefined) {
    if (mentality >= 1) note(g, 'attacking', 0.5);
    if (mentality <= -1) note(g, 'defending', 0.5);
    note(g, 'motivating', 0.2);
  }
  note(g, 'tactical', changedShape ? 0.6 : 0.3);
}

/** After the user's match: how the team played. */
export function noteMatch(g: GameState, m: LiveMatch) {
  const side = m.sides[0].clubId === g.userClubId ? 0 : m.sides[1].clubId === g.userClubId ? 1 : null;
  if (side === null) return;
  const s = m.sides[side];
  const gf = m.score[side];
  const ga = m.score[side === 0 ? 1 : 0];
  const men = s.tactics.mentality;
  if (men >= 1) note(g, 'attacking', 1);
  if (men <= -1) note(g, 'defending', 1);
  if (gf >= 3) note(g, 'attacking', 0.5);
  if (ga === 0) note(g, 'defending', 0.5);
}

export function noteSigning(g: GameState, fee: number, value: number) {
  note(g, 'negotiating', 1 + (fee < value ? 1 : 0));
}

// ---------- Monthly update ----------

function youngMinutes(g: GameState) {
  let pts = 0;
  for (const p of Object.values(g.players)) {
    if (p.clubId !== g.userClubId || p.squad === 'youth') continue;
    if (age(p, g.date) <= 21) pts += Math.min(1, p.monthMins / 300);
  }
  return pts;
}

/** 1st of the month: attributes move towards what the manager actually did last month. */
export function monthlyManager(g: GameState) {
  const prof = managerProfile(g);
  note(g, 'youth', youngMinutes(g));
  const squad = Object.values(g.players).filter((p: Player) => p.clubId === g.userClubId && p.squad === 'first');
  const morale = squad.length ? squad.reduce((s, p) => s + p.morale, 0) / squad.length : 50;
  if (morale >= 70) note(g, 'motivating', 1.5);
  else if (morale >= 60) note(g, 'motivating', 0.6);
  const changes: string[] = [];
  prof.last = {};
  for (const { key, label } of MANAGER_ATTRS) {
    const t = prof.tally[key];
    const delta = t > 0 ? Math.min(MAX_GAIN, t * GAIN_PER_POINT) : -MONTHLY_FADE;
    const before = prof.skills[key];
    prof.skills[key] = Math.max(1, Math.min(20, before + delta));
    prof.last[key] = Math.round((prof.skills[key] - before) * 100) / 100;
    if (Math.floor(prof.skills[key]) !== Math.floor(before)) changes.push(`${label}: ${Math.floor(before)} → ${Math.floor(prof.skills[key])}`);
    prof.tally[key] = 0;
  }
  if (changes.length) {
    sendMessage(g, {
      from: 'Assistant Manager', kind: 'development',
      title: 'Your manager profile has changed',
      body: `How you've been managing is shaping your reputation as a ${managerStyle(g).toLowerCase()}.\n\n${changes.join('\n')}\n\nSee the full profile on the Board screen.`,
    });
  }
}

/** Promoting an academy player to the first team counts towards working with youngsters. */
export function notePromotion(g: GameState, p: Player) {
  note(g, 'youth', 1.5);
  return fullName(p);
}
