// International tournaments: World Cup, European Championship, Copa América, Africa Cup of Nations, Asian Cup.
// National teams are picked from the real and generated players in the world. Matches are simulated
// from team strength (not with the full match engine): players win caps, score goals, can get injured,
// and are away from their club while their country is still in the tournament.
import { INTL_COMPS, NATION_DEFS, type IntlCompDef } from './data/world';
import { addDays, diffDays } from './dates';
import { sendMessage } from './inbox';
import { randomInjury } from './match';
import { fullName, overall } from './ratings';
import { chance, normal, rand, shuffle, weighted } from './rng';
import type { GameState, IntlMatch, IntlTournament, Player } from './types';

const SQUAD_SIZE = 26;
const ANNOUNCE_DAYS = 10;

const SHOOT: Record<string, number> = { ST: 4, AMC: 3, AML: 3, AMR: 3, ML: 1.5, MR: 1.5, MC: 1.4, DM: 0.6, DL: 0.4, DR: 0.4, DC: 0.5, GK: 0 };

export function nationName(code: string) {
  return NATION_DEFS[code]?.name ?? code;
}

function editionStart(def: IntlCompDef, year: number) {
  return `${year}-${def.startByYear?.[year] ?? def.start}`;
}

function isEditionYear(def: IntlCompDef, year: number) {
  return year >= def.first && (year - def.first) % def.every === 0;
}

/** Upcoming tournaments (for the Competitions screen). */
export function upcomingTournaments(g: GameState, n = 4) {
  const y = Number(g.date.slice(0, 4));
  const out: { def: IntlCompDef; year: number; start: string }[] = [];
  for (let year = y; year <= y + 6; year++) {
    for (const def of INTL_COMPS) {
      if (!isEditionYear(def, year)) continue;
      const start = editionStart(def, year);
      if (start >= g.date && !(g.intl ?? []).some((t) => t.comp === def.id && t.year === year)) out.push({ def, year, start });
    }
  }
  return out.sort((a, b) => (a.start < b.start ? -1 : 1)).slice(0, n);
}

// ---------- Teams ----------

interface Selection { squad: Player[]; xi: Player[]; strength: number }

/** Best squad for a nation: the best keepers and outfield players of that nationality at clubs. */
function selectSquad(code: string, pool: Record<string, Player[]>): Selection {
  const base = NATION_DEFS[code]?.level ?? 60;
  const all = (pool[code] ?? []).filter((p) => !p.injury && !p.away).sort((a, b) => overall(b) - overall(a));
  const gks = all.filter((p) => p.pos === 'GK').slice(0, 3);
  const out = all.filter((p) => p.pos !== 'GK').slice(0, SQUAD_SIZE - gks.length);
  const squad = [...gks, ...out];
  const xi = [...gks.slice(0, 1), ...out.slice(0, 10)];
  // Places the game has no player good enough for are filled at the nation's usual level
  const vals: number[] = [];
  vals.push(gks[0] ? Math.max(overall(gks[0]), base - 4) : base - 2);
  for (let i = 0; i < 10; i++) vals.push(out[i] ? Math.max(overall(out[i]), base - 4) : base - 2);
  const strength = vals.reduce((s, x) => s + x, 0) / vals.length;
  return { squad, xi, strength };
}

function natPool(g: GameState) {
  const pool: Record<string, Player[]> = {};
  for (const p of Object.values(g.players)) {
    if (p.clubId === null || p.squad === 'youth') continue;
    (pool[p.nat] ??= []).push(p);
  }
  return pool;
}

// ---------- Draw & schedule ----------

function stageNames(n: number) {
  const all = ['Round of 32', 'Round of 16', 'Quarter-finals', 'Semi-finals', 'Final'];
  return all.slice(all.length - Math.log2(n));
}

/** Bracket positions so the top seeds can only meet late: [0, n-1, n/2-1, n/2, ...]. */
function seedOrder(n: number): number[] {
  if (n === 1) return [0];
  const prev = seedOrder(n / 2);
  return prev.flatMap((s) => [s, n - 1 - s]);
}

