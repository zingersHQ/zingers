"use client";
// Records one behaviour session per app load (and a new-vs-returning split for
// retention), plus best-effort client error pings. Mounted once in the root
// layout. Renders nothing.
import { useEffect } from "react";
import { trackSession, track } from "@/lib/track";

export function SessionPing() {
  useEffect(() => {
    trackSession();

    // Throttle error pings so one noisy loop can't spam the counter.
    let last = 0;
    const onError = () => {
      const now = Date.now();
      if (now - last > 4000) {
        last = now;
        track("error");
      }
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onError);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onError);
    };
  }, []);

  return null;
}
