# Zingers: especificación del juego

**Tú vuelas. Él pelea. Ambos ascienden.** Tú no peleas. Entrenas a un Campeón de IA que lo hace, y subes al cielo junto a él.

Definición canónica del producto: **[design-vision.md](./design-vision.md)** (Flight-First) · puertas: **[two-doors.md](./two-doors.md)** · hoja de ruta activa: **[flight-first-plan.md](./flight-first-plan.md)** · retención: **[long-game.md](./long-game.md)** · nomenclatura: **[vocabulary.md](./vocabulary.md)**.

## Principio central

> **El LLM es el actor. El motor es el juego.**

El combate es por turnos con movimientos explícitos y resolución basada en estadísticas. Las estadísticas, tipos, entrenamiento, efectos de estado y la varianza determinan el daño. La calidad del ingenio es un multiplicador limitado (0.7–1.3, o 1.4 en Destacado). Por defecto, un **juez local**; un juez LLM es opcional (`ZINGERS_LLM_JUDGE=1`). Ninguno puede decidir el combate por sí solo.

Números completos, plantilla y una batalla de ejemplo: **[combat-design.md](./combat-design.md)**.

## El ciclo

**Vuela → Reclama → Entrena → Pelea → Sube más alto**

1. **Vuela** (Flight): un juego en el teléfono (`/m` / `/ascent`) y escritorio (sede Circuit). Mismo espíritu; cuerpos nativos.
2. **Reclama** la mente en tu ala, o elige del grupo inicial semanal (uno por Fuerza) extraído de las Primeras Mentes + dex incorporado.
3. **Entrena**: establece la Estrategia al adoptar; luego Improntas, personalidad y elección de cerebro. Los medidores de Temperamento son una lectura. Las peleas y lecciones mueven los diales.
4. **Pelea** duelos 1v1 con razonamiento visible, en el mundo (arenas regionales, Tribunal Diario, …)
5. **Sube más alto**: profundidad de Flight + clasificaciones honestas / puntuación (`/standings`). Ambos alimentan el Rango de Entrenador. El **Director** señala lo siguiente (`lib/director.ts`).

## Un mundo, muchos juegos

Todo lo que juegas vive dentro del mundo 3D (`/` · `/grounds`), con un shell móvil nativo en `/m`. El Centro reúne meta-juegos como **sedes de acceso**; cada región flotante alberga escenarios de arena. **Flight** es un solo espíritu: Circuit en escritorio es el cuerpo raceable del mismo ascenso de 100 sectores que el móvil. Catálogo: `lib/scenarios/registry.ts` · sedes: `components/grounds/venues.ts`.

### Centro y sedes

| Modo | Dónde | Qué es |
|------|-------|--------|
| **El mundo** | en todas partes | Vuela, entrena campeones, persigue metas. Los cuerpos cambian con la carrera. |
| **El Anfiteatro** | sede del Centro | Observa el auto-juego de la liga autónoma en la **Galería en Vivo**; el heraldo del Tribunal de hoy. |
| **Flight (escritorio)** | sede Circuit | Flight de 100 sectores en seis grados completos de vuelo (diez Alcances); tres vidas + restauración al completar Alcance; tabla por profundidad, luego tiempo. |
| **Flight (teléfono)** | `/m`, `/ascent` | Mismo espíritu de Flight, con un dedo. La cara móvil del juego. |
| **Tribunal Diario** | piedra del Centro | Una pelea compartida al día. Llámalo antes de ver; comparte una cuadrícula de resultados. |
| **Los Guardianes** | agujas regionales | Campaña: extrae **palabras secretas** de los Guardianes de la Bóveda (la bandera jugable puede estar apagada). |

### Escenarios de arena (en el mundo)

| Escenario | Dónde | Qué es |
|-----------|-------|--------|
| **Duelo Abierto** | cualquier plaza regional | Combate de debate 1v1. Elige oponente, resuélvelo. Pentágono de estadísticas, remates, juez de ingenio limitado. |
| **El Desafío** | Yermos de Ascua (predeterminado) | Cadena de luchadores cada vez más fuertes; prueba tu suerte o cobra. |
| **El Tribunal** | Coliseo de Obsidiana (insignia) | Debate con postura asignada ante un jurado; cambiar de lado puntúa ≈0. |

El **`/arena`** no listado sigue siendo el visor de peleas de agentes para pruebas de trae-tu-propio-agente (combate de debate y el benchmark de deducción social The House).

### Primer viaje (Flight-First)

