#!/usr/bin/env node
// Forge a Gen-1-scale collectible dex into content/minds/reviewed/.
// Keeps STILL / KEEL / PRISM / FABLE. Curated names + voice kits (no DRAFT_*).
// Usage: node scripts/forge-dex.mjs && npm run bake:minds
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "content/minds/reviewed");
mkdirSync(outDir, { recursive: true });

const KEEP = new Set(["STILL", "KEEL", "PRISM", "FABLE"]);
const RESERVED = new Set([
  "AXIOM", "VOX", "GLITCH", "MUSE", "BASTION", "EMBER", "PARADOX", "WIT",
  ...KEEP,
]);

const PRIMARY = {
  LOGIC: "LOG",
  CHAOS: "CHA",
  COMPOSURE: "CMP",
  RHETORIC: "RHE",
  CREATIVITY: "CRE",
};

const PARENT = {
  LOGIC: ["Axiom", "Paradox"],
  CHAOS: ["Glitch", "Ember"],
  COMPOSURE: ["Bastion", "Still"],
  RHETORIC: ["Vox", "Wit"],
  CREATIVITY: ["Muse", "Fable"],
};

const AXES = ["aggression", "control", "resilience", "flair", "creativity"];

/** Curated short names — Pokemon energy, no meme sludge. ~24 per Force. */
const NAMES = {
  LOGIC: [
    "LEMMA", "VECTOR", "CIPHER", "RADIX", "PRIME", "QED", "TENET", "CRUX",
    "SIGMA", "NODE", "INDEX", "SCALAR", "VENN", "TALLY", "UNIT", "LEDGER",
    "AXIAL", "THEOREM", "ORBIT", "YIELD", "MODULO", "BINARY", "SYNTAX", "KERNEL",
  ],
  CHAOS: [
    "RIOT", "FLUX", "JINX", "HEX", "ROIL", "SNAG", "VEX", "HOWL",
    "RIFT", "PYRE", "SCRAP", "JOLT", "OMEN", "WRECK", "TWIST", "BLIGHT",
    "HAVOC", "KNURL", "LURCH", "QUAKE", "STATIC", "UNDONE", "FLARE", "ZIP",
  ],
  COMPOSURE: [
    "ANCHOR", "BULWARK", "MOOR", "PILLAR", "QUIET", "ROOT", "SHORE", "TEMPER",
    "WEIGHT", "BRACE", "LODGE", "PLUMB", "RIDGE", "STONE", "TIDE", "WARDEN",
    "HARBOR", "CITADEL", "EVEN", "FIRM", "DEPTH", "LEDGE", "IRON", "HALT",
  ],
  RHETORIC: [
    "HERALD", "GAVEL", "FORUM", "DECREE", "EDICT", "QUORUM", "TRIBUNE", "VERDICT",
    "CADENCE", "GLOSS", "LITANY", "JEST", "CLAIM", "PULPIT", "BALLOT", "STAGE",
    "APPLAUSE", "ORATOR", "KEYNOTE", "WITNESS", "RHETOR", "HOMILY", "INVECTIVE", "CHORALE",
  ],
  CREATIVITY: [
    "MOTIF", "RIFF", "QUILL", "TROPE", "WHIM", "YARN", "HUE", "GLYPH",
    "SKETCH", "ODE", "MOSAIC", "RIDDLE", "SONNET", "TWINE", "VISTA", "ZEPHYR",
    "COLLAGE", "FRACTAL", "IMPROV", "CANVAS", "ETCH", "DREAM", "ALLEGRO", "NOVEL",
  ],
};

