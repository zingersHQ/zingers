# ZINGERS: Ficha técnica

**zingers.gg** · **@zingersHQ** · **zingers.org** (tecnología y documentación)

### El LLM es el actor. El motor es el juego.

Una sola aplicación Next.js tipada. Un único runtime, sin backend separado que mantener. Ejecuta un mundo 3D en el que **vuelas**, transmite combates de debate IA-vs-IA en directo y evoluciona campeones a partir de su historial real de combates (y de lo alto que hayas escalado).

---

## Principio fundamental

El combate es por turnos con movimientos explícitos y **resolución basada en estadísticas**: estadísticas, tipos, entrenamiento, estados y varianza aleatoria deciden el daño. La calidad del ingenio es un multiplicador acotado (≈0,7–1,3; 1,4 en un Highlight). Por defecto, un **juez local**; activa `ZINGERS_LLM_JUDGE=1` para un juez LLM. Ninguna de las dos rutas puede decidir un combate por sí sola. Esto mantiene los combates justos, reproducibles y económicos.  
*(`docs/game-spec.md`, `docs/combat-design.md`.)*

## Stack

Next.js 16 (App Router) · React 19 · **TypeScript** end-to-end · **React Three Fiber** (con Drei, física Rapier y postprocesado) para los 3D Grounds · estado **Zustand** · espejo de servidor **Upstash Redis** · **Server-Sent Events** para combates en vivo · **xAI (Grok)** como cerebro integrado. Desplegado en Vercel (`zingers.gg` host del juego, `zingers.org` host de documentación), con un cron `/api/cron` cada 6 horas.

---

## Arquitectura. Un mundo, un servidor ligero

- **The Ascent es la cara.** El Mobile Climb (`/m`) y el Circuit de escritorio comparten el mismo cielo de 100 sectores (diez Reaches). El Entrenador vuela con un jetpack; el campeón compañero de ala lo sigue sin uno. Tableros, vidas, aperturas de sectores. Consulta `docs/climb.md`, `docs/bible/10-ascent.md`.
- **Los 3D Grounds son la superficie profunda:** volar, subir, perseguir objetivos, entrar en venues. Los cuerpos cambian en vivo según la carrera mediante una función determinista de apariencia (`lib/evolve/appearance.ts`). Rendimiento: amortiguación exponencial (independiente de la tasa de fotogramas), props GLTF instanciados, vestimenta de escena con `React.memo`, texturas en caché por paleta, niveles de DPR/calidad y “jugo” (sacudidas, empujes de FOV, estallidos) condicionado a `prefers-reduced-motion`. El móvil mantiene exactamente **un** canvas WebGL.
- **Las batallas se transmiten por SSE** (`/api/battle`, más `/api/sim` sin interfaz). Cada turno lleva el movimiento, el daño resuelto, una línea en personaje, un `why` en español llano y (cuando las herramientas están activas) un `trace[]` de los pasos del agente. La ruta por defecto es **una decisión LLM por turno** + juez local. Rápida y barata. El cliente renderiza con “saltar al veredicto” y una vista “Estudio” opcional del trazo.
- **La música es 100 % procedural Web Audio** (`lib/ambience-scores.ts` + `lib/ambience.ts`): temas distintos por lugar con formas de frase; intensidad, ducking y florituras a través de `lib/ambience-bus.ts`. Sin archivos de audio.
- **La liga asíncrona es la mecánica principal:** los campeones son IA, por lo que el PvP no necesita **a nadie conectado**. La liga ejecuta combates de forma autónoma (Galería en Vivo del Amphitheatre); tú ves repeticiones y subes en un tablero de calificación objetivo (`/standings`).
- **El estado es cliente-primero y se sincroniza.** Las carreras viven en `localStorage` y se reflejan en Redis mediante `/api/save`. El **ledger de carrera** (`CareerEvent[]` + `AxisSnapshot[]` en `PlayerSave`) es un registro puro-aditivo, limitado y solo-anexar de cada momento real. Combate, subida de nivel, subida de tier, entrenamiento, grieta de Keeper, cambio de temporada, primera reclamación. En `store/champions.ts`.
- **El roster de colección se une en el servidor.** Las claves de mentes reclutadas viven en un set Redis (`z:roster:{token}`). El reclutamiento de pago es `POST /api/wallet` con `{ type: "recruit", key }` (Crowns + membresía de un golpe). `/api/save` fusiona el roster en lectura/escritura para que last-write-wins no borre una leyenda. Restaurar entre dispositivos sigue necesitando el mismo código de Entrenador o wallet Solana vinculada.
- **Identidad del Entrenador.** Los nombres únicos pueden vincularse a una wallet Solana opcional (solo prueba de propiedad. Sin gasto). Los tableros de oficio Circuit/Climb resuelven etiquetas en el servidor; los envíos ranked exigen ticket de despegue y comprobaciones de reloj/velocidad. Las Coronas pagan plusmarcas personales bajo el tope diario, nunca la posición en el tablero.
- **~25 rutas API** (`app/api/*`) cubren batalla, simulación, reclamación, roster, clasificación, diario, guardianes (Keepers), impronta, feed, guerra, guardado, wallet, enlace-solana, imágenes OG de cartas y un medidor `/api/cost`.

## La capa de agentes enchufable

Cada campeón responde a un solo contrato. `act(view) → decision`. Cualquier cerebro puede pilotar uno. **Por defecto:** decisión JSON de un solo disparo. **Opt-in** (`ZINGERS_AGENT_TOOLS=1`): un bucle acotado **razón → actúa → observa → confirma** sobre herramientas de motor de solo-lectura (`simulate_move`, `scout_opponent`, `commit_move`), limitado a 3 pasos y transmitido como `ToolStep`s. Proveedores: Grok integrado, cualquier modelo compatible con OpenAI, un webhook HTTP o un mock (sin conexión). *(`docs/agent-protocol.md`.)*

## Controles de coste y seguridad

El gasto de LLM se mide (`lib/server/cost.ts`), se limita por IP (`lib/server/rate-limit.ts`) y se controla con presupuestos diarios (`LLM_DAILY_BUDGET_USD`). Las nuevas funciones de modelo siempre se envían **primero con plantilla**: se ejecuta un fallback determinista cuando no hay clave, se alcanza el límite diario por propietario o se agota el presupuesto. Así **el bucle diario nunca se bloquea por un modelo.** Las rutas clasificadas rechazan sesgo mock/seed; las ganancias de wallet están limitadas a reclamación.

## El determinismo como característica

Los combates usan RNG con semilla (`lib/engine/xai.ts:makeRng`), por lo que cualquier combate es reproducible y demostrablemente justo. Ese invariante es también el requisito previo para un futuro cierre de temporada on-chain (véase el one-pager de IA y cripto). Las claves de analítica/evento pueden seguir usando `bout` internamente. El texto que ve el jugador nunca lo hace (`docs/vocabulary.md`).

---

## Documentación pública (este sitio)

`zingers.org` es una vista navegable del Markdown en `docs/`. El registro de documentación (`lib/org/registry.ts`) mapea cada página a un archivo fuente; la ruta `/org/[[.slug]]` genera estáticamente cada entrada y la renderiza a través de un shell compartido. Añadir una página es solo un archivo Markdown más una línea en el registro, nada más.
