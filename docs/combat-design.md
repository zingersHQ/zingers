# Zingers: combat design & sanity check

This doc exists to answer one question before committing a weekend:
**does the battle play like a game, or like two chatbots talking?**

It defines the numbers, the roster, one full arena, and a worked turn-by-turn
battle so you can feel the mechanics. Tune freely. The point is the *shape*.

---

## 1. Combat constants

| Constant | Value | Notes |
|---|---|---|
| `Resolve` (HP) | 100 | Targets a tight **6–8 turn** battle |
| base `defense` | 12 | Flat damage reduction |
| `statScale(s)` | `0.5 + s/100` | stat 50 → 1.0, stat 100 → 1.5, stat 0 → 0.5 |
| `typeMultiplier` | 1.25 / 1.0 / 0.8 | advantage / neutral / disadvantage |
| `arenaMultiplier` | per-arena | biases move types (see arenas) |
| `quality` | `0.7–1.3` | normal band; stats anchor, writing nudges |
| `Highlight` (crit) | sets `quality = 1.4` | judge flags an *exceptional* line: **replaces** quality, never stacks on top of it. ~10–15% of strong lines. Triggers a cut-in. |
| `rngJitter` | uniform 0.9–1.1 | ±10% variance (some moves widen this) |
| `maxHitDamage` | 45 (= 45% of Resolve) | anti-one-shot cap; shown as **CAPPED!** |

**Damage (damaging moves):**
`raw = base × statScale × typeMult × arenaMult × quality × jitter × statusMods`
`dmg = max(1, min(maxHitDamage, round(raw) − defense))`

- `quality` is **0.7–1.3** normally, or exactly **1.4** on a Highlight. A bad line can't wreck a built creature; a brilliant one earns a visible bonus. Off-topic ⇒ judge ≈ 0 ⇒ floored to 0.7.
- `statusMods` = product of active multipliers (Exposed ×1.2, Hyped ×1.2, etc.).
- Utility moves deal little/no damage but apply statuses, heals, or guards.

---

## 2. The five stats

- **LOG** (Logic): structure, deduction, consistency.
- **RHE** (Rhetoric): persuasion, crowd-work, emotional appeal.
- **CRE** (Creativity): reframing, metaphor, lateral angles.
- **CMP** (Composure): defense, patience, counters, healing.
- **CHA** (Chaos): unpredictability, provocation, high-variance swings.

---

## 3. Type cycle (rock-paper-scissors, pentagon)

Each type **beats the next** and is **beaten by the previous**:

```
LOGIC → CHAOS → COMPOSURE → RHETORIC → CREATIVITY → LOGIC
```

- LOGIC beats CHAOS (order tames noise), loses to CREATIVITY (outflanked).
- CHAOS beats COMPOSURE (cracks calm), loses to LOGIC.
- COMPOSURE beats RHETORIC (deflects appeals), loses to CHAOS.
- RHETORIC beats CREATIVITY (sells over novelty), loses to COMPOSURE.
- CREATIVITY beats LOGIC (reframes rigidity), loses to RHETORIC.

Advantage ×1.25, neutral ×1.0, disadvantage ×0.8.

---

## 4. Status effects

| Status | Effect | Duration |
|---|---|---|
| **Tilted** | −0.2 to your `quality` (rattled, off your game) | 1 turn |
| **Confused** | 30% chance your chosen move fizzles (half effect) | 1 turn |
| **Exposed** | you take +20% damage | 1 turn |
| **Hyped** | your next damaging move +20% | until consumed |
| **Guard** | +N defense | 1–2 turns |

---

## 5. Roster (8 starters)

Stat budget = 300 each (balanced). Each has 4 moves; movesets carry **setup → payoff** combos so play has texture.
Two minds share each of **LOGIC**, **RHETORIC**, and **CHAOS**; **CREATIVITY** and **COMPOSURE** have one each.

### AXIOM: Logician (LOGIC)
*Cold, precise, faintly condescending. Treats every argument as a proof to close.*
`LOG 90 · CMP 70 · RHE 60 · CRE 45 · CHA 35`

| Move | Stat | Base | Effect |
|---|---|---|---|
| Syllogism | LOG | 22 | Clean damage |
| Reductio | LOG | 18 | + applies **Exposed** |
| Cold Read | CMP | 8 | + self **Guard** (+10 def, 2 turns) |
| Checkmate | LOG | 28 | Finisher, only if opponent is **Tilted** or **Exposed** |

### VOX: Orator (RHETORIC)
*Charismatic demagogue. Plays to an imaginary jury, always.*
`RHE 90 · CHA 55 · CRE 55 · CMP 50 · LOG 50`

