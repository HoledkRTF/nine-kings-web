# Progress Report: Find The Imposter Emulation

## 1. Executive summary

The workspace now contains a single working product: a Pass & Play imposter game that mirrors the
flow, rules and visual language of `findtheimposter.com/game`. It is client-only, dependency-free at
runtime, and builds to a static bundle.

The 9 Kings canvas prototype, its TypeScript engine, its Vitest suite and the planning documents
that described it no longer exist in the codebase. The documentation in this folder describes only
the imposter game.

## 2. What works today

| Area | State |
| --- | --- |
| Pass & Play flow | Home → setup → private reveal → discussion → secret ballot → result → victory |
| Online rooms | Host-authoritative PeerJS rooms: 4-letter code or invite link, private roles, synced reveal/discussion/vote/results, all three modes, Mr. White's guess |
| Classic mode | Site rule: crew must catch every imposter with no innocent in the accused group |
| Undercover mode | One shared crew word + one shared related word (always different), undercovers unaware, card faces identical |
| Mr. White mode | Everyone shares one word but a single wordless player; one final guess when caught |
| Last Chance | One imposter word guess after being caught (Pass & Play only) |
| Guardian | Secret shield removes one player from the accused group |
| Chaos Mode | Random imposter count per game, random round type every round |
| Ballot reading | Top vote positions including ties at the cutoff |
| Tie handling | Classic: tie that includes a crew member loses; Undercover: no elimination, replay round |
| Word bank | 50 categories, 2,200 pairs, at least 12 per difficulty tier, no repeats within a session |
| Players | 3–15, unique names, avatars, randomize order, persistent session scores |
| Timer | Off/1–5 min, pause, +30 s, warning states |
| Polish | 3D card flip, confetti, Web Audio SFX, haptics, match awards, share result |

## 3. Landed in this pass

1. Documentation rewritten for the real app; stale test instructions, 9 Kings design docs and the
   dead Vitest/branch scripts removed.
2. Ballot resolution replaced: instead of eliminating every tied player, votes are read by top vote
   positions with the site's tie outcome, and Classic now resolves the round using the site's
   "catch every imposter, accuse no innocent" rule.
3. Category bank expanded from 45 to 50 (Office Life, Internet Culture, Beach & Vacation,
   Music & Artists, Fairy Tales) with all three difficulty tiers, then filled to at least 12 pairs
   per tier across all 50 categories (2,200 pairs total) from open word datasets and themed pools.
4. Chaos Mode now re-rolls the round type each round, not just the imposter count.
5. Player order randomizer and the site's recommended first-game hint added to setup.
6. Rules modal updated to state the three game modes, ties and Last Chance explicitly.

## 4. Not emulated

| Feature | Why | Next step |
| --- | --- | --- |
| Public room browser / matchmaking | Rooms are code-only and hosted by a player; a public list needs a central service and moderation | Would need a room directory service |
| Six-language UI (EN, AR, DE, FR, ES, HI) | Word bank and all copy are English | Requires translation of ~1,200 pairs plus RTL layout work |
| Word generator page | Separate site page | Small, self-contained page could be added later |
| Accounts, friends, Discord, ads | Site infrastructure | Not applicable |
| Other site games (Mafia, Spyfall, Estimation, Timer Imposter…) | Separate products | Not started |

## 5. Verification

- `npm run build` produces `main/dist/` without errors.
- Manual pass: setup with 4 players → reveal all cards → discussion timer → four ballots →
  verdict → victory screen.
- Online pass: three browser tabs create/join a room, receive different private roles, sync reveal →
  discussion → vote → results → victory, and Mr. White's guess resolves the round. Verify a guest
  socket receives only its own role in the snapshots.

No automated tests exist, by design: the previous suite tested the removed canvas game.
