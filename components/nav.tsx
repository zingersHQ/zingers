"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BRAND } from "@/lib/brand";

const LINKS = [
  { href: "/daily", label: "Daily Zinger" },
  { href: "/guardian", label: "The Guardian" },
  { href: "/grounds", label: "The Grounds" },
  { href: "/league", label: "Live League" },
  { href: "/standings", label: "Standings" },
  { href: "/howitworks", label: "How it works" },
  { href: "/readme", label: "Whitepaper" },
];

export function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  if (path.startsWith("/slides")) return null;
  return (
    <header className="site-nav">
      <Link href="/" className="site-nav__brand" onClick={() => setOpen(false)}>
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
        {LINKS.map((l) => {
          const on = path === l.href || path.startsWith(l.href + "/");
          return (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`site-nav__link mono${on ? " is-on" : ""}`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
