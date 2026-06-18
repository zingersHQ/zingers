"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Menu as MenuIcon, X } from "lucide-react";
import { DOCS_NAV, navIsActive, PRIMARY_NAV, SECONDARY_NAV, type PlayLink } from "@/lib/play-nav";

function MenuLink({ item, path, onPick }: { item: PlayLink; path: string; onPick: () => void }) {
  const active = navIsActive(path, item.href);
  return (
    <Link href={item.href} onClick={onPick} className={`game-menu__item${active ? " is-on" : ""}`}>
      <span className="game-menu__item-label">{item.label}</span>
      <span className="game-menu__item-blurb">{item.blurb}</span>
    </Link>
  );
}

/**
 * In-game navigation — a single visible menu button (top-left) that opens a
 * panel of every mode. No persistent bottom bar. Also toggled with the M key.
 */
export function GameMenu({ hidden = false, fixed = false }: { hidden?: boolean; fixed?: boolean }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return close();
      if (e.key.toLowerCase() === "m" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const el = e.target as HTMLElement | null;
        const tag = el?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) return;
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, toggle]);

  useEffect(() => {
    close();
  }, [path, close]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (hidden) return null;

  return (
    <>
      <button
        type="button"
        className={`game-menu__trigger${fixed ? " game-menu__trigger--fixed" : ""}${open ? " is-open" : ""}`}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={toggle}
      >
        {open ? <X size={20} strokeWidth={2.2} /> : <MenuIcon size={20} strokeWidth={2.2} />}
      </button>

      {open && (
        <div
          className="game-menu__panel"
          role="dialog"
          aria-label="Navigation"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="game-menu__panel-inner">
            <div className="game-menu__panel-head">
              <span className="game-menu__panel-kicker mono">Menu</span>
              <button type="button" className="game-menu__panel-close" aria-label="Close menu" onClick={close}>
                <X size={18} strokeWidth={2.2} />
              </button>
            </div>

            <div className="game-menu__grid">
              <div className="game-menu__section">
                <span className="game-menu__section-label mono">Play</span>
                {PRIMARY_NAV.map((item) => (
                  <MenuLink key={item.id} item={item} path={path} onPick={close} />
                ))}
              </div>

              <div className="game-menu__section">
                <span className="game-menu__section-label mono">Also</span>
                {SECONDARY_NAV.map((item) => (
                  <MenuLink key={item.id} item={item} path={path} onPick={close} />
                ))}
              </div>

              <div className="game-menu__section">
                <span className="game-menu__section-label mono">Read</span>
                {DOCS_NAV.map((item) => (
                  <MenuLink key={item.id} item={item} path={path} onPick={close} />
                ))}
              </div>
            </div>

            <p className="game-menu__hint mono">M to toggle · Esc to close</p>
          </div>
        </div>
      )}
    </>
  );
}

/** @deprecated bottom bar — use GameMenu */
export const GameDock = GameMenu;
