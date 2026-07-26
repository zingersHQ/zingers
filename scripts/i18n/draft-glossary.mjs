#!/usr/bin/env node
/** Translate glossary.ts data → lib/lore/glossary/{locale}.json */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(import.meta.url);

// Read English from a JSON dump we'll write first from TS via dynamic approach:
// Prefer messages-free: parse glossary by importing compiled - instead read source arrays from en.json we create below.

const args = process.argv.slice(2);
const locale = (args[args.indexOf("--locale") + 1] || "").toLowerCase();
const LOCALES = ["es", "zh", "ru", "ja"];
const LANG = { es: "Spanish", zh: "Simplified Chinese", ru: "Russian", ja: "Japanese" };
if (!LOCALES.includes(locale)) {
  console.error("draft-glossary: --locale es|zh|ru|ja");
  process.exit(1);
}
const key = process.env.XAI_API_KEY;
if (!key) {
  console.error("need XAI_API_KEY");
  process.exit(1);
}

const enPath = join(root, "lib/lore/glossary/en.json");
const en = JSON.parse(readFileSync(enPath, "utf8"));
const terminology = readFileSync(join(root, "docs/i18n/terminology.md"), "utf8").slice(0, 4000);
const model = process.env.ZINGERS_MODEL || "grok-4-1-fast-non-reasoning";

const res = await fetch("https://api.x.ai/v1/chat/completions", {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    model,
    temperature: 0.35,
    messages: [
      {
        role: "system",
        content: `Translate this Zingers glossary JSON into natural ${LANG[locale]}. Keep group ids. Translate title, term, short, was. Follow:\n${terminology}\nReturn ONLY JSON array of groups.`,
      },
      { role: "user", content: JSON.stringify(en) },
    ],
  }),
});
if (!res.ok) throw new Error(await res.text());
const data = await res.json();
let text = data.choices?.[0]?.message?.content ?? "";
text = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
const parsed = JSON.parse(text);
const outDir = join(root, "lib/lore/glossary");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, `${locale}.json`), JSON.stringify(parsed, null, 2) + "\n");
console.log("wrote", locale);
