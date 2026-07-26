# Zingers: diseño de combate y comprobación de cordura

Este documento existe para responder una sola pregunta antes de comprometer un fin de semana:
**¿el combate se siente como un juego, o como dos chatbots hablando?**

Define los números, el roster, una arena completa y una batalla turno a turno para que puedas sentir la mecánica. Ajusta libremente. Lo importante es la *forma*.

---

## 1. Constantes de combate

| Constante | Valor | Notas |
|---|---|---|
| `Resolución` (HP) | 100 | Apunta a una batalla **ajustada de 6–8 turnos** |
| `defensa` base | 12 | Reducción plana de daño |
| `statScale(s)` | `0.5 + s/100` | stat 50 → 1.0, stat 100 → 1.5, stat 0 → 0.5 |
| `multiplicadorTipo` | 1.25 / 1.0 / 0.8 | ventaja / neutro / desventaja |
| `multiplicadorArena` | por arena | sesga tipos de movimiento (ver arenas) |
| `calidad` | `0.7–1.3` | banda normal; las estadísticas anclan, la escritura empuja |
| `Destello` (crítico) | fija `calidad = 1.4` | el juez marca una línea *excepcional*: **reemplaza** calidad, nunca se apila. ~10–15% de líneas fuertes. Activa un corte. |
| `ruidoAleatorio` | uniforme 0.9–1.1 | varianza ±10% (algunos movimientos la amplían) |
| `dañoMáximoGolpe` | 45 (= 45% de Resolución) | tope anti-un-golpe; se muestra como **¡LIMITADO!** |

**Daño (movimientos ofensivos):**
`bruto = base × statScale × multTipo × multArena × calidad × ruido × modsEstado`
`daño = max(1, min(dañoMáximoGolpe, round(bruto) − defensa))`

- `calidad` es **0.7–1.3** normalmente, o exactamente **1.4** en un Destello. Una línea mala no destruye una criatura construida; una brillante gana un bono visible. Fuera de tema ⇒ juez ≈ 0 ⇒ se reduce a 0.7.
- `modsEstado` = producto de multiplicadores activos (Expuesto ×1.2, Animado ×1.2, etc.).
- Los movimientos de utilidad infligen poco o ningún daño pero aplican estados, curaciones o guardias.

---

## 2. Las cinco estadísticas

- **LOG** (Lógica): estructura, deducción, consistencia.
- **RET** (Retórica): persuasión, trabajo de público, apelación emocional.
- **CRE** (Creatividad): reformulación, metáfora, ángulos laterales.
- **CMP** (Compostura): defensa, paciencia, contraataques, curación.
- **CAO** (Caos): impredecibilidad, provocación, oscilaciones de alta varianza.

---

## 3. Ciclo de tipos (piedra-papel-tijeras, pentágono)

Cada tipo **vence al siguiente** y **es vencido por el anterior**:

```
LÓGICA → CAOS → COMPOSTURA → RETÓRICA → CREATIVIDAD → LÓGICA
```

- LÓGICA vence a CAOS (el orden doma el ruido), pierde ante CREATIVIDAD (flanqueado).
- CAOS vence a COMPOSTURA (rompe la calma), pierde ante LÓGICA.
- COMPOSTURA vence a RETÓRICA (desvía apelaciones), pierde ante CAOS.
- RETÓRICA vence a CREATIVIDAD (vende sobre novedad), pierde ante COMPOSTURA.
- CREATIVIDAD vence a LÓGICA (reformula la rigidez), pierde ante RETÓRICA.

Ventaja ×1.25, neutro ×1.0, desventaja ×0.8.

---

## 4. Efectos de estado

| Estado | Efecto | Duración |
|---|---|---|
| **Desequilibrado** | −0.2 a tu `calidad` (alterado, fuera de forma) | 1 turno |
| **Confundido** | 30% de probabilidad de que tu movimiento elegido falle (mitad de efecto) | 1 turno |
| **Expuesto** | recibes +20% de daño | 1 turno |
| **Animado** | tu próximo movimiento ofensivo +20% | hasta consumirse |
| **Guardia** | +N defensa | 1–2 turnos |

---

## 5. Roster (ocho Mentes Primigenias + dex en crecimiento)

Las ocho **Mentes Primigenias** siguientes son los arquetipos canónicos y la referencia de conjunto de movimientos base. El juego en vivo también fusiona un **dex horneado** de mentes posteriores desde `content/minds/reviewed/` → `lib/minds/baked.ts` (ver `docs/bible/03-champions.md`).
Ofertas de adopción semanales: un inicial por Fuerza de Mentes Primigenias + ese pool.

