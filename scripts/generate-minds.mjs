#!/usr/bin/env node
// Offline draft generator for Stage 6 (docs/long-game.md).
// Writes content/minds/draft/*.json for human review — never auto-bakes.
//
// Usage:
//   npm run generate:minds -- --force COMPOSURE --count 2
//   XAI_API_KEY=… npm run generate:minds -- --force CREATIVITY
//
// Without XAI_API_KEY, emits a filled template (still needs hand polish).
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const draftDir = join(root, "content/minds/draft");

const args = process.argv.slice(2);
function flag(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const force = (flag("force", "COMPOSURE") || "COMPOSURE").toUpperCase();
const count = Math.max(1, Math.min(4, Number(flag("count", "1")) || 1));
const FORCES = ["LOGIC", "CHAOS", "COMPOSURE", "RHETORIC", "CREATIVITY"];
if (!FORCES.includes(force)) {
  console.error(`generate-minds: --force must be one of ${FORCES.join(", ")}`);
  process.exit(1);
}

const STAT = { LOGIC: "LOG", CHAOS: "CHA", COMPOSURE: "CMP", RHETORIC: "RHE", CREATIVITY: "CRE" }[force];

function template(n) {
  const key = `DRAFT_${force.slice(0, 3)}_${n}`;
  return {
    key,
    name: key,
    type: force,
    persona: `a PLACEHOLDER ${force.toLowerCase()} mind — rewrite the voice before review`,
    lineage: "echo of a First Mind — name the parent",
    stats: { LOG: 50, CMP: 50, RHE: 50, CRE: 50, CHA: 50, [STAT]: 88 },
    moves: [
      { id: `${key.toLowerCase()}_a`, name: "Move A", stat: STAT, base: 18 },
      { id: `${key.toLowerCase()}_b`, name: "Move B", stat: STAT, base: 14, self_guard: [8, 1] },
      { id: `${key.toLowerCase()}_c`, name: "Move C", stat: STAT, base: 16, apply: ["tilted", 1.0] },
      { id: `${key.toLowerCase()}_d`, name: "Move D", stat: STAT, base: 26, finisher: true },
    ],
    beats: {
      wake: "PLACEHOLDER wake — one line in their voice.",
      imprintAsk: "PLACEHOLDER imprint ask before climb.",
      flightReact: ["PLACEHOLDER react", "PLACEHOLDER triumph"],
      greeting: { train: "…", return: "…", arena: "…" },
      homecoming: { away: "…", hot: "…", cold: "…" },
      afterFight: { win: "{opp} fell.", loss: "{opp} got us." },
      imprintAck: "Kept.",
      rankedFinale: "Ranked win.",
    },
    banter: {},
    firstDuel: { hook: "PLACEHOLDER one-line hook.", originAxis: "control" },
  };
}

async function llmDraft(n) {
  const key = process.env.XAI_API_KEY;
  if (!key) return null;
  const prompt = `You write Zingers minds for a creature-collector fighting game.
Force=${force}. Emit ONE JSON object matching MindDraft:
key (UPPERCASE word, 3-8 letters, not DRAFT_*), name=key, type, persona (lowercase clause),
stats (LOG/CMP/RHE/CRE/CHA 0-100, primary ~86-90), exactly 4 moves with unique snake_case ids,
beats (wake, imprintAsk, flightReact[2], greeting, homecoming, afterFight with {opp} placeholder,
imprintAck, rankedFinale), banter map moveId→3 punchy lines with {opp}/{topic}.
Voice must differ from Bastion/Muse/Axiom/Vox/Glitch/Ember/Paradox/Wit.
JSON only, no markdown.`;

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.XAI_MODEL || "grok-4-1-fast-non-reasoning",
      temperature: 0.9,
      messages: [
        { role: "system", content: "Return only valid JSON." },
        { role: "user", content: prompt + ` Seed ${n}.` },
      ],
    }),
  });
  if (!res.ok) {
    console.warn(`generate-minds: LLM ${res.status} — falling back to template`);
    return null;
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim() ?? "";
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

mkdirSync(draftDir, { recursive: true });
const written = [];
for (let i = 1; i <= count; i++) {
  let mind = await llmDraft(i);
  if (!mind) {
    mind = template(i);
    // fill banter stubs from moves
    for (const mv of mind.moves) {
      mind.banter[mv.id] = [
        `Placeholder bar 1 vs {opp} about {topic}.`,
        `Placeholder bar 2, {opp}.`,
        `Placeholder bar 3 on {topic}.`,
      ];
    }
  }
  // Ensure banter keys exist
  for (const mv of mind.moves || []) {
    if (!mind.banter?.[mv.id]) {
      mind.banter = mind.banter || {};
      mind.banter[mv.id] = ["…", "…", "…"];
    }
  }
  const file = join(draftDir, `${mind.key || `DRAFT_${i}`}.json`);
  writeFileSync(file, JSON.stringify(mind, null, 2) + "\n");
  written.push(file);
}

console.log("generate-minds: wrote drafts (REVIEW before moving to reviewed/):");
for (const f of written) console.log(`  ${f}`);
console.log("Then: mv content/minds/draft/KEY.json content/minds/reviewed/ && npm run bake:minds");
