"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Ambience } from "@/lib/ambience";
import { registerAmbience } from "@/lib/ambience-bus";
import { setSfxEnabled } from "@/lib/sfx";
import { STORAGE } from "@/lib/brand";

// On/off control for the procedural ambient soundscape. Defaults to on, but
// browsers won't let audio play until the visitor interacts — so when enabled
// we arm a one-shot gesture listener that starts it on the first tap / key /
// move. Starting again later (e.g. re-enabling via the button) is itself a
// gesture, so it can resume immediately.
function initialPref(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(STORAGE.sound) !== "off";
  } catch {
    return true;
  }
}

export function AmbientToggle({ compact = false }: { compact?: boolean }) {
  const engineRef = useRef<Ambience | null>(null);
  const armedRef = useRef(false);
  // Start from the SSR-safe default so the server and first client render
  // agree (the icon is a nested <svg>, which suppressHydrationWarning can't
  // cover). The stored preference is applied after mount.
  const [enabled, setEnabled] = useState<boolean>(true);
  useEffect(() => setEnabled(initialPref()), []);

  useEffect(() => {
    setSfxEnabled(enabled);
    const engine = (engineRef.current ??= new Ambience());
    registerAmbience(engine); // let battle overlays morph the mood
    if (!enabled) {
      engine.stop();
      return;
    }
    if (armedRef.current) {
      engine.start();
      return;
    }
    const go = () => {
      armedRef.current = true;
      engine.start();
    };
    const opts = { once: true } as const;
    window.addEventListener("pointerdown", go, opts);
    window.addEventListener("keydown", go, opts);
    window.addEventListener("touchstart", go, opts);
    return () => {
      window.removeEventListener("pointerdown", go);
      window.removeEventListener("keydown", go);
      window.removeEventListener("touchstart", go);
    };
  }, [enabled]);

  useEffect(
    () => () => {
      registerAmbience(null);
      engineRef.current?.dispose();
    },
    [],
  );

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE.sound, next ? "on" : "off");
      } catch {}
      return next;
    });
  }, []);

  return (
    <button
      onClick={toggle}
      className="panel"
      suppressHydrationWarning
      aria-label={enabled ? "Mute ambience" : "Play ambience"}
      title={enabled ? "Ambience on — calm pad, wind & birdsong" : "Ambience muted"}
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
