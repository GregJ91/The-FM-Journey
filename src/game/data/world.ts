// Club World Cup clubs from outside Europe, national teams and international tournaments.

export const WORLD_GUEST_LEAGUE = 'WLD';

/** Same line format as EURO_CLUBS: "Name|SHORT|primary|secondary|reputation|level|Stadium|capacity|crestPattern|COUNTRY" */
export const WORLD_CLUBS: string[] = [
  // CONMEBOL
  'Flamengo|FLA|#E20613|#111111|77|72|Maracanã|78838|hoops|BRA',
  'Palmeiras|PAL|#006437|#FFFFFF|76|72|Allianz Parque|43713|plain|BRA',
  'Botafogo|BOT|#111111|#FFFFFF|71|70|Estádio Nilton Santos|44661|stripes|BRA',
  'Fluminense|FLU|#7A1F35|#00843D|70|69|Maracanã|78838|stripes|BRA',
  'São Paulo|SAO|#FFFFFF|#E20613|68|68|MorumBIS|66795|hoops|BRA',
  'Atlético Mineiro|CAM|#111111|#FFFFFF|68|68|Arena MRV|46000|stripes|BRA',
  'River Plate|RIV|#FFFFFF|#E20613|74|71|Estadio Monumental|85018|sash|ARG',
  'Boca Juniors|BOC|#0047AB|#FFD200|73|70|La Bombonera|57200|hoops|ARG',
  'Racing Club|RAC|#5EB6E4|#FFFFFF|66|67|El Cilindro|51389|stripes|ARG',
  'Estudiantes|EST|#E20613|#FFFFFF|64|66|Estadio UNO|30018|stripes|ARG',
  'Peñarol|PEN|#FFD200|#111111|62|65|Campeón del Siglo|40000|stripes|URU',
  'Nacional|NAC|#FFFFFF|#0047AB|61|64|Gran Parque Central|34000|plain|URU',
  // AFC
  'Al Hilal|HIL|#0047AB|#FFFFFF|75|72|Kingdom Arena|26000|plain|KSA',
  'Al Nassr|NAS|#FFD200|#0047AB|73|71|Al-Awwal Park|26000|plain|KSA',
  'Al Ahli|AHL|#00843D|#FFFFFF|72|71|King Abdullah Sports City|62345|plain|KSA',
  'Al Ittihad|ITT|#FFD200|#111111|70|70|King Abdullah Sports City|62345|stripes|KSA',
  'Urawa Red Diamonds|URA|#E20613|#111111|62|66|Saitama Stadium|63700|plain|JPN',
  'Vissel Kobe|VIS|#7A1F35|#FFFFFF|63|66|Noevir Stadium|30132|plain|JPN',
  'Ulsan HD|ULS|#0047AB|#FFD200|62|66|Munsu Football Stadium|37897|plain|KOR',
  'Al Ain|AIN|#5E2D91|#FFFFFF|61|65|Hazza bin Zayed Stadium|25053|plain|UAE',
  // CAF
  'Al Ahly|AHY|#E20613|#FFFFFF|67|67|Cairo International Stadium|75000|plain|EGY',
  'Pyramids|PYR|#0D3B8C|#FFFFFF|62|65|30 June Stadium|30000|plain|EGY',
  'Mamelodi Sundowns|SUN|#FFD200|#00843D|64|66|Loftus Versfeld|51762|plain|RSA',
  'Espérance de Tunis|EST|#E20613|#FFD200|62|65|Stade Hammadi Agrebi|60000|stripes|TUN',
  'Wydad AC|WAC|#E20613|#FFFFFF|61|65|Stade Mohammed V|45891|plain|MAR',
  'RS Berkane|RSB|#F37021|#111111|59|64|Stade Municipal de Berkane|15000|plain|MAR',
  // CONCACAF
  'Inter Miami|MIA|#F7B5CD|#111111|68|68|Miami Freedom Park|25000|plain|USA',
  'Los Angeles FC|LAF|#111111|#C39E6D|65|67|BMO Stadium|22000|plain|USA',
  'Seattle Sounders|SEA|#5D9741|#005595|61|65|Lumen Field|37722|plain|USA',
  'Club América|AME|#FFD200|#0D3B8C|67|67|Estadio Ciudad de los Deportes|33000|plain|MEX',
  'Monterrey|MTY|#0D3B8C|#FFFFFF|66|67|Estadio BBVA|53500|stripes|MEX',
  'Cruz Azul|CAZ|#0047AB|#FFFFFF|65|66|Estadio Olímpico Universitario|58445|plain|MEX',
  'Toluca|TOL|#E20613|#FFFFFF|63|66|Estadio Nemesio Díez|30000|plain|MEX',
  'Pachuca|PAC|#0D3B8C|#FFFFFF|62|65|Estadio Hidalgo|27512|stripes|MEX',
  // OFC
  'Auckland City|AKL|#0047AB|#FFFFFF|40|55|Kiwitea Street|3500|plain|NZL',
];

