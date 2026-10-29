// Youth competitions. Leagues follow the senior divisions; ages are the competition's age limit.

export interface YouthLeagueDef {
  id: string;
  name: string;
  short: string;
  league: string; // senior league whose clubs take part
  age: number;
  color: string;
}

export const YOUTH_LEAGUES: YouthLeagueDef[] = [
  { id: 'PL2', name: 'Premier League 2', short: 'PL2', league: 'ENG1', age: 21, color: '#7C4DFF' },
  { id: 'PDL', name: 'Professional Development League', short: 'PDL', league: 'ENG2', age: 21, color: '#00A3E0' },
  { id: 'EYA1', name: 'EFL Youth Alliance (League One)', short: 'EYA', league: 'ENG3', age: 18, color: '#E0457B' },
  { id: 'EYA2', name: 'EFL Youth Alliance (League Two)', short: 'EYA', league: 'ENG4', age: 18, color: '#E0457B' },
  { id: 'DHJ', name: 'División de Honor Juvenil', short: 'DHJ', league: 'ESP1', age: 19, color: '#FF4B44' },
  { id: 'PRI', name: 'Primavera 1', short: 'PRI', league: 'ITA1', age: 19, color: '#1EB980' },
  { id: 'DNL', name: 'U19 DFB-Nachwuchsliga', short: 'U19', league: 'GER1', age: 19, color: '#D4D4D8' },
  { id: 'N19', name: 'Championnat National U19', short: 'N19', league: 'FRA1', age: 19, color: '#3D7BFF' },
];

export const FA_YOUTH_CUP = { id: 'FAYC', name: 'FA Youth Cup', short: 'FAYC', age: 18, color: '#C8102E', leagues: ['ENG1', 'ENG2', 'ENG3', 'ENG4'] };
export const UEFA_YOUTH_LEAGUE = { id: 'UYL', name: 'UEFA Youth League', short: 'UYL', age: 19, color: '#3D7BFF' };

/** CM 01/02 careers: what the youth leagues were called in 2002 (the UEFA Youth League didn't exist until 2013). */
export const YOUTH_2002: Record<string, { name: string; short: string; age: number }> = {
  PL2: { name: 'FA Premier Academy League', short: 'FAPL', age: 19 },
  PDL: { name: 'Football League Youth Alliance (Division One)', short: 'FLYA', age: 19 },
  EYA1: { name: 'Football League Youth Alliance (Division Two)', short: 'FLYA', age: 19 },
  EYA2: { name: 'Football League Youth Alliance (Division Three)', short: 'FLYA', age: 19 },
  PRI: { name: 'Campionato Primavera', short: 'PRI', age: 20 },
  DNL: { name: 'A-Junioren Regionalliga', short: 'AJR', age: 19 },
  N19: { name: 'Championnat National des 18 ans', short: 'N18', age: 18 },
};
