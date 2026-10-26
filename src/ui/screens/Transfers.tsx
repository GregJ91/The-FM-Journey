import { useMemo, useState } from 'react';
import { fmtShort } from '../../game/dates';
import { wageBill } from '../../game/generate';
import { POS_GROUP, age, fmtMoney, fullName, marketValue, overall, scoutedPotential, shortName } from '../../game/ratings';
import { acceptCounter, agreeTerms, askingPrice, respondIncoming, windowOpen } from '../../game/transfers';
import type { GameState, Player } from '../../game/types';
import { mutate, useGame } from '../../store';
import { useUI } from '../context';
import { Card, ClubLink, Ovr, PosTag, Stars, StatusIcons, useSort } from '../components/common';

type Tab = 'search' | 'shortlist' | 'free' | 'bids' | 'incoming' | 'news';

type Key = 'ovr' | 'age' | 'value' | 'pot' | 'name';

function PlayerList({ g, players, showAsk = true }: { g: GameState; players: Player[]; showAsk?: boolean }) {
  const ui = useUI();
  const { Th, sort } = useSort<Key>('ovr');
  const rows = sort(players, {
    ovr: overall, age: (p) => age(p, g.date), value: (p) => marketValue(p, g.date), pot: (p) => scoutedPotential(p, false), name: (p) => p.last,
  }).slice(0, 150);
  if (!rows.length) return <div className="empty">No players match.</div>;
  return (
    <div className="table-wrap">
      <table className="t">
        <thead>
          <tr>
            <th>Pos</th><Th k="name">Name</Th><Th k="age" className="r">Age</Th><Th k="ovr" className="c">OVR</Th><Th k="pot">Potential</Th><th>Club</th>
            <Th k="value" className="r">Value</Th>{showAsk && <th className="r">Asking</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} className="click" onClick={() => ui.openPlayer(p.id)}>
              <td><PosTag pos={p.pos} /></td>
              <td className="bold">{shortName(p)}<StatusIcons p={p} />{p.real && <span title="Real player"> ✓</span>}<span className="flag"> {p.nat}</span></td>
              <td className="r">{age(p, g.date)}</td>
              <td className="c"><Ovr value={overall(p)} /></td>
              <td><Stars ovr={scoutedPotential(p, p.clubId === g.userClubId)} /></td>
              <td>{p.clubId !== null ? <ClubLink g={g} id={p.clubId} size={18} /> : <span className="muted">Free agent</span>}</td>
              <td className="r num">{fmtMoney(marketValue(p, g.date))}</td>
              {showAsk && <td className="r num bold">{p.clubId === null ? 'Free' : fmtMoney(askingPrice(g, p))}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Transfers() {
  const g = useGame();
  const ui = useUI();
  const [tab, setTab] = useState<Tab>('search');
  const [q, setQ] = useState('');
  const [grp, setGrp] = useState<'ALL' | 'GK' | 'DEF' | 'MID' | 'ATT'>('ALL');
  const [minOvr, setMinOvr] = useState(0);
  const [maxAge, setMaxAge] = useState(40);
  const [maxVal, setMaxVal] = useState(0);
  const [league, setLeague] = useState('ALL');
  const club = g.clubs[g.userClubId];
  const open = windowOpen(g);
  const bill = wageBill(g, club.id);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const leagueClubs = league === 'ALL' ? null : new Set(g.leagues.find((l) => l.id === league)?.clubIds ?? []);
    return Object.values(g.players).filter((p) => {
      if (p.clubId === club.id || p.squad === 'youth') return false;
      if (tab === 'free' ? p.clubId !== null : p.clubId === null) return false;
      if (needle && !fullName(p).toLowerCase().includes(needle)) return false;
      if (grp !== 'ALL' && POS_GROUP[p.pos] !== grp) return false;
      if (minOvr && overall(p) < minOvr) return false;
      if (maxAge < 40 && age(p, g.date) > maxAge) return false;
      if (maxVal && marketValue(p, g.date) > maxVal) return false;
      if (leagueClubs && (p.clubId === null || !leagueClubs.has(p.clubId))) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g, g.date, q, grp, minOvr, maxAge, maxVal, league, tab, club.id, g.transfers.length]);

  const myBids = g.offers.filter((o) => o.from === club.id).slice().reverse();
  const incoming = g.offers.filter((o) => o.to === club.id).slice().reverse();
  const pendingIncoming = incoming.filter((o) => o.status === 'pending').length;
  const news = g.transfers.slice(-60).reverse();

  const act = (fn: () => { ok: boolean; msg: string }) => {
    const r = mutate(fn);
    ui.toast(r.msg, !r.ok);
  };

  const TABS: [Tab, string][] = [['search', 'Search'], ['shortlist', `Shortlist (${g.shortlist.length})`], ['free', 'Free Agents'], ['bids', 'My Bids'], ['incoming', `Offers Received${pendingIncoming ? ` (${pendingIncoming})` : ''}`], ['news', 'Transfer News']];

  return (
    <div>
      <div className="page-title">
        <div>
          <div className="kicker">{club.name}</div>
          <h1>Transfers</h1>
        </div>
        <span className="chip">💷 Budget {fmtMoney(club.transferBudget)}</span>
        <span className="chip" style={{ background: bill > club.wageBudget ? 'var(--coral)' : undefined }}>Wages {fmtMoney(bill)} / {fmtMoney(club.wageBudget)} pw</span>
      </div>
      <div className={`banner ${open ? 'open' : 'closed'}`}>
        {open ? '🟢 The transfer window is OPEN.' : '🔴 The transfer window is CLOSED. It opens 1 July – 31 August and 1 – 31 January. Free agents can be signed any time.'}
      </div>
      <div className="tabs">
        {TABS.map(([id, label]) => <button key={id} className={`tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>{label}</button>)}
      </div>

      {(tab === 'search' || tab === 'free') && (
        <Card>
          <div className="row wrap" style={{ gap: 12, marginBottom: 14, alignItems: 'flex-end' }}>
            <div className="field" style={{ flex: '1 1 180px' }}><label>Name</label><input className="input" placeholder="Search players…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <div className="field"><label>Position</label>
              <div className="seg">{(['ALL', 'GK', 'DEF', 'MID', 'ATT'] as const).map((x) => <button key={x} className={grp === x ? 'on' : ''} onClick={() => setGrp(x)}>{x}</button>)}</div>
            </div>
            <div className="field"><label>Min OVR</label><input className="input" type="number" style={{ width: 80 }} value={minOvr || ''} onChange={(e) => setMinOvr(Number(e.target.value))} /></div>
            <div className="field"><label>Max age</label><input className="input" type="number" style={{ width: 80 }} value={maxAge >= 40 ? '' : maxAge} onChange={(e) => setMaxAge(Number(e.target.value) || 40)} /></div>
            {tab === 'search' && <div className="field"><label>Max value</label>
              <select className="input" value={maxVal} onChange={(e) => setMaxVal(Number(e.target.value))}>
                <option value={0}>Any</option>
                {[100_000, 500_000, 1_000_000, 5_000_000, 10_000_000, 25_000_000, 50_000_000, 100_000_000].map((v) => <option key={v} value={v}>{fmtMoney(v)}</option>)}
              </select>
            </div>}
            {tab === 'search' && <div className="field"><label>League</label>
              <select className="input" value={league} onChange={(e) => setLeague(e.target.value)}>
                <option value="ALL">All leagues</option>
                {g.leagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>}
          </div>
          <div className="small muted" style={{ marginBottom: 6 }}>{results.length} players found{results.length > 150 ? ' — showing top 150' : ''}. Click a player to scout and bid.</div>
          <PlayerList g={g} players={results} showAsk={tab === 'search'} />
        </Card>
      )}

      {tab === 'shortlist' && <Card><PlayerList g={g} players={g.shortlist.map((id) => g.players[id]).filter(Boolean)} /></Card>}

      {tab === 'bids' && (
        <Card>
          {myBids.length ? (
            <table className="t">
              <thead><tr><th>Date</th><th>Player</th><th>Club</th><th className="r">Fee</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {myBids.map((o) => {
                  const p = g.players[o.playerId];
                  if (!p) return null;
                  return (
                    <tr key={o.id}>
                      <td>{fmtShort(o.date)}</td>
                      <td className="bold click" style={{ cursor: 'pointer' }} onClick={() => ui.openPlayer(p.id)}>{fullName(p)} <Ovr value={overall(p)} /></td>
                      <td><ClubLink g={g} id={o.to} size={18} /></td>
                      <td className="r num">{fmtMoney(o.fee)}</td>
                      <td><StatusChip s={o.status} counter={o.counter} /></td>
                      <td className="r">
                        {o.status === 'countered' && <button className="btn sm yellow" onClick={() => act(() => acceptCounter(g, o.id))}>Accept {fmtMoney(o.counter!)}</button>}
                        {o.status === 'accepted' && <button className="btn sm primary" onClick={() => act(() => agreeTerms(g, o.id))}>Agree terms ({fmtMoney(o.wage)}/wk)</button>}
                        {(o.status === 'accepted' || o.status === 'countered' || o.status === 'pending') && <button className="btn sm ghost" onClick={() => mutate(() => { o.status = 'withdrawn'; })}>Withdraw</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : <div className="empty">You haven't made any bids yet. Find a player and click "Submit bid".</div>}
        </Card>
      )}

      {tab === 'incoming' && (
        <Card>
          {incoming.length ? (
            <table className="t">
              <thead><tr><th>Date</th><th>Player</th><th>Bidder</th><th className="r">Fee</th><th className="r">Value</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {incoming.map((o) => {
                  const p = g.players[o.playerId];
                  if (!p) return null;
                  return (
                    <tr key={o.id}>
                      <td>{fmtShort(o.date)}</td>
                      <td className="bold" style={{ cursor: 'pointer' }} onClick={() => ui.openPlayer(p.id)}>{fullName(p)} <Ovr value={overall(p)} /></td>
                      <td><ClubLink g={g} id={o.from} size={18} /></td>
                      <td className="r num bold">{fmtMoney(o.fee)}</td>
                      <td className="r num muted">{fmtMoney(marketValue(p, g.date))}</td>
                      <td><StatusChip s={o.status} /></td>
                      <td className="r">
                        {o.status === 'pending' && (
                          <>
                            <button className="btn sm primary" onClick={() => act(() => respondIncoming(g, o.id, true))}>Accept</button>{' '}
                            <button className="btn sm coral" onClick={() => act(() => respondIncoming(g, o.id, false))}>Reject</button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : <div className="empty">No offers received. Transfer-list players to attract bids.</div>}
        </Card>
      )}

      {tab === 'news' && (
        <Card>
          {news.length ? (
            <table className="t">
              <thead><tr><th>Date</th><th>Player</th><th>From</th><th>To</th><th className="r">Fee</th></tr></thead>
              <tbody>
                {news.map((t, i) => (
                  <tr key={i}>
                    <td>{fmtShort(t.date)}</td>
                    <td className="bold" style={{ cursor: g.players[t.playerId] ? 'pointer' : undefined }} onClick={() => g.players[t.playerId] && ui.openPlayer(t.playerId)}>{t.name}</td>
                    <td>{t.from !== null ? <ClubLink g={g} id={t.from} size={18} /> : <span className="muted">Free agent</span>}</td>
                    <td>{t.to !== null ? <ClubLink g={g} id={t.to} size={18} /> : <span className="muted">Released</span>}</td>
                    <td className="r num bold">{t.fee ? fmtMoney(t.fee) : 'Free'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div className="empty">No transfers yet.</div>}
        </Card>
      )}
    </div>
  );
}

function StatusChip({ s, counter }: { s: string; counter?: number }) {
  const map: Record<string, [string, string]> = {
    pending: ['⏳ Awaiting reply', 'var(--paper)'],
    accepted: ['✅ Fee agreed', 'var(--lime)'],
    countered: [`↩️ Counter ${counter ? fmtMoney(counter) : ''}`, 'var(--yellow)'],
    rejected: ['❌ Rejected', '#fde2e1'],
    done: ['🤝 Completed', 'var(--sky)'],
    withdrawn: ['Withdrawn', 'var(--soft)'],
    collapsed: ['Collapsed', 'var(--soft)'],
  };
  const [label, bg] = map[s] ?? [s, 'var(--paper)'];
  return <span className="chip" style={{ background: bg }}>{label}</span>;
}
