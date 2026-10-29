import { useState } from 'react';
import { REGISTRATION_AGE, SQUAD_LIMIT, registerSquad, seniors, suggestedRegistration } from '../../game/actions';
import { age, overall } from '../../game/ratings';
import { mutate, useGame } from '../../store';
import { useUI } from '../context';
import { PosTag, Sheet } from './common';

/** Pick up to 25 senior players for the league or European squad. */
export function RegistrationSheet({ scope, onClose }: { scope: 'league' | 'europe'; onClose: () => void }) {
  const g = useGame();
  const ui = useUI();
  const list = seniors(g);
  const current = g.registration?.[scope];
  const [sel, setSel] = useState<Set<number>>(new Set(current ?? suggestedRegistration(g)));
  const young = Object.values(g.players).filter((p) => p.clubId === g.userClubId && p.squad === 'first' && age(p, g.date) < REGISTRATION_AGE).length;
  const toggle = (id: number) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const over = sel.size > SQUAD_LIMIT;
  return (
    <Sheet title={`${scope === 'league' ? 'League' : 'European'} squad registration`} onClose={onClose}>
      <div className="row" style={{ marginBottom: 10, gap: 8 }}>
        <span className={`chip ${over ? 'bad' : ''}`}>{sel.size}/{SQUAD_LIMIT} senior players</span>
        <span className="chip">+{young} under-{REGISTRATION_AGE}s (exempt)</span>
        <button className="chip" onClick={() => setSel(new Set(suggestedRegistration(g)))}>Suggested</button>
      </div>
      <div className="list" style={{ maxHeight: 'calc(var(--app-h) * 0.52)', overflowY: 'auto' }}>
        {list.map((p) => (
          <div key={p.id} className="li" onClick={() => toggle(p.id)}>
            <PosTag pos={p.pos} />
            <div className="main">
              <div className="t">{p.first} {p.last}</div>
              <div className="s">{age(p, g.date)}y · OVR {overall(p)}{p.injury ? ' · 🩹' : ''}</div>
            </div>
            <span className={`switch ${sel.has(p.id) ? 'on' : ''}`}><span /></span>
          </div>
        ))}
      </div>
      <button className="btn primary block" style={{ marginTop: 12 }} disabled={over} onClick={() => {
        const r = mutate((gg) => registerSquad(gg, scope, [...sel]));
        ui.toast(r.msg);
        if (r.ok) onClose();
      }}>{over ? `Remove ${sel.size - SQUAD_LIMIT} player(s)` : 'Confirm registration'}</button>
    </Sheet>
  );
}
