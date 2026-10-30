import { useEffect, useState } from 'react';
import { NATIONS } from '../../game/data/names';
import { nationName } from '../../game/intl';
import { squadOf } from '../../game/generate';
import { cmAttributes } from '../../game/cm0102/attrs';
import { ATTR_GROUPS, ATTR_LABEL, age, fmtMoney, fullName, marketValue, overall, ratingAt, scoutedPotential } from '../../game/ratings';
import { seasonLabel } from '../../game/season';
import { acceptCounter, askingPrice, bidBlocker, openTalks, userLoanOffer, playerInterest, preContractOpen, releasePlayer, renewContract, renewDemand, signFreeAgent, userBid, wageDemand, windowOpen } from '../../game/transfers';
import type { Pos, TrainingFocus } from '../../game/types';
import { mutate, useGame } from '../../store';
import { useUI } from '../context';
import { AttrVal, Card, CondBar, ConfirmButton, Ovr, PosTag, Spark, Stars } from '../components/common';
import { PlayerStats } from '../components/PlayerStats';
import { DealStep } from '../components/TransferDeal';
import { permitNote } from '../../game/permits';
import { Crest } from '../components/Crest';
import { personalityOf } from '../../game/personality';
import { journey, scoutRange } from '../../game/journey';
import { PlayerEditor } from './Editor';
import { scoutReport } from '../../game/reports';
import { permitCheck } from '../../game/permits';

const FOCUS_LABEL: Record<TrainingFocus, string> = { balanced: 'Balanced', attacking: 'Attack', defending: 'Defend', technical: 'Technical', physical: 'Physical', mental: 'Mental' };

