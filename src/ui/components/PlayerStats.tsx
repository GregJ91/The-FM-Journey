import { avgRating } from '../../game/ratings';
import type { Player } from '../../game/types';

type Cell = [label: string, value: string | number, per90?: number | null];

function Grid({ title, cells }: { title: string; cells: Cell[] }) {
  return (
    <>
      <div className="section-label">{title}</div>
      <div className="statgrid">
        {cells.map(([k, v, p90]) => (
          <div key={k} className="stat">
            <div className="k">{k}</div>
            <div className="v">{v}</div>
            {p90 !== undefined && <div className="p90">{p90 === null ? '—' : `${p90.toFixed(p90 >= 10 ? 0 : 2)} /90`}</div>}
          </div>
        ))}
      </div>
    </>
  );
}

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—');

/** Season stats in detail, with per-90 figures. */
export function PlayerStats({ p }: { p: Player }) {
  const s = p.stats;
  if (!s.apps) return <div className="empty">No appearances yet this season.</div>;
  const n90 = s.mins / 90;
  const per = (v: number) => (n90 >= 1 ? v / n90 : null);
  const isGK = p.pos === 'GK';
  return (
    <div>
      <Grid title="Overview" cells={[
        ['Apps', s.apps], ['Minutes', s.mins], ['Avg rating', avgRating(p).toFixed(2)],
        ['Goals', s.goals, per(s.goals)], ['Assists', s.assists, per(s.assists)], ['MOTM', s.motm],
      ]} />
      {isGK ? (
        <Grid title="Goalkeeping" cells={[
          ['Saves', s.saves, per(s.saves)], ['Save %', pct(s.saves, s.saves + s.conceded)], ['Conceded', s.conceded, per(s.conceded)],
          ['Clean sheets', s.cleanSheets], ['Passes', s.passes, per(s.passes)], ['Pass %', pct(s.passC, s.passes)],
        ]} />
      ) : (
        <>
          <Grid title="Attacking" cells={[
            ['Shots', s.shots, per(s.shots)], ['On target', `${s.sot} (${pct(s.sot, s.shots)})`], ['xG', s.xg.toFixed(2), per(s.xg)],
            ['Goals − xG', (s.goals - s.xg >= 0 ? '+' : '') + (s.goals - s.xg).toFixed(1)], ['Conversion', pct(s.goals, s.shots)], ['Dribbles', `${s.drb}/${s.drbA}`, per(s.drb)],
          ]} />
          <Grid title="Creating & passing" cells={[
            ['Key passes', s.kp, per(s.kp)], ['xA', s.xa.toFixed(2), per(s.xa)], ['Assists − xA', (s.assists - s.xa >= 0 ? '+' : '') + (s.assists - s.xa).toFixed(1)],
            ['Passes', s.passes, per(s.passes)], ['Completed', s.passC, per(s.passC)], ['Pass %', pct(s.passC, s.passes)],
          ]} />
        </>
      )}
      <Grid title="Defending & discipline" cells={[
        ['Tackles', s.tkl, per(s.tkl)], ['Interceptions', s.int, per(s.int)], ['Clearances', s.clr, per(s.clr)],
        ['Fouls', s.fouls, per(s.fouls)], ['Yellows', s.yellows], ['Reds', s.reds],
      ]} />
    </div>
  );
}

/** One-line summary of a match stat line, e.g. "2 sh · 38/44 pass · 3 tkl". */
export function statSummary(l: { shots: number; passes: number; passC: number; tkl: number; int: number; kp: number; saves: number; drb: number }, gk: boolean) {
  const bits: string[] = [];
  if (gk) bits.push(`${l.saves} saves`);
  if (l.shots) bits.push(`${l.shots} sh`);
  if (l.kp) bits.push(`${l.kp} key pass${l.kp > 1 ? 'es' : ''}`);
  bits.push(`${Math.round(l.passC)}/${Math.round(l.passes)} pass`);
  if (l.drb) bits.push(`${l.drb} drb`);
  if (l.tkl + l.int) bits.push(`${l.tkl + l.int} tkl+int`);
  return bits.join(' · ');
}
