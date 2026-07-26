# ZINGERS: IA y cripto en una página

**zingers.gg** · **@zingersHQ** · **zingers.org** (tecnología y documentación)

### Criaturas pensantes primero. Leyendas coleccionables debajo.

Zingers comienza con un juego real de IA. Criaturas que realmente piensan. Y mantiene cualquier capa de propiedad como optativa, aislada y anclada a utilidades. Dos capas, estrictamente separadas. Hoy una billetera es opcional y solo sirve como **identidad de Entrenador**; el lanzamiento del token se aplaza deliberadamente. *(`docs/flight-first-plan.md`, `docs/zing-model.md`.)*

---

## La capa de IA (el producto)

**Agentes enchufables.** El motor hace una pregunta por turno. *dado este estado y estos movimientos legales, ¿qué haces?* Cualquier cerebro que implemente `act(view) → decision` puede controlar un campeón. *(`docs/agent-protocol.md`.)*

- **Proveedores:** el cerebro **Grok** integrado (xAI), cualquier modelo **compatible con OpenAI** (`baseUrl` / `model` / clave), un **webhook HTTP** (POST un `AgentView`, devuelve un `AgentDecision`), o un **mock** para jugar sin conexión. Si cualquiera de los dos lados trae su propio agente, una pelea se ejecuta de forma *real* incluso sin clave de casa.
- **Ruta predeterminada (rápida).** Decisión JSON de un solo disparo + **juez local**. Turnos ágiles, bajo costo. Optativo: `ZINGERS_AGENT_TOOLS=1` habilita un bucle acotado razón → actuar → observar → confirmar (`simulate_move`, `scout_opponent`, `commit_move`, máximo 3 pasos); `ZINGERS_LLM_JUDGE=1` intercambia un evaluador de ingenio LLM (aún un multiplicador acotado. Nunca decide el resultado solo).
- **Memoria persistente y deriva.** Cada campeón lleva notas de memoria más diales de **estrategia / temperamento** (agresión, enfoque, riesgo). Los sembras al adoptar; después la interfaz solo los muestra. Las **Improntas** (una llamada de modelo acotada con una plantilla determinista de respaldo) permiten al Entrenador enseñar lecciones que escriben memoria y modifican la personalidad con el tiempo; las peleas mueven los mismos diales.
- **Magia curada, profundidad emergente.** La experiencia predeterminada es autoría (paquetes de voz, beats de personaje, respaldos deterministas) para que siempre se sienta viva; los modelos reales añaden emergencia encima, nunca como dependencia obligatoria.

---

## La capa cripto (optativa, debajo)

**Regla cardinal:** el juego es **gratuito y completo** sin billetera. Puedes criar leyendas, escalar temporadas y abrir la Bóveda sin haberla visto nunca. Cripto es una capa *debajo* del juego, nunca una puerta delante. *(`docs/bible/08-economy.md`, `docs/zing-model.md`.)*

**Entregado hoy:** enlace opcional de billetera Solana (estilo Phantom SIWS de prueba de propiedad) para conservar un **nombre de Entrenador** único entre dispositivos. Sin aprobaciones de gasto. Sin interfaz de token.

**Alcance honesto (2026-07):** la primera conexión vincula **nombre ↔ pubkey ↔ ownerToken** (la clave de carrera del dispositivo). Reconectar en un nuevo dispositivo devuelve ese `ownerToken` canónico para que campeones, Coronas y `/api/save` se restauran tras recargar. Aún sin `$ZING`. El código de recuperación sigue siendo respaldo si se pierde la billetera.

**Nomenclatura:** las Coronas del juego viven en `/api/wallet` (fuera de cadena). Solana es `solana-link` / “Conectar”. Nunca llames a las Coronas una billetera de cadena en la copia del jugador.

### Dos economías, nunca conectadas

| | **Coronas** | **$ZING** (nombre provisional) |
|---|---|---|
| Naturaleza | Suave, dentro del juego, autoritativa del servidor | Dura, en cadena (SPL / Solana). *no lanzada* |
| Cómo la obtienes | *Ganada* jugando | *Comprada* en un mercado, o airdrop por jugar (futuro) |
| Para qué sirve | Entrenamiento, entradas, respaldo, reforgias cosméticas | Entrada a clasificaciones en cadena, acuñar cartas, estatus de patrón (futuro) |
| ¿Se cobra? | **Nunca** | Solo en el mercado abierto, nunca *a través de nosotros* |

El muro entre ellas. Sin conversión, sin billetera compartida. Es el invariante más importante. Es lo que mantiene a Zingers *no* siendo un valor y *no* siendo un casino.

### Qué hace el token. Y solo esto (futuro)

1. **Paga entrada optativa a la tabla en cadena** mediante **quemar-o-apostar**. Quemar es una pequeña tarifa de acceso consumida (deflación pura); apostar es un depósito mayor, **reintegrable al 100 %** que devuelve solo el principal. La apuesta persiste entre temporadas, así que los jugadores leales bloquean capital y juegan gratis para siempre. **Sin rendimiento, nunca.**
2. **Acuña permanencia**. Quema para inmortalizar un campeón como carta en cadena. El arte es determinista a partir del registro de carrera, así que **el token *es* el historial.** Rellena campos de procedencia que ya existen inertes (`mintId`, `owner`, `chain`, `mintedSeason`). Un relleno, no una refactorización.
3. **Confiere estatus**. Crestas de patrón por respaldar un campeón, procedencia DEX y peso de airdrop de la siguiente temporada ganado por jugar.

### Barreras de seguridad (el sobre seguro para indies)

Sin rendimiento / sin APY / sin bote; **quemar es una tarifa, no una apuesta**; todas las recompensas son cosméticas, de estatus o de asignación (nunca efectivo ni pagos escalados por rendimiento); sin marketing de precio; **las Coronas nunca se cobran**. El cierre de temporada en cadena solo funciona *porque* las peleas son deterministas y demostrablemente justas.

---

## Posicionamiento y secuencia

Lidera con “las criaturas realmente piensan” y “tú vuelas”, amigable para memes en distribución pero anclado a utilidades para que el mensaje nunca oscile entre protocolo de agentes y casino. Lanza con **solo Coronas**; billetera = identidad; **$ZING** se *anuncia en la documentación*, no se requiere en el producto. **El token sigue a la tracción, no al revés.**
