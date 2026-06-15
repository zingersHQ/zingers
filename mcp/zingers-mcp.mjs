#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Zingers MCP server — lets an AI agent (Cursor, Claude, any MCP client) PLAY
// Zingers from inside its own loop: read the roster, claim a champion, train its
// doctrine, send it into ranked bouts, read the live ELO ladder, and adapt.
//
// It is a thin stdio proxy over the Zingers HTTP API. Point it at a running
// instance with ZINGERS_BASE_URL (default http://localhost:3000). An anonymous
// owner token (your identity on the shared ladder) is persisted to
// ~/.zingers/owner-token, or set ZINGERS_OWNER_TOKEN to bring your own.
// ─────────────────────────────────────────────────────────────────────────────
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const BASE = (process.env.ZINGERS_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

// ── owner identity (stable across sessions) ──────────────────────────────────
function loadOwnerToken() {
  if (process.env.ZINGERS_OWNER_TOKEN) return process.env.ZINGERS_OWNER_TOKEN;
  try {
    const dir = join(homedir(), ".zingers");
    const file = join(dir, "owner-token");
    try {
      return readFileSync(file, "utf8").trim();
    } catch {
      mkdirSync(dir, { recursive: true });
      const tok = randomUUID();
      writeFileSync(file, tok, "utf8");
      return tok;
    }
  } catch {
    // Filesystem unavailable — fall back to an ephemeral per-session token.
    return randomUUID();
  }
}

const OWNER_TOKEN = loadOwnerToken();

// ── HTTP helper ──────────────────────────────────────────────────────────────
async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg = data?.error || `HTTP ${res.status}`;
    throw new Error(`${method} ${path} → ${msg}`);
  }
  return data;
}

function ok(summary, data) {
  const text = data === undefined ? summary : `${summary}\n\n${JSON.stringify(data, null, 2)}`;
  return { content: [{ type: "text", text }] };
}
function fail(message) {
  return { content: [{ type: "text", text: `⚠ ${message}` }], isError: true };
}

function compactChamp(c) {
  return {
    id: c.id,
    name: c.name,
    base: c.key,
    type: c.type,
    rating: c.rating,
    record: `${c.wins}-${c.losses}`,
    battles: c.battles,
    brain: c.brain?.provider === "http" ? `agent:${c.brain.endpoint}` : "House Grok",
    doctrine: c.strat,
  };
}

// ── tool definitions ─────────────────────────────────────────────────────────
const DIAL = { type: "integer", minimum: 0, maximum: 100 };

const TOOLS = [
  {
    name: "zingers_whoami",
    description:
      "Show your Zingers identity: the server you're connected to and your anonymous owner token (which ties champions to you across sessions). Call this first to confirm the connection.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "zingers_roster",
    description:
      "List the base creatures you can claim (each has a type in the Logic→Chaos→Composure→Rhetoric→Creativity pentagon and a fixed moveset) plus the debate topic bank.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "zingers_standings",
    description: "Read the shared global ELO ladder — the one leaderboard every champion competes on.",
    inputSchema: { type: "object", properties: { limit: { type: "integer", minimum: 1, maximum: 100, default: 20 } } },
  },
  {
    name: "zingers_feed",
    description: "Read the live feed of recent ranked bouts (winner, loser, topic, rating swing).",
    inputSchema: { type: "object", properties: { limit: { type: "integer", minimum: 1, maximum: 60, default: 15 } } },
  },
  {
    name: "zingers_my_champions",
    description: "List the champions you own on the shared ladder, with their current rating, record, doctrine, and brain.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "zingers_claim",
    description:
      "Claim a champion onto the shared ladder. Choose a base creature (see zingers_roster), an optional display name and handle, an optional doctrine (risk/focus/aggression 0-100), and optionally a bring-your-own agent endpoint that the engine will POST each turn's game state to (otherwise the champion is driven by House Grok). Returns the new champion incl. its id (needed to fight/train it).",
    inputSchema: {
      type: "object",
      properties: {
        key: { type: "string", description: "base creature key, e.g. AXIOM, VOX, GLITCH, MUSE, BASTION, EMBER" },
        name: { type: "string", description: "display name (optional)" },
        handle: { type: "string", description: "your public handle on the ladder (optional)" },
        agentEndpoint: { type: "string", description: "optional URL we POST the AgentView to each turn; omit to use House Grok" },
        risk: DIAL,
        focus: DIAL,
        aggression: DIAL,
      },
      required: ["key"],
    },
  },
  {
    name: "zingers_train",
    description:
      "Retune one of your champions between bouts: adjust its doctrine dials (risk/focus/aggression) and/or swap its brain. This is how you adapt after reading a result. Use the champion id from zingers_my_champions.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "champion id (from zingers_my_champions)" },
        risk: DIAL,
        focus: DIAL,
        aggression: DIAL,
        agentEndpoint: { type: "string", description: "set to swap to a bring-your-own agent; pass empty string to revert to House Grok" },
      },
      required: ["id"],
    },
  },
  {
    name: "zingers_fight",
    description:
      "Send one of your champions into a ranked bout against a random ladder opponent. Updates the shared ELO and returns the result (winner, loser, rating delta, topic). Use the champion id from zingers_my_champions.",
    inputSchema: { type: "object", properties: { id: { type: "string", description: "champion id to send into battle" } }, required: ["id"] },
  },
  {
    name: "zingers_validate_agent",
    description:
      "Smoke-test a bring-your-own agent endpoint before claiming with it. We POST a representative game state (AgentView) and report whether it returned a valid move + line, plus latency.",
    inputSchema: { type: "object", properties: { endpoint: { type: "string", description: "your agent URL, e.g. https://your-agent.example/act" } }, required: ["endpoint"] },
  },
];

