"use client";
import { Component, type ReactNode, type CSSProperties } from "react";

// --- WebGL capability probe -------------------------------------------------
// Chromium (Chrome/Brave) silently falls back to a software renderer when
// hardware acceleration is off or the GPU is blocklisted. That software path
// often can't handle a heavy R3F scene (shadows + bloom + physics), so the
// canvas comes up blank. We detect "no real GPU" up front and surface it.

export type GpuStatus = {
  ok: boolean;
  /** true when a context exists but is backed by a software rasterizer */
  software: boolean;
  renderer: string;
  reason?: string;
};

function probe(): GpuStatus {
  if (typeof window === "undefined") return { ok: true, software: false, renderer: "" };
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return { ok: false, software: false, renderer: "", reason: "no-context" };

    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "";
    const software = /swiftshader|software|llvmpipe|basic render|microsoft basic/i.test(renderer);
    return { ok: true, software, renderer };
  } catch (e) {
    return { ok: false, software: false, renderer: "", reason: e instanceof Error ? e.message : "probe-failed" };
  }
}

let cached: GpuStatus | null = null;
export function gpuStatus(): GpuStatus {
  if (cached === null) cached = probe();
  return cached;
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
