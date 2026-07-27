# Política de vocabulario y voz

> **En resumen:** Zingers mantiene un pequeño conjunto de términos únicos y con sabor, pero cada uno se define en el momento en que un jugador nuevo lo encuentra, y nada innecesariamente extraño sobrevive en el texto que un recién llegado lee primero. Este documento es la única fuente de verdad sobre cómo nombramos las cosas y qué tan claro escribimos.

**Locales:** El inglés aquí es la fuente para los escritores. Las reglas de préstamo/traducción localizadas están en [`docs/i18n/terminology.md`](i18n/terminology.md). Cadenas de interfaz: `messages/{locale}.json`.

Nuestra audiencia es global. Muchos jugadores leen inglés como segundo idioma y muchos llegan sin saber nada del lore. El mundo debe seguir siendo distintivo y atractivo, pero "interesante" y "claro" no están en tensión. Un término solo merece su lugar si vale la pena enseñarlo; una vez que lo conservamos, siempre lo enseñamos.

## Las tres reglas

1. **Sin sustantivo propio sin definir en la primera copia.** Lo primero que lee un jugador (la introducción, el héroe de la página de inicio, el flujo del primer duelo) debe tener sentido sin conocimiento previo. Los nombres distintivos pueden aparecer, pero cada uno recibe una breve explicación sencilla en su primer uso (`the Long Vault, la puerta sellada alrededor de la cual se construyó todo el mundo`). Los nombres de lore profundo que no se pueden explicar en una cláusula (the Hum, the Chronicle) se mantienen fuera de la copia de primer contacto y viven en la Biblia.
2. **Una idea, una palabra.** Sin proliferación de sinónimos. Elige el término único y úsalo en todas partes.
3. **Prefiere la palabra sencilla cuando la elegante no aporta nada.** Mantén un término acuñado solo cuando lleva un sabor real que una palabra sencilla perdería. De lo contrario, usa la palabra sencilla.

## Cómo suena la guía (solo para escritores — nunca una afirmación del producto)

Cuando el texto le indica al Entrenador qué hacer a continuación (Director, resultado de Flight, puertas de bloqueo, entrenadores del Hub), escríbelo **como el campeón**, en primera persona: nosotros / nos / quédate conmigo. No una señal de misión (`NEXT`, interfaz de Compass). Estándar de oro:

> Quédate conmigo. Nueve tramos más de cielo y encendemos el siguiente campamento. Hay un cofre de Coronas esperándote la primera vez.

**Nunca lo vendas.** Ningún texto visible para el jugador, marketing o documentos puede promocionar "te habla", "líneas de voz", "voz de IA compañera" o cualquier cosa que trate el diálogo ordinario de personajes como una característica. Los personajes simplemente tienen líneas. Igual que en cualquier juego.

### Prohibición: el separador de raya

**Nunca uses ` — ` (raya espaciada) en texto legible por el jugador** ni en documentos públicos que vean los jugadores. Prefiere puntos, comas, oraciones cortas o dos puntos. Los comentarios de código pueden conservar rayas.

## Mapa de términos canónicos

