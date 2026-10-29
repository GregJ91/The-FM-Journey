import { squadOf } from '../../game/generate';
import { yearlyCurve } from '../../game/progression';
import { age } from '../../game/ratings';
import type { Intensity, TrainingFocus } from '../../game/types';
import { mutate, useGame } from '../../store';
import { Card, PlayerRow, SectionPage } from '../components/common';
import { useState } from 'react';

const FOCI: { id: TrainingFocus; label: string; ico: string; desc: string }[] = [
  { id: 'balanced', label: 'Balanced', ico: '⚖️', desc: 'Even across all areas' },
  { id: 'attacking', label: 'Attacking', ico: '🎯', desc: 'Finishing, dribbling, touch' },
  { id: 'defending', label: 'Defending', ico: '🛡️', desc: 'Tackling, positioning, heading' },
  { id: 'technical', label: 'Technical', ico: '🪄', desc: 'Passing, touch, vision' },
  { id: 'physical', label: 'Physical', ico: '💪', desc: 'Pace, stamina, strength' },
  { id: 'mental', label: 'Mental', ico: '🧠', desc: 'Decisions, composure' },
];

const INTENSITY: { id: Intensity; label: string; desc: string; color: string }[] = [
  { id: 'low', label: 'Low', desc: '×0.75 growth · fewer injuries', color: 'var(--sky)' },
  { id: 'normal', label: 'Normal', desc: '×1.0 growth · normal risk', color: 'var(--lime)' },
  { id: 'high', label: 'High', desc: '×1.25 growth · 1.8× injuries', color: 'var(--coral)' },
];

export function Training() {
  const g = useGame();
  const club = g.clubs[g.userClubId];
  const players = squadOf(g, club.id, 'all');
  const movers = [...players].filter((p) => p.lastChange !== 0).sort((a, b) => b.lastChange - a.lastChange);
  const ages = Array.from({ length: 21 }, (_, i) => 16 + i);
  const [sec, setSec] = useState<'plan' | 'dev' | 'movers'>('plan');
  return (
    <SectionPage sections={[['plan', 'Schedule'], ['dev', 'Development'], ['movers', 'Movers']]} sec={sec} setSec={setSec}
      status={<span>Training facilities <b>{'★'.repeat(club.facilities.training)}{'☆'.repeat(5 - club.facilities.training)}</b></span>}>
      {sec === 'plan' && <Card title="Intensity" tag="Schedule" tagColor="var(--coral)">
        <div className="grid3">
          {INTENSITY.map((it) => (
            <button key={it.id} className={`choice ${g.training.intensity === it.id ? 'on' : ''}`} style={{ background: g.training.intensity === it.id ? it.color : undefined }} onClick={() => mutate((gg) => { gg.training.intensity = it.id; })}>
              <b>{it.label}</b><span>{it.desc}</span>
            </button>
          ))}
        </div>
      </Card>}

      {sec === 'plan' && <Card title="First Team Focus" tag="Focus" tagColor="var(--violet)">
        <div className="grid2">
          {FOCI.map((f) => (
            <button key={f.id} className={`choice ${g.training.firstFocus === f.id ? 'on' : ''}`} style={{ background: g.training.firstFocus === f.id ? 'var(--lime)' : undefined }} onClick={() => mutate((gg) => { gg.training.firstFocus = f.id; })}>
              <b>{f.ico} {f.label}</b><span>{f.desc}</span>
            </button>
          ))}
        </div>
        <p className="small muted" style={{ marginBottom: 0 }}>Focus attributes get double weight when players improve. Set individual focuses from a player's profile.</p>
      </Card>}

      {sec === 'dev' && <Card title="How players develop" tag="Monthly" tagColor="var(--yellow)">
        <div className="section-label" style={{ marginTop: 0 }}>Base change per year by age</div>
        <div className="age-curve">
          {ages.map((a) => {
            const v = yearlyCurve(a);
            const h = Math.min(100, (Math.abs(v) / 6) * 100);
            return (
              <div key={a} className="c">
                <div className="up">{v > 0 && <div className="bv" style={{ height: `${h}%`, background: 'var(--grass)' }} />}</div>
                <div style={{ borderTop: '2px solid var(--ink)', width: '100%', textAlign: 'center' }}>{a % 2 === 0 ? a : ''}</div>
                <div className="down">{v < 0 && <div className="bv" style={{ height: `${h}%`, background: 'var(--coral)' }} />}</div>
              </div>
            );
          })}
        </div>
        <div className="help" style={{ marginTop: 10 }}>
          On the <b>1st of every month</b> each player's overall moves by <b>(age curve ÷ 12) × modifiers</b>, plus a little luck:
          <br />• <b>Potential gap</b>: far below potential = faster; stops at potential
          <br />• <b>Intensity</b>: ×0.75 / ×1.0 / ×1.25
          <br />• <b>Facilities</b>: ×0.9 (level 1) → ×1.3 (level 5)
          <br />• <b>Minutes</b>: ×0.6 (none) → ×1.2 (300+ a month)
          <br />• <b>Form</b>: good ratings add up to +25%
          <br />Older players decline, physical attributes first — regular football slows it.
        </div>
      </Card>}

      {sec === 'movers' && <Card title="Last month's movers" tag="Report" tagColor="var(--sky)">
        <div className="list">
          {movers.slice(0, 15).map((p) => (
            <PlayerRow key={p.id} p={p} sub={`${age(p, g.date)}y${p.squad === 'youth' ? ' · youth' : ''}`} end={<span style={{ color: p.lastChange > 0 ? 'var(--good)' : 'var(--bad)' }}>{g.era ? (p.lastChange > 0 ? '▲ Improving' : '▼ Declining') : p.lastChange > 0 ? `+${p.lastChange}` : p.lastChange}</span>} />
          ))}
          {!movers.length && <div className="muted small">No changes yet — the first update happens on the 1st of next month.</div>}
        </div>
      </Card>}
    </SectionPage>
  );
}
