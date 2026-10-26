import { squadOf } from '../../game/generate';
import { age, overall, shortName } from '../../game/ratings';
import type { TrainingFocus } from '../../game/types';
import { mutate, useGame } from '../../store';
import { useUI } from '../context';
import { Card, Ovr, OvrChange, PosTag, Stars, StatusIcons } from '../components/common';

const FOCI: TrainingFocus[] = ['balanced', 'attacking', 'defending', 'technical', 'physical', 'mental'];

export function Youth() {
  const g = useGame();
  const ui = useUI();
  const club = g.clubs[g.userClubId];
  const youth = squadOf(g, club.id, 'youth').sort((a, b) => b.pa - a.pa);
  const gems = youth.filter((p) => p.pa >= 75);
  return (
    <div>
      <div className="page-title">
        <div>
          <div className="kicker">{club.name} Academy</div>
          <h1>Youth Team</h1>
        </div>
        <span className="chip">{youth.length} prospects</span>
        <span className="chip">Youth facilities {'★'.repeat(club.facilities.youth)}{'☆'.repeat(5 - club.facilities.youth)}</span>
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)' }}>
        <Card title="Academy Squad" tag="U21" tagColor="var(--grass)">
          {youth.length ? (
            <div className="table-wrap">
              <table className="t">
                <thead><tr><th>Pos</th><th>Name</th><th className="r">Age</th><th className="c">OVR</th><th>Potential</th><th></th></tr></thead>
                <tbody>
                  {youth.map((p) => (
                    <tr key={p.id} className="click" onClick={() => ui.openPlayer(p.id)}>
                      <td><PosTag pos={p.pos} /></td>
                      <td className="bold">{shortName(p)}<StatusIcons p={p} />{p.pa >= 80 && <span title="Wonderkid"> 💎</span>}</td>
                      <td className="r">{age(p, g.date)}</td>
                      <td className="c"><Ovr value={overall(p)} /><OvrChange v={p.lastChange} /></td>
                      <td><Stars ovr={p.pa} /></td>
                      <td className="r">
                        <button className="btn sm primary" onClick={(e) => { e.stopPropagation(); mutate(() => { p.squad = 'first'; }); ui.toast(`${shortName(p)} promoted to the first team!`); }}>Promote ⬆</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">No youth players. The next intake arrives on 15 March.</div>
          )}
        </Card>
        <div className="col" style={{ gap: 18 }}>
          <Card title="Youth Training" tag="Focus" tagColor="var(--yellow)">
            <div className="row wrap" style={{ gap: 6 }}>
              {FOCI.map((f) => (
                <button key={f} className={`tab ${g.training.youthFocus === f ? 'active' : ''}`} onClick={() => mutate((gg) => { gg.training.youthFocus = f; })}>{f[0].toUpperCase() + f.slice(1)}</button>
              ))}
            </div>
            <p className="small muted">Youth players develop at half the match-time rate of regulars. Promote your best prospects to give them minutes and speed up their growth.</p>
          </Card>
          <Card title="Scout's Report" tag="Gems" tagColor="var(--pink)">
            {gems.length ? gems.slice(0, 5).map((p) => (
              <div key={p.id} className="row" style={{ padding: '6px 0', cursor: 'pointer' }} onClick={() => ui.openPlayer(p.id)}>
                <span>💎</span><b>{shortName(p)}</b><span className="muted small">{p.pos}, {age(p, g.date)}</span><span className="right"><Stars ovr={p.pa} /></span>
              </div>
            )) : <div className="muted small">No standout talents right now. Better youth facilities produce better intakes.</div>}
          </Card>
          <div className="help">📅 <b>Youth intake day is 15 March.</b> The number and quality of new players depends on your youth facilities (upgrade them via the Board) and club reputation.</div>
        </div>
      </div>
    </div>
  );
}
