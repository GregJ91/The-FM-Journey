import { squadOf } from '../../game/generate';
import { age, shortName } from '../../game/ratings';
import { youthCompsFor } from '../../game/youth';
import type { Player, TrainingFocus } from '../../game/types';
import { mutate, useGame } from '../../store';
import { useUI } from '../context';
import { Card, OvrChange, PlayerRow, Stars } from '../components/common';
import { YouthFixtureRow, YouthTableCard } from './YouthViews';

const FOCI: TrainingFocus[] = ['balanced', 'attacking', 'defending', 'technical', 'physical', 'mental'];

function youthLine(p: Player) {
  const ys = p.ys;
  if (!ys?.apps) return null;
  return <> · {ys.apps} gms{ys.goals ? ` · ${ys.goals}⚽` : ''}{ys.assists ? ` · ${ys.assists}🅰️` : ''} · {(ys.rs / ys.apps).toFixed(1)}</>;
}

export function Youth() {
  const g = useGame();
  const ui = useUI();
  const club = g.clubs[g.userClubId];
  const youth = squadOf(g, club.id, 'youth').sort((a, b) => b.pa - a.pa);
  const comps = youthCompsFor(g, club.id);
  const league = comps.find((c) => c.kind === 'league');
  const mine = comps.flatMap((c) => c.fixtures.filter((f) => f.h === club.id || f.a === club.id).map((f) => ({ f, c }))).sort((a, b) => (a.f.d < b.f.d ? -1 : 1));
  const recent = mine.filter((x) => x.f.hg !== undefined).slice(-3).reverse();
  const next = mine.filter((x) => x.f.hg === undefined).slice(0, 3);
  // Fringe first-teamers who also play youth football
  const fringe = squadOf(g, club.id).filter((p) => p.ys?.apps).sort((a, b) => (b.ys!.apps - a.ys!.apps));
  return (
    <div className="cols">
      <div className="page-title">
        <div className="kicker">{club.name} Academy</div>
        <h1>Youth Team</h1>
        <div className="chips">
          <span className="chip">{youth.length} prospects</span>
          <span className="chip">Facilities {'★'.repeat(club.facilities.youth)}{'☆'.repeat(5 - club.facilities.youth)}</span>
          <span className="chip">Intake 15 Mar</span>
        </div>
      </div>

      {league && (
        <Card title={league.name} tag={league.short} tagColor={league.color} right={<button className="btn sm" onClick={() => ui.go('competitions', `YOUTH:${league.id}`)}>Full</button>}>
          <YouthTableCard comp={league} highlight={club.id} around />
        </Card>
      )}

      {comps.length > 0 && (
        <Card title="Youth fixtures" tag={comps.map((c) => c.short).join(' · ')} tagColor="var(--grass)">
          {next.map(({ f, c }) => <YouthFixtureRow key={f.id} g={g} f={f} comp={c} />)}
          {recent.length > 0 && <div className="section-label">Recent results</div>}
          {recent.map(({ f, c }) => <YouthFixtureRow key={f.id} g={g} f={f} comp={c} />)}
          {!next.length && !recent.length && <div className="muted small">No youth fixtures scheduled.</div>}
          <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
            {comps.filter((c) => c.kind !== 'league').map((c) => (
              <button key={c.id} className="chip" onClick={() => ui.go('competitions', `YOUTH:${c.id}`)}>
                {c.name}: {c.winner === club.id ? '🏆 winners' : c.alive.includes(club.id) ? (c.winner !== null ? 'runners-up' : 'still in') : 'out'}
              </button>
            ))}
          </div>
        </Card>
      )}
      {!comps.length && <div className="help">Your club has no youth team competition at this level. Youth players still train and can be promoted.</div>}

      <Card title="Academy Squad" tag="U21" tagColor="var(--grass)">
        <div className="list">
          {youth.map((p) => (
            <PlayerRow
              key={p.id}
              p={p}
              sub={<>{age(p, g.date)}y · <Stars ovr={p.pa} />{p.pa >= 80 && ' 💎'}<OvrChange v={p.lastChange} />{youthLine(p)}</>}
              end={<button className="btn sm primary" onClick={(e) => { e.stopPropagation(); mutate(() => { p.squad = 'first'; }); ui.toast(`${shortName(p)} promoted to the first team!`); }}>Promote</button>}
            />
          ))}
          {!youth.length && <div className="empty">No youth players. The next intake arrives on 15 March.</div>}
        </div>
      </Card>

      {fringe.length > 0 && (
        <Card title="First-teamers in the youth side" tag="Minutes" tagColor="var(--sky)">
          <div className="list">
            {fringe.map((p) => <PlayerRow key={p.id} p={p} sub={<>{age(p, g.date)}y{youthLine(p)}</>} />)}
          </div>
        </Card>
      )}

      <Card title="Youth Training Focus" tag="Focus" tagColor="var(--yellow)">
        <div className="grid3">
          {FOCI.map((f) => (
            <button key={f} className={`btn sm ${g.training.youthFocus === f ? 'primary' : ''}`} onClick={() => mutate((gg) => { gg.training.youthFocus = f; })}>{f[0].toUpperCase() + f.slice(1)}</button>
          ))}
        </div>
        <p className="small muted" style={{ marginBottom: 0 }}>Youth matches count half as much as first-team minutes for development. Young first-teamers who aren't in your XI play for the youth side automatically.</p>
      </Card>

      <div className="help">📅 <b>Youth intake day is 15 March.</b> The number and quality of new players depends on your youth facilities (upgrade them from the Board) and the club's reputation. 💎 marks a potential wonderkid.</div>
    </div>
  );
}
