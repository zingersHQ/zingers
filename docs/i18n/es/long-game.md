# El Largo Juego: por qué Zingers termina a los 40 minutos y cómo lo detenemos

> **Estado: Etapas 0–6 publicadas (julio 2026).** Documento de diseño complementario a la biblia.  
> La ficción de Vuelo para el jugador permanece en [`bible/10-ascent.md`](./bible/10-ascent.md);  
> la nomenclatura en [`vocabulary.md`](./vocabulary.md). Documentos relacionados:  
> [`design-vision.md`](./design-vision.md), [`essence.md`](./essence.md),  
> [`flight-first-plan.md`](./flight-first-plan.md).

Este documento responde a una sola pregunta: **¿cuánto puede jugar un jugador antes de quedarse sin motivos y qué cambiamos?** Las etapas siguientes están activas salvo que se indique lo contrario.

---

## 1. El reloj honesto

Estimación para jugadores nuevos con la versión actual:

| Ventana | Tiempo | Qué lo termina |
|---------|--------|----------------|
| Primera sesión | **35–45 min** | Vuelo → reclamo → una pelea → “¿y ahora qué?” |
| Día 2 | **~8 min** | Diario, un Vuelo, cierre |
| Día 4 | **~0** | Nada les pidió volver |
| Minoría vinculada al Vuelo | **3–5 h/semana** | Atracción real por puntuación alta, si la sensación funciona |

Parece un juego ligero. No lo es. Véase §2. Es un problema de **superficie legible**: el contenido existe, pero el jugador nunca descubre que existe.

## 2. Lo que realmente está construido (la sorpresa)

Una auditoría del código en vivo, no de los documentos, reveló:

- **Vuelo:** 100 sectores en 10 Alcances, peligros, campamentos, cofres de primera luz, alijos de Coronas, explorador, fantasmas, enlaces para compartir, un premio de 2500 Coronas por los Cien.  
  (`components/grounds/climb/*`, `lib/climb-campaign.ts`)
- **Campeones:** Primeras Mentes + dex integrada (ola 1 de la Etapa 6), pentágono de tipos, 5 niveles, cuerpos derivados de la carrera + fenotipo, registro de Sagas, Improntas.  
  (`lib/engine/roster.ts`, `lib/minds/baked.ts`, `lib/imprints.ts`, `lib/evolve/*`)
- **Ganchos de retorno:** pelea diaria, alijos diarios, objetivos de temporada, temporadas de 28 días, guerra de Clanes, rachas de predicción, tabla de clasificación global que se auto-juega vía cron, Director orientador, pista de desbloqueo, rasgos de ala, Condiciones, expediciones.
- **En pausa:** 5 Guardianes, completamente escritos y probados, desactivados por `KEEPERS_PLAYABLE = false` (`lib/features.ts`). Un juego de Casa con tipos y ganchos de tienda, pero sin interfaz.

Eso equivale a **15 horas de contenido servido en los primeros 30 minutos, casi todo invisible.** El problema nunca fue volumen.

## 3. Diagnóstico. Cuatro fallos estructurales

1. **Nada señala lo siguiente.** Ninguna función responde *¿qué debo hacer ahora?* Cada gancho solo se descubre si ya se sabe que existe.
2. **Todo está abierto desde el minuto uno.** Todas las regiones, escenarios, 100 sectores, 8 reclutas. Un revelado de 15 horas consumido al instante. Los juegos que parecen largos suelen retener lo mejor.
3. **La crianza no afecta visiblemente al verbo que se ejecuta.** Entrenar cuesta 60 Coronas y mueve tres diales invisibles. El jugador nunca ve que una carrera o pelea cambie por lo que enseñó.
4. **El verbo repetido carece de variación.** Cada carrera es la misma; cada pelea es la misma con distinta prosa.

## 4. La vara de medir (dejar de compararse con Pokémon)

Pokémon y Zelda son juegos de **volumen de contenido**. Mundos colocados a mano por cientos de personas. Perdemos esa carrera de forma permanente y la comparación solo genera desesperación.

