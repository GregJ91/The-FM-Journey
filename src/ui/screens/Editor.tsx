// The in-game editor (unlocked per save by naming a tactic "Editor"): edit any player, and any club's finances.
import { useState } from 'react';
import { CM_EXTRA } from '../../game/cm0102/parse';
import { NATIONS } from '../../game/data/names';
import { ATTR_GROUPS, ATTR_LABEL, POSITIONS, POS_WEIGHTS, clampAttr, fmtMoney, overall, rawOverallAt } from '../../game/ratings';
import { applyMetaProfile, isMetaClub } from '../../game/meta';
import { numberUserSquad } from '../../game/season';
import { assignShirtNumbers, releaseShirt } from '../../game/shirts';
import type { AttrKey, Club, GameState, Player, Pos } from '../../game/types';
import { mutate } from '../../store';
import { useUI } from '../context';
import { Card } from '../components/common';

/** "25m", "500k", "1,250,000" or "£3.5m" → pounds. */
export function parseMoney(s: string) {
  const t = s.trim().toLowerCase().replace(/[£,\s]/g, '');
  const m = t.match(/^(-?\d+(?:\.\d+)?)([km]?)$/);
  if (!m) return null;
  return Math.round(Number(m[1]) * (m[2] === 'm' ? 1_000_000 : m[2] === 'k' ? 1_000 : 1));
}

/** Shift the attributes that matter for his position so his overall becomes `target`, keeping his strengths. */
function setOverall(p: Player, target: number) {
  const w = POS_WEIGHTS[p.pos];
  for (let i = 0; i < 10; i++) {
    const diff = target - rawOverallAt(p.attrs, p.pos);
    if (Math.abs(diff) < 0.2) break;
    for (const k in w) p.attrs[k as AttrKey] = clampAttr(p.attrs[k as AttrKey] + diff / 4.6);
  }
  p.pa = Math.max(p.pa, overall(p));
}

function Num({ label, value, min, max, onSet }: { label: string; value: number; min: number; max: number; onSet: (v: number) => void }) {
  const [v, setV] = useState(String(value));
  return (
    <label className="ti-field">
      <span>{label}</span>
      <input className="input" type="number" inputMode="numeric" min={min} max={max} value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => { const n = Math.round(Number(v)); if (Number.isFinite(n)) { const c = Math.max(min, Math.min(max, n)); setV(String(c)); onSet(c); } else setV(String(value)); }} />
    </label>
  );
}

function Money({ label, value, onSet }: { label: string; value: number; onSet: (v: number) => void }) {
  const [v, setV] = useState(fmtMoney(value).replace('£', ''));
  return (
    <label className="ti-field">
      <span>{label}</span>
      <input className="input" inputMode="decimal" value={v} placeholder="e.g. 25m or 500k"
        onChange={(e) => setV(e.target.value)}
        onBlur={() => { const n = parseMoney(v); if (n !== null) { onSet(n); setV(fmtMoney(n).replace('£', '')); } else setV(fmtMoney(value).replace('£', '')); }} />
    </label>
  );
}

const CM_LABEL: Record<string, string> = {
  corners: 'Corners', freeKicks: 'Free Kicks', longShots: 'Long Shots', marking: 'Marking', penalties: 'Penalties', throwIns: 'Throw Ins',
  aggression: 'Aggression', anticipation: 'Anticipation', bravery: 'Bravery', determination: 'Determination', flair: 'Flair', leadership: 'Influence',
  movement: 'Off the Ball', teamwork: 'Teamwork', acceleration: 'Acceleration', agility: 'Agility', balance: 'Balance', jumping: 'Jumping',
  naturalFitness: 'Natural Fitness', oneOnOnes: 'One on Ones',
};

