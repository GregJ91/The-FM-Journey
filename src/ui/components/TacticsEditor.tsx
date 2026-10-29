import { useState, type ReactNode } from 'react';
import { FORMATIONS, FORMATION_NAMES, MENTALITY } from '../../game/formations';
import { shortName } from '../../game/ratings';
import { PRESETS, ROLES, applyPreset, roleFor } from '../../game/tactics';
import type { GameState, Tactics } from '../../game/types';
import { PosTag } from './common';

function Choice<T extends string | number>({ label, hint, value, options, onChange }: { label: string; hint?: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="seg">
        {options.map(([v, text]) => <button key={String(v)} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{text}</button>)}
      </div>
      {hint && <div className="small muted">{hint}</div>}
    </div>
  );
}

function Toggle({ label, hint, value, onChange }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className="li" style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid var(--line)', color: 'inherit', textAlign: 'left', padding: '10px 2px' }} onClick={() => onChange(!value)}>
      <div className="main">
        <div className="t">{label}</div>
        <div className="s" style={{ whiteSpace: 'normal' }}>{hint}</div>
      </div>
      <span className={`switch ${value ? 'on' : ''}`}><span /></span>
    </button>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <div className="card-h"><h3>{title}</h3></div>
      <div className="col" style={{ gap: 14 }}>{children}</div>
    </div>
  );
}

const MENT_SHORT = ['V.Def', 'Def', 'Bal', 'Att', 'V.Att'];
const MENT_HINT = ['Everyone behind the ball.', 'Safety first, pick your moments.', 'A balance of risk and reward.', 'Push men forward and take risks.', 'All-out attack. Expect to concede.'];

/**
 * Full tactics editor. `lineup` (player ids by slot) shows who plays each role.
 * Works both before a match (club tactics) and live (in-match tactics).
 */
