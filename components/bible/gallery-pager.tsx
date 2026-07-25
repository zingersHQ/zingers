"use client";
import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Desktop page size for live 3D gallery tiles. Keep well under the browser
 *  WebGL context cap (~16) so Forces + First Minds + Dex page never starve. */
const DESKTOP_PAGE = 5;
const MOBILE_PAGE = 1;
const MOBILE_MQ = "(max-width: 640px)";

function usePageSize() {
  const [n, setN] = useState(DESKTOP_PAGE);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(MOBILE_MQ);
    const apply = () => setN(mq.matches ? MOBILE_PAGE : DESKTOP_PAGE);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return n;
}

/**
 * Arrow-paginated strip that only mounts the current page of children.
 * Critical for the bible/gallery Dex: unmounted tiles release WebGL contexts.
 */
export function GalleryPager({
  items,
  label,
  minCol = 180,
}: {
  items: ReactNode[];
  /** short name for aria, e.g. "dex" */
  label: string;
  /** min column width for the page grid (ignored on mobile single-col) */
  minCol?: number;
}) {
  const pageSize = usePageSize();
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const [page, setPage] = useState(0);
  const safePage = Math.min(page, pages - 1);
  const start = safePage * pageSize;
  const slice = items.slice(start, start + pageSize);
  const end = start + slice.length;

  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(0, pages - 1)));
  }, [pages]);

  if (items.length === 0) return null;

  const canPrev = safePage > 0;
  const canNext = safePage < pages - 1;

  return (
    <div
      role="region"
      aria-label={`${label} gallery pages`}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft" && canPrev) {
          e.preventDefault();
          setPage(safePage - 1);
        } else if (e.key === "ArrowRight" && canNext) {
          e.preventDefault();
          setPage(safePage + 1);
        }
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <span className="mono" style={{ fontSize: 11, color: "var(--muted2)", letterSpacing: 0.6 }}>
          {items.length === 1
            ? "1"
            : `${start + 1}–${end} of ${items.length}`}
        </span>
        {pages > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <PagerBtn
              ariaLabel={`Previous ${label} page`}
              disabled={!canPrev}
              onClick={() => setPage(safePage - 1)}
            >
              <ChevronLeft size={18} strokeWidth={2.4} />
            </PagerBtn>
            <span className="mono" style={{ fontSize: 11, color: "var(--muted)", minWidth: 52, textAlign: "center" }}>
              {safePage + 1} / {pages}
            </span>
            <PagerBtn
              ariaLabel={`Next ${label} page`}
              disabled={!canNext}
              onClick={() => setPage(safePage + 1)}
            >
              <ChevronRight size={18} strokeWidth={2.4} />
            </PagerBtn>
          </div>
        )}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            pageSize === 1 ? "1fr" : `repeat(auto-fit, minmax(${minCol}px, 1fr))`,
          gap: pageSize === 1 ? 14 : 12,
        }}
      >
        {slice}
      </div>
    </div>
  );
}

function PagerBtn({
  children,
  onClick,
  disabled,
  ariaLabel,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled: boolean;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      style={{
        display: "grid",
        placeItems: "center",
        width: 36,
        height: 36,
        borderRadius: 8,
        border: "1px solid color-mix(in srgb, var(--text) 16%, transparent)",
        background: disabled ? "transparent" : "color-mix(in srgb, var(--text) 6%, transparent)",
        color: "var(--text)",
        opacity: disabled ? 0.35 : 1,
        cursor: disabled ? "default" : "pointer",
        padding: 0,
      }}
    >
      {children}
    </button>
  );
}