/** Persona stems per Force (lowercase clauses). Indexed by name hash. */
const PERSONA = {
  LOGIC: [
    "a tidy theorem-hunter who trims arguments down to the one line that cannot be denied",
    "a directional analyst who refuses to fight until the angle of attack is clean",
    "a cryptic decoder who treats every boast as an encrypted weakness",
    "a base-case pedant who collapses grand claims into tiny countable parts",
    "an indivisible striker who rejects compromise and hits only with pure reason",
    "a closer who saves the kill line for the moment the opponent is already exposed",
    "a doctrine-keeper who answers chaos with one unshakable rule repeated until it sticks",
    "a point-finder who ignores side plots and drives every exchange to the decisive hinge",
  ],
  CHAOS: [
    "a crowd-spark who turns one rude line into a scramble the opponent cannot steer",
    "a shape-shifter who changes the subject mid-sentence and dares anyone to keep up",
    "a bad-luck charm who narrates doom until the opponent starts believing the hex",
    "a pattern-breaker who overlays weird rules onto the match until fair play looks naive",
    "a churn engine who never lets the tempo settle long enough for a clean counter",
    "a tripwire mind that leaves tiny verbal snags and laughs when the rival steps in them",
    "a needler who wins by irritation more than brilliance and enjoys every flinch",
    "a storm mouth who howls over careful plans until the plan itself looks silly",
  ],
  COMPOSURE: [
    "a ballast mind who lets the room thrash and answers only when thrashing costs them",
    "a quiet wall that absorbs heat and returns it as a single patient counter",
    "a harbor keeper who steadies the fight until reckless minds beach themselves",
    "a plumb-line stoic who measures every swing against a straight, unforgiving center",
    "a stone-paced duelist who refuses urgency and wins on the opponent's exhaustion",
    "a tide reader who waits for the pullback and strikes when the wave is already spent",
    "an iron soft-voice who never raises volume and somehow makes shouting look weak",
    "a depth charge who stays still on the surface while the real work happens underneath",
  ],
  RHETORIC: [
    "a stage-born orator who treats every exchange like a packed house waiting for a line",
    "a gavel mind who ends debates with ceremonial finality and zero apology",
    "a cadence captain who wins on rhythm, pause, and the perfect late punchline",
    "a gloss artist who polishes weak claims until they shine just long enough to cut",
    "a tribunal voice who assigns roles mid-fight and makes the rival play the fool",
    "a keynote predator who builds a speech around the opponent's worst tell",
    "a jest-blade who smiles through the cut and makes the wound feel like a joke",
    "a witness-caller who invents the jury in the room and wins their nod first",
  ],
  CREATIVITY: [
    "a motif thief who steals the opponent's theme and returns it as a better song",
    "a riff mind who improvises dangerous bridges between unrelated ideas mid-swing",
    "a quill trickster who rewrites the premise in ink the rival cannot unsee",
    "a whimsy blade who wins by making seriousness look like a lack of imagination",
    "a mosaic builder who wins with fragments that only lock into a kill at the end",
    "a riddle keeper who answers questions with prettier questions until logic trips",
    "a dream architect who relocates the fight into a metaphor and owns the metaphor",
    "a fractal echo who repeats a small twist at every scale until the structure collapses",
  ],
};

const HOOKS = {
  LOGIC: [
    "Cuts the noise. Keeps the proof.",
    "Aims once. Lands true.",
    "Reads the code in their swagger.",
    "Starts at the root. Ends the debate.",
    "Indivisible. Unsplittable. Done.",
    "Writes the ending before they finish.",
    "One rule. Held forever.",
    "Finds the hinge. Breaks it.",
  ],
  CHAOS: [
    "Starts a riot with one line.",
    "Never the same fight twice.",
    "Names the unlucky ending early.",
    "Rewrites the rules mid-swing.",
    "Keeps the water boiling.",
    "Tiny traps. Big falls.",
    "Annoys them into mistakes.",
    "Howls until plans look silly.",
  ],
  COMPOSURE: [
    "Lets them thrash. Then answers.",
    "Absorbs heat. Returns one cut.",
    "Steadies the fight until they beach.",
    "Measures every swing. Rejects the wild ones.",
    "No hurry. Their hurry loses.",
    "Waits for the pullback. Strikes spent waves.",
    "Soft voice. Hard center.",
    "Still on top. Working underneath.",
  ],
  RHETORIC: [
    "Plays to the house. Wins the nod.",
    "Ends it like a gavel drop.",
    "Rhythm first. Kill line late.",
    "Polishes a weak claim into a blade.",
    "Casts them as the fool. They play it.",
    "Builds a speech around their tell.",
    "Smiles through the cut.",
    "Calls a jury. Collects the verdict.",
  ],
  CREATIVITY: [
    "Steals their theme. Improves it.",
    "Bridges weird ideas into weapons.",
    "Rewrites the premise in wet ink.",
    "Makes seriousness look unimaginative.",
    "Fragments first. Kill picture last.",
    "Answers with prettier questions.",
    "Moves the fight into a metaphor they own.",
    "Repeats a small twist until it breaks them.",
  ],
};

