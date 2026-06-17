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
