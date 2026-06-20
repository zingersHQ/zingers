// Tiny one-shot sound effects (e.g. the jump blip), kept separate from the
// ambient music engine so any part of the world can fire a sound without
// holding a reference to it. Shares the same on/off preference as the music
// toggle (STORAGE.sound). SFX are triggered by user input (key / touch), so
// the AudioContext can be resumed lazily on the first one.
import { STORAGE } from "@/lib/brand";

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

function enabled(): boolean {
  if (enabledCache !== null) return enabledCache;
  try {
    enabledCache = localStorage.getItem(STORAGE.sound) !== "off";
  } catch {
    enabledCache = true;
  }
  return enabledCache;
}

// kept in sync by the ambience toggle so the beep mutes with the music
export function setSfxEnabled(on: boolean) {
  enabledCache = on;
}

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = getAudioCtor();
  if (!Ctor) return null;
  ctx = new Ctor();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  return ctx;
}

// a subtle upward blip — higher pitched on successive air jumps so a combo
// reads as a little rising arpeggio
export function jumpBeep(level = 0) {
  if (!enabled()) return;
  const c = ensure();
  if (!c || !master) return;
  if (c.state === "suspended") c.resume().catch(() => {});

  const t = c.currentTime + 0.005;
  const base = 620 + Math.min(level, 4) * 80;

  const o = c.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(base, t);
  o.frequency.exponentialRampToValueAtTime(base * 1.5, t + 0.06);

  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.1, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + 0.14);
}

// A punchy impact for when a battle line lands damage: a pitch-dropping sine
// thump + a short noise smack, scaled by damage, with a bright sparkle on a
// Highlight/crit. Used by the agent "mic battles".
export function hitSfx(power = 10, crit = false) {
  if (!enabled()) return;
  const c = ensure();
  if (!c || !master) return;
  if (c.state === "suspended") c.resume().catch(() => {});

  const t = c.currentTime + 0.005;
  const amp = Math.min(0.5, 0.16 + Math.min(power, 40) * 0.007) * (crit ? 1.3 : 1);

  // body — a low sine that drops in pitch for the "thud"
  const o = c.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(crit ? 230 : 175, t);
  o.frequency.exponentialRampToValueAtTime(crit ? 54 : 46, t + 0.16);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(amp, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + 0.27);

  // transient — a short filtered noise smack for the "crack"
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = crit ? 3400 : 2000;
  const ng = c.createGain();
  ng.gain.setValueAtTime(amp * 0.7, t);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + (crit ? 0.12 : 0.08));
  src.connect(lp);
  lp.connect(ng);
  ng.connect(master);
  src.start(t);
  src.stop(t + 0.16);

  // crit sparkle — a quick rising blip so Highlights pop
  if (crit) {
    const s = c.createOscillator();
    s.type = "square";
    s.frequency.setValueAtTime(880, t + 0.02);
    s.frequency.exponentialRampToValueAtTime(1500, t + 0.1);
    const sg = c.createGain();
    sg.gain.setValueAtTime(0.0001, t + 0.02);
    sg.gain.exponentialRampToValueAtTime(0.08, t + 0.03);
    sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    s.connect(sg);
    sg.connect(master);
    s.start(t + 0.02);
    s.stop(t + 0.18);
  }
}

// ── celebration / outcome stings ─────────────────────────────────────────────
// A single bell-like voice used to build chords/arpeggios. A triangle body with
// a soft octave-up shimmer gives it a chime quality rather than a flat beep.
function chime(c: AudioContext, out: GainNode, freq: number, t: number, dur: number, amp: number) {
  const o = c.createOscillator();
  o.type = "triangle";
  o.frequency.setValueAtTime(freq, t);

  const o2 = c.createOscillator();
  o2.type = "sine";
  o2.frequency.setValueAtTime(freq * 2, t);
  const sh = c.createGain();
  sh.gain.value = 0.3;

  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(amp, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  o.connect(g);
  o2.connect(sh);
  sh.connect(g);
  g.connect(out);
  o.start(t);
  o2.start(t);
  o.stop(t + dur + 0.02);
  o2.stop(t + dur + 0.02);
}

// A bright, climbing arpeggio for a reward/claim — the bigger the tier, the more
// notes it climbs and the more sparkle tails off the top. "epic" is reserved for
// big standing objectives (peak / depth / secret).
export function rewardSfx(tier: "small" | "big" | "epic" = "small") {
  if (!enabled()) return;
  const c = ensure();
  if (!c || !master) return;
  if (c.state === "suspended") c.resume().catch(() => {});

  const t0 = c.currentTime + 0.01;
  const notes =
    tier === "epic"
      ? [523.25, 659.25, 783.99, 1046.5, 1318.51] // C5 E5 G5 C6 E6
      : tier === "big"
        ? [523.25, 659.25, 783.99, 1046.5] // C5 E5 G5 C6
        : [659.25, 783.99, 1046.5]; // E5 G5 C6
  const step = tier === "epic" ? 0.072 : 0.088;
  notes.forEach((f, idx) => chime(c, master!, f, t0 + idx * step, 0.55, idx === notes.length - 1 ? 0.16 : 0.12));

  if (tier !== "small") {
    const tail = t0 + notes.length * step;
    const sparkles = tier === "epic" ? 5 : 3;
    for (let k = 0; k < sparkles; k++) chime(c, master!, 1568 + k * 240, tail + k * 0.05, 0.26, 0.05);
  }
}

// A solemn oath: a low fifth that swells open under a brightening filter, capped
// by a single resonant bell. Used when swearing allegiance to a Force.
export function pledgeSfx() {
  if (!enabled()) return;
  const c = ensure();
  if (!c || !master) return;
  if (c.state === "suspended") c.resume().catch(() => {});

  const t0 = c.currentTime + 0.01;
  for (const f of [146.83, 220.0]) {
    const o = c.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(f, t0);
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(280, t0);
    lp.frequency.exponentialRampToValueAtTime(2200, t0 + 0.55);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.22);
    g.gain.setValueAtTime(0.12, t0 + 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.2);
    o.connect(lp);
    lp.connect(g);
    g.connect(master);
    o.start(t0);
    o.stop(t0 + 1.25);
  }
  chime(c, master, 880, t0 + 0.5, 0.7, 0.1);
}

