// Procedural ambient soundscape — one synthesised score per place in the world.
//
// Each region / venue has its own chord loop, melody, tempo, and texture
// (birds, downbeat pulse). Combat morphs into the battle overlay. No audio
// files — everything is Web Audio, matching the parametric art direction.
//
// Browsers block audio until a user gesture; call start() from click / key / touch.

import { SCORES, type Mood, type ScoreConfig } from "@/lib/ambience-scores";

export type { Mood } from "@/lib/ambience-scores";
export { resolveAmbienceMood, MOOD_LABELS, SCORES } from "@/lib/ambience-scores";

type AudioCtor = typeof AudioContext;

function getAudioCtor(): AudioCtor | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext ??
    null
  );
}

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export class Ambience {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private dry: GainNode | null = null;
  private wet: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private voice: GainNode | null = null;

  private stepTimer: ReturnType<typeof setTimeout> | null = null;
  private birdTimer: ReturnType<typeof setTimeout> | null = null;
  private step = 0;
  private chordIdx = 0;
  private motifIdx = 0;
  private on = false;
  private vol = 0.28;
  private mood: Mood = "concord";

  get playing() {
    return this.on;
  }

  setMood(mood: Mood) {
    if (mood === this.mood) return;
    this.mood = mood;
    this.step = 0;
    this.chordIdx = 0;
    this.motifIdx = 0;
    const cfg = SCORES[mood];
    if (this.voice) this.voice.gain.value = cfg.voiceGain ?? 1;
    if (!this.on) return;
    if (this.stepTimer) clearTimeout(this.stepTimer);
    this.tick();
    if (this.birdTimer) clearTimeout(this.birdTimer);
    this.birdTimer = null;
    if (cfg.birds) this.scheduleBird();
  }

  private build() {
    const Ctor = getAudioCtor();
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;

    const out = ctx.createGain();
    out.gain.value = 0.0001;
    out.connect(ctx.destination);
    this.out = out;

    const dry = ctx.createGain();
    dry.gain.value = 1;
    dry.connect(out);
    this.dry = dry;

    const reverb = ctx.createConvolver();
    reverb.buffer = this.impulse(ctx, 1.4, 3);
    const wet = ctx.createGain();
    wet.gain.value = 0.32;
    reverb.connect(wet);
    wet.connect(out);
    this.reverb = reverb;
    this.wet = wet;

    const voice = ctx.createGain();
    voice.gain.value = SCORES[this.mood].voiceGain ?? 1;
    voice.connect(dry);
    voice.connect(reverb);
    this.voice = voice;
  }

  async start() {
    if (!this.ctx) this.build();
    const ctx = this.ctx;
    const out = this.out;
    if (!ctx || !out) return;
    try {
      await ctx.resume();
    } catch {
      /* resume may reject if not from a gesture */
    }
    this.on = true;
    const now = ctx.currentTime;
    out.gain.cancelScheduledValues(now);
    out.gain.setValueAtTime(Math.max(0.0001, out.gain.value), now);
    out.gain.linearRampToValueAtTime(this.vol, now + 1.2);
    this.tick();
    if (SCORES[this.mood].birds) this.scheduleBird();
  }

  stop() {
    this.on = false;
    if (this.stepTimer) clearTimeout(this.stepTimer);
    if (this.birdTimer) clearTimeout(this.birdTimer);
    this.stepTimer = null;
    this.birdTimer = null;
    const ctx = this.ctx;
    const out = this.out;
    if (!ctx || !out) return;
    const now = ctx.currentTime;
    out.gain.cancelScheduledValues(now);
    out.gain.setValueAtTime(out.gain.value, now);
    out.gain.linearRampToValueAtTime(0.0001, now + 1.0);
    window.setTimeout(() => {
      if (!this.on) this.ctx?.suspend().catch(() => {});
    }, 1200);
  }

  setVolume(v: number) {
    this.vol = Math.max(0, Math.min(1, v));
    if (this.on && this.ctx && this.out) {
      const now = this.ctx.currentTime;
      this.out.gain.cancelScheduledValues(now);
      this.out.gain.linearRampToValueAtTime(this.vol, now + 0.3);
    }
  }

  dispose() {
    this.stop();
    try {
      this.ctx?.close();
    } catch {
      /* ignore */
    }
    this.ctx = null;
  }

  private cfg(): ScoreConfig {
    return SCORES[this.mood];
  }

  private tick() {
    if (!this.on || !this.ctx) return;
    const cfg = this.cfg();
    const tense = cfg.pulse || this.mood === "battle";
    const chord = cfg.chords[this.chordIdx % cfg.chords.length];
    const motif = cfg.motifs[this.motifIdx % cfg.motifs.length];

    if (cfg.pulse && this.step === 0) this.pulse(midi(chord[0] - 12));

    if (this.step % 2 === 0) {
      this.pluck(midi(chord[(this.step / 2) % chord.length]), tense ? 0.03 : 0.02, tense ? 0.9 : 1.4);
    }

    const m = motif[this.step % motif.length];
    if (m >= 0) this.pluck(midi(cfg.melody[m]!), tense ? 0.055 : 0.045, tense ? 0.7 : 1.1);

    this.step++;
    if (this.step >= 8) {
      this.step = 0;
      this.chordIdx = (this.chordIdx + 1) % cfg.chords.length;
      this.motifIdx = (this.motifIdx + 1) % cfg.motifs.length;
    }
    const swing = this.step % 2 === 0 ? 1.08 : 0.92;
    this.stepTimer = setTimeout(() => this.tick(), cfg.tempo * swing);
  }

  private pulse(freq: number) {
    const ctx = this.ctx;
    if (!ctx || !this.voice) return;
    const t = ctx.currentTime + 0.02;
    const g = ctx.createGain();
    g.connect(this.voice);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);

    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.6), t + 0.18);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.46);
  }

  private pluck(freq: number, gain: number, decay: number) {
    const ctx = this.ctx;
    if (!ctx || !this.voice) return;
    const t = ctx.currentTime + 0.02;
    const g = ctx.createGain();
    g.connect(this.voice);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);

    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = freq;
    o.connect(g);

    const octGain = ctx.createGain();
    octGain.gain.value = 0.08;
    octGain.connect(g);
    const o2 = ctx.createOscillator();
    o2.type = "sine";
    o2.frequency.value = freq * 2;
    o2.connect(octGain);

    o.start(t);
    o2.start(t);
    o.stop(t + decay + 0.05);
    o2.stop(t + decay + 0.05);
  }

  private scheduleBird() {
    if (!this.on) return;
    const delay = 3500 + Math.random() * 5500;
    this.birdTimer = setTimeout(() => {
      if (this.on) {
        this.chirp();
        this.scheduleBird();
      }
    }, delay);
  }

  private chirp() {
    const ctx = this.ctx;
    if (!ctx || !this.dry || !this.reverb) return;
    const panner = ctx.createStereoPanner();
    panner.pan.value = (Math.random() * 2 - 1) * 0.7;
    panner.connect(this.dry);
    panner.connect(this.reverb);

    const notes = 2 + Math.floor(Math.random() * 4);
    const base = 2400 + Math.random() * 1800;
    const peak = 0.04 + Math.random() * 0.05;
    let t = ctx.currentTime + 0.03;
    for (let i = 0; i < notes; i++) {
      const dur = 0.05 + Math.random() * 0.06;
      const f = base * (0.93 + Math.random() * 0.35);
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * (1.4 + Math.random() * 0.5), t + dur * 0.6);
      osc.frequency.exponentialRampToValueAtTime(f * 1.05, t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g);
      g.connect(panner);
      osc.start(t);
      osc.stop(t + dur + 0.02);
      t += dur + 0.025 + Math.random() * 0.05;
    }
    const lifeMs = (t - ctx.currentTime + 0.6) * 1000;
    window.setTimeout(() => {
      try {
        panner.disconnect();
      } catch {
        /* ignore */
      }
    }, lifeMs);
  }

  private impulse(ctx: AudioContext, seconds: number, decay: number) {
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }
}
