# Hoja de ruta del Primer Viaje

> **HISTÓRICA (Acto 1 centrado en peleas).** La puerta del producto en vivo es **Primero Vuelo** —
> consulta [`flight-first-plan.md`](./flight-first-plan.md), [`two-doors.md`](./two-doors.md),
> [`design-vision.md`](./design-vision.md) v3.0 y [`flyover.md`](./flyover.md).
> Canon: [`docs/bible/10-ascent.md`](./bible/10-ascent.md).
>
> **Primeros minutos en vivo:** móvil = Despegar → Ascender → reclutar compañero alado; escritorio =
> vuelo corto → selección de campeón → Terrenos / Circuito. No consideres el flujo centrado en peleas
> que aparece a continuación como el onboarding actual.

Notas de producción de la pasada del Acto 1 (conservadas como referencia / arqueología).

## Flujo del Acto 1 (pasada anterior: reemplazada)

```
PrimeraEjecución (cinemática) → Primer Duelo: Adoptar (5 Fuerzas, rotación semanal, vista previa de novato)
  → Momento de adopción (Entrenador + campeón) → siembra Estrategia → adoptar como novato → pelea en el Vacío
  → Carta de Evolución → aterrizaje en la Concordia (primero el momento del Entrenador) → Entrenador divide coach al spawn
  → Primera arena guiada (puerta de los Terrenos iluminada) → Libre deambular + coach
```

## Contrato de enseñanza de 60 segundos (actualizado para Primero Vuelo)

Antes de abandonar el primer vuelo / selección, el jugador debe saber:

- [ ] *Tú vuelas. Él pelea. Ambos ascienden.*
- [ ] *Tú crías a este campeón: tú no eres el luchador.* (identidad suave; sin exageración de bloqueo de reclamo)
- [ ] El cuerpo de novato al adoptar es el día uno del arco, no un retroceso respecto a la vista previa de selección

Copia canónica: `lib/player-copy.ts` · Visión: `docs/design-vision.md` · Vocabulario: `docs/vocabulary.md`

## P0: Promesas rotas ✅

| Elemento | Estado | Notas |
|----------|--------|-------|
| Lectura de estrategia / temperamento (sin controles deslizantes de arrastre libre) | ✅ | `DoctrineDial` = medidores; las Improntas + peleas mueven los diales |
| Copia del jugador: duelo/pelea no bout | ✅ | `lib/player-copy.ts` + interfaz del primer viaje |
| Primera pelea en arena de región | ✅ | `FIRST_FIGHT_WORLD = void` |
| Mayor separación de luchadores + cámara | ✅ | `MATCH_SPREAD = 4.5`, órbita 14 / altura 6.2 |
| Las peleas del Hub no recortan sellos/banderas | ✅ | Concordia oculta durante el combate; anillo temporal de arena |

## P1: Pegamento narrativo ✅

| Elemento | Estado | Notas |
|----------|--------|-------|
| PrimeraEjecución no se salta para jugadores nuevos | ✅ | Eliminado el marcado automático de intro vista |
| Sonido de introducción | ✅ | `lib/sound-gallery.ts`: gesto + CTA |
| Aterrizaje en la Concordia (3 momentos) | ✅ | Sello → Puertas de la Bóveda → Tu sesión |
| Copia honesta sobre la evolución del cuerpo | ✅ | El onboarding aplaza el crecimiento visible al paso de evolución |

## P2: Pulido ✅

| Elemento | Estado | Notas |
|----------|--------|-------|
| Purga de bout visible al jugador (UI de la app) | ✅ | Primer viaje, PrimeraEjecución, objetivo del desafío, escenarios |
| Coach de meta de la Concordia en el hub | ✅ | Coachmark de una sola vez tras el Acto 1 |
| Primer aterrizaje guiado en la Concordia | ✅ | La primera ejecución resalta la puerta de los Terrenos («▶ EMPIEZA AQUÍ»), atenúa las otras puertas + sello y ejecuta un empujón sensible a proximidad con un CTA «Llévame allí» que camina; escala a dorado cuando el jugador permanece inactivo (`guideWorld`/`guideUrgent`, `FIRST_GUIDE_WORLD`) |
| Cámara de viñeta dedicada a la primera pelea | ✅ | `MatchView.cinematic`: órbita más cerrada |
| Galería de sonidos | ✅ | `lib/sound-gallery.ts` + stingers por momento de onboarding |
| Alineación de iconografía | ✅ | `lib/iconography.ts`: paleta de dirección artística + sigilos de Fuerza |
| Rotación de iniciales de temporada | ✅ | `firstDuelStarterKeys()`: selección semanal por Fuerza |
| Interruptor de sonido de onboarding visible | ✅ | `OnboardingAudio` en superposiciones de PrimeraEjecución + PrimerDuelo |

