import { boardRequest, financeSummary, monthLabel, tierOf, upgradeCost, type BoardRequest } from '../../game/club';
import { fmtMoney } from '../../game/ratings';
import { ordinal, seasonLabel } from '../../game/season';
import { mutate, useGame } from '../../store';
import { useUI } from '../context';
import { Card, ConfirmButton, Meter, SectionPage } from '../components/common';
import { ClubEditor } from './Editor';
import { ClubBadgeButton } from '../components/BadgesSheet';
import { useEffect, useState } from 'react';
import { NATIONS } from '../../game/data/names';
import { MANAGER_ATTRS, defaultProfile, managerStyle } from '../../game/manager';
import { BACKGROUNDS, repLabel } from '../../game/journey';
import { Crest } from '../components/Crest';
import { applyForJob, hasJobs, jobsOf, managerRepLabel } from '../../game/jobs';
import type { CoachFocus, ManagerAttr, Staff, StaffRole } from '../../game/types';
import { FOCUS_NAME, ROLE_PLURAL, coachingLevel, hasStaff, hireStaff, myStaff, physioRecovery, releaseStaff, scoutError, staffLimits, staffOf } from '../../game/staff';

/** The Journey: reputation and the clubs managed so far. */
function CareerCard() {
  const g = useGame();
  const j = g.journey!;
  return (
    <Card title="The Journey" tag={repLabel(j.rep)} tagColor="var(--yellow)">
      <div className="kpis" style={{ marginBottom: 8 }}>
        <div className="kpi" style={{ '--k': 'var(--yellow)' } as React.CSSProperties}><span className="kk">Reputation</span><span className="kv">{Math.round(j.rep)}</span><Meter value={j.rep} /></div>
        <div className="kpi" style={{ '--k': 'var(--sky)' } as React.CSSProperties}><span className="kk">Clubs</span><span className="kv">{j.career.length}</span><span className="ks">{BACKGROUNDS.find((b) => b.id === j.background)?.name} background</span></div>
      </div>
      <div className="list">
        {[...j.career].reverse().map((c, i) => (
          <div key={i} className="li">
            <Crest club={g.clubs[c.clubId]} size={20} />
            <div className="main"><div className="t">{g.clubs[c.clubId].name}</div><div className="s">{c.from} → {c.to ?? 'now'}</div></div>
          </div>
        ))}
      </div>
      <div className="small muted" style={{ marginTop: 6 }}>Clubs approach you when your reputation reaches their level. Win, and bigger clubs will call.</div>
    </Card>
  );
}

/** CM 01/02 careers: your reputation, the managers' jobs going, and the clubs you've managed. */
function JobsCard() {
  const g = useGame();
  const ui = useUI();
  const j = jobsOf(g);
  const vac = [...j.vacancies].filter((v) => v.clubId !== g.userClubId).sort((a, b) => g.clubs[b.clubId].reputation - g.clubs[a.clubId].reputation);
  return (
    <>
      <Card title="Your career" tag={managerRepLabel(j.rep)} tagColor="var(--yellow)">
        <div className="row" style={{ gap: 10, marginBottom: 6 }}><span className="small muted bold">Reputation</span><div style={{ flex: 1 }}><Meter value={j.rep} /></div></div>
        <div className="small">{j.career.map((c, i) => <span key={i}>{i ? ' → ' : ''}<b>{g.clubs[c.clubId].name}</b> ({c.from.slice(0, 4)}{c.to ? `–${c.to.slice(0, 4)}` : '–'})</span>)}</div>
        {(() => {
          // Your manager awards
          const mine = (g.awards ?? []).filter((a) => a.award.startsWith('Manager of the') && a.name === g.manager);
          const count = (k: string) => mine.filter((a) => a.award === k).length;
          return mine.length ? <div className="small" style={{ marginTop: 6 }}>🏅 {[count('Manager of the Year') && `Manager of the Year ×${count('Manager of the Year')}`, count('Manager of the Month') && `Manager of the Month ×${count('Manager of the Month')}`].filter(Boolean).join(' · ')}</div> : null;
        })()}
        <div className="small muted" style={{ marginTop: 6 }}>Win things and beat expectations and your name grows: bigger clubs will come for you.</div>
      </Card>
      <Card title="Jobs available" tag={`${vac.length}`} tagColor="var(--orange)">
        {!vac.length ? <div className="empty">No vacancies at the moment. Managers lose their jobs as the season goes on.</div> : (
          <div className="list">
            {vac.map((v) => {
              const c = g.clubs[v.clubId];
              return (
                <div key={v.clubId} className="li">
                  <Crest club={c} size={22} />
                  <div className="main"><div className="t">{c.name}</div><div className="s">{g.leagues.find((l) => l.clubIds.includes(c.id))?.name ?? ''} · since {v.since}</div></div>
                  {v.answered ? <span className="small muted">Answered</span> : v.applied ? <span className="small muted">Applied</span>
                    : <button className="btn sm" onClick={() => { const r = mutate((gg) => applyForJob(gg, v.clubId)); ui.toast(r.msg, !r.ok); }}>Apply</button>}
                </div>
              );
            })}
          </div>
        )}
        <div className="small muted" style={{ marginTop: 6 }}>Clubs answer in a few days. Boards want a manager whose reputation fits the club.</div>
      </Card>
    </>
  );
}

