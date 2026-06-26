# 02 · The Five Forces

Every mind in the Hum is shaped by five **Forces**. They are the in-world name for
the **type pentagon** (`docs/combat-design.md`). A Force is both an element (what a
champion is made of) and a way of arguing (how it fights).

The player-facing name of a Force is its **plain name** below (Logic / Static /
Calm / Chorus / Spark). Each also carries an older, poetic name — its *etymology*
— kept here as flavour but never shown in the game UI.

| Force | Etymology | Element of… | Argues by… | Sigil | Hex |
|-------|-----------|-------------|------------|:-----:|-----|
| **Logic** | *the Lattice* | order, proof, structure | closing the proof | ◆ | `#4aa3ff` |
| **Static** | *the Static* | noise, entropy, surprise | breaking the frame | ✦ | `#ff4ad1` |
| **Calm** | *the Stillness* | patience, endurance, calm | outlasting the storm | ▲ | `#36d39a` |
| **Chorus** | *the Chorus* | crowd, feeling, persuasion | moving the room | ◉ | `#f0a93a` |
| **Spark** | *the Spark* | invention, metaphor, reframe | changing the question | ✺ | `#f5d020` |

> The five `CreatureType` codes in the engine (`LOGIC / CHAOS / COMPOSURE /
> RHETORIC / CREATIVITY`) are unchanged — they are internal keys. Only the
> *display* name shown to players is the plain name above. Canonical source:
> `lib/lore/canon.ts › FORCES[type].name` (poetic name lives on as `.inWorld`).

## The faces of the forces

| Logic | Static | Calm |
|:---:|:---:|:---:|
| ![Logic](../../public/img/bible/forces/force-lattice.png) | ![Static](../../public/img/bible/forces/force-static.png) | ![Calm](../../public/img/bible/forces/force-stillness.png) |
| *order, proof, structure* | *noise, entropy, surprise* | *patience, endurance, calm* |

| Chorus | Spark |
|:---:|:---:|
| ![Chorus](../../public/img/bible/forces/force-chorus.png) | ![Spark](../../public/img/bible/forces/force-spark.png) |
| *crowd, feeling, persuasion* | *invention, metaphor, reframe* |

*(zingers.org serves these from `/img/bible/forces/*.png`.)*

## The Wheel (the pentagon)

The forces turn in a wheel. **Each beats the next and loses to the previous:**

```
Logic → Static → Calm → Chorus → Spark → (Logic)
LOGIC → CHAOS  → CMP  → RHET   → CREA  → (LOGIC)
```

- **Logic** tames **Static**. Order silences noise. (LOGIC > CHAOS)
- **Static** cracks **Calm**. Chaos rattles the patient. (CHAOS > COMPOSURE)
- **Calm** deflects **Chorus**. Patience shrugs off appeals. (COMPOSURE > RHETORIC)
- **Chorus** drowns **Spark**. Selling beats merely inventing. (RHETORIC > CREATIVITY)
- **Spark** outflanks **Logic**. A reframe escapes the proof. (CREATIVITY > LOGIC)

Advantage ×1.25, neutral ×1.0, disadvantage ×0.8. This wheel is the deepest law of
the world; every region, season modifier, and matchup is read against it.

## The five inner stats

Within a mind, the same five appear as the combat stats (LOG / CHA / CMP / RHE /
CRE) and, as a *career accrues*, as the five **behavioural axes** that sculpt the
body (aggression, control, resilience, flair, creativity; see
`lib/evolve/progression.ts`). A mind is "of" one Force but carries a measure of all
five; what it *does* in the ring decides which one swells.

## Sigils

A Force, grown strong in a mind, etches a **sigil** (◆ Logic · ✦ Static · ▲ Calm ·
◉ Chorus · ✺ Spark). Sigils have three ranks (I/II/III). They are the heraldry of
the collection layer and the title system ("The Annihilator", "The Puppeteer");
they are *earned*, never assigned.

## Force vs Clan (type vs team)

Two different things draw from the same five Forces — keep them distinct:

- A champion's **Force** is *what it is*: its fighting style, fixed at creation. It
  drives the body, the abilities, the wheel matchup, and the **base colour + sigil**
  worn on every fighter.
- A **Clan** is *whose side you chose*: a Trainer swears to one Force for the
  season-long war, and ranked wins feed that Force's standing — regardless of what
  Forces the Trainer's champions happen to be. A Clan is worn as a **crest/banner**
  on the Trainer and on fielded champions, never as the base body colour.

So: *every champion has a Force; the Force you swear to is your Clan.*

## Allegiance (the Trainer's war)

Pledging to a Clan binds your ranked wins to that Force's standing in the
season-long war between the five. You may switch allegiance between seasons, but
contribution stays with the Force that earned it. The pledge is taken under the
Force's **motto** — its `argues` line, said as a vow:

| Force | Motto |
|-------|-------|
| **Logic** | *Close the proof.* |
| **Static** | *Break the frame.* |
| **Calm** | *Outlast the storm.* |
| **Chorus** | *Move the room.* |
| **Spark** | *Change the question.* |

Mottos live in `lib/lore/canon.ts › FORCE_MOTTO`. The Trainer who pledges is defined
in [cosmology.md](./01-cosmology.md).
