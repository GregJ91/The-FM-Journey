import { describe, expect, it } from 'vitest';
import { matchFile } from '../src/ui/badges';
import { LEAGUE_DEFS } from '../src/game/data/leagues';

const clubs = LEAGUE_DEFS.flatMap((l) => l.clubs.map((line) => { const [name, short] = line.split('|'); return { name, short }; }));
const m = (f: string) => matchFile(f, clubs)?.name ?? null;

describe('badge file matching', () => {
  it('matches common logo-pack file names', () => {
    expect(m('Arsenal.png')).toBe('Arsenal');
    expect(m('manchester-united.png')).toBe('Manchester United');
    expect(m('Man Utd.png')).toBe('Manchester United');
    expect(m('Manchester City FC.svg')).toBe('Manchester City');
    expect(m('atletico_madrid.png')).toBe('Atlético Madrid');
    expect(m('Bayern München.png')).toBe('Bayern Munich');
    expect(m('FC Barcelona.png')).toBe('Barcelona');
    expect(m('PSG.png')).toBe('Paris Saint-Germain');
    expect(m('borussia-monchengladbach.png')).toBe('Borussia Mönchengladbach');
    expect(m('Wolverhampton Wanderers.png')).toBe('Wolves');
    expect(m('AFC Wimbledon.png')).toBe('AFC Wimbledon');
    expect(m('random-image.png')).toBe(null);
  });
});