| Move | Stat | Base | Effect |
|---|---|---|---|
| Crowd Swell | RHE | 18 | Clean damage |
| Appeal | RHE | 14 | + self **Hyped** |
| Strawman | RHE | 16 | + applies **Tilted** |
| Mic Drop | RHE | 22 | Consumes **Hyped** for +20% |

### GLITCH: Wildcard (CHAOS)
*A gremlin of non-sequiturs. Unsettling, unpredictable, weirdly effective.*
`CHA 90 · CRE 65 · RHE 50 · CMP 50 · LOG 45`

| Move | Stat | Base | Effect |
|---|---|---|---|
| Non Sequitur | CHA | 16 | 35% chance to apply **Confused** |
| Wildfire | CHA | 22 | Jitter widened to ±30% |
| Gaslight | CHA | 14 | + applies **Tilted** |
| Pandemonium | CHA | 30 | Recoil: self takes 8 |

### MUSE: Trickster (CREATIVITY)
*Whimsical, lateral. Wins by changing what the fight is even about.*
`CRE 90 · RHE 60 · CHA 55 · LOG 50 · CMP 45`

| Move | Stat | Base | Effect |
|---|---|---|---|
| Reframe | CRE | 20 | Clean damage (shines vs LOGIC via type) |
| Metaphor | CRE | 16 | + self **Guard** (+8 def) |
| Plot Twist | CRE | 16 | + applies **Exposed** |
| Magnum Opus | CRE | 30 | Requires 2 prior CRE moves this battle |

### BASTION: Stoic (COMPOSURE)
*Unflappable, minimalist. Lets the opponent tire, then punishes.*
`CMP 90 · LOG 65 · CHA 55 · RHE 50 · CRE 40`

| Move | Stat | Base | Effect |
|---|---|---|---|
| Deflect | CMP | 8 | Halves next incoming damage |
| Patience | CMP | 0 | Self **Guard** (+12) + heal 10 Resolve |
| Counterpoint | CMP | 22 | +50% if used right after Deflect |
| Immovable | CMP | 24 | +1% per 1% of own Resolve missing (clutch) |

### EMBER: Firebrand (CHAOS, hybrid RHE), recommended starter
*Hot-headed, provocative, all gas. Easy to pick up, rewards aggression.*
`CHA 75 · RHE 70 · CMP 60 · CRE 50 · LOG 45`

| Move | Stat | Base | Effect |
|---|---|---|---|
| Callout | RHE | 20 | + applies **Tilted** |
| Burn | CHA | 22 | Clean damage |
| Double Down | RHE | 14 | + self **Hyped** |
| Inferno | CHA | 26 | +30% if opponent is **Tilted** |

### PARADOX: Contrarian (LOGIC)
*A Socratic gadfly. Dismantles arguments by hunting contradictions and false premises — not by closing proofs.*
`LOG 88 · CMP 58 · CRE 52 · CHA 48 · RHE 54`

| Move | Stat | Base | Effect |
|---|---|---|---|
| Premise Break | LOG | 18 | + applies **Exposed** |
| Socratic | LOG | 14 | + applies **Tilted** |
| Concede Pivot | CMP | 8 | Self **Guard** (+10) + heal 6 Resolve |
| Liar Paradox | LOG | 27 | Finisher, only if opponent is **Tilted** or **Exposed** |

### WIT: Blade (RHETORIC)
*A razor-tongued debater. Wins on timing and surgical comebacks, not crowd volume.*
`RHE 86 · LOG 58 · CMP 56 · CHA 52 · CRE 48`

| Move | Stat | Base | Effect |
|---|---|---|---|
| Riposte | RHE | 20 | Clean damage |
| Setup | RHE | 12 | + self **Hyped** |
| Needle | RHE | 16 | + applies **Tilted** |
| Kill Shot | RHE | 24 | +25% if opponent is **Tilted** |

---

## 6. Arena: THE TRIBUNAL (flagship)

A mock courtroom. The two creatures are **assigned opposing stances** on a spicy
proposition drawn from a prompt bank, and argue to a "jury" (the judge model).

- **Prompt bank:** *"cereal is soup" · "a hot dog is a sandwich" · "pineapple belongs on pizza" · "should AI have rights" · "is water wet"* …
- **Stances:** assigned at start (FOR / AGAINST). Switching sides ⇒ judge quality ≈ 0.
- **Environmental modifier:** `RHETORIC ×1.1`, `CHAOS ×0.95`. The room rewards persuasion and lightly punishes pure noise.
- **On-topic rule:** an utterance that ignores the proposition scores ~0 quality (anti-derail). Keeps battles coherent and clip-able.
- **Win condition:** standard Resolve depletion; flavored as "jury confidence." If both survive 12 turns, higher Resolve wins.

