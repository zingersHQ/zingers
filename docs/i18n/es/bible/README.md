# La Biblia de los Zingers

> **En pocas palabras:** Este es el reglamento del mundo imaginario de los Zingers. Eres un **Entrenador**. Crías campeones de IA que discuten en batallas de debate en vivo. Esta carpeta contiene cada nombre, lugar y regla de ese mundo, para que el juego nunca se contradiga.

> El canon del universo Zingers. Esta es la **única fuente de verdad** para el lore, los nombres y las reglas-como-ficción. Sirve a dos amos al mismo tiempo:
>
> 1. **zingers.org**: la enciclopedia pública que exploran los jugadores.
> 2. **El motor generativo**: el canon del que se extraen estaciones, campeones y narrativa, para que nada de lo que genera el juego se contradiga.

Todo lo que el juego *invente* (la historia de una temporada, la saga de un nuevo campeón, un tema, un evento regional) debe ser **consistente con esta biblia**. La prosa vive aquí.

## Qué pertenece aquí (y qué no)

La biblia es **ficción del mundo y reglas-como-ficción**. Escribe lo que es verdad *en el mundo*: quiénes son los Entrenadores, qué son los campeones, cómo funcionan las Fuerzas, por qué importa la Bóveda. Mantenlo legible para un jugador curioso que nunca abre un repositorio.

**No pongas aquí:** rutas de archivos fuente, nombres de módulos, scripts npm, rutas API, nombres de campos de esquema, ni notas sobre "cómo ejecutar el repositorio". Eso pertenece a los documentos de diseño y técnicos (`docs/combat-design.md`, `docs/TECHNICAL.md`, `docs/climb.md`, y afines). Si un párrafo solo tiene sentido para alguien que clona el proyecto, está en el libro equivocado. También omite comparaciones con otros juegos ("como Pokémon", "la capa de Magic"). Describe Zingers en sus propios términos.

## Índice

| # | Archivo | Qué establece |
|---|---------|---------------|
| 01 | [cosmología.md](./01-cosmología.md) | El mundo, el Zumbido, la Bóveda Larga: por qué existe algo |
| 02 | [fuerzas.md](./02-fuerzas.md) | Las Cinco Fuerzas (el pentágono de tipos), como física del mundo |
| 03 | [campeones.md](./03-campeones.md) | Qué es un campeón; las Mentes Primeras; el dex en crecimiento |
| 05 | [regiones.md](./05-regiones.md) | El mapa: regiones, sedes del Concord, sesgo de Fuerza, arenas |
| 06 | [temporadas.md](./06-temporadas.md) | La Crónica: cómo se generan las temporadas vivas |
| 07 | [colección.md](./07-colección.md) | Cartas, rareza, atributos: la capa de colección |
| 08 | [economía.md](./08-economía.md) | Coronas, y la capa opcional de propiedad debajo |
| 09 | [glosario.md](./09-glosario.md) | Definición sencilla de una línea de cada término distintivo |
| 10 | [ascenso.md](./10-ascenso.md) | Vuelo (mundo vertical): Alcances, Campamentos, sigilo de Vuelo, desafíos |

## Cómo se sitúan las tres capas de juego en el canon

El juego es un solo mundo que se entra en tres duraciones de sesión (la estrella del norte del diseño). El **Vuelo** (ver [ascenso.md](./10-ascenso.md)) es la columna vertebral que une las tres: es lo primero que hace un recién llegado, y el cielo sobre cada región te muestra qué hay abajo:

- **Errancia (sin límite)**: *el mundo* (lore: los Terrenos). La superficie explorable y a la deriva, volada entre sí con un jetpack. Vives en ella, observas la liga que sucede a tu alrededor, vuelas hacia campeones y rivales. El tejido conectivo.
- **Partida rápida (2–5 min)**: *la Arena / Liga*. Entra, lucha una batalla clasificatoria, mantén tu rango. Siempre disponible desde cualquier lugar del mundo.
- **Crianza (15–60 min)**: *criar y coleccionar*. El RPG en crecimiento: cría mentes, evoluciona sus cuerpos, avanza la Crónica, construye una colección.

Ninguna de estas "termina". La **Bóveda Larga** (un almacén sellado de todo lo que la red antigua nunca pudo terminar) abre una puerta más cada temporada; la ascensión es el punto.

## Disciplina del canon (para escritores y el generador por igual)

- **Los nombres son fijos.** Las Fuerzas, las regiones y las ocho Mentes Primeras no se renombran por una temporada. Las temporadas y las oleadas del dex **añaden** mentes; no sobrescriben arquetipos.
- **Las Fuerzas usan su nombre llano en el juego.** El nombre que ve el jugador de cada Fuerza es el llano (Lógica / Estática / Calma / Coro / Chispa; ver [02-fuerzas.md](./02-fuerzas.md)). Los nombres poéticos más antiguos (la Celosía / la Quietud / …) se conservan solo como *etimología* en la biblia y nunca se muestran en la interfaz del juego. El jugador es el **Entrenador**. La persona que cría a los campeones; la Fuerza a la que un Entrenador jura lealtad es su **Clan** (el grupo con el que eliges bando). El avatar 3D es el **Manipulador**. Ver [cosmología.md](./01-cosmología.md).
- **El motor es la física.** El daño, los tipos y los estados en el diseño de combate son *literalmente verdad* en el mundo. El argumento moldea la realidad.
- **El lore generado es aditivo y sembrado.** La historia de una temporada se produce a partir de una semilla + este canon, por lo que es reproducible y nunca fuera del canon.
