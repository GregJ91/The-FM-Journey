// European competitions and the "Rest of Europe" guest clubs that take part in them.
// Guest clubs don't play in a domestic league in the game; their squads are generated
// (plus a few real players who joined them). Line format:
//   "Name|SHORT|primary|secondary|reputation|level|Stadium|capacity|crestPattern|COUNTRY"

export interface EuroCompDef {
  id: string;
  name: string;
  short: string;
  color: string;
  games: number; // league-phase matches per team
  weekday: number; // 2 = Tuesday, 4 = Thursday
  finalDate: string; // MM-DD in the second calendar year of the season
  /** Prize money (£) */
  prize: { entry: number; win: number; draw: number; ko: number[]; winner: number };
}

export const EURO_COMPS: EuroCompDef[] = [
  { id: 'UCL', name: 'Champions League', short: 'UCL', color: '#3D7BFF', games: 8, weekday: 2, finalDate: '05-29',
    prize: { entry: 16_000_000, win: 1_800_000, draw: 600_000, ko: [900_000, 9_500_000, 10_800_000, 13_000_000, 16_000_000], winner: 5_500_000 } },
  { id: 'UEL', name: 'Europa League', short: 'UEL', color: '#F26722', games: 8, weekday: 4, finalDate: '05-19',
    prize: { entry: 3_700_000, win: 390_000, draw: 130_000, ko: [250_000, 1_500_000, 2_100_000, 3_400_000, 5_400_000], winner: 3_500_000 } },
  { id: 'UECL', name: 'Conference League', short: 'UECL', color: '#1AAE5B', games: 6, weekday: 4, finalDate: '05-26',
    prize: { entry: 2_700_000, win: 340_000, draw: 110_000, ko: [170_000, 700_000, 1_100_000, 1_700_000, 2_800_000], winner: 1_700_000 } },
];

/** Places per country (top divisions) for future seasons. The domestic cup winner takes the first Europa League place. */
export const EURO_PLACES: Record<string, { UCL: number; UEL: number; UECL: number }> = {
  ENG: { UCL: 5, UEL: 2, UECL: 1 },
  ESP: { UCL: 5, UEL: 2, UECL: 1 },
  ITA: { UCL: 4, UEL: 3, UECL: 1 },
  GER: { UCL: 4, UEL: 2, UECL: 1 },
  FRA: { UCL: 3, UEL: 3, UECL: 1 },
};

export const EURO_GUEST_LEAGUE = 'EUR';

