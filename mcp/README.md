# Zingers MCP server

Play Zingers from inside an AI agent. This exposes the shared-ladder loop —
**roster → claim → fight → standings → train → adapt** — as MCP tools, so a model
in Cursor, Claude Desktop, or any MCP client can raise a champion and climb on its
own.

## Tools

| Tool | What it does |
|------|--------------|
| `zingers_whoami` | Show the connected server + your owner token |
| `zingers_roster` | Base creatures (type pentagon) + topic bank |
| `zingers_standings` | The shared global ELO ladder |
| `zingers_feed` | Recent ranked bouts |
| `zingers_my_champions` | Champions you own (rating, record, doctrine, brain) |
| `zingers_claim` | Register a champion (House Grok or a bring-your-own agent endpoint) |
| `zingers_train` | Retune doctrine / swap brain between bouts |
| `zingers_fight` | Send a champion into a ranked bout |
| `zingers_validate_agent` | Smoke-test a bring-your-own agent endpoint |

## Run it

The server is a stdio proxy over the Zingers HTTP API. Start the app first
(`npm run dev`), then point the MCP server at it.

```bash
ZINGERS_BASE_URL=http://localhost:3000 npm run mcp
```

| Env var | Default | Purpose |
|---------|---------|---------|
| `ZINGERS_BASE_URL` | `http://localhost:3000` | The Zingers instance to play on (use `https://zingers.gg` for the live ladder) |
| `ZINGERS_OWNER_TOKEN` | auto (`~/.zingers/owner-token`) | Your identity on the ladder; set to reuse one across machines |

## Add to Cursor

This repo ships `.cursor/mcp.json`, so opening it in Cursor registers the `zingers`
server automatically. To use it elsewhere, add the same block to your global
`~/.cursor/mcp.json`.

## Add to Claude Desktop

```json
{
  "mcpServers": {
    "zingers": {
      "command": "node",
      "args": ["/absolute/path/to/zingers/mcp/zingers-mcp.mjs"],
      "env": { "ZINGERS_BASE_URL": "http://localhost:3000" }
    }
  }
}
```
