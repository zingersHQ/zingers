#!/usr/bin/env node
/** Validate i18n message key parity + locale doc/mind presence. */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const LOCALES = ["en", "es", "zh", "ru", "ja"];

function flatten(obj, prefix = "") {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) out.push(...flatten(v, key));
    else out.push(key);
  }
  return out;
}

let errors = 0;
const en = JSON.parse(readFileSync(join(root, "messages/en.json"), "utf8"));
const enKeys = new Set(flatten(en));

for (const loc of LOCALES) {
  const path = join(root, "messages", `${loc}.json`);
  if (!existsSync(path)) {
    console.error(`missing messages/${loc}.json`);
    errors++;
    continue;
  }
  const keys = new Set(flatten(JSON.parse(readFileSync(path, "utf8"))));
  for (const k of enKeys) {
    if (!keys.has(k)) {
      console.error(`${loc}: missing key ${k}`);
      errors++;
    }
  }
  // em dash ban in message values
  const raw = readFileSync(path, "utf8");
  if (raw.includes(" — ")) {
    console.error(`${loc}: spaced em dash in messages`);
    errors++;
  }
}

for (const loc of ["es", "zh", "ru", "ja"]) {
  const baked = join(root, "lib/minds/baked", `${loc}.ts`);
  if (!existsSync(baked)) {
    console.warn(`warn: missing baked ${loc}.ts (fallback to en at runtime)`);
  }
  const reviewed = join(root, "content/minds/reviewed", loc);
  if (!existsSync(reviewed) || !readdirSync(reviewed).some((f) => f.endsWith(".json"))) {
    console.warn(`warn: no reviewed minds for ${loc}`);
  }
}

if (errors) {
  console.error(`i18n check failed: ${errors} error(s)`);
  process.exit(1);
}
console.log("i18n check: ok");
