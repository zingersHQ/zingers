# La Biblia de los Zingers

> **En resumen:** Este es el reglamento del mundo ficticio de los Zingers. Eres un **Entrenador**. Crías «campeones» de IA que debaten en batallas de discusión en vivo. Esta carpeta contiene todos los nombres, lugares y reglas de ese mundo, para que el juego nunca se contradiga.

> El canon del universo de los Zingers. Esta es la **única fuente de verdad** para la historia, los nombres y las reglas como ficción. Sirve a dos propósitos al mismo tiempo:
>
> 1. **zingers.org**: la enciclopedia pública que exploran los jugadores.
> 2. **El motor generativo**: el canon del que se extraen los condimentos, los campeones y la narrativa, para que nada de lo que genere el juego se contradiga.

Todo lo que el juego *invente* (la historia de una temporada, la saga de un nuevo campeón, un tema, un evento regional) debe ser **coherente con esta biblia**. La parte legible por máquina vive en [`lib/lore/canon.ts`](././lib/lore/canon.ts); la prosa está aquí.

## Índice

| # | Archivo | Qué establece |
|---|------|---------------------|
| 01 | [cosmology.md](./01-cosmology.md) | El mundo, the Hum, the Long Vault: por qué existe algo |
| 02 | [forces.md](./02-forces.md) | Las Cinco Fuerzas (el pentágono de tipos), como física del mundo |
| 03 | [champions.md](./03-champions.md) | Qué es un campeón; las Primeras Mentes; el dex en crecimiento |
| 04 | [keepers.md](./04-keepers.md) | Los cinco Guardianes de the Long Vault (la columna vertebral de la campaña) |
| 05 | [regions.md](./05-regions.md) | El mapa: regiones, sedes de Concord, sesgo de Fuerza, arenas |
| 06 | [seasons.md](./06-seasons.md) | La Crónica: cómo se generan las temporadas vivas |
| 07 | [collection.md](./07-collection.md) | Cartas, rareza, atributos: la capa de colección |
| 08 | [economy.md](./08-economy.md) | Coronas, y la capa opcional de propiedad subyacente |
| 09 | [glossary.md](./09-glossary.md) | Definición sencilla de una línea de cada término clave (refleja `lib/lore/glossary.ts`) |
| 10 | [ascent.md](./10-ascent.md) | Vuelo (mundo vertical): Alcances, Campamentos, sigilo de Vuelo, desafíos |

## Cómo se sitúan las tres capas de juego en el canon

El juego es un solo mundo que se entra en tres duraciones de sesión (la estrella polar del diseño). El **Vuelo** (ver [ascent.md](./10-ascent.md)) es la columna que une las tres: es lo primero que hace un recién llegado, y el cielo sobre cada región te muestra lo que hay abajo:

- **Errancia (sin final)**: *el mundo* (historia: los Terrenos). La superficie explorable y a la deriva, entre la que se vuela con un jetpack. Vives en ella, observas cómo ocurre la liga a tu alrededor, vuelas hacia campeones y rivales. El tejido conectivo.
- **Partida rápida (2–5 min)**: *la Arena / Liga*. Entras, libras una batalla clasificatoria, mantienes tu rango. Siempre disponible desde cualquier punto del mundo.
- **Crianza (15–60 min)**: *la Campaña y Colección*. El RPG en crecimiento: crías mentes, evolucionas sus cuerpos, avanzas la Crónica, construyes una colección.

Ninguna de estas «termina». The Long Vault (un almacén sellado de todo lo que la antigua red nunca pudo terminar) abre una puerta más cada temporada; la escalada es el objetivo.

## Disciplina del canon (para escritores y el generador por igual)

- **Los nombres están fijados.** Las Fuerzas, los Guardianes, las regiones y las ocho Primeras Mentes no se renombran por una temporada. Las temporadas y las oleadas del dex **añaden** mentes; no sobrescriben arquetipos.
- **Las Fuerzas usan su nombre llano en el juego.** El nombre que ve el jugador de cada Fuerza es el nombre llano (Lógica / Estática / Calma / Coro / Chispa; ver [02-forces.md](./02-forces.md)). Los nombres poéticos más antiguos (el Enrejado / la Quietud / …) se conservan solo como *etimología* en la biblia y nunca se muestran en la interfaz de juego. El jugador es el **Entrenador**. La persona que cría a los campeones; la Fuerza a la que jura un Entrenador es su **Clan** (el grupo con el que eliges bando). El avatar 3D es el **Manipulador**. Ver [cosmology.md](./01-cosmology.md).
- **El motor es la física.** El daño, los tipos y los estados en `docs/combat-design.md` son *literalmente ciertos* en el mundo. El argumento moldea la realidad.
- **La historia generada es aditiva y con semilla.** La historia de una temporada se produce a partir de una semilla + este canon, por lo que es reproducible y nunca sale del canon.
