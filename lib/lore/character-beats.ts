// Scripted character moments — the directorial layer. Pure data + helpers so
// cinematics and companion bubbles share one voice bible.
import type { CreatureType } from "@/lib/types";
import type { CreatureAnimMode } from "@/lib/render/animations";
import { ROSTER } from "@/lib/engine/roster";
import { getBakedSync } from "@/lib/minds/baked";
import { getActiveLocale } from "@/lib/i18n/locale-context";

function baked() {
  return getBakedSync(getActiveLocale());
}

export interface BeatLine {
  speaker: string;
  text: string;
  /** e.g. "The Greeter" */
  role?: string;
  /** Optional live-portrait clip played while this line is on screen (jump, train, dance…). */
  anim?: CreatureAnimMode;
}

export interface BeatScript {
  kicker?: string;
  lines: BeatLine[];
}

// ── Champion wake (first time they look at you) ─────────────────────────────

const WAKE_FIRST: Record<string, string> = {
  AXIOM: "…there you are. Good. I was starting to think no one would bother closing the proof.",
  PARADOX: "Ah. My Trainer at last. I think best out loud, so keep me honest. Let's go find something worth questioning.",
  GLITCH: "Oh— OH. You're real. You're the one raising me. This is gonna be so— wait, what were we doing?",
  EMBER: "Finally. Someone with a pulse. Don't just stand there. Let's pick a fight.",
  BASTION: "…mm. You came. I won't rush. Neither should you.",
  VOX: "Ladies, gentlemen. My Trainer has arrived. Try to look impressed.",
  WIT: "Took you long enough. I had a riposte ready and everything.",
  MUSE: "What if… you and I changed what this whole place is even about?",
};

export function championWakeLine(key: string): string {
  return WAKE_FIRST[key] ?? baked().BAKED_WAKE[key] ?? "…finally. Someone on my side.";
}

/** Wake beat — speaker name in the caption carries identity; no redundant kicker. */
export function championWakeScript(key: string): BeatScript {
  const name = ROSTER[key]?.name ?? key;
  return {
    lines: [{ speaker: name, text: championWakeLine(key), anim: "standing" }],
  };
}

/** First Imprint beat — one line that opens the raise loop after Concord. */
export function championImprintAsk(key: string): string {
  const lines: Record<string, string> = {
    AXIOM: "Before we climb, teach me one rule. Make it worth proving.",
    PARADOX: "Give me one lesson to question. I'll keep whatever survives.",
    GLITCH: "Wait wait. Imprint me with something weird first. Please?",
    EMBER: "Don't just fly. Point the fire. Teach me something.",
    BASTION: "…one lesson before we climb. I'll hold to it.",
    VOX: "Feed me a line for the performance. Make it stick.",
    WIT: "One lesson. Sharp. Then we leave the Concord.",
    MUSE: "Reframe me once before we climb. Change how I think.",
  };
  return lines[key] ?? baked().BAKED_IMPRINT_ASK[key] ?? "Teach me something before we climb. Make it mine.";
}

export function championImprintAskScript(key: string): BeatScript {
  const name = ROSTER[key]?.name ?? key;
  // No kicker — speaker name in the caption is enough; "ASKS" was wrong for most lines.
  return {
    lines: [{ speaker: name, text: championImprintAsk(key), anim: "standing" }],
  };
}

// ── First flight (a short vignette the moment you adopt a champion) ───────────
// The first "scripted mundane moment": your new rookie rises off the ground for
// the first time — flying BESIDE you (canon: the Trainer flies with a jetpack, the
// champion flies on its own because it is a mind; see lib/lore/canon.ts › ASCENT).
// Lean by design — reuses the CharacterBeat cinematic frame and the portrait's
// existing clips (stand → jump → the training drill → a triumphant leap), so it
// reads as "learning to fly beside you" without any bespoke animation. Kept to a
// handful of short lines; always skippable.
const FLIGHT_REACT: Record<string, [string, string]> = {
  AXIOM: ["Flight is a proof I haven't closed yet. Watch.", "…quod erat demonstrandum. I'm up."],
  PARADOX: ["If I can't fall, am I truly flying? Let's test it.", "Ha. The ground had no counterargument."],
  GLITCH: ["Wait, we're doing this NOW? Okay okay okay—", "I'M A BIRD. I'm a whole BIRD."],
  EMBER: ["Enough standing. Light me up.", "Yeah. YEAH. Try catching me now."],
  BASTION: ["…slow. I don't rush the ground.", "…mm. Higher than I expected. Good."],
  VOX: ["Every legend needs a takeoff. Give me the room.", "…and the crowd looks UP. Perfect."],
  WIT: ["Betting I fumble the landing? Watch the timing.", "Nailed it. Obviously."],
  MUSE: ["What if the floor was only ever a suggestion?", "…oh. It let go. So did I."],
};