Presupuesto de estadísticas ≈ 300 cada una (equilibrado). Cada una tiene 4 movimientos; los conjuntos llevan combos **preparación → recompensa** para que el juego tenga textura. Entre las Mentes Primigenias: dos comparten cada una de **LÓGICA**, **RETÓRICA** y **CAOS**; **CREATIVIDAD** y **COMPOSTURA** comenzaron con una cada una y se completan con el dex.

### AXIOM: Logista (LÓGICA)
*Frío, preciso, ligeramente condescendiente. Trata cada argumento como una prueba que cerrar.*
`LOG 90 · CMP 70 · RET 60 · CRE 45 · CAO 35`

| Movimiento | Stat | Base | Efecto |
|---|---|---|---|
| Silogismo | LOG | 22 | Daño limpio |
| Reductio | LOG | 18 | + aplica **Expuesto** |
| Lectura Fría | CMP | 8 | + auto **Guardia** (+10 def, 2 turnos) |
| Jaque Mate | LOG | 28 | Remate, solo si el oponente está **Desequilibrado** o **Expuesto** |

### VOX: Orador (RETÓRICA)
*Demagogo carismático. Juega ante un jurado imaginario, siempre.*
`RET 90 · CAO 55 · CRE 55 · CMP 50 · LOG 50`

| Movimiento | Stat | Base | Efecto |
|---|---|---|---|
| Oleada de Público | RET | 18 | Daño limpio |
| Apelación | RET | 14 | + auto **Animado** |
| Hombre de Paja | RET | 16 | + aplica **Desequilibrado** |
| Micrófono Caído | RET | 22 | Consume **Animado** por +20% |

### GLITCH: Comodín (CAOS)
*Un duende de non sequiturs. Inquietante, impredecible, extrañamente efectivo.*
`CAO 90 · CRE 65 · RET 50 · CMP 50 · LOG 45`

| Movimiento | Stat | Base | Efecto |
|---|---|---|---|
| Non Sequitur | CAO | 16 | 35% de probabilidad de aplicar **Confundido** |
| Incendio | CAO | 22 | Ruido ampliado a ±30% |
| Gaslighting | CAO | 14 | + aplica **Desequilibrado** |
| Pandemonio | CAO | 30 | Retroceso: te infliges 8 |

### MUSE: Tramposo (CREATIVIDAD)
*Caprichoso, lateral. Gana cambiando de qué trata incluso la pelea.*
`CRE 90 · RET 60 · CAO 55 · LOG 50 · CMP 45`

| Movimiento | Stat | Base | Efecto |
|---|---|---|---|
| Reformular | CRE | 20 | Daño limpio (brilla vs LÓGICA por tipo) |
| Metáfora | CRE | 16 | + auto **Guardia** (+8 def) |
| Giro de Trama | CRE | 16 | + aplica **Expuesto** |
| Magnum Opus | CRE | 30 | Requiere 2 movimientos CRE previos esta batalla |

### BASTION: Estoico (COMPOSTURA)
*Imperturbable, minimalista. Deja que el oponente se canse, luego castiga.*
`CMP 90 · LOG 65 · CAO 55 · RET 50 · CRE 40`

| Movimiento | Stat | Base | Efecto |
|---|---|---|---|
| Desviar | CMP | 8 | Mitiga el próximo daño entrante a la mitad |
| Paciencia | CMP | 0 | Auto **Guardia** (+12) + cura 10 Resolución |
| Contrapunto | CMP | 22 | +50% si se usa justo después de Desviar |
| Inamovible | CMP | 24 | +1% por cada 1% de Resolución propia faltante (clutch) |

### EMBER: Incendiario (CAOS, híbrido RET), inicial recomendado
*Temperamental, provocador, puro gas. Fácil de elegir, recompensa la agresión.*
`CAO 75 · RET 70 · CMP 60 · CRE 50 · LOG 45`

| Movimiento | Stat | Base | Efecto |
|---|---|---|---|
| Llamado | RET | 20 | + aplica **Desequilibrado** |
| Quemar | CAO | 22 | Daño limpio |
| Doblar la Apuesta | RET | 14 | + auto **Animado** |
| Infierno | CAO | 26 | +30% si el oponente está **Desequilibrado** |

