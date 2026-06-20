"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { isOrgHost } from "@/lib/org/hosts";
import { DOCS_NAV, navIsActive, PRIMARY_NAV, SECONDARY_NAV, docsNavIsActive, siteNavHidden } from "@/lib/play-nav";
import { ThemeToggle } from "@/components/theme-toggle";

export function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const host = typeof window !== "undefined" ? window.location.hostname : undefined;
  const onOrg = host ? isOrgHost(host) : false;
  // The immersive 3D world (/, /grounds) and pure render/slide surfaces keep
  // their own chrome; everything else shares this header.
  if (siteNavHidden(path, onOrg)) return null;

  const gameHref = (href: string) => (onOrg ? `${BRAND.site}${href}` : href);

  const close = () => setOpen(false);

  return (
    <header className="site-nav">
      <Link href={onOrg ? BRAND.site : "/"} className="site-nav__brand" onClick={close}>
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
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      <nav className={`site-nav__links${open ? " is-open" : ""}`}>
        <span className="site-nav__section mono">Start here</span>
        {PRIMARY_NAV.map((l) => (
          <Link
            key={l.id}
            href={gameHref(l.href)}
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
            href={gameHref(l.href)}
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
            href={l.id === "org" && onOrg ? "/" : l.href}
            onClick={close}
            className={`site-nav__link mono site-nav__link--secondary${l.id === "how" ? " site-nav__link--guide" : ""}${docsNavIsActive(path, l.id, host) ? " is-on" : navIsActive(path, l.href) ? " is-on" : ""}`}
            title={l.blurb}
          >
            {l.label}
          </Link>
        ))}
        <span className="site-nav__section mono site-nav__section--also">Display</span>
        <ThemeToggle />
      </nav>
    </header>
  );
}
