import Link from "next/link";
import { pageTitle } from "@/lib/brand";
import { GLOSSARY } from "@/lib/lore/glossary";

export const metadata = {
  title: pageTitle("Glossary"),
  description: "Every Zingers term in one plain sentence — for new players and anyone who wants a quick reminder.",
};

export default function GlossaryPage() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "30px 22px 100px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap", marginBottom: 8 }}>
        <h1 style={{ fontSize: 34, fontWeight: 800, margin: 0 }}>Glossary</h1>
        <span className="mono" style={{ color: "var(--muted2)", fontSize: 12, letterSpacing: 1.5 }}>
          EVERY TERM, IN ONE LINE
        </span>
      </div>
      <p style={{ maxWidth: 720, color: "var(--muted)", fontSize: 15, lineHeight: 1.65, margin: "0 0 30px" }}>
        New here, or need a quick reminder? Here&apos;s every Zingers word in one plain sentence. For the full
        story behind them, read{" "}
        <Link href="/bible" style={{ color: "var(--accent)" }}>
          the Bible
        </Link>
        .
      </p>

      {GLOSSARY.map((group) => (
        <section key={group.id} style={{ marginTop: 34 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 14 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{group.title}</h2>
          </div>
          <dl style={{ display: "grid", gap: 10, margin: 0 }}>
            {group.entries.map((e) => (
              <div
                key={e.term}
                className="panel"
                style={{ padding: "14px 16px", display: "grid", gridTemplateColumns: "minmax(120px, 180px) 1fr", gap: 16, alignItems: "baseline" }}
              >
                <dt style={{ fontWeight: 800, fontSize: 15 }}>
                  {e.term}
                  {e.was && (
                    <span className="mono" style={{ display: "block", fontSize: 10, letterSpacing: 0.5, color: "var(--muted2)", fontWeight: 400, marginTop: 3 }}>
                      was: {e.was}
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
