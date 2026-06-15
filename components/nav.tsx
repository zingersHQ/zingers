"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND } from "@/lib/brand";

const LINKS = [
  { href: "/grounds", label: "The Grounds" },
  { href: "/league", label: "Live League" },
  { href: "/standings", label: "Standings" },
  { href: "/howitworks", label: "How it works" },
];

export function Nav() {
  const path = usePathname();
  if (path.startsWith("/slides")) return null;
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "12px 22px",
        borderBottom: "1px solid var(--line)",
        background: "color-mix(in srgb, var(--bg) 78%, transparent)",
        backdropFilter: "blur(14px)",
      }}
    >
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
        <span style={{ fontWeight: 700, letterSpacing: 0.5 }}>
          {BRAND.nameUpper}
        </span>
        <span className="mono" style={{ fontSize: 9, color: "var(--muted2)", letterSpacing: 2, marginTop: 2 }}>
          {BRAND.tagline.toUpperCase()}
        </span>
      </Link>
      <a
        href={BRAND.twitterUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mono"
        style={{ fontSize: 10, color: "var(--muted2)", letterSpacing: 0.5, marginLeft: 4 }}
      >
        @{BRAND.twitter}
      </a>
      <nav style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
        {LINKS.map((l) => {
          const on = path === l.href || path.startsWith(l.href + "/");
          return (
            <Link
              key={l.href}
              href={l.href}
              className="mono"
              style={{
                fontSize: 12,
                letterSpacing: 0.6,
                padding: "8px 13px",
                borderRadius: 9,
                color: on ? "var(--ink)" : "var(--muted)",
                background: on ? "var(--panel)" : "transparent",
                border: `1px solid ${on ? "var(--line2)" : "transparent"}`,
              }}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
