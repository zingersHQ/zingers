"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Gamepad2, Swords, LayoutGrid, Shield, Trophy, Ellipsis, X } from "lucide-react";
import { DOCK_H, DOCS_NAV, navIsActive, PRIMARY_NAV, SECONDARY_NAV, type PlayLink } from "@/lib/play-nav";

const ICONS: Record<string, typeof Gamepad2> = {
  play: Gamepad2,
  fight: Swords,
  collection: LayoutGrid,
  campaign: Shield,
  rank: Trophy,
};

function DockLink({ item, active, compact }: { item: PlayLink; active: boolean; compact?: boolean }) {
  const Icon = ICONS[item.id];
  const col = active ? "var(--gold)" : "var(--muted)";
  return (
    <Link
      href={item.href}
      title={item.blurb}
      className={`game-dock__link${active ? " is-on" : ""}`}
    >
      {Icon && <Icon size={compact ? 20 : 18} strokeWidth={2} color={col} />}
      <span className="game-dock__label">{compact ? item.short : item.label}</span>
    </Link>
  );
}

export function GameDock({ hidden = false, fixed = false }: { hidden?: boolean; fixed?: boolean }) {
  const path = usePathname();
  const [more, setMore] = useState(false);
  if (hidden) return null;

  const moreActive = SECONDARY_NAV.some((l) => navIsActive(path, l.href)) || DOCS_NAV.some((l) => navIsActive(path, l.href));

  return (
    <>
      {more && (
        <div
          className="game-dock__sheet-backdrop"
          onClick={() => setMore(false)}
          role="presentation"
        />
      )}
      {more && (
        <div className="game-dock__sheet panel pop" role="dialog" aria-label="More modes">
          <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
            <span className="mono" style={{ fontSize: 10, letterSpacing: 2, color: "var(--muted2)" }}>MORE MODES</span>
            <button type="button" onClick={() => setMore(false)} aria-label="Close" className="game-dock__sheet-close">
              <X size={18} strokeWidth={2} />
            </button>
          </div>
          <div className="game-dock__sheet-grid">
            {[...SECONDARY_NAV, ...DOCS_NAV].map((item) => (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setMore(false)}
                className={`game-dock__sheet-item${navIsActive(path, item.href) ? " is-on" : ""}`}
              >
                <span style={{ fontWeight: 700, fontSize: 13 }}>{item.label}</span>
                <span className="mono" style={{ fontSize: 9, color: "var(--muted2)", marginTop: 4, lineHeight: 1.35 }}>{item.blurb}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <nav
        className={`game-dock${fixed ? " game-dock--fixed" : ""}`}
        aria-label="Game modes"
        style={{ ["--dock-h" as string]: `${DOCK_H}px` }}
      >
        {PRIMARY_NAV.map((item) => (
          <DockLink key={item.id} item={item} active={navIsActive(path, item.href)} compact />
        ))}
        <button
          type="button"
          className={`game-dock__link game-dock__more${moreActive ? " is-on" : ""}`}
          aria-expanded={more}
          aria-label="More modes and docs"
          onClick={() => setMore((v) => !v)}
        >
          <Ellipsis size={20} strokeWidth={2} color={moreActive ? "var(--gold)" : "var(--muted)"} />
          <span className="game-dock__label">More</span>
        </button>
      </nav>
    </>
  );
}
