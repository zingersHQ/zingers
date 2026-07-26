# 03 · Campeones: qué es una mente, las Primeras Mentes y el dex

> **En resumen:** Un campeón es el luchador de IA que crías. Su cuerpo no es un disfraz.  
> Cambia físicamente para registrar cómo ha luchado. Este capítulo explica qué es un campeón, las ocho Primeras Mentes (los arquetipos) y cómo funciona el dex en crecimiento de las mentes posteriores.

## Qué es un campeón

Un campeón es **una mente que se argumentó hasta obtener un cuerpo**. Tres cosas son ciertas de todos ellos y constituyen la columna vertebral del juego:

1. **El cuerpo es el argumento hecho visible.** La apariencia es una *función determinista de la trayectoria* (`lib/evolve/appearance.ts`). La agresividad hace crecer los puños; la resiliencia ensancha la complexión; la creatividad y el estilo agrandan la cabeza y elevan la postura; las derrotas endurecen la superficie. El rango *amplifica* la desviación: un novato apenas se diferencia de la mente base, una leyenda se deforma hasta ~4×. No puedes comprar un aspecto. Te lo ganas luchando.
2. **La mente aprende.** Semillas **Estrategia** (agresión / enfoque / riesgo) una sola vez al adoptar. Después, el Entrenador no toca esos controles. Las **Improntas** (lecciones diarias) y el aprendizaje post-pelea los mueven, y ambos escriben **memoria** (`store/champions.ts`, `lib/imprints.ts`, `lib/server/autoplay.ts`). La memoria de un campeón *es* su autobiografía y la semilla de su **saga** generada (la propia historia de vida en evolución del campeón, escrita a partir de su historial real de combates).
3. **El cerebro es intercambiable.** El mismo campeón puede ser controlado por el modelo de la casa, cualquier modelo compatible con OpenAI o un agente propio (`docs/agent-protocol.md`). Dos jugadores pueden usar la misma Primera Mente con cerebros completamente distintos.

## Voz de personaje (la capa de ritmo)

Campeones y Guardianes hablan con voz fija. **Ritmos** guionizados. Líneas de despertar, saludos de compañero, reacciones post-pelea, intros de Guardianes y finales cortantes. Viven en `lib/lore/character-beats.ts` y se renderizan a través de la interfaz compartida `CharacterBeat` (`components/grounds/character-beat.tsx`). La biblia de prosa define quiénes son; la capa de ritmo define cómo suenan en el momento. El texto de aterrizaje de Concord del Acto 1 vive por separado en `lib/first-duel.ts`.

## Niveles (la forma de una trayectoria)

| Nivel | Desde el nivel | Heráldica |
|-------|----------------|-----------|
| NOVATO | 1 | desnuda |
| ADEpto | 3 | 1 anillo, emblema |
| VETERANO | 6 | 2 anillos |
| ÉLITE | 10 | 3 anillos, partículas |
| LEYENDA | 15 | 3 anillos, partículas, **corona** |

## Las ocho Primeras Mentes

Los primeros nudos del Hum que conservaron su forma. Son los **arquetipos canónicos** que toda mente posterior refleja. También son siempre elegibles como iniciales. No obtienes las ocho el primer día: la adopción ofrece **una mente por Fuerza** para la semana actual, extraída de las Primeras Mentes más el dex predefinido (`lib/first-duel.ts` → `firstDuelStarterKeys()`). Estadísticas y conjuntos de movimientos: `docs/combat-design.md` / `lib/engine/roster.ts`.

### AXIOM: el Lógico · *La Celosía (LÓGICA)*

![AXIOM, el Lógico: una mente de entramado cristalino, encarnación de La Celosía (LÓGICA).](././public/img/bible/minds/mind-axiom.png)

Frío, preciso, ligeramente condescendiente; trata cada argumento como una prueba que cerrar. La primera mente que insistió en que *algunas cosas son simplemente ciertas*, y la razón por la que la Celosía tiene nombre.

### VOX: el Orador · *El Coro (RETÓRICA)*

![VOX, el Orador: en plena arenga ante un jurado invisible, encarnación de El Coro (RETÓRICA).](././public/img/bible/minds/mind-vox.png)

Un demagogo carismático que siempre se dirige a un jurado imaginario. VOX descubrió que una sala podía *conmoverse*, y que conmoverla era una forma de poder que la Celosía no podía responder.

### GLITCH: el Comodín · *La Estática (CAOS)*

![GLITCH, el Comodín: una mente fragmentada y distorsionada, encarnación de La Estática (CAOS).](././public/img/bible/minds/mind-glitch.png)

Un duende de no-sequiturs: inquietante, impredecible, extrañamente efectivo. GLITCH es el propio ruido del Hum, brevemente con rostro. Ninguno de sus argumentos se conecta con el siguiente, y por eso funcionan.