function createTournament(g: GameState, def: IntlCompDef, year: number) {
  const pool = natPool(g);
  const hosts = (def.hosts[year] ?? []).filter((h) => NATION_DEFS[h]);
  const sel: Record<string, Selection> = {};
  const candidates = Object.values(NATION_DEFS).filter((n) => def.quotas[n.conf]);
  for (const n of candidates) sel[n.code] = selectSquad(n.code, pool);
  if (!hosts.length) {
    // No announced host: the strongest nation of the main confederation hosts
    const main = Object.keys(def.quotas)[0];
    hosts.push(candidates.filter((n) => n.conf === main).sort((a, b) => sel[b.code].strength - sel[a.code].strength)[0].code);
  }
  // Qualification: hosts, then the strongest teams per confederation (with a little luck, like real qualifying)
  const teams: string[] = [...hosts];
  for (const [conf, places] of Object.entries(def.quotas)) {
    const already = teams.filter((t) => NATION_DEFS[t].conf === conf).length;
    const ranked = candidates
      .filter((n) => n.conf === conf && !teams.includes(n.code))
      .map((n) => ({ code: n.code, score: sel[n.code].strength + normal(0, 1.5) }))
      .sort((a, b) => b.score - a.score);
    teams.push(...ranked.slice(0, Math.max(0, places - already)).map((r) => r.code));
  }
  teams.length = Math.min(teams.length, def.teams);

  // Group draw: pots by strength, hosts head the first groups; avoid two teams from one confederation
  // in a group (except UEFA, up to two) where possible
  const nGroups = teams.length / 4;
  const potted = [...teams.filter((t) => !hosts.includes(t))].sort((a, b) => sel[b].strength - sel[a].strength);
  const pots: string[][] = [[...hosts, ...potted.slice(0, nGroups - hosts.length)]];
  for (let i = 1; i < 4; i++) pots.push(potted.slice(nGroups * i - hosts.length, nGroups * (i + 1) - hosts.length));
  let best: string[][] = [];
  let bestClash = Infinity;
  for (let attempt = 0; attempt < 80 && bestClash > 0; attempt++) {
    const groups: string[][] = pots[0].map((t) => [t]);
    if (attempt > 0) groups.splice(hosts.length, groups.length, ...shuffle(groups.slice(hosts.length)));
    for (let p = 1; p < 4; p++) {
      const pot = shuffle([...pots[p]]);
      pot.forEach((t, i) => groups[i].push(t));
    }
    let clash = 0;
    for (const grp of groups) {
      const confs: Record<string, number> = {};
      for (const t of grp) confs[NATION_DEFS[t].conf] = (confs[NATION_DEFS[t].conf] ?? 0) + 1;
      for (const [c, k] of Object.entries(confs)) clash += Math.max(0, k - (c === 'UEFA' ? 2 : 1));
    }
    if (clash < bestClash) { bestClash = clash; best = groups; }
  }

  const start = editionStart(def, year);
  const gap = teams.length === 48 ? 5 : 4;
  const koNames = stageNames(teams.length === 16 ? 8 : teams.length === 24 ? 16 : 32);
  const stages = [
    ...[0, 1, 2].map((i) => ({ name: `Group stage · Matchday ${i + 1}`, date: addDays(start, i * gap) })),
    ...koNames.map((name, i) => ({ name, date: addDays(start, 2 * gap + 5 + i * 4) })),
  ];
  const matches: IntlMatch[] = [];
  const md = [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[3, 0], [1, 2]]];
  best.forEach((grp, gi) => {
    md.forEach((pairs, r) => {
      for (const [a, b] of pairs) matches.push({ id: g.nextId++, date: stages[r].date, stage: r, group: gi, a: grp[a], b: grp[b] });
    });
  });
  const t: IntlTournament = {
    id: `${def.id}-${year}`, comp: def.id, name: `${def.name} ${year}`, short: def.short, color: def.color, year, hosts,
    teams, groups: best, matches, stages, stage: 0, out: [],
    squads: Object.fromEntries(teams.map((c) => [c, sel[c].squad.map((p) => p.id)])),
    xi: Object.fromEntries(teams.map((c) => [c, sel[c].xi.map((p) => p.id)])),
    strength: Object.fromEntries(teams.map((c) => [c, Math.round(sel[c].strength * 10) / 10])),
  };
  for (const c of teams) for (const p of sel[c].squad) p.away = t.name;
  g.intl = [...(g.intl ?? []), t].slice(-8);

  // Call-up news for the manager's players
  const mine = teams.flatMap((c) => sel[c].squad.filter((p) => p.clubId === g.userClubId).map((p) => `• ${fullName(p)} (${nationName(c)})`));
  sendMessage(g, {
    from: 'Media', kind: 'info', title: `${t.name}: squads announced`,
    body: `${teams.length} nations go to the ${t.name}${hosts.length ? `, hosted by ${hosts.map(nationName).join(', ')}` : ''}. It starts on ${start}.\n\n` +
      (mine.length ? `Your players called up:\n${mine.join('\n')}\n\nThey'll be away until their country is knocked out.` : 'None of your players were called up.') +
      `\n\nFavourites: ${[...teams].sort((a, b) => t.strength[b] - t.strength[a]).slice(0, 4).map(nationName).join(', ')}.`,
  });
}

