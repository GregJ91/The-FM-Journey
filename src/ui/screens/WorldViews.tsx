import { useState } from 'react';
import { fmtShort } from '../../game/dates';
import { groupTable, matchWinner, nationName, nationSquad, topScorers, upcomingTournaments } from '../../game/intl';
import { NATION_DEFS } from '../../game/data/world';
import { cwcGroupTable } from '../../game/world';
import { winnerOf } from '../../game/match';
import { POS_GROUP, age, fullName } from '../../game/ratings';
import type { Cup, IntlMatch, IntlTournament, Player } from '../../game/types';
import { useGame } from '../../store';
import { useUI } from '../context';
import { Card, FixtureRow, PlayerRow, Sheet } from '../components/common';
import { Crest } from '../components/Crest';

const letter = (i: number) => String.fromCharCode(65 + i);

function Winner({ name, label, crest }: { name: string; label: string; crest?: React.ReactNode }) {
  return (
    <div className="card" style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.22), var(--surface))', borderColor: 'rgba(251,191,36,0.35)' }}>
      <div className="row"><span style={{ fontSize: 34 }}>🏆</span>{crest}<div><div className="small bold">{label}</div><h2 style={{ fontSize: 22 }}>{name}</h2></div></div>
    </div>
  );
}

/** Club World Cup: group tables and knockout rounds. */
export function CwcView({ cup }: { cup: Cup }) {
  const g = useGame();
  const ui = useUI();
  const me = g.userClubId;
  const [tab, setTab] = useState<'groups' | 'ko'>(cup.current >= 3 ? 'ko' : 'groups');
  const fx = g.fixtures.filter((f) => f.comp === cup.id);
  return (
    <>
      {cup.winner !== null && <Winner label={`${cup.name} ${cup.rounds[0].date.slice(0, 4)} winners`} name={g.clubs[cup.winner].name} crest={<Crest club={g.clubs[cup.winner]} size={46} />} />}
      <div className="small muted" style={{ marginBottom: 10 }}>32 clubs from six continents every four years, in June. Eight groups of four, then knockouts from the round of 16. Every match is at a neutral venue.</div>
      <div className="seg" style={{ marginBottom: 12 }}>
        <button className={tab === 'groups' ? 'on' : ''} onClick={() => setTab('groups')}>Groups</button>
        <button className={tab === 'ko' ? 'on' : ''} onClick={() => setTab('ko')}>Knockouts</button>
      </div>
      {tab === 'groups' && (cup.groups ?? []).map((_, gi) => (
        <Card key={gi} title={`Group ${letter(gi)}`} tag={cup.short} tagColor={cup.color}>
          <table className="t">
            <thead><tr><th>#</th><th>Club</th><th className="r">P</th><th className="r">GD</th><th className="r">Pts</th></tr></thead>
            <tbody>
              {cwcGroupTable(g, cup, gi).map((r, i) => (
                <tr key={r.clubId} className={`click ${i < 2 ? 'zone-up' : ''} ${r.clubId === me ? 'me' : ''}`} onClick={() => ui.go('club', r.clubId)}>
                  <td className="num bold">{i + 1}</td>
                  <td><span className="row" style={{ gap: 6 }}><Crest club={g.clubs[r.clubId]} size={18} /><span className="ellipsis" style={{ maxWidth: 150 }}>{g.clubs[r.clubId].name}</span></span></td>
                  <td className="r num">{r.p}</td>
                  <td className="r num">{r.gf - r.ga > 0 ? '+' : ''}{r.gf - r.ga}</td>
                  <td className="r num bold">{r.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {fx.filter((f) => f.round <= 3 && cup.groups![gi].includes(f.home)).map((f) => <FixtureRow key={f.id} g={g} f={f} showComp={false} compact />)}
        </Card>
      ))}
      {tab === 'ko' && cup.rounds.slice(3).map((r, i) => {
        const rf = fx.filter((f) => f.round === i + 4).sort((a, b) => (a.tie ?? 0) - (b.tie ?? 0));
        return (
          <Card key={r.name} title={r.name} tag={fmtShort(r.date)} tagColor="var(--muted)">
            {rf.map((f) => {
              const w = winnerOf(f);
              return (
                <div key={f.id} className="tie">
                  <FixtureRow g={g} f={f} showComp={false} />
                  {w !== null && f.result?.pens && <div className="through">{g.clubs[w].name} win on penalties</div>}
                </div>
              );
            })}
            {!rf.length && <div className="muted small">{cup.current < 3 ? 'After the group stage' : 'Draw after the previous round'}</div>}
          </Card>
        );
      })}
    </>
  );
}

function MatchLine({ m, t, onNation }: { m: IntlMatch; t: IntlTournament; onNation: (code: string) => void }) {
  const g = useGame();
  const played = m.ga !== undefined;
  const w = matchWinner(m);
  const mine = (code: string) => (t.squads[code] ?? []).some((id) => g.players[id]?.clubId === g.userClubId);
  const goals = (m.scorers ?? []).filter((s) => s.pid !== null && g.players[s.pid!]);
  return (
    <div className="tie">
      <div className="fx" style={{ gridTemplateColumns: '52px minmax(0,1fr) auto minmax(0,1fr) 0px' }}>
        <div className="when">{fmtShort(m.date)}</div>
        <div className={`h ${mine(m.a) ? 'me' : ''}`} style={{ fontWeight: w === m.a ? 800 : 600, cursor: 'pointer' }} onClick={() => onNation(m.a)}><span>{nationName(m.a)}</span></div>
        <div className={`score ${played ? '' : 'tbd'}`}>{played ? `${m.ga} - ${m.gb}` : 'v'}{m.pens && <span className="agg">{m.pens[0]}-{m.pens[1]} pens</span>}{m.et && !m.pens && <span className="agg">aet</span>}</div>
        <div className={`a ${mine(m.b) ? 'me' : ''}`} style={{ fontWeight: w === m.b ? 800 : 600, cursor: 'pointer' }} onClick={() => onNation(m.b)}><span>{nationName(m.b)}</span></div>
        <div />
      </div>
      {goals.length > 0 && <div className="through">⚽ {goals.map((s) => `${g.players[s.pid!].last} ${s.min}'`).join(', ')}</div>}
    </div>
  );
}

/** International tournament: groups, knockouts, top scorers and the manager's players. */
export function IntlView({ t }: { t: IntlTournament }) {
  const g = useGame();
  const ui = useUI();
  const [tab, setTab] = useState<'groups' | 'ko' | 'players'>(t.stage >= 3 ? 'ko' : 'groups');
  const [nation, setNation] = useState<string | null>(null);
  const mine = t.teams.flatMap((c) => (t.squads[c] ?? []).map((id) => g.players[id]).filter((p) => p && p.clubId === g.userClubId).map((p) => ({ p, c })));
  const goalsOf = (id: number) => t.matches.reduce((s, m) => s + (m.scorers ?? []).filter((x) => x.pid === id).length, 0);
  return (
    <>
      {t.winner && <Winner label={`${t.name} winners`} name={nationName(t.winner)} />}
      <div className="small muted" style={{ marginBottom: 10 }}>
        {t.teams.length} nations · hosts {t.hosts.map(nationName).join(', ')} · {t.stages[0].date} to {t.stages[t.stages.length - 1].date}. Squads are picked from the best players of each nationality in the game. Tap a nation to see its squad.
      </div>
      {nation && <NationSheet code={nation} t={t} onClose={() => setNation(null)} />}
      <div className="seg" style={{ marginBottom: 12 }}>
        <button className={tab === 'groups' ? 'on' : ''} onClick={() => setTab('groups')}>Groups</button>
        <button className={tab === 'ko' ? 'on' : ''} onClick={() => setTab('ko')}>Knockouts</button>
        <button className={tab === 'players' ? 'on' : ''} onClick={() => setTab('players')}>Players</button>
      </div>
      {tab === 'groups' && t.groups.map((_, gi) => (
        <Card key={gi} title={`Group ${letter(gi)}`} tag={t.short} tagColor={t.color}>
          <table className="t">
            <thead><tr><th>#</th><th>Nation</th><th className="r">P</th><th className="r">GD</th><th className="r">Pts</th></tr></thead>
            <tbody>
              {groupTable(t, gi).map((r, i) => (
                <tr key={r.nat} className={`click ${i < 2 ? 'zone-up' : i === 2 && t.teams.length > 16 ? 'zone-po' : ''}`} onClick={() => setNation(r.nat)}>
                  <td className="num bold">{i + 1}</td>
                  <td>{nationName(r.nat)} <span className="muted small">{t.strength[r.nat].toFixed(0)}</span></td>
                  <td className="r num">{r.p}</td>
                  <td className="r num">{r.gf - r.ga > 0 ? '+' : ''}{r.gf - r.ga}</td>
                  <td className="r num bold">{r.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {t.matches.filter((m) => m.group === gi).map((m) => <MatchLine key={m.id} m={m} t={t} onNation={setNation} />)}
        </Card>
      ))}
      {tab === 'ko' && t.stages.slice(3).map((st, i) => {
        const ms = t.matches.filter((m) => m.stage === i + 3).sort((a, b) => (a.tie ?? 0) - (b.tie ?? 0));
        return (
          <Card key={st.name} title={st.name} tag={fmtShort(st.date)} tagColor="var(--muted)">
            {ms.map((m) => <MatchLine key={m.id} m={m} t={t} onNation={setNation} />)}
            {!ms.length && <div className="muted small">{t.stage < 3 ? 'After the group stage' : 'Decided by the previous round'}</div>}
          </Card>
        );
      })}
      {tab === 'players' && (
        <>
          <Card title="Top scorers" tag="Golden Boot" tagColor="var(--yellow)">
            <div className="list">
              {topScorers(g, t, 10).map((s, i) => (
                <div key={s.id} className="li" onClick={() => ui.openPlayer(s.id)}>
                  <div className="main"><div className="t">{i + 1}. {s.name}</div><div className="s">{nationName(s.nat)}</div></div>
                  <b>{s.goals}</b>
                </div>
              ))}
              {!topScorers(g, t, 1).length && <div className="muted small">No goals yet.</div>}
            </div>
          </Card>
          <Card title="Your players" tag={g.clubs[g.userClubId].short} tagColor="var(--sky)">
            <div className="list">
              {mine.map(({ p, c }) => (
                <div key={p.id} className="li" onClick={() => ui.openPlayer(p.id)}>
                  <div className="main"><div className="t">{fullName(p)}</div><div className="s">{nationName(c)}{t.out.includes(c) ? (t.winner === c ? ' · 🏆 Champions' : ' · knocked out') : ' · still in'}</div></div>
                  <span className="small muted">{goalsOf(p.id)} goals</span>
                </div>
              ))}
              {!mine.length && <div className="muted small">None of your players were called up.</div>}
            </div>
          </Card>
        </>
      )}
    </>
  );
}

const GROUPS = [['GK', 'Goalkeepers'], ['DEF', 'Defenders'], ['MID', 'Midfielders'], ['ATT', 'Attackers']] as const;

/** A national team's squad: the tournament squad when viewed from a tournament, otherwise its best players today. */
export function NationSheet({ code, t, onClose }: { code: string; t?: IntlTournament; onClose: () => void }) {
  const g = useGame();
  const live = t?.squads[code] ? null : nationSquad(g, code);
  const squad: Player[] = live ? live.squad : t!.squads[code].map((id) => g.players[id]).filter(Boolean);
  const xi = new Set(live ? live.xi.map((p) => p.id) : t!.xi[code] ?? []);
  const strength = live ? live.strength : t!.strength[code];
  const goalsIn = (id: number) => (t ? t.matches.reduce((s, m) => s + (m.scorers ?? []).filter((x) => x.pid === id).length, 0) : 0);
  const def = NATION_DEFS[code];
  return (
    <Sheet title={nationName(code)} onClose={onClose}>
      <div className="chips" style={{ marginBottom: 10 }}>
        {def && <span className="chip">{def.conf}</span>}
        <span className="chip">Team rating {strength.toFixed(0)}</span>
        <span className="chip">{t ? `${t.short} squad` : 'Current squad'} · {squad.length} players</span>
      </div>
      {squad.length < 23 && (
        <div className="help" style={{ marginBottom: 10 }}>
          Only {squad.length} {nationName(code)} player{squad.length === 1 ? ' is' : 's are'} in the game. The rest of the squad plays at the nation's usual level.
        </div>
      )}
      {GROUPS.map(([grp, label]) => {
        const ps = squad.filter((p) => POS_GROUP[p.pos] === grp);
        if (!ps.length) return null;
        return (
          <div key={grp}>
            <div className="section-label">{label}</div>
            <div className="list">
              {ps.map((p) => {
                const club = p.clubId !== null ? g.clubs[p.clubId] : null;
                const tg = goalsIn(p.id);
                return (
                  <PlayerRow key={p.id} p={p} me={p.clubId === g.userClubId}
                    sub={<>{age(p, g.date)}y · {club?.name ?? 'Free agent'}{p.caps ? ` · ${p.caps} caps, ${p.intGoals ?? 0} goals` : ''}{tg ? ` · ${tg} at ${t!.short}` : ''}</>}
                    end={xi.has(p.id) ? <span className="chip">XI</span> : undefined} />
                );
              })}
            </div>
          </div>
        );
      })}
      {!squad.length && <div className="muted small">No players of this nationality are in the game.</div>}
    </Sheet>
  );
}

/** Browse any national team's current squad. */
export function NationsCard() {
  const nations = Object.values(NATION_DEFS).sort((a, b) => a.name.localeCompare(b.name));
  const [code, setCode] = useState('ENG');
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Card title="National teams" tag="Squads" tagColor="var(--violet)">
      <div className="row" style={{ gap: 8 }}>
        <select className="input" value={code} onChange={(e) => setCode(e.target.value)} style={{ flex: 1 }}>
          {nations.map((n) => <option key={n.code} value={n.code}>{n.name}</option>)}
        </select>
        <button className="btn primary" onClick={() => setOpen(code)}>View squad</button>
      </div>
      {open && <NationSheet code={open} onClose={() => setOpen(null)} />}
    </Card>
  );
}

/** Coming up: international tournaments and the next Club World Cup. */
export function UpcomingCard() {
  const g = useGame();
  const up = upcomingTournaments(g, 5);
  if (!up.length) return null;
  return (
    <Card title="Coming up" tag="World" tagColor="var(--violet)">
      <div className="list">
        {up.map((u) => (
          <div key={u.def.id + u.year} className="li">
            <span className="comp-dot" style={{ background: u.def.color }} />
            <div className="main"><div className="t">{u.def.name} {u.year}</div><div className="s">{u.def.hosts[u.year]?.map(nationName).join(', ') ?? 'Host to be decided'} · from {fmtShort(u.start)}</div></div>
          </div>
        ))}
      </div>
    </Card>
  );
}
