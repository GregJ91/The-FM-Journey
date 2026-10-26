import { squadOf } from '../../game/generate';
import { age, shortName } from '../../game/ratings';
import type { TrainingFocus } from '../../game/types';
import { mutate, useGame } from '../../store';
import { useUI } from '../context';
import { Card, OvrChange, PlayerRow, Stars } from '../components/common';

const FOCI: TrainingFocus[] = ['balanced', 'attacking', 'defending', 'technical', 'physical', 'mental'];

export function Youth() {
  const g = useGame();
  const ui = useUI();
  const club = g.clubs[g.userClubId];
  const youth = squadOf(g, club.id, 'youth').sort((a, b) => b.pa - a.pa);
  return (
    <div>
      <div className="page-title">
        <div className="kicker">{club.name} Academy</div>
        <h1>Youth Team</h1>
        <div className="chips">
          <span className="chip">{youth.length} prospects</span>
          <span className="chip">Facilities {'★'.repeat(club.facilities.youth)}{'☆'.repeat(5 - club.facilities.youth)}</span>
          <span className="chip">Intake 15 Mar</span>
        </div>
      </div>

      <Card title="Academy Squad" tag="U21" tagColor="var(--grass)">
        <div className="list">
          {youth.map((p) => (
            <PlayerRow
              key={p.id}
              p={p}
              sub={<>{age(p, g.date)}y · <Stars ovr={p.pa} />{p.pa >= 80 && ' 💎'}<OvrChange v={p.lastChange} /></>}
              end={<button className="btn sm primary" onClick={(e) => { e.stopPropagation(); mutate(() => { p.squad = 'first'; }); ui.toast(`${shortName(p)} promoted to the first team!`); }}>Promote</button>}
            />
          ))}
          {!youth.length && <div className="empty">No youth players. The next intake arrives on 15 March.</div>}
        </div>
      </Card>

      <Card title="Youth Training Focus" tag="Focus" tagColor="var(--yellow)">
        <div className="grid3">
          {FOCI.map((f) => (
            <button key={f} className={`btn sm ${g.training.youthFocus === f ? 'primary' : ''}`} onClick={() => mutate((gg) => { gg.training.youthFocus = f; })}>{f[0].toUpperCase() + f.slice(1)}</button>
          ))}
        </div>
        <p className="small muted" style={{ marginBottom: 0 }}>Youth players develop at half the match-time rate of regulars. Promote your best prospects to give them minutes.</p>
      </Card>

      <div className="help">📅 <b>Youth intake day is 15 March.</b> The number and quality of new players depends on your youth facilities (upgrade them from the Board) and the club's reputation. 💎 marks a potential wonderkid.</div>
    </div>
  );
}