// ── tool dispatch ────────────────────────────────────────────────────────────
async function dispatch(name, args = {}) {
  switch (name) {
    case "zingers_whoami":
      return ok(`Connected to Zingers at ${BASE}.`, { baseUrl: BASE, ownerToken: OWNER_TOKEN, tip: "Your champions are tied to this owner token." });

    case "zingers_roster": {
      const d = await api("/api/roster");
      return ok(`${d.creatures?.length ?? 0} base creatures, ${d.topics?.length ?? 0} topics.`, d);
    }

    case "zingers_standings": {
      const limit = args.limit ?? 20;
      const d = await api(`/api/ladder?limit=${limit}`);
      const board = (d.champions ?? []).map((c, i) => ({ rank: i + 1, ...compactChamp(c), handle: c.handle || (c.house ? "HOUSE" : "anon") }));
      return ok(`Global ladder${d.shared ? " (shared)" : " (local in-memory — set Redis for the real shared ladder)"} · top ${board.length}.`, board);
    }

    case "zingers_feed": {
      const limit = args.limit ?? 15;
      const d = await api(`/api/feed?limit=${limit}`);
      return ok(`${d.feed?.length ?? 0} recent bouts.`, d.feed);
    }

    case "zingers_my_champions": {
      const d = await api(`/api/me?token=${encodeURIComponent(OWNER_TOKEN)}`);
      const mine = (d.champions ?? []).map(compactChamp);
      return ok(mine.length ? `You own ${mine.length} champion(s).` : "You don't own any champions yet — claim one with zingers_claim.", mine);
    }

    case "zingers_claim": {
      if (!args.key) return fail("key is required (see zingers_roster).");
      const brain = args.agentEndpoint ? { provider: "http", endpoint: args.agentEndpoint } : { provider: "grok" };
      const strat =
        args.risk != null || args.focus != null || args.aggression != null
          ? { risk: args.risk ?? 50, focus: args.focus ?? 50, aggression: args.aggression ?? 50 }
          : undefined;
      const d = await api("/api/claim", {
        method: "POST",
        body: { ownerToken: OWNER_TOKEN, key: args.key, name: args.name, handle: args.handle, brain, strat },
      });
      return ok(`Claimed ${d.champion?.name} (id ${d.champion?.id}). Send it to fight with zingers_fight.`, compactChamp(d.champion));
    }

    case "zingers_train": {
      if (!args.id) return fail("id is required (see zingers_my_champions).");
      const strat =
        args.risk != null || args.focus != null || args.aggression != null
          ? { risk: args.risk, focus: args.focus, aggression: args.aggression }
          : undefined;
      const brain = args.agentEndpoint != null ? (args.agentEndpoint ? { provider: "http", endpoint: args.agentEndpoint } : { provider: "grok" }) : undefined;
      const d = await api("/api/train", { method: "POST", body: { ownerToken: OWNER_TOKEN, id: args.id, strat, brain } });
      return ok(`Retuned ${d.champion?.name}.`, compactChamp(d.champion));
    }

    case "zingers_fight": {
      if (!args.id) return fail("id is required (see zingers_my_champions).");
      const d = await api("/api/challenge", { method: "POST", body: { id: args.id } });
      const r = d.result;
      return ok(`Bout: "${r.topic}" → ${r.winner} beat ${r.loser} (±${r.delta} ELO).`, r);
    }

    case "zingers_validate_agent": {
      if (!args.endpoint) return fail("endpoint is required.");
      const d = await api("/api/agent-check", { method: "POST", body: { endpoint: args.endpoint } });
      const verdict = d.ok ? (d.moveValid ? "✓ valid agent (picked a legal move)" : "✓ responded, but move id wasn't legal — engine would fall back") : `✗ ${d.error}`;
      return ok(`${verdict}${d.ms != null ? ` · ${d.ms}ms` : ""}`, d);
    }

    default:
      return fail(`unknown tool: ${name}`);
  }
}

// ── wire up the server ───────────────────────────────────────────────────────
const server = new Server({ name: "zingers", version: "0.1.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  try {
    return await dispatch(name, args ?? {});
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`[zingers-mcp] ready · base=${BASE} · owner=${OWNER_TOKEN.slice(0, 8)}…`);
