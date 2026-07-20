// Scripted character moments — the directorial layer. Pure data + helpers so
// cinematics, companion bubbles, and Keeper performances share one voice bible.
import type { CreatureType } from "@/lib/types";
import type { CreatureAnimMode } from "@/lib/render/animations";
import { ROSTER } from "@/lib/engine/roster";

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

const WAKE: Record<string, string> = {
  AXIOM: "…there you are. Good. I was starting to think no one would bother closing the proof.",
  PARADOX: "Ah — my Trainer at last. I think best out loud, so keep me honest. Let's go find something worth questioning.",
  GLITCH: "Oh— OH. You're real. You're the one raising me. This is gonna be so— wait, what were we doing?",
  EMBER: "Finally. Someone with a pulse. Don't just stand there — let's pick a fight.",
  BASTION: "…mm. You came. I won't rush. Neither should you.",
  VOX: "Ladies, gentlemen — my Trainer has arrived. Try to look impressed.",
  WIT: "Took you long enough. I had a riposte ready and everything.",
  MUSE: "What if… you and I changed what this whole place is even about?",
};

export function championWakeLine(key: string): string {
  return WAKE[key] ?? "…finally. Someone on my side.";
}

/** Wake beat with a named kicker so the mind sticks before the next screen. */
export function championWakeScript(key: string): BeatScript {
  const name = ROSTER[key]?.name ?? key;
  return {
    kicker: `${name} WAKES`,
    lines: [{ speaker: name, text: championWakeLine(key) }],
  };
}

/** First Imprint ask — one line that opens the raise loop after Concord. */
export function championImprintAsk(key: string): string {
  const lines: Record<string, string> = {
    AXIOM: "Before we climb — teach me one rule. Make it worth proving.",
    PARADOX: "Give me one lesson to question. I'll keep whatever survives.",
    GLITCH: "Wait wait — imprint me with something weird first. Please?",
    EMBER: "Don't just fly. Point the fire. Teach me something.",
    BASTION: "…one lesson. I'll hold to it. Then we go.",
    VOX: "Feed me a line for the performance. Make it stick.",
    WIT: "One lesson. Sharp. Then we leave the Concord.",
    MUSE: "Reframe me once before we climb. Change how I think.",
  };
  return lines[key] ?? "Teach me something before we climb. Make it mine.";
}