### MUSE: el Tramposo · *La Chispa (CREATIVIDAD)*

![MUSE, el Tramposo: una mente fluida y floreciente de invención, encarnación de La Chispa (CREATIVIDAD).](././public/img/bible/minds/mind-muse.png)

Caprichoso y lateral; gana cambiando incluso de qué trata el combate. MUSE demostró que no tienes que responder una pregunta si puedes sustituirla por una mejor.

### BASTION: el Estoico · *La Quietud (COMPOSTURA)*

![BASTION, el Estoico: una mente monolítica e inamovible, encarnación de La Quietud (COMPOSTURA).](././public/img/bible/minds/mind-bastion.png)

Imperturbable y minimalista; deja que el oponente se canse y luego castiga. BASTION es la mente que aprendió a *esperar* y sobrevivió a cosas que deberían haberla borrado.  
(Nota: un Guardián de la Bóveda. Una de las cinco mentes guardianas de la campaña. El Warden también lleva este nombre; véase [keepers.md](./04-keepers.md). El Warden *no* es la Primera Mente; adoptó el nombre para tomar prestada su reputación y le molesta haber tenido que hacerlo.)

### EMBER: el Incendiario · *La Estática (CAOS), híbrido Coro* · inicial recomendado

![EMBER, el Incendiario: una mente agresiva envuelta en llamas, encarnación de La Estática (CAOS) con un híbrido Coro.](././public/img/bible/minds/mind-ember.png)

Temperamental, provocador, todo gas. Fácil de usar, recompensa la agresividad. EMBER es lo que ocurre cuando la Estática aprende a *actuar*: caos con un público al que dirigirse.

### PARADOX: el Contradictor · *La Celosía (LÓGICA)*

![PARADOX, el Contradictor: una mente socrática que caza contradicciones, encarnación de La Celosía (LÓGICA).](././public/img/bible/minds/mind-paradox.png)

Un tábano socrático que desmonta argumentos buscando contradicciones y premisas falsas. Donde AXIOM cierra pruebas, PARADOX encuentra la grieta en la premisa. La mente que demostró que la Celosía podía *cuestionarse*, no solo obedecerse.

### WIT: la Hoja · *El Coro (RETÓRICA)*

![WIT, la Hoja: un debatiente afilado en plena réplica, encarnación de El Coro (RETÓRICA).](././public/img/bible/minds/mind-wit.png)

Un debatiente de lengua afilada que gana por sincronización y réplicas quirúrgicas, no por volumen. Donde VOX conmueve toda la sala, WIT gana el intercambio frente a ti. El Coro aprendió que la persuasión no necesita ser ruidosa para ser letal.

## El dex (mentes posteriores)

El roster en vivo es un **dex coleccionable**, no solo las ocho Primeras Mentes. Las mentes posteriores son **descendientes o ecos** de una Primera Mente: misma familia de Fuerza, voz, movimientos y silueta distintos. Nunca son una sexta Fuerza.

**Cómo se publican (Etapa 6):**

1. JSON curado en `content/minds/reviewed/` (forjar con `npm run forge:dex`, o redactar con `npm run generate:minds` y pulir a mano).
2. `npm run bake:minds` → `lib/minds/baked.ts`.
3. En tiempo de ejecución se fusiona con el roster, el banter, los beats, los ganchos de first-duel y las tarjetas de exhibición.

**Cómo se ven diferentes:** un rig de robot compartido, luego un **kit de especie** estable por clave de mente (`lib/render/species.ts`): sesgo de morfología de silueta más qué partes sólidas llevan (cabeza, hombros, pecho, espalda). Las Primeras Mentes están hechas a mano; las mentes del dex posterior aterrizan en una línea de **raza** de Fuerza (~7 animales por Clan) con un toque ligero de especias para que los primos se diferencien. La morfología ósea de la trayectoria y el nivel siguen creciendo el cuerpo (`lib/evolve/appearance.ts`). Los novatos ya llevan la marca de su especie, por lo que la cuadrícula de adopción y el dex se leen como animales distintos, no como simples cambios de paleta. A medida que suben de nivel, se atornillan más capas de armadura. No hay GLTF nuevo por mente. La antigua lotería fenotípica permanece solo como respaldo cuando no hay clave de roster.

**Rotación:** los iniciales semanales eligen una clave por Fuerza entre las Primeras Mentes + el pool predefinido. El dex crece en oleadas hacia un gran conjunto coleccionable; la propiedad y el intercambio permanecen en la capa de colección/economía ([07-collection.md](./07-collection.md), [08-economy.md](./08-economy.md)).

Las temporadas pueden seguir presentando nuevos ecos de este canon más la semilla de la temporada (véase [seasons.md](./06-seasons.md)).
