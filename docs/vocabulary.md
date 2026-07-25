# Vocabulary & voice policy

> **In short:** Zingers keeps a small set of unique, flavorful terms, but every one is defined the moment a new player meets it, and nothing gratuitously weird survives in the copy a newcomer reads first. This doc is the single source of truth for how we name things and how plainly we write.

Our audience is global. Many players read English as a second language, and many arrive knowing nothing about the lore. The world should still feel distinctive and cool, but "interesting" and "clear" are not in tension. A term earns its place only if it's worth teaching; once we keep it, we always teach it.

## The three rules

1. **No undefined proper noun in first-touch copy.** The first thing a player reads (the intro, the landing hero, the first-duel flow) must make sense with zero prior knowledge. Signature names may appear, but each gets a short plain gloss on first use (`the Long Vault, the sealed door the whole world is built around`). Deep-lore names that can't be glossed in a clause (the Hum, the Chronicle) stay out of first-touch copy and live in the Bible instead.
2. **One idea, one word.** No synonym sprawl. Pick the single term and use it everywhere.
3. **Prefer the plain word when the fancy one adds nothing.** Keep a coined term only when it carries real flavor a plain word would lose. Otherwise use the plain word.

## How guiding sounds (writers only — never a product claim)

When copy tells the Trainer what to do next (Director, Flight outcome, lock gates, Hub coaches), write it **as the champion**, first person: we / us / stay with me. Not a quest sign (`NEXT`, Compass chrome). Gold standard:

> Stay with me. Nine more stretches of sky and we light the next camp. There's a Crown chest waiting the first time.

**Never sell this.** No player-facing copy, marketing, or docs may pitch "it talks to you", "voiced lines", "companion AI voice", or anything that treats ordinary character speech like a feature. Characters just have lines. Same as every game.

### Ban: the em dash separator

**Never use ` — ` (spaced em dash) in player-readable text** or public docs players see. Prefer periods, commas, short sentences, or a colon. Code comments may keep em dashes.

## Canonical term map

| Use this | Not this | Notes |
|---|---|---|
| **Trainer** | Reader, Handler | The player. You raise the champions; you don't fight. |
| **Champion** | (mind, for the fighter) | "Mind" is fine for a raw/unclaimed one in lore; the player's fighter is a Champion. |
| **Strategy** | doctrine | The aggression/focus/risk dials (seeded at adopt; moved by Imprints and fights). After adopt the UI shows them as **temperament meters** (readout, not free-drag). *Code identifiers* (`doctrine()`, `DoctrineDial`, `card.doctrine`, the `d` URL param) keep their names; only visible English changes. |
| **temperament meters** | strategy sliders / doctrine dials (as UI verbs) | Player-facing name for the post-adopt Strategy readout. |
| **fight** / **battle** / **duel** | bout | Never say "bout" in player-facing copy. Prefer **fight** / **battle**; **duel** is fine for a single matchup. *Code* may still say `useBout`, `learnFromBout`, event kind `"bout"`; do not rename those in a copy pass. |
| **Imprint** | lesson / teach (alone) | The daily raising verb that writes memory and nudges Strategy. |
| **Clan** | Allegiance, House | The Force you swear to. The verb "swear allegiance to your Clan" is fine (plain English). |
| **regions** / **floating regions** | region-slabs, slabs | Drop "slab". |
| **the world** | the Grounds (in first-touch copy) | Say **"the world"** for the whole 3D place a newcomer flies around in. "the Grounds" is the world's **lore proper name**: fine in the Bible/`/glossary`, but never in first-touch, and **never as a region's name** (that was the core confusion). URL `/grounds` and the `grounds` id are unchanged. |
| **the Hub** | the Concord (in first-touch copy) | Say **"the Hub"** for the central landing area with the gates. "the Concord" survives as its lore proper name only. Code id `concord` unchanged. |
| **explore** / **fly around** | roam | **Kill "roam"** in all visible copy. The `roam` layer id in `lib/hub.ts` / `lib/play-nav.ts` stays as a code id. |
| **Flight** | the Ascent, Circuit, Climb (as mode names) | The flight game: one game on phone and desktop. Say **"Flight"** / **"Take flight"** / plain "fly". **Never** show *the Ascent*, *Circuit*, or *Climb* as a mode label. Lowercase "climb" is fine as a plain verb ("climb higher"). Code may still say Circuit / Climb / Ascent. |
| **floating / drifting** | adrift | Plainer synonyms. |
| **Gate** | Vaultgate | The arch out to a region (in visible copy; component names may stay). |
| **secret word** | cipher-word | The word each Keeper guards. |
| **Season** | the Chronicle | Visible copy says "season"; "the Chronicle" may remain as deep-lore flavor in the Bible. |
| **built-in brain** | House brain | The default agent. |
| **Live Gallery** | Scrying Gallery | Where you watch autonomous fights. |
| **Reach** | level, stage | One band of Flight's sky (ten total). Demoted: the HUD shows **plain sky progress** (sector N / total), not "Reach N". "Reach" survives as a flavor name in the Bible/`/glossary`. |
| **Camp** | checkpoint, waystation (in copy) | The rest point between Reaches. Demoted to lore; not a taught noun in first-touch. |
| **fly beside you** / **wingmate** | the champion's jetpack | Canon: the champion has **no** jetpack. It's a mind and flies on its own. Only the **Trainer** carries a jetpack. Never write "your champion's jetpack." |
| **standings** / **rank** / **board** / **rating** | ladder, ELO, Elo | Player-facing only. Say **standings**, **rank**, **board**, or plain **rating**. Never **ELO** (nobody knows it). Never **ladder** as a product noun (Unlock Ladder, season ladder, enter the ladder). Code may keep `ladder` / `elo` identifiers. |

## The first-touch concept budget (the six a newcomer meets)

The intro → take-flight → first-duel → landing flow introduces **only these six
nouns**, each with a plain gloss: **Trainer, Champion, Fly (Flight), Battle/duel,
the Hub, Crowns.** (See `docs/simplification-plan.md` §2.) Everything else is
revealed later, in context, the first time it's relevant. Never dumped up front.

## Keep, but always gloss on first use (the flavor layer)

**the Long Vault, the Hum, the Keepers, Force, Sigil, Saga, Resolve, Tribunal, Gauntlet, Reach, Camp, Fragment.** These are signature and worth keeping, but they belong to the **flavor layer** (the Bible, `/glossary`, deep menus), not first-touch. Wherever one first appears, add a plain gloss. The lore proper names **the Grounds** (say "the world") and **the Concord** (say "the Hub") also live here; keep them out of first-touch entirely. The canonical one-line definitions live in `lib/lore/glossary.ts` (rendered at `/glossary` and in `docs/bible/09-glossary.md`); reuse that wording so glosses stay consistent.

## Code vs. copy

Change **player-visible text only**: string literals shown in the UI, JSX text, `aria-label`/`title` text, and Bible prose. Do **not** rename identifiers, component or function names, props, object keys, `localStorage` keys, or URL/query-param values (e.g. the `doctrine()` helper, `ReaderThread`, `READER_COPY`, `Vaultgate` component, `"House Grok"` brain id). Renaming those is a separate, deliberate refactor.

## Open question (not yet decided)

**"The House"** as the name of the built-in league/opponents (distinct from "House brain", which is now "built-in brain") is still used in a few places (whitepaper, slides, share ids like `"House Grok"`). It touches stored values and share URLs, so renaming it is a product decision, not a copy pass. Left as-is for now.
