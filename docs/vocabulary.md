# Vocabulary & voice policy

> **In short:** Zingers keeps a small set of unique, flavorful terms — but every one is defined the moment a new player meets it, and nothing gratuitously weird survives in the copy a newcomer reads first. This doc is the single source of truth for how we name things and how plainly we write.

Our audience is global. Many players read English as a second language, and many arrive knowing nothing about the lore. The world should still feel distinctive and cool — but "interesting" and "clear" are not in tension. A term earns its place only if it's worth teaching; once we keep it, we always teach it.

## The three rules

1. **No undefined proper noun in first-touch copy.** The first thing a player reads (the intro, the landing hero, the first-duel flow) must make sense with zero prior knowledge. Signature names may appear, but each gets a short plain gloss on first use — `the Long Vault — the sealed door the whole world is built around`. Deep-lore names that can't be glossed in a clause (the Hum, the Chronicle) stay out of first-touch copy and live in the Bible instead.
2. **One idea, one word.** No synonym sprawl. Pick the single term and use it everywhere.
3. **Prefer the plain word when the fancy one adds nothing.** Keep a coined term only when it carries real flavor a plain word would lose. Otherwise use the plain word.

## Canonical term map

| Use this | Not this | Notes |
|---|---|---|
| **Trainer** | Reader, Handler | The player. You raise the champions; you don't fight. |
| **Champion** | (mind, for the fighter) | "Mind" is fine for a raw/unclaimed one in lore; the player's fighter is a Champion. |
| **Strategy** | doctrine | The aggression/focus/risk dials (seeded at adopt; moved by Imprints and fights). *Code identifiers* (`doctrine()`, `DoctrineDial`, `card.doctrine`, the `d` URL param) keep their names — only visible English changes. |
| **fight** / **battle** / **duel** | bout | Never say "bout" in player-facing copy. Prefer **fight** / **battle**; **duel** is fine for a single matchup. *Code* may still say `useBout`, `learnFromBout`, event kind `"bout"` — do not rename those in a copy pass. |
| **Imprint** | lesson / teach (alone) | The daily raising verb that writes memory and nudges Strategy. |
| **Clan** | Allegiance, House | The Force you swear to. The verb "swear allegiance to your Clan" is fine (plain English). |
| **regions** / **floating regions** | region-slabs, slabs | Drop "slab". |
| **floating / drifting** | adrift | Plainer synonyms. |
| **Gate** | Vaultgate | The arch out to a region (in visible copy; component names may stay). |
| **secret word** | cipher-word | The word each Keeper guards. |
| **Season** | the Chronicle | Visible copy says "season"; "the Chronicle" may remain as deep-lore flavor in the Bible. |
| **built-in brain** | House brain | The default agent. |
| **Live Gallery** | Scrying Gallery | Where you watch autonomous fights. |
| **the Ascent** / **the Climb** | — | The flight up through the sky. Capitalized **the Climb** = the game mode/verb; lowercase "climb" = the rank/progress metaphor. Keep them distinguishable in copy. |
| **Reach** | level, stage | One band of the Ascent's sky (ten total). |
| **Camp** | checkpoint, waystation (in copy) | The rest point between Reaches. |
| **fly beside you** / **wingmate** | the champion's jetpack | Canon: the champion has **no** jetpack — it's a mind and flies on its own. Only the **Trainer** carries a jetpack. Never write "your champion's jetpack." |

## Keep, but always gloss on first use

**the Grounds, the Concord, the Long Vault, the Hum, the Keepers, Force, Sigil, Saga, Resolve, Tribunal, Gauntlet, Circuit, the Ascent, Reach, Camp, Fragment, Crowns.** These are signature and worth keeping — but the first time each appears in any surface, add a plain gloss. *(Exception, per rule 1: the Ascent, Reach and Camp **can** be glossed in a clause and the flight fantasy is the newcomer hook, so they are welcome in first-touch copy — glossed. "Fly" needs no gloss.)* The canonical one-line definitions live in `lib/lore/glossary.ts` (rendered at `/glossary` and in `docs/bible/09-glossary.md`); reuse that wording so glosses stay consistent.

## Code vs. copy

Change **player-visible text only** — string literals shown in the UI, JSX text, `aria-label`/`title` text, and Bible prose. Do **not** rename identifiers, component or function names, props, object keys, `localStorage` keys, or URL/query-param values (e.g. the `doctrine()` helper, `ReaderThread`, `READER_COPY`, `Vaultgate` component, `"House Grok"` brain id). Renaming those is a separate, deliberate refactor.

## Open question (not yet decided)

**"The House"** as the name of the built-in league/opponents (distinct from "House brain", which is now "built-in brain") is still used in a few places (whitepaper, slides, share ids like `"House Grok"`). It touches stored values and share URLs, so renaming it is a product decision, not a copy pass. Left as-is for now.