| Usa esto | No esto | Notas |
|---|---|---|
| **Entrenador** | Lector, Manipulador | El jugador. Tú crías a los campeones; tú no peleas. |
| **Campeón** | (mente, para el luchador) | "Mente" está bien para una cruda/sin reclamar en el lore; el luchador del jugador es un Campeón. |
| **Estrategia** | doctrina | Los diales de agresión/enfoque/riesgo (sembrados al adoptar; movidos por Improntas y peleas). Tras adoptar la interfaz los muestra como **medidores de temperamento** (lectura, no arrastre libre). *Identificadores de código* (`doctrine()`, `DoctrineDial`, `card.doctrine`, el parámetro URL `d`) conservan sus nombres; solo cambia el inglés visible. |
| **medidores de temperamento** | deslizadores de estrategia / diales de doctrina (como verbos de interfaz) | Nombre visible para el jugador del medidor de Estrategia post-adopción. |
| **pelea** / **batalla** / **duelo** | asalto | Nunca digas "asalto" en texto visible para el jugador. Prefiere **pelea** / **batalla**; **duelo** está bien para un enfrentamiento individual. *El código* puede seguir diciendo `useBout`, `learnFromBout`, tipo de evento `"bout"`; no renombres esos en una pasada de copia. |
| **Impronta** | lección / enseñar (solo) | El verbo diario de crianza que escribe memoria y ajusta Estrategia. |
| **Clan** | Lealtad, Casa | La Fuerza a la que juras. El verbo "jurar lealtad a tu Clan" está bien (inglés sencillo). |
| **regiones** / **regiones flotantes** | losas de región, losas | Elimina "losa". |
| **el mundo** | los Terrenos (en copia de primer contacto) | Di **"el mundo"** para todo el lugar 3D en el que un recién llegado vuela. "los Terrenos" es el **nombre propio del lore** del mundo: está bien en la Biblia/`/glossary`, pero nunca en primer contacto, y **nunca como nombre de una región** (esa fue la confusión principal). La URL `/grounds` y el id `grounds` permanecen sin cambios. |
| **el Centro** | la Concordia (en copia de primer contacto) | Di **"el Centro"** para el área central de aterrizaje con las puertas. "la Concordia" sobrevive solo como su nombre propio del lore. Id de código `concord` sin cambios. |
| **explorar** / **volar alrededor** | deambular | **Elimina "deambular"** en toda la copia visible. El id de capa `roam` en `lib/hub.ts` / `lib/play-nav.ts` permanece como id de código. |
| **Vuelo** | el Ascenso, Circuito, Escalada (como nombres de modo) | El juego de vuelo: un juego en teléfono y escritorio. Di **"Vuelo"** / **"Emprende el vuelo"** / simple "volar". **Nunca** muestres *el Ascenso*, *Circuito* o *Escalada* como etiqueta de modo. La minúscula "escalar" está bien como verbo sencillo ("escalar más alto"). El código puede seguir diciendo Circuit / Climb / Ascent. |
| **flotante** / **a la deriva** | a la deriva | Sinónimos más sencillos. |
| **Puerta** | Puertabóveda | El arco hacia una región (en copia visible; los nombres de componentes pueden permanecer). |
| **Temporada** | la Crónica | La copia visible dice "temporada"; "la Crónica" puede permanecer como sabor de lore profundo en la Biblia. |
| **cerebro incorporado** | cerebro de Casa | El agente predeterminado. |
| **Galería en vivo** | Galería de adivinación | Donde ves peleas autónomas. |
| **Alcance** | nivel, etapa | Una banda del cielo de Flight (diez en total). Degradado: el HUD muestra **progreso simple del cielo** (sector N / total), no "Alcance N". "Alcance" sobrevive como nombre de sabor en la Biblia/`/glossary`. |
| **Campamento** | punto de control, estación de paso (en copia) | El punto de descanso entre Alcances. Degradado a lore; no un sustantivo enseñado en primer contacto. |
| **volar a tu lado** / **compañero alado** | el jetpack del campeón | Canon: el campeón **no** tiene jetpack. Es una mente y vuela por sí solo. Solo el **Entrenador** lleva un jetpack. Nunca escribas "el jetpack de tu campeón." |
| **clasificación** / **rango** / **tabla** / **puntuación** | escalera, ELO, Elo | Solo visible para el jugador. Di **clasificación**, **rango**, **tabla** o simple **puntuación**. Nunca **ELO** (nadie lo conoce). Nunca **escalera** como sustantivo de producto (Desbloquear Escalera, escalera de temporada, entrar a la escalera). El código puede conservar identificadores `ladder` / `elo`. |

## El presupuesto de conceptos de primer contacto (los seis que encuentra un recién llegado)

El flujo intro → emprender-vuelo → primer-duelo → aterrizaje introduce **solo estos seis sustantivos**, cada uno con una explicación sencilla: **Entrenador, Campeón, Volar (Vuelo), Batalla/duelo, el Centro, Coronas.** (Ver `docs/simplification-plan.md` §2.) Todo lo demás se revela después, en contexto, la primera vez que es relevante. Nunca se presenta todo de una vez.

## Conservar, pero siempre explicar en el primer uso (la capa de sabor)

**the Long Vault, the Hum, Fuerza, Sigilo, Saga, Resolución, Tribunal, Desafío, Alcance, Campamento, Fragmento.** Estos son distintivos y vale la pena conservarlos, pero pertenecen a la **capa de sabor** (la Biblia, `/glossary`, menús profundos), no al primer contacto. Dondequiera que aparezca uno por primera vez, agrega una explicación sencilla. Los nombres propios del lore **los Terrenos** (di "el mundo") y **la Concordia** (di "el Centro") también viven aquí; mantenlos completamente fuera del primer contacto. **No escribas Guardianes ni Keepers** en copia visible ni lore público; no forman parte del juego en vivo. Las definiciones canónicas de una línea viven en `lib/lore/glossary.ts` (renderizadas en `/glossary` y en `docs/bible/09-glossary.md`); reutiliza esa redacción para que las explicaciones se mantengan consistentes.

## Código vs. copia

Cambia **solo el texto visible para el jugador**: literales de cadena mostradas en la interfaz, texto JSX, texto `aria-label`/`title`, y prosa de la Biblia. **No** renombres identificadores, nombres de componentes o funciones, props, claves de objeto, claves de `localStorage`, o valores de URL/parámetros de consulta (por ejemplo, el ayudante `doctrine()`, `ReaderThread`, `READER_COPY`, el componente `Vaultgate`, el id de cerebro `"House Grok"`). Renombrar esos es un refactor separado y deliberado.

## Pregunta abierta (aún no decidida)

**"La Casa"** como nombre de la liga/oponentes incorporados (distinto de "cerebro de Casa", que ahora es "cerebro incorporado") todavía se usa en algunos lugares (whitepaper, diapositivas, ids de compartir como `"House Grok"`). Toca valores almacenados y URLs de compartir, así que renombrarlo es una decisión de producto, no una pasada de copia. Se deja como está por ahora.
