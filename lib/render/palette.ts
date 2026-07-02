// ─────────────────────────────────────────────────────────────────────────────
// Body palette — turns one tinted blob into an identifiable individual.
//
// The old build tinted the WHOLE model a single Force hue with a ±5% wiggle, so
// every LOGIC mind was the same blue robot. This instead gives each individual a
// COHERENT MULTI-COLOUR scheme anchored on its Force: a primary (the suit), a
// near-tone secondary, a pop accent, light trim, and tinted dark — distributed
// across body regions by a per-individual "clothing pattern". Same Force still
// reads as the same family (primary dominates the torso), but twenty in a room
// are now distinct: different patterns, different limb/helmet colours, different
// trim. The base mesh has real named parts (Head, Torso, Shoulder, Arm, Hand,
// Leg, LowerLeg, Foot) and three materials (Main / Grey / Black), so we paint by
// region + material role.
// ─────────────────────────────────────────────────────────────────────────────

import type { CreatureType } from "@/lib/types";

export type Region = "head" | "torso" | "shoulder" | "arm" | "hand" | "thigh" | "shin" | "foot";
export type Side = "L" | "R" | "";
export type MatRole = "main" | "plate" | "dark";
type Slot = "primary" | "secondary" | "accent" | "trim" | "dark";

// ── Force colour identity ─────────────────────────────────────────────────────
// Each Force owns a two-tone pair: a PRIMARY (the canon Force hue, dominates the
// body) and a curated SECONDARY companion. Regular minds are restrained to this
// pair so a Force reads as ONE recognisable scheme at a glance; Keepers ignore it
// and get a richer, patterned, multi-colour treatment so bosses stand apart.
// Note the companions deliberately split the warm Chorus/Spark twins: Chorus
// leans burnt-orange, Spark leans hot-pink.
export interface ForceColors {
  primary: string;
  secondary: string;
}
export const FORCE_COLORS: Record<CreatureType, ForceColors> = {
  LOGIC: { primary: "#4aa3ff", secondary: "#bfe6ff" }, // force blue + ice
  CHAOS: { primary: "#ff4ad1", secondary: "#8a3bff" }, // force magenta + violet
  COMPOSURE: { primary: "#36d39a", secondary: "#0f6f63" }, // force jade + deep teal
  RHETORIC: { primary: "#f0a93a", secondary: "#b5481f" }, // force amber + burnt sienna
  CREATIVITY: { primary: "#f5d020", secondary: "#ff5db0" }, // force gold + hot pink
};
export function forceColors(type: CreatureType): ForceColors {
  return FORCE_COLORS[type] ?? FORCE_COLORS.LOGIC;
}

// ── Force "hero skin" ─────────────────────────────────────────────────────────
// The canon look every regular mind of a Force wears. A shared GOLD core (torso +
// gloves + shoes + shoulders) ties the five together as one cast; each Force then
// owns a distinct head dome, limb colour, eye glow, and floating-cube hue so the
// species still read apart at a glance. Keepers ignore this and keep their richer,
// patterned treatment (see bodyPalette `rich`). Tones are chosen to stay inside
// the existing Force palette (FORCE_COLORS) so the world stays colour-coherent.
export const GOLD = "#f5d020"; // canon gold — matches CREATIVITY primary + the legend crown

export interface ForceSkin {
  /** head dome */
  head: string;
  /** glowing eyes + emissive seams */
  eye: string;
  /** upper arms */
  arm: string;
  /** upper legs */
  leg: string;
  /** floating energy cubes / shards / orbs */
  cube: string;
  /** thin trim (the Grey "plate" material — usually gold) */
  trim: string;
  /** gold core override (torso / hands / feet / shoulders) — defaults to GOLD */
  gold?: string;
}

