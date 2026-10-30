import { useMemo, useState } from 'react';
import { fmtShort } from '../../game/dates';
import { wageBill } from '../../game/generate';
import { POS_GROUP, age, fmtMoney, fullName, marketValue, overall, scoutedPotential, shortName } from '../../game/ratings';
import { nationName } from '../../game/intl';
import { SEARCH_ATTRS, attrByLabel } from '../../game/cm0102/attrs';
import { acceptCounter, askingPrice, respondIncoming, windowOpen } from '../../game/transfers';
import type { GameState, Offer, Player, Pos } from '../../game/types';

const range = (a: number, b: number, step = 1) => Array.from({ length: Math.floor((b - a) / step) + 1 }, (_, i) => a + i * step);
import { mutate, useGame } from '../../store';
import { useUI } from '../context';
import { Fit } from '../components/Fit';
import { Ovr, PosTag, Sheet } from '../components/common';
import { Crest } from '../components/Crest';

type Tab = 'search' | 'free' | 'shortlist' | 'bids' | 'incoming' | 'loans' | 'news';
type SortKey = 'ability' | 'potential' | 'value' | 'age' | 'youngest' | 'name' | 'attrs';

/** CM 01/02-style player search: every filter the scout screen offered. */
interface Filters {
  pos: string; // 'ALL', a group (GK/DEF/MID/ATT) or an exact position ("can play there")
  ageMin: number;
  ageMax: number;
  minOvr: number;
  minPot: number;
  maxVal: number;
  maxWage: number;
  nat: string;
  country: string;
  league: string; // 'ALL', a league id, or 'OTHER' (clubs that don't play in the game)
  status: 'any' | 'listed' | 'expiring';
  squad: 'any' | 'senior' | 'youth';
  foot: 'any' | 'L' | 'R' | 'B';
  att: [string, number][]; // up to three attributes with a minimum ("Pace 15+"), as CM's search allowed
  sort: SortKey;
}
const NO_FILTERS: Filters = { pos: 'ALL', ageMin: 15, ageMax: 45, minOvr: 0, minPot: 0, maxVal: 0, maxWage: 0, nat: 'ALL', country: 'ALL', league: 'ALL', status: 'any', squad: 'any', foot: 'any', att: [['', 0], ['', 0], ['', 0]], sort: 'ability' };
const EXACT_POS: Pos[] = ['GK', 'DL', 'DC', 'DR', 'DM', 'ML', 'MC', 'MR', 'AML', 'AMC', 'AMR', 'ST'];
const SORTS: [SortKey, string][] = [['attrs', 'Chosen attributes'], ['ability', 'Ability'], ['potential', 'Potential (scouted)'], ['value', 'Value'], ['youngest', 'Youngest'], ['age', 'Oldest'], ['name', 'Name']];

function sortPlayers(g: GameState, players: Player[], sort: SortKey, attrs: string[] = []) {
  const key: Record<SortKey, (p: Player) => number | string> = {
    attrs: (p) => -attrs.reduce((s, l) => s + attrByLabel(p, l), 0) || -marketValue(p, g.date),
    ability: (p) => -overall(p),
    potential: (p) => -scoutedPotential(p, p.clubId === g.userClubId),
    value: (p) => -marketValue(p, g.date),
    youngest: (p) => -Date.parse(p.dob),
    age: (p) => Date.parse(p.dob),
    name: (p) => `${p.last} ${p.first}`.toLowerCase(),
  };
  const k = key[sort];
  return players.map((p) => ({ p, v: k(p) })).sort((a, b) => (a.v < b.v ? -1 : a.v > b.v ? 1 : 0)).map((x) => x.p);
}

function activeFilters(f: Filters) {
  return (Object.keys(NO_FILTERS) as (keyof Filters)[]).filter((k) => k !== 'sort' && k !== 'pos' && k !== 'att' && f[k] !== NO_FILTERS[k]).length + chosenAttrs(f).length;
}

/** The attribute filters in use. */
function chosenAttrs(f: Filters) {
  return f.att.filter(([l, min]) => l && min > 0);
}

const SHOW = 200;

