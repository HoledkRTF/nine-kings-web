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
   - Undercover Mode: Mr. White Role (no word, last-chance guess)
   - Classic Mode: Imposter Hint (category shown to imposter)
   - Last Chance Guess (caught imposter guesses word)
   - Round type: Hint / Question / Silent / Drawing
4. Start game → reveal cards privately (pass phone) → discussion → voting (pass phone, secret ballot) → results → next round or victory.
- Supports 3–15 players; recommended 4–6 with 1 imposter for first round.

## Online flow (separate devices)
1. Create room (private or public) or join via 6-digit code / link / QR.
2. Lobby: players join, host starts when ready (up to 15).
3. Each player sees role on own device; clues given on turn; live voting.
4. Classic mode: crew must catch ALL imposters without accusing an innocent; no automatic word-guess win (Last Chance is Pass & Play only; Mr. White's guess is Undercover-only).

## Imposter Game Generator (`/imposter-game-generator`)
- Free sample: 25 words, 10 generations/day/browser.
- "Generate a word" → shows secret word; counter "Generated today: X/10".
- Explains roles: imposter gets nothing (or optional category hint).
- CTA to full game (create room / pass & play).

## Modes & variants
- **Classic**: imposter gets no word (optional category hint).
- **Undercover**: imposter gets a related but different word; Mr. White sub-role gets no word and a last-chance guess.
- **Football Imposter**: football-player categories.
- **Timer Imposter**: secret time instead of word.
- **Chaos Mode**: random imposter count, silent/question rounds.

## Rules & FAQ highlights
- 3+ players; Pass & Play up to 15; online rooms up to 15.
- 50+ categories, 6 languages (EN, AR, ES, FR, HI, DE).
- Free, no sign-up, no subscription.
- Tie rule (online, 1 imposter, optional roles off): crew wins if imposter is among highest-voted AND no crew member is also among highest-voted.
- Mr. White: only in Undercover; gets one guess at secret word if voted out.
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

## Emulation priorities for our app
1. Match Pass & Play flow (already mostly present).
2. Align Classic-mode win condition with site: no automatic word guess unless Last Chance enabled; Mr. White guess only in Undercover.
3. Tie handling per site's rule.
4. Category list expansion to 50+ and 6 languages (currently 5 cats, English only).
5. Online mode is out of scope for static version but could be added later.
6. Keep Chaos Mode semantics (random imposters, silent/question rounds).
7. Settings labels/wording should mirror site (e.g., "Imposter Hint", "Last Chance Guess", "Random Imposters").
