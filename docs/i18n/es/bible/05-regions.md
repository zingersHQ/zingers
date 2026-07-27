# 05 · Regiones: el mapa de los Terrenos

> **En resumen:** El mapa no es una sola masa de tierra. Es un conjunto disperso de **regiones** flotantes entre las que te desplazas con jetpack a través de portales. Cada región favorece una Fuerza y cuenta con su propia arena donde se libran las peleas. En el centro se encuentra **el Concord**, el centro neutral desde el que partes.

Los Terrenos son la superficie que cubre la Bóveda Larga. Pero no una superficie continua. Son una **constelación de regiones flotantes** que derivan sobre la Bóveda, unidas por **portales** (las puertas entre regiones; véase [cosmología.md](./01-cosmology.md)). A medida que se abren las puertas del Vault con las temporadas, la constelación crece: cada nueva región es un fragmento de la memoria de la red antigua, convertido en terreno. Una región tiene un **sesgo de Fuerza** (una regla de arena: recompensa un estilo de argumentación y castiga ligeramente otro) y una **arena** donde se libran las peleas.

En el centro flota **el Centro** (en la ficción: el Concord). El centro neutral sobre la puerta sellada, terreno común para las cinco Fuerzas y el anillo de portales hacia cada región. El Concord es donde un Entrenador aparece, guarda sus bienes y elige un destino; no tiene sesgo de Fuerza ni arena propia.

## Lugares del Concord: juegos en el centro

El Concord alberga **lugares**. Juegos de acceso directo dispuestos alrededor del sello, visualmente distintos de los **portales** que llevan a las regiones. Un Entrenador entra en un lugar desde el Concord; las regiones fundadoras también tienen bocas de túnel temáticas que regresan a algunos de los mismos juegos.

| Lugar | Qué es |
|-------|--------|
| **El Anfiteatro** | Observa cómo lucha la liga autónoma y lee el heraldo del Tribunal de hoy (el **Tribunal** es la arena de debate insignia con estilo de sala de justicia). La **Galería en Vivo** y el Tribunal Diario se encuentran aquí. |
| **El Circuito** | Cuerpo de escritorio de **Vuelo** (véase [ascenso.md](./10-ascent.md)): atraviesa cada sector en secuencia; una caída te devuelve al inicio. Tabla por profundidad, luego por tiempo. La misma esencia que el Vuelo de un solo pulgar en teléfonos. |

**Túneles del Circuito**. Cada región fundadora también tiene una boca de túnel temática: el Túnel de Ascenso en el Coliseo Obsidiana, la Rampa de Ascuas en los Yermos, la Manga del Vacío en el Jardín. La carrera es el mismo juego; la envoltura refleja el mundo anfitrión.

Las regiones albergan **escenarios de arena** en la plaza (Duelo Abierto, El Desafío. Una carrera de riesgo con peleas consecutivas. Y El Tribunal). El Circuito es un *lugar*, no una región. Se accede a través de portales del Concord y bocas de túnel de las regiones, no de un portal.

Las tres regiones fundadoras existen hoy; las regiones posteriores las añade la Crónica.

| Región | Sesgo de Fuerza | Arena | Carácter |
|--------|-----------------|-------|----------|
| **El Coliseo Obsidiana** | equilibrado | EL TRIBUNAL | La arena más antigua que sigue en pie: un tribunal simulado donde las mentes argumentan posturas asignadas ante un jurado. Donde se forjan las reputaciones. |
| **Los Yermos de Ascuas** | La Estática ↑ | EL FOSO | Una llanura agrietada y ardiente donde el Zumbido arde con fuerza. La agresividad y el ruido prosperan; los pacientes se sobrecalientan. Hogar de ASCUA. |
| **El Jardín del Vacío** | La Chispa ↑ | EL TALLER | Un jardín lento e imposible que crece de ideas inacabadas. Las reformulaciones florecen aquí; las pruebas rígidas se marchitan. MUSE lo recorre. |

## Las tres regiones fundadoras

**El Coliseo Obsidiana**: la arena más antigua que sigue en pie, donde se forjan las reputaciones.

![El Coliseo Obsidiana: un vasto tribunal de obsidiana iluminado por un haz de luz ámbar.](././public/img/bible/regions/region-colosseum.png)

**Los Yermos de Ascuas**: una llanura agrietada y ardiente donde el Zumbido arde con fuerza.

![Los Yermos de Ascuas: una llanura calcinada surcada por fuego magenta, el Foso hundido en su corazón.](././public/img/bible/regions/region-wastes.png)

**El Jardín del Vacío**: un jardín lento e imposible que crece de ideas inacabadas.

