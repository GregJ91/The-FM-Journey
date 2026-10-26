import type { Pos } from './types';

export interface Slot {
  pos: Pos;
  x: number; // 0 = own goal line, 100 = opponent goal line
  y: number; // 0 = left touchline, 100 = right touchline
}

const GK: Slot = { pos: 'GK', x: 5, y: 50 };
const back4: Slot[] = [
  { pos: 'DL', x: 25, y: 12 },
  { pos: 'DC', x: 21, y: 37 },
  { pos: 'DC', x: 21, y: 63 },
  { pos: 'DR', x: 25, y: 88 },
];

export const FORMATIONS: Record<string, Slot[]> = {
  '4-4-2': [
    GK, ...back4,
    { pos: 'ML', x: 52, y: 12 },
    { pos: 'MC', x: 47, y: 37 },
    { pos: 'MC', x: 47, y: 63 },
    { pos: 'MR', x: 52, y: 88 },
    { pos: 'ST', x: 78, y: 38 },
    { pos: 'ST', x: 78, y: 62 },
  ],
  '4-3-3': [
    GK, ...back4,
    { pos: 'DM', x: 38, y: 50 },
    { pos: 'MC', x: 52, y: 30 },
    { pos: 'MC', x: 52, y: 70 },
    { pos: 'AML', x: 75, y: 15 },
    { pos: 'ST', x: 83, y: 50 },
    { pos: 'AMR', x: 75, y: 85 },
  ],
  '4-2-3-1': [
    GK, ...back4,
    { pos: 'DM', x: 40, y: 37 },
    { pos: 'DM', x: 40, y: 63 },
    { pos: 'AML', x: 66, y: 15 },
    { pos: 'AMC', x: 64, y: 50 },
    { pos: 'AMR', x: 66, y: 85 },
    { pos: 'ST', x: 84, y: 50 },
  ],
  '4-1-4-1': [
    GK, ...back4,
    { pos: 'DM', x: 37, y: 50 },
    { pos: 'ML', x: 58, y: 12 },
    { pos: 'MC', x: 54, y: 37 },
    { pos: 'MC', x: 54, y: 63 },
    { pos: 'MR', x: 58, y: 88 },
    { pos: 'ST', x: 84, y: 50 },
  ],
  '3-5-2': [
    GK,
    { pos: 'DC', x: 21, y: 25 },
    { pos: 'DC', x: 19, y: 50 },
    { pos: 'DC', x: 21, y: 75 },
    { pos: 'ML', x: 50, y: 8 },
    { pos: 'DM', x: 40, y: 50 },
    { pos: 'MC', x: 53, y: 32 },
    { pos: 'MC', x: 53, y: 68 },
    { pos: 'MR', x: 50, y: 92 },
    { pos: 'ST', x: 80, y: 38 },
    { pos: 'ST', x: 80, y: 62 },
  ],
  '3-4-3': [
    GK,
    { pos: 'DC', x: 21, y: 25 },
    { pos: 'DC', x: 19, y: 50 },
    { pos: 'DC', x: 21, y: 75 },
    { pos: 'ML', x: 50, y: 10 },
    { pos: 'MC', x: 47, y: 37 },
    { pos: 'MC', x: 47, y: 63 },
    { pos: 'MR', x: 50, y: 90 },
    { pos: 'AML', x: 76, y: 18 },
    { pos: 'ST', x: 84, y: 50 },
    { pos: 'AMR', x: 76, y: 82 },
  ],
  '5-3-2': [
    GK,
    { pos: 'DL', x: 30, y: 8 },
    { pos: 'DC', x: 21, y: 28 },
    { pos: 'DC', x: 19, y: 50 },
    { pos: 'DC', x: 21, y: 72 },
    { pos: 'DR', x: 30, y: 92 },
    { pos: 'MC', x: 48, y: 28 },
    { pos: 'MC', x: 45, y: 50 },
    { pos: 'MC', x: 48, y: 72 },
    { pos: 'ST', x: 78, y: 38 },
    { pos: 'ST', x: 78, y: 62 },
  ],
};

export const FORMATION_NAMES = Object.keys(FORMATIONS);

export const MENTALITY = ['Very Defensive', 'Defensive', 'Balanced', 'Attacking', 'Very Attacking'];
export const PRESSING = ['Low Block', 'Mid Press', 'High Press'];
export const STYLES = { short: 'Short Passing', mixed: 'Mixed', direct: 'Direct' } as const;
