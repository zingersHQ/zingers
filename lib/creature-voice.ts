// Procedural "creature voice" for the Guardian battle. Instead of the browser's
// speechSynthesis (which is flaky — it silently drops utterances fired after an
// awaited fetch, especially on Safari), we vocalise each Keeper's reply as a
// run of short synthesised blips via the Web Audio API — the same reliable path
// as the ambient music and the jump beep. Each blip's pitch follows a letter, so
// a line reads as expressive gibberish: Tibble squeaks, Sable booms.
//
// Shares the on/off preference with the music + sfx toggle (STORAGE.sound), so
// muting the world mutes the Keepers too.
import { STORAGE } from "@/lib/brand";
import type { CreatureType } from "@/lib/types";

type AudioCtor = typeof AudioContext;

function getAudioCtor(): AudioCtor | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext ??
    null
  );
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabledCache: boolean | null = null;

// Nodes from the line currently "speaking", so a new line (or a mute) can cut it
// off cleanly instead of letting blips overlap.
let active: { osc: OscillatorNode[]; gain: GainNode; filter: BiquadFilterNode }[] = [];
let endTimer: ReturnType<typeof setTimeout> | null = null;

function enabled(): boolean {
  if (enabledCache !== null) return enabledCache;
  try {
    enabledCache = localStorage.getItem(STORAGE.sound) !== "off";
  } catch {
    enabledCache = true;
  }
  return enabledCache;
}

// kept in sync by the ambience toggle so the Keepers mute with the music
export function setCreatureVoiceEnabled(on: boolean) {
  enabledCache = on;
  if (!on) stopCreature();
}

export function creatureVoiceSupported(): boolean {
  return getAudioCtor() != null;
}

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = getAudioCtor();
  if (!Ctor) return null;
  ctx = new Ctor();
  master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);
  return ctx;
}

// Web Audio also needs a user gesture to leave the "suspended" state. Call this
// from the click/submit handler (synchronously) so the context is running by the
// time we speak the reply, which happens later, after the awaited fetch.
export function primeCreature() {
  const c = ensure();
  if (c && c.state === "suspended") c.resume().catch(() => {});
}

// Per-Keeper vocal character (level → timbre). `base`/`spread` set the pitch band,
// `wave`/`sub` the raw timbre, `cutoff` the brightness, `dur`/`gap` the cadence.
interface CProfile {
  base: number; // lowest syllable pitch (Hz)
  spread: number; // pitch range above base
  wave: OscillatorType;
  sub: OscillatorType; // an octave-down body oscillator for weight
  subGain: number; // how much of the sub to mix (0..1)
  dur: number; // blip length (s)
  gap: number; // silence between blips (s)
  cutoff: number; // lowpass cutoff (Hz) — lower = darker/growlier
  gain: number; // per-blip peak volume
  warble: number; // intra-blip pitch wobble (0 = none)
}

const PROFILES: Record<number, CProfile> = {
  1: { base: 520, spread: 260, wave: "triangle", sub: "sine", subGain: 0.25, dur: 0.075, gap: 0.028, cutoff: 3200, gain: 0.1, warble: 0.0 }, // Tibble — squeaky gremlin
  2: { base: 400, spread: 200, wave: "sawtooth", sub: "triangle", subGain: 0.3, dur: 0.085, gap: 0.032, cutoff: 2300, gain: 0.085, warble: 0.0 }, // Quill — reedy, brittle
  3: { base: 170, spread: 90, wave: "square", sub: "sawtooth", subGain: 0.45, dur: 0.11, gap: 0.04, cutoff: 1100, gain: 0.11, warble: 0.0 }, // Bastion — gruff growler
  4: { base: 280, spread: 220, wave: "sine", sub: "sine", subGain: 0.4, dur: 0.12, gap: 0.05, cutoff: 1700, gain: 0.095, warble: 0.5 }, // Vesper — warped, otherworldly
  5: { base: 104, spread: 60, wave: "sawtooth", sub: "square", subGain: 0.55, dur: 0.14, gap: 0.045, cutoff: 720, gain: 0.12, warble: 0.0 }, // Sable — deep, booming core-mind
};

const DEFAULT_PROFILE: CProfile = PROFILES[1];

// Per-creature-type voice for the agent "mic battles" (the five-type pentagon),
// so each champion's spoken line has its own character: Logic is cool and precise,
// Chaos is glitchy and manic, Composure is low and steady, etc.
const TYPE_PROFILES: Record<CreatureType, CProfile> = {
  LOGIC: { base: 340, spread: 140, wave: "triangle", sub: "sine", subGain: 0.3, dur: 0.08, gap: 0.03, cutoff: 2400, gain: 0.09, warble: 0.0 },
  RHETORIC: { base: 300, spread: 175, wave: "sawtooth", sub: "triangle", subGain: 0.3, dur: 0.085, gap: 0.032, cutoff: 2200, gain: 0.085, warble: 0.0 },
  CHAOS: { base: 470, spread: 300, wave: "square", sub: "sawtooth", subGain: 0.35, dur: 0.068, gap: 0.024, cutoff: 3000, gain: 0.09, warble: 0.6 },
  COMPOSURE: { base: 200, spread: 90, wave: "sine", sub: "sine", subGain: 0.4, dur: 0.1, gap: 0.04, cutoff: 1500, gain: 0.1, warble: 0.0 },
  CREATIVITY: { base: 420, spread: 240, wave: "triangle", sub: "sine", subGain: 0.3, dur: 0.09, gap: 0.035, cutoff: 2600, gain: 0.088, warble: 0.4 },
};