function Results({ g, players, free, title, sort = 'ability', hideAbility, attrs = [] }: { g: GameState; players: Player[]; free?: boolean; title: string; sort?: SortKey; hideAbility?: boolean; attrs?: string[] }) {
  const ui = useUI();
  const shown = sortPlayers(g, players, sort === 'attrs' && !attrs.length ? 'value' : sort, attrs).slice(0, SHOW);
  const short = (l: string) => l.split(' ').map((w) => w.slice(0, w.length > 5 && attrs.length > 1 ? 3 : 5)).join(' ');
  return (
    <div className="card fill squad-ns">
      <div className="card-h"><h3>{title}</h3><div className="right tile-sub">{players.length > SHOW ? `top ${SHOW} of ${players.length}` : `${players.length} players`}</div></div>
      {!shown.length ? <div className="empty">No players match.</div> : (
        <Fit>
        <table className="t dense">
          <thead><tr><th>Pos</th><th>Name</th><th>Club</th><th className="r">Age</th>{attrs.map((l) => <th key={l} className="r">{short(l)}</th>)}{!hideAbility && <th className="r">Ab</th>}<th className="r">{free ? 'Wage' : 'Price'}</th></tr></thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p.id} className="click" onClick={() => ui.openPlayer(p.id)}>
                <td><PosTag pos={p.pos} /></td>
                <td className="nm"><b>{shortName(p)}</b></td>
                <td className="muted">{p.clubId !== null ? g.clubs[p.clubId].short : 'Free'}</td>
                <td className="r num">{age(p, g.date)}</td>
                {attrs.map((l) => <td key={l} className="r num"><b>{attrByLabel(p, l)}</b></td>)}
                {!hideAbility && <td className="r"><Ovr value={overall(p)} /></td>}
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
          <div className="bold ellipsis">{fullName(p)} {!(g.era === 'cm0102' && !incoming) && <span className="muted">({overall(p)})</span>}</div>
          <div className="small muted">{incoming ? `Bid from ${other.name}` : `To ${other.name}`} · {fmtShort(o.date)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="bold" style={{ fontFamily: 'var(--display)', fontSize: 18 }}>{o.kind === 'loan' ? 'Loan' : fmtMoney(o.fee)}</div>
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
  const [showFilters, setShowFilters] = useState(false);
  // CM 01/02 never showed a player's ability: no searching or sorting by it (you judge players by their attributes)
  const hideAbility = g.era === 'cm0102';
  const [f, setF] = useState<Filters>(hideAbility ? { ...NO_FILTERS, sort: 'value' } : NO_FILTERS);
  const set = (patch: Partial<Filters>) => setF((x) => ({ ...x, ...patch }));
  const club = g.clubs[g.userClubId];
  const open = windowOpen(g);
  const bill = wageBill(g, club.id);

  const results = useMemo(() => {
    if (tab !== 'search' && tab !== 'free') return [];
    const needle = q.trim().toLowerCase();
    const leagueClubs = f.league === 'ALL' || f.league === 'OTHER' ? null : new Set(g.leagues.find((l) => l.id === f.league)?.clubIds ?? []);
    const inLeague = new Set(g.leagues.flatMap((l) => l.clubIds));
    const groups = ['GK', 'DEF', 'MID', 'ATT'];
    const att = chosenAttrs(f);
    return Object.values(g.players).filter((p) => {
      // CM 01/02: anyone can be bought, academy players included (Cherno Samba at Millwall…)
      if (p.clubId === club.id || (p.squad === 'youth' && g.era !== 'cm0102')) return false;
      if (tab === 'free' ? p.clubId !== null : p.clubId === null) return false;
      if (needle && !fullName(p).toLowerCase().includes(needle)) return false;
      if (f.pos !== 'ALL' && (groups.includes(f.pos) ? POS_GROUP[p.pos] !== f.pos : p.pos !== f.pos && !p.alt.includes(f.pos as Pos))) return false;
      const a = age(p, g.date);
      if (a < f.ageMin || a > f.ageMax) return false;
      if (f.minOvr && overall(p) < f.minOvr) return false;
      if (f.minPot && scoutedPotential(p, false) < f.minPot) return false;
      if (f.maxVal && marketValue(p, g.date) > f.maxVal) return false;
      if (f.maxWage && p.wage > f.maxWage) return false;
      if (f.nat !== 'ALL' && p.nat !== f.nat) return false;
      if (f.country !== 'ALL' && (p.clubId === null || g.clubs[p.clubId].country !== f.country)) return false;
      if (leagueClubs && (p.clubId === null || !leagueClubs.has(p.clubId))) return false;
      if (f.league === 'OTHER' && (p.clubId === null || inLeague.has(p.clubId))) return false;
      if (f.status === 'listed' && !p.listed) return false;
      if (f.status === 'expiring' && p.contractEnd > g.season + 1) return false;
      if (f.squad !== 'any' && (p.squad === 'youth') !== (f.squad === 'youth')) return false;
      if (f.foot !== 'any' && p.foot !== f.foot) return false;
      for (const [l, min] of att) if (attrByLabel(p, l) < min) return false;
      return true;
    });
  }, [g, q, f, tab, club.id]);
  const nats = useMemo(() => [...new Set(Object.values(g.players).map((p) => p.nat))].map((c) => [c, nationName(c)] as const).sort((a, b) => a[1].localeCompare(b[1])), [g]);
  const countries = useMemo(() => [...new Set(Object.values(g.clubs).map((c) => c.country))].map((c) => [c, nationName(c)] as const).sort((a, b) => a[1].localeCompare(b[1])), [g]);
  const nActive = activeFilters(f);

  // Deals with clubs (talks with players themselves live on their profiles and in the inbox)
  const myBids = g.offers.filter((o) => o.from === club.id && (!o.kind || o.kind === 'transfer' || o.kind === 'loan')).slice().reverse();
  const incoming = g.offers.filter((o) => o.to === club.id && o.from !== club.id).slice().reverse();
  const pendingIn = incoming.filter((o) => o.status === 'pending').length;
  const act = (fn: () => { ok: boolean; msg: string }) => {
    const r = mutate(fn);
    ui.toast(r.msg, !r.ok);
  };
  const TABS: [Tab, string][] = [['search', 'Search'], ['free', 'Free agents'], ['shortlist', `Shortlist (${g.shortlist.length})`], ['bids', `My bids (${myBids.length})`], ['incoming', `Offers${pendingIn ? ` (${pendingIn} new)` : ''}`], ...(g.era ? [['loans', 'Loans'] as [Tab, string]] : []), ['news', 'Latest transfers']];

  const SECTION_TITLE: Record<Tab, string> = { search: 'Transfer search', free: 'Free agents', shortlist: 'Shortlist', bids: 'My bids', incoming: 'Offers for your players', loans: 'Loans', news: 'Latest transfers' };

  // Championship Manager-style: one toolbar, one status line, one big window of results
  return (
    <div className="win-list">
      <div className="ns-bar-row">
        <select className="input" aria-label="Section" value={tab} onChange={(e) => setTab(e.target.value as Tab)}>
          {TABS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
        {(tab === 'search' || tab === 'free') && (
          <select className="input" aria-label="Position" value={f.pos} onChange={(e) => set({ pos: e.target.value })} style={{ flex: 'none', width: 92 }}>
            <option value="ALL">All pos</option>
            <optgroup label="Area">{['GK', 'DEF', 'MID', 'ATT'].map((x) => <option key={x} value={x}>{x === 'GK' ? 'Keepers' : x === 'DEF' ? 'Defenders' : x === 'MID' ? 'Midfield' : 'Attack'}</option>)}</optgroup>
            <optgroup label="Can play">{EXACT_POS.filter((x) => x !== 'GK').map((x) => <option key={x} value={x}>{x}</option>)}</optgroup>
          </select>
        )}
        {(tab === 'search' || tab === 'free') && <button className={`btn sm ${nActive ? 'primary' : ''}`} style={{ minHeight: 32 }} onClick={() => setShowFilters(true)}>Filters{nActive ? ` (${nActive})` : ''}</button>}
      </div>
      {(tab === 'search' || tab === 'free') && <input className="input ns-search" placeholder="Search players by name" value={q} onChange={(e) => setQ(e.target.value)} />}
      <div className="ns-status">
        <span>Budget <b>{fmtMoney(club.transferBudget)}</b></span>
        <span>Wages <b className={bill > club.wageBudget ? 'bad' : ''}>{fmtMoney(bill)}</b> / {fmtMoney(club.wageBudget)}</span>
        <span className={open ? 'ok' : 'bad'}>{open ? 'Window open' : 'Window shut'}</span>
      </div>

      {(tab === 'search' || tab === 'free') && <Results g={g} players={results} free={tab === 'free'} title={SECTION_TITLE[tab]} sort={f.sort} hideAbility={hideAbility} attrs={chosenAttrs(f).map(([l]) => l)} />}
      {tab === 'shortlist' && <Results g={g} players={g.shortlist.map((id) => g.players[id]).filter(Boolean)} title="Shortlist" sort={hideAbility ? 'value' : 'ability'} hideAbility={hideAbility} />}

      {(tab === 'bids' || tab === 'incoming') && (
        <div className="card fill squad-ns">
          <div className="card-h"><h3>{SECTION_TITLE[tab]}</h3></div>
          <Fit><div className="list offers-list">
            {(tab === 'bids' ? myBids : incoming).map((o) => <OfferCard key={o.id} g={g} o={o} incoming={tab === 'incoming'} act={act} />)}
            {!(tab === 'bids' ? myBids : incoming).length && <div className="empty">{tab === 'bids' ? 'No bids yet. Open a player and tap Transfer → Submit bid.' : 'No offers yet. Transfer-list players to attract bids.'}</div>}
          </div></Fit>
        </div>
      )}

      {tab === 'loans' && (() => {
        const out = Object.values(g.players).filter((p) => p.loan?.from === club.id);
        const inn = Object.values(g.players).filter((p) => p.clubId === club.id && p.loan);
        const listed = Object.values(g.players).filter((p) => p.clubId === club.id && p.loanListed && !p.loan);
        const row = (p: Player, where: string) => (
          <tr key={p.id} className="click" onClick={() => ui.openPlayer(p.id)}>
            <td><PosTag pos={p.pos} /></td><td className="nm"><b>{shortName(p)}</b><div className="muted small">{where}</div></td><td className="r num">{age(p, g.date)}</td>
          </tr>
        );
        return (
          <div className="card fill squad-ns">
            <div className="card-h"><h3>Loans</h3><div className="right tile-sub">until the end of the season</div></div>
            <Fit>
            <table className="t dense">
              <tbody>
                {out.map((p) => row(p, `Out on loan at ${g.clubs[p.clubId!].name}`))}
                {inn.map((p) => row(p, `In on loan from ${g.clubs[p.loan!.from]?.name}`))}
                {listed.map((p) => row(p, 'Loan listed: waiting for offers'))}
              </tbody>
            </table>
            {!out.length && !inn.length && !listed.length && <div className="empty">No loans. Put a player on the loan list from his profile (Manage), or offer to take one on loan from his Bid tab.</div>}
            </Fit>
          </div>
        );
      })()}

      {tab === 'news' && (
        <div className="card fill squad-ns">
          <div className="card-h"><h3>{SECTION_TITLE.news}</h3></div>
          <Fit>
          <table className="t dense">
            <tbody>
              {g.transfers.slice(-50).reverse().map((t, i) => (
                <tr key={i} className="click" onClick={() => g.players[t.playerId] && ui.openPlayer(t.playerId)}>
                  <td className="nm"><b>{t.name}</b><div className="muted small">{t.from !== null ? g.clubs[t.from].short : 'Free'} → {t.to !== null ? g.clubs[t.to].short : 'Released'} · {fmtShort(t.date)}</div></td>
                  <td className="r num">{t.loan ? 'Loan' : t.fee ? fmtMoney(t.fee) : 'Free'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!g.transfers.length && <div className="empty">No transfers yet.</div>}
          </Fit>
        </div>
      )}

      {showFilters && (
        <Sheet title="Player search" onClose={() => setShowFilters(false)} right={<button className="btn sm" onClick={() => setF({ ...NO_FILTERS, pos: f.pos, sort: hideAbility ? 'value' : 'ability' })}>Reset</button>}>
          <div className="sheet-b ti-grid filters">
            <label className="ti-field"><span>Age from</span>
              <select className="input" value={f.ageMin} onChange={(e) => set({ ageMin: Number(e.target.value) })}>{range(15, 40).map((a) => <option key={a} value={a}>{a}</option>)}</select></label>
            <label className="ti-field"><span>Age to</span>
              <select className="input" value={f.ageMax} onChange={(e) => set({ ageMax: Number(e.target.value) })}>{range(15, 45).map((a) => <option key={a} value={a}>{a}</option>)}</select></label>
            {!hideAbility && <label className="ti-field"><span>Min ability</span>
              <select className="input" value={f.minOvr} onChange={(e) => set({ minOvr: Number(e.target.value) })}><option value={0}>Any</option>{range(40, 90, 5).map((v) => <option key={v} value={v}>{v}+</option>)}</select></label>}
            {!hideAbility && <label className="ti-field"><span>Min potential</span>
              <select className="input" value={f.minPot} onChange={(e) => set({ minPot: Number(e.target.value) })}><option value={0}>Any</option>{range(60, 95, 5).map((v) => <option key={v} value={v}>{v}+</option>)}</select></label>}
            {tab === 'search' && <label className="ti-field"><span>Max value</span>
              <select className="input" value={f.maxVal} onChange={(e) => set({ maxVal: Number(e.target.value) })}><option value={0}>Any</option>{[50_000, 100_000, 250_000, 500_000, 1_000_000, 2_500_000, 5_000_000, 10_000_000, 20_000_000].map((v) => <option key={v} value={v}>{fmtMoney(v)}</option>)}</select></label>}
            <label className="ti-field"><span>Max wage</span>
              <select className="input" value={f.maxWage} onChange={(e) => set({ maxWage: Number(e.target.value) })}><option value={0}>Any</option>{[500, 1_000, 2_500, 5_000, 10_000, 20_000, 40_000].map((v) => <option key={v} value={v}>{fmtMoney(v)}/wk</option>)}</select></label>
            <label className="ti-field"><span>Nationality</span>
              <select className="input" value={f.nat} onChange={(e) => set({ nat: e.target.value })}><option value="ALL">Any</option>{nats.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select></label>
            {tab === 'search' && <label className="ti-field"><span>Club country</span>
              <select className="input" value={f.country} onChange={(e) => set({ country: e.target.value })}><option value="ALL">Any</option>{countries.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select></label>}
            {tab === 'search' && <label className="ti-field wide"><span>Division</span>
              <select className="input" value={f.league} onChange={(e) => set({ league: e.target.value })}>
                <option value="ALL">Any</option>
                {g.leagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                <option value="OTHER">Other clubs (not playing in the game)</option>
              </select></label>}
            {tab === 'search' && <label className="ti-field"><span>Status</span>
              <select className="input" value={f.status} onChange={(e) => set({ status: e.target.value as Filters['status'] })}><option value="any">Any</option><option value="listed">Transfer listed</option><option value="expiring">Contract ending</option></select></label>}
            <label className="ti-field"><span>Squad</span>
              <select className="input" value={f.squad} onChange={(e) => set({ squad: e.target.value as Filters['squad'] })}><option value="any">Any</option><option value="senior">First team</option><option value="youth">Youth</option></select></label>
            <label className="ti-field"><span>Foot</span>
              <select className="input" value={f.foot} onChange={(e) => set({ foot: e.target.value as Filters['foot'] })}><option value="any">Any</option><option value="L">Left</option><option value="R">Right</option><option value="B">Both</option></select></label>
            {/* CM-style: search on attributes ("Pace 15+, Finishing 14+") */}
            {f.att.map(([l, min], i) => (
              <label key={i} className="ti-field wide att-row"><span>Attribute {i + 1}</span>
                <div className="row" style={{ gap: 6 }}>
                  <select className="input" style={{ flex: 1 }} value={l} onChange={(e) => set({ att: f.att.map((x, j) => (j === i ? [e.target.value, e.target.value ? x[1] || 12 : 0] : x)) as Filters['att'], sort: e.target.value && f.sort !== 'attrs' && !chosenAttrs(f).length ? 'attrs' : f.sort })}>
                    <option value="">Any</option>
                    {SEARCH_ATTRS.map(([grp, ls]) => <optgroup key={grp} label={grp}>{ls.map((x) => <option key={x} value={x}>{x}</option>)}</optgroup>)}
                  </select>
                  <select className="input" style={{ width: 84 }} disabled={!l} value={min} onChange={(e) => set({ att: f.att.map((x, j) => (j === i ? [x[0], Number(e.target.value)] : x)) as Filters['att'] })}>
                    {range(5, 20).map((v) => <option key={v} value={v}>{v}+</option>)}
                  </select>
                </div>
              </label>
            ))}
            <label className="ti-field"><span>Sort by</span>
              <select className="input" value={f.sort} onChange={(e) => set({ sort: e.target.value as SortKey })}>{SORTS.filter(([k]) => !hideAbility || (k !== 'ability' && k !== 'potential')).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
            <button className="btn primary block wide-btn" onClick={() => setShowFilters(false)}>Show {results.length} players</button>
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