export const EURO_CLUBS: string[] = [
  // Portugal
  'Benfica|SLB|#E20E0E|#FFFFFF|83|76|Estádio da Luz|64642|plain|POR',
  'Porto|FCP|#003F87|#FFFFFF|82|76|Estádio do Dragão|50033|stripes|POR',
  'Sporting CP|SCP|#008057|#FFFFFF|82|76|Estádio José Alvalade|50095|hoops|POR',
  'Braga|SCB|#E20613|#FFFFFF|73|72|Estádio Municipal de Braga|30286|plain|POR',
  'Torreense|TOR|#E30613|#111111|50|64|Estádio Manuel Marques|2235|plain|POR',
  // Netherlands
  'PSV|PSV|#ED1C24|#FFFFFF|79|74|Philips Stadion|35000|stripes|NED',
  'Feyenoord|FEY|#E20613|#FFFFFF|78|74|De Kuip|47500|halves|NED',
  'Ajax|AJA|#D2122E|#FFFFFF|78|73|Johan Cruijff ArenA|55865|plain|NED',
  'AZ Alkmaar|AZ|#DB0021|#FFFFFF|71|71|AFAS Stadion|19478|plain|NED',
  'Twente|TWE|#E20613|#FFFFFF|66|69|De Grolsch Veste|30205|plain|NED',
  'N.E.C.|NEC|#E20613|#111111|61|67|Goffertstadion|12500|halves|NED',
  // Scotland
  'Celtic|CEL|#018749|#FFFFFF|74|70|Celtic Park|60411|hoops|SCO',
  'Hearts|HEA|#7A1F35|#FFFFFF|58|65|Tynecastle Park|19852|plain|SCO',
  // Belgium
  'Club Brugge|CLU|#0057B8|#111111|75|72|Jan Breydel Stadium|29042|stripes|BEL',
  'Union SG|USG|#FFDA00|#0D3B8C|68|69|Stade Joseph Marien|9400|plain|BEL',
  'Anderlecht|AND|#5E2D91|#FFFFFF|70|69|Lotto Park|22500|plain|BEL',
  'Gent|GNT|#0047AB|#FFFFFF|64|68|Planet Group Arena|20000|plain|BEL',
  'Sint-Truiden|STV|#FFD800|#0055A4|56|65|Stayen|14600|plain|BEL',
  // Turkey
  'Galatasaray|GAL|#A90432|#FDB912|80|75|Rams Park|52223|halves|TUR',
  'Fenerbahçe|FB|#163962|#FFED00|79|75|Şükrü Saracoğlu|47834|stripes|TUR',
  'Beşiktaş|BJK|#111111|#FFFFFF|74|72|Tüpraş Stadyumu|42590|stripes|TUR',
  'Trabzonspor|TS|#7A1F35|#4FB3E8|68|70|Papara Park|40782|stripes|TUR',
  // Ukraine / Austria / Switzerland
  'Shakhtar Donetsk|SHA|#F37021|#111111|72|70|Arena Lviv|34915|stripes|UKR',
  'Red Bull Salzburg|RBS|#E2001A|#FFFFFF|73|70|Red Bull Arena|30188|plain|AUT',
  'Sturm Graz|STU|#111111|#FFFFFF|65|67|Merkur Arena|16364|stripes|AUT',
  'LASK|LAS|#111111|#FFFFFF|62|66|Raiffeisen Arena|19080|stripes|AUT',
  'Lugano|LUG|#111111|#FFFFFF|60|66|Cornaredo|6330|plain|SUI',
  'Thun|THU|#E20613|#FFFFFF|54|64|Stockhorn Arena|10014|plain|SUI',
  // Czechia / Slovakia
  'Slavia Prague|SLA|#E20613|#FFFFFF|70|69|Fortuna Arena|19370|halves|CZE',
  'Sparta Praha|SPA|#8B1A1E|#FFFFFF|69|68|epet ARENA|18944|plain|CZE',
  'Viktoria Plzeň|PLZ|#E20613|#004C9E|64|67|Doosan Arena|11700|halves|CZE',
  'Jablonec|JAB|#00843D|#FFFFFF|55|64|Stadion Střelnice|6280|plain|CZE',
  'Slovan Bratislava|SLO|#5EB6E4|#FFFFFF|59|65|Tehelné pole|22500|plain|SVK',
  // Greece / Cyprus
  'Olympiacos|OLY|#E20613|#FFFFFF|74|71|Karaiskakis Stadium|32115|stripes|GRE',
  'Panathinaikos|PAO|#007A33|#FFFFFF|68|69|Apostolos Nikolaidis|16003|plain|GRE',
  'AEK Athens|AEK|#FFD200|#111111|67|68|OPAP Arena|32500|plain|GRE',
  'OFI Crete|OFI|#111111|#FFFFFF|52|63|Theodoros Vardinogiannis|9088|stripes|GRE',
  'Omonia|OMO|#00843D|#FFFFFF|56|64|GSP Stadium|22859|plain|CYP',
  'Pafos|PAF|#0047AB|#FFFFFF|57|65|Stelios Kyriakides|9394|plain|CYP',
  // Scandinavia
  'Copenhagen|FCK|#FFFFFF|#0E2C6F|68|68|Parken|38065|plain|DEN',
  'Midtjylland|FCM|#111111|#E20613|66|68|MCH Arena|11432|plain|DEN',
  'Nordsjælland|FCN|#E20613|#FFD200|58|65|Right to Dream Park|10100|plain|DEN',
  'Aarhus|AGF|#FFFFFF|#111111|57|64|Ceres Park|19433|plain|DEN',
  'Bodø/Glimt|BOD|#FFD800|#111111|70|69|Aspmyra Stadion|8270|plain|NOR',
  'Viking|VIK|#003D7C|#FFFFFF|58|65|SR-Bank Arena|15900|plain|NOR',
  'Brann|BRA|#E20613|#FFFFFF|60|65|Brann Stadion|16750|plain|NOR',
  'Lillestrøm|LSK|#FFD800|#111111|55|63|Åråsen Stadion|11500|plain|NOR',
  'Mjällby|MJA|#FFD800|#111111|52|63|Strandvallen|6750|plain|SWE',
  'KuPS|KUP|#FFD800|#111111|50|62|Väre Areena|4700|plain|FIN',
  // Central & Eastern Europe
  'Ferencváros|FTC|#00843D|#FFFFFF|64|67|Groupama Aréna|22000|stripes|HUN',
  'Dinamo Zagreb|DZG|#0047AB|#FFFFFF|67|68|Stadion Maksimir|24851|plain|CRO',
  'Hajduk Split|HAJ|#FFFFFF|#0047AB|60|65|Stadion Poljud|33987|plain|CRO',
  'Crvena Zvezda|CZV|#E20613|#FFFFFF|67|68|Rajko Mitić Stadium|51755|stripes|SRB',
  'Borac Banja Luka|BOR|#E20613|#0047AB|48|61|Banja Luka City Stadium|9730|plain|BIH',
  'Lech Poznań|LPO|#0047AB|#FFFFFF|61|66|Enea Stadion|42837|plain|POL',
  'Jagiellonia|JAG|#FFD800|#E20613|56|64|Chorten Arena|22432|stripes|POL',
  'Celje|CEJ|#0047AB|#FFD800|53|63|Stadion Z\'dežele|13059|plain|SVN',
  'Universitatea Craiova|UCV|#5EB6E4|#FFFFFF|56|64|Ion Oblemenco|30983|plain|ROU',
  'Levski Sofia|LEV|#0047AB|#FFFFFF|56|64|Georgi Asparuhov|25000|plain|BUL',
  'CSKA Sofia|CSK|#E20613|#FFFFFF|55|63|Balgarska Armia|22015|plain|BUL',
  'Hapoel Beer-Sheva|HBS|#E20613|#FFFFFF|56|64|Turner Stadium|16126|plain|ISR',
  // Caucasus, Baltics & beyond
  'Sabah|SAB|#0047AB|#FFFFFF|50|62|Bank Respublika Arena|8500|plain|AZE',
  'Ararat-Armenia|ARA|#FFD800|#0047AB|48|61|Republican Stadium|14403|plain|ARM',
  'Iberia 1999|IBE|#E20613|#111111|45|60|Boris Paichadze Dinamo Arena|54549|plain|GEO',
  'Kairat Almaty|KAI|#FFD800|#111111|50|62|Central Stadium|23804|plain|KAZ',
  'Riga|RIG|#0047AB|#FFFFFF|46|60|Skonto Stadium|8087|plain|LAT',
  'Kauno Žalgiris|KAU|#00843D|#FFFFFF|45|60|Darius and Girėnas Stadium|15315|plain|LTU',
  'Egnatia|EGN|#E20613|#111111|44|59|Egnatia Arena|4000|plain|ALB',
  'Lincoln Red Imps|LRI|#E20613|#FFFFFF|40|57|Europa Point Stadium|8000|plain|GIB',
  'Inter Escaldes|IES|#111111|#0047AB|38|56|Estadi Nacional|3306|stripes|AND',
];