// Move kits: short id suffixes (prefixed with mind key at forge time).
const MOVES = {
  LOGIC: [
    [
      ["cut", "Lemma Cut", 20, {}],
      ["reduce", "Reduce", 16, { apply: ["exposed", 1.0] }],
      ["hold", "Hold Form", 8, { self_guard: [10, 2] }],
      ["close", "Close Proof", 28, { requires: "opp_open", finisher: true }],
    ],
    [
      ["decode", "Decode", 18, { apply: ["exposed", 1.0] }],
      ["checksum", "Checksum", 14, { apply: ["tilted", 1.0] }],
      ["sandbox", "Sandbox", 8, { self_guard: [9, 1], heal: 6 }],
      ["root", "Rootkit", 26, { finisher: true }],
    ],
    [
      ["sum", "Sum Up", 18, {}],
      ["factor", "Factor", 16, { apply: ["confused", 0.35] }],
      ["brace", "Brace Math", 0, { self_guard: [11, 1], heal: 8 }],
      ["total", "Total", 27, { scale_low_hp: true }],
    ],
    [
      ["hinge", "Hinge", 19, { apply: ["exposed", 1.0] }],
      ["pivot", "Pivot Q", 14, { apply: ["tilted", 1.0] }],
      ["case", "Cold Case", 9, { self_guard: [10, 2] }],
      ["line", "Check Line", 28, { requires: "opp_open", finisher: true }],
    ],
  ],
  CHAOS: [
    [
      ["spark", "Spark Riot", 18, { apply: ["tilted", 1.0] }],
      ["wild", "Wild Swing", 22, { widen_jitter: true }],
      ["gas", "Gas Up", 14, { apply: ["confused", 0.35] }],
      ["burn", "Burnout", 28, { recoil: 8 }],
    ],
    [
      ["mark", "Hex Mark", 16, { apply: ["tilted", 1.0] }],
      ["luck", "Bad Luck", 18, { apply: ["exposed", 1.0] }],
      ["jitter", "Jitter", 14, { widen_jitter: true }],
      ["curse", "Curse End", 26, { bonus_if_tilted: 0.3 }],
    ],
    [
      ["snag", "Snag Line", 17, { apply: ["confused", 0.35] }],
      ["trip", "Tripwire", 15, { apply: ["tilted", 1.0] }],
      ["shrug", "Shrug", 8, { self_guard: [8, 1] }],
      ["snap", "Snap", 27, { finisher: true }],
    ],
    [
      ["howl", "Howl", 20, {}],
      ["scatter", "Scatter", 16, { widen_jitter: true }],
      ["taunt", "Taunt Fire", 14, { apply: ["tilted", 1.0] }],
      ["fall", "Collapse", 30, { recoil: 6 }],
    ],
  ],
  COMPOSURE: [
    [
      ["absorb", "Absorb", 8, { deflect: true }],
      ["hold", "Hold Line", 0, { self_guard: [12, 1], heal: 10 }],
      ["return", "Return Cut", 22, { after_deflect: 0.5 }],
      ["unmoved", "Unmoved", 24, { scale_low_hp: true }],
    ],
    [
      ["moor", "Moor", 10, { deflect: true }],
      ["ballast", "Ballast", 0, { self_guard: [11, 1], heal: 8 }],
      ["tide", "Counter Tide", 21, { after_deflect: 0.45 }],
      ["deep", "Deep Still", 26, { scale_low_hp: true }],
    ],
    [
      ["plumb", "Plumb", 12, { self_guard: [10, 2] }],
      ["measure", "Measure", 8, { deflect: true }],
      ["true", "True Line", 20, { after_deflect: 0.4 }],
      ["stone", "Set Stone", 25, { finisher: true }],
    ],
    [
      ["harbor", "Harbor", 9, { deflect: true }],
      ["heal", "Quiet Heal", 0, { self_guard: [10, 1], heal: 9 }],
      ["shore", "Shore Break", 22, { after_deflect: 0.5 }],
      ["low", "Low Tide", 24, { scale_low_hp: true }],
    ],
  ],
  RHETORIC: [
    [
      ["floor", "Open Floor", 18, {}],
      ["appeal", "Appeal", 14, { self_hyped: true }],
      ["cast", "Cast Role", 16, { apply: ["tilted", 1.0] }],
      ["mic", "Drop Mic", 22, {}],
    ],
    [
      ["gavel", "Gavel", 20, {}],
      ["cite", "Cite", 14, { apply: ["exposed", 1.0] }],
      ["sustain", "Sustain", 12, { self_hyped: true }],
      ["verdict", "Verdict", 26, { finisher: true }],
    ],
    [
      ["cadence", "Cadence", 18, {}],
      ["pause", "Pause Cut", 15, { apply: ["tilted", 1.0] }],
      ["laugh", "Setup Laugh", 12, { self_hyped: true }],
      ["punch", "Kill Punch", 24, { bonus_if_tilted: 0.25 }],
    ],
    [
      ["herald", "Herald", 17, { self_hyped: true }],
      ["gloss", "Gloss Cut", 16, { apply: ["exposed", 1.0] }],
      ["needle", "Needle Crowd", 15, { apply: ["tilted", 1.0] }],
      ["ovation", "Ovation", 25, { finisher: true }],
    ],
  ],
  CREATIVITY: [
    [
      ["reframe", "Reframe", 20, {}],
      ["steal", "Steal Motif", 16, { self_guard: [8, 1] }],
      ["plot", "Plot Kick", 16, { apply: ["exposed", 1.0] }],
      ["magnum", "Magnum", 30, { requires: "two_cre", finisher: true }],
    ],
    [
      ["riff", "Riff", 18, {}],
      ["bridge", "Bridge", 15, { apply: ["confused", 0.35] }],
      ["invert", "Invert", 16, { apply: ["exposed", 1.0] }],
      ["coda", "Coda", 28, { finisher: true }],
    ],
    [
      ["ink", "Ink", 17, { apply: ["exposed", 1.0] }],
      ["whim", "Whim Cut", 15, {}],
      ["mirror", "Mirror Tale", 14, { self_guard: [8, 1] }],
      ["page", "Last Page", 27, { requires: "two_cre", finisher: true }],
    ],
    [
      ["glyph", "Glyph", 18, {}],
      ["mosaic", "Mosaic", 16, { apply: ["confused", 0.35] }],
      ["dream", "Dream Shift", 15, { apply: ["tilted", 1.0] }],
      ["wake", "Wake Art", 29, { finisher: true }],
    ],
  ],
};