export const FORCE_SKINS: Record<CreatureType, ForceSkin> = {
  // Static — vibrant cyber-pop: cyan dome, magenta limbs, pink cubes, gold core
  CHAOS: { head: "#22d3d8", eye: "#67f5ff", arm: "#ff4ad1", leg: "#ff4ad1", cube: "#ff4ad1", trim: GOLD },
  // Calm — fresh + retro-futuristic: green dome, copper arms, green legs, brown/gold cubes
  COMPOSURE: { head: "#3ad9a0", eye: "#ffd84a", arm: "#cf7a33", leg: "#36d39a", cube: "#b07a2e", trim: GOLD },
  // Logic — bright tech-knight: deep blue dome + blue limbs, gold eyes, orange/brown cubes
  LOGIC: { head: "#2f63c8", eye: "#ffd84a", arm: "#4aa3ff", leg: "#4aa3ff", cube: "#d98a3a", trim: GOLD },
  // Chorus — bold + heroic: red dome + red limbs, orange eyes, orange/brown cubes
  RHETORIC: { head: "#e23b34", eye: "#ffae3a", arm: "#e2453a", leg: "#e2453a", cube: "#d9772f", trim: GOLD },
  // Spark — gold hero with purple accents + cyan cubes
  CREATIVITY: { head: GOLD, eye: "#a45bff", arm: GOLD, leg: GOLD, cube: "#5fd8e0", trim: "#9b5cff" },
};

export function forceSkin(type: CreatureType): ForceSkin {
  return FORCE_SKINS[type] ?? FORCE_SKINS.LOGIC;
}

// ── colour math (dependency-free; mirrors the helpers in biomes.ts) ───────────
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(v, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
    if (h < 0) h += 1;
  }
  return [h, s, l];
}
function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 1) + 1) % 1;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  const seg = Math.floor(h * 6);
  if (seg === 0) [r, g, b] = [c, x, 0];
  else if (seg === 1) [r, g, b] = [x, c, 0];
  else if (seg === 2) [r, g, b] = [0, c, x];
  else if (seg === 3) [r, g, b] = [0, x, c];
  else if (seg === 4) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}
function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHsl(r, g, b);
}

