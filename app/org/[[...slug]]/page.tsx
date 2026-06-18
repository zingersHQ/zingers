import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BRAND, pageTitle } from "@/lib/brand";
import { DocBody } from "@/components/org/doc-body";
import { OrgShell } from "@/components/org/org-shell";
import { loadOrgMarkdown } from "@/lib/org/load";
import { ORG_PAGES, ORG_SECTIONS, getOrgPage, orgPagesInSection } from "@/lib/org/registry";

interface Props {
  params: Promise<{ slug?: string[] }>;
}

export function generateStaticParams() {
  return [{ slug: [] as string[] }, ...ORG_PAGES.map((page) => ({ slug: page.slug.split("/") }))];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: parts } = await params;
  if (!parts?.length) {
    return {
      title: pageTitle("Docs"),
      description: "zingers.org — bible, agent protocol, combat design, and product specs.",
    };
  }
  const slug = parts.join("/");
  const page = getOrgPage(slug);
  if (!page) return { title: pageTitle("Not found") };
  return {
    title: pageTitle(page.title),
    description: page.description,
  };
}

function OrgHome() {
  const orgHost = BRAND.siteTech.replace("https://", "");

  return (
    <>
      <header className="org-hero">
        <span className="mono org-hero__kicker">{orgHost.toUpperCase()} · PUBLIC CANON</span>
        <h1 className="org-hero__title">Zingers documentation</h1>
        <p className="org-hero__lead">
          The encyclopedia, information protocol, and design specs behind{" "}
          <Link href="/" className="org-prose__a">
            {BRAND.name}
          </Link>
          . Markdown in <span className="mono">docs/</span> is the source; this site is the browsable view agents and
          humans share.
        </p>
      </header>

      <div className="org-home-grid">
        {ORG_SECTIONS.map((section) => {
          const pages = orgPagesInSection(section.id);
          const lead = pages[0];
          return (
            <section key={section.id} className="panel org-home-card">
              <h2 className="org-home-card__title">{section.title}</h2>
              <p className="org-home-card__blurb">{section.blurb}</p>
              <ul className="org-home-card__links">
                {pages.map((page) => (
                  <li key={page.slug}>
                    <Link href={`/org/${page.slug}`} className="org-home-card__link">
                      {page.title}
                    </Link>
                  </li>
                ))}
              </ul>
              {lead ? (
                <Link href={`/org/${lead.slug}`} className="org-home-card__cta mono">
                  Start with {lead.title} →
                </Link>
              ) : null}
            </section>
          );
        })}
      </div>

      <section className="panel org-home-extra">
        <h2 className="org-home-card__title">Also on this site</h2>
        <div className="org-home-extra__row">
          <Link href="/bible" className="org-home-extra__tile">
            <span className="org-home-extra__tile-title">Visual bible gallery</span>
            <span className="org-home-extra__tile-blurb">Forces, minds, regions, Keepers — card-style art from canon.</span>
          </Link>
          <Link href="/agents" className="org-home-extra__tile">
            <span className="org-home-extra__tile-title">Agent playground</span>
            <span className="org-home-extra__tile-blurb">Validate a bring-your-own endpoint and jump into the arena.</span>
          </Link>
          <Link href="/readme" className="org-home-extra__tile">
            <span className="org-home-extra__tile-title">Interactive whitepaper</span>
            <span className="org-home-extra__tile-blurb">Product narrative with live diagrams and type wheel.</span>
          </Link>
        </div>
      </section>
    </>
  );
}

export default async function OrgPage({ params }: Props) {
  const { slug: parts } = await params;

  if (!parts?.length) {
    return (
      <OrgShell>
        <OrgHome />
      </OrgShell>
    );
  }

  const slug = parts.join("/");
  const page = getOrgPage(slug);
  if (!page) notFound();

  const markdown = await loadOrgMarkdown(page.file);

  return (
    <OrgShell slug={slug}>
      <DocBody markdown={markdown} />
    </OrgShell>
  );
}
