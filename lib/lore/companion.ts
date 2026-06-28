// The living-companion layer — your champion's wordless reactions to your
// adventure. Inspired by Navi's "HEY!": short, non-verbal *impressions* the
// champion fires as you explore, win, and climb. There is no readable text —
// the bubble shows a single expressive glyph and the voice is a synthesised
// creature "cry" (see lib/creature-voice.ts). The hidden `cry` token only
// shapes the blip melody; it is never displayed.
import type { CreatureType } from "@/lib/types";

// The moments worth a reaction. Kept small on purpose — a companion that
// comments on everything is noise, not life.
export type CompanionEvent =
  | "notice" // your champion catches sight of you / wants your attention
  | "cheer" // you grabbed a cache or did something good
  | "triumph" // a bigger win — cleared a world goal
  | "awe" // you crested a new height / a vista
  | "wonder" // something curious nearby
  | "arrive"; // you stepped into a new region

export interface CompanionReaction {
  /** hidden token that drives the blip melody — never rendered */
  cry: string;
  /** the single glyph shown in the bubble */
  emote: string;
  /** how long the bubble lingers (ms) */
  holdMs: number;
}

// Each Force reacts in its own key. The *timbre* is already carried by the
// creature voice per type; here we colour the disposition — what kind of glyph
// the same event draws out of a cold logician vs. a manic chaos-mind.
type Temperament = "eager" | "bold" | "curious" | "cool" | "calm";

const TEMPERAMENT: Record<CreatureType, Temperament> = {
  CHAOS: "eager",
  CREATIVITY: "curious",
  RHETORIC: "bold",
  LOGIC: "cool",
  COMPOSURE: "calm",
};

// Per-temperament glyph + cry for each event. Longer cry tokens read as more
// excited (more blips); a trailing "?" makes the voice lilt upward.
const TABLE: Record<CompanionEvent, Record<Temperament, CompanionReaction>> = {
  notice: {
    eager: { cry: "heyhey", emote: "!!", holdMs: 2600 },
    bold: { cry: "ahah", emote: "!", holdMs: 2600 },
    curious: { cry: "oho", emote: "!", holdMs: 2600 },
    cool: { cry: "mm", emote: "!", holdMs: 2400 },
    calm: { cry: "ah", emote: "!", holdMs: 2400 },
  },
  cheer: {
    eager: { cry: "yesss", emote: "★", holdMs: 2800 },
    bold: { cry: "haa", emote: "★", holdMs: 2800 },
    curious: { cry: "nice", emote: "✦", holdMs: 2800 },
    cool: { cry: "good", emote: "✦", holdMs: 2600 },
    calm: { cry: "mhm", emote: "✦", holdMs: 2600 },
  },
  triumph: {
    eager: { cry: "wahoo", emote: "★!", holdMs: 3400 },
    bold: { cry: "hahaa", emote: "★!", holdMs: 3400 },
    curious: { cry: "yatta", emote: "★", holdMs: 3400 },
    cool: { cry: "qed", emote: "★", holdMs: 3200 },
    calm: { cry: "haa", emote: "★", holdMs: 3200 },
  },
  awe: {
    eager: { cry: "wooah", emote: "✦", holdMs: 3000 },
    bold: { cry: "whoa", emote: "✦", holdMs: 3000 },
    curious: { cry: "ooooh", emote: "✦", holdMs: 3000 },
    cool: { cry: "hm", emote: "✧", holdMs: 2800 },
    calm: { cry: "haah", emote: "✧", holdMs: 2800 },
  },
  wonder: {
    eager: { cry: "huh?", emote: "?", holdMs: 2600 },
    bold: { cry: "oh?", emote: "?", holdMs: 2600 },
    curious: { cry: "hmm?", emote: "?", holdMs: 2600 },
    cool: { cry: "hm?", emote: "?", holdMs: 2400 },
    calm: { cry: "mm?", emote: "?", holdMs: 2400 },
  },
  arrive: {
    eager: { cry: "ooh", emote: "!", holdMs: 2800 },
    bold: { cry: "hup", emote: "!", holdMs: 2800 },
    curious: { cry: "oho", emote: "?", holdMs: 2800 },
    cool: { cry: "so", emote: "…", holdMs: 2400 },
    calm: { cry: "hm", emote: "…", holdMs: 2400 },
  },
};

export function companionReaction(type: CreatureType, event: CompanionEvent): CompanionReaction {
  const t = TEMPERAMENT[type] ?? "calm";
  return TABLE[event][t];
}
