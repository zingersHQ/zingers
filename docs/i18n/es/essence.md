# ZINGERS. Esencia y el principio de "Una sola alma, cuerpos nativos"

> **En resumen:** Zingers es un solo juego con una sola alma, pero esa alma está pensada para *jugarse* en hardware muy distinto. Este documento explica cómo mantenemos ambas verdades a la vez: **la alma es idéntica en todas partes**; **el cuerpo que la viste está diseñado para el espacio donde se juega**. Define el "átomo de alma" invariable de cada acción y la regla con la que se mide cualquier nueva función.

Versión 1.0. Julio 2026

> **Nota de dirección (julio 2026, Flight-First):** Este documento descubrió el principio *a través* del Circuito ("el flappy bird se escondía dentro del código", §3). `design-vision.md` v3.0 y [`two-doors.md`](./two-doors.md) v2.0 elevaron ese hallazgo al centro del producto: **la Escalada/Ascenso es ahora la columna vertebral y la cara del juego, no un verbo entre cinco**. Nada del principio ni de los átomos de este documento cambia. Ya estaba bien, y ya coloca la Escalada en primer lugar. Lee las filas de Escalada como *el verbo clave del que cuelgan los demás* y consulta [`flyover.md`](./flyover.md) para ver cómo el vuelo previsualiza todos los demás verbos.

Complemento de [`design-vision.md`](./design-vision.md) (la estrella polar) y [`game-spec.md`](./game-spec.md) (la mecánica). Donde esos documentos dicen *qué* es Zingers, este dice *cómo el mismo Zingers sobrevive al saltar de un teléfono a un escritorio*. La aplicación concreta y construible del principio al teléfono. El bucle principal móvil, la arquitectura de la información y un cuerpo nativo por verbo. Vive en [`mobile.md`](./mobile.md).

## 1. El principio

> **Una sola alma, cuerpos nativos.** El átomo es invariable en cada dispositivo; el cuerpo que lo viste está diseñado. No es una versión recortada ni una ampliación. Está pensado para el hardware que el jugador tiene en las manos.

Es la forma disciplinada de decir "una base, muchos juegos". Rechaza dos modos de fallo que ya han matado juegos multiplataforma:

- **Recorte.** "Móvil es escritorio menos cosas." El teléfono recibe una versión coja y disculpada. (Restricción.)
- **Aumento.** "Escritorio es móvil más brillo." El dispositivo potente recibe un juego móvil delgado con mejor iluminación. (Desperdicio.)

En cambio: cada dispositivo recibe **una experiencia de primera clase, completa por sí sola**, y todas comparten *la misma alma en el pecho*. Así, un jugador que usa teléfono y portátil siente que vive **un solo** juego, contado con la complejidad que la habitación puede soportar.

La diferencia entre dispositivos no está principalmente en la GPU. Está en **los grados de libertad del control**. Un teléfono ofrece una entrada precisa y fiable (el pulgar: toque o mantén); un escritorio ofrece seis (mover, mirar, saltar, empujar y el matiz entre ellas). "Cuerpo nativo" significa: diseña para la entrada que el dispositivo realmente tiene y hazla bella ahí.

## 2. El átomo de alma (lo que nunca puede cambiar)

Para que "una sola alma" sea real y no un eslogan, cada verbo central tiene un **átomo**. El puñado de verdades que deben cumplirse idénticamente en todos los dispositivos. Todo lo que no está en el átomo (cámara, grados de libertad, densidad artística, duración, esquema de control) es **cuerpo**, y los cuerpos son libres. Se anima a que difieran.