export function TacticsEditor({ g, tactics, lineup, onChange, live }: { g: GameState; tactics: Tactics; lineup?: (number | null)[]; onChange: (t: Partial<Tactics>) => void; live?: boolean }) {
  const [openRole, setOpenRole] = useState<number | null>(null);
  const slots = FORMATIONS[tactics.formation];
  const set = (t: Partial<Tactics>) => onChange(t);
  return (
    <div>
      {!live && (
        <div className="field" style={{ marginBottom: 10 }}>
          <label htmlFor="tactic-name">Tactic name</label>
          <input id="tactic-name" className="input" maxLength={24} placeholder="Name your tactic" value={tactics.name ?? ''} onChange={(e) => set({ name: e.target.value })} />
        </div>
      )}
      <div className="section-label" style={{ marginTop: 0 }}>Quick presets</div>
      <div className="tabs" style={{ marginBottom: 12 }}>
        {PRESETS.map((p) => (
          <button key={p.id} className="tab" title={p.desc} onClick={() => set(applyPreset(p))}>{p.name}</button>
        ))}
      </div>

      <Section title="Formation & mentality">
        <div className="tabs" style={{ margin: '0 -14px', padding: '0 14px' }}>
          {FORMATION_NAMES.map((f) => <button key={f} className={`tab ${tactics.formation === f ? 'active' : ''}`} onClick={() => set({ formation: f })}>{f}</button>)}
        </div>
        <Choice label={`Mentality · ${MENTALITY[tactics.mentality + 2]}`} hint={MENT_HINT[tactics.mentality + 2]} value={tactics.mentality} options={MENT_SHORT.map((m, i) => [i - 2, m])} onChange={(v) => set({ mentality: v })} />
      </Section>

      <Section title="In possession">
        <Choice label="Passing" value={tactics.style} options={[['short', 'Short'], ['mixed', 'Mixed'], ['direct', 'Direct']]} onChange={(v) => set({ style: v })}
          hint={tactics.style === 'short' ? 'Keep the ball; higher pass completion, fewer killer balls.' : tactics.style === 'direct' ? 'Go forward quickly; better chances, more possession lost.' : 'Mix it up depending on the situation.'} />
        <Choice label="Tempo" value={tactics.tempo} options={[[0, 'Slow'], [1, 'Normal'], [2, 'Fast']]} onChange={(v) => set({ tempo: v })}
          hint={tactics.tempo === 2 ? 'More shots, but players tire faster.' : tactics.tempo === 0 ? 'Patient, saves energy, fewer chances.' : 'Standard pace of play.'} />
        <Choice label="Width" value={tactics.width} options={[[0, 'Narrow'], [1, 'Balanced'], [2, 'Wide']]} onChange={(v) => set({ width: v })}
          hint={tactics.width === 2 ? 'Stretch the pitch: more crosses, lower-quality chances.' : tactics.width === 0 ? 'Play through the middle: fewer but better chances.' : 'Use the whole pitch.'} />
        <Choice label="Attacking focus" value={tactics.focus} options={[['left', 'Left'], ['centre', 'Centre'], ['right', 'Right'], ['mixed', 'Mixed']]} onChange={(v) => set({ focus: v })}
          hint="Players on that side shoot and create more." />
        <Toggle label="Play out from the back" hint="Better build-up with good passers at the back; risky without them." value={tactics.playOutBack} onChange={(v) => set({ playOutBack: v })} />
      </Section>

      <Section title="Out of possession">
        <Choice label="Pressing" value={tactics.pressing} options={[[0, 'Low block'], [1, 'Mid'], [2, 'High press']]} onChange={(v) => set({ pressing: v })}
          hint={tactics.pressing === 2 ? 'Win it back high; tiring, and leaves space when beaten.' : tactics.pressing === 0 ? 'Sit off and stay compact.' : 'Press in midfield.'} />
        <Choice label="Defensive line" value={tactics.line} options={[[0, 'Deep'], [1, 'Standard'], [2, 'High']]} onChange={(v) => set({ line: v })}
          hint={tactics.line === 2 ? 'Squeeze the pitch; quick forwards can run in behind.' : tactics.line === 0 ? 'Concede more shots, but from worse positions.' : 'A standard line.'} />
        <Choice label="Tackling" value={tactics.tackling} options={[[0, 'Stay on feet'], [1, 'Normal'], [2, 'Get stuck in']]} onChange={(v) => set({ tackling: v })}
          hint={tactics.tackling === 2 ? 'Win more duels but give away fouls and cards.' : tactics.tackling === 0 ? 'Fewer fouls and cards, but easier to play through.' : 'Standard challenges.'} />
        <Toggle label="Offside trap" hint="Catches attackers out, but a mistimed trap gifts a one-on-one." value={tactics.offsideTrap} onChange={(v) => set({ offsideTrap: v })} />
      </Section>

      <Section title="Transition & game management">
        <Toggle label="Counter-attack" hint="Break quickly when you win the ball. Best when you have less possession." value={tactics.counter} onChange={(v) => set({ counter: v })} />
        <Toggle label="Time-wasting" hint="When leading: slow the game down and see it out. Referees may book you." value={tactics.timeWasting} onChange={(v) => set({ timeWasting: v })} />
      </Section>

      <Section title="Player roles">
        <div className="list">
          {slots.map((s, i) => {
            const rl = roleFor(s.pos, tactics.roles[i]);
            const pid = lineup?.[i];
            return (
              <div key={i}>
                <div className="li" onClick={() => setOpenRole(openRole === i ? null : i)}>
                  <PosTag pos={s.pos} />
                  <div className="main">
                    <div className="t">{rl.name}</div>
                    <div className="s">{pid != null && g.players[pid] ? shortName(g.players[pid]) : '—'} · {rl.desc}</div>
                  </div>
                  <span className="muted small">{ROLES[s.pos].length > 1 ? (openRole === i ? 'Close' : 'Change') : ''}</span>
                </div>
                {openRole === i && (
                  <div className="col" style={{ gap: 6, padding: '4px 0 10px' }}>
                    {ROLES[s.pos].map((r) => (
                      <button key={r.id} className={`choice ${r.id === rl.id ? 'on' : ''}`} onClick={() => { const roles = [...tactics.roles]; roles[i] = r.id; set({ roles }); setOpenRole(null); }}>
                        <b>{r.name}</b><span>{r.desc}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>
      {live && <div className="small muted" style={{ textAlign: 'center' }}>Changes take effect immediately.</div>}
    </div>
  );
}

const SEL = <T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) => (
  <label className="ti-field">
    <span>{label}</span>
    <select className="input" value={String(value)} onChange={(e) => { const o = options.find(([v]) => String(v) === e.target.value); if (o) onChange(o[0]); }}>
      {options.map(([v, l]) => <option key={String(v)} value={String(v)}>{l}</option>)}
    </select>
  </label>
);
const YES_NO: [number, string][] = [[1, 'Yes'], [0, 'No']];

/** CM 01/02-style team instructions: every setting is a dropdown, all on one screen; player roles on a second page. */
export function TeamInstructions({ g, tactics, lineup, onChange, autoSubs, onAutoSubs, live }: { g: GameState; tactics: Tactics; lineup?: (number | null)[]; onChange: (t: Partial<Tactics>) => void; autoSubs: boolean; onAutoSubs: (v: boolean) => void; live?: boolean }) {
  const [page, setPage] = useState<'team' | 'roles'>('team');
  const slots = FORMATIONS[tactics.formation];
  return (
    <div className="ti">
      <div className="seg">
        <button className={page === 'team' ? 'on' : ''} onClick={() => setPage('team')}>Team</button>
        <button className={page === 'roles' ? 'on' : ''} onClick={() => setPage('roles')}>Player roles</button>
      </div>
      {page === 'team' ? (
        <div className="ti-grid">
          {!live && <label className="ti-field wide">
            <span>Tactic name</span>
            <input id="tactic-name" className="input" maxLength={24} placeholder="Name your tactic" value={tactics.name ?? ''} onChange={(e) => onChange({ name: e.target.value })} />
          </label>}
          <label className="ti-field wide">
            <span>Load a preset</span>
            <select className="input" value="" onChange={(e) => { const p = PRESETS.find((x) => x.id === e.target.value); if (p) onChange(applyPreset(p)); }}>
              <option value="">Choose…</option>
              {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <SEL label="Formation" value={tactics.formation} options={FORMATION_NAMES.map((f) => [f, f] as [string, string])} onChange={(v) => onChange({ formation: v })} />
          <SEL label="Mentality" value={tactics.mentality} options={MENTALITY.map((m, i) => [i - 2, m] as [number, string])} onChange={(v) => onChange({ mentality: v })} />
          <SEL label="Passing" value={tactics.style} options={[['short', 'Short'], ['mixed', 'Mixed'], ['direct', 'Direct']]} onChange={(v) => onChange({ style: v })} />
          <SEL label="Tempo" value={tactics.tempo} options={[[0, 'Slow'], [1, 'Normal'], [2, 'Fast']]} onChange={(v) => onChange({ tempo: v })} />
          <SEL label="Width" value={tactics.width} options={[[0, 'Narrow'], [1, 'Balanced'], [2, 'Wide']]} onChange={(v) => onChange({ width: v })} />
          <SEL label="Attacking focus" value={tactics.focus} options={[['mixed', 'Mixed'], ['left', 'Left'], ['centre', 'Centre'], ['right', 'Right']]} onChange={(v) => onChange({ focus: v })} />
          <SEL label="Pressing" value={tactics.pressing} options={[[0, 'Low block'], [1, 'Mid'], [2, 'High press']]} onChange={(v) => onChange({ pressing: v })} />
          <SEL label="Defensive line" value={tactics.line} options={[[0, 'Deep'], [1, 'Standard'], [2, 'High']]} onChange={(v) => onChange({ line: v })} />
          <SEL label="Tackling" value={tactics.tackling} options={[[0, 'Stay on feet'], [1, 'Normal'], [2, 'Get stuck in']]} onChange={(v) => onChange({ tackling: v })} />
          <SEL label="Counter-attack" value={tactics.counter ? 1 : 0} options={YES_NO} onChange={(v) => onChange({ counter: v === 1 })} />
          <SEL label="Offside trap" value={tactics.offsideTrap ? 1 : 0} options={YES_NO} onChange={(v) => onChange({ offsideTrap: v === 1 })} />
          <SEL label="Play out from back" value={tactics.playOutBack ? 1 : 0} options={YES_NO} onChange={(v) => onChange({ playOutBack: v === 1 })} />
          <SEL label="Time-wasting" value={tactics.timeWasting ? 1 : 0} options={YES_NO} onChange={(v) => onChange({ timeWasting: v === 1 })} />
          <SEL label="Assistant subs" value={autoSubs ? 1 : 0} options={YES_NO} onChange={(v) => onAutoSubs(v === 1)} />
        </div>
      ) : (
        <div className="ti-roles">
          {slots.map((s, i) => {
            const pid = lineup?.[i];
            const rl = roleFor(s.pos, tactics.roles[i]);
            return (
              <label key={i} className="ti-role">
                <PosTag pos={s.pos} />
                <span className="ellipsis">{pid != null && g.players[pid] ? shortName(g.players[pid]) : '—'}</span>
                <select className="input" value={rl.id} disabled={ROLES[s.pos].length < 2} onChange={(e) => { const roles = [...tactics.roles]; roles[i] = e.target.value; onChange({ roles }); }}>
                  {ROLES[s.pos].map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
