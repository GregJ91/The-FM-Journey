# The FM Journey

A fast, modern football management game for mobile: a hybrid of Football Manager / Championship Manager depth and EA FC-style accessibility.

- **Real leagues and players**: the full English pyramid (Premier League → National League) plus La Liga, Serie A, Bundesliga and Ligue 1, with 1,100+ real players and generated depth players.
- **World football**: the Club World Cup every four years (from 2029), plus the World Cup, Euros, Copa América, Africa Cup of Nations and Asian Cup. Your players get called up, win caps and can come back injured.
- **European competitions**: the Champions League, Europa League and Conference League in the current UEFA format, with the real 2026/27 line-ups and 70 clubs from the rest of Europe (Benfica, Porto, PSV, Celtic, Galatasaray and more).
- **One-minute matches**: watch a live 2D match with commentary, change formation, roles and instructions mid-match, and make subs. Or take the instant result.
- **Deep tactics**: 6 quick presets, 30+ player roles and a full set of team instructions, each with real trade-offs in the match engine.
- **Detailed player stats**: shots, xG, key passes, xA, passing, dribbles, tackles, interceptions, saves and more, tracked every match, with per-90 figures and leaderboards.
- **FM-style ratings**: 19 attributes rated 1–20, shown alongside a FIFA-style overall (OVR) and potential stars.
- **Monthly development**: players improve or decline at the end of every month (formula below).
- **Continue button**: moves the calendar forward and runs the world in the background (injuries, AI transfers, bids for your players, finances, youth intakes, board reviews). It stops on match days and when news arrives.

## Game modes

| Mode | Description |
| --- | --- |
| **Create a Club** | Design a club (name, colours, crest, stadium) and start in the National League with a squad of journeymen and a £150k budget. Win promotion through five divisions. You are owner-manager, so you can't be sacked. |
| **Choose a Club** | Take over any of the 192 clubs. The board sets an objective based on your squad's strength, and you'll be sacked if their confidence hits 5%. |

## Screens (mobile-first)

The game is designed for phones in portrait. On a desktop it runs in a centred phone-width column.

- **Bottom tab bar**: Home (club overview: tactics, fixtures, top players, table, news), First Team (squad and tactics), Youth, Training, Transfers, Board.
- **Header**: Competitions 🏆, Inbox ✉️ and the menu (save, exit).
- **Continue bar**: sits just above the tabs, within thumb reach. It turns into **Play Match** on match days.
- Player profiles, position pickers and menus open as bottom sheets. The match screen uses a portrait pitch, with the controls at the bottom.

- The whole interface (header, tab bar, Continue button, selections, page tint, match screen accents) takes on **your club's colours**. Text colour is picked by contrast ratio so white, black or pale kits stay readable.

### Landscape layout

The game is designed for a phone held sideways (it also works on tablets and desktops):

- **Navigation:** a rail on the left, with Continue / Respond / Play match at the top right.
- **Screens:** they flow into two columns of cards.
- **Inbox:** the message list and the open message sit side by side.
- **Panels:** player profiles, tactics and other panels slide in from the right.
- **Match:** a horizontal pitch with commentary, stats and subs beside it, and the controls along the bottom.

Turn the phone upright and the portrait layout takes over. The installed app opens in landscape.

### Playing on your phone

