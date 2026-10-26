// Name pools used to generate non-real players (squad depth, youth intakes, regens).
export const NAME_POOLS: Record<string, { first: string[]; last: string[] }> = {
  ENG: {
    first: ['Jack', 'Harry', 'George', 'Oliver', 'Charlie', 'James', 'Thomas', 'Alfie', 'Josh', 'Ben', 'Sam', 'Lewis', 'Ryan', 'Callum', 'Jordan', 'Connor', 'Kieran', 'Tyler', 'Reece', 'Jamie', 'Luke', 'Max', 'Archie', 'Freddie', 'Louie', 'Joe', 'Dan', 'Will', 'Ethan', 'Mason', 'Kai', 'Rhys', 'Aaron', 'Jake', 'Toby', 'Liam', 'Nathan', 'Elliot', 'Morgan', 'Cole', 'Jaden', 'Tom', 'Matt', 'Adam', 'Ollie', 'Zak', 'Dexter', 'Ronnie', 'Theo', 'Finley', 'Marcus', 'Dion', 'Kofi', 'Tayo', 'Rico'],
    last: ['Smith', 'Jones', 'Taylor', 'Brown', 'Williams', 'Wilson', 'Johnson', 'Davies', 'Wright', 'Walker', 'Robinson', 'Thompson', 'White', 'Hughes', 'Edwards', 'Green', 'Hall', 'Wood', 'Harris', 'Clarke', 'Jackson', 'Turner', 'Hill', 'Moore', 'Cooper', 'Ward', 'Morris', 'King', 'Baker', 'Harrison', 'Morgan', 'Patel', 'Young', 'Allen', 'Mitchell', 'Bell', 'Lee', 'Parker', 'Bennett', 'Shaw', 'Cook', 'Price', 'Hayes', 'Barnes', 'Lloyd', 'Bailey', 'Mills', 'Fletcher', 'Knight', 'Dixon', 'Holmes', 'Pearce', 'Chambers', 'Doyle', 'Gibbs', 'Rowe', 'Sterling', 'Ashworth', 'Okafor', 'Mensah', 'Boateng', 'Akinola', 'Hutchinson', 'Payne', 'Dawson', 'Fowler', 'Barker', 'Lowe', 'Marsh', 'Nolan'],
  },
  SCO: {
    first: ['Callum', 'Ross', 'Scott', 'Fraser', 'Lewis', 'Kyle', 'Craig', 'Euan', 'Calum', 'Ryan', 'Lyndon', 'Stuart', 'Grant', 'Kieran', 'Andy'],
    last: ['McGregor', 'Robertson', 'Campbell', 'Stewart', 'MacDonald', 'Fraser', 'Henderson', 'McKenna', 'Ferguson', 'Paterson', 'Murray', 'Gilmour', 'McLean', 'Christie', 'Hanley'],
  },
  WAL: {
    first: ['Rhys', 'Dylan', 'Gethin', 'Owain', 'Rhodri', 'Ethan', 'Joe', 'Harry', 'Wes', 'Brennan'],
    last: ['Jones', 'Davies', 'Evans', 'Thomas', 'Roberts', 'Lewis', 'Morgan', 'Griffiths', 'Rees', 'Price', 'Hughes', 'Llewellyn'],
  },
  IRL: {
    first: ['Sean', 'Conor', 'Cian', 'Darragh', 'Evan', 'Aidan', 'Ciaran', 'Niall', 'Shane', 'Eoin', 'Killian', 'Jamie'],
    last: ['Murphy', 'Kelly', 'O\'Brien', 'Byrne', 'Ryan', 'O\'Connor', 'Walsh', 'McCarthy', 'Doherty', 'Brady', 'Keane', 'Coleman'],
  },
  ESP: {
    first: ['Alejandro', 'Pablo', 'Daniel', 'Hugo', 'Álvaro', 'Adrián', 'Diego', 'Javier', 'Sergio', 'Marcos', 'Iker', 'Raúl', 'Carlos', 'Mario', 'Rubén', 'Jorge', 'Iván', 'Unai', 'Aitor', 'Óscar', 'Gonzalo', 'Martín', 'Nico', 'Dani', 'Fran', 'Borja', 'Íñigo', 'Mikel'],
    last: ['García', 'Fernández', 'González', 'Rodríguez', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Martín', 'Jiménez', 'Ruiz', 'Hernández', 'Díaz', 'Moreno', 'Muñoz', 'Álvarez', 'Romero', 'Navarro', 'Torres', 'Domínguez', 'Gil', 'Vázquez', 'Serrano', 'Ramos', 'Blanco', 'Castro', 'Ortega', 'Delgado', 'Marín', 'Iglesias', 'Medina', 'Garrido', 'Herrera', 'Peña'],
  },
  ITA: {
    first: ['Lorenzo', 'Alessandro', 'Matteo', 'Francesco', 'Andrea', 'Leonardo', 'Gabriele', 'Riccardo', 'Tommaso', 'Edoardo', 'Davide', 'Federico', 'Marco', 'Luca', 'Simone', 'Giacomo', 'Nicolò', 'Pietro', 'Filippo', 'Samuele', 'Daniele', 'Stefano', 'Giorgio', 'Michele'],
    last: ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti', 'De Luca', 'Mancini', 'Costa', 'Giordano', 'Rizzo', 'Lombardi', 'Moretti', 'Barbieri', 'Fontana', 'Santoro', 'Mariani', 'Rinaldi', 'Caruso', 'Ferrara', 'Galli', 'Martini', 'Leone', 'Longo', 'Gentile', 'Vitale'],
  },
  GER: {
    first: ['Lukas', 'Leon', 'Finn', 'Jonas', 'Paul', 'Luca', 'Felix', 'Maximilian', 'Tim', 'Jan', 'Niklas', 'Julian', 'Moritz', 'Tom', 'Florian', 'David', 'Kevin', 'Marvin', 'Philipp', 'Jannik', 'Nico', 'Elias', 'Malte', 'Lennart', 'Yannick'],
    last: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann', 'Schäfer', 'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf', 'Schröder', 'Neumann', 'Schwarz', 'Zimmermann', 'Braun', 'Krüger', 'Hofmann', 'Hartmann', 'Lange', 'Werner', 'Krause', 'Lehmann', 'Köhler', 'Maier', 'Vogel', 'Brandt'],
  },
  FRA: {
    first: ['Lucas', 'Hugo', 'Théo', 'Nathan', 'Mathis', 'Enzo', 'Louis', 'Tom', 'Maxime', 'Antoine', 'Baptiste', 'Clément', 'Quentin', 'Alexis', 'Romain', 'Kylian', 'Rayan', 'Yanis', 'Mehdi', 'Moussa', 'Ibrahima', 'Amine', 'Bilal', 'Axel', 'Jules', 'Florian'],
    last: ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Morel', 'Girard', 'André', 'Mercier', 'Blanc', 'Guerin', 'Boyer', 'Diallo', 'Traoré', 'Camara', 'Koné', 'Sissoko', 'Mbemba', 'Kanté'],
  },
  POR: {
    first: ['João', 'Diogo', 'Rúben', 'Pedro', 'Tiago', 'Gonçalo', 'Rafael', 'Bruno', 'Nuno', 'Francisco', 'André', 'Vitinha'],
    last: ['Silva', 'Santos', 'Ferreira', 'Pereira', 'Oliveira', 'Costa', 'Rodrigues', 'Martins', 'Sousa', 'Fernandes', 'Gonçalves', 'Carvalho', 'Mendes'],
  },
  BRA: {
    first: ['Gabriel', 'Lucas', 'Matheus', 'Pedro', 'Rafael', 'Vinícius', 'Thiago', 'Bruno', 'Felipe', 'Igor', 'Caio', 'Douglas', 'Wesley', 'Endrick', 'Luan', 'Murilo'],
    last: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Costa', 'Ferreira', 'Almeida', 'Ribeiro', 'Carvalho', 'Barbosa', 'Nascimento', 'Rocha', 'Moura'],
  },
  ARG: {
    first: ['Santiago', 'Mateo', 'Thiago', 'Facundo', 'Lautaro', 'Nicolás', 'Franco', 'Valentín', 'Agustín', 'Joaquín', 'Ezequiel', 'Julián'],
    last: ['González', 'Rodríguez', 'Gómez', 'Fernández', 'López', 'Díaz', 'Romero', 'Sosa', 'Acuña', 'Paredes', 'Medina', 'Benítez'],
  },
  NED: {
    first: ['Daan', 'Sem', 'Lucas', 'Milan', 'Jesse', 'Thijs', 'Bram', 'Jayden', 'Ruben', 'Stijn', 'Joey', 'Kenneth'],
    last: ['de Jong', 'Jansen', 'de Vries', 'van den Berg', 'van Dijk', 'Bakker', 'Visser', 'Smit', 'Meijer', 'de Boer', 'Mulder', 'Bos'],
  },
  BEL: {
    first: ['Arthur', 'Noah', 'Louis', 'Jules', 'Victor', 'Lucas', 'Thibaut', 'Wout', 'Maxim', 'Arne'],
    last: ['Peeters', 'Janssens', 'Maes', 'Jacobs', 'Mertens', 'Willems', 'Claes', 'Goossens', 'Wouters', 'De Smet'],
  },
  NGA: {
    first: ['Chukwuemeka', 'Samuel', 'Victor', 'Ademola', 'Tunde', 'Emeka', 'Kelechi', 'Wilfred', 'Ola', 'Taiwo'],
    last: ['Okonkwo', 'Adeyemi', 'Okafor', 'Eze', 'Balogun', 'Nwosu', 'Iwobi', 'Onuachu', 'Adebayo', 'Uzoho'],
  },
  SEN: {
    first: ['Moussa', 'Ismaïla', 'Pape', 'Cheikh', 'Abdou', 'Mamadou', 'Ibrahima', 'Lamine'],
    last: ['Diop', 'Ndiaye', 'Sarr', 'Faye', 'Gueye', 'Diouf', 'Mendy', 'Cissé'],
  },
  CIV: {
    first: ['Yao', 'Serge', 'Wilfried', 'Franck', 'Jean-Philippe', 'Simon', 'Oumar'],
    last: ['Koné', 'Kouamé', 'Bamba', 'Touré', 'Zaha', 'Aurier', 'Kessié'],
  },
  GHA: {
    first: ['Kwame', 'Kofi', 'Kwabena', 'Yaw', 'Abdul', 'Mohammed', 'Kojo'],
    last: ['Mensah', 'Asante', 'Owusu', 'Boateng', 'Osei', 'Addo', 'Agyemang'],
  },
  DEN: {
    first: ['Mads', 'Rasmus', 'Mikkel', 'Jonas', 'Andreas', 'Frederik', 'Victor'],
    last: ['Jensen', 'Nielsen', 'Hansen', 'Pedersen', 'Andersen', 'Christensen', 'Larsen'],
  },
  SWE: { first: ['Erik', 'Viktor', 'Oscar', 'Hugo', 'Isak', 'Elias'], last: ['Andersson', 'Johansson', 'Karlsson', 'Lindqvist', 'Berg', 'Holm'] },
  NOR: { first: ['Ola', 'Sander', 'Magnus', 'Henrik', 'Jonas'], last: ['Hansen', 'Johansen', 'Olsen', 'Larsen', 'Berg'] },
  CRO: { first: ['Luka', 'Ivan', 'Marko', 'Josip', 'Mario'], last: ['Horvat', 'Kovačević', 'Babić', 'Marić', 'Jurić'] },
  SRB: { first: ['Nikola', 'Stefan', 'Lazar', 'Aleksandar', 'Dušan'], last: ['Jovanović', 'Petrović', 'Nikolić', 'Marković', 'Đorđević'] },
  POL: { first: ['Jakub', 'Kacper', 'Mateusz', 'Piotr', 'Bartosz'], last: ['Nowak', 'Kowalski', 'Wiśniewski', 'Wójcik', 'Kamiński'] },
  USA: { first: ['Tyler', 'Brandon', 'Chris', 'Josh', 'Caden', 'Gio'], last: ['Miller', 'Davis', 'Anderson', 'Thomas', 'Robinson', 'Adams'] },
  JPN: { first: ['Takumi', 'Kaoru', 'Daichi', 'Ritsu', 'Hiroki', 'Kenta'], last: ['Tanaka', 'Suzuki', 'Sato', 'Watanabe', 'Ito', 'Nakamura'] },
  MAR: { first: ['Achraf', 'Youssef', 'Hakim', 'Sofyan', 'Bilal', 'Azzedine'], last: ['El Idrissi', 'Benali', 'Amrani', 'Ziani', 'Alaoui', 'Bennani'] },
  COL: { first: ['Juan', 'Jhon', 'Luis', 'Yerry', 'Jefferson', 'Daniel'], last: ['Mosquera', 'Cuadrado', 'Muñoz', 'Lerma', 'Arias', 'Mina'] },
  URU: { first: ['Federico', 'Rodrigo', 'Ronald', 'Matías', 'Nahitan'], last: ['Valverde', 'Araújo', 'Ugarte', 'Olivera', 'Vecino'] },
  AUT: { first: ['Marcel', 'Konrad', 'Xaver', 'Stefan', 'Florian'], last: ['Gruber', 'Huber', 'Bauer', 'Wagner', 'Pichler'] },
  SUI: { first: ['Granit', 'Manuel', 'Fabian', 'Remo', 'Nico'], last: ['Müller', 'Meier', 'Schmid', 'Keller', 'Weber'] },
  TUR: { first: ['Arda', 'Kerem', 'Emre', 'Ferdi', 'Hakan', 'Orkun'], last: ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Aydın'] },
};

// Weighting of nationalities per league country when generating players.
export const NAT_MIX: Record<string, [string, number][]> = {
  ENG: [['ENG', 62], ['SCO', 5], ['WAL', 4], ['IRL', 6], ['NGA', 3], ['GHA', 3], ['FRA', 3], ['NED', 2], ['ESP', 2], ['POR', 2], ['BRA', 2], ['DEN', 2], ['USA', 2], ['BEL', 2]],
  ESP: [['ESP', 72], ['ARG', 5], ['BRA', 4], ['FRA', 4], ['POR', 3], ['URU', 3], ['COL', 3], ['MAR', 3], ['SEN', 2], ['NED', 1]],
  ITA: [['ITA', 60], ['ARG', 5], ['BRA', 5], ['FRA', 4], ['SRB', 3], ['CRO', 3], ['POL', 3], ['NED', 3], ['DEN', 3], ['SEN', 3], ['TUR', 2], ['SUI', 2], ['NGA', 2], ['ESP', 2]],
  GER: [['GER', 60], ['AUT', 7], ['SUI', 5], ['FRA', 4], ['NED', 3], ['DEN', 3], ['POL', 3], ['CRO', 3], ['JPN', 3], ['USA', 2], ['TUR', 3], ['SWE', 2], ['NOR', 2]],
  FRA: [['FRA', 62], ['SEN', 6], ['CIV', 6], ['MAR', 5], ['BEL', 4], ['POR', 3], ['BRA', 3], ['NGA', 2], ['GHA', 2], ['ESP', 2], ['SUI', 2], ['NED', 1], ['ARG', 2]],
};

export const NATIONS: Record<string, string> = {
  ENG: 'England', SCO: 'Scotland', WAL: 'Wales', IRL: 'Ireland', NIR: 'Northern Ireland', ESP: 'Spain', ITA: 'Italy',
  GER: 'Germany', FRA: 'France', POR: 'Portugal', BRA: 'Brazil', ARG: 'Argentina', NED: 'Netherlands',
  BEL: 'Belgium', NGA: 'Nigeria', SEN: 'Senegal', CIV: 'Ivory Coast', GHA: 'Ghana', DEN: 'Denmark',
  SWE: 'Sweden', NOR: 'Norway', CRO: 'Croatia', SRB: 'Serbia', POL: 'Poland', USA: 'USA', JPN: 'Japan',
  MAR: 'Morocco', COL: 'Colombia', URU: 'Uruguay', AUT: 'Austria', SUI: 'Switzerland', TUR: 'Turkey',
  EGY: 'Egypt', GEO: 'Georgia', ECU: 'Ecuador', CMR: 'Cameroon', ALG: 'Algeria', KOR: 'South Korea',
  HUN: 'Hungary', CZE: 'Czechia', SVK: 'Slovakia', SVN: 'Slovenia', UKR: 'Ukraine', MLI: 'Mali',
  GUI: 'Guinea', JAM: 'Jamaica', CAN: 'Canada', MEX: 'Mexico', PAR: 'Paraguay', BFA: 'Burkina Faso',
  GAB: 'Gabon', ISL: 'Iceland', COD: 'DR Congo', ALB: 'Albania', ISR: 'Israel', GRE: 'Greece',
  BIH: 'Bosnia', ZAM: 'Zambia', KOS: 'Kosovo', VEN: 'Venezuela', CHI: 'Chile', AUS: 'Australia',
  TUN: 'Tunisia', FIN: 'Finland', ARM: 'Armenia', MNE: 'Montenegro', RUS: 'Russia', NZL: 'New Zealand',
  UZB: 'Uzbekistan', CPV: 'Cape Verde', RSA: 'South Africa', HAI: 'Haiti', ZIM: 'Zimbabwe',
  MOZ: 'Mozambique', GAM: 'Gambia', EQG: 'Equatorial Guinea', MKD: 'North Macedonia', TOG: 'Togo', ANG: 'Angola',
  CAF: 'Central African Rep.', BDI: 'Burundi', GUF: 'French Guiana', BEN: 'Benin', LUX: 'Luxembourg',
};
