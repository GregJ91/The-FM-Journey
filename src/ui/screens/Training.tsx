import { squadOf } from '../../game/generate';
import { yearlyCurve } from '../../game/progression';
import { age, overall, shortName } from '../../game/ratings';
import type { Intensity, TrainingFocus } from '../../game/types';
import { mutate, useGame } from '../../store';
import { useUI } from '../context';
import { Card, Ovr, PosTag } from '../components/common';

const FOCI: { id: TrainingFocus; label: string; ico: string; desc: string }[] = [
  { id: 'balanced', label: 'Balanced', ico: '⚖️', desc: 'Even improvement across all areas.' },
  { id: 'attacking', label: 'Attacking', ico: '🎯', desc: 'Finishing, dribbling, first touch, composure.' },
  { id: 'defending', label: 'Defending', ico: '🛡️', desc: 'Tackling, positioning, heading, strength.' },
  { id: 'technical', label: 'Technical', ico: '🪄', desc: 'Passing, touch, dribbling, vision.' },
  { id: 'physical', label: 'Physical', ico: '💪', desc: 'Pace, stamina, strength, work rate.' },
  { id: 'mental', label: 'Mental', ico: '🧠', desc: 'Decisions, composure, vision, positioning.' },
];

const INTENSITY: { id: Intensity; label: string; desc: string; color: string }[] = [
  { id: 'low', label: 'Low', desc: '×0.75 development · fewer training injuries · +2 daily recovery', color: 'var(--sky)' },
  { id: 'normal', label: 'Normal', desc: '×1.0 development · normal injury risk', color: 'var(--lime)' },
  { id: 'high', label: 'High', desc: '×1.25 development · 1.8× training injuries · −2 daily recovery', color: 'var(--coral)' },
];

export function Training() {
  const g = useGame();
  const ui = useUI();
  const club = g.clubs[g.userClubId];
  const players = squadOf(g, club.id, 'all');
  const movers = [...players].filter((p) => p.lastChange !== 0).sort((a, b) => b.lastChange - a.lastChange);
  const ages = Array.from({ length: 21 }, (_, i) => 16 + i);
  return (
    <div>
      <div className="page-title">
        <div>
          <div className="kicker">{club.name}</div>
          <h1>Training</h1>
        </div>
        <span className="chip">Training facilities {'★'.repeat(club.facilities.training)}{'☆'.repeat(5 - club.facilities.training)}</span>
      </div>
      <div className="grid g2">
        <Card title="Intensity" tag="Schedule" tagColor="var(--coral)">
          <div className="grid g3" style={{ gap: 10 }}>
            {INTENSITY.map((it) => (
              <button key={it.id} className="card" style={{ cursor: 'pointer', textAlign: 'left', background: g.training.intensity === it.id ? it.color : 'var(--paper)', boxShadow: g.training.intensity === it.id ? 'var(--shadow)' : 'none', padding: 12 }} onClick={() => mutate((gg) => { gg.training.intensity = it.id; })}>
                <h3 style={{ fontSize: 20 }}>{it.label}</h3>
                <div className="small" style={{ marginTop: 4 }}>{it.desc}</div>
              </button>
            ))}
          </div>
        </Card>
        <Card title="First Team Focus" tag="Focus" tagColor="var(--violet)">
          <div className="grid g3" style={{ gap: 10 }}>
            {FOCI.map((f) => (
              <button key={f.id} className="card" style={{ cursor: 'pointer', textAlign: 'left', padding: 10, background: g.training.firstFocus === f.id ? 'var(--lime)' : 'var(--paper)', boxShadow: g.training.firstFocus === f.id ? 'var(--shadow-sm)' : 'none' }} onClick={() => mutate((gg) => { gg.training.firstFocus = f.id; })}>
                <div className="bold">{f.ico} {f.label}</div>
                <div className="small muted">{f.desc}</div>
              </button>
            ))}
          </div>
          <p className="small muted" style={{ marginBottom: 0 }}>Focus attributes get double weight when players improve. Set individual focuses from a player's profile.</p>
        </Card>

        <Card title="How players develop" tag="Monthly" tagColor="var(--yellow)" className="span2">
          <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)', alignItems: 'start' }}>
            <div>
              <div className="small bold muted" style={{ marginBottom: 6 }}>BASE CHANGE PER YEAR BY AGE (OVR POINTS)</div>
              <div className="age-curve">
                {ages.map((a) => {
                  const v = yearlyCurve(a);
                  const h = Math.min(100, Math.abs(v) / 6 * 100);
                  return (
                    <div key={a} className="c" title={`Age ${a}: ${v > 0 ? '+' : ''}${v}/yr`}>
                      <div className="up">{v > 0 && <div className="bv" style={{ height: `${h}%`, background: 'var(--grass)' }} />}</div>
                      <div style={{ borderTop: '2px solid var(--ink)', width: '100%', textAlign: 'center' }}>{a}</div>
                      <div className="down">{v < 0 && <div className="bv" style={{ height: `${h}%`, background: 'var(--coral)' }} />}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="help" style={{ lineHeight: 1.6 }}>
              At the <b>end of every month</b> each player's overall moves by <b>(age curve ÷ 12) × modifiers</b> plus a little randomness:
              <br />• <b>Potential gap</b>: far below potential = faster (×0 to ×1.2); growth stops at potential
              <br />• <b>Training intensity</b>: ×0.75 / ×1.0 / ×1.25
              <br />• <b>Facilities</b>: ×0.9 (level 1) to ×1.3 (level 5)
              <br />• <b>Playing time</b>: ×0.6 (no minutes) to ×1.2 (300+ mins)
              <br />• <b>Form</b>: avg rating above 6.8 adds up to +25%
              <br />Older players decline — physical attributes first — but regular football slows it down.
            </div>
          </div>
        </Card>

        <Card title="Last month's movers" tag="Report" tagColor="var(--sky)" className="span2">
          {movers.length ? (
            <div className="grid g2" style={{ gap: 6 }}>
              {movers.slice(0, 16).map((p) => (
                <div key={p.id} className="row" style={{ cursor: 'pointer', padding: '4px 0' }} onClick={() => ui.openPlayer(p.id)}>
                  <PosTag pos={p.pos} />
                  <b>{shortName(p)}</b>
                  <span className="small muted">{age(p, g.date)}y {p.squad === 'youth' ? '· youth' : ''}</span>
                  <span className="right row" style={{ gap: 6 }}>
                    <Ovr value={overall(p)} />
                    <b style={{ color: p.lastChange > 0 ? 'var(--good)' : 'var(--bad)', minWidth: 32 }}>{p.lastChange > 0 ? `+${p.lastChange}` : p.lastChange}</b>
                  </span>
                </div>
              ))}
            </div>
          ) : <div className="muted">No changes yet — the first development update happens on the 1st of next month.</div>}
        </Card>
      </div>
    </div>
  );
}