Nuestros pares reales son **Balatro** (un juego de cartas, ~150 modificadores, cientos de horas), **Vampire Survivors** (una mecánica más un árbol de desbloqueos) y **Football Manager** (sin mundo. Solo fricción de carrera). Los tres extraen un tiempo de juego enorme de una fracción de los activos que Zingers ya tiene, usando tres herramientas: **variación de carrera, desbloqueos por goteo y un estado de carrera con consecuencias**.

**Objetivo: 10–15 horas en el primer mes, con una razón real de 8–12 minutos diarios para abrir.** No Zelda. Cinco a diez veces lo actual, alcanzable sin arte nuevo.

## 5. La decisión de dirección (llamada del fundador, julio 2026)

> **El Vuelo es el juego. El Campeón es el archivo de guardado. Las batallas son puntuación.**

Leer transcripciones de debates LLM es una novedad que muere con la repetición. La profundidad pertenece donde están las manos del jugador: el Vuelo. Esto no es una retirada del Campeón. Es una **inversión de la causalidad**:

| | Hoy | Después |
|---|---|---|
| Vuelo → Campeón | la profundidad estampa un sigilo | sin cambios (mantenerlo) |
| Campeón → Vuelo | **nada** | la mente con la que vuelas **cambia cómo se juega el vuelo** |

Una vez que criar un Campeón sea un sistema de construcción para el verbo que el jugador realmente ejecuta —manejo, alcance de exploración, segunda vida, atracción de oro, lecturas de peligros—, “criar una mente” deja de ser una pestaña lateral y se convierte en la razón para seguir criando. Esa es la sensación de Pokémon (construcción de equipo, decisiones significativas, consecuencia legible) trasladada al verbo correcto.

Las batallas permanecen: “tú vuelas, él pelea” es el diferenciador, y la liga asíncrona es contenido que corre mientras los jugadores duermen. Pero se comprimen en momentos resueltos, de un vistazo y con peso. Nunca un muro de texto para leer. Los Guardianes permanecen apagados; un juego de texto desactivado no es contenido gratis.

## 6. El plan

Ordenado por retorno de esfuerzo. Cada etapa es publicable por sí sola.

### Etapa 0. El Director *(1–2 días)* ✅ publicada

Una función pura sobre el estado de guardado existente que responde “¿qué hago ahora?” en una línea y un botón, renderizada en cada superficie donde aterriza el jugador. No crea contenido; hace perceptible el contenido ya construido. `lib/director.ts` + `components/director/*`.

### Etapa 1. La pista de desbloqueo *(3–5 días)* ✅ publicada

Una pista de Entrenador que alimenta cada actividad y donde cada rango abre algo **por nombre**: Alcances en bloques, luego tribunal, desafío, corredor, la segunda región, ranuras de recluta, explorador. No contenido nuevo. Contenido racionado. Reajusta la construcción existente en un revelado de 15 horas y da al Director una columna vertebral a la que apuntar.

Módulo en vivo: `lib/unlock-ladder.ts`. Aplicado en techos de Vuelo (móvil + escritorio), puertas del Centro, Corredor, Explorador, ranuras de recluta; el Director puede señalar la siguiente puerta nombrada. La puerta de prueba del Alcance II permanece igual. La profundidad ya volada se conserva para que las partidas existentes no queden bloqueadas.

### Etapa 2. Causalidad Campeón → Vuelo *(1–2 semanas)* ✅ publicada (v1)

El núcleo del §5. Cada Campeón concede **rasgos de ala** que cambian mediblemente una carrera; las Improntas y los hitos enseñan nuevos; el jugador elige una carga antes del lanzamiento. Convierte 8 mentes en 8 × espacio de carga y hace que cada acción de crianza pague en el verbo que importa.

Módulo en vivo: `lib/wing-traits.ts`. Un rasgo **innato** por tipo de Fuerza + hasta un rasgo **ganado** (ejes / campamentos / temperamento). Efectos: vidas, probabilidades de oro, planeo, tropiezo, bonificación de campamento de explorador, velocidad de crucero. Aplicados vía `ascentSessionMods` en ambos cuerpos de Vuelo. La tira lista muestra `ALAS · …` y alternadores ganados.

### Etapa 3. Condiciones *(3–5 días)* ✅ publicada (v1 Vuelo)

