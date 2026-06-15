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
