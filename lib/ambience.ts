// Procedural ambient soundscape for The Grounds.
//
// Everything in this world is generated in code (textures, terrain, the
// starfield) rather than shipped as an asset — the audio follows suit. The
// Web Audio API synthesises a light, happy music-box tune: a bright melody
// over soft plucked arpeggios with a little birdsong. Nothing is sustained,
// there's no bass and no noise bed, so it stays cheerful and never broody.
//
// Browsers block audio until a user gesture, so `start()` is expected to be
// called from a click / key / touch handler (it resumes the context).

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

// Bright I–V–vi–IV in C, voiced in the C4–D5 octave (nothing low) for the
// soft plucked arpeggio that carries the harmony.
const CHORDS: number[][] = [
  [60, 64, 67, 72], // C  major
  [62, 67, 71, 74], // G  major
  [60, 64, 69, 72], // A  minor
  [60, 65, 69, 72], // F  major
];

// High, twinkly notes for the melody (G4 → C6) — a major pentatonic so every
// note lands happy.
const MELODY = [67, 69, 72, 74, 76, 79, 81, 84].map(midi);

// Sparse phrases (indices into MELODY, -1 = rest) cycled so the tune drifts
// gently with lots of breathing room between notes.
const MOTIFS: number[][] = [
  [4, -1, 5, -1, 4, -1, 2, -1],
  [2, -1, 4, 5, -1, -1, 4, -1],
  [5, -1, 4, -1, 2, -1, 4, -1],
  [4, -1, 2, -1, 5, -1, -1, -1],
];

// ── Battle mood ──────────────────────────────────────────────────────────────
// When a fight is on we morph the same music-box into something tense and
// driving: a dark minor loop (i–VI–VII–v in A minor), a low pulse on the
// downbeat for adrenaline, and a tighter, busier melody. Still all synthesised,
// no bass drone — it reads as "stakes are up" without turning broody.
const BATTLE_CHORDS: number[][] = [
  [57, 60, 64, 69], // A minor
  [53, 57, 60, 65], // F  major
  [55, 59, 62, 67], // G  major
  [52, 55, 59, 64], // E  minor
];

// A minor pentatonic, biting and a little higher (A4 → C6).
const BATTLE_MELODY = [69, 72, 74, 76, 79, 81, 84, 88].map(midi);

// Busier, more syncopated phrases — fewer rests, more momentum.
const BATTLE_MOTIFS: number[][] = [
  [4, 2, -1, 3, 4, -1, 2, 1],
  [2, -1, 4, 3, 1, -1, 2, -1],
  [5, 4, -1, 2, 3, -1, 1, 2],
  [4, -1, 3, 4, 5, -1, 2, -1],
];

export type Mood = "grounds" | "battle";

interface MoodConfig {
  chords: number[][];
  melody: number[];
  motifs: number[][];
  tempo: number; // ms per step
  birds: boolean; // birdsong (calm) vs. a low pulse (tense)
}

const MOODS: Record<Mood, MoodConfig> = {
  grounds: { chords: CHORDS, melody: MELODY, motifs: MOTIFS, tempo: 520, birds: true },
  battle: { chords: BATTLE_CHORDS, melody: BATTLE_MELODY, motifs: BATTLE_MOTIFS, tempo: 300, birds: false },
};

export class Ambience {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null; // master fade control
  private dry: GainNode | null = null;
  private wet: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private voice: GainNode | null = null; // shared bus (dry + reverb)

  private stepTimer: ReturnType<typeof setTimeout> | null = null;
  private birdTimer: ReturnType<typeof setTimeout> | null = null;
  private step = 0;
  private chordIdx = 0;
  private motifIdx = 0;
  private on = false;
  private vol = 0.28;
  private mood: Mood = "grounds";

  get playing() {
    return this.on;
  }

  // Swap the soundscape between the calm Grounds tune and a tense battle loop.
  // Safe to call any time — if we're already playing, it crossfades into the new
  // mood on the next beat; otherwise it just sets what start() will play.
  setMood(mood: Mood) {
    if (mood === this.mood) return;
    this.mood = mood;
    this.step = 0;
    this.chordIdx = 0;
    this.motifIdx = 0;
    if (!this.on) return;
    // restart the melodic loop immediately so the change is felt at once
    if (this.stepTimer) clearTimeout(this.stepTimer);
    this.tick();
    // birdsong only belongs to the calm Grounds; (re)arm the right texture
    if (this.birdTimer) clearTimeout(this.birdTimer);
    this.birdTimer = null;
    if (MOODS[this.mood].birds) this.scheduleBird();
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

    // short, bright reverb so the music box has a little room — not a wash
    const reverb = ctx.createConvolver();
    reverb.buffer = this.impulse(ctx, 1.4, 3);
    const wet = ctx.createGain();
    wet.gain.value = 0.32;
    reverb.connect(wet);
    wet.connect(out);
    this.reverb = reverb;
    this.wet = wet;

    const voice = ctx.createGain();
    voice.gain.value = 1;
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
      /* resume may reject if not from a gesture — caller retries on next gesture */
    }
    this.on = true;
    const now = ctx.currentTime;
    out.gain.cancelScheduledValues(now);
    out.gain.setValueAtTime(Math.max(0.0001, out.gain.value), now);
    out.gain.linearRampToValueAtTime(this.vol, now + 1.2);
    this.tick();
    if (MOODS[this.mood].birds) this.scheduleBird();
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

  // one slow step: a soft arpeggio note every other beat + a melody note
  // where the current (sparse) phrase calls for one. Chord & phrase advance
  // once per bar.
  private tick() {
    if (!this.on || !this.ctx) return;
    const cfg = MOODS[this.mood];
    const battle = this.mood === "battle";
    const chord = cfg.chords[this.chordIdx % cfg.chords.length];
    const motif = cfg.motifs[this.motifIdx % cfg.motifs.length];

    // a low pulse on each bar's downbeat drives the battle without a drone
    if (battle && this.step === 0) this.pulse(midi(chord[0] - 12));

    // gentle harmony — a soft chord tone every other beat, lots of space
    if (this.step % 2 === 0) {
      this.pluck(midi(chord[(this.step / 2) % chord.length]), battle ? 0.03 : 0.02, battle ? 0.9 : 1.4);
    }

    // melody on top — brighter & busier in battle
    const m = motif[this.step % motif.length];
    if (m >= 0) this.pluck(cfg.melody[m], battle ? 0.055 : 0.045, battle ? 0.7 : 1.1);

    this.step++;
    if (this.step >= 8) {
      this.step = 0;
      this.chordIdx = (this.chordIdx + 1) % cfg.chords.length;
      this.motifIdx = (this.motifIdx + 1) % cfg.motifs.length;
    }
    // gentle swing; battle is roughly twice the tempo of the calm Grounds
    const swing = this.step % 2 === 0 ? 1.08 : 0.92;
    this.stepTimer = setTimeout(() => this.tick(), cfg.tempo * swing);
  }

  // a short low thump for battle drive: a fast pitch-dropping sine with a
  // snappy envelope — adrenaline, not a sustained bass drone
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

  // a warm, soft chime: sine fundamental + a quiet octave, soft attack and a
  // long gentle tail (still decays — never drones)
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

  // a short, cheerful bird call: a run of quick pitch-swept chirps, panned
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

  // decaying-noise impulse response for a short, bright reverb tail
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
