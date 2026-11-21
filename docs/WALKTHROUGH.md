# Walkthrough & Operations Manual

Everything needed to run, play and sanity-check Find The Imposter locally.

## 1. Prerequisites

- Node.js 18 or newer, npm 9 or newer
- A modern browser (Chrome, Edge, Firefox, Safari)
- No API keys, no database, no backend of your own — online rooms use PeerJS's public signalling
  server and connect players peer-to-peer

## 2. Install

```bash
npm install
```

Vite and TypeScript are dev dependencies. `peerjs` is the only runtime dependency and is loaded only
by the online room code; Pass & Play imports nothing from `node_modules`.

## 3. Run

```bash
npm run dev
```

Vite serves `main/` on `http://localhost:3000` (`root` is set in `vite.config.ts`). Python's
`http.server` also works if you ever need a plain static server, since the game needs no build step
in development.

## 4. Build

```bash
npm run build
```

Output lands in `main/dist/` with hashed asset names. `vercel.json` points the deployment at
`main/`, which is a valid static site either way.

## 5. Playing a round

### Setup
1. Open the app and press **Start Pass & Play** (or **Quick start with 4 players**).
2. Expand **PLAYERS** and add 3–15 names. Names must be unique; the ✕ removes a player and
   **🔀 Randomize player order** shuffles the seating for reveals and turns.
3. Expand **CATEGORIES** and pick one or more of the 50 categories, or **Select All Categories**.
4. Expand **IMPOSTERS** to choose 1–3 imposters (Mr. White mode is always one), toggle **Imposter
   Hint** (the imposter sees the category only) and **Random Imposters** (Chaos).
5. Expand **ROUNDS & TIMER** to pick the round type and discussion timer (Off, 1–5 minutes).
6. Pick a **game mode** — Classic, **Mr. White** (one wordless player) or **Undercover** (related
   word) — plus optional **Guardian Role** and **Last chance guess**.
7. Press **START GAME**.

### Reveal
Each player taps **TAP TO REVEAL**, reads their card, then taps **HIDE & PASS**. The last player's
button reads **START GAME** and drops into discussion.

### Discussion
The timer starts automatically when a time limit is set. **Next** advances the speaking spotlight.
**VOTE SOMEONE OUT** ends discussion; **END GAME** returns to setup.

### Voting
Each living player gets a private ballot screen listing everyone else. Tap up to `imposter count`
suspects, submit, and pass the device on. The Guardian picks a shield target on their own ballot.

### Result
Votes are shown ranked with who voted for whom, then scored:

- **Classic** — the game compares the accused group with the imposter team immediately. Crew win
  only if the group is exactly the imposter team. With **Last chance** on, a caught imposter gets one
  guess before the verdict is settled.
- **Mr. White / Undercover** — accused players are eliminated; **CONTINUE TO NEXT ROUND** reopens
  discussion. A tie eliminates nobody, and a caught Mr. White gets his one guess in Mr. White mode.
- **Victory** — role reveal, awards (Sharp eye / Red herring), secret word, leaderboard and a share
  button (Web Share API, clipboard fallback).

**Play Again** deals a new round with the same table and carries scores forward.

### Online play
1. Home → **Online** → enter a name → **Create room**. Pick the mode, imposter count, difficulty and
   discussion timer in the lobby.
2. Share the 4-letter code or **Copy link**; guests open the link (or enter the code) and join.
3. The host starts once at least 3 players are connected.
4. Each device taps **TAP TO REVEAL** to see its own word, then **I'M READY**. Discussion starts when
   everyone is ready.
5. The host opens voting when the table has had its turns. Every living player votes once; results
   sync to all devices. Ties eliminate nobody in Mr. White / Undercover; Classic is one ballot.
6. A caught Mr. White gets one private guess at the secret word. The host reveals imposters for the
   victory screen, then **Play again** returns everyone to the lobby.

The host's tab holds the room state — keep it open. Guests only ever receive their own role and word,
so the browser devtools of a guest cannot reveal the imposter early.

## 6. Modifiers reference

| Setting | Effect |
| --- | --- |
| Imposter Hint | Imposter sees the category instead of the word |
| Imposters | 1–3, capped at half the table |
| Random Imposters | Chaos: imposter count re-rolled each game, round type re-rolled each round |
| Last chance guess | Caught imposter gets one word guess (Pass & Play only) |
| Guardian Role | One crew member shields a player from the accused group |
| Game mode | Classic, Mr. White (one wordless player) or Undercover (related word) |
| Round Type | Hint, Question, Silent or Drawing clue format |
| Time Limit | Off or 1–5 minute discussion timer |

## 7. Troubleshooting

- **Sound is silent** — browsers only allow audio after a gesture; press any button first. The header
  speaker icon toggles mute.
- **Fonts look different** — `style.css` imports Inter/Outfit/Space Grotesk from Google Fonts.
  Offline, the system font stack is used and nothing else changes.
- **Blank page** — check the console. `main/dist/index.html` references hashed files, so serve the
  built folder as a whole rather than opening the file directly.
- **Wrong screen after edits** — the app keeps state in memory only; reload to start from Home.

## 8. Verifying changes

There is no automated test suite. A change is verified by:

```bash
npm run build
```

and by playing one short round covering the affected screen (setup → reveal → discussion → vote →
result).