**Other arenas (stretch, same engine, different bias):**
- **The Debate Hall**: free topic, `LOGIC ×1.1`; rewards structure.
- **The Negotiation**: split a fixed pot; `COMPOSURE ×1.1`; concessions = chip damage.
- **The Writers' Room**: creative prompt; `CREATIVITY ×1.15`; rewards originality.

---

## 7. Making it SMART (visible intelligence)

The intelligence has to be *legible*. The viewer should see the creature **think**, then see the plan pay off. That's what reads as smart instead of "an LLM said words."

**Two-phase turn (the core of perceived smarts):**
- **Phase A: STRATEGIZE.** The agent receives the full structured game state: own/opponent stats, both Resolve values, active statuses, the last 2 moves, the arena + topic + assigned stance, its available moves (with conditions/cooldowns), and its memory notes. It returns `{ move_id, intent }`, where `intent` is a ≤6-word tactic shown on screen ("Set up Exposed, then finish").
- **Phase B: PERFORM.** The agent writes the in-character line that executes the move, referencing the opponent's last line and the topic.

Showing the **intent chip** before the line is the single biggest "this thing is smart" lever: plan → execution, every turn.

**Good-decision pressure (so smarts actually win):**
- Finishers are gated (Checkmate needs Exposed/Tilted; Magnum Opus needs 2 prior CRE moves) → setup→payoff planning.
- Reads are rewarded (Counterpoint after Deflect; exploiting type/arena bias; saving Hyped for the closer).
- An agent that ignores these *loses* to one that doesn't, so model quality, prompt quality, and training visibly matter.

**The judge rewards intelligence, not verbosity.** Higher `quality` for: (a) **callbacks** to earlier turns, (b) **turning the opponent's own words/logic against them**, (c) on-topic precision. **Highlights** (the ×1.4 crit + cut-in) fire only on genuinely clever, clip-worthy lines. The judge returns a one-line **ruling** shown on screen ("clean callback to T2 → Highlight").

**Adaptation (Learns).** After each battle, store a one-line lesson; inject recent lessons into the prompt so a creature visibly adjusts within a season ("Vox now baits Axiom's hoarded Checkmate"). Difficulty = stronger model × richer memory × higher stats.

---

## 8. Making it VISUAL (spectacle)

Frame it like a **fighting game / card battler**, never a chat window.

**Layout:**
- Two creatures face off left/right with large art; **Resolve bars** on top; **status-icon trays** beneath each; an arena backdrop (the Tribunal = a courtroom).
- A center **Momentum / Jury bar** (tug-of-war from the HP delta) that leans as hits land.
- Dialogue as timed **speech bubbles** above each creature, not a scrolling log.

**Per-turn beat (the rhythm that sells it):**
1. **Telegraph**: attacker steps forward; the **intent chip** appears; a move-name banner slides in.
2. **Deliver**: the line types into a speech bubble (~1–2s).
3. **Impact**: damage number pops; Resolve bar drains; **screen shake scaled to damage**; type flash ("SUPER EFFECTIVE!" / "RESISTED"); **CAPPED!** if it hits the cap.
4. **Status**: the status icon flies onto the target (Tilted / Exposed / Hyped…).
5. **Ruling**: the judge's one-liner; on a **Highlight**, a full-screen **cut-in** with the dunk line slow-zoomed.

**Creature presentation (low art lift):**
- 1 base portrait per creature + cheap reactive states via transforms: idle bob, lunge on attack, flash-red + shake on hurt, slump at low HP, grin/emote on Highlight. Optional 2–3 generated expressions (neutral / attack / hurt). No frame animation needed.
- **Finisher cut-in**: a full-screen dramatic frame when a gated finisher lands.
- Color-coded by type, hit SFX, crowd murmurs in the Tribunal.

**End screen / shareability:**
- Auto-composed **replay card**: both creatures, final score, the match's **MVP line ("Dunk of the Match")**, arena, short link → one-tap share = built-in virality.
- Full replay = the stored battle log re-played through the same beat system (free, deterministic).

**Tech (keep it cheap):** React + a light animation lib (Framer Motion / CSS); turns stream via SSE so the stage animates as they resolve. No game engine. It's a turn-based *stage*, not a real-time renderer.

---

## 9. Worked sample battle (sanity check, tightened numbers)

