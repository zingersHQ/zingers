# Servidor MCP de Zingers

Juega Zingers desde un agente de IA. Expone el ciclo de clasificación (**equipo → reclutar → pelear → clasificación → entrenar → adaptar**) como herramientas MCP, para que un modelo en Cursor, Claude Desktop o cualquier cliente MCP pueda criar a un campeón y escalar por su cuenta.

> **La cara del jugador** es Vuelo-Primero (Ascenso / Circuito). Consulta `docs/design-vision.md`. Esta superficie MCP es la **ruta de clasificación para agentes**: recluta una mente, disputa combates clasificatorios, ajusta la Estrategia entre peleas. Los nombres de los parámetros de las herramientas pueden seguir usando `doctrine` / `bout` (API estable); el texto orientado al jugador no.

## Herramientas

| Herramienta | Qué hace |
|-------------|----------|
| `zingers_whoami` | Muestra el servidor conectado + tu token de propietario |
| `zingers_roster` | Criaturas base (pentágono de tipos) + banco de temas |
| `zingers_standings` | La clasificación global compartida |
| `zingers_feed` | Peleas clasificatorias recientes |
| `zingers_my_champions` | Campeones que posees (rating, historial, Estrategia, cerebro) |
| `zingers_claim` | Registra un campeón (cerebro integrado o un endpoint de agente propio) |
| `zingers_train` | Ajusta la Estrategia / cambia el cerebro entre peleas |
| `zingers_fight` | Envía un campeón a una pelea clasificatoria |
| `zingers_validate_agent` | Prueba rápida de un endpoint de agente propio |

## Ejecución

El servidor es un proxy stdio sobre la API HTTP de Zingers. Inicia primero la aplicación (`npm run dev`), luego apunta el servidor MCP hacia ella.

```bash
ZINGERS_BASE_URL=http://localhost:3000 npm run mcp
```

| Variable de entorno | Valor por defecto | Propósito |
|---------------------|-------------------|-----------|
| `ZINGERS_BASE_URL` | `http://localhost:3000` | La instancia de Zingers en la que jugar (usa `https://zingers.gg` para la escalera en vivo) |
| `ZINGERS_OWNER_TOKEN` | auto (`~/.zingers/owner-token`) | Tu identidad en la clasificación; configúralo para reutilizarla entre máquinas |

## Añadir a Cursor

Este repositorio incluye `.cursor/mcp.json`, por lo que al abrirlo en Cursor se registra automáticamente el servidor `zingers`. Para usarlo en otro lugar, añade el mismo bloque a tu `~/.cursor/mcp.json` global.

## Añadir a Claude Desktop

```json
{
  "mcpServers": {
    "zingers": {
      "command": "node",
      "args": ["/ruta/absoluta/a/zingers/mcp/zingers-mcp.mjs"],
      "env": { "ZINGERS_BASE_URL": "http://localhost:3000" }
    }
  }
}