const SCOUT_AREAS: [string, string][] = [['ENG', 'England'], ['SCO', 'Scotland'], ['ESP', 'Spain'], ['ITA', 'Italy'], ['FRA', 'France'], ['GER', 'Germany'], ['NED', 'Holland'], ['POR', 'Portugal'], ['BRA', 'Brazil'], ['ARG', 'Argentina'], ['ALL', 'Worldwide'], ['YOUTH', 'Young talent (any country)']];
const abilityWord = (a: number) => (a >= 18 ? 'World class' : a >= 15 ? 'Excellent' : a >= 12 ? 'Very good' : a >= 9 ? 'Decent' : a >= 6 ? 'Average' : 'Poor');

/** CM 01/02 careers: your coaches, physios and scouts, and staff you can hire. */
function StaffPage() {
  const g = useGame();
  const ui = useUI();
  const [role, setRole] = useState<StaffRole>('coach');
  useEffect(() => { if (!g.staff) mutate((gg) => { staffOf(gg); }); }, [g.staff]);
  if (!g.staff) return null;
  const lim = staffLimits(g);
  const act = (fn: () => { ok: boolean; msg: string }) => { const r = mutate(fn); ui.toast(r.msg, !r.ok); };
  const mine = myStaff(g);
  const pool = g.staff.filter((s) => s.clubId === null && s.role === role).sort((a, b) => b.ability - a.ability);
  const physio = physioRecovery(g);
  const name = (s: Staff) => `${s.first} ${s.last}`;
  return (
    <>
      <Card title="Backroom staff" tag={`£${Math.round(mine.reduce((t, s) => t + s.wage, 0) / 1000)}k/wk`} tagColor="var(--sky)">
        {(['coach', 'physio', 'scout'] as StaffRole[]).map((r) => (
          <div key={r} style={{ marginBottom: 8 }}>
            <div className="section-label" style={{ marginTop: 4 }}>{ROLE_PLURAL[r]} {mine.filter((s) => s.role === r).length}/{lim[r]}</div>
            {mine.filter((s) => s.role === r).map((s) => (
              <div key={s.id} className="staff-row">
                <div className="main"><b>{name(s)}</b><span className="muted small"> {s.age} · {NATIONS[s.nat] ?? s.nat}</span><div className="small"><b className="num">{s.ability}</b> {abilityWord(s.ability)} · {fmtMoney(s.wage)}/wk</div></div>
                {r === 'coach' && <select className="input" value={s.focus} onChange={(e) => mutate(() => { s.focus = e.target.value as CoachFocus; })}>{(Object.keys(FOCUS_NAME) as CoachFocus[]).map((f) => <option key={f} value={f}>{FOCUS_NAME[f]}</option>)}</select>}
                {r === 'scout' && <select className="input" value={s.assign ?? 'ALL'} onChange={(e) => mutate(() => { s.assign = e.target.value; })}>{SCOUT_AREAS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>}
                <ConfirmButton className="btn sm" label="Release" confirmLabel={`Pay ${fmtMoney(s.wage * 13)}?`} onConfirm={() => act(() => releaseStaff(g, s.id))} />
              </div>
            ))}
            {!mine.some((s) => s.role === r) && <div className="small" style={{ color: 'var(--bad)' }}>None: {r === 'coach' ? 'players develop more slowly' : r === 'physio' ? 'injured players take longer to recover' : 'scout reports are much less reliable'}.</div>}
          </div>
        ))}
        <div className="small muted">
          Development {(() => { const d = Math.round((coachingLevel(g) - 1) * 100); return `${d >= 0 ? '+' : ''}${d}%`; })()} vs an average backroom ·
          {' '}Injuries {physio >= 0 ? `back about ${Math.round(physio * 100)}% sooner` : `about ${Math.round(-physio * 100)}% slower`} ·
          {' '}Scout reports within ±{scoutError(g).toFixed(1)}
        </div>
      </Card>
      <Card title="Staff available" tag={`${pool.length}`} tagColor="var(--orange)">
        <div className="seg" style={{ marginBottom: 8 }}>{(['coach', 'physio', 'scout'] as StaffRole[]).map((r) => <button key={r} className={role === r ? 'on' : ''} onClick={() => setRole(r)}>{ROLE_PLURAL[r]}</button>)}</div>
        {pool.map((s) => (
          <div key={s.id} className="staff-row">
            <div className="main"><b>{name(s)}</b><span className="muted small"> {s.age} · {NATIONS[s.nat] ?? s.nat}</span><div className="small"><b className="num">{s.ability}</b> {abilityWord(s.ability)}{s.focus ? ` · ${FOCUS_NAME[s.focus]}` : ''} · {fmtMoney(s.wage)}/wk</div></div>
            <button className="btn sm primary" onClick={() => act(() => hireStaff(g, s.id))}>Hire</button>
          </div>
        ))}
        <div className="small muted" style={{ marginTop: 6 }}>Coaches: the best one for a player's area counts most (attack, defence, keepers; a youth coach for under-21s; general coaches cover everyone). A fitness coach keeps players sharp. Staff wages come out of the wage budget.</div>
      </Card>
    </>
  );
}

/** End-of-season awards: your league's (wherever you were that season) and the Ballon d'Or. */
function AwardsCard() {
  const g = useGame();
  const seasons = [...new Set((g.awards ?? []).filter((a) => a.award !== 'Manager of the Month').map((a) => a.season))].sort((a, b) => b - a);
  const [season, setSeason] = useState(seasons[0]);
  const list = (g.awards ?? []).filter((a) => a.season === season);
  const leagueName = g.history.find((h) => h.season === season)?.userFinish?.comp;
  const league = g.leagues.find((l) => l.name === leagueName) ?? g.leagues.find((l) => l.clubIds.includes(g.userClubId));
  const ofLeague = list.filter((a) => a.comp === league?.id);
  const one = (k: string) => ofLeague.find((a) => a.award === k);
  const club = (id: number) => g.clubs[id]?.short ?? '';
  const row = (label: string, a: typeof list[number] | undefined, extra = '') => a && (
    <div key={label} className="li"><div className="main"><div className="t">{a.name}{a.clubId === g.userClubId ? ' 🏅' : ''}</div><div className="s">{label} · {club(a.clubId)}{extra}</div></div></div>
  );
  const ballon = ['Ballon d\'Or', 'Ballon d\'Or 2nd', 'Ballon d\'Or 3rd'].map((k) => list.find((a) => a.award === k));
  const toty = ofLeague.filter((a) => a.award === 'Team of the Year');
  return (
    <Card title="Awards" tag={seasonLabel(season)} tagColor="var(--yellow)">
      {seasons.length > 1 && <select className="input" style={{ marginBottom: 8 }} value={season} onChange={(e) => setSeason(Number(e.target.value))}>{seasons.map((s2) => <option key={s2} value={s2}>{seasonLabel(s2)}</option>)}</select>}
      <div className="list">
        {row("Ballon d'Or", ballon[0], ballon[1] ? ` · 2nd ${ballon[1].name}${ballon[2] ? `, 3rd ${ballon[2].name}` : ''}` : '')}
        {row(`${league?.short ?? ''} Player of the Year`, one('Player of the Year'))}
        {row('Young Player of the Year', one('Young Player of the Year'))}
        {row('Golden Boot', one('Golden Boot'), one('Golden Boot')?.detail ? ` · ${one('Golden Boot')!.detail}` : '')}
        {row('Manager of the Year', one('Manager of the Year'))}
      </div>
      {toty.length > 0 && <div className="small" style={{ marginTop: 8 }}><b>Team of the Year:</b> {toty.map((a) => `${a.detail} ${a.name}${a.clubId === g.userClubId ? ' 🏅' : ''}`).join(', ')}</div>}
    </Card>
  );
}

/** The manager's attributes, which drift each month towards how they actually manage. */
function ManagerCard() {
  const g = useGame();
  const [open, setOpen] = useState<ManagerAttr | null>(null);
  // Read-only view of the profile (created with defaults for older saves)
  const prof = g.managerProfile ?? defaultProfile();
  return (
    <Card title={`Manager: ${g.manager}${NATIONS[g.managerNat ?? g.journey?.nat ?? ''] ? ` · ${NATIONS[g.managerNat ?? g.journey?.nat ?? '']}` : ''}`} tag={managerStyle(g)} tagColor="var(--violet)">
      <div className="list">
        {MANAGER_ATTRS.map((a) => {
          const v = prof.skills[a.key];
          const d = prof.last[a.key] ?? 0;
          return (
            <div key={a.key} className="li" onClick={() => setOpen(open === a.key ? null : a.key)} style={{ display: 'block' }}>
              <div className="row" style={{ gap: 10 }}>
                <div className="main" style={{ flex: 1 }}><div className="t">{a.label}</div></div>
                <div className="mgr-bar"><i style={{ width: `${(v / 20) * 100}%` }} /></div>
                <b className="num" style={{ width: 22, textAlign: 'right' }}>{Math.floor(v)}</b>
                <span className={`small ${d > 0 ? 'up' : d < 0 ? 'down' : 'muted'}`} style={{ width: 14 }}>{d > 0.05 ? '▲' : d < -0.01 ? '▼' : '·'}</span>
              </div>
              {open === a.key && <div className="small muted" style={{ marginTop: 6 }}>📈 {a.how}<br />⚡ {a.effect}</div>}
            </div>
          );
        })}
      </div>
      <div className="small muted" style={{ marginTop: 6 }}>Changes on the 1st of each month. Tap one for details.</div>
    </Card>
  );
}

export function Board() {
  const g = useGame();
  const ui = useUI();
  const club = g.clubs[g.userClubId];
  const fin = financeSummary(g);
  const tier = tierOf(g, club);
  const ledger = g.ledger.slice(-12);
  const maxL = Math.max(1, ...ledger.flatMap((l) => [l.income, l.expense]));
  const conf = g.board.confidence;
  const mood = conf >= 80 ? 'Delighted' : conf >= 60 ? 'Pleased' : conf >= 40 ? 'Satisfied' : conf >= 20 ? 'Concerned' : 'Furious';
  const req = (k: BoardRequest) => {
    const r = mutate(() => boardRequest(g, k));
    ui.toast(r.msg, !r.ok);
  };
  const used = g.board.lastRequest === g.date.slice(0, 7);
  const [sec, setSec] = useState<'board' | 'money' | 'club' | 'staff' | 'you' | 'honours' | 'editor'>('board');
  const stars = (n: number) => <span className="stars">{'★'.repeat(n)}<span className="off">{'★'.repeat(5 - n)}</span></span>;
  return (
    <SectionPage sections={[['board', 'Board'], ['money', 'Finances'], ['club', 'Club'], ...(hasStaff(g) ? [['staff', 'Staff'] as ['staff', string]] : []), ['you', 'Manager'], ['honours', 'Honours'], ...(g.editor ? [['editor', 'Editor'] as ['editor', string]] : [])]} sec={sec} setSec={setSec}
      status={<><span>Confidence <b>{conf}%</b></span><span>Balance <b>{fmtMoney(fin.balance)}</b></span><span>{g.mode === 'create' ? 'Owner-manager' : 'Sacked at 5%'}</span></>}>
      {sec === 'board' && <Card title="Confidence" tag={mood} tagColor={conf >= 60 ? 'var(--lime)' : conf >= 30 ? 'var(--yellow)' : 'var(--coral)'}>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div style={{ fontFamily: 'var(--display)', fontSize: 48, fontWeight: 800, lineHeight: 1 }}>{conf}%</div>
          <div className="small muted bold" style={{ marginLeft: 'auto', textAlign: 'right' }}>🎯 {g.board.objective}<br />Target: {ordinal(g.board.objectiveRank)} or better</div>
        </div>
        <div style={{ margin: '10px 0 6px' }}><Meter value={conf} /></div>
        <div className="small muted">Moves monthly with your league position against the target, and jumps at season end for trophies and promotions.</div>
      </Card>}

      {sec === 'staff' && hasStaff(g) && <StaffPage />}
      {sec === 'you' && hasJobs(g) && <JobsCard />}
      {sec === 'you' && <ManagerCard />}
      {sec === 'you' && g.journey && g.mode === 'journey' && <CareerCard />}

      {sec === 'money' && <Card title="Finances" tag="£" tagColor="var(--grass)">
        <div className="col" style={{ gap: 7 }}>
          <div className="row"><span>Balance</span><b className="right" style={{ color: fin.balance < 0 ? 'var(--bad)' : undefined }}>{fmtMoney(fin.balance)}</b></div>
          <div className="row"><span>Transfer budget</span><b className="right">{fmtMoney(fin.transferBudget)}</b></div>
          <div className="row"><span>Wages</span><b className="right">{fmtMoney(fin.wageBill)} / {fmtMoney(fin.wageBudget)} pw</b></div>
          <div className="bar"><div style={{ width: `${Math.min(100, (fin.wageBill / Math.max(1, fin.wageBudget)) * 100)}%`, background: fin.wageBill > fin.wageBudget ? 'var(--coral)' : 'var(--grass)' }} /></div>
          <div className="row small"><span>Season income</span><b className="right" style={{ color: 'var(--good)' }}>{fmtMoney(fin.seasonIncome)}</b></div>
          <div className="row small"><span>Season expenses</span><b className="right" style={{ color: 'var(--bad)' }}>{fmtMoney(fin.seasonExpense)}</b></div>
        </div>
        {ledger.length > 0 && (
          <>
            <div className="ledger">
              {ledger.map((l) => (
                <div key={l.month} className="m">
                  <div className="bars">
                    <div style={{ height: `${(l.income / maxL) * 100}%`, background: 'var(--grass)' }} />
                    <div style={{ height: `${(l.expense / maxL) * 100}%`, background: 'var(--coral)' }} />
                  </div>
                  <span>{monthLabel(l.month).split(' ')[0]}</span>
                </div>
              ))}
            </div>
            <div className="row small" style={{ marginTop: 6 }}><span className="comp-dot" style={{ background: 'var(--grass)' }} /> Income <span className="comp-dot" style={{ background: 'var(--coral)', marginLeft: 10 }} /> Expenses</div>
          </>
        )}
      </Card>}

      {sec === 'board' && <Card title="Requests" tag="1 per month" tagColor="var(--yellow)">
        <div className="col">
          <button className="btn block" disabled={used} onClick={() => req('transfer')}>💷 More transfer funds</button>
          <button className="btn block" disabled={used} onClick={() => req('wage')}>📈 Raise wage budget (+10%)</button>
          <button className="btn block" disabled={used || club.facilities.training >= 5 || !!g.board.facilityUpgrade} onClick={() => req('training')}>🏋️ Training → level {Math.min(5, club.facilities.training + 1)} · {fmtMoney(upgradeCost(club.facilities.training + 1, tier))}</button>
          <button className="btn block" disabled={used || club.facilities.youth >= 5 || !!g.board.facilityUpgrade} onClick={() => req('youth')}>🌱 Youth → level {Math.min(5, club.facilities.youth + 1)} · {fmtMoney(upgradeCost(club.facilities.youth + 1, tier))}</button>
          {g.board.facilityUpgrade && <div className="small bold">🚧 {g.board.facilityUpgrade.kind} upgrade ready {g.board.facilityUpgrade.ready}</div>}
          {used && <div className="small muted">You've already made a request this month.</div>}
        </div>
      </Card>}

      {sec === 'club' && <Card title="Club" tag="Facilities" tagColor="var(--orange)">
        <div className="col" style={{ gap: 7 }}>
          <div className="row"><span>🏋️ Training</span><span className="right">{stars(club.facilities.training)}</span></div>
          <div className="row"><span>🌱 Youth</span><span className="right">{stars(club.facilities.youth)}</span></div>
          <div className="row"><span className="ellipsis">🏟️ {club.stadium}</span><b className="right">{club.capacity.toLocaleString()}</b></div>
          <div className="row"><span>⭐ Reputation</span><b className="right">{club.reputation}/100</b></div>
          <ClubBadgeButton club={club} />
        </div>
      </Card>}

      {sec === 'honours' && <Card title="Trophy Cabinet" tag={`${club.trophies.length}`} tagColor="var(--yellow)">
        {club.trophies.length ? (
          <div className="row wrap" style={{ gap: 8 }}>
            {club.trophies.slice().reverse().map((t, i) => (
              <div key={i} className="trophy"><span className="cup">{t.name.startsWith('Promotion') ? '🥈' : '🏆'}</span>{t.name}<span className="muted">{seasonLabel(t.season)}</span></div>
            ))}
          </div>
        ) : <div className="empty">The cabinet is empty… for now.</div>}
      </Card>}

      {sec === 'honours' && (club.youthTrophies?.length ?? 0) > 0 && (
        <Card title="Academy honours" tag={`${club.youthTrophies!.length}`} tagColor="var(--grass)">
          <div className="row wrap" style={{ gap: 8 }}>
            {club.youthTrophies!.slice().reverse().map((t, i) => (
              <div key={i} className="trophy"><span className="cup">🏅</span>{t.name}<span className="muted">{seasonLabel(t.season)}</span></div>
            ))}
          </div>
        </Card>
      )}

      {sec === 'honours' && (g.awards ?? []).some((a) => a.award !== 'Manager of the Month') && <AwardsCard />}
      {sec === 'honours' && <Card title="History" tag="Seasons" tagColor="var(--pink)">
        {g.history.length ? (
          <div className="list">
            {g.history.slice().reverse().map((h) => (
              <div key={h.season} className="li" style={{ cursor: 'default' }}>
                <div className="main">
                  <div className="t">{seasonLabel(h.season)} · {h.userFinish ? `${ordinal(h.userFinish.pos)} in ${h.userFinish.comp}` : '—'}</div>
                  <div className="s">{h.winners.slice(0, 2).map((w) => `${w.comp}: ${w.name}`).join(' · ')}</div>
                  {h.topScorer && <div className="s">Golden Boot: {h.topScorer.name} ({h.topScorer.goals})</div>}
                </div>
              </div>
            ))}
          </div>
        ) : <div className="empty">Your story is just beginning.</div>}
      </Card>}
      {sec === 'editor' && g.editor && <ClubEditor g={g} />}
    </SectionPage>
  );
}