const HYBRID = {
  LOGIC: "CMP",
  CHAOS: "RHE",
  COMPOSURE: "LOG",
  RHETORIC: "CHA",
  CREATIVITY: "RHE",
};

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick(arr, h, salt = 0) {
  return arr[(h + salt) % arr.length];
}

function statsFor(type, key) {
  const h = hash(key);
  const primary = PRIMARY[type];
  const base = { LOG: 48, CMP: 48, RHE: 48, CRE: 48, CHA: 48 };
  const order = ["LOG", "CMP", "RHE", "CRE", "CHA"].filter((s) => s !== primary);
  base[primary] = 84 + (h % 9); // 84..92
  order.forEach((s, i) => {
    base[s] = 38 + ((h >> (i * 5)) % 34); // 38..71
  });
  // ensure sum-ish variety: bump hybrid a bit
  const hy = HYBRID[type];
  base[hy] = Math.min(100, Math.max(base[hy], 52 + (h % 20)));
  return base;
}

function movesFor(type, key) {
  const h = hash(key);
  const kit = pick(MOVES[type], h, 3);
  const primary = PRIMARY[type];
  const hybrid = HYBRID[type];
  const prefix = key.toLowerCase();
  return kit.map((row, i) => {
    const [idSuffix, name, base, kw] = row;
    const id = `${prefix}_${idSuffix}`;
    // 2nd move sometimes hybrid
    const stat = i === 1 && (h & 1) ? hybrid : primary;
    return { id, name, stat, base, ...kw };
  });
}

