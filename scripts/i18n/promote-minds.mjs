#!/usr/bin/env node
/** Copy draft/{locale} → reviewed/{locale} then optionally bake. */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const locale = (args[args.indexOf("--locale") + 1] || "").toLowerCase();
const bake = args.includes("--bake");
if (!["es", "zh", "ru", "ja"].includes(locale)) {
  console.error("promote-minds: --locale es|zh|ru|ja");
  process.exit(1);
}
const src = join(root, "content/minds/draft", locale);
const dest = join(root, "content/minds/reviewed", locale);
if (!existsSync(src)) {
  console.error(`missing ${src}`);
  process.exit(1);
}
mkdirSync(dest, { recursive: true });
const files = readdirSync(src).filter((f) => f.endsWith(".json"));
for (const f of files) {
  copyFileSync(join(src, f), join(dest, f));
}
console.log(`promote-minds: copied ${files.length} → ${dest}`);
if (bake) {
  const r = spawnSync(process.execPath, [join(root, "scripts/bake-minds.mjs"), "--locale", locale], {
    stdio: "inherit",
  });
  process.exit(r.status ?? 1);
}
