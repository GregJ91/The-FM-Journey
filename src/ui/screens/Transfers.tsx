import { useMemo, useState } from 'react';
import { fmtShort } from '../../game/dates';
import { wageBill } from '../../game/generate';
import { POS_GROUP, age, fmtMoney, fullName, marketValue, overall } from '../../game/ratings';
import { acceptCounter, agreeTerms, askingPrice, respondIncoming, windowOpen } from '../../game/transfers';
import type { GameState, Offer, Player } from '../../game/types';
import { mutate, useGame } from '../../store';
import { useUI } from '../context';
import { Fit } from '../components/Fit';
import { Card, PlayerRow } from '../components/common';
import { Crest } from '../components/Crest';

type Tab = 'search' | 'free' | 'shortlist' | 'bids' | 'incoming' | 'news';

function Results({ g, players, free }: { g: GameState; players: Player[]; free?: boolean }) {
  const shown = [...players].sort((a, b) => overall(b) - overall(a)).slice(0, 80);
  if (!shown.length) return <div className="empty">No players match.</div>;
  return (
    <div className="card fill" style={{ paddingTop: 4, paddingBottom: 4 }}>
      <Fit>
      <div className="list">
        {shown.map((p) => (
          <PlayerRow
            key={p.id}
            p={p}
            sub={`${age(p, g.date)}y · ${p.clubId !== null ? g.clubs[p.clubId].name : 'Free agent'}${p.real ? ' ✓' : ''}`}
            end={free || p.clubId === null ? 'Free' : fmtMoney(askingPrice(g, p))}
            endSub={free || p.clubId === null ? `${fmtMoney(p.wage)}/wk` : `val ${fmtMoney(marketValue(p, g.date))}`}
          />
        ))}
      </div>
      </Fit>
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
          {o.status === 'accepted' && <button className="btn primary" style={{ flex: 1 }} onClick={() => act(() => agreeTerms(g, o.id))}>Agree terms · {fmtMoney(o.wage)}/wk</button>}
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
  const TABS: [Tab, string][] = [['search', 'Search'], ['free', 'Free Agents'], ['shortlist', `Shortlist ${g.shortlist.length || ''}`], ['bids', 'My Bids'], ['incoming', `Offers${pendingIn ? ` (${pendingIn})` : ''}`], ['news', 'News']];

  return (
    <div className="split-page">
      <div className="sp-side">
      <div className="page-title">
        <div className="kicker">{club.name}</div>
        <h1>Transfers</h1>
        <div className="chips">
          <span className="chip">💷 {fmtMoney(club.transferBudget)}</span>
          <span className="chip" style={{ background: bill > club.wageBudget ? 'var(--coral)' : undefined }}>Wages {fmtMoney(bill)}/{fmtMoney(club.wageBudget)}</span>
        </div>
      </div>
      <div className={`banner ${open ? 'open' : 'closed'}`}>
        {open ? '🟢 Transfer window OPEN' : '🔴 Window CLOSED · opens 1 Jul & 1 Jan. Free agents can sign any time.'}
      </div>
      <div className="tabs">
        {TABS.map(([id, label]) => <button key={id} className={`tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>{label}</button>)}
      </div>

      {(tab === 'search' || tab === 'free') && (
          <div className="card" style={{ padding: 12 }}>
            <div className="row">
              <input className="input" placeholder="Search players…" value={q} onChange={(e) => setQ(e.target.value)} />
              <button className={`btn ${showFilters ? 'primary' : ''}`} onClick={() => setShowFilters(!showFilters)}>⚙︎</button>
            </div>
            <div className="seg" style={{ marginTop: 8 }}>
              {(['ALL', 'GK', 'DEF', 'MID', 'ATT'] as const).map((x) => <button key={x} className={grp === x ? 'on' : ''} onClick={() => setGrp(x)}>{x}</button>)}
            </div>
            {showFilters && (
              <div className="filters">
                <div className="field"><label>Min OVR</label><input className="input" type="number" inputMode="numeric" value={minOvr || ''} onChange={(e) => setMinOvr(Number(e.target.value))} /></div>
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
              </div>
            )}
            <div className="small muted bold" style={{ marginTop: 8 }}>{results.length} players{results.length > 80 ? ' · top 80 shown' : ''}</div>
          </div>
      )}
      </div>

      <div className="sp-main">
      {(tab === 'search' || tab === 'free') && <Results g={g} players={results} free={tab === 'free'} />}

      {tab === 'shortlist' && <Results g={g} players={g.shortlist.map((id) => g.players[id]).filter(Boolean)} />}

      {tab === 'bids' && (myBids.length ? myBids.map((o) => <OfferCard key={o.id} g={g} o={o} act={act} />) : <div className="empty">No bids yet. Open a player and tap Transfer → Submit bid.</div>)}

      {tab === 'incoming' && (incoming.length ? incoming.map((o) => <OfferCard key={o.id} g={g} o={o} incoming act={act} />) : <div className="empty">No offers yet. Transfer-list players to attract bids.</div>)}

      {tab === 'news' && (
        <Card>
          <div className="list">
            {g.transfers.slice(-50).reverse().map((t, i) => (
              <div key={i} className="li" onClick={() => g.players[t.playerId] && ui.openPlayer(t.playerId)}>
                <div className="main">
                  <div className="t">{t.name}</div>
                  <div className="s">{t.from !== null ? g.clubs[t.from].name : 'Free agent'} → {t.to !== null ? g.clubs[t.to].name : 'Released'} · {fmtShort(t.date)}</div>
                </div>
                <div className="end"><div className="v">{t.fee ? fmtMoney(t.fee) : 'Free'}</div></div>
              </div>
            ))}
            {!g.transfers.length && <div className="empty">No transfers yet.</div>}
          </div>
        </Card>
      )}
      </div>
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