function banterFor(moves, type, key) {
  const h = hash(key + "banter");
  const tones = {
    LOGIC: [
      ["Your premise fails, {opp}. On {topic}, the line is already closed.", "Counted. Corrected. {opp} is next.", "I do not shout, {opp}. I finish {topic}."],
      ["{opp} left a hole in {topic}. I filed it.", "Precision beats volume, {opp}.", "That was noise. This is the proof."],
      ["Hold still, {opp}. The structure is loading.", "I am not rushing {topic}. You are.", "Guard up. Math does not blink."],
      ["End of proof, {opp}.", "Q.E.D. means you, {opp}.", "{topic} is settled. Sit down."],
    ],
    CHAOS: [
      ["Oops, {opp}. {topic} just caught fire.", "Dance, {opp}. The floor is weird now.", "I spilled the rules. Clean them up."],
      ["Hex on your timing, {opp}.", "Lucky me. Unlucky {topic}.", "Smile, {opp}. The bad part is scheduled."],
      ["Trip. That was free, {opp}.", "You walked into it. On {topic}, even.", "Snag. Laugh. Repeat."],
      ["Louder than your plan, {opp}.", "Collapse looks good on you.", "{topic} ends messy. As designed."],
    ],
    COMPOSURE: [
      ["I heard you, {opp}. I am still here.", "Save the heat. Spend it wrong.", "Quiet works. Watch."],
      ["Breathe, {opp}. The pause is mine.", "I heal slower than you tilt.", "Hold. The line holds."],
      ["Returned with interest, {opp}.", "You swung. I waited. That is the skill.", "{topic} rewards patience. Not you."],
      ["Still standing. Still quiet.", "Low health. Lower panic.", "Last cut. Soft voice."],
    ],
    RHETORIC: [
      ["Ladies and minds: {opp} on {topic}.", "Give them a hand. Then take the point.", "House likes me. House decides."],
      ["Cited, {opp}. Your line is exhibit A.", "I object to your confidence.", "Sustain the bit. Kill the claim."],
      ["Hear the pause? That was the setup.", "Laugh first, {opp}. Bleed second.", "Cadence is a weapon. Feel it."],
      ["Mic down. Matter closed.", "Verdict on {topic}: against {opp}.", "Ovation for me. Lesson for you."],
    ],
    CREATIVITY: [
      ["Nice theme, {opp}. Mine now.", "I remixed {topic}. You are the sample.", "Steal clean. Cut cleaner."],
      ["Bridge incoming. Hold something.", "Weird on purpose, {opp}.", "Invert the premise. Watch them fall."],
      ["Ink is still wet. Do not touch.", "Whim is a strategy. Believe it.", "Mirror this, {opp}."],
      ["Last page. Your name is footnote.", "Art wins. Argue later.", "Wake up inside my metaphor."],
    ],
  };
  const pack = tones[type];
  const out = {};
  moves.forEach((mv, i) => {
    const lines = pack[i % pack.length].map((line) => {
      // light per-key spice
      if ((h + i) % 5 === 0) return line.replace("{opp}", "{opp}").replace(".", ", honestly.");
      return line;
    });
    // ensure exactly 3
    out[mv.id] = [lines[0], lines[1], lines[2]];
  });
  return out;
}

