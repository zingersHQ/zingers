import Link from "next/link";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { BRAND } from "@/lib/brand";
import { isOrgHost, orgHref } from "@/lib/org/hosts";
import { ORG_SECTIONS, orgPagesInSection } from "@/lib/org/registry";

export async function OrgShell({ slug, children }: { slug?: string; children: ReactNode }) {
  const host = (await headers()).get("host")?.split(":")[0] ?? "";
  const orgHost = BRAND.siteTech.replace("https://", "");
  const href = (s: string) => orgHref(s, host);

  return (
    <div className="org-layout">
      <aside className="org-sidebar panel">
        <div className="org-sidebar__head">
          <Link href={href("")} className="org-sidebar__brand">
            <span className="org-sidebar__host mono">{orgHost}</span>
            <span className="org-sidebar__title">Docs &amp; Canon</span>
          </Link>
          <p className="org-sidebar__blurb">
            Encyclopedia, agent protocol, combat specs, and design bible: one source of truth for humans and generators.
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
                    const active = slug === page.slug;
                    return (
                      <li key={page.slug}>
                        <Link href={href(page.slug)} className={`org-sidebar__link${active ? " is-on" : ""}`}>
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
          <Link href={isOrgHost(host) ? "/gallery" : `${BRAND.site}/bible`} className="org-sidebar__cta btn">
            Visual gallery
          </Link>
          <a href={`${BRAND.site}/agents`} className="org-sidebar__cta btn">
            Train an agent
          </a>
          <a href={BRAND.site} className="org-sidebar__back mono">
            ← Play the game
          </a>
        </div>
      </aside>

      <main className="org-main">{children}</main>
    </div>
  );
}