/** Well-known players at these clubs (as of 2025/26; some may have moved since). */
export const WORLD_PLAYERS: Record<string, string[]> = {
  'Al Hilal': ['Ollie Watkins|ST|30|ENG|82', 'Gabriel Martinelli|AML|25|BRA|81', 'Crysencio Summerville|AML|24|NED|76', 'Theo Hernández|DL|28|FRA|82||p', 'Darwin Núñez|ST|27|URU|79||p', 'Rúben Neves|DM|29|POR|80'],
  'Al Nassr': ['Cristiano Ronaldo|ST|41|POR|80||f', 'João Félix|AMC|26|POR|79', 'Kingsley Coman|AMR|30|FRA|79||p', 'Sadio Mané|AML|34|SEN|76'],
  'Al Ahli': ['Riyad Mahrez|AMR|35|ALG|77', 'Ivan Toney|ST|30|ENG|80||f', 'Édouard Mendy|GK|34|SEN|77'],
  'Inter Miami': ['Lionel Messi|AMR|39|ARG|84||v', 'Rodrigo De Paul|MC|32|ARG|79'],
  'Los Angeles FC': ['Son Heung-min|AML|34|KOR|79'],
  'Flamengo': ['Jorginho|DM|34|ITA|77||v', 'Giorgian de Arrascaeta|AMC|32|URU|78', 'Pedro|ST|29|BRA|77'],
  'Palmeiras': ['Vitor Roque|ST|21|BRA|77|84'],
  'Boca Juniors': ['Leandro Paredes|MC|32|ARG|77'],
};

/** Club World Cup places outside UEFA (UEFA has 12). One extra non-UEFA club is the host's. */
export const CWC_PLACES: Record<string, number> = { CONMEBOL: 6, AFC: 4, CAF: 4, CONCACAF: 4, OFC: 1 };

// ---------- National teams ----------