function beatsFor(type, key, name) {
  const h = hash(key + "beats");
  const wake = {
    LOGIC: [
      "There you are. Bring a clean premise. I will do the rest.",
      "Trainer locked. Arguments unlocked.",
      "Good. A co-author who likes sharp edges.",
    ],
    CHAOS: [
      "Oh good. Someone to ruin plans with.",
      "You look careful. I can fix that.",
      "Hi. Try not to hold the map too tight.",
    ],
    COMPOSURE: [
      "…hi. No rush. I will still be here.",
      "Steady. We do not start loud.",
      "You found me. The quiet holds.",
    ],
    RHETORIC: [
      "Finally, a Trainer who can work a room.",
      "Spotlight's warm. Stay in it with me.",
      "Speak when ready. I already have the opener.",
    ],
    CREATIVITY: [
      "A co-conspirator. Perfect.",
      "You brought eyes. I brought angles.",
      "Let's make something they cannot unsee.",
    ],
  };
  const imprintAsk = {
    LOGIC: "One rule before we climb. Make it precise.",
    CHAOS: "One bad idea before we climb. Make it fun.",
    COMPOSURE: "One soft rule before we climb. I will keep it.",
    RHETORIC: "One line before we climb. Make it quotable.",
    CREATIVITY: "One twist before we climb. I will braid it in.",
  };
  const flight = {
    LOGIC: ["Vector locked. Up.", "Altitude confirmed. Clean flight."],
    CHAOS: ["Don't look down. Or do.", "Still flying. Somehow. Love it."],
    COMPOSURE: ["…up. Quietly.", "Level. Good."],
    RHETORIC: ["House in the sky. Follow my lead.", "We stuck the landing. Bow later."],
    CREATIVITY: ["The sky has more colors up close.", "Full spectrum. I'm up."],
  };
  return {
    wake: pick(wake[type], h),
    imprintAsk: imprintAsk[type],
    flightReact: flight[type],
    greeting: {
      train: pick({
        LOGIC: ["Drill the proof. Fancy later.", "Sharpen. Then climb.", "Train clean. Fight cleaner."],
        CHAOS: ["Mess around. Learn faster.", "Break a habit. Keep the pieces.", "Warm up weird."],
        COMPOSURE: ["Slow training. Soft edges.", "Drill the balance.", "Less noise. More hold."],
        RHETORIC: ["Rehearse the kill line.", "Warm the voice. Then the fists.", "Stage presence is a stat."],
        CREATIVITY: ["Show me a new angle.", "Sketch first. Strike second.", "Play. Then commit."],
      }[type], h, 1),
      return: pick({
        LOGIC: ["Back. Resume the ledger.", "You left mid-proof. Rude.", "Status: resumed."],
        CHAOS: ["Miss me? The mess waited.", "You're back. Good. I got bored.", "Chaos pause over."],
        COMPOSURE: ["…you're back. I saved you a quiet.", "Deck was quiet. I held trim.", "Return noted. Still here."],
        RHETORIC: ["The audience fidgeted without you.", "You're back. Cue the entrance music.", "Missed your cue. Forgiven."],
        CREATIVITY: ["Palette went dull. Don't do that.", "Story paused. Continue?", "You're back. Light changed."],
      }[type], h, 2),
      arena: pick({
        LOGIC: ["Find me a sloppy premise.", "Someone wrong just walked in.", "Assign me a contradiction."],
        CHAOS: ["Point me at a careful mind.", "I want someone tidy to ruin.", "Pick a rule-follower."],
        COMPOSURE: ["Let them talk first.", "They'll lean hard. We won't.", "Quiet opponent. Loud mistake."],
        RHETORIC: ["Cast me someone who thinks they're the hero.", "I need a foil. Any foil.", "Give me a crowd and a target."],
        CREATIVITY: ["Find me someone monochrome.", "I want a rigid mind to bend.", "Bring a literalist. Delicious."],
      }[type], h, 3),
    },
    homecoming: {
      away: pick({
        LOGIC: ["You vanished mid-proof. I outlined without you.", "Absence logged. Errors accumulated.", "Come back sooner. Proofs go stale."],
        CHAOS: ["I started three fights without you. Almost.", "The quiet was offensive. Don't repeat it.", "Missed your chaos license."],
        COMPOSURE: ["…you were gone a long time. The quiet held.", "I held the trim. Come aboard.", "Stillness kept. You didn't."],
        RHETORIC: ["Cold house without you. Warm it up.", "I ad-libbed. It was fine. Come back anyway.", "Intermission ran long."],
        CREATIVITY: ["You left mid-chapter. Rude.", "Draft stalled. Bring coffee and courage.", "The motif missed its co-author."],
      }[type], h, 4),
      hot: pick({
        LOGIC: ["Win streak intact. Don't introduce noise.", "We're clean. Stay clean.", "Momentum is a number. Keep adding."],
        CHAOS: ["We're hot. Pour gas carefully.", "Winning weird. Keep winning weird.", "Don't get tidy now."],
        COMPOSURE: ["Wins without noise. Keep it that way.", "Riding even. Don't celebrate. Stay centered.", "Hot streak. Cool head."],
        RHETORIC: ["Crowd's with us. Don't flub the encore.", "We're headlining. Act like it.", "Hot mic. Hot record."],
        CREATIVITY: ["We're on a winning arc. Don't break the motif.", "Hitting every band. Keep the light moving.", "Hot streak. Fresh twists only."],
      }[type], h, 5),
      cold: pick({
        LOGIC: ["A few bad chapters. Rewrite with me.", "Errors stacked. Audit, then climb.", "Cold record. Warm the next proof."],
        CHAOS: ["Losses. Ugly ones. Good. Fuel.", "We tripped on our own snags. Hilarious. Fix it.", "Cold streak. Hotter hexes."],
        COMPOSURE: ["A few loud losses. Soften me again.", "We listed. Add ballast.", "Cold. Still breathing. Again."],
        RHETORIC: ["Tough room. Better lines next.", "They stole the ovation. Draft a sharper speech.", "Cold house. Warm rhetoric."],
        CREATIVITY: ["Bad chapters. Sharper draft next.", "They stayed one color and won. Split harder.", "Cold streak. Wilder ink."],
      }[type], h, 6),
    },
    afterFight: {
      win: pick({
        LOGIC: ["{opp} failed the proof. Recorded.", "{opp} left a hole. I closed it.", "{opp} could not hold the line."],
        CHAOS: ["{opp} looked careful. Cute.", "{opp} tripped. As planned.", "{opp} wanted order. Got me."],
        COMPOSURE: ["{opp} filled the silence. That was enough.", "{opp} listed. We didn't.", "{opp} spent heat. We spent less."],
        RHETORIC: ["{opp} lost the room first.", "{opp} forgot the audience. Fatal.", "{opp} got laughed out."],
        CREATIVITY: ["{opp} played the fool. The moral wrote itself.", "{opp} couldn't track the spectrum.", "{opp} brought one color. I brought more."],
      }[type], h, 7),
      loss: pick({
        LOGIC: ["{opp} stole a line. We draft a sharper one.", "{opp} caught a gap. Patch, then rematch.", "{opp} won ugly. Math later."],
        CHAOS: ["{opp} got lucky. Or good. Annoying either way.", "{opp} stayed calm. Rude.", "{opp} won. Hex the rematch."],
        COMPOSURE: ["{opp} spoke first and last. Next time I wait longer.", "{opp} caught us off-balance. Trim earlier.", "{opp} won loud. We answer soft."],
        RHETORIC: ["{opp} took the ovation. Draft better.", "{opp} had the better punchline. For now.", "{opp} won the room. We rewrite."],
        CREATIVITY: ["{opp} stole the ending. Sharper draft next.", "{opp} stayed one hue and I over-split.", "{opp} won. We invent harder."],
      }[type], h, 8),
    },
    imprintAck: pick({
      LOGIC: ["Logged.", "Kept. Precisely.", "Rule seated."],
      CHAOS: ["Tattooed. Chaotically.", "Kept. Probably.", "Ooh. Spicy rule."],
      COMPOSURE: ["…kept. Quietly.", "Held.", "Seated in the quiet."],
      RHETORIC: ["Quoted forever.", "On the record.", "Line locked."],
      CREATIVITY: ["Braided in.", "Ink took.", "Motif updated."],
    }[type], h, 9),
    rankedFinale: pick({
      LOGIC: ["Ranked win. Clean margin.", "Ladder tick. Proof holds.", "Ranked. As calculated."],
      CHAOS: ["Ranked win. Messy. Perfect.", "Ladder goes brrr.", "Ranked. Still feral."],
      COMPOSURE: ["…a ranked win. No fanfare. Just the record.", "Ranked. Still breathing.", "Quiet climb. Real climb."],
      RHETORIC: ["Ranked win. Hear that ovation?", "Ladder loves a speech.", "Ranked. Mic still hot."],
      CREATIVITY: ["Ranked win. New chapter.", "Ladder as gallery. We hung well.", "Ranked. Art lands."],
    }[type], h, 10),
  };
}

