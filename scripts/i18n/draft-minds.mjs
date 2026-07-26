#!/usr/bin/env node
/**
 * Draft localized mind JSON from English reviewed sources.
 * Writes content/minds/draft/{locale}/*.json — promote to reviewed/{locale}/ after native pass.
 *
 * Usage:
 *   set -a && source .env && set +a
 *   node scripts/i18n/draft-minds.mjs --locale es [--limit 5] [--concurrency 3]
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const LOCALES = ["es", "zh", "ru", "ja"];
const LANG = {
  es: "Spanish",
  zh: "Simplified Chinese",
  ru: "Russian",
  ja: "Japanese",
};

const args = process.argv.slice(2);
function flag(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const locale = (flag("locale", "") || "").toLowerCase();
if (!LOCALES.includes(locale)) {
  console.error(`draft-minds: --locale must be one of ${LOCALES.join(", ")}`);
  process.exit(1);
}
const limit = Math.max(0, Number(flag("limit", "0")) || 0);
const concurrency = Math.max(1, Math.min(6, Number(flag("concurrency", "3")) || 3));
const skipExisting = args.includes("--skip-existing");

const enDir = join(root, "content/minds/reviewed");
const outDir = join(root, "content/minds/draft", locale);
mkdirSync(outDir, { recursive: true });

const terminology = existsSync(join(root, "docs/i18n/terminology.md"))
  ? readFileSync(join(root, "docs/i18n/terminology.md"), "utf8").slice(0, 6000)
  : "";

const files = readdirSync(enDir)
  .filter((f) => f.endsWith(".json"))
  .sort();
const selected = limit > 0 ? files.slice(0, limit) : files;

const key = process.env.XAI_API_KEY;
if (!key) {
  console.error("draft-minds: XAI_API_KEY required");
  process.exit(1);
}
const model = process.env.ZINGERS_MODEL || process.env.XAI_MODEL || "grok-4-1-fast-non-reasoning";

async function translateMind(raw) {
  const prompt = `You localize Zingers champion content into natural ${LANG[locale]}.
Rules from terminology bible:
${terminology}

CRITICAL:
- Keep key, name, type, stats, move ids, move.stat, move.base, apply, etc. EXACTLY as in the English JSON.
- Translate: persona, move.name (display), all beats strings, banter lines, firstDuel.hook.
- Keep placeholders {opp} and {topic} intact.
- No spaced em dash. No English bout/ELO/ladder product nouns.
- Champion name (key) stays Latin uppercase.
- Wit must feel native, not machine-translated.

Return ONLY the full JSON object, no markdown.`;

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0.55,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: JSON.stringify(raw) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`xAI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  let text = data.choices?.[0]?.message?.content ?? "";
  text = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  const parsed = JSON.parse(text);
  // Preserve structural fields from English
  parsed.key = raw.key;
  parsed.name = raw.name;
  parsed.type = raw.type;
  parsed.stats = raw.stats;
  if (Array.isArray(raw.moves) && Array.isArray(parsed.moves)) {
    parsed.moves = raw.moves.map((m, i) => ({
      ...m,
      name: parsed.moves[i]?.name || m.name,
    }));
  } else {
    parsed.moves = raw.moves;
  }
  if (raw.showcase) parsed.showcase = raw.showcase;
  if (raw.firstDuel?.originAxis) {
    parsed.firstDuel = {
      ...(parsed.firstDuel || {}),
      originAxis: raw.firstDuel.originAxis,
      hook: parsed.firstDuel?.hook || raw.firstDuel.hook,
    };
  }
  // Ensure banter keys match move ids
  const banter = {};
  for (const m of raw.moves) {
    const lines = parsed.banter?.[m.id];
    banter[m.id] = Array.isArray(lines) && lines.length === 3 ? lines : raw.banter[m.id];
  }
  parsed.banter = banter;
  return parsed;
}

async function pool(items, n, fn) {
  let i = 0;
  const workers = Array.from({ length: n }, async () => {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
}

let ok = 0;
let fail = 0;
await pool(selected, concurrency, async (file) => {
  const dest = join(outDir, file);
  if (skipExisting && existsSync(dest)) {
    console.log(`skip ${file}`);
    return;
  }
  const raw = JSON.parse(readFileSync(join(enDir, file), "utf8"));
  try {
    const out = await translateMind(raw);
    writeFileSync(dest, JSON.stringify(out, null, 2) + "\n");
    ok++;
    console.log(`ok ${file}`);
  } catch (e) {
    fail++;
    console.error(`fail ${file}: ${e.message}`);
  }
});

console.log(`draft-minds: locale=${locale} ok=${ok} fail=${fail} → ${outDir}`);
