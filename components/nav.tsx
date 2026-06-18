"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BRAND } from "@/lib/brand";
import { DOCS_NAV, navIsActive, PRIMARY_NAV, SECONDARY_NAV } from "@/lib/play-nav";

// Immersive surfaces use the in-game dock instead of this bar.
const IMMERSIVE = ["/", "/grounds", "/arena", "/guardian", "/house", "/league"];

export function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  if (path.startsWith("/slides")) return null;
  if (IMMERSIVE.some((p) => path === p || path.startsWith(p + "/"))) return null;

  const close = () => setOpen(false);

  return (
    <header className="site-nav">
      <Link href="/" className="site-nav__brand" onClick={close}>
        <span
          aria-hidden
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            border: "2px solid var(--gold)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--accent)" }} />
        </span>
        <span className="site-nav__name">{BRAND.nameUpper}</span>
        <span className="site-nav__tagline mono">{BRAND.tagline.toUpperCase()}</span>
      </Link>
      <a
        href={BRAND.twitterUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="site-nav__twitter mono"
      >
        @{BRAND.twitter}
      </a>

      <button
        type="button"
        className="site-nav__burger"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "✕" : "☰"}
      </button>

      <nav className={`site-nav__links${open ? " is-open" : ""}`}>
        <span className="site-nav__section mono">Start here</span>
        {PRIMARY_NAV.map((l) => (
          <Link
            key={l.id}
            href={l.href}
            onClick={close}
            className={`site-nav__link mono${navIsActive(path, l.href) ? " is-on" : ""}`}
            title={l.blurb}
          >
            {l.label}
          </Link>
        ))}
        <span className="site-nav__section mono site-nav__section--also">Also</span>
        {SECONDARY_NAV.map((l) => (
          <Link
            key={l.id}
            href={l.href}
            onClick={close}
            className={`site-nav__link mono site-nav__link--secondary${navIsActive(path, l.href) ? " is-on" : ""}`}
            title={l.blurb}
          >
            {l.label}
          </Link>
        ))}
        <span className="site-nav__section mono site-nav__section--also">Read</span>
        {DOCS_NAV.map((l) => (
          <Link
            key={l.id}
            href={l.href}
            onClick={close}
            className={`site-nav__link mono site-nav__link--secondary${l.id === "how" ? " site-nav__link--guide" : ""}${navIsActive(path, l.href) ? " is-on" : ""}`}
            title={l.blurb}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
