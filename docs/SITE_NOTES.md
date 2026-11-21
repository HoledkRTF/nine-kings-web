# findtheimposter.com — Emulation Notes

Captured from https://findtheimposter.com/game and linked pages. Goal: emulate the official site's UX/flow in our local app.

## Global chrome
- Top header: logo "Find The Imposter", language picker (EN/AR/DE/FR/ES/HI with flags), Discord link, "Games" button, profile/avatar (guest supported).
- Bottom mobile nav: Home / Games / Join (dialog) / Friends / Sign in.
- Dark theme (#0d0f17), red/cyan accents, Inter + Space Grotesk fonts.
- Ads: AdSense, hidden on active game routes.

## Page: `/game` (Imposter Game Online) — main entry
Two tabs at top:
1. **Online** — "Play remotely with friends" (selected by default).
2. **Pass & Play** — "Play locally on one device".

Sections:
- **Join with Code**: 6-digit numeric input + "Join" button.
- **Create Online Room** button (primary pill).
- **Browse Public Rooms**: language filter chips (All, EN, AR, DE, FR, ES, HI), refresh button, room cards (icon, host/name, badges, player avatars, join).
- Settings (gear) + How to Play (?) buttons on title card.

## Pass & Play flow (one device)
1. Add 3–15 players (names). Randomize option.
2. Pick word category (50+ categories; "Select All" toggle).
3. Settings/modifiers:
   - Number of Imposters (1–3, or Random Imposters in Chaos)
   - Discussion Timer (Off/1/2/3/4/5 min)
   - Chaos Mode (random twists: random imposter count, Silent rounds, Question rounds)
   - Guardian Role (shields a player)
   - Game mode: Classic / Mr. White (one wordless player) / Undercover (related word)
   - Classic Mode: Imposter Hint (category shown to imposter)
   - Last Chance Guess (caught imposter guesses word)
   - Round type: Hint / Question / Silent / Drawing
4. Start game → reveal cards privately (pass phone) → discussion → voting (pass phone, secret ballot) → results → next round or victory.
- Supports 3–15 players; recommended 4–6 with 1 imposter for first round.

## Online flow (separate devices)
1. Create room (private or public) or join via 6-digit code / link / QR.
2. Lobby: players join, host starts when ready (up to 15).
3. Each player sees role on own device; clues given on turn; live voting.
4. Classic mode: crew must catch ALL imposters without accusing an innocent; no automatic word-guess win (Last Chance is Pass & Play only; Mr. White mode has its own guess).

## Imposter Game Generator (`/imposter-game-generator`)
- Free sample: 25 words, 10 generations/day/browser.
- "Generate a word" → shows secret word; counter "Generated today: X/10".
- Explains roles: imposter gets nothing (or optional category hint).
- CTA to full game (create room / pass & play).

## Modes & variants
- **Classic**: imposter gets no word (optional category hint).
- **Mr. White**: everyone shares one word except a single wordless player, who gets one guess at it if voted out.
- **Undercover**: imposter gets a related but different word and does not know their role.
- **Football Imposter**: football-player categories.
- **Timer Imposter**: secret time instead of word.
- **Chaos Mode**: random imposter count, silent/question rounds.

## Rules & FAQ highlights
- 3+ players; Pass & Play up to 15; online rooms up to 15.
- 50+ categories, 6 languages (EN, AR, ES, FR, HI, DE).
- Free, no sign-up, no subscription.
- Tie rule (online, 1 imposter, optional roles off): crew wins if imposter is among highest-voted AND no crew member is also among highest-voted.
- Mr. White: its own mode; gets one guess at the secret word if voted out.
- Last Chance Guess: optional, Pass & Play only.
- Imposter Hint: category only, not a clue word.

## Other games on site (for reference)
- Estimation Game (2–12, closest guess wins, points by % distance)
- Mafia/Werewolf (4–15, online or pass-and-play, narrator)
- Timer Imposter, Guess the Jar, Guess Who, Football Tic-Tac-Toe, Football Bingo, 90 Minutes, Word Connect, Hangman, Charades Generator, Word Search, Spyfall, Guess the Player, Football Imposter.

## Pages
- `/` Home
- `/games` Games hub
- `/game` Imposter Game (this doc)
- `/imposter-game-rules` Rules & How to Play
- `/faq` FAQ
- `/imposter-game-generator` Word generator
- `/timer-imposter`, `/estimation-game`, `/mafiagame`, etc. (variants)
- `/blog/*` articles/guides

## Emulation status for our app

1. **Pass & Play flow** — done: home (Online/Pass tabs), setup panels, private reveal, discussion
   with speaking order and timer, pass-the-device ballot, ranked results, victory and leaderboard.
2. **Classic win condition** — done: crew must include every imposter in the accused group with no
   innocent player. No automatic word guess unless Last Chance is on; Mr. White mode always carries
   its own guess.
3. **Tie handling** — done: the accused group is the top vote positions including ties at the
   cutoff, so a tie that leaves an innocent at the top loses for the crew. Undercover ties eliminate
   nobody and replay the round.
4. **Categories** — done: 50 categories, three difficulty tiers. **Open:** the site's six languages
   (EN, AR, DE, FR, ES, HI) and RTL layout.
5. **Online mode** — done: host-authoritative peer-to-peer rooms over PeerJS with 4-letter codes
   and invite links. Roles are delivered privately, and reveal, discussion timer, voting, results
   and Mr. White's guess stay in sync. No public room browser or matchmaking.
6. **Chaos Mode** — done: random imposter count per game, random round type (hint / question /
   silent / drawing) every round, plus Guardian, Imposter Hint and Last Chance, with Mr. White as its
   own mode.
7. **Wording** — done: labels mirror the site ("Imposter Hint", "Last Chance Guess", "Random
   Imposters", "Select All Categories", "Game Mode").

### Not planned here
- Word generator page (`/imposter-game-generator`) and the six-language UI.
- The site's other games (Mafia, Spyfall, Timer Imposter, Estimation, football titles).
- Accounts, friends, Discord, ads.