export function firstFlightScript(key: string): BeatScript {
  const name = ROSTER[key]?.name ?? key;
  const [react, triumph] =
    FLIGHT_REACT[key] ?? baked().BAKED_FLIGHT_REACT[key] ?? ["Wait. Now? Okay. Okay!", "…oh. I'm flying."];
  return {
    kicker: "FIRST FLIGHT",
    lines: [
      { speaker: "The Trainer", text: "I've got the jetpack. You don't need one. You're a mind. Just rise.", anim: "standing" },
      { speaker: name, text: react, anim: "jump" },
      { speaker: "The Trainer", text: "Again. Don't think. Stay off my wing and leave the floor.", anim: "train" },
      { speaker: name, text: triumph, anim: "dance" },
      { speaker: "The Trainer", text: "That's it. We climb together. I fly, you fight. Let's go up.", anim: "jump" },
    ],
  };
}

// ── Companion greetings (in-world, near train pad / return from fight) ────────

export function championGreeting(key: string, ctx: "train" | "return" | "arena"): string {
  const name = ROSTER[key]?.name ?? key;
  const byCtx: Record<string, Record<typeof ctx, string>> = {
    AXIOM: {
      train: "Doctrine first. Then we close them.",
      return: "Back. Show me what you saw out there.",
      arena: "Pick someone sloppy. I'll do the rest.",
    },
    GLITCH: {
      train: "Train me weird. I like weird.",
      return: "You look like you have stories. Tell me while we walk.",
      arena: "Point me at someone. Anyone. I'm bored.",
    },
    BASTION: {
      train: "Slow is fine. Slow wins.",
      return: "…good. You're back. I didn't worry.",
      arena: "Let them tire themselves out first.",
    },
    VOX: {
      train: "The crowd loves a comeback story. Drill me for one.",
      return: "There you are. I felt the room shift when you returned.",
      arena: "Give me a stage and an opponent. I'll move the room.",
    },
    EMBER: {
      train: "Harder. Hotter. Don't hold back.",
      return: "Back already? Good. I was getting restless.",
      arena: "Who're we burning today?",
    },
    PARADOX: {
      train: "Question every dial. Even the obvious ones.",
      return: "What did you learn that contradicts what you believed?",
      arena: "Find me someone sure of themselves.",
    },
    WIT: {
      train: "Timing beats volume. Drill that in.",
      return: "Miss me? Don't answer. I already know.",
      arena: "Someone talkative. I'll cut them down mid-sentence.",
    },
    MUSE: {
      train: "Surprise me. Change the shape of how I think.",
      return: "Every return is a chance to reframe everything.",
      arena: "Pick a fight that isn't the fight they expect.",
    },
  };
  return byCtx[key]?.[ctx] ?? baked().BAKED_GREETING[key]?.[ctx] ?? `${name} is ready when you are.`;
}

// ── Homecoming (the mobile "you're back" greeting) ──────────────────────────
// Selected by real state since the player last looked: a long absence, a hot
// streak, or a slump each get their own line; otherwise fall back to the neutral
// return greeting. Pure data — no LLM, instant on the daily-loop critical path.
export type HomecomingMood = "return" | "away" | "hot" | "cold";

const HOMECOMING: Record<string, Partial<Record<HomecomingMood, string>>> = {
  AXIOM: {
    away: "You were gone long enough for me to re-derive everything twice. Catch up.",
    hot: "The proofs keep closing themselves. Don't break the streak.",
    cold: "I dropped a few. The logic held, the timing didn't. Fix my timing.",
  },
  GLITCH: {
    away: "You LEFT. For AGES. I counted to a big number and then forgot it. Hi!",
    hot: "Winning winning winning. The frame keeps BREAKING and I love it.",
    cold: "Lost some. Whatever. The good chaos is still loading. Point me somewhere.",
  },
  BASTION: {
    away: "…you were away a while. I held. I always hold.",
    hot: "Wins stacking, quietly. Don't get loud about it.",
    cold: "A few got through. I'll hold the line better. Stay with me.",
  },
  VOX: {
    away: "The crowd asked where you'd gone. I improvised. Try not to vanish mid-story.",
    hot: "The room is ours right now. Feel it? Let's not give it back.",
    cold: "The room turned on us a little. We win it back with a better line.",
  },
  EMBER: {
    away: "Two ages you were gone. I nearly picked a fight with the scenery.",
    hot: "I'm on fire and you show up NOW? Fine. Let's keep burning.",
    cold: "Got cooled down a few times. Light me back up.",
  },
  PARADOX: {
    away: "Your absence was itself an argument. I refuted it. Welcome back.",
    hot: "We keep finding the contradiction first. Curious. Let's press it.",
    cold: "Lost a few to premises I missed. Question harder with me.",
  },
  WIT: {
    away: "Gone that long? I had three comebacks ready and no one to aim them at.",
    hot: "Landing every line lately. Timing's immaculate. Keep feeding me.",
    cold: "Got landed on first a couple times. I land last next. Watch.",
  },
  MUSE: {
    away: "You wandered off and the whole question changed while you were out.",
    hot: "We keep changing what the fight is about. It keeps working.",
    cold: "They held the old question and I let them. New question next time.",
  },
};

