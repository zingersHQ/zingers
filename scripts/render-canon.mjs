#!/usr/bin/env node
/**
 * Export canon PNGs from the live game model (/render/* routes).
 * Usage: npm run dev (separate terminal) → npm run render:canon
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BASE = process.env.RENDER_BASE ?? "http://localhost:3000";
const OUT = path.join(ROOT, "public", "renders");

const MINDS = ["AXIOM", "VOX", "GLITCH", "MUSE", "BASTION", "EMBER"];
const FORCES = ["lattice", "static", "stillness", "chorus", "spark"];
const REGIONS = ["colosseum", "wastes", "garden"];
const KEEPERS = [
  { name: "Tibble", file: "tibble" },
  { name: "Quill", file: "quill" },
  { name: "Bastion", file: "warden" },
  { name: "Vesper", file: "vesper" },
  { name: "Sable", file: "sable" },
];

async function waitReady(page, timeoutMs = 90000) {
  await page.waitForFunction(() => document.querySelector('[data-render-ready="true"]'), null, { timeout: timeoutMs });
  await page.waitForTimeout(600);
}

async function shot(page, url, outPath, clip) {
  await page.goto(url, { waitUntil: "load", timeout: 120000 });
  await waitReady(page);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await page.screenshot({ path: outPath, clip, type: "png" });
  console.log("wrote", path.relative(ROOT, outPath));
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({
    args: ["--use-gl=angle", "--enable-webgl", "--ignore-gpu-blocklist"],
  });
  const page = await browser.newPage({ deviceScaleFactor: 2 });

  for (const key of MINDS) {
    const w = 800;
    const h = 1000;
    await page.setViewportSize({ width: w, height: h });
    await shot(page, `${BASE}/render/portrait/${key}?w=${w}&h=${h}`, path.join(OUT, "minds", `${key.toLowerCase()}.png`), { x: 0, y: 0, width: w, height: h });
  }

  for (const slug of FORCES) {
    const size = 768;
    await page.setViewportSize({ width: size, height: size });
    await shot(page, `${BASE}/render/force/${slug}?size=${size}`, path.join(OUT, "forces", `force-${slug}.png`), { x: 0, y: 0, width: size, height: size });
  }

  for (const id of REGIONS) {
    const w = 1280;
    const h = 720;
    await page.setViewportSize({ width: w, height: h });
    await shot(page, `${BASE}/render/region/${id}?w=${w}&h=${h}`, path.join(OUT, "regions", `region-${id}.png`), { x: 0, y: 0, width: w, height: h });
  }

  for (const k of KEEPERS) {
    const w = 800;
    const h = 1000;
    await page.setViewportSize({ width: w, height: h });
    await shot(page, `${BASE}/render/keeper/${k.name}?w=${w}&h=${h}`, path.join(OUT, "keepers", `keeper-${k.file}.png`), { x: 0, y: 0, width: w, height: h });
  }

  await browser.close();
  console.log("Done — canon renders in public/renders/");
}

async function ping() {
  try {
    const res = await fetch(BASE);
    return res.ok;
  } catch {
    return false;
  }
}

if (!(await ping())) {
  console.error(`Dev server not reachable at ${BASE}. Run: npm run dev`);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