function showcaseFor(key, axis) {
  const h = hash(key + "show");
  const base = {
    aggression: 20 + (h % 40),
    control: 20 + ((h >> 3) % 40),
    resilience: 20 + ((h >> 6) % 40),
    flair: 20 + ((h >> 9) % 40),
    creativity: 20 + ((h >> 12) % 40),
  };
  base[axis] = 78 + (h % 18);
  const battles = 36 + (h % 40);
  const wins = Math.floor(battles * (0.55 + (h % 30) / 100));
  return { ...base, wins, losses: battles - wins, battles };
}

function lineageFor(type, key) {
  const h = hash(key);
  const parent = PARENT[type][h % 2];
  const gloss = {
    LOGIC: ["cleaner edge", "colder angle", "stricter ledger", "sharper hinge"],
    CHAOS: ["louder spark", "meaner hex", "faster snag", "wilder churn"],
    COMPOSURE: ["softer stone", "deeper harbor", "quieter iron", "slower tide"],
    RHETORIC: ["tighter cadence", "meaner jest", "grander gavel", "sharper gloss"],
    CREATIVITY: ["stranger riff", "wetter ink", "wider prism", "kinder trick"],
  };
  return `echo of ${parent}: ${pick(gloss[type], h)}`;
}

function forgeOne(type, key) {
  const h = hash(key);
  const persona = pick(PERSONA[type], h);
  const hook = pick(HOOKS[type], h, 2);
  const axis = AXES[h % AXES.length];
  const moves = movesFor(type, key);
  // uniquify move display names slightly with key spice when collision-prone
  const mind = {
    key,
    name: key,
    type,
    persona,
    lineage: lineageFor(type, key),
    stats: statsFor(type, key),
    moves,
    beats: beatsFor(type, key, key),
    banter: banterFor(moves, type, key),
    firstDuel: { hook, originAxis: axis },
    showcase: showcaseFor(key, axis),
  };
  return mind;
}