export function PlayerEditor({ g, p }: { g: GameState; p: Player }) {
  const ui = useUI();
  const [page, setPage] = useState<'details' | 'attrs' | 'contract'>('details');
  // Any edit means the save keeps his own details rather than the database's
  const edit = (fn: () => void) => mutate(() => { fn(); p.cmEdited = true; });
  const year = Number(p.dob.slice(0, 4));
  const nowYear = Number(g.date.slice(0, 4));
  const clubs = Object.values(g.clubs).sort((a, b) => a.name.localeCompare(b.name));
  const moveTo = (clubId: number | null) => mutate((gg) => {
    const old = p.clubId !== null ? gg.clubs[p.clubId] : null;
    if (old) {
      old.lineup = old.lineup.map((id) => (id === p.id ? null : id));
      old.subs = old.subs.filter((id) => id !== p.id);
    }
    releaseShirt(p);
    p.clubId = clubId;
    p.squad = 'first';
    p.listed = false;
    p.joined = gg.date;
    if (clubId !== null && isMetaClub(gg.clubs[clubId], gg)) applyMetaProfile(p);
    if (clubId === gg.userClubId) numberUserSquad(gg);
    else if (clubId !== null) assignShirtNumbers(gg, clubId);
  });

  return (
    <div className="ti editor">
      <div className="seg">
        {([['details', 'Details'], ['attrs', 'Attributes'], ['contract', 'Contract & club']] as const).map(([id, l]) => <button key={id} className={page === id ? 'on' : ''} onClick={() => setPage(id)}>{l}</button>)}
      </div>

      {page === 'details' && (
        <div className="ti-grid" key={`d${p.id}`}>
          <label className="ti-field"><span>First name</span><input className="input" defaultValue={p.first} onBlur={(e) => edit(() => { p.first = e.target.value.trim(); })} /></label>
          <label className="ti-field"><span>Surname</span><input className="input" defaultValue={p.last} onBlur={(e) => edit(() => { p.last = e.target.value.trim() || p.last; })} /></label>
          <label className="ti-field"><span>Nationality</span>
            <select className="input" value={p.nat} onChange={(e) => edit(() => { p.nat = e.target.value; })}>
              {Object.keys(NATIONS).sort((a, b) => NATIONS[a].localeCompare(NATIONS[b])).map((c) => <option key={c} value={c}>{NATIONS[c]}</option>)}
            </select>
          </label>
          <label className="ti-field"><span>Position</span>
            <select className="input" value={p.pos} onChange={(e) => edit(() => { const pos = e.target.value as Pos; p.alt = p.alt.filter((x) => x !== pos); p.pos = pos; })}>
              {POSITIONS.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>
          <Num label="Age" value={nowYear - year - (g.date.slice(5) < p.dob.slice(5) ? 1 : 0)} min={14} max={45} onSet={(a) => edit(() => { const birthday = p.dob.slice(5); const y = nowYear - a - (g.date.slice(5) < birthday ? 1 : 0); p.dob = `${y}-${birthday}`; })} />
          <Num label={`Ability (now ${overall(p)})`} value={overall(p)} min={20} max={99} onSet={(v) => edit(() => setOverall(p, v))} />
          <Num label="Potential" value={p.pa} min={20} max={99} onSet={(v) => edit(() => { p.pa = Math.max(v, overall(p)); })} />
          <Num label="Morale %" value={Math.round(p.morale)} min={0} max={100} onSet={(v) => edit(() => { p.morale = v; })} />
          <Num label="Fitness %" value={Math.round(p.condition)} min={0} max={100} onSet={(v) => edit(() => { p.condition = v; })} />
          <label className="ti-field"><span>Personality</span>
            <select className="input" value={p.personality ?? ''} onChange={(e) => edit(() => { p.personality = e.target.value || undefined; p.cmEdited = true; })}>
              <option value="">(automatic)</option>
              {['Model Professional', 'Professional', 'Determined', 'Ambitious', 'Loyal', 'Balanced', 'Fairly Professional', 'Mercenary', 'Temperamental', 'Casual', 'Unambitious'].map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>
          <button className="btn wide-btn" disabled={!p.injury && !p.suspended} onClick={() => { edit(() => { p.injury = null; p.suspended = 0; p.yellowAcc = 0; }); ui.toast('Injury and suspension cleared'); }}>Clear injury & suspension</button>
        </div>
      )}

      {page === 'attrs' && (
        <div className="ed-attrs" key={`a${p.id}`}>
          {ATTR_GROUPS.map((gr) => (
            <div key={gr.name} className="ed-group">
              <h4>{gr.name}</h4>
              {gr.keys.map((k) => <Num key={k} label={ATTR_LABEL[k]} value={Math.round(p.attrs[k])} min={1} max={20} onSet={(v) => edit(() => { p.attrs[k] = v; p.pa = Math.max(p.pa, overall(p)); })} />)}
            </div>
          ))}
          {p.cm && (
            <div className="ed-group ed-cm">
              <h4>CM 01/02</h4>
              {CM_EXTRA.map((k, i) => <Num key={k} label={CM_LABEL[k]} value={Math.round(p.cm!.v[i])} min={1} max={20} onSet={(v) => edit(() => { p.cm!.v[i] = v; p.cm!.o = overall(p); p.cmEdited = true; })} />)}
            </div>
          )}
        </div>
      )}

      {page === 'contract' && (
        <div className="ti-grid" key={`c${p.id}`}>
          <Money label="Wage per week" value={p.wage} onSet={(v) => edit(() => { p.wage = Math.max(0, v); })} />
          <Num label="Contract ends (June)" value={p.contractEnd} min={g.season} max={g.season + 10} onSet={(v) => edit(() => { p.contractEnd = v; })} />
          <label className="ti-field wide"><span>Club</span>
            <select className="input" value={p.clubId ?? ''} onChange={(e) => { moveTo(e.target.value === '' ? null : Number(e.target.value)); ui.toast('Player moved'); }}>
              <option value="">Free agent</option>
              {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <Num label="Squad number" value={p.shirt ?? 0} min={0} max={99} onSet={(v) => edit(() => { p.shirt = v || undefined; })} />
          <label className="ti-field"><span>Squad</span>
            <select className="input" value={p.squad} onChange={(e) => edit(() => { p.squad = e.target.value as Player['squad']; })}>
              <option value="first">First team</option><option value="youth">Youth</option>
            </select>
          </label>
          <label className="ti-field"><span>Transfer listed</span>
            <select className="input" value={p.listed ? 1 : 0} onChange={(e) => edit(() => { p.listed = e.target.value === '1'; })}>
              <option value={1}>Yes</option><option value={0}>No</option>
            </select>
          </label>
          <p className="small muted ti-field wide" style={{ margin: 0 }}>Moving a player here is instant and free. Values update from ability, age and contract.</p>
        </div>
      )}
    </div>
  );
}

/** Club finances, reputation and facilities for any club, plus the board's confidence in you. */
export function ClubEditor({ g }: { g: GameState }) {
  const [clubId, setClubId] = useState(g.userClubId);
  const club: Club = g.clubs[clubId];
  const edit = (fn: () => void) => mutate(() => fn());
  const clubs = Object.values(g.clubs).sort((a, b) => a.name.localeCompare(b.name));
  return (
    <Card title="Editor" tag="Only you">
      <div className="ti-grid" key={clubId}>
        <label className="ti-field wide"><span>Club</span>
          <select className="input" value={clubId} onChange={(e) => setClubId(Number(e.target.value))}>
            {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}{c.id === g.userClubId ? ' (yours)' : ''}</option>)}
          </select>
        </label>
        <Money label="Bank balance" value={club.balance} onSet={(v) => edit(() => { club.balance = v; })} />
        <Money label="Transfer budget" value={club.transferBudget} onSet={(v) => edit(() => { club.transferBudget = Math.max(0, v); })} />
        <Money label="Wage budget per week" value={club.wageBudget} onSet={(v) => edit(() => { club.wageBudget = Math.max(0, v); })} />
        <Num label="Reputation" value={club.reputation} min={1} max={100} onSet={(v) => edit(() => { club.reputation = v; })} />
        <Num label="Training facilities (1–5)" value={club.facilities.training} min={1} max={5} onSet={(v) => edit(() => { club.facilities.training = v; })} />
        <Num label="Youth facilities (1–5)" value={club.facilities.youth} min={1} max={5} onSet={(v) => edit(() => { club.facilities.youth = v; })} />
        <Num label="Stadium capacity" value={club.capacity} min={500} max={120000} onSet={(v) => edit(() => { club.capacity = v; })} />
        {clubId === g.userClubId && <Num label="Board confidence %" value={g.board.confidence} min={0} max={100} onSet={(v) => edit(() => { g.board.confidence = v; })} />}
      </div>
    </Card>
  );
}