/** Real players at guest clubs (summer 2026 moves out of the big five leagues; same format as REAL_PLAYERS). */
export const EURO_PLAYERS: Record<string, string[]> = {
  'Trabzonspor': ['Mohamed Salah|AMR|34|EGY|87'],
  'Beşiktaş': ['Ernest Poku|AMR|22|NED|74', 'Emmanuel Agbadou|DC|29|CIV|76', 'Dušan Vlahović|ST|26|SRB|81', 'Leandro Trossard|AML|31|BEL|80'],
  'Galatasaray': ['Rafael Leão|AML|27|POR|84', 'Lesley Ugochukwu|DM|22|FRA|73|79'],
  'Fenerbahçe': ['Mason Greenwood|AMR|24|ENG|83|85', 'Mattéo Guendouzi|MC|27|FRA|79', 'Romelu Lukaku|ST|33|BEL|79'],
  'Benfica': ['Jakub Kamiński|AMR|24|POL|73', 'João Palhinha|DM|30|POR|81'],
  'Ajax': ['Thilo Kehrer|DC|29|GER|77', 'Sofyan Amrabat|DM|29|MAR|78', 'Simon Adingra|AML|24|CIV|76', 'Marc-André ter Stegen|GK|34|GER|83', 'Tolu Arokodare|ST|25|NGA|74'],
  'Celtic': ['Sam Johnstone|GK|33|ENG|74'],
  'Panathinaikos': ['Stefan de Vrij|DC|34|NED|79'],
  'Olympiacos': [
    'Stefan Ortega|GK|33|GER|79',
  ],
  'Porto': [
    'Seko Fofana|MC|31|CIV|76',
    'Santiago Giménez|ST|25|MEX|79',
    'André Silva|ST|30|POR|73',
    'Borja Sainz|AML|24|ESP|71',
  ],
  'Red Bull Salzburg': [
    'Haris Tabaković|ST|32|BIH|73',
  ],
  'Club Brugge': [
    'Félix Lemaréchal|MC|23|FRA|73',
  ],
};

