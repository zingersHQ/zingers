"use client";
import { Component, useEffect, type ReactNode, type CSSProperties } from "react";

// Prefer "default" over "high-performance". On dual-GPU laptops, forcing the
// discrete GPU after a GPU-process crash commonly throws
// "Error creating WebGL context" and leaves every R3F Canvas black.
export const WEBGL_POWER: WebGLPowerPreference = "default";

export function isWebGlCreateError(reason: unknown): boolean {
  const msg = reason instanceof Error ? reason.message : String(reason ?? "");
  return /creating webgl context|could not create webgl|webgl.*not supported/i.test(msg);
}

/** Surfaces R3F/Three context-create failures (promise rejections error boundaries miss). */
export function useWebGlCreateFailure(onFail: () => void) {
  useEffect(() => {
    const fail = (reason: unknown) => {
      if (!isWebGlCreateError(reason)) return;
      onFail();
    };
    const onRej = (e: PromiseRejectionEvent) => {
      if (!isWebGlCreateError(e.reason)) return;
      e.preventDefault();
      fail(e.reason);
    };
    const onErr = (e: ErrorEvent) => fail(e.error ?? e.message);
    window.addEventListener("unhandledrejection", onRej);
    window.addEventListener("error", onErr);
    return () => {
      window.removeEventListener("unhandledrejection", onRej);
      window.removeEventListener("error", onErr);
    };
  }, [onFail]);
}

// --- WebGL capability probe -------------------------------------------------
// IMPORTANT (2026-07): Creating a throwaway WebGL context here (and especially
// calling loseContext / resizing the probe canvas to 0) blanked real R3F
// Canvases on desktop — homepage hero, intro, Grounds, Flight. The probe is
// now a no-op that always reports ok. Software-GPU messaging, if needed again,
// must be done without touching the GL context pool before the real Canvas.

export type GpuStatus = {
  ok: boolean;
  /** true when a context exists but is backed by a software rasterizer */
  software: boolean;
  renderer: string;
  reason?: string;
  /** @deprecated kept for call-site compat; always false now */
  tryAnyway?: boolean;
};

function probe(): GpuStatus {
  // Always allow mount. Never allocate a WebGL context from this module.
  return { ok: true, software: false, renderer: "" };
}

let cached: GpuStatus | null = null;

/** Probe (and cache) GPU status. Pass `{ refresh: true }` to discard a stale result. */
export function gpuStatus(opts?: { refresh?: boolean }): GpuStatus {
  if (opts?.refresh) cached = null;
  if (cached === null) cached = probe();
  return cached;
}

export function clearGpuStatusCache() {
  cached = null;
}

// --- Error boundary ---------------------------------------------------------
// R3F renders inside the React tree, so a standard class boundary catches
// errors thrown during the 3D render (shader compile failures, lost context,
// GLTF parse errors). Place one around the whole Canvas, and a lighter one
// around fragile, optional subtrees (e.g. postprocessing) so their failure
// degrades instead of blanking everything.

type BoundaryProps = {
  children: ReactNode;
  /** Static fallback, or a render function that receives the caught error. */
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  /** Called once when an error is caught — handy for logging/telemetry. */
  onError?: (error: Error) => void;
};

type BoundaryState = { error: Error | null };

export class RenderBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
    if (typeof console !== "undefined") console.error("[render-guard] caught:", error);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (error) {
      const { fallback } = this.props;
      if (typeof fallback === "function") return fallback(error, this.reset);
      return fallback ?? null;
    }
    return this.props.children;
  }
}

// --- Shared full-screen notice ----------------------------------------------
// Used when the 3D world can't render at all, so the user sees an explanation
// and next steps instead of a blank screen.

const wrap: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "grid",
  placeItems: "center",
  padding: 24,
  textAlign: "center",
};

export function RenderNotice({
  title,
  body,
  detail,
  onRetry,
}: {
  title: string;
  body: ReactNode;
  detail?: string;
  onRetry?: () => void;
}) {
  return (
    <div style={wrap}>
      <div className="panel" style={{ padding: 24, width: "min(460px, 92vw)" }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{title}</div>
        <div style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.5 }}>{body}</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
          <button className="btn btn-primary" style={{ ["--ac" as string]: "var(--gold)" }} onClick={() => (onRetry ? onRetry() : window.location.reload())}>
            ↻ Retry
          </button>
        </div>
        {detail && (
          <div className="mono" style={{ fontSize: 10, color: "var(--muted2)", marginTop: 14, wordBreak: "break-word", opacity: 0.8 }}>
            {detail}
          </div>
        )}
      </div>
    </div>
  );
}
