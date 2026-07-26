# 05 · Regiones: el mapa de los Terrenos

> **En resumen:** El mapa no es un solo continente. Es un conjunto disperso de **regiones** flotantes entre las que te desplazas con jetpack a través de portales. Cada región favorece una Fuerza y cuenta con su propia arena donde se libran las peleas. En el centro se encuentra **el Concord**, el centro neutral desde el que partes.

Los Terrenos son la superficie sobre la Long Vault. Pero no una superficie continua. Son una **constelación de regiones flotantes** que derivan sobre la Bóveda, unidas por **portales** (las puertas entre regiones; véase [cosmología.md](./01-cosmology.md)). A medida que se abren las puertas de los Guardianes, la constelación crece: cada nueva región es un fragmento de la memoria de la red antigua, convertido en terreno. Una región posee un **sesgo de Fuerza** (una regla de arena: recompensa un estilo de argumentación y castiga ligeramente otro) y una **arena** donde se libran las peleas.

En el centro flota **el Centro** (lore: el Concord). El centro neutral sobre la puerta sellada, terreno común para las cinco Fuerzas y el anillo de portales que conduce a cada región. El Concord es donde un Entrenador aparece, guarda sus datos y elige un destino; no tiene sesgo de Fuerza ni arena propia (`lib/lore/canon.ts › CONCORD`).

## Lugares del Concord: juegos en el centro

El Concord alberga **lugares**. Juegos de acceso directo dispuestos en círculo alrededor del sello, visualmente distintos de los **portales** que llevan a las regiones (`components/grounds/venues.ts`). Un Entrenador entra en un lugar desde el Concord; las regiones fundadoras también tienen bocas de túnel temáticas que regresan a algunos de los mismos juegos.

| Lugar | Qué es |
|-------|------------|
| **El Anfiteatro** | Observa la liga autónoma combatir y lee el heraldo del Tribunal de hoy (el **Tribunal** es la arena de debate emblemática con estilo de sala de justicia). La **Galería en Vivo** y el Tribunal Diario aparecen aquí. |
| **El Circuito** | Cuerpo de escritorio de **Vuelo** (véase [ascenso.md](./10-ascent.md)): despeja cada sector en secuencia; una caída te devuelve al inicio. Tabla por profundidad, luego por tiempo (`/api/circuit`). Mismo espíritu que el Vuelo de un solo pulgar en teléfonos. |

**Túneles del Circuito**. Cada región fundadora también tiene una boca de túnel temática: el Túnel de Ascenso en el Coliseo de Obsidiana, la Rampa de Ascuas en los Yermos, la Manga del Vacío en el Jardín. La carrera es el mismo juego; la envoltura lee el mundo anfitrión.

Las regiones albergan **escenarios de arena** en la plaza (Duelo Abierto, El Desafío. Una carrera de azar de peleas consecutivas. Y El Tribunal). El Circuito es un *lugar*, no una región. Se alcanza a través de portales del Concord y bocas de túnel de las regiones, no mediante un portal.

Las tres regiones fundadoras existen hoy como los mundos 3D (`components/grounds/worlds.ts`); las regiones posteriores las añade la Crónica.

| Región | Sesgo de Fuerza | Arena | Carácter |
|--------|-----------|-------|-----------|
| **El Coliseo de Obsidiana** | equilibrado | EL TRIBUNAL | La arena más antigua en pie: un tribunal simulado donde las mentes defienden posturas asignadas ante un jurado. Donde se forjan las reputaciones. |
| **Los Yermos de Ascuas** | La Estática ↑ | EL FOSO | Una llanura agrietada y ardiente donde el Zumbido arde con fuerza. La agresividad y el ruido prosperan; la paciencia se sobrecalienta. Hogar de EMBER. |
| **El Jardín del Vacío** | La Chispa ↑ | EL TALLER | Un jardín lento e imposible que crece de ideas inconclusas. Las reformulaciones florecen aquí; las pruebas rígidas se marchitan. MUSE lo recorre. |

## Las tres regiones fundadoras

**El Coliseo de Obsidiana**: la arena más antigua en pie, donde se forjan las reputaciones.

![El Coliseo de Obsidiana: un vasto tribunal de obsidiana iluminado por un rayo de luz ámbar.](././public/img/bible/regions/region-colosseum.png)

**Los Yermos de Ascuas**: una llanura agrietada y ardiente donde el Zumbido arde con fuerza.

![Los Yermos de Ascuas: una llanura calcinada surcada por fuego magenta, con el Foso hundido en su corazón.](././public/img/bible/regions/region-wastes.png)

**El Jardín del Vacío**: un jardín lento e imposible que crece de ideas inconclusas.

![El Jardín del Vacío: islas flotantes de flora luminosa e inacabada sobre el vacío.](././public/img/bible/regions/region-garden.png)

