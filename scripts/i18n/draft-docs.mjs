#!/usr/bin/env node
/**
 * Draft localized org docs from English registry sources → docs/i18n/{locale}/…
 * Usage: set -a && source .env && set +a && node scripts/i18n/draft-docs.mjs --locale es
 * Optional: --only docs/bible  (prefix filter on source paths)
 * Optional: --skip-existing
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const LOCALES = ["es", "zh", "ru", "ja"];
const LANG = { es: "Spanish", zh: "Simplified Chinese", ru: "Russian", ja: "Japanese" };

const args = process.argv.slice(2);
const locale = (args[args.indexOf("--locale") + 1] || "").toLowerCase();
if (!LOCALES.includes(locale)) {
  console.error(`draft-docs: --locale ${LOCALES.join("|")}`);
  process.exit(1);
}
const skipExisting = args.includes("--skip-existing");
const onlyIdx = args.indexOf("--only");
const onlyPrefix = onlyIdx >= 0 ? (args[onlyIdx + 1] || "").replace(/\/$/, "") : "";
const key = process.env.XAI_API_KEY;
if (!key) {
  console.error("draft-docs: XAI_API_KEY required");
  process.exit(1);
}
const model = process.env.ZINGERS_MODEL || process.env.XAI_MODEL || "grok-4-1-fast-non-reasoning";

// Registry files (duplicated lightly to avoid TS import)
const FILES = [
  "docs/bible/README.md",
  "docs/bible/01-cosmology.md",
  "docs/bible/02-forces.md",
  "docs/bible/03-champions.md",
  "docs/bible/05-regions.md",
  "docs/bible/06-seasons.md",
  "docs/bible/07-collection.md",
  "docs/bible/08-economy.md",
  "docs/bible/10-ascent.md",
  "docs/bible/art-direction.md",
  "docs/bible/09-glossary.md",
  "docs/agent-protocol.md",
  "mcp/README.md",
  "docs/README.md",
  "docs/design-vision.md",
  "docs/vocabulary.md",
  "docs/combat-design.md",
  "docs/game-spec.md",
  "docs/flight-first-plan.md",
  "docs/two-doors.md",
  "docs/essence.md",
  "docs/long-game.md",
  "docs/first-journey-roadmap.md",
  "docs/ONEPAGER.md",
  "docs/TWOPAGER.md",
  "docs/STORY.md",
  "docs/TECHNICAL.md",
  "docs/AI-CRYPTO.md",
];

const terminology = existsSync(join(root, "docs/i18n/terminology.md"))
  ? readFileSync(join(root, "docs/i18n/terminology.md"), "utf8").slice(0, 5000)
  : "";

function outPathFor(file) {
  if (file.startsWith("mcp/")) return join(root, "docs/i18n", locale, file);
  return join(root, "docs/i18n", locale, file.replace(/^docs\//, ""));
}

async function translateDoc(srcRel, text) {
  const bibleVoice = srcRel.includes("docs/bible/")
    ? `\nThis is bible/world-fiction for players. Keep lore voice. Do not invent or restore source file paths, npm scripts, module names, or API routes. Translate the fiction and rules-as-fiction only.`
    : "";
  const prompt = `Translate this Zingers documentation into natural ${LANG[locale]}.
Follow terminology bible:
${terminology}
Keep markdown structure, links, code fences, and image paths unchanged.
Champion names stay Latin. No spaced em dash. Return ONLY the markdown.${bibleVoice}`;

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0.35,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: text.slice(0, 100_000) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`${srcRel}: ${res.status}`);
  const data = await res.json();
  let out = data.choices?.[0]?.message?.content ?? "";
  out = out.replace(/^```markdown\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  return out + "\n";
}

let ok = 0;
let fail = 0;
const selected = onlyPrefix
  ? FILES.filter((f) => f === onlyPrefix || f.startsWith(`${onlyPrefix}/`))
  : FILES;
if (onlyPrefix && selected.length === 0) {
  console.error(`draft-docs: --only ${onlyPrefix} matched no files`);
  process.exit(1);
}
for (const file of selected) {
  const abs = join(root, file);
  if (!existsSync(abs)) {
    console.warn(`missing ${file}`);
    continue;
  }
  const dest = outPathFor(file);
  if (skipExisting && existsSync(dest)) {
    console.log(`skip ${file}`);
    continue;
  }
  try {
    const translated = await translateDoc(file, readFileSync(abs, "utf8"));
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, translated);
    ok++;
    console.log(`ok ${file}`);
  } catch (e) {
    fail++;
    console.error(`fail ${file}: ${e.message}`);
  }
}
console.log(`draft-docs: locale=${locale} ok=${ok} fail=${fail}`);
