import { useState } from 'react';
import { NATIONS } from '../../game/data/names';
import { fmtDate } from '../../game/dates';
import { squadOf } from '../../game/generate';
import { ATTR_GROUPS, ATTR_LABEL, age, avgRating, fmtMoney, fullName, marketValue, overall, scoutedPotential } from '../../game/ratings';
import { seasonLabel } from '../../game/season';
import { askingPrice, playerInterest, releasePlayer, renewContract, renewDemand, signFreeAgent, userBid, wageDemand, windowOpen } from '../../game/transfers';
import type { TrainingFocus } from '../../game/types';
import { mutate, useGame } from '../../store';
import { useUI } from '../context';
import { AttrVal, Ovr, PosTag, Spark, Stars } from '../components/common';
import { Crest, textOn } from '../components/Crest';

const FOCUS_LABEL: Record<TrainingFocus, string> = { balanced: 'Balanced', attacking: 'Attacking', defending: 'Defending', technical: 'Technical', physical: 'Physical', mental: 'Mental' };

export function PlayerModal() {
  const g = useGame();
  const ui = useUI();
  const id = ui.playerId;
  const [bid, setBid] = useState<number | null>(null);
  if (id === null) return null;
  const p = g.players[id];
  if (!p) return null;
  const club = p.clubId !== null ? g.clubs[p.clubId] : null;
  const user = g.clubs[g.userClubId];
  const own = p.clubId === g.userClubId;
  const ovr = overall(p);
  const pot = scoutedPotential(p, own);
  const value = marketValue(p, g.date);
  const ask = p.clubId !== null && !own ? askingPrice(g, p) : 0;
  const bidVal = bid ?? ask;
  const bg = club ? club.colors[0] : '#d8d0c1';
  const fg = textOn(bg);
  const isGK = p.pos === 'GK';
  const groups = ATTR_GROUPS.filter((gr) => isGK || gr.name !== 'Goalkeeping');
  const shortlisted = g.shortlist.includes(p.id);
  const interest = !own ? playerInterest(g, p, user) : null;

  const act = (fn: () => { ok: boolean; msg: string }) => {
    const r = mutate(fn);
    ui.toast(r.msg, !r.ok);
  };

  return (
    <div className="overlay" onClick={() => ui.openPlayer(null)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="btn sm modal-close" onClick={() => ui.openPlayer(null)}>✕ Close</button>
        <div className="pcard-head" style={{ background: `linear-gradient(115deg, ${bg} 0 70%, ${club?.colors[1] ?? '#fff'} 70% 74%, ${bg} 74%)`, color: fg }}>
          <Ovr value={ovr} lg />
          <div style={{ minWidth: 0 }}>
            <div className="first">{p.first}</div>
            <h2 className="bigname">{p.last}</h2>
            <div className="row wrap" style={{ marginTop: 8, gap: 8 }}>
              <PosTag pos={p.pos} />
              {p.alt.map((a) => <span key={a} className="chip" style={{ color: '#15120f' }}>{a}</span>)}
              <span className="chip" style={{ color: '#15120f' }}>{NATIONS[p.nat] ?? p.nat}</span>
              <span className="chip" style={{ color: '#15120f' }}>{age(p, g.date)} yrs</span>
              <span className="chip" style={{ color: '#15120f' }}>{p.foot === 'L' ? 'Left' : p.foot === 'R' ? 'Right' : 'Both'} footed</span>
              {p.injury && <span className="chip" style={{ background: 'var(--coral)', color: '#fff' }}>🩹 {p.injury.name} · {p.injury.days}d</span>}
              {p.suspended > 0 && <span className="chip" style={{ background: 'var(--coral)', color: '#fff' }}>Suspended {p.suspended}</span>}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            {club ? <Crest club={club} size={84} /> : <div className="chip">Free agent</div>}
            <div className="small bold" style={{ marginTop: 4 }}>{club?.name}</div>
          </div>
        </div>
        <div className="pcard-body">
          <div className="kv">
            <div><div className="k">Potential</div><div className="v"><Stars ovr={pot} /></div></div>
            <div><div className="k">Value</div><div className="v">{fmtMoney(value)}</div></div>
            <div><div className="k">Wage</div><div className="v">{fmtMoney(p.wage)}/wk</div></div>
            <div><div className="k">Contract</div><div className="v">{p.clubId === null ? '—' : `June ${p.contractEnd}`}</div></div>
            <div><div className="k">Condition</div><div className="v">{Math.round(p.condition)}%</div></div>
            <div><div className="k">Morale</div><div className="v">{p.morale >= 75 ? 'Superb 😃' : p.morale >= 55 ? 'Good 🙂' : p.morale >= 35 ? 'Okay 😐' : 'Poor 😠'}</div></div>
            <div><div className="k">Last month</div><div className="v" style={{ color: p.lastChange > 0 ? 'var(--good)' : p.lastChange < 0 ? 'var(--bad)' : undefined }}>{p.lastChange > 0 ? `▲ +${p.lastChange}` : p.lastChange < 0 ? `▼ ${p.lastChange}` : 'No change'}</div></div>
            <div><div className="k">Form</div><div className="v"><Spark values={p.form} /></div></div>
          </div>

          <div className="attr-grid">
            {groups.map((gr) => (
              <div key={gr.name} className="attr-col">
                <h4>{gr.name}</h4>
                {gr.keys.map((k) => (
                  <div key={k} className="attr-row">
                    <span>{ATTR_LABEL[k]}</span>
                    <AttrVal v={p.attrs[k]} />
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="grid g2" style={{ marginTop: 20 }}>
            <div className="card" style={{ boxShadow: 'none' }}>
              <div className="card-h"><h3>This season</h3></div>
              <div className="row wrap" style={{ gap: 16 }}>
                <div><div className="small muted bold">APPS</div><div className="bold" style={{ fontSize: 20 }}>{p.stats.apps}</div></div>
                <div><div className="small muted bold">GOALS</div><div className="bold" style={{ fontSize: 20 }}>{p.stats.goals}</div></div>
                <div><div className="small muted bold">ASSISTS</div><div className="bold" style={{ fontSize: 20 }}>{p.stats.assists}</div></div>
                <div><div className="small muted bold">AVG</div><div className="bold" style={{ fontSize: 20 }}>{p.stats.apps ? avgRating(p).toFixed(2) : '—'}</div></div>
                <div><div className="small muted bold">{isGK ? 'CLEAN SH.' : 'MOTM'}</div><div className="bold" style={{ fontSize: 20 }}>{isGK ? p.stats.cleanSheets : p.stats.motm}</div></div>
                <div><div className="small muted bold">CARDS</div><div className="bold" style={{ fontSize: 20 }}>{p.stats.yellows}🟨 {p.stats.reds}🟥</div></div>
              </div>
              {p.history.length > 0 && (
                <table className="t" style={{ marginTop: 12 }}>
                  <thead><tr><th>Season</th><th>Club</th><th className="r">Apps</th><th className="r">Gls</th><th className="r">Avg</th></tr></thead>
                  <tbody>
                    {[...p.history].reverse().slice(0, 8).map((h, i) => (
                      <tr key={i}><td>{seasonLabel(h.season)}</td><td>{g.clubs[h.clubId]?.name}</td><td className="r">{h.apps}</td><td className="r">{h.goals}</td><td className="r">{h.avg.toFixed(2)}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="card" style={{ boxShadow: 'none' }}>
              <div className="card-h"><h3>Actions</h3></div>
              {own && (
                <div className="col">
                  <div className="field">
                    <label>Individual training focus</label>
                    <div className="seg" style={{ flexWrap: 'wrap' }}>
                      <button className={p.focus === null ? 'on' : ''} onClick={() => mutate(() => { p.focus = null; })}>Team</button>
                      {(Object.keys(FOCUS_LABEL) as TrainingFocus[]).map((f) => (
                        <button key={f} className={p.focus === f ? 'on' : ''} onClick={() => mutate(() => { p.focus = f; })}>{FOCUS_LABEL[f]}</button>
                      ))}
                    </div>
                  </div>
                  <div className="row wrap">
                    <button className="btn sm primary" onClick={() => act(() => renewContract(g, p.id, 3))}>Renew 3 yrs ({fmtMoney(renewDemand(g, p))}/wk)</button>
                    <button className="btn sm" onClick={() => mutate(() => { p.listed = !p.listed; })}>{p.listed ? 'Remove from transfer list' : 'Transfer list'}</button>
                    <button className="btn sm" onClick={() => mutate(() => { p.squad = p.squad === 'first' ? 'youth' : 'first'; user.lineup = user.lineup.map((x) => (x === p.id ? null : x)); user.subs = user.subs.filter((x) => x !== p.id); })}>
                      {p.squad === 'first' ? 'Move to youth team' : 'Promote to first team'}
                    </button>
                    <button className="btn sm coral" onClick={() => { if (confirm(`Release ${fullName(p)}? You will pay off half the remaining contract.`)) { act(() => releasePlayer(g, p.id)); ui.openPlayer(null); } }}>Release</button>
                  </div>
                  <div className="small muted">Joined {fmtDate(p.joined, false)} · {squadOf(g, user.id).length} in first team</div>
                </div>
              )}
              {!own && p.clubId !== null && (
                <div className="col">
                  <div className="small">Asking price: <b>{fmtMoney(ask)}</b> · Wage demand: <b>{fmtMoney(wageDemand(g, p, user))}/wk</b></div>
                  {interest && !interest.ok && <div className="small" style={{ color: 'var(--bad)', fontWeight: 700 }}>⚠️ {interest.reason}</div>}
                  {!windowOpen(g) && <div className="small" style={{ color: 'var(--bad)', fontWeight: 700 }}>Transfer window closed — bids open in January or July.</div>}
                  <div className="row">
                    <input className="input" type="range" min={Math.round(ask * 0.4)} max={Math.max(ask * 1.6, 10000)} step={Math.max(1000, Math.round(ask / 100))} value={bidVal} onChange={(e) => setBid(Number(e.target.value))} style={{ flex: 1 }} />
                    <b style={{ minWidth: 70, textAlign: 'right' }}>{fmtMoney(bidVal)}</b>
                  </div>
                  <div className="row wrap">
                    <button className="btn sm primary" disabled={!windowOpen(g)} onClick={() => act(() => userBid(g, p.id, bidVal))}>Submit bid</button>
                    <button className="btn sm" onClick={() => mutate((gg) => { gg.shortlist = shortlisted ? gg.shortlist.filter((x) => x !== p.id) : [...gg.shortlist, p.id]; })}>{shortlisted ? '★ Shortlisted' : '☆ Shortlist'}</button>
                  </div>
                  <div className="small muted">Your budget: {fmtMoney(user.transferBudget)}</div>
                </div>
              )}
              {p.clubId === null && (
                <div className="col">
                  <div className="small">Free agent. Wage demand: <b>{fmtMoney(wageDemand(g, p, user))}/wk</b></div>
                  {interest && !interest.ok && <div className="small" style={{ color: 'var(--bad)', fontWeight: 700 }}>⚠️ {interest.reason}</div>}
                  <div className="row">
                    <button className="btn sm primary" onClick={() => act(() => signFreeAgent(g, p.id))}>Sign on a free</button>
                    <button className="btn sm" onClick={() => mutate((gg) => { gg.shortlist = shortlisted ? gg.shortlist.filter((x) => x !== p.id) : [...gg.shortlist, p.id]; })}>{shortlisted ? '★ Shortlisted' : '☆ Shortlist'}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