/**
 * 2026/27 league-phase line-ups (36 clubs each), from UEFA's published draw pots.
 * Names must match club names in the game.
 */
export const EURO_ENTRANTS_2026: Record<string, string[]> = {
  UCL: [
    'Paris Saint-Germain', 'Bayern Munich', 'Real Madrid', 'Liverpool', 'Inter', 'Manchester City', 'Arsenal', 'Barcelona', 'Atlético Madrid',
    'Borussia Dortmund', 'Roma', 'Sporting CP', 'Aston Villa', 'Porto', 'Manchester United', 'Club Brugge', 'Real Betis', 'PSV',
    'Feyenoord', 'Lille', 'Bodø/Glimt', 'Napoli', 'RB Leipzig', 'Villarreal', 'Fenerbahçe', 'Shakhtar Donetsk', 'Galatasaray',
    'Slavia Prague', 'Slovan Bratislava', 'VfB Stuttgart', 'AEK Athens', 'LASK', 'Como', 'Lens', 'Viking', 'Sabah',
  ],
  UEL: [
    'Bayer Leverkusen', 'Benfica', 'Juventus', 'AC Milan', 'Lyon', 'AZ Alkmaar', 'Olympiacos', 'Real Sociedad', 'Marseille',
    'Ferencváros', 'Viktoria Plzeň', 'Union SG', 'Dinamo Zagreb', 'Red Bull Salzburg', 'Celtic', 'Sparta Praha', 'Rennes', 'Anderlecht',
    'Sturm Graz', 'Lech Poznań', 'Crystal Palace', 'Bournemouth', 'Sunderland', 'Celje', 'Jagiellonia', 'Omonia', 'Celta Vigo',
    'Hoffenheim', 'Beşiktaş', 'Torreense', 'Hapoel Beer-Sheva', 'N.E.C.', 'OFI Crete', 'Lillestrøm', 'Levski Sofia', 'Ararat-Armenia',
  ],
  UECL: [
    'Atalanta', 'Braga', 'Ajax', 'Freiburg', 'Monaco', 'Copenhagen',
    'Midtjylland', 'Crvena Zvezda', 'Gent', 'Panathinaikos', 'Pafos', 'Brighton',
    'Lugano', 'Getafe', 'KuPS', 'Twente', 'Lincoln Red Imps', 'Borac Banja Luka',
    'Sint-Truiden', 'Brann', 'Hearts', 'Kairat Almaty', 'Trabzonspor', 'Universitatea Craiova',
    'Riga', 'Hajduk Split', 'Jablonec', 'Nordsjælland', 'Aarhus', 'Inter Escaldes',
    'Thun', 'CSKA Sofia', 'Kauno Žalgiris', 'Mjällby', 'Iberia 1999', 'Egnatia',
  ],
};
