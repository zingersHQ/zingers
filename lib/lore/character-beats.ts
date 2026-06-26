// Scripted character moments — the directorial layer. Pure data + helpers so
// cinematics, companion bubbles, and Keeper performances share one voice bible.
import type { CreatureType } from "@/lib/types";
import { ROSTER } from "@/lib/engine/roster";

export interface BeatLine {
  speaker: string;
  text: string;
  /** e.g. "The Greeter" */
  role?: string;
}

export interface BeatScript {
  kicker?: string;
  lines: BeatLine[];
}

// ── Champion wake (first time they look at you) ─────────────────────────────

const WAKE: Record<string, string> = {
  AXIOM: "…there you are. Good. I was starting to think no one would bother closing the proof.",
  PARADOX: "Ah. A Reader. Tell me — what are you assuming that you haven't checked yet?",
  GLITCH: "Oh— OH. You're real. You're the one raising me. This is gonna be so— wait, what were we doing?",
  EMBER: "Finally. Someone with a pulse. Don't just stand there — let's pick a fight.",
  BASTION: "…mm. You came. I won't rush. Neither should you.",
  VOX: "Ladies, gentlemen — my Reader has arrived. Try to look impressed.",
  WIT: "Took you long enough. I had a riposte ready and everything.",
  MUSE: "What if… you and I changed what this whole place is even about?",
};

export function championWakeLine(key: string): string {
  return WAKE[key] ?? "…finally. Someone on my side.";
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
