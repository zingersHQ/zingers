"use client";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Ambience } from "@/lib/ambience";
import { registerAmbience } from "@/lib/ambience-bus";
import { setSfxEnabled } from "@/lib/sfx";
import { setCreatureVoiceEnabled } from "@/lib/creature-voice";
import { STORAGE } from "@/lib/brand";

// Procedural ambient soundscape control, split into two pieces so the engine can
// live persistently in-world while its ON/OFF button lives wherever the UI wants
// it (now folded into the Player Hub):
//   • <AmbienceEngine/> — headless, ref-counted engine host. Mount it once where
//     audio should exist; multiple mounts share ONE engine.
//   • <AmbientToggle/>  — the button. Pure UI over the shared preference.
// Browsers won't let audio play until the visitor interacts, so when enabled we
// arm a one-shot gesture listener that starts it on the first tap / key / move.

// ── shared on/off preference (module singleton) ──────────────────────────────
const prefListeners = new Set<() => void>();
let soundOn = true; // SSR-safe default; hydrated from storage on the client
let hydrated = false;

function readStoredPref(): boolean {
  try {
    return localStorage.getItem(STORAGE.sound) !== "off";
  } catch {
    return true;
  }
}
function emitPref() {
  for (const l of prefListeners) l();
}
function subscribePref(cb: () => void) {
  prefListeners.add(cb);
  return () => {
    prefListeners.delete(cb);
  };
}

// ── ref-counted engine (one instance shared by all hosts) ────────────────────
let engine: Ambience | null = null;
let armed = false;
let hosts = 0;
let cleanupGesture: (() => void) | null = null;
/** Score only plays while this tab is visible — background tabs stay silent. */
let tabVisible = typeof document === "undefined" ? true : document.visibilityState === "visible";

function applyEngine() {
  const live = soundOn && tabVisible;
  setSfxEnabled(live);
  setCreatureVoiceEnabled(live);
  if (hosts === 0) return;
  engine ??= new Ambience();
  registerAmbience(engine);
  if (!live) {
    engine.stop();
    return;
  }
  if (armed) {
    engine.start();
    return;
  }
  if (!cleanupGesture) {
    const go = () => {
      armed = true;
      if (soundOn && tabVisible) engine?.start();
      cleanupGesture?.();
      cleanupGesture = null;
    };
    const opts = { once: true } as const;
    window.addEventListener("pointerdown", go, opts);
    window.addEventListener("keydown", go, opts);
    window.addEventListener("touchstart", go, opts);
    cleanupGesture = () => {
      window.removeEventListener("pointerdown", go);
      window.removeEventListener("keydown", go);
      window.removeEventListener("touchstart", go);
    };
  }
}

function setSoundOn(next: boolean) {
  soundOn = next;
  try {
    localStorage.setItem(STORAGE.sound, next ? "on" : "off");
  } catch {}
  emitPref();
  applyEngine();
}

function addHost() {
  hosts++;
  applyEngine();
}
function removeHost() {
  hosts = Math.max(0, hosts - 1);
  if (hosts === 0) {
    engine?.stop();
    registerAmbience(null);
    engine?.dispose();
    engine = null;
    armed = false;
    cleanupGesture?.();
    cleanupGesture = null;
  }
}

export function useAmbiencePref(): { enabled: boolean; toggle: () => void } {
  const enabled = useSyncExternalStore(
    subscribePref,
    () => soundOn,
    () => true,
  );
  useEffect(() => {
    if (hydrated) return;
    hydrated = true;
    const stored = readStoredPref();
    if (stored !== soundOn) {
      soundOn = stored;
      emitPref();
      applyEngine();
    }
  }, []);
  const toggle = useCallback(() => setSoundOn(!soundOn), []);
  return { enabled, toggle };
}

/** Headless engine host — mount once wherever the score should play. */
export function AmbienceEngine() {
  useAmbiencePref(); // ensures hydration
  useEffect(() => {
    addHost();
    const onVisibility = () => {
      tabVisible = document.visibilityState === "visible";
      applyEngine();
    };
    tabVisible = document.visibilityState === "visible";
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      removeHost();
    };
  }, []);
  return null;
}

/** The ON/OFF button. Pure UI over the shared preference. */
export function AmbientToggle({ compact = false }: { compact?: boolean }) {
  const { enabled, toggle } = useAmbiencePref();
  return (
    <button
      onClick={toggle}
      className="panel"
      suppressHydrationWarning
      aria-label={enabled ? "Mute ambience" : "Play ambience"}
      title={enabled ? "Score on: changes per region, venue, and combat" : "Score muted"}
      style={{
        padding: compact ? "8px 9px" : "8px 12px",
        display: "flex",
        alignItems: "center",
        gap: 7,
        cursor: "pointer",
        color: enabled ? "var(--ink)" : "var(--muted2)",
        lineHeight: 0,
      }}
    >
      <span suppressHydrationWarning style={{ display: "grid", placeItems: "center", opacity: enabled ? 1 : 0.6 }}>
        {enabled ? <Volume2 size={16} strokeWidth={2} /> : <VolumeX size={16} strokeWidth={2} />}
      </span>
      {!compact && (
        <span suppressHydrationWarning className="mono" style={{ fontSize: 9, letterSpacing: 1, color: "var(--muted2)" }}>
          {enabled ? "ON" : "OFF"}
        </span>
      )}
    </button>
  );
}
