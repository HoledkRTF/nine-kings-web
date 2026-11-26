# Developer Handoff: Find The Imposter

## 1. What this is

A client-only Pass & Play imposter game. Plain ES modules, HTML and CSS; Vite is a dev server and
bundler only. All game state lives in memory for the session — nothing is persisted, and there is no
server, account or network call at runtime.

```
main/index.html
  ├── main/game.js      ImposterGame: state, screen machine, ballots, all rendering
  ├── main/words.js     WORD_DATABASE, CATEGORY_LABELS, CATEGORY_ICONS, getWordSelection()
  ├── main/audio.js     sound singleton (Web Audio synthesis)
  ├── main/avatars.js   stable per-roster avatar assignment
  ├── main/style.css    theme tokens + screen layouts
  └── main/assets/avatars/*.svg
```

## 2. State model

Everything hangs off `ImposterGame.state` (`main/game.js`, constructor):

| Group | Fields |
| --- | --- |
| Setup | `mode` (`classic`/`mrwhite`/`undercover`), `playMode` (`pass`/`online`), `players[]`, `numImposters`, `isChaosMode`, `selectedCategories`, `customWords`, `difficulty`, `timeLimit`, `roundType`, `isGuardianEnabled`, `isImposterHintEnabled`, `isLastChanceEnabled` |
| Session | `screen`, `revealIndex`, `isCardRevealed`, `scores`, `usedWords` |
| Round | `secretWord`, `secretCategory`, `imposterWord`, `startingPlayerName`, `remainingSeconds`, `timerRunning`, `timerInterval`, `undercoverRound` |
| Ballot | `votingQueue`, `currentVoterIndex`, `currentSelectedAccused`, `votes[]`, `voteResults`, `eliminatedThisRound`, `classicResult`, `isTie`, `pendingWinner`, `firstRoundVotes`, `winner` |
| Roles | each player: `{ name, role: 'crew'|'imposter'|null, isEliminated, isMrWhite, isGuardian }` |
| Online | `online.{ role, room, client, code, status, state, you, isRevealed, selectedVote }` mirrors the latest host snapshot; the truth lives in `HostRoom` in `main/online.js` |

`player.role` is authoritative for outcomes. `isMrWhite` and `isGuardian` are overlaid on top of a
role; Mr. White is always an imposter. `mode` chooses how the odd player is worded:

- `classic` — the imposter(s) get no word and know their role.
- `mrwhite` — exactly one imposter, flagged `isMrWhite`, with no word; everyone else shares
  `secretWord`.
- `undercover` — one shared crew word (`secretWord`) plus one shared related word (`imposterWord`)
  held by the undercovers; no Mr. White.

`state.activeImposterCount` is the number of players actually dealt an imposter role, and it sizes
ballots and the accused-group cutoff.

## 3. Screen machine

`render()` switches on `state.screen` and calls a matching `renderXScreen()` + `bindXEvents()` pair,
replacing `#screen-container`'s HTML:

```
home → setup → reveal → discussion → voting_pass → voting_input
     → voting_results → (mrwhite_guess | imposter_guess) → victory

online_entry → online_lobby → online_reveal → online_discussion → online_vote
             → online_guess → online_results → online_victory
```

Every state change is `this.state.x = …; this.render();` — there is no virtual DOM and no partial
update layer. Screens that need to keep in-page identity (`reveal` card flip, timer polling) mutate
DOM nodes directly inside their bind function instead of re-rendering.

`render()` also calls `setAvatarRoster()` on each paint so avatar assignment stays stable per name,
and retriggers the `screen-enter` animation when `_lastScreen` changes.

## 3b. Online rooms

`main/online.js` is a second, host-authoritative engine used only by the online screens. It does not
import the pass-and-play game class; the two sides exchange two JSON snapshots instead.

- `HostRoom` creates a PeerJS peer with the id `fti-v1-<CODE>` and owns players, roles, words, votes,
  the timer and the winner. Guests connect to that id and send `hello`, `ready`, `vote` and `guess`;
  `isHostIntent()` rejects anything that would let a guest drive the room.
- `publish()` sends a public snapshot (`publicState()`) plus a per-player private snapshot
  (`privateFor()`), so roles and the secret word are never broadcast. Public roles appear only at
  victory, so a guest's devtools cannot reveal the imposter early.
- Host actions come from the same UI: `startGame`, `startVoting`, `nextRound`, `showVictory`,
  `playAgain`, `submitGuess`, `skipGuess`.
- Classic resolves as one ballot: the accused group is the top vote positions including ties at the
  cutoff, and the crew win only if that group is exactly the imposter team. Mr. White and Undercover
  eliminate one player per round; catching Mr. White moves the room to `guess`, where only his
  client gets a guess box.
