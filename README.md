# The FM Journey

A fast, bright football management game: a hybrid of Football Manager / Championship Manager depth and EA FC-style accessibility.

- **Real leagues and players**: the full English pyramid (Premier League → National League) plus La Liga, Serie A, Bundesliga and Ligue 1, with 1,100+ real players and generated depth players.
- **One-minute matches**: watch a live 2D match with commentary, shout tactical changes and make subs. Or take the instant result.
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

Tip: open it on your phone and use "Add to Home Screen" to get it full-screen.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static build in dist/ (can be hosted anywhere, e.g. GitHub Pages)
npm test           # headless season simulations + engine tests
```

Games save to your browser's IndexedDB: automatically after every Continue and after every match, or manually from the sidebar.

## Season calendar

- **1 Jul**: the season starts. Fixtures are drawn, budgets and board objectives are set, and the summer window opens.
- **Aug–May**: league games on Saturdays (Tuesdays too, for 24-team divisions). Domestic cups are played on Wednesdays and the Champions League on Tuesdays.
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

## Editing the data

All leagues, clubs and real players are in [`src/game/data/leagues.ts`](src/game/data/leagues.ts). Squads are based on the 2025/26 season, so some transfers may be out of date. Each line is easy to edit:

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
src/ui/         React screens and components
src/store.ts    game state store and IndexedDB saves
tests/          headless season simulations
```
