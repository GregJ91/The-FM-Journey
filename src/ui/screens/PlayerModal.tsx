import { useState } from 'react';
import { NATIONS } from '../../game/data/names';
import { squadOf } from '../../game/generate';
import { ATTR_GROUPS, ATTR_LABEL, age, fmtMoney, fullName, marketValue, overall, scoutedPotential } from '../../game/ratings';
import { seasonLabel } from '../../game/season';
import { askingPrice, playerInterest, releasePlayer, renewContract, renewDemand, signFreeAgent, userBid, wageDemand, windowOpen } from '../../game/transfers';
import type { TrainingFocus } from '../../game/types';
import { mutate, useGame } from '../../store';
import { useUI } from '../context';
import { AttrVal, Ovr, PosTag, Sheet, Spark, Stars } from '../components/common';
import { PlayerStats } from '../components/PlayerStats';
import { Crest } from '../components/Crest';

const FOCUS_LABEL: Record<TrainingFocus, string> = { balanced: 'Balanced', attacking: 'Attack', defending: 'Defend', technical: 'Technical', physical: 'Physical', mental: 'Mental' };

export function PlayerModal() {
  const g = useGame();
  const ui = useUI();
  const id = ui.playerId;
  const [bid, setBid] = useState<number | null>(null);
  const [tab, setTab] = useState<'attrs' | 'stats' | 'actions'>('attrs');
  if (id === null) return null;
  const p = g.players[id];
  if (!p) return null;
  const club = p.clubId !== null ? g.clubs[p.clubId] : null;
  const user = g.clubs[g.userClubId];
  const own = p.clubId === g.userClubId;
  const ovr = overall(p);
  const value = marketValue(p, g.date);
  const ask = p.clubId !== null && !own ? askingPrice(g, p) : 0;
  const bidVal = bid ?? ask;
  const bg = club ? club.colors[0] : '#d8d0c1';
  const isGK = p.pos === 'GK';
  const groups = ATTR_GROUPS.filter((gr) => isGK || gr.name !== 'Goalkeeping');
  const shortlisted = g.shortlist.includes(p.id);
  const interest = !own ? playerInterest(g, p, user) : null;
  const close = () => { ui.openPlayer(null); setBid(null); setTab('attrs'); };
  const act = (fn: () => { ok: boolean; msg: string }) => {
    const r = mutate(fn);
    ui.toast(r.msg, !r.ok);
  };
  const toggleShortlist = () => mutate((gg) => { gg.shortlist = shortlisted ? gg.shortlist.filter((x) => x !== p.id) : [...gg.shortlist, p.id]; });

  return (
    <Sheet onClose={close}>
      <div className="pcard-head" style={{ background: `radial-gradient(120% 140% at 0% 0%, ${bg}, transparent 70%), radial-gradient(90% 120% at 100% 100%, ${club?.colors[1] ?? '#334155'}55, transparent 60%), #10131a` }}>
        <Ovr value={ovr} lg />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="first">{p.first}</div>
          <h2 className="bigname ellipsis">{p.last}</h2>
          <div className="row wrap" style={{ marginTop: 6, gap: 5 }}>
            <PosTag pos={p.pos} />
            {p.alt.map((a) => <span key={a} className="chip">{a}</span>)}
            <span className="chip">{age(p, g.date)}y</span>
          </div>
        </div>
        <div style={{ textAlign: 'center', flex: 'none' }}>
          {club ? <Crest club={club} size={54} /> : <span className="chip">Free</span>}
        </div>
        <button className="btn sm" style={{ position: 'absolute', top: 8, right: 8 }} onClick={close}>✕</button>
      </div>
      <div className="sheet-b">
        <div className="small bold muted" style={{ marginBottom: 10 }}>
          {NATIONS[p.nat] ?? p.nat} · {p.foot === 'L' ? 'Left' : p.foot === 'R' ? 'Right' : 'Both'} footed · {club?.name ?? 'Free agent'}
          {p.injury && <span style={{ color: 'var(--bad)' }}> · 🩹 {p.injury.name} ({p.injury.days}d)</span>}
          {p.suspended > 0 && <span style={{ color: 'var(--bad)' }}> · Suspended {p.suspended}</span>}
        </div>
        <div className="kv">
          <div><div className="k">Potential</div><div className="v"><Stars ovr={scoutedPotential(p, own)} /></div></div>
          <div><div className="k">Value</div><div className="v">{fmtMoney(value)}</div></div>
          <div><div className="k">Wage</div><div className="v">{fmtMoney(p.wage)}/wk</div></div>
          <div><div className="k">Contract</div><div className="v">{p.clubId === null ? '—' : `June ${p.contractEnd}`}</div></div>
          <div><div className="k">Condition · Morale</div><div className="v">{Math.round(p.condition)}% · {p.morale >= 75 ? '😃' : p.morale >= 55 ? '🙂' : p.morale >= 35 ? '😐' : '😠'}</div></div>
          <div><div className="k">Last month</div><div className="v" style={{ color: p.lastChange > 0 ? 'var(--good)' : p.lastChange < 0 ? 'var(--bad)' : undefined }}>{p.lastChange > 0 ? `▲ +${p.lastChange}` : p.lastChange < 0 ? `▼ ${p.lastChange}` : '—'} {p.form.length > 0 && <Spark values={p.form} />}</div></div>
        </div>

        <div className="seg" style={{ marginBottom: 12 }}>
          <button className={tab === 'attrs' ? 'on' : ''} onClick={() => setTab('attrs')}>Attributes</button>
          <button className={tab === 'stats' ? 'on' : ''} onClick={() => setTab('stats')}>Stats</button>
          <button className={tab === 'actions' ? 'on' : ''} onClick={() => setTab('actions')}>{own ? 'Manage' : 'Transfer'}</button>
        </div>

        {tab === 'attrs' && (
          <div className="attr-grid">
            {groups.map((gr) => (
              <div key={gr.name} className="attr-col">
                <h4>{gr.name}</h4>
                {gr.keys.map((k) => (
                  <div key={k} className="attr-row"><span>{ATTR_LABEL[k]}</span><AttrVal v={p.attrs[k]} /></div>
                ))}
              </div>
            ))}
          </div>
        )}

        {tab === 'stats' && (
          <>
            <PlayerStats p={p} />
            {p.history.length > 0 && (
              <>
              <div className="section-label">Career</div>
              <table className="t">
                <thead><tr><th>Season</th><th>Club</th><th className="r">Apps</th><th className="r">Gls</th><th className="r">Avg</th></tr></thead>
                <tbody>
                  {[...p.history].reverse().slice(0, 8).map((h, i) => (
                    <tr key={i}><td>{seasonLabel(h.season)}</td><td className="ellipsis" style={{ maxWidth: 120 }}>{g.clubs[h.clubId]?.name}</td><td className="r">{h.apps}</td><td className="r">{h.goals}</td><td className="r">{h.avg.toFixed(2)}</td></tr>
                  ))}
                </tbody>
              </table>
              </>
            )}
          </>
        )}

        {tab === 'actions' && own && (
          <div className="col">
            <div className="field">
              <label>Individual training focus</label>
              <div className="seg" style={{ flexWrap: 'wrap' }}>
                <button className={p.focus === null ? 'on' : ''} onClick={() => mutate(() => { p.focus = null; })}>Team</button>
                {(Object.keys(FOCUS_LABEL) as TrainingFocus[]).filter((f) => f !== 'balanced').map((f) => (
                  <button key={f} className={p.focus === f ? 'on' : ''} onClick={() => mutate(() => { p.focus = f; })}>{FOCUS_LABEL[f]}</button>
                ))}
              </div>
            </div>
            <button className="btn primary block" onClick={() => act(() => renewContract(g, p.id, 3))}>Renew contract · 3 yrs at {fmtMoney(renewDemand(g, p))}/wk</button>
            <div className="grid2">
              <button className="btn" onClick={() => mutate(() => { p.listed = !p.listed; })}>{p.listed ? 'Unlist' : '🏷️ Transfer list'}</button>
              <button className="btn" onClick={() => mutate(() => { p.squad = p.squad === 'first' ? 'youth' : 'first'; user.lineup = user.lineup.map((x) => (x === p.id ? null : x)); user.subs = user.subs.filter((x) => x !== p.id); })}>
                {p.squad === 'first' ? '→ Youth team' : '⬆ First team'}
              </button>
            </div>
            <button className="btn coral block" onClick={() => { if (confirm(`Release ${fullName(p)}? You will pay off half the remaining contract.`)) { act(() => releasePlayer(g, p.id)); close(); } }}>Release player</button>
            <div className="small muted">{squadOf(g, user.id).length} players in first team</div>
          </div>
        )}

        {tab === 'actions' && !own && p.clubId !== null && (
          <div className="col">
            <div className="small">Asking price <b>{fmtMoney(ask)}</b> · wants <b>{fmtMoney(wageDemand(g, p, user))}/wk</b></div>
            {interest && !interest.ok && <div className="small" style={{ color: 'var(--bad)', fontWeight: 700 }}>⚠️ {interest.reason}</div>}
            {!windowOpen(g) && <div className="small" style={{ color: 'var(--bad)', fontWeight: 700 }}>Window closed — bids open in January and July.</div>}
            <div className="row">
              <input type="range" min={Math.round(ask * 0.4)} max={Math.max(ask * 1.6, 10000)} step={Math.max(1000, Math.round(ask / 100))} value={bidVal} onChange={(e) => setBid(Number(e.target.value))} style={{ flex: 1, height: 30 }} />
              <b style={{ minWidth: 64, textAlign: 'right', fontFamily: 'var(--display)', fontSize: 18 }}>{fmtMoney(bidVal)}</b>
            </div>
            <button className="btn primary block" disabled={!windowOpen(g)} onClick={() => act(() => userBid(g, p.id, bidVal))}>Submit bid</button>
            <button className="btn block" onClick={toggleShortlist}>{shortlisted ? '★ Shortlisted' : '☆ Add to shortlist'}</button>
            <div className="small muted">Your budget: {fmtMoney(user.transferBudget)}</div>
          </div>
        )}

        {tab === 'actions' && p.clubId === null && (
          <div className="col">
            <div className="small">Free agent · wants <b>{fmtMoney(wageDemand(g, p, user))}/wk</b></div>
            {interest && !interest.ok && <div className="small" style={{ color: 'var(--bad)', fontWeight: 700 }}>⚠️ {interest.reason}</div>}
            <button className="btn primary block" onClick={() => act(() => signFreeAgent(g, p.id))}>Sign on a free</button>
            <button className="btn block" onClick={toggleShortlist}>{shortlisted ? '★ Shortlisted' : '☆ Add to shortlist'}</button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
