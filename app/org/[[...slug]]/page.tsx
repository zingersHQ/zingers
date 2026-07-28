import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { BRAND, pageTitle } from "@/lib/brand";
import { DocBody } from "@/components/org/doc-body";
import { OrgShell } from "@/components/org/org-shell";
import { loadOrgMarkdown } from "@/lib/org/load";
import { orgCanonical, orgHref, isOrgHost } from "@/lib/org/hosts";
import { ORG_PAGES, ORG_SECTIONS, getOrgPage, orgPagesInSection } from "@/lib/org/registry";
import { orgPageMessageKey } from "@/lib/i18n/org-page-key";

interface Props {
  params: Promise<{ slug?: string[] }>;
}

export function generateStaticParams() {
  return [{ slug: [] as string[] }, ...ORG_PAGES.map((page) => ({ slug: page.slug.split("/") }))];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations("org");
  const { slug: parts } = await params;
  if (!parts?.length) {
    return {
      title: pageTitle(t("docsTitle")),
      description: t("docsDescription"),
      alternates: { canonical: orgCanonical() },
    };
  }
  const slug = parts.join("/");
  const page = getOrgPage(slug);
  if (!page) return { title: pageTitle(t("notFound")) };
  return {
    title: pageTitle(t(`pages.${orgPageMessageKey(page.slug)}`)),
    description: page.description,
    alternates: { canonical: orgCanonical(slug) },
  };
}

async function OrgHome({ host }: { host: string }) {
  const orgHost = BRAND.siteTech.replace("https://", "");
  const href = (s: string) => orgHref(s, host);
  const onOrg = isOrgHost(host);
  const t = await getTranslations("org");

  return (
    <>
      <header className="org-hero">
        <span className="mono org-hero__kicker">
          {orgHost.toUpperCase()} · {t("publicCanon")}
        </span>
        <h1 className="org-hero__title">{t("homeTitle")}</h1>
        <p className="org-hero__lead">
          {t.rich("homeLead", {
            brand: (chunks) => (
              <a href={BRAND.site} className="org-prose__a">
                {chunks}
              </a>
            ),
          })}
        </p>
      </header>

      <div className="org-home-grid">
        {ORG_SECTIONS.map((section) => {
          const pages = orgPagesInSection(section.id);
          const lead = pages[0];
          const sectionKey = section.id as "bible" | "protocol" | "design" | "product";
          return (
            <section key={section.id} className="panel org-home-card">
              <h2 className="org-home-card__title">{t(`sections.${sectionKey}`)}</h2>
              <p className="org-home-card__blurb">{t(`sections.${sectionKey}Blurb`)}</p>
              <ul className="org-home-card__links">
                {pages.map((page) => (
                  <li key={page.slug}>
                    <Link href={href(page.slug)} className="org-home-card__link">
                      {t(`pages.${orgPageMessageKey(page.slug)}`)}
                    </Link>
                  </li>
                ))}
              </ul>
              {lead ? (
                <Link href={href(lead.slug)} className="org-home-card__cta mono">
                  {t("startWith", { title: t(`pages.${orgPageMessageKey(lead.slug)}`) })}
                </Link>
              ) : null}
            </section>
          );
        })}
      </div>

      <section className="panel org-home-extra">
        <h2 className="org-home-card__title">{t("alsoOnSite")}</h2>
        <div className="org-home-extra__row">
          <Link href="/press" className="org-home-extra__tile">
            <span className="org-home-extra__tile-title">{t("pressKit")}</span>
            <span className="org-home-extra__tile-blurb">{t("pressBlurb")}</span>
          </Link>
          <Link href={onOrg ? "/gallery" : `${BRAND.site}/bible`} className="org-home-extra__tile">
            <span className="org-home-extra__tile-title">{t("visualGallery")}</span>
            <span className="org-home-extra__tile-blurb">{t("galleryBlurb")}</span>
          </Link>
          <a href={`${BRAND.site}/agents`} className="org-home-extra__tile">
            <span className="org-home-extra__tile-title">{t("agentPlayground")}</span>
            <span className="org-home-extra__tile-blurb">{t("agentBlurb")}</span>
          </a>
          <a href={`${BRAND.site}/readme`} className="org-home-extra__tile">
            <span className="org-home-extra__tile-title">{t("whitepaper")}</span>
            <span className="org-home-extra__tile-blurb">{t("whitepaperBlurb")}</span>
          </a>
        </div>
      </section>
    </>
  );
}

export default async function OrgPage({ params }: Props) {
  const { slug: parts } = await params;
  const host = (await headers()).get("host")?.split(":")[0] ?? "";

  if (!parts?.length) {
    return (
      <OrgShell>
        <OrgHome host={host} />
      </OrgShell>
    );
  }

  const slug = parts.join("/");
  const page = getOrgPage(slug);
  if (!page) notFound();

  const locale = await getLocale();
  const markdown = await loadOrgMarkdown(page.file, locale);

  return (
    <OrgShell slug={slug}>
      <DocBody markdown={markdown} />
    </OrgShell>
  );
}