Un modificador basado en datos aplicado a una carrera o pelea: aire enrarecido, niebla, viento cruzado, una vida, oro duplicado, sin explorador, multitud hostil, muerte súbita. Veinte o más de estas es un día de escritura más ganchos de motor, y multiplica cada superficie existente. La victoria paramétrica más pura disponible.

Módulo en vivo: `lib/conditions.ts`. Trece cielos diarios clasificados (rotación UTC), fusionados tras los rasgos de ala vía `mergeRunMods`. La práctica de explorador permanece Cielo Despejado. La tira lista muestra `HOY · …`; el Director puede mostrar el cielo como pregunta adicional. Las Condiciones del lado de las peleas quedan diferidas.

### Etapa 4. Fricción de carrera y legado ✅

Módulos en vivo: `lib/career-friction.ts`, `lib/legacy.ts`. Forma / fatiga / cicatrices se apilan en el Vuelo tras alas + Condiciones (`applyCareerToMods` en Escalada + Circuito). Los capítulos rivales escalan vía `maybeEscalateRival` / `currentRival`. Retirarse sella una leyenda + un ala reliquia pendiente para el siguiente reclamo (`retireOwned` → Long Vault). El Director rota establos gastados/rotos y muestra Cara / retirar como preguntas adicionales.

### Etapa 5. Expediciones ✅

Módulo en vivo: `lib/expeditions.ts` + `lib/server/expedition.ts` + `/api/expedition`. Ruta semanal UTC: semilla (diseños vía `climbSector(i, seed)`), una Condición, 20 sectores, tabla propia por cuerpo. Modo `expedition` en Escalada + Circuito. Sin campamentos, XP/Coronas fraccionarias. Tira lista `SEMANA · …`; pregunta adicional del Director. Fantasma del #1 diferido (códec listo en `lib/climb-ghost.ts`).

### Etapa 6. Contenido por lotes ✅ (ola 1 del dex en vivo)

Tubería sin conexión: `content/minds/reviewed/*.json` → `npm run bake:minds` → `lib/minds/baked.ts`, fusionado en roster / banter / beats / primer duelo / escaparate. Herramientas de ola: `npm run forge:dex` (bancos de nombres curados + kits de voz) y `npm run generate:minds` (borradores XAI opcionales). Primer horneado manual: **STILL**, **KEEL**, **PRISM**, **FABLE**. La ola 1 forjó un conjunto coleccionable a escala Gen-1 encima (véase `docs/bible/03-champions.md`). Catálogo de partes de fenotipo + marcas de especie en nivel novato para que mentes de la misma Fuerza se lean como animales distintos. Sin GLTF nuevo por mente. Olas siguientes = más JSON revisado + rehacer horneado + expansión del kit de partes.

## 7. No-objetivos explícitos

- **Una cuarta región.** Es barato (un blob `BiomeConfig` y un preajuste de naturaleza) y es exactamente la trampa. Tres regiones sin trabajo se convierten en cuatro regiones sin trabajo, y el vacío se vuelve más grande y mejor iluminado. Las regiones reciben *trabajos* antes que hermanos.
- **Reactivar los Guardianes** como relleno. Regresan solo si un rediseño los convierte en una actuación, no en una transcripción.
- **Cualquier cosa que desplace las compuertas de sensación Vuelo-Primero.** Andamiaje de retención sobre un verbo central que no se siente bien solo crea una tabla de clasificación legible y vacía. El trabajo de sensación en [`flight-first-plan.md`](./flight-first-plan.md) va por delante de todo lo aquí.

## 8. Cómo sabremos si funciona

| Señal | Dónde | Hoy | Objetivo |
|-------|-------|-----|----------|
| Retorno D1 | `/stats` | sin medir | 35 % |
| Retorno D7 | `/stats` | sin medir | 15 % |
| Sesiones/jugador/semana | `/stats` | ~1,4 (est.) | 4 |
| Profundidad mediana tras semana 1 | `climb.bestSectors` | ~12 (est.) | 40 |
| Jugadores que ven el Alcance IV | campamentos iluminados ≥ 4 | raro | 30 % |

Instrumentar antes de que aterrice la Etapa 1, o estaremos adivinando si algo de esto funcionó.