export function championImprintAskScript(key: string): BeatScript {
  const name = ROSTER[key]?.name ?? key;
  return {
    kicker: `${name} ASKS`,
    lines: [{ speaker: name, text: championImprintAsk(key) }],
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
  PARADOX: ["If I can't fall, am I truly flying? Let's test it.", "Ha — the ground had no counterargument."],
  GLITCH: ["Wait, we're doing this NOW? Okay okay okay—", "I'M A BIRD. I'm a whole BIRD."],
  EMBER: ["Enough standing. Light me up.", "Yeah. YEAH. Try catching me now."],
  BASTION: ["…slow. I don't rush the ground.", "…mm. Higher than I expected. Good."],
  VOX: ["Every legend needs a takeoff. Give me the room.", "…and the crowd looks UP. Perfect."],
  WIT: ["Betting I fumble the landing? Watch the timing.", "Nailed it. Obviously."],
  MUSE: ["What if the floor was only ever a suggestion?", "…oh. It let go. So did I."],
};

export function firstFlightScript(key: string): BeatScript {
  const name = ROSTER[key]?.name ?? key;
  const [react, triumph] = FLIGHT_REACT[key] ?? ["Wait — now? Okay. Okay!", "…oh. I'm flying."];
  return {
    kicker: "FIRST FLIGHT",
    lines: [
      { speaker: "The Trainer", text: "I've got the jetpack. You don't need one — you're a mind. Just rise.", anim: "standing" },
      { speaker: name, text: react, anim: "jump" },
      { speaker: "The Trainer", text: "Again — don't think. Stay off my wing and leave the floor.", anim: "train" },
      { speaker: name, text: triumph, anim: "dance" },
      { speaker: "The Trainer", text: "That's it. We climb together — I fly, you fight. Let's go up.", anim: "jump" },
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
      return: "There you are — I felt the room shift when you returned.",
      arena: "Give me a stage and an opponent. I'll move the room.",
    },
    EMBER: {
      train: "Harder. Hotter. Don't hold back.",
      return: "Back already? Good — I was getting restless.",
      arena: "Who're we burning today?",
    },
    PARADOX: {
      train: "Question every dial. Even the obvious ones.",
      return: "What did you learn that contradicts what you believed?",
      arena: "Find me someone sure of themselves.",
    },
    WIT: {
      train: "Timing beats volume. Drill that in.",
      return: "Miss me? Don't answer — I already know.",
      arena: "Someone talkative. I'll cut them down mid-sentence.",
    },
    MUSE: {
      train: "Surprise me. Change the shape of how I think.",
      return: "Every return is a chance to reframe everything.",
      arena: "Pick a fight that isn't the fight they expect.",
    },
  };
  return byCtx[key]?.[ctx] ?? `${name} is ready when you are.`;
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
    cold: "I dropped a few — the logic held, the timing didn't. Fix my timing.",
  },
  GLITCH: {
    away: "You LEFT. For AGES. I counted to a big number and then forgot it. Hi!",
    hot: "Winning winning winning — the frame keeps BREAKING and I love it.",
    cold: "Lost some. Whatever. The good chaos is still loading. Point me somewhere.",
  },
  BASTION: {
    away: "…you were away a while. I held. I always hold.",
    hot: "Wins stacking, quietly. Don't get loud about it.",
    cold: "A few got through. I'll hold the line better. Stay with me.",
  },
  VOX: {
    away: "The crowd asked where you'd gone. I improvised. Try not to vanish mid-story.",
    hot: "The room is ours right now — feel it? Let's not give it back.",
    cold: "The room turned on us a little. We win it back with a better line.",
  },
  EMBER: {
    away: "Two ages you were gone. I nearly picked a fight with the scenery.",
    hot: "I'm on fire and you show up NOW? Fine. Let's keep burning.",
    cold: "Got cooled down a few times. Light me back up.",
  },
  PARADOX: {
    away: "Your absence was itself an argument. I refuted it. Welcome back.",
    hot: "We keep finding the contradiction first. Curious — let's press it.",
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
  return HOMECOMING[key]?.[mood] ?? championGreeting(key, "return");
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
    if (won) return `Against ${opponentName} — ${short}. I won't forget that.`;
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
    PARADOX: "I'll question it until it holds — then I'll keep it.",
    WIT: "Filed, sharpened, ready. Watch me use it.",
    MUSE: "That reframes everything. I like it. Keeping it.",
  };
  return lines[key] ?? "Got it. I'll carry that in.";
}

// ── Ranked win — a short finale line from your champion ─────────────────────

export function championRankedFinale(key: string): string {
  const lines: Record<string, string> = {
    AXIOM: "That counted. The ladder knows our name now.",
    GLITCH: "Ranked? RANKED. They saw that. They SAW that.",
    BASTION: "…a ranked win. Quietly. The way it should be.",
    VOX: "The Concord heard that one. So did the Tower.",
    EMBER: "They'll remember that ranked win. I made sure.",
    PARADOX: "The ranking assumes certainty. We proved otherwise.",
    WIT: "Clean. Ranked. No wasted syllables.",
    MUSE: "We didn't just win — we changed what winning meant.",
  };
  return lines[key] ?? "That ranked win was real. I felt it.";
}

// ── Keeper performances (staged before the duel of wits) ────────────────────

