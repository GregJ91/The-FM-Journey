import { useMemo, useState } from 'react';
import { fmtShort } from '../../game/dates';
import { wageBill } from '../../game/generate';
import { POS_GROUP, age, fmtMoney, fullName, marketValue, overall, shortName } from '../../game/ratings';
import { acceptCounter, askingPrice, respondIncoming, windowOpen } from '../../game/transfers';
import type { GameState, Offer, Player } from '../../game/types';
import { mutate, useGame } from '../../store';
import { useUI } from '../context';
import { Fit } from '../components/Fit';
import { Ovr, PosTag, Sheet } from '../components/common';
import { Crest } from '../components/Crest';

type Tab = 'search' | 'free' | 'shortlist' | 'bids' | 'incoming' | 'news';

function Results({ g, players, free, title }: { g: GameState; players: Player[]; free?: boolean; title: string }) {
  const ui = useUI();
  const shown = [...players].sort((a, b) => overall(b) - overall(a)).slice(0, 80);
  return (
    <div className="card fill squad-ns">
      <div className="card-h"><h3>{title}</h3><div className="right tile-sub">{players.length > 80 ? `top 80 of ${players.length}` : `${players.length} players`}</div></div>
      {!shown.length ? <div className="empty">No players match.</div> : (
        <Fit>
        <table className="t dense">
          <thead><tr><th>Pos</th><th>Name</th><th>Club</th><th className="r">Age</th><th className="r">Ab</th><th className="r">{free ? 'Wage' : 'Price'}</th></tr></thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p.id} className="click" onClick={() => ui.openPlayer(p.id)}>
                <td><PosTag pos={p.pos} /></td>
                <td className="nm"><b>{shortName(p)}</b></td>
                <td className="muted">{p.clubId !== null ? g.clubs[p.clubId].short : 'Free'}</td>
                <td className="r num">{age(p, g.date)}</td>
                <td className="r"><Ovr value={overall(p)} /></td>
                <td className="r num">{free || p.clubId === null ? `${fmtMoney(p.wage)}` : fmtMoney(askingPrice(g, p))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </Fit>
      )}
    </div>
  );
}