export function PlayerModal() {
  const g = useGame();
  const ui = useUI();
  const id = ui.playerId;
  const [bid, setBid] = useState<number | null>(null);
  const [bidErr, setBidErr] = useState('');
  const [tab, setTab] = useState<'attrs' | 'info' | 'stats' | 'career' | 'actions' | 'edit'>('attrs');
  // Opening a player whose fee is agreed goes straight to the contract offer
  useEffect(() => {
    if (id !== null && g.offers.some((o) => o.playerId === id && o.from === g.userClubId && o.status === 'accepted')) setTab('actions');
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
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
  const close = () => { ui.openPlayer(null); setBid(null); setBidErr(''); setTab('attrs'); };
  const act = (fn: () => { ok: boolean; msg: string }) => {
    const r = mutate(fn);
    ui.toast(r.msg, !r.ok);
  };
  const toggleShortlist = () => mutate((gg) => { gg.shortlist = shortlisted ? gg.shortlist.filter((x) => x !== p.id) : [...gg.shortlist, p.id]; });

  const posRating = (pos: Pos) => Math.round(ratingAt(p, pos));
  // CM-style talks with the player himself: a renewal, a free agent or a pre-contract
  const liveDeal = (kind: 'renew' | 'free' | 'pre') => [...g.offers].reverse().find((o) => o.playerId === p.id && o.from === g.userClubId && o.kind === kind && o.status === 'accepted');
  const talk = (kind: 'renew' | 'free' | 'pre') => { const r = mutate((gg) => openTalks(gg, p.id, kind)); setBidErr(r.ok ? '' : r.msg); };
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
          <span className="pf-meta"><PosTag pos={p.pos} /> {age(p, g.date)} years · {NATIONS[p.nat] ?? nationName(p.nat)} · {p.foot === 'L' ? 'Left' : p.foot === 'R' ? 'Right' : 'Either'} foot{p.loan ? ` · on loan from ${g.clubs[p.loan.from]?.short ?? '?'}` : ''}</span>
        </div>
        <div className="pf-club">{club ? <><Crest club={club} size={40} /><span>{club.name}</span></> : <span className="chip">Free agent</span>}</div>
        {/* CM 01/02 never showed other clubs' players' ability: you judge them by their attributes */}
        {!(g.era === 'cm0102' && !own) && <div className="pf-ability">{scouted && olo !== ohi ? <span className="ovr lg plain">{olo}-{ohi}</span> : <Ovr value={ovr} lg />}<Stars ovr={scoutedPotential(p, own)} /></div>}
        <button className="pf-close" onClick={close} aria-label="Close">✕</button>
      </div>

      <div className="tabs pf-tabs">
        <button className={`tab ${tab === 'attrs' ? 'active' : ''}`} onClick={() => setTab('attrs')}>Attributes</button>
        <button className={`tab ${tab === 'info' ? 'active' : ''}`} onClick={() => setTab('info')}>Info</button>
        <button className={`tab ${tab === 'stats' ? 'active' : ''}`} onClick={() => setTab('stats')}>Stats</button>
        <button className={`tab ${tab === 'career' ? 'active' : ''}`} onClick={() => setTab('career')}>Career</button>
        <button className={`tab ${tab === 'actions' ? 'active' : ''}`} onClick={() => setTab('actions')}>{own ? 'Manage' : 'Bid'}</button>
        {g.editor && <button className={`tab ${tab === 'edit' ? 'active' : ''}`} onClick={() => setTab('edit')}>Edit</button>}
        {(p.injury || p.suspended > 0 || p.away) && (
          <span className="pf-alert">
            {p.injury && <>🩹 {p.injury.name} ({p.injury.days}d)</>}
            {p.suspended > 0 && <> 🟥 Suspended {p.suspended}</>}
            {p.away && <> ✈️ {p.away}</>}
          </span>
        )}
      </div>

      <div className="pf-body">
        {(tab === 'attrs' || tab === 'info') && (
          <div className="win-list pf-one">
            {tab === 'attrs' && g.era === 'cm0102' && <ReportCard g={g} p={p} />}
            {tab === 'attrs' && <Card title="Attributes" tag={g.era === 'cm0102' ? undefined : `${ovr} OVR`} tagColor="var(--accent)">
              {cmAttributes(p) ? (
                <div className="pf-attrs cm-attrs">
                  {cmAttributes(p)!.map((gr) => (
                    <div key={gr.name} className="pf-attr-col">
                      <h4>{gr.name}</h4>
                      {gr.rows.map(([label, v]) => <div key={label} className="pf-attr"><span>{label}</span><AttrVal v={v} /></div>)}
                    </div>
                  ))}
                </div>
              ) : (
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
              )}
            </Card>}
            {tab === 'info' && <Card title="Positions">
              <div className="pf-pitch">
                {POS_SPOTS.map(([pos, x, y]) => {
                  const f = fam(pos);
                  return <span key={pos} className={`pf-spot ${f}`} style={{ left: `${x}%`, top: `${y}%` }} title={`${pos} ${posRating(pos)}`}>{f ? pos : ''}</span>;
                })}
              </div>
              <div className="pf-key"><i className="nat" /> Natural <i className="acc" /> Accomplished <i className="unc" /> Unconvincing</div>
            </Card>}
            {tab === 'info' && <Card title="Player info">
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
            </Card>}
          </div>
        )}

        {tab === 'edit' && g.editor && <div className="win-list pf-one"><Card title="Editor" className="grow"><PlayerEditor g={g} p={p} /></Card></div>}
        {tab === 'stats' && <div className="win-list pf-one"><Card title="This season" className="grow"><PlayerStats p={p} /></Card></div>}

        {tab === 'career' && (
          <div className="win-list pf-one">
            <Card title="Career" className="grow">
            {p.history.length > 0 || p.past?.length ? (
              <table className="t dense">
                <thead><tr><th>Season</th><th>Club</th><th className="r">Apps</th><th className="r">Gls</th><th className="r">Avg</th></tr></thead>
                <tbody>
                  {[...p.history].reverse().map((h, i) => (
                    <tr key={`h${i}`}><td>{seasonLabel(h.season)}</td><td className="ellipsis" style={{ maxWidth: 140 }}>{g.clubs[h.clubId]?.name}</td><td className="r">{h.apps}</td><td className="r">{h.goals}</td><td className="r">{h.avg.toFixed(2)}</td></tr>
                  ))}
                  {[...(p.past ?? [])].reverse().map(([season, club, apps, goals, loan], i) => (
                    <tr key={`p${i}`}><td>{seasonLabel(season)}</td><td className="ellipsis" style={{ maxWidth: 140 }}>{g.pastClubs?.[club] ?? '?'}{loan ? ' (loan)' : ''}</td><td className="r">{apps}</td><td className="r">{goals}</td><td className="r muted">–</td></tr>
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
            {p.loan ? (
              <div className="bid-status pending"><b>On loan</b><span>From {g.clubs[p.loan.from]?.name} until the end of the season. You pay his wages ({fmtMoney(p.wage)}/wk).</span>
                <ConfirmButton className="btn block" label="End loan early" confirmLabel={`Tap again: send ${p.last} back to ${g.clubs[p.loan.from]?.name}`} onConfirm={() => { act(() => releasePlayer(g, p.id)); close(); }} />
              </div>
            ) : <div className="small">Contract until June {p.contractEnd} · {fmtMoney(p.wage)}/wk</div>}
            {g.era && (
              // CM 01/02: first team, reserves or youth team
              <div className="field"><label>Squad</label>
                <div className="seg">
                  {([['first', 'First team'], ['reserve', 'Reserves'], ['youth', 'Youth']] as const).map(([sq, label]) => (
                    <button key={sq} className={p.squad === sq ? 'on' : ''} disabled={sq === 'youth' && age(p, g.date) > 21 && p.squad !== 'youth'} onClick={() => mutate(() => { p.squad = sq; if (sq !== 'first') { user.lineup = user.lineup.map((x) => (x === p.id ? null : x)); user.subs = user.subs.filter((x) => x !== p.id); } })}>{label}</button>
                  ))}
                </div>
              </div>
            )}
            {!p.loan && <>
            {g.era ? (
              // CM 01/02: a new contract is negotiated (offer, his answer the next day, try again if he refuses)
              p.preContract ? <div className="bid-status collapsed"><b>Leaving in the summer</b><span>{fullName(p)} has agreed to join {g.clubs[p.preContract.clubId]?.name} on a free.</span></div>
                : liveDeal('renew') ? <DealStep g={g} o={liveDeal('renew')!} />
                : <button className="btn primary block" onClick={() => talk('renew')}>Offer new contract</button>
            ) : <button className="btn primary block" onClick={() => act(() => renewContract(g, p.id, 3))}>Renew contract · 3 yrs at {fmtMoney(renewDemand(g, p))}/wk</button>}
            {bidErr && <div className="small" style={{ color: 'var(--bad)', fontWeight: 700 }}>⚠️ {bidErr}</div>}
            <div className="grid2">
              <button className="btn" onClick={() => mutate(() => { p.listed = !p.listed; })}>{p.listed ? 'Unlist' : '🏷️ Transfer list'}</button>
              {g.era && <button className="btn" onClick={() => mutate(() => { p.loanListed = !p.loanListed; })}>{p.loanListed ? 'Off loan list' : '🔁 Loan list'}</button>}
              {!g.era && <button className="btn" onClick={() => mutate(() => { p.squad = p.squad === 'first' ? 'youth' : 'first'; user.lineup = user.lineup.map((x) => (x === p.id ? null : x)); user.subs = user.subs.filter((x) => x !== p.id); })}>
                {p.squad === 'first' ? '→ Youth team' : '⬆ First team'}
              </button>}
            </div>
            <ConfirmButton className="btn coral block" label="Release player" confirmLabel={`Tap again: release ${fullName(p)} and pay off half the contract`} onConfirm={() => { act(() => releasePlayer(g, p.id)); close(); }} />
            </>}
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

        {tab === 'actions' && !own && !scouted && p.clubId !== null && (() => {
          // The latest bid for him stays on screen with where it stands, CM-style
          const offer = [...g.offers].reverse().find((o) => o.playerId === p.id && o.from === user.id && (!o.kind || o.kind === 'transfer') && o.status !== 'withdrawn' && o.status !== 'done');
          const loanOffer = [...g.offers].reverse().find((o) => o.playerId === p.id && o.from === user.id && o.kind === 'loan' && o.date >= g.date.slice(0, 4));
          if (p.loan) {
            return (
              <div className="col pf-actions">
                <div className="bid-status pending"><b>On loan</b><span>{fullName(p)} is on loan at {g.clubs[p.clubId!].name} from {g.clubs[p.loan.from]?.name} until the end of the season.</span></div>
                <button className="btn block" onClick={toggleShortlist}>{shortlisted ? '★ Shortlisted' : '☆ Add to shortlist'}</button>
              </div>
            );
          }
          const live = offer && (offer.status === 'pending' || offer.status === 'accepted' || offer.status === 'countered');
          const seller = g.clubs[p.clubId!];
          const why = bidBlocker(g, p);
          return (
            <div className="col pf-actions">
              {!live && (why ? (
                <div className="bid-status rejected"><b>You can't bid for him</b><span>{why}</span></div>
              ) : (
                <div className="bid-status accepted"><b>Available</b><span>Asking price {fmtMoney(ask)} · wants {fmtMoney(wageDemand(g, p, user))}/wk.{ask > user.transferBudget ? ` His price is more than your ${fmtMoney(user.transferBudget)} budget.` : ''}{g.era && permitNote(g, p, user) ? ` ${permitNote(g, p, user)}` : ''}</span></div>
              ))}
              {offer && (
                <div className={`bid-status ${offer.status}`}>
                  {offer.status === 'pending' && <><b>Bid submitted</b><span>{fmtMoney(offer.fee)} to {seller.name}. Awaiting response: continue to the next day for their reply.</span></>}
                  {offer.status === 'accepted' && <><b>Bid accepted</b><span>{seller.name} accept {fmtMoney(offer.fee)}.</span></>}
                  {offer.status === 'countered' && <><b>Counter offer</b><span>{seller.name} rejected {fmtMoney(offer.fee)} but would accept {fmtMoney(offer.counter ?? 0)}.</span>
                    <button className="btn primary block" onClick={() => { const r = mutate(() => acceptCounter(g, offer.id)); setBidErr(r.ok ? '' : r.msg); }}>Accept {fmtMoney(offer.counter ?? 0)}</button></>}
                  {offer.status === 'rejected' && <><b>Bid rejected</b><span>{seller.name} turned down {fmtMoney(offer.fee)}.</span></>}
                  {offer.status === 'collapsed' && <><b>Deal collapsed</b><span>The bid of {fmtMoney(offer.fee)} fell through.</span></>}
                </div>
              )}
              {bidErr && <div className="small" style={{ color: 'var(--bad)', fontWeight: 700 }}>⚠️ {bidErr}</div>}
              {g.era && (liveDeal('pre') || preContractOpen(g, p)) && (
                <div className="col pre-contract">
                  <div className="small"><b>Contract ends this summer:</b> you can agree a pre-contract and sign him on a free when it runs out.</div>
                  {liveDeal('pre') ? <DealStep g={g} o={liveDeal('pre')!} /> : <button className="btn block" onClick={() => talk('pre')}>Offer pre-contract</button>}
                </div>
              )}
              {loanOffer?.status === 'pending' && <div className="bid-status pending"><b>Loan offer submitted</b><span>Asked {seller.name} to loan him until the end of the season. Continue for their answer.</span></div>}
              {loanOffer?.status === 'rejected' && <div className="bid-status rejected"><b>Loan turned down</b><span>{seller.name} won't loan him out.</span></div>}
              {offer?.status === 'accepted' && <DealStep g={g} o={offer} />}
              {!live && !why && <>
                <div className="row">
                  <input type="range" min={Math.round(ask * 0.4)} max={Math.max(ask * 1.6, 10000)} step={Math.max(1000, Math.round(ask / 100))} value={bidVal} onChange={(e) => { setBid(Number(e.target.value)); setBidErr(''); }} style={{ flex: 1, height: 30 }} />
                  <b style={{ minWidth: 64, textAlign: 'right', fontFamily: 'var(--display)', fontSize: 18 }}>{fmtMoney(bidVal)}</b>
                </div>
                <button className="btn primary block" onClick={() => { const r = mutate(() => userBid(g, p.id, bidVal)); setBidErr(r.ok ? '' : r.msg); }}>{offer ? 'Bid again' : 'Submit bid'}</button>
              </>}
              {g.era && windowOpen(g) && !p.preContract && !permitCheck(g, p, user).msg && loanOffer?.status !== 'pending' && <button className="btn block" onClick={() => { const r = mutate(() => userLoanOffer(g, p.id)); setBidErr(r.ok ? '' : r.msg); }}>Offer loan (until end of season)</button>}
              <button className="btn block" onClick={toggleShortlist}>{shortlisted ? '★ Shortlisted' : '☆ Add to shortlist'}</button>
              <div className="small muted">Your budget: {fmtMoney(user.transferBudget)}</div>
            </div>
          );
        })()}

        {tab === 'actions' && p.clubId === null && !scouted && (
          <div className="col pf-actions">
            {interest && !interest.ok ? <div className="bid-status rejected"><b>He won't sign for you</b><span>{interest.reason}</span></div>
              : g.era && !permitCheck(g, p, user).ok ? <div className="bid-status rejected"><b>You can't sign him</b><span>{permitCheck(g, p, user).msg}</span></div>
              : <div className="bid-status accepted"><b>Free agent</b><span>Wants {fmtMoney(wageDemand(g, p, user))}/wk. No fee: offer him a contract.{g.era && permitNote(g, p, user) ? ` ${permitNote(g, p, user)}` : ''}</span></div>}
            {g.era ? (liveDeal('free') ? <DealStep g={g} o={liveDeal('free')!} /> : <button className="btn primary block" onClick={() => talk('free')}>Offer contract</button>)
              : <button className="btn primary block" onClick={() => act(() => signFreeAgent(g, p.id))}>Sign on a free</button>}
            {bidErr && <div className="small" style={{ color: 'var(--bad)', fontWeight: 700 }}>⚠️ {bidErr}</div>}
            <button className="btn block" onClick={toggleShortlist}>{shortlisted ? '★ Shortlisted' : '☆ Add to shortlist'}</button>
          </div>
        )}
      </div>
    </div>
  );
}

/** CM-style staff report: ability in words, since CM 01/02 careers hide the numbers. */
function ReportCard({ g, p }: { g: ReturnType<typeof useGame>; p: ReturnType<typeof useGame>['players'][number] }) {
  const r = scoutReport(g, p);
  return (
    <Card title={p.clubId === g.userClubId ? 'Coach report' : 'Scout report'} tag={r.from}>
      <div className="report">
        <div><span>Ability</span><b>{r.level}</b></div>
        <div><span>For you</span><b>{r.fit}</b></div>
        <div><span>Potential</span><b>{r.potential}</b></div>
        {r.strengths.length > 0 && <div><span>Strengths</span><b className="good">{r.strengths.join(', ')}</b></div>}
        {r.weaknesses.length > 0 && <div><span>Weaknesses</span><b className="bad">{r.weaknesses.join(', ')}</b></div>}
      </div>
    </Card>
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
