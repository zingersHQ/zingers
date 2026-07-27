# Dirección artística: el canon visual de Zingers

> **En resumen:** Esta es la guía de estilo para todo el arte de Zingers. Define los colores, el ambiente y las reglas que toda imagen generada debe seguir para que el mundo entero parezca un todo coherente.

El aspecto que hace que cada imagen generada se lea como **un solo universo**. Incorpóralo en cada prompt; usa una imagen de referencia con estilo bloqueado en las iteraciones para que un lote nunca se desvíe.

## Paleta

| Rol | Hex | Uso |
|------|-----|-----|
| Vacío (base) | `#0a0812` | fondos, índigo casi negro |
| Campo profundo | `#15102a` | atmósfera del plano intermedio |
| Oro (acento) | `#f5d020` | costuras, destellos, la Bóveda (el almacén sellado en el corazón del mundo), contención |
| **La Retícula** (LÓGICA) | `#4aa3ff` | azul eléctrico |
| **La Estática** (CAOS) | `#ff4ad1` | magenta-rosa |
| **La Calma** (COMPOSTURA) | `#36d39a` | verde menta |
| **El Coro** (RETÓRICA) | `#f0a93a` | ámbar |
| **La Chispa** (CREATIVIDAD) | `#f5d020` | amarillo brillante |

Los colores de Fuerza coinciden con la tabla de Fuerzas en [forces.md](./02-forces.md).

## Medio y lente

- **Arte conceptual cinematográfico pictórico**, no fotorrealista, no vector plano.
- **Luz de borde neón volumétrica** sobre un campo oscuro y brumoso; fuerte profundidad atmosférica.
- Alto detalle, dramático, melancólico. El Zumbido (el campo ambiental del mundo de pensamiento residual) se representa como motas flotantes + texto glífico tenue.
- Un color de fuerza dominante por imagen + acentos dorados. Evita el arcoíris.

## Prohibido (mantiene la calidad premium)

- Sin texto, palabras, logotipos ni marcas de agua renderizadas en la imagen.
- Sin elementos de interfaz, sin marcas modernas o del mundo real.
- Sin gore, sin rostros humanos fotorrealistas (estos son *mentes*, estilizados).
- Sin desorden: un sujeto claro, espacio negativo profundo en el vacío.

## Convenciones de composición

| Grupo | Aspecto | Encuadre |
|-------|--------|---------|
| Escenarios / regiones | 16:9 | plano maestro amplio, profundidad atmosférica |
| Personajes (Mentes) | 4:5 | figura centrada, pose ¾, emblema detrás |
| Fuerzas / iconos | 1:1 | encarnación emblemática centrada, enlosable |

## Cromo de marca (marca de interfaz. No arte bíblico)

La marca de cromo del producto es un **cabeza de robot** vectorial plano (ojos grandes, antena gruesa), no arte bíblico pictórico. Mantén el arte bíblico / compartido pictórico (abajo). No incluyas la marca de robot en las láminas de lore generadas; no incluyas rostros pictóricos en el favicon.

## Archivos e incrustación

- El arte clave vive en `public/img/bible/<grupo>/<slug>.png`
  (`forces/`, `minds/`, `regions/`, `keepers/`, escenarios en la raíz).
- Incrusta en `docs/bible/*.md` con una ruta relativa al repositorio (se renderiza en GitHub).
- zingers.org sirve el mismo archivo en `/img/bible/<grupo>/<slug>.png`.

## Esqueleto de prompt reutilizable

> *[sujeto + pose/escena], encarnación de [nombre en el mundo de la fuerza].*
> Arte conceptual cinematográfico pictórico de ciencia ficción mítica. Fondo de vacío índigo casi negro profundo (`#0a0812`). Color dominante **[hex de fuerza]**, acentos dorados. Luz de borde neón volumétrica, niebla atmosférica, motas flotantes y texto glífico tenue (el Zumbido).
> Alto detalle, dramático, melancólico. Sin texto, sin logotipos, sin marca de agua, sin interfaz. [aspecto].

## Flujo de trabajo de consistencia

1. Mantén `bible-the-grounds-over-the-vault.png` como la **clave de estilo**; pásala como referencia en nuevas generaciones para bloquear paleta y renderizado.
2. Para un personaje recurrente, reutiliza el **primer render aprobado** de ese personaje como referencia para que siga siendo el mismo individuo en su arte de carta y en la biblia.
