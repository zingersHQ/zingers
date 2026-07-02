// Procedural ambient soundscape — one synthesised score per place in the world.
//
// Each region / venue has its own chord loop, melody, tempo, and texture
// (birds, downbeat pulse, arpeggio, pad swell, counter-melody, air bed). Combat
// morphs into the battle overlay, and a 0..1 intensity knob heats the running
// score in place — tempo push, brighter tone, denser layers, and past 0.8 a low
// pedal + heartbeat for the endgame. No audio files — everything is Web Audio,
// matching the parametric art direction.
//
// Browsers block audio until a user gesture; call start() from click / key / touch.

import { SCORES, type Mood, type PadConfig, type ScoreConfig } from "@/lib/ambience-scores";

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
  // intensity brightener between the voice and the dry/wet split
  private tone: BiquadFilterNode | null = null;
  // sidechain stage after `out` — duck() dips this, leaving vol ramps intact
  private duckGain: GainNode | null = null;
  // endgame low pedal root (created lazily, gain-gated by intensity)
  private pedalOsc: OscillatorNode | null = null;
  private pedalGain: GainNode | null = null;
  // looping filtered-noise air bed (wind / shimmer), level per score
  private shimmerGain: GainNode | null = null;
  private shimmerFilter: BiquadFilterNode | null = null;
  private noiseBuf: AudioBuffer | null = null;

  private stepTimer: ReturnType<typeof setTimeout> | null = null;
  private birdTimer: ReturnType<typeof setTimeout> | null = null;
  private step = 0;
  private chordIdx = 0;
  private motifIdx = 0;
  private on = false;
  private vol = 0.28;
  private intensity = 0;
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
    this.applyShimmer();
  }

  private build() {
    const Ctor = getAudioCtor();
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;

    // final sidechain stage — duck() dips this under loud SFX / voice moments
    const duckGain = ctx.createGain();
    duckGain.gain.value = 1;
    duckGain.connect(ctx.destination);
    this.duckGain = duckGain;

    const out = ctx.createGain();
    out.gain.value = 0.0001;
    out.connect(duckGain);
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

    // the musical voice runs through a lowpass that opens with intensity
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 2200 + this.intensity * 5200;
    tone.Q.value = 0.5;
    tone.connect(dry);
    tone.connect(reverb);
    this.tone = tone;

    const voice = ctx.createGain();
    voice.gain.value = SCORES[this.mood].voiceGain ?? 1;
    voice.connect(tone);
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
    this.applyShimmer();
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

  // 0..1 battle heat. Morphs the running score in place — small tempo push,
  // brighter tone, hat/arp bloom, a fifth shadowing the melody — and past 0.8
  // a low pedal root joins a heartbeat so the endgame feels dire. Everything
  // ramps; the loop itself never restarts.
  setIntensity(v: number) {
    const level = Math.max(0, Math.min(1, v));
    if (Math.abs(level - this.intensity) < 0.001) return;
    this.intensity = level;
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    if (this.tone) {
      this.tone.frequency.cancelScheduledValues(now);
      this.tone.frequency.setValueAtTime(this.tone.frequency.value, now);
      this.tone.frequency.linearRampToValueAtTime(2200 + level * 5200, now + 0.8);
    }
    // low pedal root — only lives in the dire endgame band
    if (level > 0.8) this.ensurePedal();
    if (this.pedalGain) {
      const target = level > 0.8 ? 0.07 + (level - 0.8) * 0.25 : 0.0001;
      this.pedalGain.gain.cancelScheduledValues(now);
      this.pedalGain.gain.setValueAtTime(Math.max(0.0001, this.pedalGain.gain.value), now);
      this.pedalGain.gain.linearRampToValueAtTime(target, now + 1.0);
    }
    // the air bed hisses higher as the stakes rise
    if (this.shimmerFilter) {
      this.shimmerFilter.frequency.cancelScheduledValues(now);
      this.shimmerFilter.frequency.setValueAtTime(this.shimmerFilter.frequency.value, now);
      this.shimmerFilter.frequency.linearRampToValueAtTime(1400 + level * 2600, now + 0.8);
    }
  }

  // Sidechain-style dip under a loud SFX / voice moment: the music drops fast
  // (~60ms) and eases back (~400ms). Rides its own gain stage after `out`, so
  // volume / start / stop ramps are untouched.
  duck(amount = 0.5, holdMs = 160) {
    const ctx = this.ctx;
    const g = this.duckGain;
    if (!ctx || !g || !this.on) return;
    const floor = 1 - Math.max(0, Math.min(0.95, amount));
    const hold = Math.max(0, holdMs) / 1000;
    const now = ctx.currentTime;
    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(g.gain.value, now);
    g.gain.linearRampToValueAtTime(floor, now + 0.06);
    g.gain.setValueAtTime(floor, now + 0.06 + hold);
    g.gain.linearRampToValueAtTime(1, now + 0.06 + hold + 0.4);
  }

  // A short scheduled outro phrase in the current score's own harmony — the
  // verdict fanfare when a bout resolves (climbing for victory, sagging for
  // defeat). One-shot; the loop keeps running underneath.
  flourish(kind: "victory" | "defeat" = "victory") {
    const ctx = this.ctx;
    if (!this.on || !ctx || !this.voice) return;
    const cfg = this.cfg();
    const chord = cfg.chords[this.chordIdx % cfg.chords.length];
    const root = chord[0];
    const run =
      kind === "victory"
        ? [root, chord[1] ?? root + 4, chord[2] ?? root + 7, root + 12, chord[2] ?? root + 7, root + 12]
        : [chord[2] ?? root + 7, chord[1] ?? root + 4, root, root - 2];
    const t0 = ctx.currentTime + 0.05;
    const step = kind === "victory" ? 0.09 : 0.17;
    run.forEach((n, i) => {
      this.pluck(midi(n + 12), 0.05, 1.2, t0 + i * step);
      // a sparkle shadow an octave up keeps the win bright without a new voice
      if (kind === "victory") this.pluck(midi(n + 24), 0.018, 0.9, t0 + i * step);
    });
    // resolving chord — everything rings out together over the reverb tail
    const tEnd = t0 + run.length * step + 0.05;
    for (const n of chord) this.pluck(midi(n + (kind === "victory" ? 12 : 0)), 0.032, 2.4, tEnd);
  }

  dispose() {
    this.stop();
    try {
      this.ctx?.close();
    } catch {
      /* ignore */
    }
    this.ctx = null;
    // lazily-created layers die with the context — forget them so a rebuilt
    // engine recreates fresh nodes instead of ramping ghosts
    this.pedalOsc = null;
    this.pedalGain = null;
    this.shimmerGain = null;
    this.shimmerFilter = null;
    this.noiseBuf = null;
  }

  private cfg(): ScoreConfig {
    return SCORES[this.mood];
  }

  private tick() {
    if (!this.on || !this.ctx) return;
    const cfg = this.cfg();
    const heat = this.intensity;
    const tense = cfg.pulse || this.mood === "battle";
    const chord = cfg.chords[this.chordIdx % cfg.chords.length];
    const motif = cfg.motifs[this.motifIdx % cfg.motifs.length];

    if (this.step === 0) {
      if (cfg.pulse) this.pulse(midi(chord[0] - 12));
      // pad swell — a sustained low voicing breathing under the whole bar
      if (cfg.pad) this.pad(chord, (cfg.tempo * 8) / 1000, cfg.pad);
      // endgame: heartbeat under the downbeat, pedal glides to the new root
      if (heat > 0.8) this.heartbeat(midi(chord[0] - 24));
      if (this.pedalOsc) this.pedalOsc.frequency.setTargetAtTime(Math.max(30, midi(chord[0] - 24)), this.ctx.currentTime, 0.4);
    }

    if (this.step % 2 === 0) {
      this.pluck(midi(chord[(this.step / 2) % chord.length]), tense ? 0.03 : 0.02, tense ? 0.9 : 1.4);
    }

    // arpeggiator — one soft chord tone per step, blooming as heat rises
    if (cfg.arp) {
      const a = cfg.arp.pattern[this.step % cfg.arp.pattern.length];
      if (a >= 0) this.pluck(midi(chord[a % chord.length] + 12), cfg.arp.gain * (0.7 + heat * 0.9), 0.5);
    }

    const m = motif[this.step % motif.length];
    if (m >= 0) {
      const f = midi(cfg.melody[m]!);
      this.pluck(f, tense ? 0.055 : 0.045, tense ? 0.7 : 1.1);
      // harmonic layer — a fifth shadows the melody as intensity rises
      if (heat > 0.15) this.pluck(f * 1.5, 0.02 * heat, tense ? 0.6 : 0.9);
    } else {
      // rests get answered: a low counter-melody, then denser fills under heat
      if (cfg.counter && this.step % 2 === 1) {
        const c = cfg.counter[(this.step + this.chordIdx) % cfg.counter.length];
        if (c >= 0) this.pluck(midi(cfg.melody[c]! - 12), 0.022, 1.6);
      }
      if (heat > 0.2 && Math.random() < heat * 0.35) {
        this.pluck(midi(chord[Math.floor(Math.random() * chord.length)] + 12), 0.02 + heat * 0.015, 0.6);
      }
    }

    // offbeat hat — a whisper of percussion that fades in with intensity
    if (heat > 0.1 && this.step % 2 === 1) this.hat(0.015 + heat * 0.035);

    this.step++;
    if (this.step >= 8) {
      this.step = 0;
      this.chordIdx = (this.chordIdx + 1) % cfg.chords.length;
      this.motifIdx = (this.motifIdx + 1) % cfg.motifs.length;
    }
    const swing = this.step % 2 === 0 ? 1.08 : 0.92;
    // heat pushes the tempo a little — never enough to read as a restart
    this.stepTimer = setTimeout(() => this.tick(), cfg.tempo * swing * (1 - heat * 0.16));
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

  private pluck(freq: number, gain: number, decay: number, at?: number) {
    const ctx = this.ctx;
    if (!ctx || !this.voice) return;
    const t = at ?? ctx.currentTime + 0.02;
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

  // Pad swell — two detuned triangles on the low voicing, filtered dark, that
  // rise and fall across the bar. Sustained warmth without a new loop.
  private pad(chord: number[], dur: number, cfg: PadConfig) {
    const ctx = this.ctx;
    const voice = this.voice;
    if (!ctx || !voice) return;
    const t = ctx.currentTime + 0.02;
    const g = ctx.createGain();
    g.connect(voice);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(cfg.gain * (1 + this.intensity * 0.5), t + dur * 0.45);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = cfg.cutoff;
    lp.connect(g);
    const notes: Array<[number, number]> = [
      [chord[0], -5],
      [chord[2] ?? chord[0] + 7, 4],
    ];
    for (const [n, det] of notes) {
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = midi(n);
      o.detune.value = det;
      o.connect(lp);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
  }

  // Offbeat hat — a breath of highpassed noise; only audible under intensity.
  private hat(gain: number) {
    const ctx = this.ctx;
    const voice = this.voice;
    if (!ctx || !voice) return;
    const t = ctx.currentTime + 0.02;
    const src = ctx.createBufferSource();
    src.buffer = this.noise(ctx);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 6000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    src.connect(hp);
    hp.connect(g);
    g.connect(voice);
    src.start(t);
    src.stop(t + 0.07);
  }

  // Endgame heartbeat — a soft lub-dub on the downbeat when the fight is dire.
  private heartbeat(freq: number) {
    const ctx = this.ctx;
    const voice = this.voice;
    if (!ctx || !voice) return;
    const beat = (at: number, amp: number) => {
      const g = ctx.createGain();
      g.connect(voice);
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(amp, at + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(Math.max(36, freq), at);
      o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * 0.7), at + 0.12);
      o.connect(g);
      o.start(at);
      o.stop(at + 0.26);
    };
    const t = ctx.currentTime + 0.02;
    beat(t, 0.12);
    beat(t + 0.26, 0.08); // the answering "dub"
  }

  // Endgame pedal — a sine on the chord root two octaves down, gain-gated by
  // setIntensity(). Created once; frequency glides per bar in tick().
  private ensurePedal() {
    const ctx = this.ctx;
    const voice = this.voice;
    if (!ctx || !voice || this.pedalOsc) return;
    const cfg = this.cfg();
    const chord = cfg.chords[this.chordIdx % cfg.chords.length];
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    g.connect(voice);
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = Math.max(30, midi(chord[0] - 24));
    o.connect(g);
    o.start();
    this.pedalOsc = o;
    this.pedalGain = g;
  }

  // Air bed — looping bandpassed noise at the score's shimmer level. Created
  // once, then only the gain morphs on mood changes (and brightness with heat).
  private applyShimmer() {
    const ctx = this.ctx;
    if (!ctx) return;
    const target = this.cfg().shimmer ?? 0;
    if (target > 0 && !this.shimmerGain) {
      const voice = this.voice;
      if (!voice) return;
      const src = ctx.createBufferSource();
      src.buffer = this.noise(ctx);
      src.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1400 + this.intensity * 2600;
      bp.Q.value = 0.6;
      const g = ctx.createGain();
      g.gain.value = 0.0001;
      src.connect(bp);
      bp.connect(g);
      g.connect(voice);
      src.start();
      this.shimmerGain = g;
      this.shimmerFilter = bp;
    }
    if (this.shimmerGain) {
      const now = ctx.currentTime;
      this.shimmerGain.gain.cancelScheduledValues(now);
      this.shimmerGain.gain.setValueAtTime(Math.max(0.0001, this.shimmerGain.gain.value), now);
      this.shimmerGain.gain.linearRampToValueAtTime(Math.max(0.0001, target), now + 1.5);
    }
  }

  private noise(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuf) return this.noiseBuf;
    const len = Math.floor(ctx.sampleRate * 1.5);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    return buf;
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
