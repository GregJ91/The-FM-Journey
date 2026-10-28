// World data: 2026/27 league line-ups and squads as of 15 October 2026 (after the summer window).
// Researched from web reports; some moves may be wrong or missing — edit freely.
//
// Club line:   "Name|SHORT|primary|secondary|reputation|level|Stadium|capacity|crestPattern"
//   reputation 1-100 drives finances, transfers and board expectations.
//   level is the target overall of the club's generated depth players.
// Player line: "Name|POS|age|NAT|overall[|potential][|style]"
//   age is as of 1 July 2026. potential is optional (derived from age if missing).
//   style letters tweak attributes: p=pace s=strength t=technique v=vision f=finishing w=work rate h=heading c=crossing

export interface LeagueDef {
  id: string;
  name: string;
  short: string;
  country: string;
  tier: number;
  up: number;
  down: number;
  color: string;
  level: number; // default level for generated players
  clubs: string[];
}

export const LEAGUE_DEFS: LeagueDef[] = [
  {
    id: 'ENG1', name: 'Premier League', short: 'PL', country: 'ENG', tier: 1, up: 0, down: 3, color: '#5B2BE0', level: 75,
    clubs: [
      'Arsenal|ARS|#EF0107|#FFFFFF|92|80|Emirates Stadium|60704|plain',
      'Aston Villa|AVL|#670E36|#95BFE5|80|76|Villa Park|42657|halves',
      'Bournemouth|BOU|#DA291C|#111111|70|73|Vitality Stadium|11307|stripes',
      'Brentford|BRE|#E30613|#FFFFFF|70|73|Gtech Community Stadium|17250|stripes',
      'Brighton|BHA|#0057B8|#FFFFFF|74|74|Amex Stadium|31876|stripes',
      'Chelsea|CHE|#034694|#FFFFFF|90|79|Stamford Bridge|40343|plain',
      'Coventry City|COV|#59CBE8|#FFFFFF|65|72|Coventry Building Society Arena|32609|stripes',
      'Crystal Palace|CRY|#1B458F|#C4122E|72|74|Selhurst Park|25486|stripes',
      'Everton|EVE|#003399|#FFFFFF|75|73|Hill Dickinson Stadium|52888|plain',
      'Fulham|FUL|#FFFFFF|#111111|70|73|Craven Cottage|28800|sash',
      'Hull City|HUL|#F5A12D|#111111|61|72|MKM Stadium|25586|stripes',
      'Ipswich Town|IPS|#3A64A3|#FFFFFF|69|73|Portman Road|30311|plain',
      'Leeds United|LEE|#FFFFFF|#1D428A|70|71|Elland Road|37645|chevron',
      'Liverpool|LIV|#C8102E|#F6EB61|94|80|Anfield|61276|plain',
      'Manchester City|MCI|#6CABDD|#1C2C5B|95|80|Etihad Stadium|53400|plain',
      'Manchester United|MUN|#DA291C|#FBE122|90|77|Old Trafford|74310|plain',
      'Newcastle United|NEW|#241F20|#FFFFFF|82|76|St James\' Park|52305|stripes',
      'Nottingham Forest|NFO|#DD0000|#FFFFFF|72|74|City Ground|30404|plain',
      'Sunderland|SUN|#EB172B|#FFFFFF|64|70|Stadium of Light|49000|stripes',
      'Tottenham Hotspur|TOT|#FFFFFF|#132257|86|77|Tottenham Hotspur Stadium|62850|plain',
    ],
  },
  {
    id: 'ENG2', name: 'Championship', short: 'CH', country: 'ENG', tier: 2, up: 3, down: 3, color: '#00A3E0', level: 66,
    clubs: [
      'Birmingham City|BIR|#0000FF|#FFFFFF|60|67|St Andrew\'s|29409|plain',
      'Blackburn Rovers|BLB|#009EE0|#FFFFFF|58|65|Ewood Park|31367|halves',
      'Bolton Wanderers|BOL|#FFFFFF|#263C7E|55|65|Toughsheet Community Stadium|28723|plain',
      'Bristol City|BRC|#E21B23|#FFFFFF|56|66|Ashton Gate|27000|plain',
      'Burnley|BUR|#6C1D45|#99D6EA|59|67|Turf Moor|21944|chevron',
      'Cardiff City|CAR|#0070B5|#FFFFFF|57|65|Cardiff City Stadium|33280|plain',
      'Charlton Athletic|CHA|#D4021D|#FFFFFF|52|63|The Valley|27111|plain',
      'Derby County|DER|#FFFFFF|#111111|58|64|Pride Park|32956|plain',
      'Lincoln City|LIN|#E2001A|#FFFFFF|47|64|LNER Stadium|10780|stripes',
      'Middlesbrough|MID|#E11B22|#FFFFFF|60|67|Riverside Stadium|34742|chevron',
      'Millwall|MIL|#001D5E|#FFFFFF|55|65|The Den|20146|plain',
      'Norwich City|NOR|#FFF200|#00A650|60|66|Carrow Road|27359|halves',
      'Portsmouth|POR|#001489|#FFFFFF|54|63|Fratton Park|20899|plain',
      'Preston North End|PNE|#FFFFFF|#00205B|54|64|Deepdale|23404|plain',
      'Queens Park Rangers|QPR|#1D5BA4|#FFFFFF|55|64|Loftus Road|18439|hoops',
      'Sheffield United|SHU|#EE2737|#FFFFFF|62|66|Bramall Lane|32050|stripes',
      'Southampton|SOU|#D71920|#FFFFFF|66|68|St Mary\'s Stadium|32384|stripes',
      'Stoke City|STK|#E03A3E|#FFFFFF|56|65|bet365 Stadium|30089|stripes',
      'Swansea City|SWA|#FFFFFF|#111111|56|65|Swansea.com Stadium|21088|plain',
      'Watford|WAT|#FBEE23|#ED2127|58|65|Vicarage Road|22200|chevron',
      'West Bromwich Albion|WBA|#122F67|#FFFFFF|60|66|The Hawthorns|26850|stripes',
      'West Ham United|WHU|#7A263A|#1BB1E7|69|68|London Stadium|62500|halves',
      'Wolves|WOL|#FDB913|#231F20|63|68|Molineux|31750|plain',
      'Wrexham|WRX|#D71920|#FFFFFF|58|66|SToK Cae Ras|12600|plain',
    ],
  },
  {
    id: 'ENG3', name: 'League One', short: 'L1', country: 'ENG', tier: 3, up: 3, down: 4, color: '#E5004A', level: 60,
    clubs: [
      'AFC Wimbledon|WIM|#1E3C8C|#FFF200|42|58|Plough Lane|9215|plain',
      'Barnsley|BAR|#D71920|#FFFFFF|46|60|Oakwell|23287|plain',
      'Blackpool|BLA|#F68712|#FFFFFF|46|60|Bloomfield Road|16616|plain',
      'Bradford City|BRA|#7A1E3A|#FDB913|44|59|Valley Parade|25136|stripes',
      'Bromley|BRO|#FFFFFF|#111111|35|58|Hayes Lane|5150|plain',
      'Burton Albion|BUT|#FDB913|#111111|38|57|Pirelli Stadium|6912|plain',
      'Cambridge United|CAM|#F5A623|#111111|41|58|Abbey Stadium|8127|stripes',
      'Doncaster Rovers|DON|#E2001A|#FFFFFF|42|59|Eco-Power Stadium|15231|hoops',
      'Huddersfield Town|HUD|#0E63AD|#FFFFFF|50|62|John Smith\'s Stadium|24121|stripes',
      'Leicester City|LEI|#003090|#FDBE11|63|63|King Power Stadium|32261|plain',
      'Leyton Orient|LEY|#E2001A|#FFFFFF|42|59|Brisbane Road|9271|plain',
      'Luton Town|LUT|#F78F1E|#002D62|54|62|Kenilworth Road|12000|plain',
      'Mansfield Town|MAN|#F5A623|#1D3E8C|40|58|One Call Stadium|9186|plain',
      'MK Dons|MKD|#FFFFFF|#111111|43|59|Stadium MK|30500|plain',
      'Notts County|NCO|#111111|#FFFFFF|43|59|Meadow Lane|19841|stripes',
      'Oxford United|OXF|#FFD700|#002147|45|61|Kassam Stadium|12500|plain',
      'Peterborough United|PET|#005DAA|#FFFFFF|44|59|Weston Homes Stadium|15314|plain',
      'Plymouth Argyle|PLY|#003C2E|#FFFFFF|48|61|Home Park|17900|plain',
      'Reading|REA|#004494|#FFFFFF|46|60|Select Car Leasing Stadium|24161|hoops',
      'Sheffield Wednesday|SHW|#4A90D9|#FFFFFF|47|61|Hillsborough|39732|stripes',
      'Stevenage|STE|#E2001A|#FFFFFF|36|57|Lamex Stadium|7800|plain',
      'Stockport County|STO|#004B9F|#FFFFFF|44|60|Edgeley Park|10841|plain',
      'Wigan Athletic|WIG|#1D59AF|#FFFFFF|46|60|Brick Community Stadium|25138|stripes',
      'Wycombe Wanderers|WYC|#6CABDD|#002A5C|40|58|Adams Park|9448|halves',
    ],
  },
  {
    id: 'ENG4', name: 'League Two', short: 'L2', country: 'ENG', tier: 4, up: 3, down: 2, color: '#00B67A', level: 55,
    clubs: [
      'Accrington Stanley|ACC|#E2001A|#FFFFFF|30|53|Wham Stadium|5450|plain',
      'Barnet|BNT|#F68712|#111111|30|54|The Hive|6500|plain',
      'Bristol Rovers|BRR|#1D3E8C|#FFFFFF|40|56|Memorial Stadium|9832|halves',
      'Cheltenham Town|CHL|#E2001A|#FFFFFF|32|53|Whaddon Road|7066|plain',
      'Chesterfield|CHF|#0E63AD|#FFFFFF|36|55|SMH Group Stadium|10504|plain',
      'Colchester United|COL|#0E63AD|#FFFFFF|34|54|JobServe Community Stadium|10105|stripes',
      'Crawley Town|CRA|#E2001A|#FFFFFF|32|54|Broadfield Stadium|6134|plain',
      'Crewe Alexandra|CRE|#E2001A|#FFFFFF|34|54|Mornflake Stadium|10153|plain',
      'Exeter City|EXE|#E2001A|#FFFFFF|35|56|St James Park|8714|stripes',
      'Fleetwood Town|FLE|#E2001A|#FFFFFF|32|54|Highbury Stadium|5327|halves',
      'Gillingham|GIL|#0E3C8C|#FFFFFF|36|55|Priestfield Stadium|11582|plain',
      'Grimsby Town|GRI|#111111|#FFFFFF|36|55|Blundell Park|9052|stripes',
      'Newport County|NEP|#F5A623|#111111|30|53|Rodney Parade|7850|plain',
      'Northampton Town|NTH|#7A1E3A|#FFFFFF|33|56|Sixfields Stadium|7798|plain',
      'Oldham Athletic|OLD|#0E63AD|#FFFFFF|36|55|Boundary Park|13513|plain',
      'Port Vale|PVA|#FFFFFF|#111111|33|56|Vale Park|15036|plain',
      'Rochdale|ROC|#0E63AD|#111111|31|53|Crown Oil Arena|10249|plain',
      'Rotherham United|ROT|#E2001A|#FFFFFF|37|56|New York Stadium|12021|plain',
      'Salford City|SAL|#E2001A|#FFFFFF|34|55|Peninsula Stadium|5108|plain',
      'Shrewsbury Town|SHR|#0E3C8C|#F5A623|32|54|Croud Meadow|9875|plain',
      'Swindon Town|SWI|#E2001A|#FFFFFF|36|55|County Ground|15728|plain',
      'Tranmere Rovers|TRA|#FFFFFF|#0E3C8C|34|54|Prenton Park|16567|plain',
      'Walsall|WAL|#E2001A|#FFFFFF|34|55|Poundland Bescot Stadium|11300|plain',
      'York City|YOR|#E2001A|#1D3E8C|33|54|LNER Community Stadium|8500|plain',
    ],
  },
  {
    id: 'ENG5', name: 'National League', short: 'NL', country: 'ENG', tier: 5, up: 2, down: 0, color: '#FF7A00', level: 50,
    clubs: [
      'AFC Fylde|FYL|#FFFFFF|#1D3E8C|22|50|Mill Farm|6000|plain',
      'Aldershot Town|ALD|#E2001A|#1D3E8C|26|50|Recreation Ground|7100|halves',
      'Altrincham|ALT|#E2001A|#FFFFFF|22|49|Moss Lane|7700|stripes',
      'Barrow|BRW|#003E7E|#FFFFFF|25|51|Holker Street|5045|plain',
      'Boreham Wood|BWD|#FFFFFF|#111111|20|48|Meadow Park|4500|plain',
      'Boston United|BOS|#F5A623|#111111|20|48|Jakemans Community Stadium|5000|stripes',
      'Carlisle United|CRL|#0E63AD|#FFFFFF|30|52|Brunton Park|17949|plain',
      'Eastleigh|EAS|#0E63AD|#FFFFFF|20|48|Silverlake Stadium|5250|plain',
      'FC Halifax Town|HAL|#0E63AD|#FFFFFF|22|49|The Shay|10401|plain',
      'Forest Green Rovers|FGR|#7AC143|#111111|26|50|The New Lawn|5147|hoops',
      'Gateshead|GAT|#FFFFFF|#111111|22|49|Gateshead International Stadium|11800|plain',
      'Harrogate Town|HAR|#FFDD00|#111111|23|51|Wetherby Road|5000|plain',
      'Hartlepool United|HPL|#0E63AD|#FFFFFF|26|50|Suit Direct Stadium|7865|stripes',
      'Hornchurch|HOR|#E2001A|#FFFFFF|15|49|Hornchurch Stadium|3500|stripes',
      'Kidderminster Harriers|KID|#E2001A|#FFFFFF|24|50|Aggborough|6444|halves',
      'Scunthorpe United|SCU|#7A263A|#6CABDD|24|49|Glanford Park|9088|halves',
      'Solihull Moors|SOL|#0E63AD|#F5A623|20|48|Damson Park|5500|plain',
      'Southend United|SOE|#0E3C8C|#FFFFFF|26|50|Roots Hall|12392|plain',
      'Sutton United|SUT|#F5A623|#7A263A|22|49|Gander Green Lane|5013|plain',
      'Tamworth|TAM|#E2001A|#FFFFFF|18|48|The Lamb Ground|4100|plain',
      'Wealdstone|WEA|#0E63AD|#FFFFFF|18|48|Grosvenor Vale|4085|plain',
      'Woking|WOK|#E2001A|#FFFFFF|22|49|Kingfield Stadium|6036|halves',
      'Worthing|WOR|#E2001A|#FFFFFF|16|49|Woodside Road|3250|plain',
      'Yeovil Town|YEO|#00843D|#FFFFFF|22|49|Huish Park|9565|plain',
    ],
  },
  {
    id: 'ESP1', name: 'La Liga', short: 'LL', country: 'ESP', tier: 1, up: 0, down: 0, color: '#FF4B44', level: 74,
    clubs: [
      'Alavés|ALA|#0050A0|#FFFFFF|62|70|Mendizorrotza|19840|stripes',
      'Athletic Club|ATH|#EE2523|#FFFFFF|78|74|San Mamés|53289|stripes',
      'Atlético Madrid|ATM|#CB3524|#FFFFFF|88|78|Metropolitano|70460|stripes',
      'Barcelona|BAR|#A50044|#004D98|95|79|Spotify Camp Nou|99354|stripes',
      'Celta Vigo|CEL|#8AC3EE|#FFFFFF|66|71|Balaídos|24870|plain',
      'Deportivo La Coruña|DEP|#0055A4|#FFFFFF|60|73|Riazor|32660|stripes',
      'Elche|ELC|#FFFFFF|#05642C|58|69|Martínez Valero|31388|chevron',
      'Espanyol|ESP|#007FC8|#FFFFFF|62|70|RCDE Stadium|40000|stripes',
      'Getafe|GET|#005999|#FFFFFF|64|70|Coliseum|17393|plain',
      'Levante|LEV|#004C8B|#A6192E|58|69|Ciutat de València|26354|stripes',
      'Málaga|MAL|#0075BF|#FFFFFF|56|73|La Rosaleda|30044|stripes',
      'Osasuna|OSA|#D91A21|#0A346F|66|71|El Sadar|23576|plain',
      'Racing Santander|RAC|#FFFFFF|#00843D|54|72|El Sardinero|22222|plain',
      'Rayo Vallecano|RAY|#FFFFFF|#E53027|64|71|Vallecas|14708|sash',
      'Real Betis|BET|#00954C|#FFFFFF|76|73|La Cartuja|60000|stripes',
      'Real Madrid|RMA|#FFFFFF|#FEBE10|97|80|Santiago Bernabéu|83186|plain',
      'Real Sociedad|RSO|#0067B1|#FFFFFF|74|73|Anoeta|39500|stripes',
      'Sevilla|SEV|#FFFFFF|#D4021D|74|71|Ramón Sánchez-Pizjuán|43883|plain',
      'Valencia|VAL|#FFFFFF|#EE3524|72|71|Mestalla|49430|plain',
      'Villarreal|VIL|#FFE667|#005187|76|74|La Cerámica|23500|plain',
    ],
  },
  {
    id: 'ITA1', name: 'Serie A', short: 'SA', country: 'ITA', tier: 1, up: 0, down: 0, color: '#0A7CFF', level: 74,
    clubs: [
      'AC Milan|MIL|#FB090B|#111111|88|76|San Siro|75817|stripes',
      'Atalanta|ATA|#1E71B8|#111111|80|75|Gewiss Stadium|24950|stripes',
      'Bologna|BOL|#1A2F48|#A21C26|72|73|Stadio Renato Dall\'Ara|36462|halves',
      'Cagliari|CAG|#A31F34|#002350|60|70|Unipol Domus|16416|halves',
      'Como|COM|#00468C|#FFFFFF|66|73|Stadio Giuseppe Sinigaglia|13602|plain',
      'Fiorentina|FIO|#50217F|#FFFFFF|74|73|Stadio Artemio Franchi|43147|plain',
      'Frosinone|FRO|#FFD700|#0047AB|52|72|Stadio Benito Stirpe|16227|plain',
      'Genoa|GEN|#A31F34|#002350|60|70|Stadio Luigi Ferraris|33205|halves',
      'Inter|INT|#0068A8|#111111|90|78|San Siro|75817|stripes',
      'Juventus|JUV|#111111|#FFFFFF|90|77|Allianz Stadium|41507|stripes',
      'Lazio|LAZ|#87D8F7|#FFFFFF|76|73|Stadio Olimpico|70634|plain',
      'Lecce|LEC|#FFED00|#E2001A|56|69|Stadio Via del Mare|31533|stripes',
      'Monza|MON|#E2001A|#FFFFFF|56|73|U-Power Stadium|15039|plain',
      'Napoli|NAP|#12A0D7|#FFFFFF|86|77|Stadio Diego Armando Maradona|54726|plain',
      'Parma|PAR|#FFFFFF|#FFD200|58|70|Stadio Ennio Tardini|22352|chevron',
      'Roma|ROM|#8E1F2F|#F0BC42|82|75|Stadio Olimpico|70634|plain',
      'Sassuolo|SAS|#00A752|#111111|58|70|Mapei Stadium|21584|stripes',
      'Torino|TOR|#881F19|#FFFFFF|64|71|Stadio Olimpico Grande Torino|28177|plain',
      'Udinese|UDI|#111111|#FFFFFF|62|70|Bluenergy Stadium|25144|stripes',
      'Venezia|VEN|#111111|#F47A20|56|73|Stadio Pier Luigi Penzo|11150|plain',
    ],
  },
  {
    id: 'GER1', name: 'Bundesliga', short: 'BL', country: 'GER', tier: 1, up: 0, down: 0, color: '#D20515', level: 73,
    clubs: [
      'Augsburg|FCA|#BA3733|#46714D|58|70|WWK Arena|30660|halves',
      'Bayer Leverkusen|B04|#E32221|#111111|84|76|BayArena|30210|plain',
      'Bayern Munich|FCB|#DC052D|#0066B2|96|80|Allianz Arena|75024|plain',
      'Borussia Dortmund|BVB|#FDE100|#111111|88|77|Signal Iduna Park|81365|plain',
      'Borussia Mönchengladbach|BMG|#FFFFFF|#00A651|68|71|Borussia-Park|54042|plain',
      'Eintracht Frankfurt|SGE|#E1000F|#111111|76|73|Deutsche Bank Park|58000|plain',
      'FC Köln|KOE|#FFFFFF|#ED1C24|60|69|RheinEnergieStadion|50000|plain',
      'Freiburg|SCF|#111111|#E2001A|68|71|Europa-Park Stadion|34700|plain',
      'Hamburger SV|HSV|#FFFFFF|#0A3F8C|62|69|Volksparkstadion|57000|plain',
      'Hoffenheim|TSG|#1961B5|#FFFFFF|66|71|PreZero Arena|30150|plain',
      'Mainz 05|M05|#C3141E|#FFFFFF|62|70|Mewa Arena|33305|plain',
      'RB Leipzig|RBL|#FFFFFF|#DD0741|82|75|Red Bull Arena|47069|plain',
      'Schalke 04|S04|#004D9D|#FFFFFF|66|73|Veltins-Arena|62271|plain',
      'SC Paderborn|SCP|#0A3E84|#111111|52|71|Home Deluxe Arena|15000|plain',
      'SV Elversberg|SVE|#111111|#FFFFFF|50|71|Ursapharm-Arena an der Kaiserlinde|10000|plain',
      'Union Berlin|FCU|#EB1923|#FFFFFF|62|70|Stadion An der Alten Försterei|22012|plain',
      'VfB Stuttgart|VFB|#FFFFFF|#E32219|74|73|MHPArena|60449|chevron',
      'Werder Bremen|SVW|#1D9053|#FFFFFF|64|70|Weserstadion|42100|plain',
    ],
  },
  {
    id: 'FRA1', name: 'Ligue 1', short: 'L1', country: 'FRA', tier: 1, up: 0, down: 0, color: '#091C3E', level: 72,
    clubs: [
      'Angers|ANG|#111111|#FFFFFF|52|67|Stade Raymond Kopa|19350|stripes',
      'Auxerre|AUX|#FFFFFF|#0E3C8C|52|67|Stade de l\'Abbé-Deschamps|18541|plain',
      'Brest|BRE|#E2001A|#FFFFFF|62|69|Stade Francis-Le Blé|15931|plain',
      'Le Havre|HAV|#6CABDD|#0E3C8C|52|67|Stade Océane|25178|halves',
      'Le Mans|LMF|#E2001A|#FFD200|48|70|Stade Marie-Marvingt|25064|plain',
      'Lens|RCL|#FFD200|#E2001A|70|71|Stade Bollaert-Delelis|38223|stripes',
      'Lille|LIL|#E2001A|#0E3C8C|76|72|Stade Pierre-Mauroy|50186|plain',
      'Lorient|LOR|#F68712|#111111|52|67|Stade du Moustoir|18890|plain',
      'Lyon|OL|#FFFFFF|#0E3C8C|78|72|Groupama Stadium|59186|sash',
      'Marseille|OM|#2FAEE0|#FFFFFF|82|74|Stade Vélodrome|67394|plain',
      'Monaco|ASM|#E2001A|#FFFFFF|80|74|Stade Louis II|18523|halves',
      'Nice|NIC|#E2001A|#111111|72|71|Allianz Riviera|36178|stripes',
      'Paris FC|PFC|#0E3C8C|#FFFFFF|56|69|Stade Jean-Bouin|19904|plain',
      'Paris Saint-Germain|PSG|#004170|#DA291C|96|80|Parc des Princes|47929|chevron',
      'Rennes|REN|#E2001A|#111111|72|71|Roazhon Park|29778|halves',
      'Strasbourg|RCS|#009FE3|#FFFFFF|66|71|Stade de la Meinau|26109|plain',
      'Toulouse|TFC|#5B2A86|#FFFFFF|62|69|Stadium de Toulouse|33150|plain',
      'Troyes|EST|#0066B3|#FFFFFF|52|70|Stade de l\'Aube|21684|plain',
    ],
  },
];

