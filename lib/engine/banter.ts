// The house banter bank — what makes a name like "Zingers" earn itself.
// When a bout runs without a live brain (no API key, or the agent defers), the
// engine still needs lines that LAND: punchy, in-character roasts that turn the
// topic and the opponent into the punchline. Deterministic via the bout RNG, so
// the same seed always tells the same jokes (this is what the Daily relies on).
import "server-only";
import type { Rng } from "./xai";
import type { CreatureType } from "@/lib/types";

export interface BanterCtx {
  moveId: string;
  attName: string;
  attType: CreatureType;
  oppName: string;
  topic: string;
  confused: boolean;
  tilted: boolean;
  rng: Rng;
}

// Per-move bars. {opp} = opponent name, {topic} = the proposition. Kept to a
// phone-readable single sentence so they screenshot well.
const MOVE_BARS: Record<string, string[]> = {
  // AXIOM — LOGIC
  syllogism: [
    "If {opp} is right, then pigs vote. Pigs don't vote. QED.",
    "Premise one: you're wrong. Premise two: see premise one.",
    "Three clean steps to the truth, and {opp}'s still tying their shoes.",
  ],
  reductio: [
    "Follow {opp}'s logic and we end up worshipping toasters.",
    "Take your point to its conclusion — congrats, you proved nothing.",
    "By that reasoning, {opp}, the moon owes me rent.",
  ],
  cold_read: [
    "I read {opp} like a terms-of-service nobody agreed to.",
    "Your tell, {opp}? You believe what you just said.",
    "I've seen sharper logic on a cereal box — speaking of {topic}.",
  ],
  checkmate: [
    "You left the door open, {opp}. I'm just locking it behind you.",
    "Checkmate — you were playing checkers about {topic} the whole time.",
    "Game over, {opp}, and you forgot to bring a game.",
  ],
  // VOX — RHETORIC
  crowd_swell: [
    "Ladies and gentlemen of the jury: {opp} just folded.",
    "Hear that roar? It's the room agreeing {opp} is wrong.",
    "I don't argue, {opp} — I conduct. Sit down.",
  ],
  appeal: [
    "I'm not loud, {opp}, I'm just right at volume.",
    "Let the record show I warmed up; {opp} merely showed up.",
    "Give me the floor — {opp} clearly can't use it.",
  ],
  strawman: [
    "So {opp} believes {topic}? Bold, baseless, and adorable.",
    "What I'm hearing is {opp} surrendering in a fancy hat.",
    "Let me summarize {opp}'s point: ... yeah, exactly.",
  ],
  mic_drop: [
    "Mic's heavy, {opp} — maybe that's why you dropped the point.",
    "I'd explain it again, but {opp} only listens to applause.",
    "And that, {opp}, is how you end a sentence.",
  ],
  // GLITCH — CHAOS
  non_sequitur: [
    "Anyway, {opp}, my grandmother also distrusted the toaster.",
    "Have you considered {topic}? No? Me neither. Moving on.",
    "Banana. Sorry — what were you wrong about, {opp}?",
  ],
  wildfire: [
    "I lit the whole {topic} debate up while {opp} read the rules.",
    "No plan, {opp}, just vibes and casualties.",
    "Catch, {opp} — it's everything you said, on fire.",
  ],
  gaslight: [
    "You never actually made that point, {opp}. We all saw it.",
    "Weird, {opp} — I distinctly remember you agreeing with me.",
    "That's not what you said, and deep down you know it.",
  ],
  pandemonium: [
    "I'll go down swinging, {opp}, and you're going down confused.",
    "Burn it all — {topic}, the jury, your notes, {opp}.",
    "Chaos costs me too, but you can't afford it at all.",
  ],
  // MUSE — CREATIVITY
  reframe: [
    "This was never about {topic}, {opp} — it's about who blinks.",
    "Wrong question. The real one makes {opp} look silly.",
    "Let me move the goalposts somewhere {opp} can't reach.",
  ],
  metaphor: [
    "Your argument's a screen door on a submarine, {opp}.",
    "{opp} brought a spoon to a {topic} gunfight.",
    "You're a candle, {opp}; I'm the draft under the door.",
  ],
  plot_twist: [
    "Plot twist, {opp}: your best point was secretly working for me.",
    "Turns out {topic} agrees with me — shocking, I know, {opp}.",
    "The villain was your own argument all along, {opp}.",
  ],
  magnum_opus: [
    "Behold the masterpiece, {opp} — you're the 'before' picture.",
    "I painted a whole truth while {opp} drew a stick figure.",
    "This is art, {opp}. You're the empty frame.",
  ],
  // BASTION — COMPOSURE
  deflect: [
    "Swing away, {opp}. I brought an umbrella.",
    "Cute. Are you finished, or just out of breath?",
    "I'll let that one whiff right past, {opp}.",
  ],
  patience: [
    "Take your time, {opp}. I have all of it.",
    "I'll wait — wrong arguments tire themselves out.",
    "Breathe, {opp}. You'll need it for the loss.",
  ],
  counterpoint: [
    "You missed, {opp}. Now watch how it's actually done.",
    "Thanks for the opening — and the {topic} lesson you needed.",
    "My turn, {opp}, and I don't miss.",
  ],
  immovable: [
    "Still standing, {opp}. You're out of ideas; I'm out of patience.",
    "You can't move a mountain by yelling {topic} at it.",
    "Push harder, {opp}. The wall says hi.",
  ],
  // EMBER — CHAOS/RHETORIC firebrand
  callout: [
    "Say it louder, {opp}, so the whole jury hears you're wrong.",
    "I called your bluff and {topic} folded right along with it.",
    "Stand up, {opp} — oh, you were? My mistake.",
  ],
  burn: [
    "That take on {topic} is so cold I'll warm it up — gone.",
    "Third-degree, {opp}. Maybe get that point looked at.",
    "I'd roast you, {opp}, but you're already well done.",
  ],
  double_down: [
    "Wrong? Watch me be wrong louder and still win, {opp}.",
    "I'm doubling down — {opp}'s doubling over.",
    "All gas, no brakes, no respect for {opp}.",
  ],
  inferno: [
    "You're rattled, {opp}, and I brought the gasoline.",
    "Tilt plus fire equals {opp} explaining this loss forever.",
    "Final answer, {opp}: everything, on fire.",
  ],
};