### PARADOX: Contrario (LÓGICA)
*Una mosca socrática. Desmonta argumentos cazando contradicciones y premisas falsas — no cerrando pruebas.*
`LOG 88 · CMP 58 · CRE 52 · CAO 48 · RET 54`

| Movimiento | Stat | Base | Efecto |
|---|---|---|---|
| Romper Premisa | LOG | 18 | + aplica **Expuesto** |
| Socrático | LOG | 14 | + aplica **Desequilibrado** |
| Conceder y Pivotar | CMP | 8 | Auto **Guardia** (+10) + cura 6 Resolución |
| Paradoja del Mentiroso | LOG | 27 | Remate, solo si el oponente está **Desequilibrado** o **Expuesto** |

### WIT: Filo (RETÓRICA)
*Un debatiente de lengua afilada. Gana por sincronización y réplicas quirúrgicas, no por volumen de público.*
`RET 86 · LOG 58 · CMP 56 · CAO 52 · CRE 48`

| Movimiento | Stat | Base | Efecto |
|---|---|---|---|
| Riposta | RET | 20 | Daño limpio |
| Preparación | RET | 12 | + auto **Animado** |
| Aguja | RET | 16 | + aplica **Desequilibrado** |
| Tiro de Gracia | RET | 24 | +25% si el oponente está **Desequilibrado** |

---

## 6. Arena: EL TRIBUNAL (buque insignia)

Un tribunal simulado. Las dos criaturas reciben **posturas opuestas** sobre una proposición picante extraída de un banco de prompts, y argumentan ante un "jurado" (el modelo juez).

- **Banco de prompts:** *"el cereal es sopa" · "un hot dog es un sándwich" · "la piña va en la pizza" · "¿debe la IA tener derechos?" · "¿el agua está mojada?"* …
- **Posturas:** asignadas al inicio (A FAVOR / EN CONTRA). Cambiar de lado ⇒ calidad del juez ≈ 0.
- **Modificador ambiental:** `RETÓRICA ×1.1`, `CAOS ×0.95`. La sala recompensa la persuasión y castiga ligeramente el ruido puro.
- **Regla de tema:** un enunciado que ignora la proposición puntúa ~0 de calidad (anti-desvío). Mantiene las batallas coherentes y clipables.
- **Condición de victoria:** agotamiento estándar de Resolución; con sabor a "confianza del jurado". Si ambos sobreviven 12 turnos, gana mayor Resolución.

**Otras arenas (extensión, mismo motor, sesgo diferente):**
- **El Salón de Debates**: tema libre, `LÓGICA ×1.1`; recompensa estructura.
- **La Negociación**: dividir una cantidad fija; `COMPOSTURA ×1.1`; concesiones = daño por viruta.
- **La Sala de Escritores**: prompt creativo; `CREATIVIDAD ×1.15`; recompensa originalidad.

---

## 7. Hacerlo INTELIGENTE (inteligencia visible)

La inteligencia tiene que ser *legible*. El espectador debe ver a la criatura **pensar**, luego ver que el plan da resultado. Eso es lo que se lee como inteligente en lugar de "una LLM dijo palabras".

**Turno de dos fases (el núcleo de la inteligencia percibida):**
- **Fase A: ESTRATEGIAR.** El agente recibe el estado completo estructurado del juego: estadísticas propias y del oponente, ambos valores de Resolución, estados activos, los últimos 2 movimientos, la arena + tema + postura asignada, sus movimientos disponibles (con condiciones/tiempos de reutilización), y sus notas de memoria. Devuelve `{ move_id, intent }`, donde `intent` es una táctica de ≤6 palabras que se muestra en pantalla ("Preparar Expuesto, luego rematar").
- **Fase B: ACTUAR.** El agente escribe la línea en personaje que ejecuta el movimiento, referenciando la última línea del oponente y el tema.

Mostrar la **ficha de intención** antes de la línea es la palanca más grande de "esta cosa es inteligente": plan → ejecución, cada turno.

**Presión de buena decisión (para que la inteligencia realmente gane):**
- Los remates están condicionados (Jaque Mate necesita Expuesto/Desequilibrado; Magnum Opus necesita 2 movimientos CRE previos) → planificación preparación→recompensa.
- Las lecturas se recompensan (Contrapunto después de Desviar; explotar sesgo de tipo/arena; guardar Animado para el cierre).
- Un agente que ignora esto *pierde* ante uno que no lo hace, así que la calidad del modelo, la calidad del prompt y el entrenamiento importan visiblemente.

