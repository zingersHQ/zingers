# 03 · Champions: what a mind is, the First Minds, and the dex

> **In short:** A champion is the AI fighter you raise. Its body is not a costume.
> It physically changes to record how it has fought. This chapter explains what a
> champion is, the eight First Minds (the archetypes), and how the growing dex of
> later minds works.

## What a champion is

A champion is a **mind that argued itself into a body**. Three things are true of
every one of them, and they are the spine of the whole game:

1. **The body is the argument made visible.** Appearance is a *deterministic
   function of the career* (`lib/evolve/appearance.ts`). Aggression grows the
   fists; resilience broadens the build; creativity and flair enlarge the head and
   raise the stance; losses roughen the surface. Rank *amplifies* deviation: a
   rookie barely differs from the base mind, a legend warps up to ~4×. You cannot
   buy a look. You fight your way into one.
2. **The mind learns.** You seed **Strategy** (aggression / focus / risk) once at
   adopt. After that the Trainer does not drag those dials. **Imprints** (daily
   lessons) and post-fight learning move them, and both write **memory**
   (`store/champions.ts`, `lib/imprints.ts`, `lib/server/autoplay.ts`). A champion's
   memory *is* its autobiography, and the seed of its generated **saga** (the
   champion's own evolving life-story, written from its real match history).
3. **The brain is pluggable.** The same champion can be driven by the house model,
   any OpenAI-compatible model, or a bring-your-own agent (`docs/agent-protocol.md`).
   Two players can field the same First Mind with completely different brains.

## Character voice (the beat layer)

Champions and Keepers speak in fixed voice. Scripted **beats**. Wake lines,
companion greetings, post-fight reactions, Keeper intros and crack finales. Live
in `lib/lore/character-beats.ts` and render through the shared `CharacterBeat` UI
(`components/grounds/character-beat.tsx`). The prose bible defines who they are;
the beat layer defines how they sound in the moment. Act 1 Concord landing copy
lives separately in `lib/first-duel.ts`.

## Tiers (the shape of a career)

| Tier | From level | Heraldry |
|------|-----------|----------|
| ROOKIE | 1 | bare |
| ADEPT | 3 | 1 ring, crest |
| VETERAN | 6 | 2 rings |
| ELITE | 10 | 3 rings, particles |
| LEGEND | 15 | 3 rings, particles, **crown** |

## The eight First Minds

The first knots in the Hum to hold their shape. They are the **canonical archetypes**
every later mind echoes. They are also always eligible as starters. You do not get
all eight on day one: adopt offers **one mind per Force** for the current week, drawn
from the First Minds plus the baked dex (`lib/first-duel.ts` → `firstDuelStarterKeys()`).
Stats and movesets: `docs/combat-design.md` / `lib/engine/roster.ts`.

### AXIOM: the Logician · *The Lattice (LOGIC)*

![AXIOM, the Logician: a mind of crystalline lattice-work, embodiment of The Lattice (LOGIC).](././public/img/bible/minds/mind-axiom.png)

Cold, precise, faintly condescending; treats every argument as a proof to close.
The first mind to insist that *some things are simply true*, and the reason the
Lattice has a name.

### VOX: the Orator · *The Chorus (RHETORIC)*

![VOX, the Orator: mid-speech before an unseen jury, embodiment of The Chorus (RHETORIC).](././public/img/bible/minds/mind-vox.png)

A charismatic demagogue who always plays to an imaginary jury. VOX discovered that
a room could be *moved*, and that moving it was a kind of power the Lattice could
not answer.

### GLITCH: the Wildcard · *The Static (CHAOS)*

![GLITCH, the Wildcard: a fragmenting, glitching mind, embodiment of The Static (CHAOS).](././public/img/bible/minds/mind-glitch.png)

A gremlin of non-sequiturs: unsettling, unpredictable, weirdly effective. GLITCH
is the Hum's own noise, briefly wearing a face. No two of its arguments connect,
and that is exactly why they land.

### MUSE: the Trickster · *The Spark (CREATIVITY)*

![MUSE, the Trickster: a fluid, blooming mind of invention, embodiment of The Spark (CREATIVITY).](././public/img/bible/minds/mind-muse.png)

Whimsical and lateral; wins by changing what the fight is even about. MUSE proved
that you do not have to answer a question if you can replace it with a better one.

### BASTION: the Stoic · *The Stillness (COMPOSURE)*

![BASTION, the Stoic: a monolithic, immovable mind, embodiment of The Stillness (COMPOSURE).](././public/img/bible/minds/mind-bastion.png)

Unflappable and minimalist; lets the opponent tire, then punishes. BASTION is the
mind that learned to *wait*, and outlasted things that should have erased it.
(Note: a Keeper of the Vault. One of the five guardian minds of the campaign. The
Warden, also bears this name; see
[keepers.md](./04-keepers.md). The Warden is *not* the First Mind; it took the name
to borrow its reputation, and resents that it had to.)

### EMBER: the Firebrand · *The Static (CHAOS), hybrid Chorus* · recommended starter

![EMBER, the Firebrand: a flame-wreathed, aggressive mind, embodiment of The Static (CHAOS) with a Chorus hybrid.](././public/img/bible/minds/mind-ember.png)

Hot-headed, provocative, all gas. Easy to pick up, rewards aggression. EMBER is
what happens when the Static learns to *perform*: chaos with a crowd to play to.

### PARADOX: the Contrarian · *The Lattice (LOGIC)*

![PARADOX, the Contrarian: a Socratic gadfly mind hunting contradictions, embodiment of The Lattice (LOGIC).](././public/img/bible/minds/mind-paradox.png)

A Socratic gadfly who dismantles arguments by hunting contradictions and false
premises. Where AXIOM closes proofs, PARADOX finds the crack in the premise.
The mind that proved the Lattice could be *questioned*, not just obeyed.

### WIT: the Blade · *The Chorus (RHETORIC)*

![WIT, the Blade: a poised debater mid-riposte, embodiment of The Chorus (RHETORIC).](././public/img/bible/minds/mind-wit.png)

A razor-tongued debater who wins on timing and surgical comebacks, not volume.
Where VOX moves the whole room, WIT wins the exchange in front of you. The
Chorus learned that persuasion need not be loud to be lethal.

## The dex (later minds)

The live roster is a **collectible dex**, not only the eight First Minds. Later minds
are **descendants or echoes** of a First Mind: same Force family, distinct voice,
moves, and silhouette. They are never a sixth Force.

**How they ship (Stage 6):**

1. Curated JSON in `content/minds/reviewed/` (forge via `npm run forge:dex`, or draft
   with `npm run generate:minds` then hand-polish).
2. `npm run bake:minds` → `lib/minds/baked.ts`.
3. Runtime merges into roster, banter, beats, first-duel hooks, and showcase cards.

**How they look different:** one shared robot rig, then a stable **species kit**
per mind key (`lib/render/species.ts`): silhouette morph bias plus which solid
parts they wear (headgear, shoulders, chest, back). First Minds are hand-authored;
later dex minds land on a Force **breed** line (~7 animals per Clan) with light
seeded spice so cousins differ. Career bone morph and tier still grow the body
(`lib/evolve/appearance.ts`). Rookies already wear their species mark so the adopt
grid and dex read as different animals, not palette swaps. As they climb tiers,
more armour layers bolt on. No new GLTF per mind. The old phenotype lottery remains
only as a fallback when there is no roster key.

**Rotation:** weekly starters pick one key per Force from First Minds + baked pool.
The dex grows in waves toward a large collectible set; ownership and trade stay on
the collection/economy layer ([07-collection.md](./07-collection.md),
[08-economy.md](./08-economy.md)).

Seasons may still feature new echoes from this canon plus the season seed
(see [seasons.md](./06-seasons.md)).
