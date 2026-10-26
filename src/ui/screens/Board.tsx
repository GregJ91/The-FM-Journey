import { boardRequest, financeSummary, monthLabel, tierOf, upgradeCost, type BoardRequest } from '../../game/club';
import { fmtMoney } from '../../game/ratings';
import { ordinal, seasonLabel } from '../../game/season';
import { mutate, useGame } from '../../store';
import { useUI } from '../context';
import { Card, Meter } from '../components/common';
import { ClubBadgeButton } from '../components/BadgesSheet';

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
  const stars = (n: number) => <span className="stars">{'★'.repeat(n)}<span className="off">{'★'.repeat(5 - n)}</span></span>;
  return (
    <div>
      <div className="page-title">
        <div className="kicker">{club.name}</div>
        <h1>The Board</h1>
        <div className="chips"><span className="chip">{g.mode === 'create' ? '👑 Owner-manager: no sackings' : '⚠️ Sacked at 5% confidence'}</span></div>
      </div>

      <Card title="Confidence" tag={mood} tagColor={conf >= 60 ? 'var(--lime)' : conf >= 30 ? 'var(--yellow)' : 'var(--coral)'}>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div style={{ fontFamily: 'var(--display)', fontSize: 48, fontWeight: 800, lineHeight: 1 }}>{conf}%</div>
          <div className="small muted bold" style={{ marginLeft: 'auto', textAlign: 'right' }}>🎯 {g.board.objective}<br />Target: {ordinal(g.board.objectiveRank)} or better</div>
        </div>
        <div style={{ margin: '10px 0 6px' }}><Meter value={conf} /></div>
        <div className="small muted">Moves monthly with your league position against the target, and jumps at season end for trophies and promotions.</div>
      </Card>

      <Card title="Finances" tag="£" tagColor="var(--grass)">
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
      </Card>

      <Card title="Requests" tag="1 per month" tagColor="var(--yellow)">
        <div className="col">
          <button className="btn block" disabled={used} onClick={() => req('transfer')}>💷 More transfer funds</button>
          <button className="btn block" disabled={used} onClick={() => req('wage')}>📈 Raise wage budget (+10%)</button>
          <button className="btn block" disabled={used || club.facilities.training >= 5 || !!g.board.facilityUpgrade} onClick={() => req('training')}>🏋️ Training → level {Math.min(5, club.facilities.training + 1)} · {fmtMoney(upgradeCost(club.facilities.training + 1, tier))}</button>
          <button className="btn block" disabled={used || club.facilities.youth >= 5 || !!g.board.facilityUpgrade} onClick={() => req('youth')}>🌱 Youth → level {Math.min(5, club.facilities.youth + 1)} · {fmtMoney(upgradeCost(club.facilities.youth + 1, tier))}</button>
          {g.board.facilityUpgrade && <div className="small bold">🚧 {g.board.facilityUpgrade.kind} upgrade ready {g.board.facilityUpgrade.ready}</div>}
          {used && <div className="small muted">You've already made a request this month.</div>}
        </div>
      </Card>

      <Card title="Club" tag="Facilities" tagColor="var(--orange)">
        <div className="col" style={{ gap: 7 }}>
          <div className="row"><span>🏋️ Training</span><span className="right">{stars(club.facilities.training)}</span></div>
          <div className="row"><span>🌱 Youth</span><span className="right">{stars(club.facilities.youth)}</span></div>
          <div className="row"><span className="ellipsis">🏟️ {club.stadium}</span><b className="right">{club.capacity.toLocaleString()}</b></div>
          <div className="row"><span>⭐ Reputation</span><b className="right">{club.reputation}/100</b></div>
          <ClubBadgeButton club={club} />
        </div>
      </Card>

      <Card title="Trophy Cabinet" tag={`${club.trophies.length}`} tagColor="var(--yellow)">
        {club.trophies.length ? (
          <div className="row wrap" style={{ gap: 8 }}>
            {club.trophies.slice().reverse().map((t, i) => (
              <div key={i} className="trophy"><span className="cup">{t.name.startsWith('Promotion') ? '🥈' : '🏆'}</span>{t.name}<span className="muted">{seasonLabel(t.season)}</span></div>
            ))}
          </div>
        ) : <div className="empty">The cabinet is empty… for now.</div>}
      </Card>

      {(club.youthTrophies?.length ?? 0) > 0 && (
        <Card title="Academy honours" tag={`${club.youthTrophies!.length}`} tagColor="var(--grass)">
          <div className="row wrap" style={{ gap: 8 }}>
            {club.youthTrophies!.slice().reverse().map((t, i) => (
              <div key={i} className="trophy"><span className="cup">🏅</span>{t.name}<span className="muted">{seasonLabel(t.season)}</span></div>
            ))}
          </div>
        </Card>
      )}

      <Card title="History" tag="Seasons" tagColor="var(--pink)">
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
      </Card>
    </div>
  );
}