## Narrativa y cinemáticas ✅

| Elemento | Estado | Notas |
|----------|--------|-------|
| Transiciones de puerta/viaje | ✅ | `TravelVeil`: barrido teñido de fuerza + tarjeta de nombre para viajar por puertas y entrar/salir de escenarios (`travelWhoosh` SFX) |
| Espina de la saga del Entrenador | ✅ | `lib/lore/saga.ts`: arco de 8 capítulos / 4 actos vinculado al rango del Entrenador; marcador del hub `ReaderThread` (id de código sin cambios) |
| Cinemática de cambio de temporada | ✅ | `seasonTurnBeat()`: un Guardián interpreta la Crónica cuando se abre una nueva puerta (una vez por temporada) |
| Sistema de rival | ✅ | `lib/lore/rival.ts`: Entrenador rival recurrente con nombre, enfrentamiento persistente, provocaciones que escalan; `RivalCard` + momentos pre/post-duelo |
| Momentos de personaje dirigidos | ✅ | `CharacterBeat` mejorado: letterbox, retrato 3D en vivo que sube/flota, pulso de brillo por línea, máquina de escribir, campo de paralaje (consciente de reducción de movimiento) |

La saga (tu historia) y la Crónica (la historia del mundo) son deliberadamente
distintas: la saga avanza a partir del único número de rango del Entrenador, por lo que se mueve sin importar cómo juegue el jugador, mientras que la Crónica gira según el reloj de temporada.

## Intencionalmente sin cambios

- **Claves de eventos de código/análisis**: siguen siendo `bout` (seguimiento estable del servidor)
- **Nombre del hook `useBout`**: interno; sin etiqueta visible al jugador
- **Docs/README/MCP**: orientado a desarrollo; no forma parte del pase de copia en juego (ver sincronización `docs/` para canon)

## Banda sonora (procedural, por lugar)

| Ambiente | Cuándo |
|----------|--------|
| `concord` | El hub Concordia |
| `colosseum` | Coliseo Obsidiana / región Terrenos |
| `ember` | Desafío de Ascuas |
| `void` | Jardín del Vacío |
| `amphitheatre` | Escenario Anfiteatro |
| `circuit` | Vuelo (Circuito / Ascenso) |
| `battle` | Cualquier pelea en vivo o duelo de Guardián |

Las partituras viven en `lib/ambience-scores.ts` (modos + formas de estilo AABA).
`grounds-screen` llama a `resolveAmbienceMood()`; el Ascenso móvil fija `circuit`.

## Terminología

- **Los jugadores ven:** duelo, pelea, duelo clasificatorio
- **Código/análisis:** bout (sin cambios: claves de evento estables)

## Archivos clave

- `lib/first-duel.ts`: iniciales, rotación, mundo de arena, copia de aterrizaje en la Concordia
- `lib/lore/saga.ts`: arco de saga del Entrenador + momento de cambio de temporada
- `lib/lore/rival.ts`: identidad de rival recurrente, memoria, provocaciones
- `lib/lore/character-beats.ts`: momentos de voz de campeón + Guardián
- `components/grounds/travel-veil.tsx`: transición de cambio de escena
- `components/grounds/reader-thread.tsx`: marcador del hub de saga (id de código sin cambios)
- `components/grounds/rival-card.tsx`: presencia del rival en el hub
- `components/grounds/character-beat.tsx`: momento narrativo dirigido
- `lib/ambience-scores.ts`: banda sonora procedural por lugar
- `lib/player-copy.ts`: vocabulario de pelea visible al jugador
- `lib/sound-gallery.ts`: mapa de stingers de onboarding
- `lib/iconography.ts`: canon visual para la UI
- `components/intro/first-duel.tsx`: superposición de onboarding
- `components/intro/onboarding-audio.tsx`: control flotante de silencio
- `components/shared/doctrine-dial.tsx`: medidores de temperamento / lectura de Estrategia
- `components/grounds/grounds-screen.tsx`: secuenciación + viaje por el mundo + guía de primera ejecución (enfocar puerta, escalada por inactividad, empujón caminar-hacia)
- `components/grounds/world.tsx`: puesta en escena de combate + cámara cinemática; hilos `guideWorld`/`guideUrgent` hacia la Concordia
- `components/grounds/concord.tsx`: escena de la Concordia; tratamiento de foco/atenúa de Puerta de la Bóveda (`firstStop`/`dimmed`/`urgent`)
- `components/grounds/worlds.ts`: `FIRST_GUIDE_WORLD` (la primera región hacia la que se dirige)
