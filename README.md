# Find The Imposter — Pass & Play

A zero-dependency browser party game: one secret word, one hidden imposter, one phone passed
around the table. A local recreation of the Pass & Play mode on
[findtheimposter.com](https://findtheimposter.com/game).

Built with plain HTML, CSS and ES modules. Vite is only used as a dev server and bundler — no
framework and no backend. Online rooms connect browsers directly with PeerJS, using its public
signalling server; the host's tab is the room.

---

## Word bank

50 categories, three difficulty tiers, **2,200 crew/imposter pairs** — at least 12 per tier in every
category, so a full game on one category never repeats a word.

## Quickstart

Requires Node.js 18+ and npm 9+.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. For a production bundle:

```bash
npm run build     # writes main/dist/
```

`vite.config.ts` sets `root: 'main'`, so `npm run dev` always serves the live version.

---

## How a game runs

1. **Setup** — add 3 to 15 players (or randomize the order), pick categories and modifiers, choose
   Classic, Mr. White or Undercover.
2. **Reveal** — pass the device around; each player taps their card to see their role privately and
   hides it before passing on.
3. **Discussion** — a speaking order and countdown timer keep the table moving.
4. **Voting** — the device goes round again for a secret ballot. Each voter picks as many suspects
   as there are imposters.
5. **Result** — the ballot is read from the top down and scored against the real roles.

---

## Online rooms

Home → **Online** creates a host-authoritative room. Players join with a 4-letter code or the invite
link, and everything syncs over a peer-to-peer data channel:

- the host picks the mode, imposter count, difficulty and discussion timer in the lobby;
- roles and words are sent only to the player they belong to — nobody's browser receives the full
  assignment before the reveal;
- reveal → discussion → voting → results → victory all run from the host's snapshot, so every device
  sees the same round and the same timer;
- Mr. White mode includes his final guess, and Classic uses the same one-ballot, no-innocent rule as
  Pass & Play.

3 to 15 players. The host's tab is the server: if it closes, the room ends. There are no accounts, no
public room list and nothing stored on a server.

## Rules the app enforces

- **Classic** — the crew must catch *every* imposter without an innocent player in the accused
  group. An innocent in the group, a missed imposter, or a tie that leaves a crew member at the top
  hands the win to the imposters. There is no automatic word-guess win unless Last Chance is on.
- **Undercover** — everyone gets a word: the crew share one and the undercovers share a related but
  different one, so nobody can tell their side from their card. Accusations eliminate players until
  one side wins; a tie eliminates nobody and the table discusses again.
- **Mr. White** — a separate mode: the table shares one word and a single wordless player bluffs.
  If caught, he gets one guess at that word; accusations eliminate players until one side wins.
- **Last Chance** (Pass & Play only) — a caught imposter gets one guess at the secret word.
- **Guardian** — secretly shields one player from the accused group.
- **Chaos Mode** — random imposter count each game and a random round type every round.
- **Round types** — Hint, Question, Silent, Drawing.

Votes are counted the way the site does it: the accused group is the top vote positions, including
everyone tied at the cutoff for the last imposter slot.

---

## Project layout

| Path | Purpose |
| --- | --- |
| `main/index.html` | Shell: header, sound/rules buttons, confetti canvas |
| `main/game.js` | `ImposterGame` — state, screen machine, ballots, rendering |
| `main/words.js` | Word database (50 categories × easy/medium/hard pairs) + selection logic |
| `main/words-extra.js` | Generated pair bank (2,200 pairs total) merged into the database at load |
| `main/audio.js` | Synthesized Web Audio sound engine (no audio files) |
| `main/avatars.js` | Deterministic per-player avatar assignment |
| `main/assets/avatars/` | 16 DiceBear "Micah" SVGs, served locally |
| `main/style.css` | Dark site-matched theme and all screen layouts |
| `main/dist/` | Last production build |

`dev/`, `staging/` and `features/imposter-game/` are older promotions of the same game, kept as the
project's folder-branching record. `main/` is the live version.

---

## Docs

- [`docs/WALKTHROUGH.md`](docs/WALKTHROUGH.md) — install, run, play and troubleshoot
- [`docs/HANDOFF.md`](docs/HANDOFF.md) — architecture, state model, extension points
- [`docs/PROGRESS_REPORT.md`](docs/PROGRESS_REPORT.md) — what is emulated and what is not
- [`docs/SITE_NOTES.md`](docs/SITE_NOTES.md) — teardown of the original site's flows

---

## Notes

- There is no test suite. The previous Vitest setup and its fixtures were removed along with the
  game they tested; verify changes with `npm run build` and by playing a round.
- The word generator page, a public room browser, the six-language UI and the site's other games
  are **not** implemented. See `docs/PROGRESS_REPORT.md`.
- Avatars are Micah style by [Micah Lanier](https://dribbble.com/micahlanier) via
  [DiceBear](https://www.dicebear.com/styles/micah/), CC BY 4.0.
- The word bank holds **2,200 crew/imposter pairs** across 50 categories, with at least 12 pairs in
  every difficulty tier. Generated pairs come from
  [himehatsumi/impostor](https://github.com/himehatsumi/impostor) (public domain) and
  [GameSketchers/Game-WordList](https://github.com/GameSketchers/Game-WordList) (MIT), plus themed
  pools for categories those lists do not cover.
