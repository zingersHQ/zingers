import { getLocale, getTranslations } from "next-intl/server";
import { pageTitle } from "@/lib/brand";
import { orgCanonical } from "@/lib/org/hosts";
import { getGlossary } from "@/lib/lore/glossary";

export const metadata = {
  title: pageTitle("Glossary"),
  description: "Every Zingers term in one plain sentence. For new players and anyone who wants a quick reminder.",
};

export default async function GlossaryPage() {
  const locale = await getLocale();
  const t = await getTranslations("glossary");
  const groups = getGlossary(locale);

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "30px 22px 100px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap", marginBottom: 8 }}>
        <h1 style={{ fontSize: 34, fontWeight: 800, margin: 0 }}>{t("pageTitle")}</h1>
        <span className="mono" style={{ color: "var(--muted2)", fontSize: 12, letterSpacing: 1.5 }}>
          {t("pageLead").toUpperCase()}
        </span>
      </div>
      <p style={{ maxWidth: 720, color: "var(--muted)", fontSize: 15, lineHeight: 1.65, margin: "0 0 30px" }}>
        {t("pageLead")}{" "}
        <a href={orgCanonical("bible")} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>
          the Bible
        </a>
        .
      </p>

      {groups.map((group) => (
        <section key={group.id} style={{ marginTop: 34 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 14 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{group.title}</h2>
          </div>
          <dl style={{ display: "grid", gap: 10, margin: 0 }}>
            {group.entries.map((e) => (
              <div
                key={e.term}
                className="panel"
                style={{
                  padding: "14px 16px",
                  display: "grid",
                  gridTemplateColumns: "minmax(120px, 180px) 1fr",
                  gap: 16,
                  alignItems: "baseline",
                }}
              >
                <dt style={{ fontWeight: 800, fontSize: 15 }}>
                  {e.term}
                  {e.was && (
                    <span
                      className="mono"
                      style={{
                        display: "block",
                        fontSize: 10,
                        letterSpacing: 0.5,
                        color: "var(--muted2)",
                        fontWeight: 400,
                        marginTop: 3,
                      }}
                    >
                      {t("was", { term: e.was })}
                    </span>
                  )}
                </dt>
                <dd style={{ margin: 0, color: "var(--muted)", fontSize: 14, lineHeight: 1.6 }}>{e.short}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </main>
  );
}
