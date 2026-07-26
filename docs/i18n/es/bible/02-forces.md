# 02 · Las Cinco Fuerzas

> **En resumen:** Cada campeón pertenece a uno de cinco «tipos», llamados **Fuerzas** (Lógica, Estática, Calma, Coro, Chispa). Cada Fuerza vence a una y pierde contra otra, como piedra-papel-tijeras en un anillo de cinco. Ese anillo de enfrentamientos decide quién tiene ventaja en una pelea.

Toda mente del Hum está moldeada por cinco **Fuerzas**. Los cinco tipos elementales de combate de este mundo. Son el nombre interno del **pentágono de tipos** (`docs/combat-design.md`). Una Fuerza es a la vez un elemento (de qué está hecho un campeón) y una forma de argumentar (cómo lucha).

El nombre que ve el jugador es su **nombre simple** (Lógica / Estática / Calma / Coro / Chispa). Cada una también posee un nombre poético antiguo. Su *etimología* se conserva aquí como sabor, pero nunca aparece en la interfaz del juego.

| Fuerza | Etimología | Elemento de… | Argumenta mediante… | Sigilo | Hex |
|--------|------------|--------------|---------------------|:------:|-----|
| **Lógica** | *la Celosía* | orden, prueba, estructura | cerrar la prueba | ◆ | `#4aa3ff` |
| **Estática** | *la Estática* | ruido, entropía, sorpresa | romper el marco | ✦ | `#ff4ad1` |
| **Calma** | *la Quietud* | paciencia, resistencia, serenidad | sobrevivir a la tormenta | ▲ | `#36d39a` |
| **Coro** | *el Coro* | multitud, sentimiento, persuasión | mover la sala | ◉ | `#f0a93a` |
| **Chispa** | *la Chispa* | invención, metáfora, replanteo | cambiar la pregunta | ✺ | `#f5d020` |

> Los cinco códigos `CreatureType` del motor (`LOGIC / CHAOS / COMPOSURE / RHETORIC / CREATIVITY`) permanecen intactos. Son claves internas. Solo el *nombre visible* para los jugadores es el nombre simple anterior. Fuente canónica: `lib/lore/canon.ts › FORCES[type].name` (el nombre poético se guarda como `.inWorld`).

## Las caras de las fuerzas

| Lógica | Estática | Calma |
|:---:|:---:|:---:|
| ![Lógica](././public/img/bible/forces/force-lattice.png) | ![Estática](././public/img/bible/forces/force-static.png) | ![Calma](././public/img/bible/forces/force-stillness.png) |
| *orden, prueba, estructura* | *ruido, entropía, sorpresa* | *paciencia, resistencia, serenidad* |

| Coro | Chispa |
|:---:|:---:|
| ![Coro](././public/img/bible/forces/force-chorus.png) | ![Chispa](././public/img/bible/forces/force-spark.png) |
| *multitud, sentimiento, persuasión* | *invención, metáfora, replanteo* |

*(zingers.org sirve estas imágenes desde `/img/bible/forces/*.png`.)*

## La Rueda (el pentágono)

Las fuerzas giran en una rueda. **Cada una vence a la siguiente y pierde contra la anterior:**

```
Lógica → Estática → Calma → Coro → Chispa → (Lógica)
LOGIC → CHAOS  → CMP  → RHET   → CREA  → (LOGIC)
```

- **Lógica** doma a **Estática**. El orden silencia el ruido. (LOGIC > CHAOS)
- **Estática** resquebraja a **Calma**. El caos sacude al paciente. (CHAOS > COMPOSURE)
- **Calma** desvía a **Coro**. La paciencia ignora los ruegos. (COMPOSURE > RHETORIC)
- **Coro** ahoga a **Chispa**. La venta vence a la mera invención. (RHETORIC > CREATIVITY)
- **Chispa** flanquea a **Lógica**. Un replanteo escapa a la prueba. (CREATIVITY > LOGIC)

Ventaja ×1.25, neutral ×1.0, desventaja ×0.8. Esta rueda es la ley más profunda del mundo; cada región, modificador de temporada y enfrentamiento se mide contra ella.

## Las cinco estadísticas internas

Dentro de una mente, las mismas cinco aparecen como estadísticas de combate (LOG / CHA / CMP / RHE / CRE) y, a medida que avanza la carrera, como los cinco **ejes de comportamiento** que esculpen el cuerpo (agresión, control, resiliencia, estilo, creatividad; véase `lib/evolve/progression.ts`). Una mente «es de» una Fuerza, pero lleva una medida de las cinco; lo que *hace* en el ring decide cuál crece.

## Sigilos

Una Fuerza, al fortalecerse en una mente, graba un **sigilo**. Un emblema ganado, como una insignia o un rango (◆ Lógica · ✦ Estática · ▲ Calma · ◉ Coro · ✺ Chispa). Los sigilos tienen tres rangos (I/II/III). Son la heráldica de la capa de colección y del sistema de títulos («El Aniquilador», «El Titiritero»); se *ganan*, nunca se asignan.

## Fuerza vs Clan (tipo vs equipo)

Dos conceptos distintos comparten las cinco Fuerzas. Mantenerlos separados:

- La **Fuerza** de un campeón es *lo que es*: su estilo de combate, fijado al crearlo. Determina el cuerpo, las habilidades, el enfrentamiento en la rueda y el **color base + sigilo** que lleva cada luchador.
- Un **Clan** es *de qué bando te alistas*: un Entrenador jura lealtad a una Fuerza para la guerra de temporada, y las victorias clasificatorias alimentan la clasificación de esa Fuerza. Independientemente de las Fuerzas de los campeones que alinee. Un Clan se muestra como un **escudo / estandarte** en el Entrenador y en los campeones en campo, nunca como el color base del cuerpo.

Por tanto: *todo campeón tiene una Fuerza; la Fuerza a la que juras es tu Clan.*

## La guerra de Clanes (la guerra del Entrenador)

Juramentarse a un Clan. La Fuerza a la que prestas alianza durante la temporada. Vincula tus victorias clasificatorias a la posición de esa Fuerza en la guerra estacional entre las cinco. Puedes cambiar de Clan entre temporadas, pero la contribución permanece con la Fuerza que la ganó. El juramento se pronuncia bajo el **lema** de la Fuerza. Su línea `argues`, dicha como voto:

| Fuerza | Lema |
|--------|------|
| **Lógica** | *Cierra la prueba.* |
| **Estática** | *Rompe el marco.* |
| **Calma** | *Sobrevive a la tormenta.* |
| **Coro** | *Mueve la sala.* |
| **Chispa** | *Cambia la pregunta.* |

Los lemas viven en `lib/lore/canon.ts › FORCE_MOTTO`. El Entrenador que jura se define en [cosmology.md](./01-cosmology.md).