- **Seats survive a drop.** A guest that disconnects keeps their row in the room (marked offline);
  `GuestClient` retries with backoff (8 attempts, then gives up) and re-sends
  `hello { resume: true, seatKey }`. Each guest seat carries a secret seat key issued in `welcome`
  and stored on that device as `fti-seat` (`{code, name, seatKey}`), so a reload can reclaim the
  seat immediately — even while the host still believes the old connection is alive, which is the
  case PeerJS does not always report. `HostRoom.seatFor` requires both the typed name and either
  the matching seat key or an offline/dead connection, then `adoptSeat` swaps the connection and
  reissues the current phase and role. Clearing storage still rejoins by name once the old link is
  gone, and a stranger using a live player's name without the key gets `name-taken`/`in-progress`.
- **Liveness:** a seated guest sends `{type:'ping'}` every 5s (the host answers `pong`);
  `HostRoom.sweepSeats` runs every 15s and marks a seat offline after two quiet minutes, since a
  phone that walks out of Wi-Fi often never fires a PeerJS `close`. That frees the seat for a
  rejoin and stops a missing ballot from blocking vote resolution.
- **Moderation:** guests are shown with an Offline tag and the host can remove them
  (`kick(name)` → `data-kick` button). In the lobby any guest can go; mid-game `kick` only accepts a
  seat that is offline or silent, so a rival cannot be booted during a round. `publicState` marks a
  guest `silent: true` once three 5s pings are missed (>20s), and the reveal/discussion/vote/results
  screens show those seats in a host-only "Not at the table" card with the same remove button;
  removal prunes `turnOrder` and re-runs `maybeStartDiscussion`/`maybeResolveVotes`, so the round
  finishes without the missing ballot. A seat the sweep retired re-arms on its next message, so a
  phone that comes back is not listed as removable. A deliberate leave sends `{type:'leave'}` and
  frees the seat.
- **Leaving is always confirmed:** `leaveOnlineRoom()` (lobby, connect card, victory screen) asks
  "Leave the room?" / "Close the room?" with `Stay` + `Leave room`/`Close room`, and the Pass &
  Play `QUIT GAME` buttons on the reveal and both voting screens now route through
  `confirmQuitGame()` ("Quit this game?" → `Keep playing` / `Quit game`) instead of dropping
  straight back to setup. `showConfirmModal(title, message, onConfirm, {confirmLabel, cancelLabel})`
  takes the labels and focuses Cancel so a held Enter or double tap cannot confirm by itself.
- **Host closes the room:** `HostRoom.close()` broadcasts `{type:'closed'}` before tearing down, so
  guests land on the `online_closed` screen with the last roster/vote rather than a bare error.
  That screen offers a rejoin attempt for the same code and name.
- `game.js` loads this module with a dynamic `import()` (`loadOnline()`); PeerJS and the room layer
  never ship in the Pass & Play bundle. The pure helpers live in `main/online-shared.js`.
- The lobby renders a join QR on demand (`main/vendor/qr.mjs`, `qrcode-generator`, MIT) for the
  invite link.
- The host's browser is the server. There is no matchmaking and no server-side persistence.

## 3c. Hidden tell marker

`bindTellCode()` in `game.js` listens for the typed code `pedophilerep` anywhere outside a text field
and toggles `tellEnabled` (remembered in `localStorage` as `fti-tell`). While it is off nothing is
drawn at all, so the marker cannot be discovered by accident; typing the code again switches it off.
A phone has no keyboard to type it on, so there is a touch route too: five taps with one finger
inside the bottom-right 64px corner within three seconds fire the same `toggleTell()`. The gesture
is matched on document `pointerdown` coordinates instead of an invisible overlay, so it never
swallows a tap meant for a real button, and each tap outside the corner clears the count so a few
stray taps can never accumulate into it. Both routes toggle; neither is advertised in the UI.
Once on, `ownTellRole()`, `tellDot(name)` and `updateTellSelf()` drive a deliberately subtle 1px
pixel fixed in the very bottom-right corner (`#tell-self`), painted to match the page background
there — being the imposter only shifts it a couple of channel steps, so nothing appears or
disappears. Known imposter names get a 2px dot at 6% white. It renders only from roles the device already
knows: pass & play (current reveal/assigned roles), the online host (room state), and a guest's own
role. Guests do not receive other players' roles before victory, so their name dots appear only once
roles go public. Keep it out of the UI copy; it is a local debug/owner hint, not a game feature.

## 3d. Device-local memory

All optional, all best-effort writes wrapped in `try`:

