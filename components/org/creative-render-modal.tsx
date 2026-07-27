"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Download, Copy, Check, X } from "lucide-react";
import { CreativeScene, sceneAspect } from "@/components/org/creative-scene";
import { copyText, downloadPngFromContainer } from "@/lib/org/creative-download";
import type { IdeaScene } from "@/lib/org/creative-brief-data";

export type CreativeModalPayload = {
  title: string;
  caption?: string;
  scene: IdeaScene;
  prompt?: string;
  filename: string;
};

export function CreativeRenderModal({
  payload,
  onClose,
}: {
  payload: CreativeModalPayload | null;
  onClose: () => void;
}) {
  const titleId = useId();
  const stageRef = useRef<HTMLDivElement>(null);
  const [dlState, setDlState] = useState<"idle" | "busy" | "ok" | "fail">("idle");
  const [copyState, setCopyState] = useState<"idle" | "ok" | "fail">("idle");

  useEffect(() => {
    if (!payload) return;
    setDlState("idle");
    setCopyState("idle");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [payload, onClose]);

  if (!payload) return null;

  const aspect = sceneAspect(payload.scene);

  const onDownload = async () => {
    if (!stageRef.current) return;
    setDlState("busy");
    // Give WebGL a moment to settle after eager mount
    await new Promise((r) => setTimeout(r, 400));
    const ok = await downloadPngFromContainer(stageRef.current, payload.filename);
    setDlState(ok ? "ok" : "fail");
    if (ok) setTimeout(() => setDlState("idle"), 1800);
  };

  const onCopy = async () => {
    if (!payload.prompt) return;
    const ok = await copyText(payload.prompt);
    setCopyState(ok ? "ok" : "fail");
    if (ok) setTimeout(() => setCopyState("idle"), 1800);
  };

  return (
    <div className="creative-modal" role="presentation" onClick={onClose}>
      <div
        className="creative-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="creative-modal__head">
          <div>
            <h2 id={titleId}>{payload.title}</h2>
            {payload.caption ? <p>{payload.caption}</p> : null}
          </div>
          <button type="button" className="creative-modal__icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={2.2} />
          </button>
        </header>

        <div className="creative-modal__stage-wrap">
          <div
            ref={stageRef}
            className="creative-modal__stage"
            style={{ aspectRatio: aspect, maxHeight: payload.prompt ? "min(52vh, 640px)" : "min(72vh, 820px)" }}
          >
            <CreativeScene scene={payload.scene} eager />
          </div>
        </div>

        <div className="creative-modal__actions">
          <button type="button" className="btn btn-primary creative-modal__btn" onClick={onDownload} disabled={dlState === "busy"}>
            <Download size={15} strokeWidth={2.2} />
            {dlState === "busy" ? "Capturing…" : dlState === "ok" ? "Downloaded" : dlState === "fail" ? "Capture failed" : "Download PNG"}
          </button>
          {payload.prompt ? (
            <button type="button" className="btn creative-modal__btn" onClick={onCopy}>
              {copyState === "ok" ? <Check size={15} strokeWidth={2.2} /> : <Copy size={15} strokeWidth={2.2} />}
              {copyState === "ok" ? "Prompt copied" : copyState === "fail" ? "Copy failed" : "Copy full prompt"}
            </button>
          ) : null}
        </div>

        {payload.prompt ? (
          <section className="creative-modal__prompt">
            <h3 className="mono">Full studio prompt</h3>
            <pre>{payload.prompt}</pre>
          </section>
        ) : null}
      </div>
    </div>
  );
}
