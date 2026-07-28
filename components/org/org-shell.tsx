import Link from "next/link";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { BRAND } from "@/lib/brand";
import { isOrgHost, orgHref } from "@/lib/org/hosts";
import { ORG_SECTIONS, orgPagesInSection } from "@/lib/org/registry";
import { orgPageMessageKey } from "@/lib/i18n/org-page-key";

export async function OrgShell({
  slug,
  children,
  wide = false,
  activeExtra,
}: {
  slug?: string;
  children: ReactNode;
  /** Wider main column (press kit grids, etc.). */
  wide?: boolean;
  activeExtra?: "gallery" | "press";
}) {
  const host = (await headers()).get("host")?.split(":")[0] ?? "";
  const orgHost = BRAND.siteTech.replace("https://", "");
  const locale = await getLocale();
  const href = (s: string) => orgHref(s, host, locale);
  const t = await getTranslations("org");
  const onOrg = isOrgHost(host);
  const pressHref = onOrg ? "/press" : "/press";
  const galleryHref = onOrg ? "/gallery" : `${BRAND.site}/bible`;

  return (
    <div className="org-layout">
      <aside className="org-sidebar panel">
        <div className="org-sidebar__head">
          <Link href={href("")} className="org-sidebar__brand">
            <span className="org-sidebar__host mono">{orgHost}</span>
            <span className="org-sidebar__title">{t("docsCanon")}</span>
          </Link>
          <p className="org-sidebar__blurb">{t("shellBlurb")}</p>
        </div>

        <nav className="org-sidebar__nav">
          {ORG_SECTIONS.map((section) => {
            const pages = orgPagesInSection(section.id);
            const titleKey = `${section.id}` as "bible" | "protocol" | "design" | "product";
            return (
              <div key={section.id} className="org-sidebar__group">
                <div className="org-sidebar__group-title mono">{t(`sections.${titleKey}`)}</div>
                <ul className="org-sidebar__list">
                  {pages.map((page) => {
                    const active = slug === page.slug;
                    const title = t(`pages.${orgPageMessageKey(page.slug)}`);
                    return (
                      <li key={page.slug}>
                        <Link href={href(page.slug)} className={`org-sidebar__link${active ? " is-on" : ""}`}>
                          {title}
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
          <Link
            href={pressHref}
            className={`org-sidebar__cta btn${activeExtra === "press" ? " is-on" : ""}`}
          >
            {t("pressKit")}
          </Link>
          <Link
            href={galleryHref}
            className={`org-sidebar__cta btn${activeExtra === "gallery" ? " is-on" : ""}`}
          >
            {t("visualGallery")}
          </Link>
          <a href={`${BRAND.site}/agents`} className="org-sidebar__cta btn">
            {t("trainAgent")}
          </a>
          <a href={BRAND.site} className="org-sidebar__back mono">
            {t("playGame")}
          </a>
        </div>
      </aside>

      <main className={`org-main${wide ? " org-main--wide" : ""}`}>{children}</main>
    </div>
  );
}