| Key | Contents |
| --- | --- |
| `fti-name` | Last online display name |
| `fti-tell` | Tell marker armed (`'1'`) |
| `fti-players` / `fti-scores` | Pass & play roster and running scoreboard, restored on load |
| `fti-prefs` | Mode, difficulty, round type, imposters, timer, categories and toggles |
| `fti-stats` | `{ games, crewWins, imposterWins, imposters: { name: count } }`, shown on the victory screen |
| `fti-banned-pairs` | `crew::imposter` pairs flagged "too similar" (victory screen button); `getWordSelection` skips them |
| `fti-muted` | Sound preference, owned by `audio.js` |
| `fti-seat` | `{ code, name, seatKey }` for the last online room, used to reclaim that seat after a reload |

`getWordSelection(selected, isUndercover, difficulty, usedWords, customWords, bannedPairs)` takes the
ban list as its sixth argument; `HostRoom` receives the host device's list at construction.

## 4. Ballot resolution (the part to read before touching rules)

`resolveVotes()` builds `voteTallies`, then `getAccusedGroup()` selects the accused group: the highest
vote positions, including everyone tied at the cutoff for the last imposter slot. The Guardian's
protected player is removed from that group (with `shieldSaved`).

- **Classic** → `resolveClassicBallot()` decides immediately. Crew win requires the accused group to
  be exactly the imposter team: no crew member in it and no imposter missing from it. Otherwise the
  imposters win. Last Chance diverts to `imposter_guess` first.
- **Undercover** → accused players are eliminated (unless it is a tie), then survival counts decide:
  zero living imposters = crew win, imposters ≥ living crew = imposter win, otherwise next round.
  A caught Mr. White (Mr. White mode) triggers `mrwhite_guess`, and a correct guess wins for the
  imposters before the crew-win check.
- Ballots read the top `activeImposterCount` positions — one for each player dealt an imposter role.

Scores: crew member +5 on a crew win, imposter +10 on an imposter win. `firstRoundVotes` is kept for
the victory screen's "Sharp eye" award.

## 5. Word selection

`getWordSelection(selectedCategories, isUndercover, difficulty, usedWords, customWords)` in
`words.js` picks a random category from the selection, then a random pair of the chosen difficulty,
preferring words not in `usedWords`. A pair is `{ crew, imposter }`, where `imposter` may be a string
or an array of options. Undercover returns the imposter word; Classic returns `null` and the app
shows the category instead.

Two expansion layers sit on top of the base data and are merged at module load by
`mergeExtraPairs()` before a final pass that keeps one crew word per tier:

- `WORD_EXPANSION` in `words.js` — hand-curated pairs.
- `GENERATED_PAIRS` in `words-extra.js` — pairs built from open word lists
  ([himehatsumi/impostor](https://github.com/himehatsumi/impostor), public domain;
  [GameSketchers/Game-WordList](https://github.com/GameSketchers/Game-WordList), MIT) plus themed
  word pools. The generator picked distinct crew words per tier and avoided pairs already present.

Adding a category means three edits in `words.js`: the entry in `WORD_DATABASE` (with `easy`,
`medium`, `hard` arrays), a label in `CATEGORY_LABELS`, and an emoji in `CATEGORY_ICONS`. The setup
screen and selection logic pick it up automatically.

## 6. Audio, haptics, avatars

- `audio.js` exposes a `sound` singleton that synthesizes every effect (tones, noise bursts, drones)
  with oscillators. `sound.toggleMute()` is wired to the header speaker button.
- `buzz()` wraps `navigator.vibrate` defensively; unsupported devices are ignored.
- `avatars.js` hashes names into 16 palettes, then resolves collisions across the sorted roster, so a
  player keeps the same character all session.

## 7. Conventions

- No build-time dependencies in game code — import only sibling modules.
- Escape user-supplied names when adding new HTML interpolation; the current templates interpolate
  player names directly into a handful of attributes.
- All timers must be cleared through `pauseTimer()`; `timerInterval` is the only live interval.
- `window.__imposterGame` is exposed for console poking (`__imposterGame.state`) — useful for
  jumping to a screen while developing: set `state.screen` then call `render()`.

## 8. Known gaps

- No host migration: if the host tab closes, the room is over (guests get the closed screen).
- A 1-pixel tell marker matches the page gradient by computation only; it has not been eyeballed on
  a physical screen.
- The tell code is keyboard-only, so it cannot be typed on a phone.
- UI is English-only; the original site ships six languages.
- No automated tests; `vitest` was removed with the previous game. Verify with `npm run build` plus
  a played-through round.
- `dev/`, `staging/` and `features/imposter-game/` hold older copies of the same files; they are
  not built and will drift.