function OfferCard({ g, o, incoming, act }: { g: GameState; o: Offer; incoming?: boolean; act: (fn: () => { ok: boolean; msg: string }) => void }) {
  const ui = useUI();
  const p = g.players[o.playerId];
  if (!p) return null;
  const other = g.clubs[incoming ? o.from : o.to];
  return (
    <div className="card" style={{ padding: 12 }}>
      <div className="row" onClick={() => ui.openPlayer(p.id)} style={{ cursor: 'pointer' }}>
        <Crest club={other} size={32} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="bold ellipsis">{fullName(p)} <span className="muted">({overall(p)})</span></div>
          <div className="small muted">{incoming ? `Bid from ${other.name}` : `To ${other.name}`} · {fmtShort(o.date)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="bold" style={{ fontFamily: 'var(--display)', fontSize: 18 }}>{fmtMoney(o.fee)}</div>
          <StatusChip s={o.status} counter={o.counter} />
        </div>
      </div>
      {incoming && o.status === 'pending' && (
        <div className="grid2" style={{ marginTop: 10 }}>
          <button className="btn primary" onClick={() => act(() => respondIncoming(g, o.id, true))}>Accept</button>
          <button className="btn coral" onClick={() => act(() => respondIncoming(g, o.id, false))}>Reject</button>
        </div>
      )}
      {!incoming && (o.status === 'accepted' || o.status === 'countered' || o.status === 'pending') && (
        <div className="row" style={{ marginTop: 10 }}>
          {o.status === 'countered' && <button className="btn yellow" style={{ flex: 1 }} onClick={() => act(() => acceptCounter(g, o.id))}>Pay {fmtMoney(o.counter!)}</button>}
          {o.status === 'accepted' && <button className="btn primary" style={{ flex: 1 }} onClick={() => ui.openPlayer(o.playerId)}>{o.contract?.state === 'pending' ? 'Contract offered' : 'Offer contract'}</button>}
          <button className="btn" onClick={() => mutate(() => { o.status = 'withdrawn'; })}>Withdraw</button>
        </div>
      )}
    </div>
  );
}

export function Transfers() {
  const g = useGame();
  const ui = useUI();
  const [tab, setTab] = useState<Tab>('search');
  const [q, setQ] = useState('');
  const [grp, setGrp] = useState<'ALL' | 'GK' | 'DEF' | 'MID' | 'ATT'>('ALL');
  const [showFilters, setShowFilters] = useState(false);
  const [minOvr, setMinOvr] = useState(0);
  const [maxAge, setMaxAge] = useState(40);
  const [maxVal, setMaxVal] = useState(0);
  const [league, setLeague] = useState('ALL');
  const club = g.clubs[g.userClubId];
  const open = windowOpen(g);
  const bill = wageBill(g, club.id);

  const results = useMemo(() => {
    if (tab !== 'search' && tab !== 'free') return [];
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
  }, [g, q, grp, minOvr, maxAge, maxVal, league, tab, club.id]);

  const myBids = g.offers.filter((o) => o.from === club.id).slice().reverse();
  const incoming = g.offers.filter((o) => o.to === club.id).slice().reverse();
  const pendingIn = incoming.filter((o) => o.status === 'pending').length;
  const act = (fn: () => { ok: boolean; msg: string }) => {
    const r = mutate(fn);
    ui.toast(r.msg, !r.ok);
  };
  const TABS: [Tab, string][] = [['search', 'Search'], ['free', 'Free agents'], ['shortlist', `Shortlist (${g.shortlist.length})`], ['bids', `My bids (${myBids.length})`], ['incoming', `Offers${pendingIn ? ` (${pendingIn} new)` : ''}`], ['news', 'Latest transfers']];

  const SECTION_TITLE: Record<Tab, string> = { search: 'Transfer search', free: 'Free agents', shortlist: 'Shortlist', bids: 'My bids', incoming: 'Offers for your players', news: 'Latest transfers' };

  // Championship Manager-style: one toolbar, one status line, one big window of results
  return (
    <div className="win-list">
      <div className="ns-bar-row">
        <select className="input" aria-label="Section" value={tab} onChange={(e) => setTab(e.target.value as Tab)}>
          {TABS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
        {(tab === 'search' || tab === 'free') && (
          <select className="input" aria-label="Position" value={grp} onChange={(e) => setGrp(e.target.value as typeof grp)} style={{ flex: 'none', width: 92 }}>
            {(['ALL', 'GK', 'DEF', 'MID', 'ATT'] as const).map((x) => <option key={x} value={x}>{x === 'ALL' ? 'All pos' : x}</option>)}
          </select>
        )}
        {(tab === 'search' || tab === 'free') && <button className={`btn sm ${showFilters ? 'primary' : ''}`} style={{ minHeight: 32 }} onClick={() => setShowFilters(true)}>Filters</button>}
      </div>
      {(tab === 'search' || tab === 'free') && <input className="input ns-search" placeholder="Search players by name" value={q} onChange={(e) => setQ(e.target.value)} />}
      <div className="ns-status">
        <span>Budget <b>{fmtMoney(club.transferBudget)}</b></span>
        <span>Wages <b className={bill > club.wageBudget ? 'bad' : ''}>{fmtMoney(bill)}</b> / {fmtMoney(club.wageBudget)}</span>
        <span className={open ? 'ok' : 'bad'}>{open ? 'Window open' : 'Window shut'}</span>
      </div>

      {(tab === 'search' || tab === 'free') && <Results g={g} players={results} free={tab === 'free'} title={SECTION_TITLE[tab]} />}
      {tab === 'shortlist' && <Results g={g} players={g.shortlist.map((id) => g.players[id]).filter(Boolean)} title="Shortlist" />}

      {(tab === 'bids' || tab === 'incoming') && (
        <div className="card fill squad-ns">
          <div className="card-h"><h3>{SECTION_TITLE[tab]}</h3></div>
          <Fit><div className="list offers-list">
            {(tab === 'bids' ? myBids : incoming).map((o) => <OfferCard key={o.id} g={g} o={o} incoming={tab === 'incoming'} act={act} />)}
            {!(tab === 'bids' ? myBids : incoming).length && <div className="empty">{tab === 'bids' ? 'No bids yet. Open a player and tap Transfer → Submit bid.' : 'No offers yet. Transfer-list players to attract bids.'}</div>}
          </div></Fit>
        </div>
      )}

      {tab === 'news' && (
        <div className="card fill squad-ns">
          <div className="card-h"><h3>{SECTION_TITLE.news}</h3></div>
          <Fit>
          <table className="t dense">
            <tbody>
              {g.transfers.slice(-50).reverse().map((t, i) => (
                <tr key={i} className="click" onClick={() => g.players[t.playerId] && ui.openPlayer(t.playerId)}>
                  <td className="nm"><b>{t.name}</b><div className="muted small">{t.from !== null ? g.clubs[t.from].short : 'Free'} → {t.to !== null ? g.clubs[t.to].short : 'Released'} · {fmtShort(t.date)}</div></td>
                  <td className="r num">{t.fee ? fmtMoney(t.fee) : 'Free'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!g.transfers.length && <div className="empty">No transfers yet.</div>}
          </Fit>
        </div>
      )}

      {showFilters && (
        <Sheet title="Filters" onClose={() => setShowFilters(false)}>
          <div className="sheet-b filters">
            <div className="field"><label>Min ability</label><input className="input" type="number" inputMode="numeric" value={minOvr || ''} onChange={(e) => setMinOvr(Number(e.target.value))} /></div>
            <div className="field"><label>Max age</label><input className="input" type="number" inputMode="numeric" value={maxAge >= 40 ? '' : maxAge} onChange={(e) => setMaxAge(Number(e.target.value) || 40)} /></div>
            {tab === 'search' && (
              <>
                <div className="field"><label>Max value</label>
                  <select className="input" value={maxVal} onChange={(e) => setMaxVal(Number(e.target.value))}>
                    <option value={0}>Any</option>
                    {[100_000, 500_000, 1_000_000, 5_000_000, 10_000_000, 25_000_000, 50_000_000, 100_000_000].map((v) => <option key={v} value={v}>{fmtMoney(v)}</option>)}
                  </select>
                </div>
                <div className="field"><label>League</label>
                  <select className="input" value={league} onChange={(e) => setLeague(e.target.value)}>
                    <option value="ALL">All</option>
                    {g.leagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              </>
            )}
            <button className="btn primary block" onClick={() => setShowFilters(false)}>Show {results.length} players</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function StatusChip({ s, counter }: { s: string; counter?: number }) {
  const map: Record<string, [string, string]> = {
    pending: ['Waiting', 'var(--muted)'],
    accepted: ['Fee agreed', 'var(--grass)'],
    countered: [`Wants ${counter ? fmtMoney(counter) : ''}`, 'var(--yellow)'],
    rejected: ['Rejected', 'var(--coral)'],
    done: ['Completed', 'var(--sky)'],
    withdrawn: ['Withdrawn', 'var(--faint)'],
    collapsed: ['Collapsed', 'var(--faint)'],
  };
  const [label, c] = map[s] ?? [s, 'var(--muted)'];
  return <span className="chip" style={{ color: c, background: `color-mix(in srgb, ${c} 14%, transparent)`, borderColor: 'transparent' }}>{label}</span>;
}
