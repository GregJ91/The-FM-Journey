import { useState } from 'react';
import { FORMATIONS } from '../../game/formations';
import { ROLE_KEYS } from '../../game/fit';
import { squadOf } from '../../game/generate';
import { DOF_SHORTLIST, STAFF_COST, journey, pursue, rejectCandidate, repLabel, requestPlayer, scoutRange, scoutingDays, systemFitFor, upgradeStaff } from '../../game/journey';
import { NATIONS } from '../../game/data/names';
import { personalityOf } from '../../game/personality';
import { ATTR_LABEL, age, fmtMoney, overall, ratingAt, shortName, stars } from '../../game/ratings';
import { roleFor } from '../../game/tactics';
import { windowOpen } from '../../game/transfers';
import type { RecruitRequest } from '../../game/types';
import { mutate, useGame } from '../../store';
import { useUI } from '../context';
import { Card, PosTag } from '../components/common';
import { Crest } from '../components/Crest';

const REACH = ['', 'Nearby divisions in your country', 'All of your country', 'England and Scotland', '+ Spain, Italy, Germany, France', 'The whole world'];
const starRow = (n: number, maybe = 0) => <span className="stars">{'★'.repeat(n)}<span className="maybe">{'★'.repeat(maybe)}</span><span className="off">{'★'.repeat(Math.max(0, 5 - n - maybe))}</span></span>;