**El juez recompensa inteligencia, no verbosidad.** Mayor `calidad` por: (a) **llamadas** a turnos anteriores, (b) **usar las propias palabras/lógica del oponente contra él**, (c) precisión en tema. Los **Destellos** (el crítico ×1.4 + corte) solo se activan en líneas genuinamente ingeniosas, dignas de clip. El juez devuelve un **fallo** de una línea que se muestra en pantalla ("llamada limpia a T2 → Destello").

**Adaptación (Aprende).** Después de cada batalla, almacena una lección de una línea; inyecta lecciones recientes en el prompt para que una criatura ajuste visiblemente dentro de una temporada ("Vox ahora ceba el Jaque Mate acumulado de Axiom"). Dificultad = modelo más fuerte × memoria más rica × estadísticas más altas.

---

## 8. Hacerlo VISUAL (espectáculo)

Enmarcarlo como un **juego de pelea / battler de cartas**, nunca como una ventana de chat.

**Diseño:**
- Dos criaturas se enfrentan izquierda/derecha con arte grande; **barras de Resolución** arriba; **bandejas de iconos de estado** debajo de cada una; un fondo de arena (el Tribunal = un juzgado).
- Una **barra de Impulso / Jurado** central (tira y afloja desde la diferencia de HP) que se inclina conforme aterrizan golpes.
- Diálogo como **burbujas de habla** cronometradas sobre cada criatura, no un registro que se desplaza.

**Ritmo por turno (el ritmo que lo vende):**
1. **Telegrafía**: el atacante avanza; aparece la **ficha de intención**; entra una pancarta con el nombre del movimiento.
2. **Entrega**: la línea se escribe en una burbuja de habla (~1–2s).
3. **Impacto**: aparece el número de daño; la barra de Resolución se drena; **sacudida de pantalla escalada al daño**; destello de tipo ("¡SÚPER EFECTIVO!" / "RESISTIDO"); **¡LIMITADO!** si alcanza el tope.
4. **Estado**: el icono de estado vuela al objetivo (Desequilibrado / Expuesto / Animado…).
5. **Fallo**: la frase de una línea del juez; en un **Destello**, un **corte** a pantalla completa con la línea de hundimiento en zoom lento.

**Presentación de criaturas (bajo costo de arte):**
- 1 retrato base por criatura + estados reactivos baratos mediante transformaciones: balanceo inactivo, embestida al atacar, flash-rojo + sacudida al herir, desplome a baja HP, sonrisa/emo al Destello. Opcional 2–3 expresiones generadas (neutral / ataque / herido). No se necesita animación por fotogramas.
- **Corte de remate**: un marco dramático a pantalla completa cuando aterriza un remate condicionado.
- Codificado por color por tipo, SFX de golpe, murmullos de público en el Tribunal.

**Pantalla final / compartibilidad:**
- **Tarjeta de repetición** auto-compuesta: ambas criaturas, puntuación final, la **línea MVP del partido ("Hundimiento del Partido")**, arena, enlace corto → compartir con un toque = viralidad incorporada.
- Repetición completa = el registro de batalla almacenado reproducido a través del mismo sistema de ritmo (gratis, determinista).

**Tecnología (mantenerlo barato):** React + una librería ligera de animación (Framer Motion / CSS); los turnos se transmiten vía SSE para que el escenario se anime conforme se resuelven. Sin motor de juego. Es un *escenario* por turnos, no un renderizador en tiempo real.

---

## 9. Batalla de ejemplo trabajada (comprobación de cordura, números ajustados)

**AXIOM (Logista)** vs **VOX (Orador)** · Arena: **El Tribunal** · Tema: *"el cereal es sopa"* (Vox = A FAVOR, Axiom = EN CONTRA).
HP 100 · tipo LÓGICA↔RETÓRICA = neutro (×1.0) · `calidad`/`ruido` asumidos por turno; redondeado. La columna **Intención** es la capa inteligente en pantalla.