// Real players, keyed by club name. Clubs are topped up with generated players to a full squad.
export const REAL_PLAYERS: Record<string, string[]> = {
  'Arsenal': [
    'David Raya|GK|30|ESP|87', 'Kepa Arrizabalaga|GK|31|ESP|79', 'William Saliba|DC|25|FRA|87|89', 'Gabriel Magalhães|DC|28|BRA|86||h',
    'Ben White|DR|28|ENG|81', 'Jurriën Timber|DR|25|NED|83|86', 'Riccardo Calafiori|DL|24|ITA|80|84', 'Piero Hincapié|DL|24|ECU|81|84',
    'Cristhian Mosquera|DC|22|ESP|77|84', 'Myles Lewis-Skelly|DL|19|ENG|75|87', 'Declan Rice|MC|27|ENG|87||w', 'Martín Zubimendi|DM|27|ESP|85',
    'Martin Ødegaard|AMC|27|NOR|87||v', 'Mikel Merino|MC|30|ESP|81', 'Eberechi Eze|AMC|28|ENG|83||t', 'Bukayo Saka|AMR|24|ENG|88|90|t',
    'Noni Madueke|AMR|24|ENG|79|83|p', 'Viktor Gyökeres|ST|28|SWE|85||s', 'Kai Havertz|ST|27|GER|83', 'Bruno Guimarães|MC|28|BRA|86',
    'Ezri Konsa|DC|28|ENG|82', 'Christos Tzolis|AML|24|GRE|80', 'Illan Meslier|GK|26|FRA|74', 'Max Dowman|AMR|16|ENG|71|91|tp',
  ],
  'Aston Villa': [
    'Marco Bizot|GK|35|NED|75', 'Pau Torres|DC|29|ESP|82', 'Tyrone Mings|DC|33|ENG|76', 'Matty Cash|DR|28|POL|79',
    'Ian Maatsen|DL|24|NED|78', 'Boubacar Kamara|DM|26|FRA|82', 'Amadou Onana|DM|24|BEL|81', 'John McGinn|MC|31|SCO|80||w',
    'Emiliano Buendía|AMR|29|ARG|77', 'Alejandro Garnacho|AML|22|ARG|80|85|p', 'Nicolas Jackson|ST|25|SEN|79', 'Johan Manzambi|MC|20|SUI|73|84',
    'João Gomes|DM|25|BRA|79||w', 'Taylor Harwood-Bellis|DC|24|ENG|72', 'Zion Suzuki|GK|24|JPN|76', 'Matteo Ruggeri|DL|24|ITA|76',
    'Leon Goretzka|MC|31|GER|81', 'Aaron Wan-Bissaka|DR|28|ENG|79', 'Ibrahim Mbaye|AML|18|SEN|74|86',
  ],
  'Bournemouth': [
    'Đorđe Petrović|GK|26|SRB|78', 'Bafodé Diakité|DC|25|FRA|76', 'Adam Smith|DR|35|ENG|72', 'Adrien Truffert|DL|24|FRA|77',
    'Tyler Adams|DM|27|USA|78', 'Alex Scott|MC|22|ENG|76|83', 'Lewis Cook|MC|29|ENG|76', 'Ryan Christie|AMC|31|SCO|75',
    'Justin Kluivert|AMC|27|NED|79', 'Marcus Tavernier|AML|27|ENG|77', 'Amine Adli|AMR|26|MAR|76', 'Evanilson|ST|26|BRA|78',
    'Eli Junior Kroupi|ST|20|FRA|73|85', 'Rayan|AMR|19|BRA|74|84', 'António Silva|DC|22|POR|80', 'Álvaro Rodríguez|ST|22|URU|75',
    'Juanlu Sánchez|DR|22|ESP|75', 'Michele Di Gregorio|GK|28|ITA|81',
  ],
  'Brentford': [
    'Caoimhín Kelleher|GK|27|IRL|80', 'Nathan Collins|DC|25|IRL|79', 'Kristoffer Ajer|DR|28|NOR|76', 'Michael Kayode|DR|21|ITA|74|81',
    'Rico Henry|DL|29|ENG|75', 'Vitaly Janelt|MC|28|GER|76', 'Yehor Yarmoliuk|MC|22|UKR|74|80', 'Mikkel Damsgaard|AMC|26|DEN|78|80|v',
    'Kevin Schade|AML|24|GER|77|80|p', 'Keane Lewis-Potter|AML|25|ENG|75', 'Dango Ouattara|AMR|24|BFA|77', 'Igor Thiago|ST|25|BRA|79|81|s',
    'El Hadji Malick Diouf|DL|21|SEN|76|82', 'Jaidon Anthony|AML|26|ENG|73', 'Callum Wilson|ST|34|ENG|75', 'Mamadou Sangaré|MC|23|MLI|77',
  ],
  'Brighton': [
    'Matt O\'Riley|MC|25|DEN|77',
    'Bart Verbruggen|GK|23|NED|80|84', 'Jason Steele|GK|35|ENG|70', 'Lewis Dunk|DC|34|ENG|79', 'Ferdi Kadıoğlu|DL|26|TUR|79',
    'Mats Wieffer|MC|26|NED|78', 'Yasin Ayari|MC|22|SWE|77|82', 'Jack Hinshelwood|MC|21|ENG|76|83', 'Diego Gómez|MC|23|PAR|77|82',
    'Georginio Rutter|AMC|24|FRA|79', 'Kaoru Mitoma|AML|29|JPN|81||p', 'Yankuba Minteh|AMR|21|GAM|77|84|p', 'Stefanos Tzimas|ST|20|GRE|74|84',
    'Luka Vušković|DC|19|CRO|74|87', 'Pascal Struijk|DC|26|NED|76',
  ],
  'Chelsea': [
    'Emanuel Emegha|ST|23|NED|76',
    'Mike Penders|GK|20|BEL|74|85',
    'Reece James|DR|26|ENG|84', 'Malo Gusto|DR|23|FRA|80', 'Levi Colwill|DC|23|ENG|82|86',
    'Wesley Fofana|DC|25|FRA|80', 'Jorrel Hato|DL|20|NED|78|87', 'Moisés Caicedo|DM|24|ECU|87|88|w', 'Romeo Lavia|DM|22|BEL|78|84',
    'Cole Palmer|AMC|24|ENG|87|90|tf', 'Estêvão|AMR|19|BRA|80|90|t', 'Pedro Neto|AMR|26|POR|82|83|p', 'Jamie Gittens|AML|21|ENG|78|85|p',
    'João Pedro|ST|24|BRA|83|85', 'Morgan Rogers|AMC|23|ENG|83|87|t', 'Maxence Lacroix|DC|26|FRA|81', 'Emiliano Martínez|GK|33|ARG|85',
    'Danny Welbeck|ST|35|ENG|76', 'Jordan Henderson|MC|36|ENG|76', 'Geovany Quenda|AMR|19|POR|77|88', 'Marco Palestra|DR|21|ITA|77',
    'Valentín Barco|DL|21|ARG|75',
  ],
  'Coventry City': [
    'Carl Rushworth|GK|24|ENG|70', 'Bobby Thomas|DC|25|ENG|69', 'Jack Rudoni|AMC|25|ENG|71', 'Haji Wright|ST|28|USA|72',
    'Ellis Simms|ST|25|ENG|69', 'Ethan Pinnock|DC|33|JAM|76', 'Loum Tchaouna|AMR|22|FRA|72', 'Taiwo Awoniyi|ST|28|NGA|74',
    'Frank Onyeka|MC|28|NGA|74', 'Gustavo Hamer|AMC|29|NED|73', 'Aurèle Amenda|DC|22|SUI|74', 'Caleb Yirenkyi|DM|20|GHA|72|81',
  ],
  'Crystal Palace': [
    'Dean Henderson|GK|29|ENG|81', 'Chris Richards|DC|26|USA|78', 'Tyrick Mitchell|DL|26|ENG|78', 'Adam Wharton|MC|22|ENG|81|87|v',
    'Jefferson Lerma|DM|31|COL|77', 'Will Hughes|MC|31|ENG|74', 'Daichi Kamada|AMC|29|JPN|77', 'Ismaïla Sarr|AMR|28|SEN|80||p',
    'Yeremy Pino|AML|23|ESP|78', 'Jean-Philippe Mateta|ST|29|FRA|80||s', 'Jørgen Strand Larsen|ST|26|NOR|78||s',
    'Evann Guessand|ST|24|CIV|77', 'Dwight McNeil|AML|26|ENG|76', 'Óscar Mingueza|DR|27|ESP|76', 'Quinten Timber|MC|24|NED|77',
  ],
  'Everton': [
    'Brennan Johnson|AMR|25|WAL|79',
    'Jordan Pickford|GK|32|ENG|83', 'James Tarkowski|DC|33|ENG|79', 'Jarrad Branthwaite|DC|24|ENG|80|84', 'Michael Keane|DC|33|ENG|75',
    'Jake O\'Brien|DR|25|IRL|75', 'Vitaliy Mykolenko|DL|27|UKR|76', 'James Garner|MC|25|ENG|78', 'Kiernan Dewsbury-Hall|MC|27|ENG|78',
    'Merlin Röhl|AMC|23|GER|74', 'Jack Grealish|AML|30|ENG|80||t', 'Thierno Barry|ST|23|FRA|76|81', 'Christian Nørgaard|DM|32|DEN|77',
    'Hayden Hackney|MC|24|ENG|72|76',
  ],
  'Fulham': [
    'Bernd Leno|GK|34|GER|81', 'Joachim Andersen|DC|30|DEN|80', 'Calvin Bassey|DC|26|NGA|78', 'Kenny Tete|DR|30|NED|76',
    'Antonee Robinson|DL|28|USA|80||p', 'Sander Berge|DM|28|NOR|78', 'Emile Smith Rowe|AMC|25|ENG|78',
    'Alex Iwobi|AMR|30|NGA|79', 'Rodrigo Muniz|ST|25|BRA|76', 'Oscar Bobb|AMR|22|NOR|76', 'Gonzalo García|ST|22|ESP|74|81',
    'Shea Charles|DM|22|NIR|71|77', 'Hugo Larsson|MC|21|SWE|78|84',
  ],
  'Hull City': [
    'Jack Butland|GK|33|ENG|74', 'Hidemasa Morita|MC|31|JPN|76', 'Nobel Mendy|DC|21|FRA|73', 'Joe Gelhardt|ST|24|ENG|70',
  ],
  'Ipswich Town': [
    'Christian Walton|GK|30|ENG|70', 'Dara O\'Shea|DC|27|IRL|72', 'Leif Davis|DL|26|ENG|73||c', 'Azor Matusiwa|DM|28|NED|71',
    'Jack Clarke|AML|25|ENG|72', 'Jaden Philogene|AMR|24|ENG|72', 'Saša Lukić|MC|29|SRB|76', 'Abdul Fatawu|AMR|22|GHA|72|78|p',
    'Zian Flemming|ST|27|NED|73', 'Daizen Maeda|AML|28|JPN|78', 'Chuba Akpom|ST|30|ENG|73', 'Issa Diop|DC|29|FRA|75',
    'Exequiel Palacios|MC|27|ARG|80',
  ],
  'Leeds United': [
    'Lucas Perri|GK|28|BRA|76', 'Joe Rodon|DC|28|WAL|77', 'Jaka Bijol|DC|27|SVN|77', 'Jayden Bogle|DR|25|ENG|75',
    'Gabriel Gudmundsson|DL|27|SWE|75', 'Ethan Ampadu|DM|25|WAL|77', 'Sean Longstaff|MC|28|ENG|75', 'Anton Stach|MC|27|GER|76',
    'Brenden Aaronson|AMC|25|USA|75', 'Daniel James|AML|28|WAL|75||p', 'Noah Okafor|AML|26|SUI|76', 'Dominic Calvert-Lewin|ST|29|ENG|76||h',
    'Lukas Nmecha|ST|27|GER|74', 'James Trafford|GK|23|ENG|77|83', 'Harry Wilson|AMR|29|WAL|77', 'Nico Elvedi|DC|29|SUI|77',
    'Tarik Muharemović|DL|23|BIH|76', 'Melvin Bard|DL|26|FRA|75', 'Jean-Mattéo Bahoya|AML|21|FRA|72',
  ],
  'Liverpool': [
    'Alisson Becker|GK|33|BRA|88', 'Giorgi Mamardashvili|GK|25|GEO|83|87', 'Virgil van Dijk|DC|34|NED|88||h', 'Joe Gomez|DC|29|ENG|78',
    'Giovanni Leoni|DC|19|ITA|72|86', 'Jeremie Frimpong|DR|25|NED|83||p', 'Conor Bradley|DR|22|NIR|77|83', 'Milos Kerkez|DL|22|HUN|81|85',
    'Ryan Gravenberch|DM|24|NED|85|87', 'Alexis Mac Allister|MC|27|ARG|86', 'Dominik Szoboszlai|MC|25|HUN|84', 'Florian Wirtz|AMC|23|GER|88|92|tv',
    'Federico Chiesa|AMR|28|ITA|78', 'Cody Gakpo|AML|27|NED|84', 'Alexander Isak|ST|26|SWE|88||f', 'Hugo Ekitike|ST|24|FRA|84|87|p',
    'Bradley Barcola|AML|23|FRA|83|86|p', 'Jérémy Jacquet|DC|20|FRA|72|83', 'Víctor Muñoz|AML|22|ESP|77', 'Ronald Araújo|DC|27|URU|82',
  ],
  'Manchester City': [
    'Gianluigi Donnarumma|GK|27|ITA|89', 'Rúben Dias|DC|29|POR|87', 'Joško Gvardiol|DC|24|CRO|86', 'Abdukodir Khusanov|DC|22|UZB|79|85',
    'Matheus Nunes|DR|27|POR|80', 'Rayan Aït-Nouri|DL|25|ALG|82', 'Nico O\'Reilly|DL|21|ENG|77|85', 'Tijjani Reijnders|MC|27|NED|85',
    'Mateo Kovačić|MC|32|CRO|81', 'Phil Foden|AMC|26|ENG|85||t', 'Rayan Cherki|AMC|22|FRA|83|88|t', 'Jérémy Doku|AML|24|BEL|83||p',
    'Antoine Semenyo|AMR|26|GHA|82||p', 'Erling Haaland|ST|25|NOR|91|92|sf', 'Marc Guéhi|DC|25|ENG|84', 'Enzo Fernández|MC|25|ARG|85',
    'Iliman Ndiaye|AMR|26|SEN|80', 'Elliot Anderson|MC|23|ENG|84|87|w', 'Ayyoub Bouaddi|MC|18|MAR|78|89', 'Gerónimo Rulli|GK|34|ARG|80',
  ],
  'Manchester United': [
    'Senne Lammens|GK|24|BEL|78|84', 'Matthijs de Ligt|DC|26|NED|82', 'Lisandro Martínez|DC|28|ARG|83', 'Leny Yoro|DC|20|FRA|78|88',
    'Harry Maguire|DC|33|ENG|77||h', 'Diogo Dalot|DR|27|POR|80', 'Noussair Mazraoui|DR|28|MAR|79', 'Luke Shaw|DL|30|ENG|79',
    'Patrick Dorgu|DL|21|DEN|76|83', 'Manuel Ugarte|DM|25|URU|79', 'Kobbie Mainoo|MC|21|ENG|78|87', 'Bruno Fernandes|AMC|31|POR|86||v',
    'Mason Mount|AMC|27|ENG|77', 'Matheus Cunha|AMC|27|BRA|83||t', 'Bryan Mbeumo|AMR|26|CMR|84', 'Amad Diallo|AMR|24|CIV|80|84',
    'Benjamin Šeško|ST|23|SVN|81|87|s', 'Joshua Zirkzee|ST|25|NED|76', 'Andrey Santos|MC|22|BRA|79', 'Carlos Baleba|DM|22|CMR|81|87',
    'Youri Tielemans|MC|29|BEL|83', 'Marcus Rashford|AML|28|ENG|80||p',
  ],
  'Newcastle United': [
    'Nick Pope|GK|34|ENG|82', 'Tino Livramento|DR|23|ENG|80|85', 'Sven Botman|DC|26|NED|81',
    'Malick Thiaw|DC|24|GER|80', 'Fabian Schär|DC|34|SUI|80', 'Dan Burn|DC|34|ENG|78||h', 'Lewis Hall|DL|21|ENG|79|86',
    'Joelinton|MC|29|BRA|81||s', 'Jacob Ramsey|MC|25|ENG|77', 'Harvey Barnes|AML|28|ENG|79', 'Anthony Elanga|AMR|24|SWE|80||p',
    'Jacob Murphy|AMR|31|ENG|77', 'Yoane Wissa|ST|29|COD|80', 'Nico González|DM|24|ESP|79', 'Matías Fernández-Pardo|AMR|21|BEL|73',
    'Bazoumana Touré|AML|20|CIV|73|83',
  ],
  'Nottingham Forest': [
    'Matz Sels|GK|34|BEL|81', 'Murillo|DC|23|BRA|82|86', 'Nikola Milenković|DC|28|SRB|82||h', 'Ola Aina|DR|29|NGA|79',
    'Nicolò Savona|DR|23|ITA|75|80', 'Neco Williams|DL|25|WAL|78', 'Ibrahim Sangaré|DM|28|CIV|78',
    'Morgan Gibbs-White|AMC|26|ENG|83', 'Callum Hudson-Odoi|AML|25|ENG|78', 'Dan Ndoye|AMR|25|SUI|79', 'Chris Wood|ST|34|NZL|80||s',
    'Igor Jesus|ST|25|BRA|77', 'Arnaud Kalimuendo|ST|24|FRA|77', 'Liam Delap|ST|23|ENG|78|84|s',
    'Daniel Muñoz|DR|30|COL|81', 'Xaver Schlager|MC|28|AUT|80', 'Ousmane Diomande|DC|22|CIV|80',
  ],
  'Sunderland': [
    'Robin Roefs|GK|23|NED|76|81', 'Dan Ballard|DC|26|NIR|74', 'Omar Alderete|DC|29|PAR|75', 'Luke O\'Nien|DC|31|ENG|71',
    'Nordi Mukiele|DR|28|FRA|77', 'Reinildo Mandava|DL|32|MOZ|75', 'Granit Xhaka|DM|33|SUI|81||v', 'Noah Sadiki|MC|21|COD|75|82',
    'Enzo Le Fée|MC|26|FRA|77', 'Habib Diarra|MC|22|SEN|76|81', 'Chris Rigg|MC|19|ENG|72|84', 'Chemsdine Talbi|AMR|21|MAR|73|80',
    'Wilson Isidor|ST|25|FRA|75', 'Kevin Danso|DC|27|AUT|79',
    'Malick Fofana|AML|21|BEL|79|87|p', 'Thomas Meunier|DR|34|BEL|75',
  ],
  'Tottenham Hotspur': [
    'Antonín Kinský|GK|23|CZE|74|80', 'Micky van de Ven|DC|25|NED|84||p', 'Pedro Porro|DR|26|ESP|83', 'Destiny Udogie|DL|23|ITA|80',
    'Rodrigo Bentancur|MC|29|URU|80', 'Lucas Bergvall|MC|20|SWE|76|87', 'Archie Gray|DM|20|ENG|75|86', 'Xavi Simons|AMC|23|NED|83|87|t',
    'James Maddison|AMC|29|ENG|82||v', 'Mohammed Kudus|AMR|25|GHA|82||t', 'Dejan Kulusevski|AMR|26|SWE|82', 'Wilson Odobert|AML|21|FRA|75|82',
    'Dominic Solanke|ST|28|ENG|80', 'Richarlison|ST|29|BRA|78', 'Conor Gallagher|MC|26|ENG|81||w', 'Andrew Robertson|DL|32|SCO|82||c',
    'Savinho|AMR|22|BRA|80|86|p', 'Omar Marmoush|ST|27|EGY|83', 'Tosin Adarabioyo|DC|28|ENG|76', 'Sandro Tonali|DM|26|ITA|84',
    'Mateus Fernandes|MC|22|POR|76|82', 'Marcos Senesi|DC|29|ARG|78', 'Jan Paul van Hecke|DC|26|NED|80', 'Martin Dúbravka|GK|37|SVK|75',
  ],
  'Birmingham City': [
    'Tomoki Iwata|MC|29|JPN|70', 'Demarai Gray|AML|30|ENG|70', 'Jay Stansfield|ST|23|ENG|71|76',
  ],
  'Bolton Wanderers': [
    'Luca Stephenson|MC|22|ENG|64', 'Akin Famewo|DC|27|ENG|65',
  ],
  'Bristol City': [
    'Jed Wallace|AMR|32|ENG|68',
    'Scott Twine|AMC|26|ENG|70',
  ],
  'Burnley': [
    'Joe Worrall|DC|29|ENG|72', 'Kyle Walker|DR|36|ENG|77', 'Josh Cullen|DM|30|IRL|74', 'Josh Laurent|MC|31|ENG|72',
    'Hannibal Mejbri|AMC|23|TUN|73', 'Lyle Foster|ST|25|RSA|73', 'Armando Broja|ST|24|ALB|73',
  ],
  'Charlton Athletic': [
    'Miles Leaburn|ST|22|ENG|66|73',
  ],
  'Derby County': [

  ],
  'Middlesbrough': [
    'Sol Brynn|GK|25|ENG|68', 'Riley McGree|AML|27|AUS|70', 'Morgan Whittaker|AMR|25|ENG|71', 'Will Lankshear|ST|21|ENG|69',
  ],
  'Millwall': [

  ],
  'Norwich City': [
    'Vladan Kovačević|GK|27|BIH|69', 'Kenny McLean|MC|34|SCO|67',
  ],
  'Portsmouth': [

  ],
  'Queens Park Rangers': [
    'Dennis Cirkin|DL|24|ENG|70',
  ],
  'Sheffield United': [
    'Matt Doherty|DR|34|IRL|73',
    'Japhet Tanganga|DC|27|ENG|68',
    'Michael Cooper|GK|26|ENG|70', 'Tyrese Campbell|ST|26|ENG|69',
  ],
  'Southampton': [
    'Aaron Ramsdale|GK|28|ENG|78',
    'Gavin Bazunu|GK|24|IRL|70', 'Ryan Manning|DL|29|IRL|70', 'Flynn Downes|MC|27|ENG|72',

  ],
  'Stoke City': [
    'Viktor Johansson|GK|27|SWE|70', 'Million Manhoef|AML|24|NED|70', 'George Hirst|ST|27|SCO|70',
  ],
  'Swansea City': [
    'Ross Stewart|ST|30|SCO|68',
    'Žan Vipotnik|ST|24|SVN|68',
  ],
  'Watford': [
    'Edo Kayembe|MC|28|COD|69',
  ],
  'West Bromwich Albion': [
    'Alex Mowatt|MC|31|ENG|69', 'Jimmy-Jay Morgan|ST|19|ENG|64|77',
  ],
  'West Ham United': [
    'Alphonse Areola|GK|33|FRA|78', 'Mads Hermansen|GK|26|DEN|78', 'Max Kilman|DC|29|ENG|78', 'Tomáš Souček|MC|31|CZE|78',
    'Jarrod Bowen|AMR|29|ENG|82', 'Niclas Füllkrug|ST|33|GER|77', 'Joël Veltman|DR|34|NED|75',
    'Joël Piroe|ST|26|NED|74', 'Taty Castellanos|ST|27|ARG|78',
  ],
  'Wolves': [
    'Adam Armstrong|ST|29|ENG|71',
    'Bertrand Traoré|AMR|30|BFA|74',
    'José Sá|GK|33|POR|77', 'Toti Gomes|DC|27|POR|76', 'Santiago Bueno|DC|27|URU|75',
    'Hugo Bueno|DL|23|ESP|73', 'André|MC|25|BRA|77', 'Marshall Munetsi|MC|30|ZIM|74',
    'Jean-Ricner Bellegarde|AMC|28|FRA|75', 'Rodrigo Gomes|AMR|23|POR|73', 'Kieran Trippier|DR|35|ENG|79||c', 'Raúl Jiménez|ST|35|MEX|76',
    'Jordan James|MC|21|WAL|70|78', 'Ladislav Krejčí|DC|27|CZE|75',
  ],
  'Wrexham': [
    'Arthur Okonkwo|GK|24|ENG|68', 'Conor Coady|DC|33|ENG|69', 'George Dobson|MC|28|ENG|68', 'Lewis O\'Brien|MC|27|ENG|69',
    'Josh Windass|AMC|32|ENG|68', 'Nathan Broadhead|AML|28|WAL|70', 'Kieffer Moore|ST|33|WAL|69||s', 'Anthony Patterson|GK|26|ENG|72',
  ],
  'Leicester City': [
    'Jannik Vestergaard|DC|33|DEN|71', 'Ricardo Pereira|DR|32|POR|71', 'Harry Winks|MC|30|ENG|71', 'Bobby De Cordova-Reid|AMR|33|JAM|69',
    'Jordan Ayew|ST|34|GHA|69',
  ],
  'Sheffield Wednesday': [
    'Barry Bannan|MC|36|SCO|66',
  ],
  'Alavés': [
    'Antonio Sivera|GK|30|ESP|76', 'Carles Aleñá|MC|28|ESP|74', 'Toni Martínez|ST|29|ESP|73', 'Lucas Boyé|ST|30|ARG|73',
  ],
  'Athletic Club': [
    'Peio Canales|AMC|21|ESP|72|80',
    'Unai Simón|GK|29|ESP|84', 'Dani Vivian|DC|27|ESP|80', 'Aitor Paredes|DC|26|ESP|77', 'Yuri Berchiche|DL|36|ESP|76',
    'Mikel Jauregizar|MC|22|ESP|77|83', 'Íñigo Ruiz de Galarreta|MC|33|ESP|77', 'Oihan Sancet|AMC|26|ESP|81', 'Nico Williams|AML|23|ESP|85|88|p',
    'Iñaki Williams|AMR|32|GHA|80|80|p', 'Gorka Guruzeta|ST|29|ESP|77',
  ],
  'Atlético Madrid': [
    'Jan Oblak|GK|33|SVN|87', 'Juan Musso|GK|32|ARG|77', 'Robin Le Normand|DC|29|ESP|81', 'Dávid Hancko|DC|28|SVK|80',
    'Marcos Llorente|DR|31|ESP|81||w', 'Koke|MC|34|ESP|80', 'Pablo Barrios|MC|23|ESP|81|86', 'Johnny Cardoso|DM|24|USA|78',
    'Álex Baena|AML|24|ESP|83', 'Giuliano Simeone|AMR|23|ARG|77', 'Julián Álvarez|ST|26|ARG|87|88', 'Alexander Sørloth|ST|30|NOR|81||s',
    'Cristian Romero|DC|28|ARG|85', 'Ademola Lookman|AML|28|NGA|83||p', 'Morten Hjulmand|DM|27|DEN|83', 'Lee Kang-in|AMC|25|KOR|79',
    'Alejandro Grimaldo|DL|30|ESP|83||c', 'Jonathan David|ST|26|CAN|83',
  ],
  'Barcelona': [
    'Joan García|GK|25|ESP|83|87', 'Jules Koundé|DR|27|FRA|85', 'Pau Cubarsí|DC|19|ESP|82|90', 'Eric García|DC|25|ESP|79',
    'Alejandro Balde|DL|22|ESP|82|86|p', 'Frenkie de Jong|MC|29|NED|86', 'Pedri|MC|23|ESP|89|91|tv', 'Gavi|MC|21|ESP|82|87',
    'Dani Olmo|AMC|28|ESP|84', 'Fermín López|AMC|23|ESP|81|85', 'Lamine Yamal|AMR|18|ESP|89|96|tv', 'Raphinha|AML|29|BRA|88',
    'Gabriel Jesus|ST|29|BRA|78', 'Rodri|DM|30|ESP|89||v', 'Anthony Gordon|AML|25|ENG|83||p', 'Karim Adeyemi|AML|24|GER|80||p',
    'João Cancelo|DR|32|POR|81', 'Dominik Livaković|GK|31|CRO|79',
  ],
  'Celta Vigo': [
    'Matías Vecino|MC|34|URU|74',
    'Ilaix Moriba|MC|23|GUI|75', 'Hugo Álvarez|AML|22|ESP|74', 'Borja Iglesias|ST|33|ESP|76',
    'Iago Aspas|ST|38|ESP|75||f', 'Altay Bayındır|GK|28|TUR|74',
  ],
  'Deportivo La Coruña': [
    'Marc Casadó|DM|22|ESP|77|82', 'José María Giménez|DC|31|URU|82', 'Angeliño|DL|29|ESP|78', 'Adama Traoré|AMR|30|ESP|75',
    'Yeremay Hernández|AML|23|ESP|76|82|t', 'Pierre-Emerick Aubameyang|ST|37|GAB|77',
  ],
  'Elche': [
    'Buba Sangaré|DC|18|ESP|63|80',
    'Marc Aguado|DM|26|ESP|72', 'Germán Valera|AMR|24|ESP|71',
  ],
  'Espanyol': [
    'Marko Dmitrović|GK|34|SRB|76', 'Leandro Cabrera|DC|35|URU|74', 'Pere Milla|AMC|33|ESP|72',
    'Javi Puado|ST|28|ESP|75', 'Quilindschy Hartman|DL|24|NED|73',
  ],
  'Getafe': [
    'Martín Satriano|ST|25|URU|72',
    'Orel Mangala|DM|28|BEL|76',
    'Nemanja Gudelj|DM|34|SRB|75',
    'David Soria|GK|33|ESP|77', 'Djené|DC|34|TOG|76', 'Mauro Arambarri|MC|30|URU|77', 'Borja Mayoral|ST|29|ESP|75',
    'Dani Carvajal|DR|34|ESP|82',
  ],
  'Levante': [
    'Roger Brugué|AML|29|ESP|71', 'Iván Romero|ST|25|ESP|71',
  ],
  'Málaga': [
    'Carlos Dotor|MC|25|ESP|71', 'Einar Galilea|DC|22|ESP|70|76', 'Jens Cajuste|MC|26|SWE|73', 'Juan Berrocal|DC|27|ESP|70',
  ],
  'Osasuna': [
    'Sergio Herrera|GK|33|ESP|77', 'Lucas Torró|DM|32|ESP|75', 'Aimar Oroz|AMC|24|ESP|76', 'Rubén García|AML|32|ESP|74',
    'Ante Budimir|ST|35|CRO|77||h',
  ],
  'Racing Santander': [
    'Jorge Salinas|DL|19|ESP|65|79',
    'Julen Agirrezabala|GK|26|ESP|74', 'Íñigo Sainz-Maza|MC|29|ESP|70', 'Asier Villalibre|ST|28|ESP|70',
  ],
  'Rayo Vallecano': [
    'Augusto Batalla|GK|30|ARG|76', 'Florian Lejeune|DC|35|FRA|75', 'Pathé Ciss|DM|32|SEN|75', 'Óscar Valentín|MC|32|ESP|75',
    'Isi Palazón|AMR|31|ESP|77', 'Jorge de Frutos|AML|29|ESP|76', 'Álvaro García|AML|33|ESP|74',
  ],
  'Real Betis': [
    'Álvaro Valles|GK|28|ESP|76', 'Diego Llorente|DC|32|ESP|76', 'Marc Bartra|DC|35|ESP|74',
    'Pablo Fornals|MC|30|ESP|78', 'Giovani Lo Celso|AMC|30|ARG|79', 'Isco|AMC|34|ESP|81||t', 'Antony|AMR|26|BRA|80',
    'Abde Ezzalzouli|AML|24|MAR|78|81|p', 'Cucho Hernández|ST|27|COL|78', 'Dani Ceballos|MC|29|ESP|79',
  ],
  'Real Madrid': [
    'Thibaut Courtois|GK|34|BEL|89', 'Andriy Lunin|GK|27|UKR|78', 'Trent Alexander-Arnold|DR|27|ENG|85||vc', 'Éder Militão|DC|28|BRA|84',
    'Antonio Rüdiger|DC|33|GER|84||s', 'Dean Huijsen|DC|21|ESP|82|89', 'Raúl Asencio|DC|23|ESP|77|82', 'Álvaro Carreras|DL|23|ESP|81|85',
    'Ferland Mendy|DL|31|FRA|80', 'Aurélien Tchouaméni|DM|26|FRA|85', 'Federico Valverde|MC|27|URU|88||w', 'Eduardo Camavinga|MC|23|FRA|83|87',
    'Jude Bellingham|AMC|23|ENG|89|92', 'Arda Güler|AMC|21|TUR|82|90|tv', 'Brahim Díaz|AMC|26|MAR|80', 'Rodrygo|AMR|25|BRA|84',
    'Vinícius Júnior|AML|25|BRA|89||pt', 'Kylian Mbappé|ST|27|FRA|91||pf', 'Ibrahima Konaté|DC|27|FRA|85||s', 'Bernardo Silva|MC|31|POR|85||t',
    'Marc Cucurella|DL|27|ESP|83', 'Denzel Dumfries|DR|30|NED|84||p', 'Carlos Espí|ST|20|ESP|73|81', 'Yan Diomande|AMR|19|CIV|74|86',
  ],
  'Real Sociedad': [
    'Álex Remiro|GK|31|ESP|83', 'Igor Zubeldia|DC|29|ESP|79', 'Sergio Gómez|DL|25|ESP|76', 'Jon Gorrotxategi|MC|23|ESP|74',
    'Takefusa Kubo|AMR|25|JPN|81||t', 'Ander Barrenetxea|AML|24|ESP|76', 'Mikel Oyarzabal|ST|29|ESP|82', 'Héctor Fort|DR|19|ESP|72|82',
    'Mamadou Sarr|DC|20|FRA|72|82',
  ],
  'Sevilla': [
    'Odysseas Vlachodimos|GK|32|GRE|76', 'José Ángel Carmona|DR|24|ESP|74', 'Rubén Vargas|AML|27|SUI|76',
    'Isaac Romero|ST|26|ESP|74', 'Youssouf Fofana|DM|27|FRA|81', 'Felix Correia|AMR|25|POR|74',
    'Jon Guridi|MC|31|ESP|73', 'Lucas Stassin|ST|21|BEL|73',
  ],
  'Valencia': [
    'Stole Dimitrievski|GK|32|MKD|76', 'César Tárrega|DC|24|ESP|77', 'José Gayà|DL|31|ESP|77', 'Pepelu|DM|27|ESP|77',
    'Javi Guerra|MC|23|ESP|78|83', 'Diego López|AMR|24|ESP|76', 'Luis Rioja|AML|32|ESP|74', 'Hugo Duro|ST|26|ESP|76',
    'Harvey Elliott|AMC|23|ENG|78|83', 'Arnau Martínez|DR|23|ESP|76',
  ],
  'Villarreal': [
    'Carlos Romero|DL|24|ESP|74',
    'Luiz Júnior|GK|25|BRA|77', 'Juan Foyth|DC|28|ARG|78', 'Renato Veiga|DC|22|POR|77|82', 'Santi Comesaña|MC|29|ESP|78',
    'Alberto Moleiro|AMC|22|ESP|77|83', 'Nicolas Pépé|AMR|31|CIV|77', 'Tajon Buchanan|AMR|27|CAN|76', 'Ayoze Pérez|ST|32|ESP|80',
    'Gerard Moreno|ST|34|ESP|79', 'Georges Mikautadze|ST|25|GEO|78', 'Péter Gulácsi|GK|36|HUN|79', 'Nathan Saliba|MC|22|CAN|74',
  ],
  'AC Milan': [
    'Mike Maignan|GK|30|FRA|87', 'Fikayo Tomori|DC|28|ENG|81', 'Strahinja Pavlović|DC|25|SRB|78', 'Matteo Gabbia|DC|26|ITA|78',
    'Koni De Winter|DC|24|BEL|77', 'Alexis Saelemaekers|DR|27|BEL|78', 'Pervis Estupiñán|DL|28|ECU|79', 'Luka Modrić|MC|40|CRO|82||v',
    'Adrien Rabiot|MC|31|FRA|82', 'Ruben Loftus-Cheek|MC|30|ENG|78', 'Ardon Jashari|MC|24|SUI|77', 'Christian Pulisic|AMR|27|USA|84',
    'Omari Hutchinson|AMR|22|JAM|78|83', 'Samuel Chukwueze|AMR|27|NGA|77', 'Gonçalo Ramos|ST|25|POR|80',
    'Mario Gila|DC|25|ESP|79', 'Diego Moreira|AML|22|BEL|75',
  ],
  'Atalanta': [
    'Marco Carnesecchi|GK|26|ITA|81', 'Isak Hien|DC|27|SWE|79', 'Odilon Kossounou|DC|25|CIV|78', 'Raoul Bellanova|DR|26|ITA|77',
    'Davide Zappacosta|DR|34|ITA|76', 'Éderson|MC|27|BRA|82', 'Lazar Samardžić|AMC|24|SRB|77', 'Charles De Ketelaere|AMC|25|BEL|82',
    'Kamaldeen Sulemana|AMR|24|GHA|74', 'Gianluca Scamacca|ST|27|ITA|79', 'Nikola Krstović|ST|26|MNE|77', 'Gianluca Gaetano|AMC|26|ITA|73',
    'Jonathan Rowe|AML|23|ENG|75', 'Thomas Kristensen|DC|24|DEN|74', 'Eljif Elmas|AMC|26|MKD|77', 'Franck Kessié|MC|29|CIV|78',
  ],
  'Bologna': [
    'Łukasz Skorupski|GK|35|POL|78', 'Emil Holm|DR|26|SWE|76', 'Juan Miranda|DL|26|ESP|76', 'Remo Freuler|MC|34|SUI|77',
    'Lewis Ferguson|MC|26|SCO|79', 'Jens Odgaard|AMC|27|DEN|75', 'Riccardo Orsolini|AMR|29|ITA|80', 'Federico Bernardeschi|AMR|32|ITA|74',
    'Ciro Immobile|ST|36|ITA|75', 'Artem Dovbyk|ST|29|UKR|79', 'Arthur Theate|DC|26|BEL|78',
  ],
  'Cagliari': [
    'Elia Caprile|GK|25|ITA|75', 'Yerry Mina|DC|31|COL|74', 'Michel Adopo|MC|25|FRA|72', 'Sebastiano Esposito|ST|23|ITA|73',
  ],
  'Como': [
    'Jean Butez|GK|31|FRA|77', 'Marc-Oliver Kempf|DC|31|GER|76', 'Diego Carlos|DC|33|BRA|76', 'Álex Valle|DL|22|ESP|74',
    'Máximo Perrone|MC|23|ARG|77', 'Lucas Da Cunha|MC|25|FRA|76', 'Nico Paz|AMC|21|ARG|81|89|t', 'Jesús Rodríguez|AML|20|ESP|74|84',
    'Assane Diao|AMR|20|SEN|75|84', 'Jayden Addai|AMR|20|NED|72|80', 'Álvaro Morata|ST|33|ESP|77', 'Tasos Douvikas|ST|27|GRE|74',
    'Trevoh Chalobah|DC|27|ENG|79', 'Robert Sánchez|GK|28|ESP|81', 'Luis Milla|MC|31|ESP|77', 'Samuele Ricci|DM|24|ITA|78',
    'Moise Kean|ST|26|ITA|82||p', 'Yan Couto|DR|24|BRA|78',
  ],
  'Fiorentina': [
    'Mateo Pellegrino|ST|24|ARG|74',
    'David de Gea|GK|35|ESP|82', 'Luca Ranieri|DC|27|ITA|76', 'Dodô|DR|27|BRA|79',
    'Fabiano Parisi|DL|25|ITA|74', 'Nicolò Fagioli|MC|25|ITA|76', 'Cher Ndour|MC|22|ITA|74', 'Beto|ST|28|POR|74',
    'Franco Mastantuono|AMR|18|ARG|76|90|t',
  ],
  'Frosinone': [
    'Florian Grillitsch|DM|30|AUT|74', 'Antonio Raimondo|ST|22|ITA|70|76', 'Giorgi Kvernadze|AMR|23|GEO|70',
  ],
  'Genoa': [
    'Nicola Leali|GK|33|ITA|73', 'Johan Vásquez|DC|27|MEX|76', 'Morten Frendrup|MC|25|DEN|76', 'Ruslan Malinovskyi|AMC|33|UKR|75',
    'Junior Messias|AMR|35|BRA|73', 'Lorenzo Colombo|ST|24|ITA|72', 'Djibril Sow|MC|29|SUI|75',
  ],
  'Inter': [
    'Benjamin Pavard|DC|30|FRA|80',
    'Andy Diouf|MC|23|FRA|75',
    'Kristjan Asllani|MC|24|ALB|74',
    'Josep Martínez|GK|28|ESP|77', 'Alessandro Bastoni|DC|27|ITA|87', 'Manuel Akanji|DC|30|SUI|83', 'Yann Bisseck|DC|25|GER|80',
    'Federico Dimarco|DL|28|ITA|85||c', 'Carlos Augusto|DL|27|BRA|79', 'Hakan Çalhanoğlu|DM|32|TUR|85||v', 'Nicolò Barella|MC|29|ITA|87||w',
    'Henrikh Mkhitaryan|MC|37|ARM|80', 'Petar Sučić|MC|23|CRO|77|83', 'Lautaro Martínez|ST|28|ARG|88||f', 'Marcus Thuram|ST|28|FRA|85||s',
    'Ange-Yoan Bonny|ST|22|FRA|76|82', 'Pio Esposito|ST|21|ITA|74|85', 'Curtis Jones|MC|25|ENG|80', 'John Stones|DC|32|ENG|81',
    'Djed Spence|DL|25|ENG|78', 'Ivan Provedel|GK|32|ITA|79',
  ],
  'Juventus': [
    'Douglas Luiz|MC|28|BRA|79',
    'Gleison Bremer|DC|29|BRA|84', 'Federico Gatti|DC|28|ITA|78', 'Lloyd Kelly|DC|27|ENG|77', 'Pierre Kalulu|DR|26|FRA|79',
    'Andrea Cambiaso|DL|26|ITA|81', 'Juan Cabal|DL|25|COL|76', 'Manuel Locatelli|DM|28|ITA|81', 'Khéphren Thuram|MC|25|FRA|81',
    'Weston McKennie|MC|27|USA|78', 'Teun Koopmeiners|MC|28|NED|80', 'Kenan Yıldız|AML|21|TUR|84|90|t', 'Francisco Conceição|AMR|23|POR|80|84',
    'Edon Zhegrova|AMR|27|KOS|79', 'Guglielmo Vicario|GK|29|ITA|83', 'Randal Kolo Muani|ST|27|FRA|80', 'Nick Woltemade|ST|24|GER|81|84',
    'Pape Matar Sarr|MC|23|SEN|80|83', 'Kamil Grabara|GK|27|POL|77', 'Jhon Lucumí|DC|27|COL|79', 'Zeki Çelik|DR|29|TUR|76',
    'Jeff Ekhator|ST|19|ITA|70|80', 'Jérémie Boga|AML|29|CIV|74',
  ],
  'Lazio': [
    'Diogo Leite|DC|27|POR|76',
    'Adam Marušić|DR|33|MNE|76', 'Nuno Tavares|DL|26|POR|78', 'Nicolò Rovella|DM|24|ITA|79',
    'Mattia Zaccagni|AML|31|ITA|80', 'Gustav Isaksen|AMR|25|DEN|76', 'Boulaye Dia|ST|29|SEN|76',
    'Davide Frattesi|MC|26|ITA|80', 'Andrea Pinamonti|ST|27|ITA|75', 'Albert Guðmundsson|AMC|29|ISL|78', 'Danilho Doekhi|DC|27|NED|77',
  ],
  'Lecce': [
    'Willem Geubbels|ST|25|FRA|71',
    'Wladimiro Falcone|GK|31|ITA|76', 'Lameck Banda|AML|25|ZAM|73', 'Nikola Štulić|ST|24|SRB|70',
  ],
  'Monza': [
    'Cyril Ngonge|AMR|26|BEL|75', 'Michael Folorunsho|MC|28|ITA|74', 'Patrick Cutrone|ST|28|ITA|73',
  ],
  'Napoli': [
    'Lorenzo Lucca|ST|25|ITA|74',
    'Alex Meret|GK|29|ITA|81', 'Vanja Milinković-Savić|GK|29|SRB|79', 'Giovanni Di Lorenzo|DR|32|ITA|82', 'Amir Rrahmani|DC|32|KOS|82',
    'Alessandro Buongiorno|DC|27|ITA|82', 'Sam Beukema|DC|27|NED|79', 'Mathías Olivera|DL|28|URU|78', 'Leonardo Spinazzola|DL|33|ITA|76',
    'Stanislav Lobotka|DM|31|SVK|84||v', 'Frank Anguissa|MC|30|CMR|83', 'Scott McTominay|MC|29|SCO|85', 'Billy Gilmour|MC|25|SCO|77',
    'Kevin De Bruyne|AMC|35|BEL|84||v', 'Matteo Politano|AMR|32|ITA|79', 'David Neres|AML|29|BRA|79', 'Noa Lang|AML|27|NED|78',
    'Rasmus Højlund|ST|23|DEN|78|83', 'Alisson Santos|AML|23|BRA|75', 'Benoît Badiashile|DC|25|FRA|77',
  ],
  'Parma': [
    'Enrico Delprato|DC|26|ITA|74', 'Adrián Bernabé|MC|25|ESP|75',
  ],
  'Roma': [
    'Mile Svilar|GK|26|SRB|83', 'Gianluca Mancini|DC|30|ITA|80', 'Evan Ndicka|DC|26|CIV|80', 'Wesley|DR|22|BRA|76|82',
    'Bryan Cristante|DM|31|ITA|77', 'Manu Koné|MC|25|FRA|81', 'Niccolò Pisilli|MC|21|ITA|74|81', 'Lorenzo Pellegrini|AMC|30|ITA|78',
    'Paulo Dybala|AMC|32|ARG|82||t', 'Matías Soulé|AMR|23|ARG|79|84', 'Leon Bailey|AMR|28|JAM|77', 'Evan Ferguson|ST|21|IRL|75|82',
    'Nahuel Molina|DR|28|ARG|78', 'Marten de Roon|DM|35|NED|78', 'Santiago Castro|ST|21|ARG|76|83', 'Konstantinos Koulierakis|DC|22|GRE|75',
    'Rodrigo Mora|AMC|19|POR|78|88', 'Daniele Ghilardi|DC|23|ITA|74', 'Donyell Malen|ST|27|NED|80', 'Robinio Vaz|ST|19|FRA|72|82',
    'Bryan Zaragoza|AML|24|ESP|75', 'Leonardo Balerdi|DC|27|ARG|79',
  ],
  'Sassuolo': [
    'Nemanja Matić|DM|37|SRB|74', 'Kristian Thorstvedt|MC|27|NOR|74', 'Domenico Berardi|AMR|31|ITA|78', 'Armand Laurienté|AML|27|FRA|77',
  ],
  'Torino': [
    'Pietro Comuzzo|DC|21|ITA|74|81',
    'Saúl Coco|DC|27|EQG|74', 'Ardian Ismajli|DC|29|ALB|74', 'Nikola Vlašić|AMC|28|CRO|77',
    'Ché Adams|ST|29|SCO|76', 'Giovanni Simeone|ST|31|ARG|75', 'Duván Zapata|ST|35|COL|74', 'Rolando Mandragora|MC|29|ITA|77',
  ],
  'Udinese': [
    'Maduka Okoye|GK|26|NGA|75', 'Jesper Karlström|MC|31|SWE|74', 'Sandi Lovrić|MC|28|SVN|74', 'Nicolò Zaniolo|AMR|27|ITA|75',
    'Keinan Davis|ST|28|ENG|74',
  ],
  'Venezia': [
    'Willy Gnonto|AMR|22|ITA|74',
    'Akor Adams|ST|26|NGA|76', 'Juan Jesus|DC|35|BRA|73', 'Pasquale Mazzocchi|DR|30|ITA|72',
  ],
  'Augsburg': [
    'Finn Dahmen|GK|28|GER|75', 'Jeffrey Gouweleeuw|DC|34|NED|73', 'Kristijan Jakić|MC|29|CRO|74',
    'Alexis Claude-Maurice|AMC|28|FRA|74',
  ],
  'Bayer Leverkusen': [
    'Mark Flekken|GK|33|NED|79', 'Edmond Tapsoba|DC|27|BFA|81', 'Loïc Badé|DC|26|FRA|79', 'Jarell Quansah|DC|23|ENG|78|83',
    'Arthur|DR|23|BRA|74', 'Robert Andrich|DM|31|GER|79', 'Aleix García|MC|29|ESP|79', 'Malik Tillman|AMC|24|USA|78',
    'Ibrahim Maza|AMC|20|ALG|75|84', 'Eliesse Ben Seghir|AMC|21|MAR|77|84', 'Nathan Tella|AMR|27|NGA|76',
    'Patrik Schick|ST|30|CZE|81', 'Christian Kofane|ST|20|CMR|72|83', 'Afonso Moreira|AML|21|POR|73', 'Facundo Medina|DL|27|ARG|77',
    'Guéla Doué|DR|23|CIV|75', 'Moussa Diaby|AMR|27|FRA|80', 'Miguel Gutiérrez|DL|24|ESP|79', 'Kennet Eichhorn|DM|17|GER|68|85',
  ],
  'Bayern Munich': [
    'Manuel Neuer|GK|40|GER|84', 'Jonas Urbig|GK|22|GER|74|83', 'Dayot Upamecano|DC|27|FRA|84', 'Jonathan Tah|DC|30|GER|84',
    'Kim Min-jae|DC|29|KOR|83', 'Hiroki Ito|DC|27|JPN|78', 'Josip Stanišić|DR|26|CRO|79', 'Konrad Laimer|DR|29|AUT|80||w',
    'Alphonso Davies|DL|25|CAN|83||p', 'Joshua Kimmich|DM|31|GER|88||v', 'Aleksandar Pavlović|MC|22|GER|81|88', 'Tom Bischof|MC|20|GER|76|85',
    'Jamal Musiala|AMC|23|GER|89|92|t', 'Michael Olise|AMR|24|FRA|87|90|t', 'Lennart Karl|AMR|18|GER|70|88', 'Luis Díaz|AML|29|COL|85||p',
    'Serge Gnabry|AML|30|GER|80', 'Harry Kane|ST|32|ENG|90||fv', 'Nathaniel Brown|DL|23|GER|75', 'Ismael Saibari|AMC|25|MAR|81',
  ],
  'Borussia Dortmund': [
    'Gregor Kobel|GK|28|SUI|86', 'Alexander Meyer|GK|35|GER|71', 'Nico Schlotterbeck|DC|26|GER|84', 'Waldemar Anton|DC|29|GER|80',
    'Julian Ryerson|DR|28|NOR|78', 'Ramy Bensebaini|DL|31|ALG|77', 'Daniel Svensson|DL|24|SWE|76',
    'Emre Can|DM|32|GER|78', 'Felix Nmecha|MC|25|GER|80|83', 'Marcel Sabitzer|MC|32|AUT|79', 'Jobe Bellingham|MC|20|ENG|76|86',
    'Carney Chukwuemeka|MC|22|ENG|73', 'Serhou Guirassy|ST|30|GUI|85||f', 'Maximilian Beier|ST|23|GER|78|82', 'Konstantinos Karetsas|AMC|18|GRE|75|87',
    'Joey Veerman|MC|27|NED|80', 'Giannis Konstantelias|AMC|23|GRE|76', 'Joane Gadou|DC|19|FRA|73|84', 'Ethan Nwaneri|AMC|19|ENG|76|89|t',
  ],
  'Borussia Mönchengladbach': [
    'Moritz Nicolas|GK|28|GER|76', 'Ko Itakura|DC|29|JPN|77', 'Joe Scally|DR|23|USA|75',
    'Kevin Stöger|AMC|32|AUT|75', 'Franck Honorat|AMR|29|FRA|76', 'Tim Kleindienst|ST|30|GER|77',
  ],
  'Eintracht Frankfurt': [
    'Kauã Santos|GK|23|BRA|76', 'Robin Koch|DC|29|GER|79', 'Mario Götze|AMC|34|GER|76',
    'Can Uzun|AMC|20|TUR|76|86', 'Ritsu Dōan|AMR|28|JPN|78', 'Fares Chaibi|AML|23|ALG|75', 'Jonathan Burkardt|ST|26|GER|78',
    'Lilian Brassier|DC|26|FRA|75', 'Raphael Onyedika|DM|25|NGA|76',
  ],
  'FC Köln': [
    'Ellyes Skhiri|DM|31|TUN|77',
    'Marvin Schwäbe|GK|31|GER|75', 'Timo Hübers|DC|29|GER|73', 'Isak Bergmann Jóhannesson|MC|23|ISL|73',
    'Linton Maina|AML|27|GER|73', 'Said El Mala|AML|19|GER|72|85|p', 'Ragnar Ache|ST|27|GER|72',
  ],
  'Freiburg': [
    'Mio Backhaus|GK|22|GER|72',
    'Noah Atubolu|GK|24|GER|77', 'Matthias Ginter|DC|32|GER|78', 'Philipp Lienhart|DC|30|AUT|77', 'Christian Günter|DL|33|GER|75',
    'Maximilian Eggestein|MC|29|GER|76', 'Vincenzo Grifo|AML|33|ITA|77', 'Jan-Niklas Beste|AML|27|GER|75', 'Derry Scherhant|AMR|24|GER|72',
    'Lucas Höler|ST|31|GER|74',
  ],
  'Hamburger SV': [
    'Daniel Heuer Fernandes|GK|33|POR|73', 'Jordan Torunarigha|DC|28|GER|72', 'Albert Sambi Lokonga|MC|26|BEL|73', 'Nicolás Capaldo|MC|27|ARG|73',
    'Fábio Vieira|AMC|26|POR|75', 'Jean-Luc Dompé|AML|31|FRA|72', 'Ransford Königsdörffer|ST|24|GHA|72',
    'Terem Moffi|ST|26|NGA|75',
  ],
  'Hoffenheim': [
    'Oliver Baumann|GK|36|GER|79', 'Ozan Kabak|DC|26|TUR|75', 'Wouter Burger|DM|25|NED|75', 'Andrej Kramarić|ST|35|CRO|77',
    'Fisnik Asllani|ST|24|KOS|74', 'Tim Lemperle|ST|24|GER|73',
  ],
  'Mainz 05': [
    'Eric Martel|DM|24|GER|74',
    'Robin Zentner|GK|31|GER|75', 'Stefan Bell|DC|34|GER|73', 'Danny da Costa|DR|32|GER|72', 'Kaishu Sano|DM|25|JPN|77',
    'Nadiem Amiri|AMC|29|GER|77', 'Paul Nebel|AMC|23|GER|75', 'Benedict Hollerbach|ST|25|GER|73', 'Phillip Tietz|ST|28|GER|73',
  ],
  'RB Leipzig': [
    'Maarten Vandevoordt|GK|24|BEL|76', 'Willi Orbán|DC|33|HUN|80', 'Castello Lukeba|DC|23|FRA|80|84', 'Benjamin Henrichs|DR|29|GER|77',
    'David Raum|DL|28|GER|80', 'Assan Ouédraogo|MC|20|GER|72|86', 'Christoph Baumgartner|AMC|26|AUT|79', 'Antonio Nusa|AML|21|NOR|77|87|p',
    'Johan Bakayoko|AMR|23|BEL|78', 'Rômulo|ST|25|BRA|75', 'Conrad Harder|ST|21|DEN|72', 'Maxime Estève|DC|24|FRA|75',
    'Christopher Nkunku|AMC|28|FRA|81', 'Rocco Reitz|MC|24|GER|76', 'Ørjan Nyland|GK|35|NOR|73',
  ],
  'Schalke 04': [
    'Junior Adamu|ST|25|AUT|73', 'Robin Gosens|DL|31|GER|78', 'Edin Džeko|ST|40|BIH|74', 'Kenan Karaman|ST|32|TUR|72',
    'Loris Karius|GK|33|GER|71', 'Moussa Sylla|ST|26|MLI|71', 'Nikola Katić|DC|29|SUI|72',
  ],
  'SC Paderborn': [
    'Rayan Philippe|ST|25|FRA|72',
    'Gabriel Vidović|AMC|22|CRO|72', 'Laurin Curda|DR|22|GER|68', 'Oliver Batista Meier|AML|25|GER|68',
  ],
  'SV Elversberg': [
    'Cole Campbell|AMR|20|USA|69|79', 'Noel Futkeu|ST|23|GER|70', 'Lukas Petkov|AML|25|GER|70', 'Łukasz Poręba|MC|26|POL|70',
    'Nicolas Kristof|GK|27|GER|69',
  ],
  'Union Berlin': [
    'Frederik Rønnow|GK|33|DEN|77', 'Christopher Trimmel|DR|39|AUT|70', 'Rani Khedira|DM|32|GER|75',
    'Andrej Ilić|ST|26|SRB|73', 'Ilyas Ansah|ST|21|GER|72',
  ],
  'VfB Stuttgart': [
    'Jeff Chabot|DC|28|GER|77', 'Josha Vagnoman|DR|25|GER|74', 'Maximilian Mittelstädt|DL|29|GER|78', 'Angelo Stiller|DM|25|GER|81||v',
    'Atakan Karazor|DM|29|GER|76', 'Bilal El Khannouss|AMC|22|MAR|76', 'Chris Führich|AML|28|GER|76', 'Jamie Leweling|AMR|25|GER|77',
    'Deniz Undav|ST|29|GER|79', 'Ermedin Demirović|ST|28|BIH|78', 'Tiago Tomás|ST|24|POR|74', 'Grischa Prömel|MC|31|GER|74',
  ],
  'Werder Bremen': [
    'Marco Friedl|DC|28|AUT|75', 'Mitchell Weiser|DR|32|GER|75', 'Senne Lynen|DM|27|BEL|75',
    'Jens Stage|MC|29|DEN|76', 'Romano Schmid|AMC|26|AUT|76', 'Marco Grüll|AML|27|AUT|73', 'Justin Njinmah|ST|25|GER|72',
  ],
  'Angers': [

  ],
  'Auxerre': [
    'Elisha Owusu|DM|28|GHA|72',
  ],
  'Brest': [
    'Brendan Chardonnet|DC|31|FRA|72', 'Bradley Locko|DL|24|FRA|73', 'Hugo Magnetti|MC|28|FRA|74', 'Kamory Doumbia|AMC|23|MLI|72',
    'Romain Del Castillo|AMR|30|FRA|75', 'Ludovic Ajorque|ST|32|FRA|73',
  ],
  'Le Havre': [
    'Josh Maja|ST|27|NGA|70',
    'Abdoulaye Touré|MC|32|GUI|72',
  ],
  'Le Mans': [
    'Adil Bourabaa|AML|23|FRA|66', 'Antoine Rabillard|AMR|26|FRA|66',
  ],
  'Lens': [
    'Robin Risser|GK|21|FRA|75|82', 'Jonathan Gradit|DC|33|FRA|74', 'Florian Thauvin|AMR|33|FRA|77',
    'Rayan Fofana|AML|20|FRA|70|80', 'Odsonne Édouard|ST|28|FRA|75', 'Jean-Clair Todibo|DC|26|FRA|78', 'Michaël Cuisance|AMC|26|FRA|72',
    'Thorgan Hazard|AML|33|BEL|73',
  ],
  'Lille': [
    'Berke Özer|GK|26|TUR|76', 'Nathan Ngoy|DC|23|BEL|74', 'Romain Perraud|DL|28|FRA|75', 'Benjamin André|DM|35|FRA|77',
    'Ngal\'ayel Mukau|MC|22|BEL|74', 'Hákon Arnar Haraldsson|AMC|23|ISL|78|82', 'Osame Sahraoui|AML|24|NOR|74', 'Hamza Igamane|ST|23|MAR|74',
    'Olivier Giroud|ST|39|FRA|73||h', 'Ayase Ueda|ST|27|JPN|76', 'Maurits Kjærgaard|MC|23|DEN|75', 'Dilane Bakwa|AMR|23|FRA|74',
    'Başar Önal|AML|21|TUR|71',
  ],
  'Lorient': [
    'Yvon Mvogo|GK|32|SUI|74', 'Mohamed Bamba|ST|24|CIV|71',
  ],
  'Lyon': [
    'Rémy Descamps|GK|29|FRA|73', 'Moussa Niakhaté|DC|30|SEN|78', 'Clinton Mata|DC|33|ANG|75', 'Ainsley Maitland-Niles|DR|28|ENG|74',
    'Nicolás Tagliafico|DL|33|ARG|77', 'Tanner Tessmann|DM|24|USA|75', 'Corentin Tolisso|MC|32|FRA|77',
    'Pavel Šulc|AMC|25|CZE|76', 'Ernest Nuamah|AMR|22|GHA|75', 'Loïs Openda|ST|26|BEL|80|82|p',
    'Julien Duranville|AMR|20|BEL|72|82', 'Noham Kamara|DL|19|FRA|70|81', 'Mads Bidstrup|MC|25|DEN|75',
  ],
  'Marseille': [
    'Himad Abdelli|MC|26|ALG|74',
    'Nayef Aguerd|DC|30|MAR|79', 'CJ Egan-Riley|DC|23|ENG|74', 'Pierre-Emile Højbjerg|DM|30|DEN|80',
    'Geoffrey Kondogbia|DM|33|CAF|75', 'Angel Gomes|AMC|25|ENG|77', 'Timothy Weah|AMR|26|USA|76',
    'Igor Paixão|AML|26|BRA|78', 'Amine Gouiri|ST|26|ALG|79',
  ],
  'Monaco': [
    'Philipp Köhn|GK|28|SUI|77', 'Mohammed Salisu|DC|27|GHA|77', 'Vanderson|DR|24|BRA|80',
    'Denis Zakaria|DM|29|SUI|80', 'Lamine Camara|MC|22|SEN|78|84', 'Aleksandr Golovin|AMC|30|RUS|78', 'Takumi Minamino|AML|31|JPN|78',
    'Ansu Fati|AML|23|ESP|76', 'Folarin Balogun|ST|25|USA|79', 'Mika Biereth|ST|23|DEN|77', 'Matthis Abline|ST|23|FRA|74',
    'Sadibou Sané|DC|21|FRA|70', 'Mathys Detourbet|AML|19|FRA|70|81',
  ],
  'Nice': [
    'Laurent Abergel|DM|33|FRA|72',
    'Yehvann Diouf|GK|27|SEN|76', 'Youssouf Ndayishimiye|DC|28|BDI|75', 'Jonathan Clauss|DR|33|FRA|76', 'Hicham Boudaoui|MC|26|ALG|75',
    'Morgan Sanson|MC|31|FRA|74', 'Sofiane Diop|AMC|26|MAR|77', 'Elye Wahi|ST|23|FRA|73', 'Niels Nkounkou|DL|25|FRA|72',
    'Mohamed Amoura|ST|26|ALG|78||p', 'Gauthier Hein|AMC|30|FRA|71', 'Axel Witsel|DM|37|BEL|76',
  ],
  'Paris FC': [
    'Pablo Pagis|AML|23|FRA|72',
    'Lassine Sinayoko|ST|26|MLI|74',
    'Kevin Trapp|GK|36|GER|77', 'Nhoa Sangui|DL|20|FRA|70|78', 'Maxime López|MC|28|FRA|74', 'Ilan Kebbal|AMC|28|ALG|75',
    'Jean-Philippe Krasso|ST|29|CIV|72',
  ],
  'Paris Saint-Germain': [
    'Lucas Chevalier|GK|24|FRA|83|87', 'Matvey Safonov|GK|27|RUS|78', 'Achraf Hakimi|DR|27|MAR|88||p', 'Marquinhos|DC|32|BRA|85',
    'Willian Pacho|DC|24|ECU|84|86', 'Illia Zabarnyi|DC|23|UKR|81|85', 'Lucas Beraldo|DC|22|BRA|76', 'Nuno Mendes|DL|24|POR|87|89|p',
    'Lucas Hernández|DL|30|FRA|80', 'Vitinha|MC|26|POR|88||v', 'João Neves|MC|21|POR|86|91|w', 'Fabián Ruiz|MC|30|ESP|84',
    'Warren Zaïre-Emery|MC|20|FRA|80|89', 'Senny Mayulu|MC|20|FRA|73|85', 'Désiré Doué|AMR|21|FRA|84|91|t', 'Khvicha Kvaratskhelia|AML|25|GEO|87||t',
    'Ousmane Dembélé|ST|29|FRA|90||pt', 'Ferran Torres|ST|26|ESP|80', 'Maghnes Akliouche|AMR|24|FRA|81|85', 'Mika Godts|AML|21|BEL|78',
    'Lucas Digne|DL|32|FRA|78',
  ],
  'Rennes': [
    'Issa Soumaré|ST|26|SEN|71',
    'Brice Samba|GK|32|FRA|79', 'Valentin Rongier|MC|31|FRA|76', 'Ludovic Blas|AMC|28|FRA|76',
    'Esteban Lepaul|ST|26|FRA|75', 'Eliezer Mayenda|ST|21|ESP|72|80',
  ],
  'Strasbourg': [
    'Filip Jørgensen|GK|24|DEN|75',
    'Andrew Omobamidele|DC|24|IRL|73', 'Ben Chilwell|DL|29|ENG|75',
    'Sebastian Nanasi|AMR|24|SWE|74', 'Joaquín Panichelli|ST|24|ARG|74',
  ],
  'Toulouse': [
    'Guillaume Restes|GK|21|FRA|75|82', 'Mark McKenzie|DC|27|USA|74', 'Charlie Cresswell|DC|23|ENG|74', 'Cristian Cásseres|MC|26|VEN|74',
    'Yann Gboho|AMR|25|FRA|74',
  ],
  'Troyes': [
    'Renaud Ripart|AML|33|FRA|69', 'Hugo Picard|AMC|23|FRA|68', 'Patrick Beach|GK|23|AUS|66',
  ],
  'Blackpool': [
    'Jerry Yates|ST|29|ENG|66',
  ],
  'Preston North End': [
    'Callum Lang|AML|27|ENG|67',
  ],
  'Cardiff City': [
    'Gabriel Osho|DC|27|NGA|72',
  ],
};

export const CUP_DEFS = [
  { id: 'FAC', name: 'FA Cup', short: 'FAC', country: 'ENG', color: '#C8102E' },
  { id: 'CDR', name: 'Copa del Rey', short: 'CDR', country: 'ESP', color: '#AA151B' },
  { id: 'CIT', name: 'Coppa Italia', short: 'CI', country: 'ITA', color: '#009246' },
  { id: 'DFB', name: 'DFB-Pokal', short: 'DFB', country: 'GER', color: '#111111' },
  { id: 'CDF', name: 'Coupe de France', short: 'CDF', country: 'FRA', color: '#0055A4' },
];