// small deterministic PRNG so a given seed always yields the same individual
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFrom(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ── clothing patterns — how the main-material colour is distributed by region ─
interface Scheme {
  id: string;
  /** which slot the Grey "plate" material takes (trim by default, accent for flair) */
  plate: Slot;
  /** the colour slot the Main material takes, per region/side */
  main: (r: Region, s: Side) => Slot;
}

const SCHEMES: Scheme[] = [
  // uniform suit — primary body, light trim
  { id: "suit", plate: "trim", main: () => "primary" },
  // coloured helmet over a primary suit
  { id: "helm", plate: "trim", main: (r) => (r === "head" ? "accent" : "primary") },
  // panelled — torso primary, shoulders/hands pop, limbs near-tone
  {
    id: "panel",
    plate: "trim",
    main: (r) =>
      r === "torso" ? "primary" : r === "shoulder" || r === "hand" ? "accent" : r === "arm" || r === "thigh" ? "secondary" : r === "head" ? "secondary" : "primary",
  },
  // two-tone — primary above the waist, near-tone legs/feet
  { id: "twoTone", plate: "trim", main: (r) => (r === "thigh" || r === "shin" || r === "foot" ? "secondary" : "primary") },
  // harlequin — split down the middle (strongest individual tell)
  { id: "harlequin", plate: "trim", main: (r, s) => (r === "head" ? "accent" : s === "L" ? "primary" : "secondary") },
  // racer — primary body, accent extremities + plates, near-tone shins
  {
    id: "racer",
    plate: "accent",
    main: (r) => (r === "hand" || r === "foot" || r === "shoulder" ? "accent" : r === "shin" ? "secondary" : "primary"),
  },
];

// Regular minds draw only from the CALM schemes so a Force reads as a clean
// two-tone family. Keepers get the full set (incl. the louder harlequin/panel/
// racer patterns) for a richer, unmistakably-boss look.
const CALM_SCHEME_IDS = new Set(["suit", "helm", "twoTone"]);
const CALM_SCHEMES = SCHEMES.filter((s) => CALM_SCHEME_IDS.has(s.id));

export interface BodyPalette {
  scheme: string;
  primary: string;
  secondary: string;
  accent: string;
  trim: string;
  dark: string;
  /** glow colour for emissive seams / archetype features (= the eye colour) */
  glow: string;
  /** floating energy cubes / shards / orbs colour */
  cube: string;
  colorFor: (region: Region, side: Side, role: MatRole) => string;
}

export interface PaletteOpts {
  /** the Force's curated companion colour (minds are restrained to this) */
  secondary?: string;
  /** keepers: ignore the restrained pair, use richer patterns + multi-colour */
  rich?: boolean;
  /** the mind's Force — regular minds wear that Force's canon hero skin */
  type?: CreatureType;
}

const clampS = (v: number) => Math.min(0.95, Math.max(0, v));
const clampL = (v: number) => Math.min(1, Math.max(0, v));

/** Build a coherent individual palette from a Force anchor colour + a stable
 *  seed. With a curated `secondary` and `rich:false` the result is a restrained
 *  two-tone Force scheme; with `rich:true` (Keepers) it roams to a louder,
 *  patterned, multi-colour look. */
export function bodyPalette(forceHex: string, seed: number, opts: PaletteOpts = {}): BodyPalette {
  const { secondary: companion, rich = false, type } = opts;
  // Regular minds wear their Force's canon hero skin (fixed region→colour map,
  // gold core, tiny per-individual jitter). Keepers fall through to the richer,
  // patterned, multi-colour treatment below.
  if (!rich && type && FORCE_SKINS[type]) return skinPalette(FORCE_SKINS[type], seed);

  const rnd = mulberry32(seed || 1);
  const [bh, bs] = hexToHsl(forceHex);

  // primary: the Force hue, lightly individualised
  const primary = hslToHex(bh + (rnd() - 0.5) * 0.05, clampS(bs * (0.85 + rnd() * 0.25)), 0.46 + rnd() * 0.12);

  // secondary: minds use the CURATED companion (lightly individualised) so the
  // Force reads as one fixed two-tone family; keepers (or anything without a
  // companion) roam to a free near-tone for variety.
  let secondary: string;
  if (companion && !rich) {
    const [sh, ss, sl] = hexToHsl(companion);
    secondary = hslToHex(sh + (rnd() - 0.5) * 0.03, clampS(ss * (0.85 + rnd() * 0.2)), clampL(sl + (rnd() - 0.5) * 0.1));
  } else {
    const dir = rnd() > 0.5 ? 1 : -1;
    const lighter = rnd() > 0.5;
    const secL = lighter ? 0.6 + rnd() * 0.16 : 0.24 + rnd() * 0.1;
    const hueSpread = rich ? 0.08 : 0.025; // keepers roam further → more variety
    secondary = hslToHex(bh + dir * hueSpread, clampS(bs * (0.6 + rnd() * 0.35)), secL);
  }

  // accent: keepers get the canon gold (or a hot in-family) pop; minds stay
  // inside their two-colour identity — a brighter tint of the companion — so they
  // never sprout a third hue and muddy the Force read.
  let accent: string;
  if (rich) {
    accent = rnd() < 0.6 ? hslToHex(0.13, 0.82 + rnd() * 0.13, 0.5 + rnd() * 0.12) : hslToHex(bh + (rnd() - 0.5) * 0.04, clampS(bs + 0.15), 0.62 + rnd() * 0.12);
  } else {
    const [ah, as0, al] = hexToHsl(companion || secondary);
    accent = hslToHex(ah, clampS(as0 + 0.12), Math.min(0.74, al + 0.18));
  }

  const trim = hslToHex(bh, 0.12 + rnd() * 0.15, 0.66 + rnd() * 0.12); // light metallic, faintly tinted
  const dark = hslToHex(bh, 0.35 + rnd() * 0.2, 0.1 + rnd() * 0.05); // tinted near-black joints
  const glow = hslToHex(bh + (rnd() - 0.5) * 0.04, clampS(bs + 0.1), 0.55);

  const pool = rich ? SCHEMES : CALM_SCHEMES;
  const scheme = pool[Math.floor(rnd() * pool.length)];
  const slot: Record<Slot, string> = { primary, secondary, accent, trim, dark };

  return {
    scheme: scheme.id,
    primary,
    secondary,
    accent,
    trim,
    dark,
    glow,
    cube: glow, // keepers: cubes carry the glow colour (unchanged from before)
    colorFor(region, side, role) {
      if (role === "dark") return dark;
      if (role === "plate") return slot[scheme.plate];
      return slot[scheme.main(region, side)];
    },
  };
}

// ── the canon hero skin → a coherent BodyPalette ──────────────────────────────
// Gold core (torso / hands / feet / shoulders) shared across all Forces; the head
// dome, arms, legs, eyes (glow) and floating cubes are the Force's own. A small
// per-seed lightness/saturation jitter keeps a room of same-Force minds from
// looking stamped from one mould without breaking the recognisable scheme. (Body
// proportions still vary widely via the bone genome, so individuals stay distinct.)
function skinPalette(skin: ForceSkin, seed: number): BodyPalette {
  const rnd = mulberry32(seed || 1);
  const jit = (hex: string, amt: number) => {
    const [h, s, l] = hexToHsl(hex);
    return hslToHex(h, clampS(s * (0.95 + rnd() * 0.1)), clampL(l + (rnd() - 0.5) * amt));
  };
  const goldBase = skin.gold ?? GOLD;
  const head = jit(skin.head, 0.05);
  const arm = jit(skin.arm, 0.05);
  const leg = jit(skin.leg, 0.05);
  const cube = jit(skin.cube, 0.06);
  const gold = jit(goldBase, 0.04);
  const trim = skin.trim;
  const glow = skin.eye;
  const [hh] = hexToHsl(skin.head);
  const dark = hslToHex(hh, 0.4, 0.1); // tinted near-black joints

  const mainFor = (region: Region): string => {
    switch (region) {
      case "head":
        return head;
      case "arm":
        return arm;
      case "thigh":
      case "shin":
        return leg;
      // torso, shoulder, hand, foot → the shared gold core
      default:
        return gold;
    }
  };

  return {
    scheme: "forceSkin",
    primary: arm,
    secondary: leg,
    accent: goldBase,
    trim,
    dark,
    glow,
    cube,
    colorFor(region, _side, role) {
      if (role === "dark") return dark;
      if (role === "plate") return trim;
      return mainFor(region);
    },
  };
}

// ── mesh-name → region / side / material-role mapping ─────────────────────────
export function regionOf(name: string): Region {
  const n = name.toLowerCase();
  if (n.includes("head")) return "head";
  if (n.includes("torso") || n.includes("body") || n.includes("abdomen") || n.includes("hip")) return "torso";
  if (n.includes("shoulder")) return "shoulder";
  if (n.includes("hand") || n.includes("palm") || n.includes("finger")) return "hand";
  if (n.includes("lowerleg")) return "shin";
  if (n.includes("foot")) return "foot";
  if (n.includes("leg")) return "thigh";
  if (n.includes("arm")) return "arm";
  return "torso";
}
export function sideOf(name: string): Side {
  const n = name.toLowerCase();
  if (n.endsWith(".l") || n.includes(".l_") || n.includes("left")) return "L";
  if (n.endsWith(".r") || n.includes(".r_") || n.includes("right")) return "R";
  return "";
}
export function roleOf(materialName: string | undefined): MatRole {
  const n = (materialName || "").toLowerCase();
  if (n.includes("grey") || n.includes("gray")) return "plate";
  if (n.includes("black")) return "dark";
  return "main";
}

/** Restrained Handler palette — muted silver body, gold Reader trim; pledged adds Force accent on plates. */
export function readerPalette(force: CreatureType | null | undefined): BodyPalette {
  const silver = "#cfd2e8";
  const near = "#b8bcc8";
  const trim = force ? forceColors(force).primary : GOLD;
  const accent = force ? forceColors(force).secondary : GOLD;
  return {
    scheme: "reader",
    primary: silver,
    secondary: near,
    accent,
    trim,
    dark: "#3a3d48",
    glow: force ? forceColors(force).primary : GOLD,
    cube: GOLD,
    colorFor: (_region, _side, role) => {
      if (role === "plate") return trim;
      if (role === "dark") return "#3a3d48";
      return silver;
    },
  };
}
