import { boardRequest, financeSummary, monthLabel, tierOf, upgradeCost, type BoardRequest } from '../../game/club';
import { fmtMoney } from '../../game/ratings';
import { ordinal, seasonLabel } from '../../game/season';
import { mutate, useGame } from '../../store';
import { useUI } from '../context';
import { Card, Meter } from '../components/common';

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
  const usedThisMonth = g.board.lastRequest === g.date.slice(0, 7);
  return (
    <div>
      <div className="page-title">
        <div>
          <div className="kicker">{club.name}</div>
          <h1>The Board</h1>
        </div>
        <span className="chip">{g.mode === 'create' ? '👑 You are owner-manager — no sackings, but the board still sets targets' : '⚠️ Drop to 5% confidence and you will be sacked'}</span>
      </div>
      <div className="grid g3">
        <Card title="Confidence" tag={mood} tagColor={conf >= 60 ? 'var(--lime)' : conf >= 30 ? 'var(--yellow)' : 'var(--coral)'}>
          <div style={{ fontFamily: 'var(--display)', fontSize: 54, fontWeight: 800, lineHeight: 1 }}>{conf}%</div>
          <div style={{ margin: '14px 0' }}><Meter value={conf} /></div>
          <div className="small muted">Confidence moves monthly with your league position versus the target, and jumps at season end, for trophies and promotions.</div>
        </Card>
        <Card title="Season Objective" tag={seasonLabel(g.season)} tagColor="var(--violet)">
          <div style={{ fontFamily: 'var(--display)', fontSize: 26, fontWeight: 800, lineHeight: 1.1 }}>🎯 {g.board.objective}</div>
          <div className="small muted" style={{ marginTop: 8 }}>Target: finish {ordinal(g.board.objectiveRank)} or higher.</div>
        </Card>
        <Card title="Finances" tag="£" tagColor="var(--grass)">
          <div className="col" style={{ gap: 6 }}>
            <div className="row"><span>Balance</span><b className="right" style={{ color: fin.balance < 0 ? 'var(--bad)' : undefined }}>{fmtMoney(fin.balance)}</b></div>
            <div className="row"><span>Transfer budget</span><b className="right">{fmtMoney(fin.transferBudget)}</b></div>
            <div className="row"><span>Wage bill</span><b className="right">{fmtMoney(fin.wageBill)} / {fmtMoney(fin.wageBudget)} pw</b></div>
            <div className="bar"><div style={{ width: `${Math.min(100, (fin.wageBill / Math.max(1, fin.wageBudget)) * 100)}%`, background: fin.wageBill > fin.wageBudget ? 'var(--coral)' : 'var(--grass)' }} /></div>
            <div className="row small"><span>Season income</span><b className="right" style={{ color: 'var(--good)' }}>{fmtMoney(fin.seasonIncome)}</b></div>
            <div className="row small"><span>Season expenses</span><b className="right" style={{ color: 'var(--bad)' }}>{fmtMoney(fin.seasonExpense)}</b></div>
          </div>
        </Card>

        <Card title="Monthly cash flow" tag="12 months" tagColor="var(--sky)" className="span2">
          {ledger.length ? (
            <>
              <div className="ledger">
                {ledger.map((l) => (
                  <div key={l.month} className="m" title={`Income ${fmtMoney(l.income)} · Expenses ${fmtMoney(l.expense)}`}>
                    <div className="bars">
                      <div style={{ height: `${(l.income / maxL) * 100}%`, background: 'var(--grass)' }} />
                      <div style={{ height: `${(l.expense / maxL) * 100}%`, background: 'var(--coral)' }} />
                    </div>
                    <span>{monthLabel(l.month)}</span>
                  </div>
                ))}
              </div>
              <div className="row small" style={{ marginTop: 8 }}><span className="comp-dot" style={{ background: 'var(--grass)' }} /> Income <span className="comp-dot" style={{ background: 'var(--coral)', marginLeft: 10 }} /> Expenses (wages, transfers, facilities)</div>
            </>
          ) : <div className="empty">Cash-flow data appears after your first month.</div>}
        </Card>

        <Card title="Requests" tag="1 per month" tagColor="var(--yellow)">
          <div className="col">
            <button className="btn" disabled={usedThisMonth} onClick={() => req('transfer')}>💷 More transfer funds</button>
            <button className="btn" disabled={usedThisMonth} onClick={() => req('wage')}>📈 Raise wage budget (+10%)</button>
            <button className="btn" disabled={usedThisMonth || club.facilities.training >= 5 || !!g.board.facilityUpgrade} onClick={() => req('training')}>
              🏋️ Training facilities → {Math.min(5, club.facilities.training + 1)} ({fmtMoney(upgradeCost(club.facilities.training + 1, tier))})
            </button>
            <button className="btn" disabled={usedThisMonth || club.facilities.youth >= 5 || !!g.board.facilityUpgrade} onClick={() => req('youth')}>
              🌱 Youth facilities → {Math.min(5, club.facilities.youth + 1)} ({fmtMoney(upgradeCost(club.facilities.youth + 1, tier))})
            </button>
            {g.board.facilityUpgrade && <div className="small bold">🚧 {g.board.facilityUpgrade.kind} facilities upgrade ready on {g.board.facilityUpgrade.ready}</div>}
            {usedThisMonth && <div className="small muted">You've already made a request this month.</div>}
          </div>
        </Card>

        <Card title="Facilities" tag="Club" tagColor="var(--orange)">
          <div className="col">
            <div className="row"><span>🏋️ Training</span><span className="right stars">{'★'.repeat(club.facilities.training)}<span className="off">{'★'.repeat(5 - club.facilities.training)}</span></span></div>
            <div className="row"><span>🌱 Youth</span><span className="right stars">{'★'.repeat(club.facilities.youth)}<span className="off">{'★'.repeat(5 - club.facilities.youth)}</span></span></div>
            <div className="row"><span>🏟️ {club.stadium}</span><b className="right">{club.capacity.toLocaleString()}</b></div>
            <div className="row"><span>⭐ Reputation</span><b className="right">{club.reputation}/100</b></div>
          </div>
        </Card>

        <Card title="Trophy Cabinet" tag={`${club.trophies.length}`} tagColor="var(--yellow)" className="span2">
          {club.trophies.length ? (
            <div className="row wrap" style={{ gap: 12 }}>
              {club.trophies.slice().reverse().map((t, i) => (
                <div key={i} className="trophy"><span className="cup">{t.name.startsWith('Promotion') ? '🥈' : '🏆'}</span>{t.name}<span className="muted">{seasonLabel(t.season)}</span></div>
              ))}
            </div>
          ) : <div className="empty">The cabinet is empty… for now.</div>}
        </Card>

        <Card title="History" tag="Seasons" tagColor="var(--pink)" className="span3">
          {g.history.length ? (
            <table className="t">
              <thead><tr><th>Season</th><th>League</th><th>Finish</th><th>Champions</th><th>Golden Boot</th></tr></thead>
              <tbody>
                {g.history.slice().reverse().map((h) => (
                  <tr key={h.season}>
                    <td className="bold">{seasonLabel(h.season)}</td>
                    <td>{h.userFinish?.comp}</td>
                    <td className="bold">{h.userFinish ? ordinal(h.userFinish.pos) : '—'}</td>
                    <td className="small">{h.winners.slice(0, 3).map((w) => `${w.comp}: ${w.name}`).join(' · ')}</td>
                    <td className="small">{h.topScorer ? `${h.topScorer.name} (${h.topScorer.goals})` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div className="empty">Your story is just beginning.</div>}
        </Card>
      </div>
    </div>
  );
}
