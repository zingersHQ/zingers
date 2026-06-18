# Art direction — the Zingers visual canon

The look that makes every generated image read as **one universe**. Bake this into
every prompt; feed a locked style-key image as a reference on follow-ups so a batch
never drifts.

## Palette

| Role | Hex | Use |
|------|-----|-----|
| Void (base) | `#0a0812` | backgrounds, near-black indigo |
| Deep field | `#15102a` | mid-ground atmosphere |
| Gold (accent) | `#f5d020` | seams, glints, the Vault, restraint |
| **The Lattice** (LOGIC) | `#4aa3ff` | electric blue |
| **The Static** (CHAOS) | `#ff4ad1` | magenta-pink |
| **The Stillness** (COMPOSURE) | `#36d39a` | mint green |
| **The Chorus** (RHETORIC) | `#f0a93a` | amber |
| **The Spark** (CREATIVITY) | `#f5d020` | bright yellow |

(Force hexes are canon — `lib/lore/canon.ts`.)

## Medium & lens

- **Painterly cinematic concept key art** — not photoreal, not flat vector.
- **Volumetric neon rim-light** on a dark, foggy field; strong atmospheric depth.
- High detail, dramatic, moody. The Hum reads as drifting motes + faint glyph-text.
- One dominant force-color per image + gold accents. Avoid rainbow.

## Forbidden (keeps it premium)

- No text, words, logos, or watermarks rendered in the image.
- No UI/HUD elements, no modern/real-world branding.
- No gore, no photoreal human faces (these are *minds*, stylized).
- No clutter — one clear subject, deep negative space in the void.

## Composition conventions

| Group | Aspect | Framing |
|-------|--------|---------|
| Scenarios / regions | 16:9 | wide establishing shot, atmospheric depth |
| Characters (Minds, Keepers) | 4:5 | centered figure, ¾ pose, emblem behind |
| Forces / icons | 1:1 | centered emblematic embodiment, tile-able |

## Files & embedding

- Save to `public/img/bible/<group>/<slug>.png`
  (`forces/`, `minds/`, `regions/`, `keepers/`, scenarios at the root).
- Embed in `docs/bible/*.md` with a repo-relative path (renders on GitHub).
- zingers.org serves the same file at `/img/bible/<group>/<slug>.png`.

## Reusable prompt skeleton

> *[subject + pose/scene], embodiment of [force in-world name].*
> Painterly cinematic sci-fi-mythic concept key art. Background deep near-black
> indigo void (`#0a0812`). Dominant color **[force hex]**, gold accents. Volumetric
> neon rim-light, atmospheric fog, drifting motes and faint glyph-text (the Hum).
> High detail, dramatic, moody. No text, no logos, no watermark, no UI. [aspect].

## Consistency workflow

1. Keep `bible-the-grounds-over-the-vault.png` as the **style key**; pass it as a
   reference on new generations to lock palette + rendering.
2. For a recurring character, reuse that character's **first approved render** as a
   reference so it stays the same individual across its card art and the bible.