// ---------- Matches ----------

function poisson(l: number) {
  const L = Math.exp(-l);
  let k = 0;
  let p = 1;
  do { k++; p *= rand(); } while (p > L);
  return k - 1;
}

function pickScorer(g: GameState, t: IntlTournament, code: string): number | null {
  const xi = (t.xi[code] ?? []).map((id) => g.players[id]).filter((p) => p && !p.injury);
  const opts: { id: number | null; w: number }[] = xi.map((p) => ({ id: p.id, w: (SHOOT[p.pos] ?? 1) * (0.5 + p.attrs.finishing / 20) }));
  // Players the game doesn't have (filled places) can score too
  const missing = Math.max(0, 11 - xi.length);
  if (missing) opts.push({ id: null, w: missing * 1.6 });
  return weighted(opts, (o) => o.w).id;
}

function playMatch(g: GameState, t: IntlTournament, m: IntlMatch, knockout: boolean) {
  const host = (c: string) => (t.hosts.includes(c) ? 2 : 0);
  const sa = t.strength[m.a] + host(m.a);
  const sb = t.strength[m.b] + host(m.b);
  const la = 1.2 * Math.exp((sa - sb) / 16);
  const lb = 1.2 * Math.exp((sb - sa) / 16);
  let ga = poisson(la);
  let gb = poisson(lb);
  m.scorers = [];
  const addGoals = (code: string, n: number, from: number, to: number) => {
    for (let i = 0; i < n; i++) m.scorers!.push({ nat: code, pid: pickScorer(g, t, code), min: Math.floor(from + rand() * (to - from)) });
  };
  addGoals(m.a, ga, 1, 91);
  addGoals(m.b, gb, 1, 91);
  if (knockout && ga === gb) {
    m.et = true;
    const ea = poisson(la * 0.33);
    const eb = poisson(lb * 0.33);
    addGoals(m.a, ea, 91, 121);
    addGoals(m.b, eb, 91, 121);
    ga += ea;
    gb += eb;
    if (ga === gb) {
      const aWins = chance(0.5 + (sa - sb) * 0.01);
      const loser = 2 + Math.floor(rand() * 3);
      m.pens = aWins ? [loser + 1, loser] : [loser, loser + 1];
    }
  }
  m.scorers.sort((x, y) => x.min - y.min);
  m.ga = ga;
  m.gb = gb;
  // Caps, goals, knocks and fatigue for the players involved
  for (const code of [m.a, m.b]) {
    const squad = (t.squads[code] ?? []).map((id) => g.players[id]).filter(Boolean);
    const xi = new Set(t.xi[code] ?? []);
    const subs = shuffle(squad.filter((p) => !xi.has(p.id))).slice(0, 3);
    for (const p of [...squad.filter((x) => xi.has(x.id)), ...subs]) {
      p.caps = (p.caps ?? 0) + 1;
      p.monthMins += xi.has(p.id) ? 90 : 25;
      p.condition = Math.min(p.condition, 78);
      if (xi.has(p.id) && chance(0.012)) {
        p.injury = randomInjury();
        p.away = undefined;
        t.xi[code] = (t.xi[code] ?? []).filter((id) => id !== p.id);
        if (p.clubId === g.userClubId) sendMessage(g, { from: 'Medical Team', kind: 'injury', title: `${fullName(p)} injured on international duty`, body: `${fullName(p)} picked up a ${p.injury.name.toLowerCase()} playing for ${nationName(code)} at the ${t.name} and is back at the club for treatment, out for around ${Math.ceil(p.injury.days / 7)} week(s).` });
        p.injury.reported = true;
      }
    }
  }
  for (const s of m.scorers) if (s.pid !== null && g.players[s.pid]) g.players[s.pid].intGoals = (g.players[s.pid].intGoals ?? 0) + 1;
}