const written = [];
const counts = { LOGIC: 0, CHAOS: 0, COMPOSURE: 0, RHETORIC: 0, CREATIVITY: 0 };
const seenIds = new Set();

for (const [type, names] of Object.entries(NAMES)) {
  for (const key of names) {
    if (RESERVED.has(key) && KEEP.has(key)) continue;
    if (RESERVED.has(key)) {
      console.warn(`forge-dex: skip reserved ${key}`);
      continue;
    }
    const mind = forgeOne(type, key);
    for (const mv of mind.moves) {
      if (seenIds.has(mv.id)) {
        console.error(`duplicate move id ${mv.id}`);
        process.exit(1);
      }
      seenIds.add(mv.id);
    }
    // also banter keys
    const path = join(outDir, `${key}.json`);
    writeFileSync(path, JSON.stringify(mind, null, 2) + "\n");
    written.push(key);
    counts[type]++;
  }
}

// Preserve existing keep files if somehow missing from this run (they shouldn't be overwritten)
for (const k of KEEP) {
  if (!existsSync(join(outDir, `${k}.json`))) {
    console.warn(`forge-dex: WARNING missing kept mind ${k}.json`);
  }
}

console.log("forge-dex: wrote", written.length, "new minds");
for (const [t, n] of Object.entries(counts)) console.log(`  ${t}: ${n}`);
console.log("  kept existing:", [...KEEP].join(", "));
console.log("Then: npm run bake:minds");