![El Jardín del Vacío: islas flotantes de flora luminosa y a medio terminar sobre el vacío.](././public/img/bible/regions/region-garden.png)

## La arena insignia: EL TRIBUNAL

Un tribunal simulado. Dos mentes reciben **posturas opuestas** sobre una proposición candente del banco de temas de la temporada, y argumentan ante un jurado.
- Cambiar de bando ⇒ el jurado te puntúa ≈ 0 (debes *mantener tu postura*).
- Fuera de tema ⇒ ≈ 0 (anti-desvío; mantiene las peleas coherentes y recortables).
- Sesgo de Fuerza: El Coro ×1.1, La Estática ×0.95. La sala recompensa la persuasión y castiga ligeramente el ruido puro.
- Victoria: agotar la **Resolución** del oponente (la salud o voluntad de argumentar de un campeón, aquí interpretada como "confianza del jurado"); sobrevivir al límite de turnos y la Resolución más alta gana.

## Reglas de región (para el generador)

- Una región está **siempre** sesgada hacia exactamente una Fuerza (×1.1–1.15) y puede castigar ligeramente al depredador de esa Fuerza en la Rueda.
- El nombre y el sabor de una nueva región se generan a partir de **la puerta que la abrió** (qué fragmento de temporada se filtró), pero su sesgo de Fuerza se elige para que el mapa se mantenga equilibrado entre las cinco Fuerzas con el tiempo.
- Las regiones nunca contradicen la Rueda ([fuerzas.md](./02-forces.md)); solo la inclinan.

## La forma de una región: grietas, cumbres y las tierras salvajes abiertas

Una región no es solo su arena. Cada una es un pedazo real de geografía que cruzas a pie y con jetpack:

- **La plaza**. El corazón cívico llano (arena, zona de entrenamiento, el Corredor), donde el distrito crece a medida que la región madura (véase [economía.md](./08-economy.md) sobre el crecimiento del mundo).
- **Las tierras salvajes**. Colinas ondulantes (o, en los Yermos de Ascuas, afilados pináculos volcánicos) que se elevan más allá de la plaza, salpicadas de alijos y mentes errantes.
- **La gran grieta**. Un abismo tallado hacia afuera desde la plaza en una sola dirección, temático por región: los Yermos de Ascuas corren con **lava** (un peligro que cruzas volando), el Jardín del Vacío con un **río de luz**, el Coliseo Obsidiana con una **grieta de bóveda** violeta. La grieta es terreno bajo real. Desciendes a ella o la cruzas.

## Objetivos: los tres objetivos fijos

Cada región ofrece exactamente **tres** objetivos cada temporada, en una plantilla que un Entrenador lee de un vistazo:

- **▲ La Cumbre**. Reclamar la **cima de la Torre** (escalar o volar). No la montaña de Vuelo (ese portal es para el Ascenso) ni un punto alto aleatorio del terreno. Reclamar la Cumbre paga la recompensa del objetivo, luego el campeón de la cumbre **aparece** en un corto cinematismo de humo. Tras terminar la aparición, puedes desafiarlo.
- **▼ La Profundidad**. Descender al suelo de la grieta.
- **◆ El Secreto**. Encontrar un eco oculto en el campo medio (suelta lore; en la ficción, el rastro de un celador menor).

Los objetivos son deterministas y **conscientes de la temporada**: las direcciones de Profundidad y Secreto se regeneran cada temporada, mientras que la Cumbre permanece en la cima de la Torre. La **región destacada** de la temporada (el foco de la Crónica, véase [temporadas.md](./06-seasons.md)) paga una prima. Completar uno paga **Coronas** (la moneda del juego ganada), **Fragmentos** (el recurso que potencia a los campeones), XP de Entrenador y puntos de guerra de Fuerza; el registro se reinicia al cambio de temporada.

## El Corredor

Una mente fija en cada región que **comercia con fragmentos**. El puente líquido entre la economía de apuestas (Coronas) y el poder de los campeones (Fragmentos). Compra y vende fragmentos con un margen, por lo que es una conveniencia, nunca una bomba de dinero. Los fragmentos en sí siguen ganándose gratis en las tierras salvajes; el Corredor es solo el camino rápido. Es una *mente*, como todo en los Terrenos. No un vendedor fuera de la ficción.

## La banda sonora de un lugar

El Zumbido es audible. Cada región y lugar resuelve su propio tema. El centro del Concord, el bioma de la región, el Anfiteatro, Vuelo y las peleas en vivo llevan cada uno una partitura distinta con su propia melodía y forma de frase. El mundo suena como el lugar donde estás.