/** The Journey: you can't buy players yourself; your director of football finds them. */
export function Recruitment() {
  const g = useGame();
  const ui = useUI();
  const j = journey(g)!;
  const club = g.clubs[g.userClubId];
  const slots = FORMATIONS[club.tactics.formation];
  const squad = squadOf(g, club.id);
  const avgWage = Math.max(200, Math.round(squad.reduce((s, p) => s + p.wage, 0) / Math.max(1, squad.length)));
  const wageSteps = [0.5, 0.75, 1, 1.5, 2, 3].map((m) => Math.round((avgWage * m) / 50) * 50);
  // Suggest the weakest starting slot
  const weakest = slots.map((s, i) => ({ i, r: club.lineup[i] !== null && g.players[club.lineup[i]!] ? ratingAt(g.players[club.lineup[i]!], s.pos) : 0 })).sort((a, b) => a.r - b.r)[0]?.i ?? 0;
  const [slot, setSlot] = useState(weakest);
  const [maxAge, setMaxAge] = useState(30);
  const [maxWage, setMaxWage] = useState(wageSteps[2]);
  const [sel, setSel] = useState<number | null>(j.requests.find((r) => r.status === 'ready')?.id ?? null);
  const act = (fn: () => { ok: boolean; msg: string }) => { const r = mutate(fn); ui.toast(r.msg, !r.ok); };
  const req = j.requests.find((r) => r.id === sel) ?? j.requests.find((r) => r.status === 'ready');

  return (
    <div className="cols recruit">
      <div className="page-title">
        <h1>Recruitment</h1>
        <div className="chips">
          <span className="chip">💷 {fmtMoney(club.transferBudget)}</span>
          <span className="chip">{windowOpen(g) ? '🟢 Window open' : '🔴 Window shut: free agents only'}</span>
        </div>
      </div>

      <Card title="Director of Football" tag={`Rep ${Math.round(j.rep)}`} tagColor="var(--violet)">
        <div className="pf-info">
          <div><span>Director of Football</span><b>{starRow(j.dof)}</b></div>
          <div><span>Scouting department</span><b>{starRow(j.scouting)}</b></div>
          <div><span>Scouting reach</span><b>{REACH[j.scouting]}</b></div>
          <div><span>Options per request</span><b>{DOF_SHORTLIST[j.dof]}</b></div>
          <div><span>Report back in</span><b>{scoutingDays(j)} days</b></div>
          <div><span>Your reputation</span><b>{repLabel(j.rep)}</b></div>
        </div>
        {j.upgrade ? (
          <div className="objective" style={{ marginTop: 8 }}>⏳ {j.upgrade.kind === 'dof' ? 'Director of football' : 'Scouting'} upgrade arrives {j.upgrade.ready}</div>
        ) : (
          <div className="grid2" style={{ marginTop: 8 }}>
            {(['dof', 'scouting'] as const).map((k) => (
              <button key={k} className="btn sm" disabled={j[k] >= 5} onClick={() => act(() => upgradeStaff(g, k))}>
                {j[k] >= 5 ? 'Maxed' : `${k === 'dof' ? 'DoF' : 'Scouts'} ↑ ${fmtMoney(STAFF_COST[j[k]])}`}
              </button>
            ))}
          </div>
        )}
        <div className="small muted" style={{ marginTop: 6 }}>Upgrades need board approval (once a month).</div>
      </Card>

      <Card title="Ask for a player" tag={club.tactics.formation} tagColor="var(--sky)">
        <div className="col" style={{ gap: 8 }}>
          <select className="input" value={slot} onChange={(e) => setSlot(Number(e.target.value))}>
            {slots.map((s, i) => {
              const cur = club.lineup[i] !== null ? g.players[club.lineup[i]!] : null;
              return <option key={i} value={i}>{s.pos} · {roleFor(s.pos, club.tactics.roles[i]).name}{cur ? ` (now ${shortName(cur)} ${Math.round(ratingAt(cur, s.pos))})` : ' (empty)'}{i === weakest ? ' ⚠ weakest' : ''}</option>;
            })}
          </select>
          <div className="row" style={{ gap: 8 }}>
            <select className="input" value={maxAge} onChange={(e) => setMaxAge(Number(e.target.value))}>
              {[21, 23, 25, 28, 30, 33, 36].map((a) => <option key={a} value={a}>Age up to {a}</option>)}
            </select>
            <select className="input" value={maxWage} onChange={(e) => setMaxWage(Number(e.target.value))}>
              {wageSteps.map((w) => <option key={w} value={w}>Wage up to {fmtMoney(w)}/wk</option>)}
            </select>
          </div>
          <button className="btn primary" onClick={() => act(() => requestPlayer(g, slot, maxAge, maxWage))}>Send to your director of football</button>
          <div className="small muted">Key attributes for this role: {(ROLE_KEYS[roleFor(slots[slot].pos, club.tactics.roles[slot]).id] ?? []).map((k) => ATTR_LABEL[k]).join(', ')}</div>
        </div>
      </Card>

      <Card title="Requests" tag={`${j.requests.filter((r) => r.status === 'scouting').length}/3 active`} tagColor="var(--yellow)">
        <div className="list">
          {j.requests.map((r) => (
            <div key={r.id} className={`li ${req?.id === r.id ? 'me' : ''}`} onClick={() => setSel(r.id)}>
              <PosTag pos={r.pos} />
              <div className="main">
                <div className="t">{roleFor(r.pos, r.role).name}</div>
                <div className="s">≤{r.maxAge}y · ≤{fmtMoney(r.maxWage)}/wk</div>
              </div>
              <span className="small bold" style={{ color: r.status === 'ready' ? 'var(--grass)' : r.status === 'closed' ? 'var(--muted)' : 'var(--yellow)' }}>
                {r.status === 'scouting' ? `Scouting · ${r.ready.slice(5)}` : r.status === 'ready' ? `${r.candidates.filter((c) => c.status === 'open' || c.status === 'pursuing').length} options` : 'Done'}
              </span>
            </div>
          ))}
          {!j.requests.length && <div className="empty">No requests yet. Ask for a player above.</div>}
        </div>
      </Card>

      {req && req.status !== 'scouting' && req.candidates.map((c) => <CandidateCard key={c.playerId} req={req} playerId={c.playerId} />)}
      {req && req.status === 'ready' && !req.candidates.length && <Card title="No options"><div className="empty">Nobody suitable. Try a higher wage or age limit, or upgrade your scouts.</div></Card>}
    </div>
  );
}