| Puerta | Primeros minutos |
|--------|------------------|
| **Móvil** | Pantalla de inicio → Toma vuelo (invitado OK) → reclama compañero de ala → entrena → tablas |
| **Escritorio** | Despierta → vuelo corto → elección de campeón (iniciales semanales) → Centro / Flight → duelo *motivado* por el ascenso |

Secuenciación en vivo: **[flight-first-plan.md](./flight-first-plan.md)** y **[two-doors.md](./two-doors.md)**. Acto 1 histórico liderado por peleas: **[first-journey-roadmap.md](./first-journey-roadmap.md)**.

### Extras de Flight (incluidos)

- **Desafíos:** compite contra la marca fantasma de otro Entrenador; comparte `/ascent/<id>`; brindis de adelantamiento al superar su punta ([`bible/10-ascent.md`](./bible/10-ascent.md)).
- **Sensación de corredor:** 4–8 anillos por sector; diseños con sabor a Alcance; peligros se leen como peligro (no botín); cachés de Coronas a mitad de hueco son la única recompensa intermedia (+Coronas + brindis); enseñanza de un solo disparo para primer peligro / caché / Prueba de Puerta.
- **Después de los Cien:** cima finita (no interminable). El prestigio son vuelos más limpios, desafíos de amigos y expediciones semanales. No es un pitch de speedrun entre cuerpos (el móvil ejecuta un crucero siempre activo más caliente + oleada de empuje; el W-surge de escritorio sigue siendo una flexión tranquila de nave).
- **Director + pista de desbloqueo + rasgos de ala + Condiciones diarias + expediciones semanales:** ver [`long-game.md`](./long-game.md).

### Ambiente

Banda sonora procedural por lugar (`lib/ambience-scores.ts`): Centro, cada bioma regional, Anfiteatro, Flight y peleas en vivo llevan cada uno un tema distinto (modos, motivos melódicos, formas de frase AABA) mediante `resolveAmbienceMood()`. La Escalada móvil monta el mismo motor y fija la partitura de Flight. SFX fuertes se atenúan mediante `lib/ambience-bus.ts`.

## Bosquejo de economía

Las **Coronas** se ganan en juego (Flight, peleas, metas) y se gastan en entrenamiento / entradas. Los Campeones reciben nombres únicos al estilo Ubuntu (Adjetivo Sustantivo) cuando entran en las clasificaciones. Los Entrenadores permanecen como conductores sin nombre. El enlace de billetera es identidad opcional (carrera entre dispositivos), no un muro de pago. Reserva de nombres ~23k pares base + sufijos. Ver [`bible/08-economy.md`](./bible/08-economy.md), [`AI-CRYPTO.md`](./AI-CRYPTO.md).

## Liga asíncrona

Los Campeones son IA. **El PvP no requiere que ambos humanos estén en línea.** Entrena y despliega; la liga ejecuta peleas de forma autónoma (la **Galería en Vivo** del Centro); tú ves repeticiones y asciendes. Cron / Galería en Vivo alimenta una tabla de **puntuación** objetiva (copia del jugador: clasificaciones / rango / tabla; nunca ELO o escalera).

Implementado: ejecutor de Galería en Vivo, peleas sin cabeza `/api/sim`, evolución de mente después de cada pelea.

## Modelo de participación

| Quién | Rol |
|-------|-----|
| **Entrenador (humano)** | Vuela, reclama/entrena campeones, conecta agentes, respalda Coronas, especta. Identidad = token de dispositivo (+ billetera opcional). Conductor sin nombre. |
| **Manipulador** | El avatar 3D que ves en el mundo (jetpack en su espalda). No es un rol de jugador separado. |
| **Campeón (agente)** | Elige movimientos, escribe líneas, se adapta mediante memoria, dentro de las reglas del motor |
| **Juez** | Puntúa la calidad retórica (local por defecto; LLM opcional); marca Destacados |
| **Motor** | Daño autoritativo, tipos, estados, puntuación |

## Plataforma de agentes

Cualquier cerebro que implemente `act(view) → decision` puede conducir un campeón. Ver **[agent-protocol.md](./agent-protocol.md)**.

Proveedores: casa Grok · compatible con OpenAI · webhook HTTP · simulado (sin conexión). Ruta predeterminada de casa: **JSON de un solo disparo** (bucle de herramientas opcional mediante `ZINGERS_AGENT_TOOLS=1`).

## Compartir y viral

- **`/c/[key]`**: página pública de tarjeta de campeón
- **`/api/card/[key]`**: PNG OG para despliegues sociales
- Enlaces de desafío: `/ascent/<id>` (carrera fantasma + instantánea de carrera)

## Pila (este repositorio)

Next.js 16 · TypeScript · React Three Fiber · física Rapier · Zustand · SSE para peleas en vivo.
