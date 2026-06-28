// Database connectivity check — confirms the SHARED store (Upstash Redis / Vercel
// KV) is actually reachable, the gap that otherwise silently drops you onto the
// in-memory fallback in production. Pure Node, no deps:
//
//   node scripts/check-db.mjs
//
// Reads the same env the app does (KV_REST_API_URL/TOKEN or UPSTASH_REDIS_REST_*),
// falling back to .env.local / .env so it works locally without exporting vars.
// Pings the REST endpoint and round-trips a throwaway key so you know writes land.
import { readFileSync } from "node:fs";

function loadEnvFile(path) {
  try {
    const txt = readFileSync(path, "utf8");
    for (const line of txt.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m) continue;
      const key = m[1];
      let val = m[2].trim().replace(/^["']|["']$/g, "");
      if (val && process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    /* file may not exist — that's fine */
  }
}

for (const f of [".env.local", ".env", ".vercel/.env.production.local"]) loadEnvFile(f);

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  console.error("\n✗ No Redis credentials found.");
  console.error("  Set KV_REST_API_URL + KV_REST_API_TOKEN (or the UPSTASH_REDIS_REST_* pair).");
  console.error("  Production is running on the in-memory fallback until you do — data is NOT persisted.\n");
  process.exit(1);
}

const headers = { Authorization: `Bearer ${token}` };
const host = url.replace(/^https?:\/\//, "");

async function cmd(...parts) {
  const res = await fetch(`${url}/${parts.map(encodeURIComponent).join("/")}`, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`);
  return (await res.json()).result;
}

try {
  console.log(`\nChecking Redis at ${host} …`);
  const pong = await cmd("ping");
  if (String(pong).toUpperCase() !== "PONG") throw new Error(`unexpected ping reply: ${pong}`);
  console.log(`  ping → ${pong}`);

  const probe = `z:healthcheck:${Date.now()}`;
  await cmd("set", probe, "ok");
  const back = await cmd("get", probe);
  await cmd("del", probe);
  if (back !== "ok") throw new Error(`read-back mismatch: ${back}`);
  console.log("  write/read/delete round-trip → ok");

  const champs = await cmd("zcard", "z:ladder");
  const dbsize = await cmd("dbsize");
  console.log(`  ladder champions: ${champs ?? 0} · total keys: ${dbsize ?? 0}`);

  console.log("\n✓ Database is LIVE and writable. The shared world will persist.\n");
} catch (err) {
  console.error(`\n✗ Redis check FAILED: ${err.message}`);
  console.error("  Verify the URL/token and that the Upstash database is active.\n");
  process.exit(1);
}
