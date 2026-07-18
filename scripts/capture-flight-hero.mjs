#!/usr/bin/env node
// Capture the real WebGL first frame (our models) into public/img/home/.
// Usage: node scripts/capture-flight-hero.mjs [baseUrl]
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const base = process.argv[2] || "http://localhost:3005";
const outDir = path.resolve("public/img/home");
const url = `${base.replace(/\/$/, "")}/dev/flight-hero-still`;

const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=angle", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({
  viewport: { width: 1600, height: 900 },
  deviceScaleFactor: 1,
});

console.log("open", url);
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
await page.addStyleTag({
  content: `
    nav, header, [data-nextjs-toast], [data-nextjs-dev-overlay],
    nextjs-portal, #__next-build-watcher { display: none !important; visibility: hidden !important; }
    body { background: #e8b878 !important; }
  `,
});
await page.waitForSelector("canvas", { timeout: 120_000 });
await page.waitForSelector('[data-flight-hero-ready="1"]', { timeout: 180_000 });
// Nature kit fills in after cast-ready — wait for trees to plant.
await page.waitForTimeout(6_000);

await mkdir(outDir, { recursive: true });
const full = path.join(outDir, "flight-hero-poster.jpg");
await page.locator("[data-flight-hero-still]").screenshot({
  path: full,
  type: "jpeg",
  quality: 88,
});
console.log("wrote", full);

try {
  const { default: sharp } = await import("sharp");
  const smPath = path.join(outDir, "flight-hero-poster-sm.jpg");
  await sharp(full).resize({ width: 1280 }).jpeg({ quality: 80 }).toFile(smPath);
  console.log("wrote", smPath);
} catch {
  const smPath = path.join(outDir, "flight-hero-poster-sm.jpg");
  const { copyFile } = await import("node:fs/promises");
  await copyFile(full, smPath);
  console.log("wrote", smPath, "(copy — sharp not installed)");
}

await browser.close();