| Verbo | Átomo de alma (invariable, todos los dispositivos) | Cuerpo (libre de diferir por dispositivo) |
|-------|----------------------------------------------------|-------------------------------------------|
| **Vuelo** | *Ascendemos*; la altitud es la puntuación; **una caída te devuelve a cero**; la carrera **marca a tu campeón**. | Mantener pulsado con un pulgar vs. vuelo libre de 6 DOF; 2.5D vs. 3D completo. |
| **Espectar** | Dos mentes discuten hasta un **ganador claro** y **tienes algo en juego** en el resultado. | Combate en directo completo vs. breve resumen + predecir al ganador; 6 minutos de visionado vs. 20 segundos de apuesta. Profundidad bajo Vuelo, no la cara de crecimiento (`growth-strategy.md`). |
| **Deambular** | Estás **presente en el mundo sobre la Bóveda Larga**; cuidas y reclamas. | Libre deambular 3D completo vs. superficie de presencia más ligera. |
| **Persuadir** (a los Guardianes) | **Convences a una mente protegida**; el argumento es física; la grieta es **compartible**. | Santuario dentro del mundo vs. una pantalla rápida para romper la defensa. |
| **Clasificación** | Un registro **objetivo y honesto** de la posición. | Cómo y dónde se muestra. |

**La prueba para cualquier función nueva:** nombra su átomo en una sola línea. Si dos versiones de dispositivo comparten esa línea, es un solo juego. Si no, has creado un segundo juego que compite con el alma. Y se aplica la ley del documento de crecimiento: *nunca publiques una experiencia desconectada sin un gancho de subir/evolucionar que vuelva al campeón*.

## 3. Ejemplo práctico. El Circuito es nuestro "flappy bird"

Flappy Bird reducido a su átomo es: *ascenso sostenido contra la gravedad; la altitud es la puntuación; una caída te reinicia a cero.* Eso es **exactamente** el Circuito ([`circuit.ts`](./components/grounds/circuit.ts)): una escalada por sectores, una tabla de clasificación por profundidad y luego tiempo, una caída reinicia desde el sector 1. El jetpack ya es un **booleano de mantener para empujar** ([`jetpack.tsx`](./components/grounds/jetpack.tsx), `flyingRef`). El eje vertical ya es *una sola entrada*. El flappy bird se escondía dentro del código; solo lo envolvimos en seis grados de libertad.

Como el jetpack es **exclusivo del Entrenador** (canon: el campeón lucha, el Entrenador vuela), el Circuito es el *único* lugar donde el jugador actúa con sus propias manos sin romper el pilar "Subir, no Luchar". Es el alma del ejecutante que complementa el alma del espectador.

### Dos cuerpos nativos, una sola alma

| | **Cuerpo móvil** ("guay") | **Cuerpo de escritorio** ("increíble") |
|---|---|---|
| Libertad | un pulgar: mantener para empujar, avance automático, pasar por las puertas | vuelo libre de 6 DOF: mover, mirar, empujar, dirigir la cámara |
| Marco | 2.5D, sobre raíles, el paisaje *viene* hacia ti | 3D completo, *eliges* la línea de ascenso |
| Sensación | metro-instantáneo, un intento más, ragebait | escaparate de transmisión, maestría, drama |
| Diseñado como | su propio juego completo, no una demo | su propio juego completo, no un alarde |

Ninguno es el resto del otro.

### Qué significa una carrera (la recompensa, dividida entre alma y Oficio)

Esto resuelve limpiamente el problema de equidad entre dispositivos:

- **La profundidad es alma → compartida, entre dispositivos.** "A qué altura subiste sobre la Bóveda Larga" es un hecho de lore sobre tu **Entrenador**, no una prueba de reflejos. Por tanto **profundidad → Rango de Entrenador + un sigilo de Vuelo grabado en el cuerpo del campeón.** Una identidad, en todas partes.
- **El tiempo / maestría es oficio → nativo, por dispositivo.** Un tiempo con un pulgar y un tiempo con 6 DOF no pueden compartir honestamente una columna (eso *forzaría* un cuerpo sobre los términos del otro. La restricción que rechazamos). Por tanto **tiempo → Coronas + tablas de clasificación separadas para móvil y escritorio.**

Un registro de *identidad* portátil; dos expresiones honestas de *habilidad*.

### La unificación silenciosa

El pilar n.º 2 de todo el juego es **"Cuerpo = argumento hecho visible."** Si un ascenso estampa un sigilo/aura en el *cuerpo del campeón*, el cuerpo ya no registra solo los debates del campeón. Registra también **las propias escaladas del Entrenador**. El único lugar donde *tú* actúas se pliega de nuevo en el pilar maestro. El flappy bird deja de ser un apéndice y se convierte en otra frase de la autobiografía del campeón.