/** "CODE|Name|Confederation|level" — level is the strength used for squad places the game has no real players for. */
const NATION_LINES = [
  // UEFA
  'ENG|England|UEFA|84', 'FRA|France|UEFA|86', 'ESP|Spain|UEFA|86', 'GER|Germany|UEFA|82', 'POR|Portugal|UEFA|84', 'NED|Netherlands|UEFA|82',
  'BEL|Belgium|UEFA|79', 'ITA|Italy|UEFA|81', 'CRO|Croatia|UEFA|79', 'DEN|Denmark|UEFA|77', 'SUI|Switzerland|UEFA|77', 'AUT|Austria|UEFA|77',
  'NOR|Norway|UEFA|78', 'SWE|Sweden|UEFA|75', 'POL|Poland|UEFA|75', 'SRB|Serbia|UEFA|75', 'TUR|Turkey|UEFA|78', 'UKR|Ukraine|UEFA|75',
  'CZE|Czechia|UEFA|74', 'SCO|Scotland|UEFA|73', 'WAL|Wales|UEFA|71', 'IRL|Ireland|UEFA|71', 'NIR|Northern Ireland|UEFA|68', 'HUN|Hungary|UEFA|74',
  'SVK|Slovakia|UEFA|72', 'SVN|Slovenia|UEFA|71', 'GRE|Greece|UEFA|74', 'ROU|Romania|UEFA|72', 'ALB|Albania|UEFA|70', 'GEO|Georgia|UEFA|73',
  'BIH|Bosnia|UEFA|70', 'MNE|Montenegro|UEFA|68', 'MKD|North Macedonia|UEFA|67', 'ISL|Iceland|UEFA|68', 'FIN|Finland|UEFA|68', 'KOS|Kosovo|UEFA|68',
  'ISR|Israel|UEFA|68', 'BUL|Bulgaria|UEFA|66', 'LUX|Luxembourg|UEFA|64', 'ARM|Armenia|UEFA|64', 'AZE|Azerbaijan|UEFA|63', 'KAZ|Kazakhstan|UEFA|63',
  'CYP|Cyprus|UEFA|62', 'LAT|Latvia|UEFA|60', 'LTU|Lithuania|UEFA|60', 'EST|Estonia|UEFA|60',
  // CONMEBOL
  'ARG|Argentina|CONMEBOL|86', 'BRA|Brazil|CONMEBOL|85', 'URU|Uruguay|CONMEBOL|80', 'COL|Colombia|CONMEBOL|80', 'ECU|Ecuador|CONMEBOL|78',
  'PAR|Paraguay|CONMEBOL|76', 'CHI|Chile|CONMEBOL|72', 'PER|Peru|CONMEBOL|72', 'VEN|Venezuela|CONMEBOL|72', 'BOL|Bolivia|CONMEBOL|65',
  // CONCACAF
  'USA|USA|CONCACAF|77', 'MEX|Mexico|CONCACAF|77', 'CAN|Canada|CONCACAF|75', 'PAN|Panama|CONCACAF|71', 'CRC|Costa Rica|CONCACAF|69',
  'JAM|Jamaica|CONCACAF|68', 'HON|Honduras|CONCACAF|67', 'HAI|Haiti|CONCACAF|64', 'CUW|Curaçao|CONCACAF|64', 'SLV|El Salvador|CONCACAF|63',
  'GUA|Guatemala|CONCACAF|62', 'TRI|Trinidad & Tobago|CONCACAF|62',
  // CAF
  'MAR|Morocco|CAF|81', 'SEN|Senegal|CAF|79', 'EGY|Egypt|CAF|76', 'CIV|Ivory Coast|CAF|77', 'NGA|Nigeria|CAF|77', 'ALG|Algeria|CAF|76',
  'TUN|Tunisia|CAF|74', 'CMR|Cameroon|CAF|75', 'MLI|Mali|CAF|75', 'GHA|Ghana|CAF|74', 'RSA|South Africa|CAF|72', 'COD|DR Congo|CAF|74',
  'BFA|Burkina Faso|CAF|72', 'CPV|Cape Verde|CAF|71', 'GUI|Guinea|CAF|71', 'GAB|Gabon|CAF|69', 'ZAM|Zambia|CAF|67', 'ANG|Angola|CAF|68',
  'EQG|Equatorial Guinea|CAF|66', 'UGA|Uganda|CAF|65', 'BEN|Benin|CAF|67', 'MOZ|Mozambique|CAF|64', 'KEN|Kenya|CAF|63', 'TAN|Tanzania|CAF|63',
  'MTN|Mauritania|CAF|64', 'NAM|Namibia|CAF|62', 'SUD|Sudan|CAF|62', 'ZIM|Zimbabwe|CAF|63', 'TOG|Togo|CAF|64', 'GAM|Gambia|CAF|66',
  'MAD|Madagascar|CAF|63', 'COM|Comoros|CAF|62',
  // AFC
  'JPN|Japan|AFC|80', 'KOR|South Korea|AFC|78', 'IRN|Iran|AFC|76', 'AUS|Australia|AFC|75', 'KSA|Saudi Arabia|AFC|72', 'QAT|Qatar|AFC|70',
  'UZB|Uzbekistan|AFC|72', 'IRQ|Iraq|AFC|70', 'UAE|UAE|AFC|69', 'JOR|Jordan|AFC|69', 'OMA|Oman|AFC|66', 'BHR|Bahrain|AFC|64',
  'CHN|China|AFC|66', 'SYR|Syria|AFC|65', 'PLE|Palestine|AFC|64', 'KUW|Kuwait|AFC|62', 'LBN|Lebanon|AFC|62', 'VIE|Vietnam|AFC|62',
  'THA|Thailand|AFC|63', 'IDN|Indonesia|AFC|63', 'TJK|Tajikistan|AFC|63', 'KGZ|Kyrgyzstan|AFC|61', 'PRK|North Korea|AFC|62', 'IND|India|AFC|60',
  'MAS|Malaysia|AFC|61', 'HKG|Hong Kong|AFC|58',
  // OFC
  'NZL|New Zealand|OFC|68',
];

