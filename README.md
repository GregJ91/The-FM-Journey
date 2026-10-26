# The FM Journey

A fast, modern football management game for mobile: a hybrid of Football Manager / Championship Manager depth and EA FC-style accessibility.

- **Real leagues and players**: the full English pyramid (Premier League → National League) plus La Liga, Serie A, Bundesliga and Ligue 1, with 1,100+ real players and generated depth players.
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

Tip: open it on your phone and use "Add to Home Screen" to get it full-screen.

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

## Season calendar

- **1 Jul**: the season starts. Fixtures are drawn, budgets and board objectives are set, and the summer window opens.
- **Aug–May**: league games on Saturdays (Tuesdays too, for 24-team divisions). Domestic cups are played on Wednesdays, the Champions League on Tuesdays, and the Europa League and Conference League on Thursdays.
- **1 Sep / 1 Feb**: the windows close. **1–31 Jan**: the winter window. Free agents can be signed at any time.
- **15 Mar**: youth intake.
- **5 Jun**: the season ends. Promotion and relegation (3 up/3 down in most English divisions), prize money, contract expiries, retirements and the season review.

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
| Playing time | × (0.6 + 0.6 × min(1, minutes / 300)). Youth squad players count as half a month |
| Form | × (1 + clamp((avg rating − 6.8) × 0.3, −0.2, +0.25)) |

**Decline** (negative curve) is softened by regular football (×0.9) and better facilities, and is worse without minutes (×1.1). Physical attributes drop first; experienced players can still gain decisions, composure and positioning.

The OVR change is spread across attributes: training-focus attributes get 2× weight and position-relevant attributes 1.5×.

In a full simulated season, players aged 20 or under gain about +5 OVR on average, and players aged 33+ lose about −3.

## Club badges (logo packs)

Real club badges are trademarks, so none ship with the game, and each club gets a generated crest in its colours. As with Football Manager logo packs, you can add your own:

1. Collect badge images (PNG, JPG, SVG or WebP) named after the clubs, e.g. `Arsenal.png`, `manchester-united.png`, `Man Utd.png`, `FC Barcelona.svg`. Matching ignores case, accents and words like "FC", and knows common nicknames (Spurs, PSG, Man City…).
2. Open **☰ Menu → Club badges** (or **Club badges** on the title screen) and import all the files at once.
3. To set a single badge, use **Set badge** on a club's page, or on the Board screen for your own club.

**Football Manager logo packs** (e.g. sortitoutsi's Standard Logos) name every file by FM's internal club ID (`1234.png`) and don't include club names, so they can't be matched automatically. Import the images you want (your phone's file picker shows thumbnails), and anything the game can't match by name goes to **Match badges**. That screen shows one image at a time; search for the club and tap it. The badges inside the FM game itself are packed in FM's own archive format and can't be imported.

Badges are shrunk to 160px and stored in the browser on that device only. They're never uploaded or committed.

## Editing the data

All leagues, clubs and real players are in [`src/game/data/leagues.ts`](src/game/data/leagues.ts). The European competitions, rest-of-Europe clubs and 2026/27 line-ups are in [`src/game/data/europe.ts`](src/game/data/europe.ts). League line-ups and squads are for **2026/27, as of 15 October 2026** (after the summer window). They were researched from web reports, so some moves may be wrong or missing, and lower-league squads are only partly covered (generated players fill the gaps). Each line is easy to edit:

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
src/ui/         React screens and components
src/store.ts    game state store and IndexedDB saves
tests/          headless season simulations
```