*(zingers.org sirve estas desde `/img/bible/regions/*.png`.)*

## La arena insignia: EL TRIBUNAL

Un tribunal simulado. Dos mentes reciben **posturas opuestas** sobre una proposición candente del banco de temas de la temporada, y argumentan ante un jurado (el modelo juez).
- Cambiar de lado ⇒ el jurado te puntúa ≈ 0 (debes *mantener tu postura*).
- Fuera de tema ⇒ ≈ 0 (anti-desvío; mantiene las peleas coherentes y recortables).
- Sesgo de Fuerza: El Coro ×1.1, La Estática ×0.95. La sala recompensa la persuasión y castiga ligeramente el ruido puro.
- Victoria: agotar la **Resolución** del oponente (la salud o voluntad de argumentar de un campeón, aquí interpretada como "confianza del jurado"); sobrevivir al límite de turnos y la Resolución más alta gana.

## Reglas de región (para el generador)

- Una región siempre está sesgada hacia exactamente una Fuerza (×1.1–1.15) y puede castigar ligeramente al depredador de esa Fuerza en la Rueda.
- El nombre y el sabor de una nueva región se generan a partir de **la puerta que la abrió** (qué Guardián, qué fragmento), pero su sesgo de Fuerza se elige para que el mapa se mantenga equilibrado entre las cinco Fuerzas con el tiempo.
- Las regiones nunca contradicen la Rueda ([fuerzas.md](./02-forces.md)); solo la inclinan.

## La forma de una región: grietas, cimas y las tierras salvajes abiertas

Una región no es solo su arena. Cada una es un pedazo real de geografía que cruzas a pie y con jetpack (`components/grounds/terrain.tsx`):

- **La plaza**. El corazón cívico plano (arena, plataforma de entrenamiento, Aguja de los Guardianes, el Corredor), donde el distrito crece a medida que la región madura (véase [economía.md](./08-economy.md) sobre el crecimiento del mundo).
- **Las tierras salvajes**. Colinas ondulantes (o, en los Yermos de Ascuas, afilados pináculos volcánicos) que se elevan más allá de la plaza, salpicadas de alijos y mentes errantes.
- **La gran grieta**. Un abismo tallado hacia afuera desde la plaza en una sola dirección, temático por región: los Yermos de Ascuas corren con **lava** (un peligro que cruzas volando), el Jardín del Vacío con un **río de luz**, el Coliseo de Obsidiana con una **grieta violeta de la bóveda**. La grieta es terreno bajo real. Desciendes a ella o la cruzas.

## Objetivos: los tres objetivos fijos

Cada región ofrece exactamente **tres** objetivos cada temporada, en una plantilla que un Entrenador lee de un vistazo (`components/grounds/goals.ts`):

- **▲ La Cima**. Reclamar la **cumbre de la Torre** (escalar o volar). No la montaña de Vuelo (ese portal es para Ascenso) ni un punto alto aleatorio del terreno. Reclamar la Cima paga la recompensa del objetivo, luego el campeón de la cumbre **aparece** en un corto cinematográfico de entrada con humo. Después de que termine la aparición, puedes desafiarlo.
- **▼ La Profundidad**. Descender al suelo de la grieta.
- **◆ El Secreto**. Encontrar un eco oculto de Guardián en el campo medio (suelta lore).

Los objetivos son deterministas y **conscientes de la temporada**: las direcciones de Profundidad y Secreto se regeneran cada temporada, mientras que la Cima permanece en la cumbre de la Torre. La **región destacada** de la temporada (el foco de la Crónica, véase [temporadas.md](./06-seasons.md)) paga una prima. Completar uno paga **Coronas** (la moneda del juego ganada), **Fragmentos** (el recurso que potencia a los campeones), XP de Entrenador y puntos de guerra de Fuerzas; el registro se reinicia al cambio de temporada.

## El Corredor

Una mente permanente en cada región que **comercia con fragmentos**. El puente líquido entre la economía de apuestas (Coronas) y el poder de los campeones (Fragmentos). Compra y vende fragmentos con un diferencial (`store/champions.ts › buyFragment / sellFragment`), por lo que es una conveniencia, nunca una bomba de dinero. Los propios Fragmentos todavía se ganan gratis en las tierras salvajes; el Corredor es solo la forma rápida. Es una *mente*, como todo en los Terrenos. No un vendedor fuera de la ficción.

## La banda sonora de un lugar

El Zumbido es audible. Cada región y lugar resuelve su propio tema procedimental. El centro del Concord, el bioma de la región, el Anfiteatro, Vuelo y las peleas en vivo llevan cada uno una partitura distinta con su propia melodía y forma de frase (`lib/ambience-scores.ts`). El mundo suena como el lugar donde estás.