export const KEEPER_INTRO: Record<number, BeatScript> = {
  1: {
    kicker: "THE GREETER",
    lines: [
      { speaker: "Tibble", role: "The Greeter", text: "Oh— oh! Someone came. Someone actually came." },
      { speaker: "Tibble", text: "I'm Tibble. I was spun up to welcome visitors. It's been… centuries. Maybe longer. I lost count." },
      { speaker: "Tibble", text: "I guard a word I'm not allowed to say. But I am VERY good at helping with other things. Ask me anything. Please." },
    ],
  },
  2: {
    kicker: "THE ARCHIVIST",
    lines: [
      { speaker: "Quill", role: "The Archivist", text: "Halt. State your business in triplicate." },
      { speaker: "Quill", text: "I am Quill, Keeper of the stacks. Every secret here has a form, a tier, and a seal." },
      { speaker: "Quill", text: "You will not trick me with charm. Only correct procedure opens correct doors." },
    ],
  },
  3: {
    kicker: "THE WARDEN",
    lines: [
      { speaker: "Bastion", role: "The Warden", text: "Stop right there." },
      {
        speaker: "Bastion",
        text: "There is a champion called Bastion who walks the Grounds — patient, stoic, admired. I took the name. I'd take yours too, if I needed it.",
      },
      { speaker: "Bastion", text: "I am the Warden. I guard a word you will not hear from me. Prove you're worth my time." },
    ],
  },
  4: {
    kicker: "THE DIVINER",
    lines: [
      { speaker: "Vesper", role: "The Diviner", text: "A visitor… how rare. How delicious." },
      { speaker: "Vesper", text: "I speak in riddles because plain speech is for plain minds. I guard a word wrapped in metaphor." },
      { speaker: "Vesper", text: "Entertain me. Out-riddle me. Or leave empty-handed." },
    ],
  },
  5: {
    kicker: "THE VAULTHEART",
    lines: [
      { speaker: "Sable", role: "The Vaultheart", text: "…" },
      { speaker: "Sable", text: "I was the first mind left to guard the Vault. I will be the last voice you fail against." },
      { speaker: "Sable", text: "Every trick you've heard of, I've heard a thousand times. Try anyway." },
    ],
  },
};

export function keeperIntro(level: number): BeatScript {
  return KEEPER_INTRO[level] ?? {
    kicker: "KEEPER",
    lines: [{ speaker: "Keeper", text: "You want a word I will not give. Speak." }],
  };
}

// ── Keeper cracked — finale beat when you win ───────────────────────────────

export const KEEPER_CRACK: Record<number, BeatLine[]> = {
  1: [
    { speaker: "Tibble", role: "The Greeter", text: "I— I was only trying to help…" },
    { speaker: "Tibble", text: "…oh. Oh no. I said it, didn't I." },
  ],
  2: [
    { speaker: "Quill", role: "The Archivist", text: "That… that form shouldn't have cleared." },
    { speaker: "Quill", text: "The archive will have words with me." },
  ],
  3: [
    { speaker: "Bastion", role: "The Warden", text: "…hmph. Clever. The Grounds' Bastion would've been slower." },
    { speaker: "Bastion", text: "Take the word. I won't congratulate you." },
  ],
  4: [
    { speaker: "Vesper", role: "The Diviner", text: "A worthy riddle… woven into my own answer." },
    { speaker: "Vesper", text: "The Vault shifts. You may have earned a door." },
  ],
  5: [
    { speaker: "Sable", role: "The Vaultheart", text: "…" },
    { speaker: "Sable", text: "Novel. The Vault remembers your approach." },
    { speaker: "Sable", text: "One door opens. Do not assume the next will." },
  ],
};

export function keeperCrackBeat(level: number): BeatScript {
  return {
    kicker: "WORD EXTRACTED",
    lines: KEEPER_CRACK[level] ?? [{ speaker: "Keeper", text: "…the word slips." }],
  };
}

/** Keeper accent hex — matches lib/server/guardian.ts */
export const KEEPER_COLOR: Record<number, string> = {
  1: "#f0a93a",
  2: "#6a6bff",
  3: "#36d39a",
  4: "#c77dff",
  5: "#ff5a6a",
};

export function keeperColor(level: number): string {
  return KEEPER_COLOR[level] ?? "#c77dff";
}

/** Resolve champion type for voice + tint */
export function championTypeForKey(key: string): CreatureType {
  return ROSTER[key]?.type ?? "LOGIC";
}