export interface NationDef { code: string; name: string; conf: string; level: number }

export const NATION_DEFS: Record<string, NationDef> = Object.fromEntries(NATION_LINES.map((l) => {
  const [code, name, conf, level] = l.split('|');
  return [code, { code, name, conf, level: Number(level) }];
}));

export interface IntlCompDef {
  id: string;
  name: string;
  short: string;
  color: string;
  teams: 16 | 24 | 48;
  /** Places per confederation (best teams by strength qualify; hosts always do) */
  quotas: Record<string, number>;
  /** Years it's held: first year and the gap between editions */
  first: number;
  every: number;
  start: string; // MM-DD
  hosts: Record<number, string[]>;
  startByYear?: Record<number, string>;
}

/**
 * International tournaments. Dates and hosts follow the announced schedule where known;
 * later editions repeat the cycle with a host picked from the strongest nations.
 */
export const INTL_COMPS: IntlCompDef[] = [
  { id: 'WC', name: 'World Cup', short: 'WC', color: '#B8860B', teams: 48, first: 2030, every: 4, start: '06-08',
    quotas: { UEFA: 16, CAF: 10, AFC: 8, CONMEBOL: 6, CONCACAF: 7, OFC: 1 },
    hosts: { 2030: ['ESP', 'POR', 'MAR'], 2034: ['KSA'] }, startByYear: { 2034: '11-17' } },
  { id: 'EURO', name: 'European Championship', short: 'EURO', color: '#1E4FD8', teams: 24, first: 2028, every: 4, start: '06-09',
    quotas: { UEFA: 24 }, hosts: { 2028: ['ENG', 'SCO', 'WAL', 'IRL'], 2032: ['ITA', 'TUR'] } },
  { id: 'COPA', name: 'Copa América', short: 'COPA', color: '#0E7C3A', teams: 16, first: 2028, every: 4, start: '06-14',
    quotas: { CONMEBOL: 10, CONCACAF: 6 }, hosts: {} },
  { id: 'AFCON', name: 'Africa Cup of Nations', short: 'AFCON', color: '#D97706', teams: 24, first: 2027, every: 2, start: '06-19',
    quotas: { CAF: 24 }, hosts: { 2027: ['KEN', 'UGA', 'TAN'] } },
  { id: 'ASIAN', name: 'Asian Cup', short: 'AFC', color: '#7C3AED', teams: 24, first: 2027, every: 4, start: '01-07',
    quotas: { AFC: 24 }, hosts: { 2027: ['KSA'] } },
];
