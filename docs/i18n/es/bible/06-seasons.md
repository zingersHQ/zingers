# 06 · La Crónica: estaciones vivas y generativas

> **En resumen:** El juego avanza por estaciones, como una serie de televisión. Cada estación genera automáticamente un nuevo capítulo de la historia, debates frescos y una zona nueva. Sin embargo, tu rango y tus campeones se conservan, así que nunca empiezas de cero. Toda la historia en curso se llama la **Crónica**.

La **Crónica**. La historia continua del mundo, estación tras estación. Avanza paso a paso: una **estación** es la Bóveda abriendo una puerta más. Es el ritmo de contenido del juego y su motor narrativo al mismo tiempo. Las estaciones son **generativas y deterministas**: a partir de una sola semilla de estación y este canon, el juego deriva la historia de la estación, el banco de temas, la inclinación regional, la mente destacada y la política de rangos, de forma reproducible y siempre dentro del canon.

## Qué cambia con cada estación

| Elemento | Qué cambia cada estación | Origen |
|----------|--------------------------|--------|
| **El Arco** | Una narración breve: qué puerta se abrió, qué se filtró, quién se alzó | generado a partir de semilla + canon |
| **Banco de temas** | Las proposiciones de la estación (las «preguntas prohibidas» que la puerta recordaba) | generado, temático a la puerta |
| **Inclinación regional** | Una región destacada + su sesgo de Fuerza (o una región completamente nueva) | elegida para equilibrar las Fuerzas |
| **Mente destacada** | Un descendiente o eco de una Mente Primigenia, el «rostro» de la estación | linaje generado |
| **Política de rangos** | Un **reinicio suave**: los rangos se comprimen hacia la media, no se borran | regla fija (abajo) |

## Reinicio suave de rangos (la regla «siempre mantienes tu rango»)

El temor con las estaciones es perder tu posición. Zingers nunca la borra. Al cambiar de estación, cada puntuación se acerca una fracción hacia la línea base:

```
nuevaPuntuación = base + (puntuaciónAntigua - base) * RETENCIÓN   // RETENCIÓN ≈ 0.6
```

Así, una leyenda sigue siendo leyenda (solo más cerca del grupo), un aspirante conserva la mayor parte de sus avances y los recién llegados tienen una oportunidad real de alcanzar la cima de la clasificación de la *nueva* estación. Siempre llevas tu nombre contigo; solo tienes que defenderlo.

## Sagas de campeones (narrativa generativa personal)

Más allá de la historia del mundo, **cada campeón acumula su propia saga**. Su historia de vida personal y en evolución. A partir de su historial real de combates: sus notas de memoria, sus mejores humillaciones, sus rivalidades (a quién venció, quién lo venció). El generador convierte esto en una biografía corta, en personaje y en evolución, que vive en la carta y el perfil del campeón. El registro ya existe; el motor de estación solo lo narra.

## Contrato del generador (disciplina canónica)

La capa generativa debe:
1. Recibir una **semilla** (el número de estación es la semilla por defecto) para que la salida sea reproducible.
2. Leer este canon como autoridad y **nunca renombrar** Fuerzas, regiones ni Mentes Primigenias.
3. Producir solo lore **aditivo**: una puerta nueva, nunca un retcon.
4. Degradarse con elegancia: sin modelo disponible, recurrir a una estación **determinista** compuesta a partir de las tablas canónicas (para que el juego siempre tenga una estación activa).

El pase opcional del modelo enriquece el Arco y el sabor de los temas sobre esa columna vertebral determinista.