// The classic "sad trombone" descent for an unlucky / bad outcome — detuned
// sawtooths drooping down a minor run, ending on a long held wah.
export function badLuckSfx() {
  if (!enabled()) return;
  const c = ensure();
  if (!c || !master) return;
  if (c.state === "suspended") c.resume().catch(() => {});

  const notes = [392.0, 349.23, 311.13, 261.63]; // G4 F4 Eb4 C4
  let t = c.currentTime + 0.01;
  notes.forEach((f, idx) => {
    const last = idx === notes.length - 1;
    const dur = last ? 0.62 : 0.22;
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1300;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.03);
    g.gain.setValueAtTime(0.16, t + dur - (last ? 0.32 : 0.05));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    lp.connect(g);
    g.connect(master!);
    for (const det of [0, -16]) {
      const o = c.createOscillator();
      o.type = "sawtooth";
      o.detune.value = det;
      o.frequency.setValueAtTime(f, t);
      o.frequency.linearRampToValueAtTime(f * 0.94, t + dur); // the droop
      o.connect(lp);
      o.start(t);
      o.stop(t + dur + 0.02);
    }
    t += dur;
  });
}

// ── jetpack thruster ─────────────────────────────────────────────────────────
// A sustained rocket roar: looping filtered noise (the hiss) plus a low sawtooth
// (the body rumble), driven by a single intensity 0..1. The Handler calls
// setJet() every frame — 0 grounded, a low idle while hovering, full while
// thrusting — and the gain/brightness spool smoothly up and down so it reads as
// the pack revving rather than clicking on and off.
let noiseBuf: AudioBuffer | null = null;
let jet: {
  gain: GainNode;
  lp: BiquadFilterNode;
  src: AudioBufferSourceNode;
  rumble: OscillatorNode;
  rumbleGain: GainNode;
} | null = null;

function noiseBuffer(c: AudioContext): AudioBuffer {
  if (noiseBuf) return noiseBuf;
  const len = Math.floor(c.sampleRate * 2);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  noiseBuf = buf;
  return buf;
}

function ensureJet(c: AudioContext, out: GainNode): NonNullable<typeof jet> {
  if (jet) return jet;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  src.loop = true;

  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 500;
  lp.Q.value = 0.8;

  const rumble = c.createOscillator();
  rumble.type = "sawtooth";
  rumble.frequency.value = 58;
  const rumbleGain = c.createGain();
  rumbleGain.gain.value = 0;

  const gain = c.createGain();
  gain.gain.value = 0;

  src.connect(lp);
  lp.connect(gain);
  rumble.connect(rumbleGain);
  rumbleGain.connect(gain);
  gain.connect(out);

  src.start();
  rumble.start();
  jet = { gain, lp, src, rumble, rumbleGain };
  return jet;
}

// intensity: 0 = off, ~0.4 = idle hover, 1 = full thrust
export function setJet(intensity: number) {
  const lvl = enabled() ? Math.max(0, Math.min(1, intensity)) : 0;
  if (lvl <= 0 && !jet) return; // nothing playing and nothing to do — no allocation
  const c = ensure();
  if (!c || !master) return;
  if (lvl > 0 && c.state === "suspended") c.resume().catch(() => {});

  const j = ensureJet(c, master);
  const now = c.currentTime;
  const tc = 0.1; // smoothing time constant → smooth spool up/down
  j.gain.gain.setTargetAtTime(lvl * 0.22, now, tc); // overall roar loudness
  j.lp.frequency.setTargetAtTime(420 + lvl * 2800, now, tc); // brighter under thrust
  j.rumbleGain.gain.setTargetAtTime(lvl * 0.45, now, tc); // body grows with thrust
  j.rumble.frequency.setTargetAtTime(54 + lvl * 40, now, tc); // pitches up under load
}

export function stopJet() {
  if (!jet) return;
  try {
    jet.src.stop();
    jet.rumble.stop();
  } catch {
    /* already stopped */
  }
  try {
    jet.gain.disconnect();
  } catch {
    /* ignore */
  }
  jet = null;
}