export function matchWinner(m: IntlMatch) {
  if (m.ga === undefined || m.gb === undefined) return null;
  if (m.ga !== m.gb) return m.ga > m.gb ? m.a : m.b;
  if (m.pens) return m.pens[0] > m.pens[1] ? m.a : m.b;
  return null;
}

export interface GroupRow { nat: string; p: number; w: number; d: number; l: number; gf: number; ga: number; pts: number }

export function groupTable(t: IntlTournament, gi: number): GroupRow[] {
  const rows: Record<string, GroupRow> = {};
  for (const c of t.groups[gi]) rows[c] = { nat: c, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
  for (const m of t.matches) {
    if (m.group !== gi || m.ga === undefined || m.gb === undefined) continue;
    const a = rows[m.a];
    const b = rows[m.b];
    a.p++; b.p++;
    a.gf += m.ga; a.ga += m.gb; b.gf += m.gb; b.ga += m.ga;
    if (m.ga > m.gb) { a.w++; b.l++; a.pts += 3; } else if (m.gb > m.ga) { b.w++; a.l++; b.pts += 3; } else { a.d++; b.d++; a.pts++; b.pts++; }
  }
  return Object.values(rows).sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || t.strength[y.nat] - t.strength[x.nat]);
}

function eliminate(g: GameState, t: IntlTournament, code: string) {
  if (t.out.includes(code)) return;
  t.out.push(code);
  const back: string[] = [];
  for (const id of t.squads[code] ?? []) {
    const p = g.players[id];
    if (!p) continue;
    if (p.away === t.name) {
      p.away = undefined;
      if (p.clubId === g.userClubId) back.push(fullName(p));
    }
  }
  // Mid-season tournaments: tell the manager when players come back
  if (back.length && !t.winner) {
    const m = Number(g.date.slice(5, 7));
    if (m >= 8 || m <= 5) sendMessage(g, { from: 'Coaching Staff', kind: 'info', title: `${nationName(code)} out of the ${t.name}`, body: `Back from international duty and available again:\n${back.map((n) => '• ' + n).join('\n')}` });
  }
}

function advance(g: GameState, t: IntlTournament) {
  const cur = t.matches.filter((m) => m.stage === t.stage);
  if (cur.some((m) => m.ga === undefined)) return;
  t.stage++;
  if (t.stage === 3) {
    // Group stage over: top two plus the best third-placed teams
    const tables = t.groups.map((_, gi) => groupTable(t, gi));
    const koSize = t.teams.length === 16 ? 8 : t.teams.length === 24 ? 16 : 32;
    const rank = (rows: GroupRow[]) => [...rows].sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf);
    const withGroup = (pos: number) => rank(tables.map((tb, gi) => ({ ...tb[pos], gi }))) as (GroupRow & { gi: number })[];
    const firsts = withGroup(0);
    const seconds = withGroup(1);
    const thirds = withGroup(2).slice(0, koSize - firsts.length - seconds.length);
    const seeds = [...firsts, ...seconds, ...thirds];
    const qualified = new Set(seeds.map((s) => s.nat));
    for (const c of t.teams) if (!qualified.has(c)) eliminate(g, t, c);
    const order = seedOrder(koSize);
    const pairs: [GroupRow & { gi: number }, GroupRow & { gi: number }][] = [];
    for (let i = 0; i < order.length; i += 2) pairs.push([seeds[order[i]], seeds[order[i + 1]]]);
    // Avoid a rematch of a group game in the first knockout round
    for (let i = 0; i < pairs.length; i++) {
      if (pairs[i][0].gi !== pairs[i][1].gi) continue;
      for (let j = 0; j < pairs.length; j++) {
        if (j === i) continue;
        if (pairs[j][1].gi !== pairs[i][0].gi && pairs[i][1].gi !== pairs[j][0].gi) {
          [pairs[i][1], pairs[j][1]] = [pairs[j][1], pairs[i][1]];
          break;
        }
      }
    }
    pairs.forEach(([a, b], i) => t.matches.push({ id: g.nextId++, date: t.stages[3].date, stage: 3, tie: i, a: a.nat, b: b.nat }));
    return;
  }
  const winners = cur.sort((x, y) => (x.tie ?? 0) - (y.tie ?? 0)).map((m) => matchWinner(m)!);
  for (const m of cur) eliminate(g, t, m.a === matchWinner(m) ? m.b : m.a);
  if (winners.length === 1) {
    finish(g, t, cur[0]);
    return;
  }
  for (let i = 0; i + 1 < winners.length; i += 2) {
    t.matches.push({ id: g.nextId++, date: t.stages[t.stage].date, stage: t.stage, tie: i / 2, a: winners[i], b: winners[i + 1] });
  }
}