export function championHomecoming(key: string, mood: HomecomingMood): string {
  if (mood === "return") return championGreeting(key, "return");
  return HOMECOMING[key]?.[mood] ?? baked().BAKED_HOMECOMING[key]?.[mood] ?? championGreeting(key, "return");
}

// ── After a duel — your champion speaks to YOU ──────────────────────────────

export function championAfterFight(
  key: string,
  won: boolean,
  opponentName: string,
  memoryNote?: string | null,
): string {
  if (memoryNote) {
    const short = memoryNote.replace(/^Learned from \w+ ↗/, "").trim() || memoryNote;
    if (won) return `Against ${opponentName}. ${short}. I won't forget that.`;
    return `Lost to ${opponentName}. ${short}. Next time.`;
  }
  const win: Record<string, string> = {
    AXIOM: `Closed. ${opponentName} had no answer left.`,
    GLITCH: `${opponentName}? Ha. Frame's broken.`,
    BASTION: `${opponentName} rushed. I waited. That's the whole story.`,
    VOX: `The room is with us. ${opponentName} never had a chance.`,
    EMBER: `${opponentName} burned out before I did.`,
    PARADOX: `${opponentName} couldn't hold the contradiction.`,
    WIT: `${opponentName} talked too much. I didn't need to.`,
    MUSE: `We changed what ${opponentName} thought we were fighting about.`,
  };
  const loss: Record<string, string> = {
    AXIOM: `${opponentName} found a gap. I need more proof.`,
    GLITCH: `…okay. ${opponentName} got lucky. Once.`,
    BASTION: `${opponentName} got through. I hold the line next time.`,
    VOX: `${opponentName} moved the room today. Noted.`,
    EMBER: `${opponentName} cooled me down. Won't happen twice.`,
    PARADOX: `${opponentName} had a premise I didn't see.`,
    WIT: `${opponentName} landed first. I'll land last next time.`,
    MUSE: `${opponentName} kept the old question. I need a new one.`,
  };
  const after = baked().BAKED_AFTER_FIGHT[key];
  if (after) {
    const tpl = won ? after.win : after.loss;
    return tpl.replaceAll("{opp}", opponentName);
  }
  return (won ? win[key] : loss[key]) ?? (won ? `We took ${opponentName}.` : `${opponentName} got us this time.`);
}

// ── Imprint acknowledgement — the mind takes a lesson to heart ──────────────
// Used as the template/fallback reply when no live model answers an Imprint, so
// even offline the champion responds in its own voice.
export function championImprintAck(key: string): string {
  const lines: Record<string, string> = {
    AXIOM: "Noted as an axiom. I won't need to be told twice.",
    GLITCH: "Ooh, new rule! Rewriting myself… done. Probably.",
    BASTION: "…understood. I'll hold to it.",
    VOX: "A note for the performance. The crowd will feel the difference.",
    EMBER: "Fine. I'll aim the fire where you point it.",
    PARADOX: "I'll question it until it holds. Then I'll keep it.",
    WIT: "Filed, sharpened, ready. Watch me use it.",
    MUSE: "That reframes everything. I like it. Keeping it.",
  };
  return lines[key] ?? baked().BAKED_IMPRINT_ACK[key] ?? "Got it. I'll carry that in.";
}

// ── Ranked win — a short finale line from your champion ─────────────────────

export function championRankedFinale(key: string): string {
  const lines: Record<string, string> = {
    AXIOM: "That counted. The standings know our name now.",
    GLITCH: "Ranked? RANKED. They saw that. They SAW that.",
    BASTION: "…a ranked win. Quietly. The way it should be.",
    VOX: "The Concord heard that one. So did the Tower.",
    EMBER: "They'll remember that ranked win. I made sure.",
    PARADOX: "The ranking assumes certainty. We proved otherwise.",
    WIT: "Clean. Ranked. No wasted syllables.",
    MUSE: "We didn't just win. We changed what winning meant.",
  };
  return lines[key] ?? baked().BAKED_RANKED_FINALE[key] ?? "That ranked win was real. I felt it.";
}

/** Resolve champion type for voice + tint */
export function championTypeForKey(key: string): CreatureType {
  return ROSTER[key]?.type ?? "LOGIC";
}