export function stopCreature() {
  if (endTimer) {
    clearTimeout(endTimer);
    endTimer = null;
  }
  const c = ctx;
  for (const node of active) {
    try {
      for (const o of node.osc) o.stop();
    } catch {
      /* already stopped */
    }
    try {
      node.gain.disconnect();
      node.filter.disconnect();
    } catch {
      /* ignore */
    }
  }
  active = [];
  void c;
}

// Speak a Keeper's line as creature gibberish, keyed by guardian level.
export function speakCreature(text: string, level: number, opts?: { onEnd?: () => void }) {
  speakWith(text, PROFILES[level] ?? DEFAULT_PROFILE, opts);
}

// Speak an agent's battle line in its creature-type voice.
export function speakCreatureType(text: string, type: CreatureType, opts?: { onEnd?: () => void }) {
  speakWith(text, TYPE_PROFILES[type] ?? DEFAULT_PROFILE, opts);
}

// Core synthesis: each letter/number becomes a blip whose pitch is derived from
// the character, so the same text always sounds the same — and questions lilt
// upward at the end. Capped so long lines stay snappy.
function speakWith(text: string, p: CProfile, opts?: { onEnd?: () => void }) {
  stopCreature();
  if (!enabled()) {
    opts?.onEnd?.();
    return;
  }
  const c = ensure();
  if (!c || !master) {
    opts?.onEnd?.();
    return;
  }
  if (c.state === "suspended") c.resume().catch(() => {});

  const chars = [...text];
  const isQuestion = /\?\s*$/.test(text.trim());

  const MAX_BLIPS = 32;
  // count speakable chars so we can taper intonation across the whole line
  const speakable = chars.filter((ch) => /[a-z0-9]/i.test(ch)).length;
  const total = Math.min(speakable, MAX_BLIPS);

  let t = c.currentTime + 0.04;
  let n = 0;

  for (const ch of chars) {
    if (n >= MAX_BLIPS) break;
    if (/\s/.test(ch)) {
      t += p.gap * 1.8; // a breath between words
      continue;
    }
    if (!/[a-z0-9]/i.test(ch)) continue; // punctuation: silent, but ends intonation

    const code = ch.toLowerCase().charCodeAt(0);
    const step = (code % 12) / 11; // 0..1 within an octave-ish, deterministic per letter
    const progress = total > 1 ? n / (total - 1) : 0;
    // statements settle down a little toward the end; questions rise
    const lilt = isQuestion ? progress * 0.5 : -progress * 0.18;
    const freq = Math.max(60, p.base * (1 + lilt) + step * p.spread);

    const blipGain = c.createGain();
    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = p.cutoff;
    filter.Q.value = 6;

    const main = c.createOscillator();
    main.type = p.wave;
    main.frequency.setValueAtTime(freq, t);
    if (p.warble > 0) {
      main.frequency.linearRampToValueAtTime(freq * (1 + p.warble * 0.15), t + p.dur * 0.5);
      main.frequency.linearRampToValueAtTime(freq * (1 - p.warble * 0.1), t + p.dur);
    }

    const sub = c.createOscillator();
    sub.type = p.sub;
    sub.frequency.setValueAtTime(freq * 0.5, t);
    const subGainNode = c.createGain();
    subGainNode.gain.value = p.subGain;

    // a quick pluck envelope so each blip reads as a syllable, not a drone
    const peak = p.gain;
    blipGain.gain.setValueAtTime(0.0001, t);
    blipGain.gain.exponentialRampToValueAtTime(peak, t + 0.006);
    blipGain.gain.exponentialRampToValueAtTime(0.0001, t + p.dur);

    main.connect(blipGain);
    sub.connect(subGainNode);
    subGainNode.connect(blipGain);
    blipGain.connect(filter);
    filter.connect(master);

    main.start(t);
    sub.start(t);
    main.stop(t + p.dur + 0.02);
    sub.stop(t + p.dur + 0.02);

    const entry = { osc: [main, sub], gain: blipGain, filter };
    active.push(entry);
    main.onended = () => {
      try {
        blipGain.disconnect();
        filter.disconnect();
        subGainNode.disconnect();
      } catch {
        /* ignore */
      }
      active = active.filter((e) => e !== entry);
    };

    t += p.dur + p.gap;
    n++;
  }

  // fire onEnd shortly after the last blip would finish
  if (opts?.onEnd) {
    const ms = Math.max(0, (t - c.currentTime) * 1000);
    endTimer = setTimeout(() => {
      endTimer = null;
      opts.onEnd?.();
    }, ms);
  }
}