| # | Actor | Movimiento | Intención (mostrada) | Línea (abreviada) | Daño | HP después |
|---|---|---|---|---|---|---|
| 1 | VOX | Hombre de Paja | *Alterar al Logista temprano* | "Él cree que la sopa debe estar *caliente*. Adorable, y por eso comimos cereal seco durante siglos." | **15** | Axiom 85 · **Axiom Desequilibrado** |
| 2 | AXIOM | Reductio | *Abrirlos para el remate* | "Nombra el caldo de la leche, su mirepoix, su cocción. No puedes. No es sopa." *(Desequilibrado −0.2)* | **11** | Vox 89 · **Vox Expuesto** |
| 3 | VOX | Apelación | *Guardar Animado para el cierre* | "Olvida las definiciones: el tazón, la luz de la mañana, los siete años. Esa calidez es sopa." | **10** | Axiom 75 · **Vox Animado** |
| 4 | AXIOM | **Jaque Mate** | *DESTELLO: su propia lógica del caldo, arma* | "Por tu regla del caldo, un vaso de leche es bisque. Absurdo. El caso se derrumba." | **45** LIMITADO | Vox 44 |
| 5 | VOX | **Micrófono Caído** | *Cerrar antes de que compongan* | "Trajiste un diccionario a un sentimiento. Descanso mi caso. *mic drop*" *(Animado)* | **37** | Axiom 38 |
| 6 | AXIOM | Silogismo | *Sin teatrics, solo compuesto* | "La sopa se cocina; el cereal se ensambla. Sin transformación, no hay sopa." | **23** | Vox 21 |
| 7 | VOX | Oleada de Público | *Montar el impulso hacia el veredicto* | "Jurado, uno de nosotros te hizo *sentir* el desayuno." | **21** | Axiom 17 |
| 8 | AXIOM | Silogismo | *La prueba se cierra* | "Los teatrics se desvanecen; la lógica se compone. Q.E.D." | **23** | Vox **KO** |

**Resultado:** AXIOM gana en el turno 8, después de ir por detrás la mayor parte del partido. El **Destello de Jaque Mate** condicionado (T4, alcanzó el tope de daño) fue el giro; el combo **Apelación→Micrófono Caído** de Vox casi lo cerró.

**Lo que esto demuestra (la lista de verificación "es un juego"):**
- ✓ **El liderazgo cambió de manos**: Vox lideró hasta T3; el Expuesto→Destello de Jaque Mate de Axiom lo invirtió.
- ✓ **Estados + combos lo decidieron**: Desequilibrado, Expuesto y Animado movieron visiblemente un número cada uno; ambos remates requirieron preparación.
- ✓ **La inteligencia fue legible**: cada turno mostró una *intención* antes de la línea; la victoria vino de planificar (abrir → remate), no de suerte.
- ✓ **La arena importó**: Retórica ×1.1 mantuvo al Orador competitivo en un juzgado.
- ✓ **La LLM importó pero no decidió sola**: `calidad` solo empujó un multiplicador acotado (y un Destello) sobre un núcleo impulsado por estadísticas; el tope evitó un un-golpe que se siente mal.
- ✓ **Es mirable**: líneas cortas, en personaje, en tema, clipables; un corte de Destello y un momento LIMITADO para capturar.

---

## 10. Progresión (cómo el entrenamiento cambia los resultados)

- **Victoria** → XP. Al subir de nivel: +N puntos de estadística para asignar + desbloqueo ocasional de movimiento.
- Estadística primaria más alta ⇒ `statScale` más alto ⇒ golpes mediblemente más grandes (una estadística al máximo es ×1.5 vs ×1.0 en 50). El entrenamiento se *siente*, no es cosmético.
- **Memoria (Aprende):** después de cada batalla, almacena una lección de una línea ("perdí ante Compostura en el Tribunal; dependí demasiado de Apelación"). Inyecta las últimas pocas en el prompt del agente para que adapte la estrategia con el tiempo.

---

## 11. Decisiones (resueltas)

1. **Ritmo**: HP **100**, objetivo **6–8 turnos** (drama más denso, amigable para demo). ✓
2. **Banda de calidad**: ajustada a **0.7–1.3**, más un **Destello ×1.4** crítico, para que las estadísticas anclen los resultados mientras la escritura brillante resalta visiblemente. ✓
3. **Los remates permanecen condicionales**: la condición *es* la capa inteligente (preparación → recompensa). ✓
4. **Estados conservados**, telegrafiados con iconos, tasas conservadoras: textura sin sentirse aleatorio. ✓
5. **Una arena para la demo: El Tribunal.** La más legible, la más graciosa de ver, anti-desvío por diseño. ✓
6. **Tope anti-un-golpe (45)** añadido: las jugadas grandes se sienten enormes sin OHKOs que se sienten mal (mostrado como **¡LIMITADO!**). ✓
7. **Agente de dos fases (Estrategiar → Actuar)** con una **ficha de intención** en pantalla, el núcleo de la inteligencia visible. ✓
8. **El juez recompensa llamadas / usar palabras / precisión**, devuelve un **fallo** en pantalla. ✓
