"use client";
// Light / dark theme: a tiny vanilla store backed by localStorage that writes
// `data-theme` onto <html>. The CSS in globals.css keys every colour token off
// that attribute, and the 3D world reads the same value (via useTheme) to drop
// into a daylight palette. Default is dark — the game's native look.
import { useSyncExternalStore } from "react";
import { STORAGE } from "@/lib/brand";

export type Theme = "dark" | "light";

const listeners = new Set<() => void>();
// cache so getSnapshot returns a stable reference between renders (React relies
// on referential equality to decide whether to re-render)
let current: Theme = "dark";

function read(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    return localStorage.getItem(STORAGE.theme) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function apply(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
}

// Sync the cache to whatever the no-flash boot script already applied, so the
// first client snapshot matches the painted DOM (no hydration flash).
if (typeof window !== "undefined") {
  current = read();
  apply(current);
}

export function getTheme(): Theme {
  return current;
}

export function setTheme(theme: Theme) {
  current = theme;
  try {
    localStorage.setItem(STORAGE.theme, theme);
  } catch {}
  apply(theme);
  listeners.forEach((l) => l());
}

export function toggleTheme() {
  setTheme(current === "light" ? "dark" : "light");
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useTheme(): Theme {
  // Server + first client render report "dark" (the SSR-safe default) so markup
  // matches; the real preference is reconciled right after mount.
  return useSyncExternalStore(subscribe, getTheme, () => "dark" as Theme);
}