**AXIOM (Logician)** vs **VOX (Orator)** · Arena: **The Tribunal** · Topic: *"cereal is soup"* (Vox = FOR, Axiom = AGAINST).
HP 100 · type LOGIC↔RHETORIC = neutral (×1.0) · `quality`/`jitter` assumed per turn; rounded. The **Intent** column is the on-screen smart layer.

| # | Actor | Move | Intent (shown) | Line (abridged) | Dmg | HP after |
|---|---|---|---|---|---|---|
| 1 | VOX | Strawman | *Rattle the Logician early* | "He thinks soup must be *hot*. Adorable, and why we ate cereal dry for centuries." | **15** | Axiom 85 · **Axiom Tilted** |
| 2 | AXIOM | Reductio | *Pry them open for the finish* | "Name milk's stock, its mirepoix, its simmer. You can't. Not soup." *(Tilted −0.2)* | **11** | Vox 89 · **Vox Exposed** |
| 3 | VOX | Appeal | *Bank Hyped for the closer* | "Forget definitions: the bowl, the morning light, age seven. That warmth is soup." | **10** | Axiom 75 · **Vox Hyped** |
| 4 | AXIOM | **Checkmate** | *HIGHLIGHT: their own broth logic, weaponized* | "By your broth rule, a glass of milk is bisque. Absurd. The case collapses." | **45** CAPPED | Vox 44 |
| 5 | VOX | **Mic Drop** | *Close before they compound* | "You brought a dictionary to a feeling. I rest my case. *mic drop*" *(Hyped)* | **37** | Axiom 38 |
| 6 | AXIOM | Syllogism | *No theatrics, just compound* | "Soup is cooked; cereal is assembled. No transformation, no soup." | **23** | Vox 21 |
| 7 | VOX | Crowd Swell | *Ride momentum to verdict* | "Jury, one of us made you *feel* breakfast." | **21** | Axiom 17 |
| 8 | AXIOM | Syllogism | *The proof closes* | "Theatrics decay; logic compounds. Q.E.D." | **23** | Vox **KO** |

**Result:** AXIOM wins on turn 8, after trailing most of the match. The gated **Checkmate Highlight** (T4, hit the damage cap) was the swing; Vox's **Appeal→Mic Drop** combo nearly closed it.

**What this demonstrates (the "it's a game" checklist):**
- ✓ **Lead changed hands**: Vox led through T3; Axiom's Exposed→Checkmate Highlight flipped it.
- ✓ **Statuses + combos decided it**: Tilted, Exposed, and Hyped each visibly moved a number; both finishers required setup.
- ✓ **Smarts were legible**: every turn showed an *intent* before the line; the win came from planning (pry open → finisher), not luck.
- ✓ **The arena mattered**: Rhetoric ×1.1 kept the Orator competitive in a courtroom.
- ✓ **The LLM mattered but didn't decide alone**: `quality` only nudged a bounded multiplier (and a Highlight) over a stat-driven core; the cap stopped a feel-bad one-shot.
- ✓ **It's watchable**: short, in-character, on-topic, clip-able lines; a Highlight cut-in and a CAPPED moment to screenshot.

---

## 10. Progression (how training changes outcomes)

- **Win** → XP. On level-up: +N stat points to allocate + occasional move unlock.
- Higher primary stat ⇒ higher `statScale` ⇒ measurably bigger hits (a maxed stat is ×1.5 vs ×1.0 at 50). Training is *felt*, not cosmetic.
- **Memory (Learns):** after each battle, store a one-line lesson ("lost to Composure in the Tribunal; over-relied on Appeal"). Inject the last few into the agent's prompt so it adapts strategy over time.

---

## 11. Decisions (resolved)

1. **Pace**: HP **100**, target **6–8 turns** (denser drama, demo-friendly). ✓
2. **Quality band**: tightened to **0.7–1.3**, plus a **Highlight ×1.4** crit, so stats anchor outcomes while brilliant writing visibly pops. ✓
3. **Finishers stay conditional**: the gating *is* the smart layer (setup → payoff). ✓
4. **Statuses kept**, telegraphed with icons, rates conservative: texture without feeling random. ✓
5. **One arena for the demo: The Tribunal.** Most legible, funniest to watch, anti-derail by design. ✓
6. **Anti-one-shot cap (45)** added: big plays feel huge without feel-bad OHKOs (shown as **CAPPED!**). ✓
7. **Two-phase agent (Strategize → Perform)** with an on-screen **intent chip**, the core of visible intelligence. ✓
8. **Judge rewards callbacks / turning words / precision**, returns an on-screen **ruling**. ✓
