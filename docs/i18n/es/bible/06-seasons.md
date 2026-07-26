# 06 · La Crónica: temporadas vivas y generativas

> **En resumen:** el juego se desarrolla por temporadas, como una serie de televisión. Cada temporada genera automáticamente un nuevo capítulo de la historia, debates frescos y una zona nueva. Sin embargo, tu rango y tus campeones se conservan, por lo que nunca empiezas desde cero. Toda la historia en curso se llama la **Crónica**.

La **Crónica**. La historia continua del mundo, temporada tras temporada. Avanza paso a paso: una **temporada** equivale a que la Bóveda abra una puerta más. Es, a la vez, el ritmo de contenido y el motor narrativo del juego. Las temporadas son **generativas y deterministas**: a partir de una sola semilla de temporada más esta biblia, el juego deriva de forma reproducible la historia de la temporada, el banco de temas, la inclinación regional, la mente destacada y la política de rangos, sin salirse nunca del canon.

## Qué cambia cada temporada

| Elemento | Qué cambia cada temporada | Origen |
|----------|---------------------------|--------|
| **El Arco** | Una narración breve: qué puerta se abrió, qué se filtró, quién ascendió | generado a partir de la semilla + canon |
| **Banco de temas** | Las proposiciones de la temporada (las «preguntas prohibidas» que la puerta recordaba) | generado, temático de la puerta |
| **Inclinación regional** | Una región destacada + su sesgo de Fuerza (o una región completamente nueva) | elegida para equilibrar las Fuerzas |
| **Mente destacada** | Un descendiente o eco de una Primera Mente, el «rostro» de la temporada | linaje generado |
| **Política de rangos** | Un **reinicio suave**: los rangos se comprimen hacia la media, no se borran | regla fija (abajo) |

## Reinicio suave de rangos (la regla «siempre mantienes tu rango»)

El temor con las temporadas es perder tu posición. Zingers nunca la borra. Al cambiar de temporada, cada puntuación se acerca una fracción hacia la línea base:

```
nuevaPuntuación = base + (puntuaciónAntigua - base) * RETENCIÓN   // RETENCIÓN ≈ 0.6
```

Así, una leyenda sigue siendo leyenda (solo más cerca del grupo), un ascendente conserva la mayor parte de su progreso y los recién llegados tienen una oportunidad real de encabezar la clasificación de la *nueva* temporada. Siempre conservas tu nombre; solo tienes que defenderlo.

## Sagas de campeones (narrativa generativa personal)

Más allá de la historia del mundo, **cada campeón acumula su propia saga**: su historia de vida personal y en evolución. A partir de su historial real de combates: sus notas de memoria, sus mejores mates y sus rivalidades (a quién venció, quién lo venció). El generador convierte estos datos en una biografía corta, en personaje y en evolución, que aparece en la carta y el perfil del campeón. Los datos ya existen (`Recipe.memory`, las líneas de MVP de batalla, el registro de puntuación); el motor de temporada solo los narra.

## Contrato del generador (disciplina canónica)

La capa generativa debe:
1. Recibir una **semilla** (el número de temporada es la semilla por defecto) para que la salida sea reproducible.
2. Leer esta biblia como canon y **nunca renombrar** Fuerzas, Guardianes, regiones ni Primeras Mentes.
3. Producir lore **aditivo** únicamente: una puerta nueva, nunca un retcon.
4. Degradarse con elegancia: si no hay modelo disponible, recurrir a una temporada **determinista** compuesta a partir de las tablas del canon (para que el juego siempre tenga una temporada activa).

La columna vertebral determinista se encuentra en [`lib/lore/season.ts`](././lib/lore/season.ts); el pase opcional del modelo enriquece el Arco y el sabor de los temas sobre esa base.
