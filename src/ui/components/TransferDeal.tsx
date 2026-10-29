import { useState } from 'react';
import { fmtMoney, fullName } from '../../game/ratings';
import { ROLE_AS, ROLE_LABEL, cancelTransfer, confirmTransfer, dealDemand, expectedRole, offerContract, preferredYears } from '../../game/transfers';
import type { GameState, Offer, Player, SquadRole } from '../../game/types';
import { mutate } from '../../store';

/** CM-style contract offer: wage, length, squad status and signing-on fee. He answers the next day. */
export function ContractForm({ g, p, o, onResult }: { g: GameState; p: Player; o: Offer; onResult: (r: { ok: boolean; msg: string }) => void }) {
  const offerId = o.id;
  const user = g.clubs[g.userClubId];
  const demand = dealDemand(g, o, p);
  const want = expectedRole(g, p, user);
  const [wage, setWage] = useState(demand);
  const [years, setYears] = useState(preferredYears(g, p));
  const [role, setRole] = useState<SquadRole>(want);
  const [bonus, setBonus] = useState(0);
  const step = Math.max(500, Math.round(demand / 40 / 500) * 500);
  const bonusMax = Math.max(demand * 52, 50_000);
  return (
    <div className="ti contract-form">
      <div className="small">His agent asks for <b>{fmtMoney(demand)}/wk</b> as <b>{ROLE_AS[want]}</b>.</div>
      <label className="ti-field"><span>Wage per week · {fmtMoney(wage)}</span>
        <input type="range" min={Math.round(demand * 0.5)} max={Math.round(demand * 2)} step={step} value={wage} onChange={(e) => setWage(Number(e.target.value))} />
      </label>
      <div className="ti-grid">
        <label className="ti-field"><span>Contract length</span>
          <select className="input" value={years} onChange={(e) => setYears(Number(e.target.value))}>
            {[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>{y} year{y > 1 ? 's' : ''}</option>)}
          </select>
        </label>
        <label className="ti-field"><span>Squad status</span>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value as SquadRole)}>
            {(Object.keys(ROLE_LABEL) as SquadRole[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
        </label>
      </div>
      <label className="ti-field"><span>Signing-on fee · {bonus ? fmtMoney(bonus) : 'None'}</span>
        <input type="range" min={0} max={bonusMax} step={Math.max(1000, Math.round(bonusMax / 40))} value={bonus} onChange={(e) => setBonus(Number(e.target.value))} />
      </label>
      <button className="btn primary block" onClick={() => onResult(mutate((gg) => offerContract(gg, offerId, { wage, years, bonus, role })))}>Offer contract</button>
    </div>
  );
}

/**
 * The next step of one of your deals, CM 01/02-style: offer a contract once the fee is agreed, wait for his answer,
 * try again if he refuses, then confirm the transfer once he accepts. Shown in the inbox and on the player's Bid tab.
 */
export function DealStep({ g, o, inMail }: { g: GameState; o: Offer; inMail?: boolean }) {
  const [err, setErr] = useState('');
  const p = g.players[o.playerId];
  if (!p) return null;
  const c = o.contract;
  const done = (r: { ok: boolean; msg: string }) => setErr(r.ok ? '' : r.msg);
  let body: React.ReactNode = null;
  if (o.status === 'done') body = <div className="bid-status accepted"><b>{o.kind === 'renew' ? 'New contract signed' : o.kind === 'pre' ? 'Pre-contract agreed' : 'Transfer complete'}</b><span>{o.kind === 'renew' ? `${fullName(p)} has signed a new deal.` : o.kind === 'pre' ? `${fullName(p)} joins in the summer.` : `${fullName(p)} has joined.`}</span></div>;
  else if (o.status === 'withdrawn') body = <div className="bid-status collapsed"><b>Deal cancelled</b><span>You pulled out.</span></div>;
  else if (o.status === 'collapsed') body = <div className="bid-status collapsed"><b>{o.kind === 'renew' ? 'Talks broke down' : 'Deal collapsed'}</b><span>{o.kind === 'renew' ? `${fullName(p)} wouldn't agree a new deal.` : `The move for ${fullName(p)} fell through.`}</span></div>;
  else if (o.status === 'accepted' && c?.state === 'pending') {
    body = <div className="bid-status pending"><b>Contract offered</b><span>{fmtMoney(c.wage)}/wk · {c.years} yr · {ROLE_LABEL[c.role]}{c.bonus ? ` · ${fmtMoney(c.bonus)} signing-on` : ''}. Continue for his answer.</span></div>;
  } else if (o.status === 'accepted' && c?.state === 'agreed') {
    const what = o.kind === 'free' ? ['Confirm the signing to bring him in on a free.', 'Confirm signing'] : o.kind === 'pre' ? [`Confirm the pre-contract: he joins on a free when his contract at ${g.clubs[o.to]?.name} ends in the summer.`, 'Confirm pre-contract'] : [`Confirm the ${fmtMoney(o.fee)} transfer to sign ${fullName(p)}.`, 'Confirm transfer'];
    body = (
      <div className="bid-status accepted">
        <b>Terms agreed</b><span>{what[0]}</span>
        <button className="btn primary block" onClick={() => done(mutate((gg) => confirmTransfer(gg, o.id)))}>{what[1]}</button>
        <button className="btn block" onClick={() => done(mutate((gg) => cancelTransfer(gg, o.id)))}>Cancel deal</button>
      </div>
    );
  } else if (o.status === 'accepted') {
    body = (
      <>
        {/* The refusal mail already gives his reason */}
        {c?.state === 'rejected' && !inMail && <div className="bid-status rejected"><b>Contract rejected</b><span>{c.note} {3 - c.tries} more offer{3 - c.tries > 1 ? 's' : ''} before talks break down.</span></div>}
        <ContractForm g={g} p={p} o={o} onResult={done} />
      </>
    );
  }
  return (
    <div className="col deal-step">
      {body}
      {err && <div className="small" style={{ color: 'var(--bad)', fontWeight: 700 }}>⚠️ {err}</div>}
    </div>
  );
}