function CandidateCard({ req, playerId }: { req: RecruitRequest; playerId: number }) {
  const g = useGame();
  const ui = useUI();
  const c = req.candidates.find((x) => x.playerId === playerId)!;
  const p = g.players[playerId];
  if (!p) return null;
  const fit = systemFitFor(g, req, playerId);
  const pers = personalityOf(p);
  const [lo, hi] = scoutRange(g, overall(p), p.id);
  const keys = ROLE_KEYS[roleFor(req.pos, req.role).id] ?? [];
  const from = p.clubId !== null ? g.clubs[p.clubId] : null;
  const act = (fn: () => { ok: boolean; msg: string }) => { const r = mutate(fn); ui.toast(r.msg, !r.ok); };
  const col = c.chance >= 65 ? 'var(--grass)' : c.chance >= 40 ? 'var(--yellow)' : 'var(--coral)';
  return (
    <section className={`card cand ${c.status}`}>
      <div className="card-h">
        <PosTag pos={p.pos} />
        <h3 className="ellipsis" style={{ cursor: 'pointer' }} onClick={() => ui.openPlayer(p.id)}>{p.first} {p.last}</h3>
        <span className="right" title={`Scouted ability ${lo}-${hi}`}>{starRow(Math.round(stars(lo)), Math.max(0, Math.round(stars(hi)) - Math.round(stars(lo))))}</span>
      </div>
      <div className="cand-meta">
        {from ? <><Crest club={from} size={16} /> {from.name}</> : 'Free agent'} · {age(p, g.date)}y · {NATIONS[p.nat] ?? p.nat} · <span style={{ color: pers.good === true ? 'var(--grass)' : pers.good === false ? 'var(--coral)' : undefined }} title={pers.blurb}>{pers.name}</span>
      </div>
      <div className="cand-chance">
        <div className="cc-bar"><i style={{ width: `${c.chance}%`, background: col }} /></div>
        <b style={{ color: col }}>{c.chance}%</b><span>chance to sign</span>
      </div>
      <div className="cand-why">{c.reasons.map((r, i) => <span key={i} className={r.good ? 'up' : 'down'}>{r.good ? '▲' : '▼'} {r.text}</span>)}</div>
      <div className="cand-fit"><b>{fit.label}</b> as {fit.role} ({fit.score})</div>
      <div className="cand-why">{fit.lines.slice(0, 4).map((l, i) => <span key={i} className={l.good ? 'up' : 'down'}>{l.good ? '✓' : '✗'} {l.text}</span>)}</div>
      <div className="cand-attrs">
        {keys.map((k) => { const [a, b] = scoutRange(g, p.attrs[k], p.id, k.length); return <span key={k}>{ATTR_LABEL[k]} <b>{a === b ? a : `${a}-${b}`}</b></span>; })}
      </div>
      <div className="cand-money"><span>Fee <b>{c.fee ? fmtMoney(c.fee) : 'Free'}</b></span><span>Wage <b>{fmtMoney(c.wage)}/wk</b></span></div>
      {c.status === 'open' ? (
        <div className="grid2" style={{ marginTop: 6 }}>
          <button className="btn sm primary" onClick={() => act(() => pursue(g, req.id, p.id))}>Go for him</button>
          <button className="btn sm" onClick={() => mutate(() => rejectCandidate(g, req.id, p.id))}>Not interested</button>
        </div>
      ) : (
        <div className={`cand-status ${c.status}`}>{c.status === 'pursuing' ? `⏳ In talks: answer by ${c.resolveOn}` : c.status === 'signed' ? '✍️ Signed' : c.status === 'failed' ? '✗ Deal failed' : 'Passed'}</div>
      )}
    </section>
  );
}
