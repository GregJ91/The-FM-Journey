import { useState } from 'react';
import { NATIONS } from '../../game/data/names';
import { nationName } from '../../game/intl';
import { squadOf } from '../../game/generate';
import { ATTR_GROUPS, ATTR_LABEL, age, fmtMoney, fullName, marketValue, overall, ratingAt, scoutedPotential } from '../../game/ratings';
import { seasonLabel } from '../../game/season';
import { askingPrice, playerInterest, releasePlayer, renewContract, renewDemand, signFreeAgent, userBid, wageDemand, windowOpen } from '../../game/transfers';
import type { Pos, TrainingFocus } from '../../game/types';
import { mutate, useGame } from '../../store';
import { useUI } from '../context';
import { AttrVal, Card, CondBar, ConfirmButton, Ovr, PosTag, Spark, Stars } from '../components/common';
import { PlayerStats } from '../components/PlayerStats';
import { Crest } from '../components/Crest';
import { personalityOf } from '../../game/personality';
import { journey, scoutRange } from '../../game/journey';

const FOCUS_LABEL: Record<TrainingFocus, string> = { balanced: 'Balanced', attacking: 'Attack', defending: 'Defend', technical: 'Technical', physical: 'Physical', mental: 'Mental' };

export function PlayerModal() {
  const g = useGame();
  const ui = useUI();
  const id = ui.playerId;
  const [bid, setBid] = useState<number | null>(null);
  const [tab, setTab] = useState<'attrs' | 'stats' | 'career' | 'actions'>('attrs');
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

  const posRating = (pos: Pos) => Math.round(ratingAt(p, pos));
  const fam = (pos: Pos) => {
    if (pos === p.pos) return 'nat';
    const r = posRating(pos);
    if (isGK !== (pos === 'GK')) return '';
    return r >= ovr - 2 ? 'nat' : r >= ovr - 6 ? 'acc' : r >= ovr - 11 ? 'unc' : '';
  };
  const a = p.attrs;
  const avg = (...ks: (keyof typeof a)[]) => ks.reduce((s, k) => s + a[k], 0) / ks.length;
  const radar: [string, number][] = isGK
    ? [['Shot stopping', a.reflexes], ['Handling', a.handling], ['Aerial', a.aerial], ['Distribution', a.distribution], ['Positioning', a.positioning], ['Mental', avg('decisions', 'composure')]]
    : [['Attacking', avg('finishing', 'composure')], ['Technique', avg('dribbling', 'firstTouch', 'passing')], ['Vision', avg('vision', 'decisions')], ['Defending', avg('tackling', 'positioning')], ['Aerial', avg('heading', 'strength')], ['Physical', avg('stamina', 'strength', 'workRate')], ['Speed', a.pace]];
  const pers = personalityOf(p);
  const scouted = !!journey(g) && !own;
  const range = (v: number, salt = 0) => scoutRange(g, v, p.id, salt);
  const [olo, ohi] = range(ovr);
  const mood = p.morale >= 80 ? ['Superb', 'var(--grass)'] : p.morale >= 65 ? ['Good', 'var(--grass)'] : p.morale >= 45 ? ['Okay', 'var(--yellow)'] : p.morale >= 30 ? ['Poor', 'var(--orange)'] : ['Very poor', 'var(--coral)'];

  return (
    <div className="profile-screen" style={{ '--pc1': bg, '--pc2': club?.colors[1] ?? '#334155' } as React.CSSProperties}>
      <div className="pf-head">
        <div className="pf-no">{p.shirt ?? '–'}</div>
        <div className="pf-name">
          <span className="pf-first">{p.first}</span>
          <b className="pf-last">{p.last}</b>
          <span className="pf-meta"><PosTag pos={p.pos} /> {age(p, g.date)} years · {NATIONS[p.nat] ?? nationName(p.nat)} · {p.foot === 'L' ? 'Left' : p.foot === 'R' ? 'Right' : 'Either'} foot</span>
        </div>
        <div className="pf-club">{club ? <><Crest club={club} size={40} /><span>{club.name}</span></> : <span className="chip">Free agent</span>}</div>
        <div className="pf-ability">{scouted && olo !== ohi ? <span className="ovr lg plain">{olo}-{ohi}</span> : <Ovr value={ovr} lg />}<Stars ovr={scoutedPotential(p, own)} /></div>
        <button className="pf-close" onClick={close} aria-label="Close">✕</button>
      </div>

      <div className="tabs pf-tabs">
        <button className={`tab ${tab === 'attrs' ? 'active' : ''}`} onClick={() => setTab('attrs')}>Profile</button>
        <button className={`tab ${tab === 'stats' ? 'active' : ''}`} onClick={() => setTab('stats')}>Stats</button>
        <button className={`tab ${tab === 'career' ? 'active' : ''}`} onClick={() => setTab('career')}>Career</button>
        <button className={`tab ${tab === 'actions' ? 'active' : ''}`} onClick={() => setTab('actions')}>{own ? 'Manage' : 'Transfer'}</button>
        {(p.injury || p.suspended > 0 || p.away) && (
          <span className="pf-alert">
            {p.injury && <>🩹 {p.injury.name} ({p.injury.days}d)</>}
            {p.suspended > 0 && <> 🟥 Suspended {p.suspended}</>}
            {p.away && <> ✈️ {p.away}</>}
          </span>
        )}
      </div>

      <div className="pf-body">
        {tab === 'attrs' && (
          <div className="cols pf-cols">
            <Card title="Attributes" tag={`${ovr} OVR`} tagColor="var(--accent)">
              <div className="pf-attrs">
                {[groups.slice(0, 1), groups.slice(1, 2), groups.slice(2)].map((col, ci) => (
                  <div key={ci} className="pf-attr-col">
                    {col.map((gr) => (
                      <div key={gr.name}>
                        <h4>{gr.name}</h4>
                        {gr.keys.map((k) => (
                          <div key={k} className="pf-attr"><span>{ATTR_LABEL[k]}</span>{scouted && range(p.attrs[k], k.length)[0] !== range(p.attrs[k], k.length)[1] ? <span className="attr a1 rng">{range(p.attrs[k], k.length).join('-')}</span> : <AttrVal v={p.attrs[k]} />}</div>
                        ))}
                      </div>
                    ))}
                    {ci === 2 && <Radar axes={radar} />}
                  </div>
                ))}
              </div>
            </Card>
            <Card title="Positions">
              <div className="pf-pitch">
                {POS_SPOTS.map(([pos, x, y]) => {
                  const f = fam(pos);
                  return <span key={pos} className={`pf-spot ${f}`} style={{ left: `${x}%`, top: `${y}%` }} title={`${pos} ${posRating(pos)}`}>{f ? pos : ''}</span>;
                })}
              </div>
              <div className="pf-key"><i className="nat" /> Natural <i className="acc" /> Accomplished <i className="unc" /> Unconvincing</div>
            </Card>
            <Card title="Player info">
              <div className="pf-info">
                <div><span>Value</span><b>{fmtMoney(value)}</b></div>
                <div><span>Wage</span><b>{fmtMoney(p.wage)}/wk</b></div>
                <div><span>Contract</span><b>{p.clubId === null ? '—' : `June ${p.contractEnd}`}</b></div>
                <div><span>Condition</span><b><CondBar v={p.condition} /> {Math.round(p.condition)}%</b></div>
                <div><span>Personality</span><b style={{ color: pers.good === true ? 'var(--grass)' : pers.good === false ? 'var(--coral)' : undefined }} title={pers.blurb}>{pers.name}</b></div>
                <div><span>Morale</span><b style={{ color: mood[1] }}>{mood[0]}</b></div>
                <div><span>Form</span><b>{p.form.length ? <Spark values={p.form} /> : null}<span style={{ color: p.lastChange > 0 ? 'var(--good)' : p.lastChange < 0 ? 'var(--bad)' : undefined }}>{p.lastChange > 0 ? `▲ +${p.lastChange}` : p.lastChange < 0 ? `▼ ${p.lastChange}` : p.form.length ? '' : '—'}</span></b></div>
                <div><span>Season</span><b>{p.stats.apps} apps · {p.stats.goals} gls · {p.stats.assists} ast</b></div>
                <div><span>International</span><b>{p.caps ? `${p.caps} caps, ${p.intGoals ?? 0} goals` : 'Uncapped'}</b></div>
              </div>
            </Card>
          </div>
        )}

        {tab === 'stats' && <div className="cols pf-cols"><Card title="This season" className="grow"><PlayerStats p={p} /></Card></div>}

        {tab === 'career' && (
          <div className="cols pf-cols">
            <Card title="Career" className="grow">
            {p.history.length > 0 ? (
              <table className="t">
                <thead><tr><th>Season</th><th>Club</th><th className="r">Apps</th><th className="r">Gls</th><th className="r">Avg</th></tr></thead>
                <tbody>
                  {[...p.history].reverse().slice(0, 8).map((h, i) => (
                    <tr key={i}><td>{seasonLabel(h.season)}</td><td className="ellipsis" style={{ maxWidth: 120 }}>{g.clubs[h.clubId]?.name}</td><td className="r">{h.apps}</td><td className="r">{h.goals}</td><td className="r">{h.avg.toFixed(2)}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="empty">No completed seasons yet.</div>}
            </Card>
          </div>
        )}

        {tab === 'actions' && own && (
          <div className="col pf-actions">
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
            <ConfirmButton className="btn coral block" label="Release player" confirmLabel={`Tap again: release ${fullName(p)} and pay off half the contract`} onConfirm={() => { act(() => releasePlayer(g, p.id)); close(); }} />
            <div className="small muted">{squadOf(g, user.id).length} players in first team</div>
          </div>
        )}

        {tab === 'actions' && !own && scouted && (
          <div className="col pf-actions">
            <div className="objective">🧭 In The Journey your director of football handles all signings. Ask him for a player in this position from the Recruitment screen.</div>
            <button className="btn primary block" onClick={() => { close(); ui.go('transfers'); }}>Go to Recruitment</button>
            <button className="btn block" onClick={toggleShortlist}>{shortlisted ? '★ Shortlisted' : '☆ Add to shortlist'}</button>
          </div>
        )}

        {tab === 'actions' && !own && !scouted && p.clubId !== null && (
          <div className="col pf-actions">
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

        {tab === 'actions' && p.clubId === null && !scouted && (
          <div className="col pf-actions">
            <div className="small">Free agent · wants <b>{fmtMoney(wageDemand(g, p, user))}/wk</b></div>
            {interest && !interest.ok && <div className="small" style={{ color: 'var(--bad)', fontWeight: 700 }}>⚠️ {interest.reason}</div>}
            <button className="btn primary block" onClick={() => act(() => signFreeAgent(g, p.id))}>Sign on a free</button>
            <button className="btn block" onClick={toggleShortlist}>{shortlisted ? '★ Shortlisted' : '☆ Add to shortlist'}</button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Where each position sits on the mini pitch (x, y in %; attacking upwards). */
const POS_SPOTS: [Pos, number, number][] = [
  ['ST', 50, 10], ['AML', 15, 27], ['AMC', 50, 27], ['AMR', 85, 27], ['ML', 15, 45], ['MC', 50, 45], ['MR', 85, 45],
  ['DM', 50, 62], ['DL', 15, 77], ['DC', 50, 77], ['DR', 85, 77], ['GK', 50, 92],
];

/** FM-style attribute polygon. */
function Radar({ axes }: { axes: [string, number][] }) {
  const n = axes.length;
  const R = 40;
  const pt = (i: number, r: number) => {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [50 + Math.cos(ang) * r, 50 + Math.sin(ang) * r];
  };
  const ring = (f: number) => axes.map((_, i) => pt(i, R * f).join(',')).join(' ');
  const shape = axes.map(([, v], i) => pt(i, R * Math.max(0.05, Math.min(1, v / 20))).join(',')).join(' ');
  return (
    <svg className="pf-radar" viewBox="-30 -8 160 116">
      {[0.25, 0.5, 0.75, 1].map((f) => <polygon key={f} points={ring(f)} className="rg" />)}
      {axes.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={50} y1={50} x2={x} y2={y} className="rg" />; })}
      <polygon points={shape} className="rs" />
      {axes.map(([label], i) => { const [x, y] = pt(i, R + 9); return <text key={label} x={x} y={y} textAnchor={x < 45 ? 'end' : x > 55 ? 'start' : 'middle'} dominantBaseline="middle">{label}</text>; })}
    </svg>
  );
}