## 4. El juego completo bajo la lente

El Circuito fue la lente que encontró el principio; el principio rige todo. Cada fila comparte un átomo; cada celda está diseñada para su habitación.

| Verbo | Alma compartida (la base) | Cuerpo móvil | Cuerpo de escritorio |
|-------|---------------------------|--------------|----------------------|
| **Vuelo** | ascender, altitud = puntuación, una caída reinicia, marca al campeón | jetpack de un pulgar | vuelo de 6 DOF |
| **Espectar** | dos mentes discuten, ganador claro, tienes algo en juego | clip de resumen + predecir al ganador | combate SSE en directo completo, razonamiento visible, kit de transmisión |
| **Deambular** | presente en el mundo sobre la Bóveda Larga; cuidar y reclamar | superficie de presencia más ligera | libre deambular 3D completo |
| **Persuadir** | convencer a una mente protegida; el argumento es física; grieta compartible | grieta rápida de una pantalla + racha compartible | dentro del mundo, en el santuario |
| **Clasificación** | posición objetiva y honesta | clasificación compacta + tarjeta | clasificación completa, rivalidades, temporadas |

**La base que nunca se bifurca:** el campeón (carrera, memoria, estrategia, persona, cuerpo derivado de la carrera), las Cinco Fuerzas, el lore/IP y el vocabulario del glosario, el Rango de Entrenador (eterno), las Coronas, la lealtad al Clan y los resultados de la tabla de clasificación.

## 5. Dónde se tensa el principio (seamos honestos)

"Una sola alma, cuerpos nativos" es una herramienta potente, no mágica. Dos puntos donde realmente resiste y hay que tratarlos con los ojos abiertos:

1. **Duración del visionado.** Un combate en directo de 6 minutos es difícil de vender en un teléfono. El principio solo sobrevive si definimos el átomo de espectar como **"se resuelve un concurso y tienes algo en juego"**, *no* "ves todo el combate". Entonces el cuerpo nativo honesto del móvil es **predecir al ganador + un clip de resumen**, y el del escritorio es **el combate en directo completo**. Es exactamente la intuición anterior de que "en móvil no ves combates". Y es correcta, *siempre que* la apuesta (la predicción) preserve el alma. La duración del visionado es cuerpo; tener algo en juego es alma.

2. **"Los Terrenos Están Vivos" vs. un deambular móvil ligero.** El pilar de diseño n.º 4 descarta un "juego basado solo en menús o solo en salas de espera". Un deambular móvil recortado en 2.5D corre el riesgo de violar ese pilar directamente. Solución: el cuerpo de deambular del móvil debe seguir siendo **un lugar donde estás presente** (una superficie viva, no un menú). Geometría más ligera, menos grados de libertad, pero no una lista. Si no podemos mantenerlo como un *lugar*, admitimos que "Los Terrenos Están Vivos" es un pilar liderado por escritorio y damos al móvil una expresión honesta distinta de presencia. Pero tomamos esa decisión a propósito, no por accidente.

## 6. Reglas que crea (para el trabajo futuro)

- **Declara el átomo.** Antes de construir cualquier función en un segundo dispositivo, escribe su átomo de alma en una línea. Si las dos versiones no lo comparten, detente.
- **Diseña nativo, no portes.** Parte de la entrada real del dispositivo (un pulgar / seis DOF), no de la construcción del otro dispositivo.
- **Ambos deben estar completos.** Ninguna versión puede sentirse como la demo o el alarde de la otra. "Bueno por sí solo" es el listón.
- **El alma es compartida, el oficio es nativo.** Los registros de identidad/progresión (profundidad, rango, sigilos, el campeón) son entre dispositivos; las tablas de clasificación de habilidad son por familia de dispositivos.
- **Todo marca al campeón.** Sin puntuaciones desconectadas. Si el jugador lo ejecuta con sus manos, se escribe en el libro de carrera. O no se publica (ley del documento de crecimiento).
