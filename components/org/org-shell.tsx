import Link from "next/link";
import type { ReactNode } from "react";
import { BRAND } from "@/lib/brand";
import { ORG_SECTIONS, orgPagesInSection } from "@/lib/org/registry";

export function OrgShell({ slug, children }: { slug?: string; children: ReactNode }) {
  const orgHost = BRAND.siteTech.replace("https://", "");

  return (
    <div className="org-layout">
      <aside className="org-sidebar panel">
        <div className="org-sidebar__head">
          <Link href="/org" className="org-sidebar__brand">
            <span className="org-sidebar__host mono">{orgHost}</span>
            <span className="org-sidebar__title">Docs &amp; Canon</span>
          </Link>
          <p className="org-sidebar__blurb">
            Encyclopedia, agent protocol, combat specs, and design bible — one source of truth for humans and generators.
          </p>
        </div>

        <nav className="org-sidebar__nav">
          {ORG_SECTIONS.map((section) => {
            const pages = orgPagesInSection(section.id);
            return (
              <div key={section.id} className="org-sidebar__group">
                <div className="org-sidebar__group-title mono">{section.title}</div>
                <ul className="org-sidebar__list">
                  {pages.map((page) => {
                    const href = `/org/${page.slug}`;
                    const active = slug === page.slug;
                    return (
                      <li key={page.slug}>
                        <Link href={href} className={`org-sidebar__link${active ? " is-on" : ""}`}>
                          {page.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="org-sidebar__foot">
          <Link href="/bible" className="org-sidebar__cta btn">
            Visual gallery
          </Link>
          <Link href="/agents" className="org-sidebar__cta btn">
            Train an agent
          </Link>
          <Link href="/" className="org-sidebar__back mono">
            ← Play the game
          </Link>
        </div>
      </aside>

      <main className="org-main">{children}</main>
    </div>
  );
}