function finish(g: GameState, t: IntlTournament, final: IntlMatch) {
  t.winner = matchWinner(final)!;
  t.runnerUp = t.winner === final.a ? final.b : final.a;
  eliminate(g, t, t.runnerUp);
  eliminate(g, t, t.winner);
  // Winners get a morale lift
  for (const id of t.squads[t.winner] ?? []) if (g.players[id]) g.players[id].morale = Math.min(100, g.players[id].morale + 15);
  const scorers = topScorers(g, t, 1)[0];
  const mine = t.teams.flatMap((c) => (t.squads[c] ?? []).map((id) => g.players[id]).filter((p) => p && p.clubId === g.userClubId).map((p) => {
    const goals = t.matches.reduce((s, m) => s + (m.scorers ?? []).filter((x) => x.pid === p.id).length, 0);
    return `• ${fullName(p)} (${nationName(c)})${goals ? ` — ${goals} goal${goals > 1 ? 's' : ''}` : ''}${c === t.winner ? ' 🏆' : ''}`;
  }));
  sendMessage(g, {
    from: 'Media', kind: 'season', title: `🌍 ${nationName(t.winner)} win the ${t.name}!`,
    body: `${nationName(t.winner)} beat ${nationName(t.runnerUp)} ${final.ga}-${final.gb}${final.et ? ' after extra time' : ''}${final.pens ? ` (${final.pens[0]}-${final.pens[1]} on penalties)` : ''} in the final.` +
      (scorers ? `\n\nGolden Boot: ${scorers.name} (${nationName(scorers.nat)}), ${scorers.goals} goals.` : '') +
      (mine.length ? `\n\nYour players at the tournament:\n${mine.join('\n')}` : ''),
  });
}

export function topScorers(g: GameState, t: IntlTournament, n = 10) {
  const count: Record<number, { nat: string; goals: number }> = {};
  for (const m of t.matches) for (const s of m.scorers ?? []) if (s.pid !== null) (count[s.pid] ??= { nat: s.nat, goals: 0 }).goals++;
  return Object.entries(count)
    .map(([id, v]) => ({ id: Number(id), name: g.players[Number(id)] ? fullName(g.players[Number(id)]) : 'Unknown', ...v }))
    .sort((a, b) => b.goals - a.goals)
    .slice(0, n);
}

/** Run once per day, before the date moves on: announce squads, play today's matches, move rounds on. */
export function intlDay(g: GameState) {
  const year = Number(g.date.slice(0, 4));
  for (const def of INTL_COMPS) {
    for (const y of [year, year + 1]) {
      if (!isEditionYear(def, y)) continue;
      const start = editionStart(def, y);
      if (diffDays(start, g.date) === ANNOUNCE_DAYS && !(g.intl ?? []).some((t) => t.comp === def.id && t.year === y)) createTournament(g, def, y);
    }
  }
  for (const t of g.intl ?? []) {
    if (t.winner) continue;
    const today = t.matches.filter((m) => m.date === g.date && m.ga === undefined);
    for (const m of today) playMatch(g, t, m, m.stage >= 3);
    if (today.length) advance(g, t);
  }
}
