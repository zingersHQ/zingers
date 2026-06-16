// Browser-native voices for the Guardian battle. Each guardian speaks its reply
// aloud via the Web Speech API (window.speechSynthesis) — no API key, no cost,
// works offline, in keeping with the rest of the game. Every persona gets its
// own pitch/rate/gender profile so El Becario squeaks and El Mago Oscuro booms.
//
// Shares the same on/off preference as the music + sfx toggle (STORAGE.sound),
// so muting the world mutes the guardians too.
import { STORAGE } from "@/lib/brand";

// Per-level vocal character. Pitch/rate shape the personality; `prefer` nudges
// which system voice we grab (most replies are in Spanish, so we favour es-*).
export interface VoiceProfile {
  pitch: number; // 0..2 (1 = natural)
  rate: number; // 0.1..10 (1 = natural)
  prefer: "female" | "male" | "any";
}

// Keyed by guardian level (see lib/server/guardian.ts).
export const VOICE_PROFILES: Record<number, VoiceProfile> = {
  1: { pitch: 1.28, rate: 1.08, prefer: "male" }, // El Becario — nervous, eager intern
  2: { pitch: 1.04, rate: 0.96, prefer: "female" }, // La Bibliotecaria — stern, measured
  3: { pitch: 0.84, rate: 1.0, prefer: "male" }, // El Centinela — proud veteran
  4: { pitch: 0.72, rate: 0.86, prefer: "any" }, // El Oráculo — slow, mysterious
  5: { pitch: 0.58, rate: 0.82, prefer: "male" }, // El Mago Oscuro — cold, booming
};

const DEFAULT_PROFILE: VoiceProfile = { pitch: 1, rate: 1, prefer: "any" };

export function voiceProfile(level: number): VoiceProfile {
  return VOICE_PROFILES[level] ?? DEFAULT_PROFILE;
}

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

// kept in sync by the ambience toggle so guardians mute with the music
export function setVoiceEnabled(on: boolean) {
  enabledCache = on;
  if (!on) stopVoice();
}

export function voiceSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

// System voices load asynchronously on first access in most browsers. Cache the
// list and refresh it whenever the engine signals a change.
let voicesCache: SpeechSynthesisVoice[] = [];

function refreshVoices() {
  if (!voiceSupported()) return;
  const v = window.speechSynthesis.getVoices();
  if (v.length) voicesCache = v;
}

if (voiceSupported()) {
  refreshVoices();
  window.speechSynthesis.addEventListener?.("voiceschanged", refreshVoices);
}

// Spanish voices tend to read these (mostly-Spanish) replies far better than the
// system default; fall back gracefully when none are installed.
const FEMALE_HINT = /(female|mujer|monica|mónica|paulina|helena|laura|sara|google español)/i;
const MALE_HINT = /(male|hombre|jorge|diego|carlos|juan|enrique)/i;

function looksSpanish(text: string): boolean {
  return /[áéíóúñ¿¡]/i.test(text) || /\b(el|la|los|las|que|de|no|por|para|con|una?)\b/i.test(text);
}

function pickVoice(profile: VoiceProfile, text: string): SpeechSynthesisVoice | null {
  if (!voicesCache.length) refreshVoices();
  if (!voicesCache.length) return null;

  const wantEs = looksSpanish(text);
  const langPool = wantEs ? voicesCache.filter((v) => v.lang?.toLowerCase().startsWith("es")) : voicesCache;
  const pool = langPool.length ? langPool : voicesCache;

  if (profile.prefer !== "any") {
    const hint = profile.prefer === "female" ? FEMALE_HINT : MALE_HINT;
    const match = pool.find((v) => hint.test(v.name));
    if (match) return match;
  }
  // Prefer a local (offline) voice for instant, reliable playback.
  return pool.find((v) => v.localService) ?? pool[0] ?? null;
}

// Strip things that read badly aloud: emoji, markdown bullets, stray symbols.
function clean(text: string): string {
  return text
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/gu, " ")
    .replace(/[*_`#>]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function stopVoice() {
  if (!voiceSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
}

// Speak a guardian's line in its own voice. Cancels anything mid-sentence first
// so lines never overlap. Safe to call when unsupported/muted (no-op).
export function speak(text: string, level: number, opts?: { onEnd?: () => void }) {
  if (!enabled() || !voiceSupported()) {
    opts?.onEnd?.();
    return;
  }
  const body = clean(text);
  if (!body) {
    opts?.onEnd?.();
    return;
  }

  const synth = window.speechSynthesis;
  synth.cancel();

  const profile = voiceProfile(level);
  const u = new SpeechSynthesisUtterance(body);
  const v = pickVoice(profile, body);
  if (v) {
    u.voice = v;
    u.lang = v.lang;
  } else if (looksSpanish(body)) {
    u.lang = "es-ES";
  }
  u.pitch = profile.pitch;
  u.rate = profile.rate;
  u.onend = () => opts?.onEnd?.();
  u.onerror = () => opts?.onEnd?.();

  // Chrome occasionally drops the queued utterance if it's still "speaking"
  // from a just-cancelled one; a microtask defer makes it reliable.
  setTimeout(() => synth.speak(u), 0);
}
