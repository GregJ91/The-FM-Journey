// The money scale. Today's careers run at 2026 prices; CM 01/02 careers run at 2002 prices, calibrated on the
// CM 01/02 database: player values there are about 30-35% of the game's modern values, wages about 20%, and
// clubs had far less to spend than today.
//   fee():    player values and asking prices
//   budget(): club balances and transfer budgets
//   pay():    wages, and the income that pays them (tickets, TV, commercial, prize money) and running costs
import type { GameState } from './types';

export const CM_ECONOMY = { fee: 0.3, budget: 0.15, pay: 0.2 };
const TODAY = { fee: 1, budget: 1, pay: 1 };
const scale = { ...TODAY };

export function setEconomy(g: Pick<GameState, 'era'> | null) {
  Object.assign(scale, g?.era === 'cm0102' ? CM_ECONOMY : TODAY);
}

/** Player values: at 2002 prices the top of the market was much flatter (the world record was £46m), so values
 * above £20m grow at half the rate and above £30m at a quarter. */
export function fee(v: number) {
  const x = v * scale.fee;
  if (scale.fee >= 1 || x <= 20_000_000) return x;
  if (x <= 40_000_000) return 20_000_000 + (x - 20_000_000) * 0.5;
  return 30_000_000 + (x - 40_000_000) * 0.25;
}
export const budget = (v: number) => v * scale.budget;
export const pay = (v: number) => v * scale.pay;
