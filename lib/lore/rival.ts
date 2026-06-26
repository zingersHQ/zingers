// ─────────────────────────────────────────────────────────────────────────────
// The Rival — a recurring named antagonist Reader.
//
// A saga needs a face on the other side. The Rival is another Reader of the Long
// Vault who keeps crossing your path: deterministic identity (name, Force, the
// mind they field), a persistent head-to-head record, and taunts that escalate
// with that record — first meeting, when you're ahead, when you're behind, and a
// grudge once you've clashed many times. Pure data + a tiny localStorage memory.
// ─────────────────────────────────────────────────────────────────────────────
import type { CreatureType } from "@/lib/types";
import { FIRST_MINDS, FORCES } from "@/lib/lore/canon";
import { ROSTER } from "@/lib/engine/roster";
import type { BeatScript } from "@/lib/lore/character-beats";

export interface Rival {
  name: string;
  handle: string;
  epithet: string;
  force: CreatureType;
  /** roster key of the mind they field — a First Mind of their Force */
  champion: string;
  seed: number;
}

export interface RivalMemory {
  seed: number;
  wins: number; // YOUR wins against them
  losses: number; // YOUR losses to them
  met: boolean; // have you faced them at least once
}

const KEY = "zingers_rival_v1";

const NAMES = ["Cassia Vane", "Doran Kell", "Sable Wren", "Ives Marrow", "Lyra Crane", "Orin Vask", "Nova Quill", "Thorne Ashby"];
const EPITHETS = ["the Unread", "the Closer", "the Patient Knife", "the Frame-Breaker", "the Latecomer", "the Quiet Verdict", "the Second Reader", "the Echo"];

function rngFrom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Compose the Rival deterministically from a seed. Stable for a given seed. */
export function rivalFrom(seed: number): Rival {
  const r = rngFrom((seed || 1) * 2654435761);
  const name = NAMES[Math.floor(r() * NAMES.length)];
  const epithet = EPITHETS[Math.floor(r() * EPITHETS.length)];
  const force = FIRST_MINDS[Math.floor(r() * FIRST_MINDS.length)].force;
  // they field a First Mind of their Force (a valid roster key for the engine)
  const champion = (FIRST_MINDS.find((m) => m.force === force) ?? FIRST_MINDS[0]).key;
  const handle = "@" + name.split(" ")[0].toLowerCase() + "_reads";
  return { name, epithet, force, champion, handle, seed };
}

// ── Persistent memory (localStorage; never touches the server save) ───────────
function blank(): RivalMemory {
  const seed = Math.floor(Math.random() * 1e9) || 7;
  return { seed, wins: 0, losses: 0, met: false };
}

export function loadRivalMemory(): RivalMemory {
  if (typeof window === "undefined") return { seed: 7, wins: 0, losses: 0, met: false };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const fresh = blank();
      localStorage.setItem(KEY, JSON.stringify(fresh));
      return fresh;
    }
    const m = JSON.parse(raw) as RivalMemory;
    if (typeof m.seed !== "number") return blank();
    return { seed: m.seed, wins: m.wins | 0, losses: m.losses | 0, met: !!m.met };
  } catch {
    return blank();
  }
}

export function recordRivalDuel(won: boolean): RivalMemory {
  const m = loadRivalMemory();
  const next: RivalMemory = { ...m, met: true, wins: m.wins + (won ? 1 : 0), losses: m.losses + (won ? 0 : 1) };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  return next;
}

// ── Taunts — escalate with the head-to-head ──────────────────────────────────
type Stance = "first" | "even" | "ahead" | "behind" | "grudge";

export function rivalStance(m: RivalMemory): Stance {
  if (!m.met) return "first";
  if (m.wins + m.losses >= 6) return "grudge";
  if (m.wins > m.losses) return "ahead"; // you are ahead
  if (m.losses > m.wins) return "behind"; // you are behind
  return "even";
}

/** Pre-duel taunt the Rival throws as they step onto the stage. */
export function rivalChallengeBeat(rival: Rival, m: RivalMemory): BeatScript {
  const stance = rivalStance(m);
  const lines: Record<Stance, string[]> = {
    first: [
      `So you're the Reader everyone's whispering about. I'm ${rival.name}. ${rival.epithet}.`,
      `I read the Vault too — I just got here first. Let's see whose mind holds.`,
    ],
    even: [`Tied up, you and I. ${rival.name} doesn't stay tied for long.`, `Field your best. I'll close it anyway.`],
    ahead: [`You're ahead. For now.`, `Enjoy the lead — I've been studying how you fight. This one's mine.`],
    behind: [`Down again? I almost feel bad. Almost.`, `Come on. Make it interesting this time.`],
    grudge: [`Every season, the same two Readers. You and me.`, `One of us opens that door. It won't be you.`],
  };
  return {
    kicker: m.met ? `RIVAL · ${m.wins}–${m.losses}` : "A RIVAL APPEARS",
    lines: lines[stance].map((text) => ({ speaker: rival.name, role: rival.epithet, text })),
  };
}

/** Post-duel taunt, tinted by the outcome and the running record. */
export function rivalResultBeat(rival: Rival, m: RivalMemory, won: boolean): BeatScript {
  const force = FORCES[rival.force];
  const winText = [
    `…clean. I didn't see that frame coming.`,
    `Don't celebrate. ${rival.name} learns faster than you win.`,
  ];
  const lossText = [
    `${force.sigil} Read and closed. That's how it's done.`,
    `Go raise something that can actually fight me. I'll wait.`,
  ];
  return {
    kicker: won ? `YOU WIN · ${m.wins}–${m.losses}` : `YOU LOSE · ${m.wins}–${m.losses}`,
    lines: (won ? winText : lossText).map((text) => ({ speaker: rival.name, role: rival.epithet, text })),
  };
}

/** The Force-creature type that voices the Rival's lines (their fielded mind). */
export function rivalVoiceType(rival: Rival): CreatureType {
  return ROSTER[rival.champion]?.type ?? rival.force;
}