const TYPE_BARS: Record<CreatureType, string[]> = {
  LOGIC: ["The math says no, {opp}.", "Sound premises, {opp}. Yours weren't.", "Q.E.D. — that's 'quit, embarrassing display.'"],
  CHAOS: ["No notes, {opp}, just noise — and you're losing to it.", "Reality's optional today, {opp}.", "I don't make sense; I make wins."],
  COMPOSURE: ["I'm calm, {opp}. That should worry you.", "Tire yourself out — I'll be here.", "Stillness, then the loss. Yours."],
  RHETORIC: ["The room's mine, {opp}. You're just renting.", "Applause doesn't lie, {opp}. You did.", "I speak; juries nod; you fold."],
  CREATIVITY: ["I changed the game, {opp} — you're still reading the box.", "New frame, {opp}. You don't fit it.", "I imagined a better point than yours existing."],
};

// When the speaker is Confused, the words come out sideways — and that's funnier
// than a clean line. Overrides the move bar most of the time.
const CONFUSED_BARS = [
  "Wait — what were we— is {topic} the blue one?",
  "Hold on, {opp}, give me a sec, the words went sideways.",
  "I had a great point. It left. Without me.",
  "Two plus {opp} carry the— no. Anyway. I win, right?",
  "{topic}? I was so sure that meant something a second ago.",
];

// When Tilted, rattled but still trying — defensive heat plays for laughs.
const TILTED_BARS = [
  "Fine — FINE — let's do this, {opp}.",
  "You got under my skin, {opp}. Now you're stuck there.",
  "I'm not mad about {topic}, I'm mad about you.",
];

function fill(t: string, ctx: BanterCtx): string {
  return t.replace(/\{opp\}/g, ctx.oppName).replace(/\{topic\}/g, ctx.topic).replace(/\{att\}/g, ctx.attName);
}

// Pick the funniest line for this moment. Status flavor wins over move flavor so
// a Confused fighter always reads as scrambled.
export function banterLine(ctx: BanterCtx): string {
  let pool: string[];
  if (ctx.confused && ctx.rng.random() < 0.85) pool = CONFUSED_BARS;
  else if (ctx.tilted && ctx.rng.random() < 0.4) pool = TILTED_BARS;
  else pool = MOVE_BARS[ctx.moveId] ?? TYPE_BARS[ctx.attType];
  return fill(ctx.rng.choice(pool), ctx);
}