- **Install it:** open the game in Safari (iPhone) or Chrome (Android) and choose **Add to Home Screen**. It installs like an app: it has its own icon, runs full-screen in landscape, and works offline once loaded.
- **Hosting on GitHub Pages:** this repo has a workflow at `.github/workflows/deploy.yml`. Turn it on once under **Settings → Pages → Source: GitHub Actions**. Every push to `main` (or this branch) then publishes the game.
- **Saves:** they're stored in that phone's browser, so a save made on your phone stays on your phone.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static build in dist/ (can be hosted anywhere, e.g. GitHub Pages)
npm test           # headless season simulations + engine tests
```

Games save to your browser's IndexedDB: automatically after every Continue and after every match, or manually from the sidebar.

## Tactics

Open **First Team → Tactics**, or press **Tactics** during a match (this pauses the game and changes apply immediately).

- **Presets**: Gegenpress, Tiki-Taka, Counter-Attack, Wing Play, Park the Bus, Route One. Each one sets the formation, instructions and roles, and you can tweak any of them afterwards.
- **Formation and mentality**: choose from every formation and five mentality levels. If you change formation mid-match, players on the pitch are re-slotted automatically and keepers stay in goal.
- **In possession**: passing (short/mixed/direct), tempo, width, attacking focus (left/centre/right), and play out from the back.
- **Out of possession**: pressing (low block/mid/high), defensive line, tackling, and offside trap.
- **Transition and game management**: counter-attack and time-wasting.
- **Player roles**: each slot has its own roles, e.g. Ball-Playing Defender, Wing-Back, Inverted Full-Back, Deep-Lying Playmaker, Mezzala, Inside Forward, Shadow Striker, Poacher, False Nine and Pressing Forward. Roles change how much a player attacks, defends, shoots and creates, and how quickly they tire.

Every option comes with a trade-off:

- Pressing high and playing at a fast tempo tire your players.
- A high line gets exposed by quick forwards.
- Getting stuck in leads to more fouls and cards.
- Counter-attacking works best when you have less of the ball.

## Player stats

Each match records these stats for every player: shots, shots on target, xG, key passes, xA, passes (completed/attempted), dribbles, tackles, interceptions, clearances, fouls, and for keepers, saves and goals conceded.

They appear in four places:

- The **Stats** tab on the player profile, with per-90 figures.
- The squad list, sortable by xG, key passes, pass % and defensive actions.
- The live match screen and post-match ratings.
- The **Competitions** leaderboards.

## European competitions

The Champions League, Europa League and Conference League follow UEFA's current format:

- **League phase** (Sep–Jan): 36 clubs in one table. Each club plays 8 different opponents (6 in the Conference League), 4 at home and 4 away. The draw avoids clubs from the same country where it can.
- **1st–8th** go straight into the round of 16, **9th–24th** play two-legged knockout play-offs (9th v 24th, 10th v 23rd …), and **25th–36th** are out.
- **Knockouts** (Feb–May): two-legged ties decided on aggregate, with penalties if level after the second leg. The final is a single match at a neutral venue at the end of May.
- **Prize money** for taking part, for each league-phase win or draw, and for every round reached. The winner also gets a reputation boost and a big lift in board confidence.

**2026/27** uses the real league-phase line-ups from UEFA's draw. From 2027/28 on, places come from the final tables:

| Country | Champions League | Europa League | Conference League |
| --- | --- | --- | --- |
| England, Spain | Top 5 | Next 2 | Next 1 |
| Italy | Top 4 | Next 3 | Next 1 |
| Germany | Top 4 | Next 2 | Next 1 |
| France | Top 3 | Next 3 | Next 1 |

The domestic cup winner takes the first Europa League place. The Europa League winner moves up to the Champions League, and the Conference League winner to the Europa League. The rest of each 36-team field is filled with the **rest-of-Europe clubs**, chosen by reputation. These clubs don't play a domestic league in the game. Their squads are generated, apart from a few real players who moved there in summer 2026 (e.g. Salah at Trabzonspor, Greenwood at Fenerbahçe, Leão at Galatasaray). You can view them, scout them and buy from them.

The league tables are coloured by European place, and the Competitions screen has a league-phase table, matchday fixtures and the knockout bracket for each competition.

Older saves pick up the new competitions at the start of the next season.

## Youth football

Every academy has real prospects where they could be found (researched for October 2026), topped up to 7–10 players with generated ones. Youth teams play a full season of their own:

| Competition | Clubs | Age |
| --- | --- | --- |
| Premier League 2 | Premier League | U21 |
| Professional Development League | Championship | U21 |
| EFL Youth Alliance | League One / League Two (one league each) | U18 |
| División de Honor Juvenil · Primavera 1 · U19 DFB-Nachwuchsliga · Championnat National U19 | top divisions | U19 |
| FA Youth Cup | top four English divisions (knockout) | U18 |
| UEFA Youth League | Champions League clubs: 6-game league phase, top 16 into knockouts | U19 |

- **Schedule**: youth leagues are a single round-robin on Mondays. Cup rounds run from November to the final in April.
- **Who plays**: youth squad players under the age limit, plus first-team players under the limit who aren't in the starting XI (as at real clubs).
- **Matches** are simulated from the strength of each youth XI. Players get appearances, goals, assists, ratings and the odd injury.
- **Development**: youth minutes count at half weight. A prospect who plays every week grows almost as fast as a first-team regular, and one who never plays grows much more slowly.
- **Trophies** go to the club's *Academy honours* (shown on the Board screen).
- **Youth screen**: shows your youth league table, fixtures and results, each prospect's youth stats, and the first-teamers getting youth minutes.
- **National League clubs** don't have a youth league.
- **Older saves** get the competitions from the next season. The real academy players only appear in new games.

## Club World Cup

The Club World Cup is held every four years (2029, 2033 …) in June, after the season ends.

- **Teams**: 32 clubs. Europe sends 12: the last four Champions League winners, then the strongest clubs, with at most two per country. The others are 6 from South America, 4 from Asia, 4 from Africa, 4 from North and Central America, 1 from Oceania and 1 for the host.
- **Format**: eight groups of four, then single-match knockouts from the round of 16. Every match is at a neutral venue, and there's big prize money.
- **Clubs from outside Europe**: 35 of them, including Flamengo, Palmeiras, River Plate, Boca Juniors, Al Hilal, Al Nassr, Inter Miami, Club América, Al Ahly and Auckland City. They have generated squads plus a few well-known players (Messi, Ronaldo, Son, Watkins, Martinelli …). Their squads are as of 2025/26 and may be out of date.

## International tournaments

| Tournament | Editions in the game | Nations | When |
| --- | --- | --- | --- |
| World Cup | 2030 (Spain/Portugal/Morocco), 2034 (Saudi Arabia, Nov–Dec), then every 4 years | 48 | June–July |
| European Championship | 2028 (UK & Ireland), 2032 (Italy/Turkey), every 4 years | 24 | June–July |
| Copa América | 2028, every 4 years (CONMEBOL + 6 guests) | 16 | June–July |
| Africa Cup of Nations | 2027 (Kenya/Uganda/Tanzania), every 2 years | 24 | June–July |
| Asian Cup | 2027 (Saudi Arabia), every 4 years | 24 | January |

- **Hosts**: where none has been announced, the strongest nation hosts.
- **Squads**: 26 per nation, picked ten days before the start from the best players of that nationality at clubs. Any places the game has no player for are filled at the nation's usual level.
- **Qualifying**: not played. The strongest teams in each confederation qualify, with a little luck.
- **Matches**: simulated from team strength, so tournaments don't slow the game down.
- **Effects on players**: they earn caps and international goals, can get injured, and the winners get a morale boost.
- **Mid-season tournaments** (the Asian Cup, and the 2034 World Cup): called-up players miss club matches until their country is knocked out. They show a ✈️ in the squad list.

## Fixtures

- **League fixtures** are a new random double round-robin every season. The order is random, but every club plays every other club home and away. They aren't the real 2026/27 fixture lists.
- **Cup and European draws** are also random. European draws avoid same-country ties in the league phase, and tournament draws are seeded with pots.
- **Repeatability**: every save has its own seeded random generator, so the same save always plays out the same way from the same point.

## Season calendar

- **1 Jul**: the season starts. Fixtures are drawn, budgets and board objectives are set, and the summer window opens.
- **Aug–May**: league games on Saturdays (Tuesdays too, for 24-team divisions). Domestic cups are played on Wednesdays, the Champions League on Tuesdays, and the Europa League and Conference League on Thursdays.
- **1 Sep / 1 Feb**: the windows close. **1–31 Jan**: the winter window. Free agents can be signed at any time.
- **15 Mar**: youth intake.
- **5 Jun**: the season ends. Promotion and relegation (3 up/3 down in most English divisions), prize money, contract expiries, retirements and the season review.

## Inbox

The inbox works like Football Manager's:

| Message | When | From |
| --- | --- | --- |
| Match preview: opponent's position, form, shape, danger man, top scorer, missing players, our team news, assistant's verdict | Match day | Assistant Manager |
| Match report: goals with minutes, possession, shots, xG, corners, player of the match, our best/worst ratings, league position, assistant's view | After your match | Assistant Manager |
| Weekly training report: stand-out and poor trainers (these nudge morale), best academy player, youngsters pushing for a chance, injuries, players needing a rest, unhappy players | Mondays | First-Team Coach |
| League round-up: weekend results, biggest win, top four and your position | Mondays | Media |
| Monthly awards: Player, Young Player and Manager of the Month in your league | 1st of the month | League |
| Breaking news, transfers, injuries, board, youth, development and season reviews | As they happen | Various |

- **Quiet messages**: routine reports (previews, match reports, training, round-ups, awards you didn't win) don't stop **Continue**. Breaking news and other important messages still do.
- **Filters**: All, News, Matches, Squad and Club.

## Decisions you can't skip

Some inbox items need an answer. While one is open, **Continue becomes "Respond"** and takes you there. The calendar won't move, and you can't kick off, until you answer.

| Decision | When | Options |
| --- | --- | --- |
| Transfer bid for one of your players | Window open, at random | Accept · Ask for 25% more (the buyer may pay or walk away) · Reject |
| Squad registration (league, and Europe if you're in it) | 1 September and 1 February | Pick squad (up to **25 players aged 21+**; under-21s are exempt) · Use the suggested squad |
| Contract talks: key players in their final year want a new deal | 15 January | Offer 3 years at their demand · Let it run down (morale drops; they leave in summer) |
| Unhappy player wants a word | 1st of the month (morale under 35) | Promise more game time · Transfer-list them · Tell them to fight for their place |
| Press conference before big games (top-six opponents, European knockouts, cup semis and finals) | Match day | Confident · Cautious · Mind games (can backfire) |

**Registration rules:**
- Senior players left out can't play league or European games until the next registration window. They're marked 🚫 in squad lists.
- Signings after the deadline are registered automatically if there's room.
- Registration resets each summer.

Bids can also be handled from the Transfers screen, which closes the inbox item too.

## Scripted events

- **Manchester City FFP ruling (2026/27)**: when City have five league games left, they're docked 60 points for breaching financial rules, announced as breaking news. In testing they dropped from 4th to 20th and were relegated.
- **Deductions** show in the league tables as a red −60. The rules for deductions and one-off events live in `src/game/news.ts` (`scriptedEvents`).

## Meta players

In the match engine, pace and composure matter more than the overall rating suggests. So do dribbling and finishing for attackers, and tackling and positioning for defenders. A player whose attributes in these areas are above their overall level adds up to 4% more to the team (and one below it adds up to 4% less).

**Arsenal** players have meta attribute profiles. Their overall ratings are the same, but their attributes lean towards these areas:

- **Who it covers**: real players, academy prospects, generated squad players, future youth intakes, and anyone Arsenal sign. Signings are reshaped when they join, keeping their overall.
- **Team edge**: Arsenal also get a team-strength multiplier (`META_TUNING.edge` = 1.095). It's calibrated so they win about **65% of games against the rest of the big six** (Man City, Liverpool, Chelsea, Man United, Spurs), checked by `tests/meta.test.ts`. Without it the figure is about 48%. Over a season they typically win the league comfortably (around 95–105 points).
- **Changing it**: the club list and the edge are in `src/game/meta.ts`. Set the edge to 1 to keep only the attribute profiles.

## Player development: the monthly ratio

At the end of every month each player's overall changes by:

```
change = (yearly age curve / 12) × modifiers + noise(σ = 0.25)
```

**Yearly age curve** (OVR points per year before modifiers):

| Age | ≤17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31 | 32 | 33 | 34 | 35+ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Δ/yr | +6 | +5.5 | +5 | +4.5 | +3.5 | +2.5 | +1.8 | +1.2 | +0.6 | +0.3 | 0 | −0.3 | −0.6 | −1.2 | −1.8 | −2.5 | −3.2 | −4 | −5 |

**Growth modifiers** (when the curve is positive):

| Factor | Effect |
| --- | --- |
| Potential gap | × clamp(gap / 10, 0, 1.2). No growth once a player reaches potential |
| Training intensity | Low ×0.75 · Normal ×1.0 · High ×1.25 (high also gives 1.8× training injuries) |
| Training facilities | × (0.8 + 0.1 × level), so level 1 = ×0.9 and level 5 = ×1.3 |
| Playing time | × (0.35 + 0.85 × min(1, minutes / 300)), so a prospect who doesn't play grows at well under half speed. Youth squad players count as half a month |
| Form | × (1 + clamp((avg rating − 6.8) × 0.3, −0.2, +0.25)) |

**Decline** (negative curve) is softened by regular football (×0.9) and better facilities, and is worse without minutes (×1.1). Physical attributes drop first; experienced players can still gain decisions, composure and positioning.

The OVR change is spread across attributes: training-focus attributes get 2× weight and position-relevant attributes 1.5×.

Players who reach their potential while 27 or younger stay within about a point of it until the decline starts. Growth never pushes a player past their potential.

AI clubs give young prospects minutes: players aged 21 or under with room to grow get a selection bonus, which is bigger in domestic cup ties.

In a full simulated season, players aged 20 or under gain about +4.5 OVR on average, and players aged 33+ lose about −3.

## Club badges (logo packs)

Real club badges are trademarks, so none ship with the game, and each club gets a generated crest in its colours. As with Football Manager logo packs, you can add your own:

1. Collect badge images (PNG, JPG, SVG or WebP) named after the clubs, e.g. `Arsenal.png`, `manchester-united.png`, `Man Utd.png`, `FC Barcelona.svg`. Matching ignores case, accents and words like "FC", and knows common nicknames (Spurs, PSG, Man City…).
2. Open **☰ Menu → Club badges** (or **Club badges** on the title screen) and import all the files at once.
3. To set a single badge, use **Set badge** on a club's page, or on the Board screen for your own club.

**Football Manager logo packs** (e.g. sortitoutsi's Standard Logos) name every file by FM's internal club ID (`1234.png`) and don't include club names, so they can't be matched automatically. Import the images you want (your phone's file picker shows thumbnails), and anything the game can't match by name goes to **Match badges**. That screen shows one image at a time; search for the club and tap it. The badges inside the FM game itself are packed in FM's own archive format and can't be imported.

Badges are shrunk to 160px and stored in the browser on that device only. They're never uploaded or committed.

## Editing the data

All leagues, clubs and real players are in [`src/game/data/leagues.ts`](src/game/data/leagues.ts). The European competitions, rest-of-Europe clubs and 2026/27 line-ups are in [`src/game/data/europe.ts`](src/game/data/europe.ts). Club World Cup clubs, national teams and tournament schedules are in [`src/game/data/world.ts`](src/game/data/world.ts). Real academy players are in [`src/game/data/youthPlayers.ts`](src/game/data/youthPlayers.ts) and the youth competitions in [`src/game/data/youth.ts`](src/game/data/youth.ts). League line-ups and squads are for **2026/27, as of 15 October 2026** (after the summer window). They were researched from web reports, so some moves may be wrong or missing, and lower-league squads are only partly covered (generated players fill the gaps). Each line is easy to edit:

```
Club:   "Name|SHORT|primary|secondary|reputation|level|Stadium|capacity|crestPattern"
Player: "Name|POS|age|NAT|overall[|potential][|style]"
```

## Project layout

```
src/game/       pure TypeScript game engine (no UI)
  generate.ts     world creation, squads, youth
  match.ts        minute-by-minute match engine
  progression.ts  monthly development
  transfers.ts    bids, AI market, contracts
  season.ts       day/season loop (Continue)
  club.ts         finances and board
  competitions.ts fixtures, tables, cups
  europe.ts       Champions League / Europa League / Conference League
  world.ts        Club World Cup
  intl.ts         international tournaments (national teams)
  guests.ts       clubs outside the playable leagues
  youth.ts        youth leagues and cups
src/ui/         React screens and components
src/store.ts    game state store and IndexedDB saves
tests/          headless season simulations
```
