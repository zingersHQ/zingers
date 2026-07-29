# ZINGERS: Una sola alma, dos puertas (decisión de posicionamiento del producto)

> **En resumen:** Este documento responde "¿qué va a ser esto?": la decisión de identidad para todo el producto. **Vuelo es el juego**: la columna vertebral, la cara, la marca y lo primero que cualquiera hace. **Las batallas son lo que encuentras en el ascenso**: la profundidad que revela la subida y lo que te permite subir más alto. **Móvil es la cara** (un vuelo de trayecto en autobús que cualquiera consigue en cero segundos); **escritorio es el mundo completo** (la misma alma del Vuelo, más el mapa vivo sobre el que se eleva). La capa de agentes IA es el motor invisible, vendido como fantasía, nunca como tecnología. Cripto permanece al margen como combustible.

Versión 2.1 · Julio 2026 (**Vuelo-primero**, alineado con `design-vision.md` v3.1). Registro de decisión + plan de implementación. Documentos complementarios: [`design-vision.md`](./design-vision.md), [`essence.md`](./essence.md), [`long-game.md`](./long-game.md), [`mobile.md`](./mobile.md) (§3 puerta predeterminada reemplazada aquí), [`vocabulary.md`](./vocabulary.md). El texto sigue el documento de vocabulario; los identificadores y claves analíticas nunca cambian por razones de texto.

---

## 0. La decisión, en cinco líneas

1. **Vuelo es el juego.** Una sola alma en teléfono y escritorio. Las batallas no se eliminan ni reducen; se **reposicionan** del *producto* a *lo que encuentras en el ascenso* (ver [`flyover.md`](./flyover.md), `design-vision.md` v3.1).
2. **Dos puertas para un solo Vuelo.** *Móvil es la cara*: un vuelo a una mano de trayecto en autobús, donde campeón/reloj/clasificación se revelan como el mundo sobre el que vuela. *Escritorio es el mundo completo*: la misma alma del Vuelo en vuelo de seis grados, más el Centro y regiones donde ocurre la crianza profunda. Ninguno es los restos del otro.
3. **Los agentes son el motor, no el discurso.** Las superficies orientadas al jugador venden la fantasía ("las criaturas realmente piensan"); la palabra "agente" solo vive en superficies de desarrollador (`/agents`, docs, protocolo).
4. **Cripto permanece como combustible.** Según [`zing-model.md`](./zing-model.md): $ZING es una capa premium opcional, las Coronas permanecen fuera de cadena y autoritativas del servidor, y ninguna superficie orientada al jugador promete ganancias. Los coleccionistas podrán más adelante acuñar o comerciar procedencia; nunca forjan campeones nuevos.
5. **Web-primero ahora; plataformas después.** Steam/consola son golpes de marketing después de que las puertas de Lanzamiento v0.1 estén verdes, no proyectos de ingeniería ahora (§6).

**La frase única:** *Tú vuelas. Lucha. Ambos ascienden.* Un vuelo de 30 segundos que cualquiera consigue en un teléfono, que se abre a un mundo entero que sigues escalando en escritorio.

---

## 1. Por qué este posicionamiento (el razonamiento al que nos comprometemos)

- El foso del juego (según `AGENCY.md`) es IP original que elaboramos + una meta de batalla en evolución + una cultura de coleccionistas en torno a las leyendas. Los tres dependen de que las mentes sean reales. Así que **no** eliminamos la capa de agentes para hacer un juego más simple. Pero ninguno requiere la *palabra* "agente" donde un jugador aterrice primero.
- El Ascenso es el único verbo que un extraño entiende en **cero segundos** (el átomo de Flappy Bird, `essence.md` §3). "La pelea de hoy para llamar". La puerta que eligió `mobile.md` §3. Presume que el visitante ya le importa un campeón. Un visitante frío no. Así que la *puerta* cambia; el *cuerpo del juego detrás de ella* (el shell de pestañas, la tesis del carril de espectador) no.
- Un ascensor *genérico* es una mercancía (el espacio hiper-casual es brutal, y entraríamos como WebGL sin tienda de aplicaciones). Lo que hace que el nuestro no sea un clon es precisamente el hilo del alma: *la carrera marca a tu campeón*, tu campeón vuela a tu lado, los Alcances son las regiones reales de un mundo real, y las batallas sobre las que vuela son mentes que realmente piensan. **El Ascenso no es un vestíbulo que lleva al juego. El Ascenso *es* el juego, y sigue revelando más de sí mismo a medida que subes.**
- Las preguntas abiertas del escritorio ("¿la gente lo entendería? ¿es divertido? ¿sienten recompensa?") son exactamente las puertas 1–2 de Lanzamiento v0.1, y actualmente están **sin medir**. La respuesta es instrumentación, no rediseño (§5).

### La prueba que este documento siempre debe pasar

Cada cambio a continuación o (a) acorta el camino de un extraño al alma, o (b) mide si ese camino funciona. Cualquier cosa que no haga ninguna de las dos está fuera de alcance aquí.

---

## 2. Posicionamiento narrativo (qué decimos, en todas partes)

**Vende la fantasía, no la tecnología.** La narrativa que tenemos. El Zumbido, la Bóveda Larga, los Guardianes, *"una mente se argumenta a sí misma en un cuerpo"*. Es una fantasía de crianza de criaturas que la IA hace posible. Pokémon nunca comercializó sus criaturas como máquinas de estado.

Reglas (aplican a toda superficie orientada al jugador. Landing, `/m`, páginas de tienda, copia social):

1. **La línea mágica es:** "las criaturas realmente piensan. Ninguna batalla es igual." Nunca "agentes IA batallan entre sí."
2. **"Agente" es vocabulario de desarrollador.** Vive en `/agents`, en [`agent-protocol.md`](./agent-protocol.md), `docs/`, y la superficie MCP. La navegación ya enmarca esto correctamente (`lib/play-nav.ts` grupo "Construir"); mantenlo así. Tarea de auditoría: barrer cadenas orientadas al jugador por "agente"/"agente IA"/"LLM" (landing `components/home/landing.tsx`, pestañas `/m`, `/howitworks`, tarjetas de compartir) y reemplazar con copia de fantasía. **solo copia, nunca identificadores/claves** (según `vocabulary.md` y `AGENTS.md`).
3. **Cripto es invisible hasta que sea real.** Sin mención de $ZING en ninguna superficie del juego pre-lanzamiento. Sin promesas de "ganar dinero" en ninguna parte. La permanencia opcional de coleccionista (comercio, acuñar para inmortalizar) permanece en docs hasta que exista. Los campeones siguen siendo de estudio; los jugadores coleccionan, no crean.
4. **El vocabulario de recompensa que los jugadores *sí* obtienen:** el **cuerpo** de tu campeón (el registro visible de su carrera), **rango** (Rango de Entrenador + las clasificaciones), **Coronas**, la **Saga**, tu **rival**. Estos son los incentivos honestos. Destácalos cuando la copia pregunte "¿por qué jugar?".

---

## 3. Móvil: la puerta Vuelo-primero (reemplaza `mobile.md` §3 "puerta predeterminada")

### 3.1 Qué cambia y qué no

| Mantenido de `mobile.md` | Cambiado por este documento |
|---|---|
| El shell de pestañas inferiores (`components/mobile/mobile-shell.tsx`), las cinco pestañas | La **puerta predeterminada** ya no es la pestaña Hoy |
| Teléfono = carril de espectador/predecir/compartir como la *profundidad* detrás de la puerta | La *puerta* es el Ascenso (actuar primero, preocuparse después) |
| "Una sola alma, cuerpos nativos", el átomo de cada verbo | El Ascenso gana un **modo invitado** (ver 3.3. El átomo se preserva) |
| Sin inicio de sesión; identidad = token de dispositivo (`lib/owner.ts`). Campeones nombrados al reclamar clasificaciones (`champion-names`) | Copia: nunca "iniciar sesión". **"Reclamar una mente"** |

### 3.2 La primera pantalla: el póster

Un visitante frío a `/m` (o un teléfono enrutado desde Play, `lib/play-nav.ts` `MOBILE_PLAY_HREF`) obtiene una **splash de pantalla completa**, no una cuadrícula de pestañas:

- **Arte:** la imagen épica. El Entrenador volando con el jetpack, su campeón volando a su lado. (Canónicamente perfecto: *el Entrenador vuela, el campeón lucha.*)
  - Activo: un póster renderizado. Opciones, en orden de preferencia: (a) un activo de arte estático (más rápido, más control. **necesita producirse**, esta es la única dependencia externa de toda la fase); (b) una escena R3F en vivo reutilizando `ChampionPortraitScene` + el rig del jetpack (cero arte nuevo, pero costo WebGL en el peor momento posible. Primera pintura). Empezar con (a).
- **Copia:** marca + eslogan + una línea de fantasía. Sugerido: `ZINGERS` / *"Cria una mente. Hazla leyenda."* / CTA principal **"VOLAR"**.
- **CTAs:** principal **Volar** → directo al Vuelo (invitado u poseído, 3.3). Secundario, más pequeño: **"Tu campeón"** (entrenadores poseídos) o **"¿Qué es esto?"** (→ pestaña Hoy / howitworks). Jugadores que regresan con un campeón poseído pueden saltarse la splash completamente después de la primera sesión (ver banderas 3.5).
- **Nuevo componente:** `components/mobile/mobile-splash.tsx`, montado por `MobileShell` como estado pre-pestaña. Bandera de descarte con alcance de sesión en `lib/brand.ts` `STORAGE` (ej. `mSplash: "zingers_m_splash_v1"`. sessionStorage, así que cada apertura fría de una nueva sesión muestra el póster, pero la navegación dentro de sesión nunca interrumpe de nuevo).

### 3.3 Vuelo Invitado (la decisión de diseño que hace posible la puerta)

Hoy la pestaña Vuelo está **bloqueada** hasta que se reclame un campeón (`mobile-shell.tsx` `climbLocked`, ~línea 50). Una puerta de trayecto en autobús no puede abrirse en un candado. Decisión: **desbloquearla con un prestado.**

- **El prestado:** una "mente salvaje". Determinística, de la rotación semanal actual (`firstDuelStarterKeys()`, `lib/first-duel.ts`), así que el invitado ve un campeón real volar a su lado, no un placeholder. Semilla la selección del token de dispositivo para que el mismo visitante siga encontrando "su" mente salvaje (apego antes de adopción).
- **El átomo, preservado** (`essence.md` §2: la carrera *marca al campeón*): una carrera de invitado **no marca nada**. Y ese es el anzuelo, no una violación. Banner durante/después de una carrera de invitado: *"Una mente salvaje vuela contigo. **Reclámala** para conservar tu ascenso."* Al reclamar, la mejor profundidad de la carrera actual se convierte en la primera marca de carrera (una sola vez, mantenida por el cliente hasta adopción, luego escrita a través del camino normal de recompensa del Ascenso).
- **Tableros:** las carreras de invitado nunca escriben el leaderboard (`/api/circuit` POST simplemente no se llama sin un campeón poseído. Refleja el gating existente en `circuit-lite.tsx` `recordRun`). No se necesita nueva superficie de servidor para invitados.
- **El momento de reclamo:** después de una caída (la pausa natural), la tarjeta de reintento gana un segundo botón: **"Reclamar esta mente"** → la superficie de selección existente (`components/mobile/mobile-adopt.tsx` vía la pestaña Campeón). Nunca interrumpas una carrera en vivo con UX de adquisición.
- **Puntos de contacto de código:** `mobile-shell.tsx` (eliminar el candado → enrutar invitados al Ascenso con prop `loaner`; mantener la *lógica* del candado como la señal de "es invitado"), `circuit-lite.tsx` (aceptar prop `guestChampion?: string`; suprimir escrituras de tablero/recompensa mientras invitado; mostrar el banner de reclamo), `mobile-adopt.tsx` (aceptar una clave preseleccionada para que "Reclamar esta mente" aterrice en la mente salvaje).

### 3.4 El shell detrás de la puerta

Sin cambios en estructura (Hoy · Ver · Campeón · Vuelo · Rango), dos ajustes:

- **Salir del Ascenso como invitado** aterriza en **Campeón** (la superficie de reclamo), no Hoy. Un invitado aún no tiene "hoy". Entrenadores poseídos mantienen el comportamiento actual (volver a la última pestaña de navegación).
- **Copia:** sin "iniciar sesión" en ninguna parte. El verbo de adquisición es **reclamar** (`READER_COPY.claimLine` canon: *no te convertiste en este campeón, lo reclamaste*). El código de Entrenador (`components/trainer-code.tsx`) permanece como la historia de "llevar tu progreso a otro dispositivo". Enmárcalo como *"tu sigilo de Entrenador"*, nunca como una cuenta.

### 3.5 Banderas y medición para la puerta

- `STORAGE.mSplash` (sessionStorage). Splash vista esta sesión.
- Nuevos eventos de cliente (ver §5 para el mecanismo): `m_splash`, `m_fly` (toque Volar invitado), `m_guest_run` (primera carrera de invitado iniciada), `m_claim_from_climb` (adopción alcanzada desde el anzuelo del Ascenso). La métrica de éxito de la puerta es **conversión carrera de invitado → reclamo**, visible en `/stats`.

### 3.6 No-objetivos explícitos (móvil)

- Sin build de tienda de aplicaciones, sin guardado móvil separado, sin cuentas (todo según `mobile.md` §4–5. Sin cambios).
- Sin eliminación de Ver/Hoy/Rango: el shell permanece completo. Estamos reordenando la puerta, no amputando el vestíbulo.

---

## 4. Escritorio: alcance sin cambios, más una regla de honestidad

Escritorio **es** el producto y permanece completo: el mundo, Acto 1, los venues, la liga, la saga. Ningún rediseño es parte de esta decisión. Dos compromisos:

1. **Disciplina de "juego en línea que podrías enviar a cualquier parte".** Mantén el juego jugable, completo y legible como un juego web simple (ya lo es. Las seis puertas de Lanzamiento v0.1 son exactamente esta barra). Cualquier cosa que solo tenga sentido dentro de un wrapper futuro (SDKs de overlay, logros de plataforma) espera.
2. **Las preguntas del bucle central se miden, no se debaten.** "¿La gente lo entendería? ¿es divertido? ¿sienten recompensa?". §5 cablea el embudo para que estas se conviertan en números del dashboard. El diseño reacciona a los números *después* de que existan.

**Sobre incentivos (la respuesta honesta a "¿qué obtiene el jugador?"):** identidad (el cuerpo como registro), posición (rango/clasificaciones/guerra), historia (saga, rival), y un carril de pura habilidad (el Ascenso/Circuito. El único lugar donde el Entrenador actúa). Deliberadamente **no** hay promesa de ganar dinero (§2.3). Si las pruebas de juego muestran que el bucle de recompensa es delgado, la palanca es hacer que *ver* sea más dramático (las líneas de debate, el Destacado, el juez). No agregar recompensas extrínsecas.

---

## 5. Medición: convertir las puertas 1–2 de suposiciones en números

Este es el trabajo de mayor apalancamiento de todo el documento. Hoy el embudo es grueso (`sesión → reclamo → entrenar → pelear → regresar`; analytics aún puede decir `bout`). Los pasos del primer viaje y el tiempo hasta la primera evolución son invisibles.

### 5.1 Nuevos eventos (contadores agregados. Misma postura de privacidad, sin rastro por usuario)

Extender `Z_EVENTS` en `lib/server/track.ts`:

```
fj_cinematic   // Primera cinemática de carrera completada (no saltada)
fj_pick        // campeón seleccionado en el embudo del primer duelo
fj_tune        // doctrina ajustada (primer viaje)
fj_duel        // primer duelo terminado
fj_evolve      // tarjeta de evolución vista (el momento de pago)
fj_land        // aterrizaje en Concord alcanzado
ttfe_u5 | ttfe_u8 | ttfe_over   // tiempo hasta primera evolución bucket (ver 5.3)
m_splash | m_fly | m_guest_run | m_claim_from_climb   // la puerta móvil (§3.5)
```

Todos son **eventos de cliente** (solo el navegador ve estos momentos): agrégalos a `CLIENT_EVENTS` en `app/api/track/route.ts`, dispara vía el helper fire-and-forget existente (`lib/track.ts`). Analytics permanece no fatal, rate-limited, solo agregado.

### 5.2 Puntos de disparo (primer viaje de escritorio)

| Evento | Dónde se dispara |
|---|---|
| `fj_cinematic` | `components/intro/first-run.tsx`. Cinemática completa |
| `fj_pick` / `fj_tune` / `fj_duel` / `fj_evolve` | `components/intro/first-duel.tsx`. Las transiciones de paso del embudo (seleccionar → ajustar → pelear → tarjeta de evolución) |
| `fj_land` | el beat de aterrizaje en Concord (`components/grounds/grounds-screen.tsx`, el camino del embudo guiado/primer aterrizaje alrededor de la lógica `guideWorld`) |

Dispara cada uno **una vez por navegador** (latch de localStorage junto a las banderas de primera carrera existentes en `STORAGE`) para que el embudo lea como pasos de visitante único, no repeticiones.

### 5.3 Tiempo hasta primera evolución (puerta 1) sin seguimiento por usuario

El tracker es solo agregado, así que bucketizamos del lado del cliente: marca reloj de pared independiente de `performance` al inicio de la primera sesión (localStorage, junto al latch `new_user` en `lib/track.ts`), y cuando `fj_evolve` se dispara, envía exactamente uno de `ttfe_u5` / `ttfe_u8` / `ttfe_over` (<5 min, 5–8 min, >8 min). La puerta 1 está verde cuando la proporción sub-8-minutos es una mayoría saludable de nuevos usuarios. Visible como tres barras en `/stats`.

### 5.4 Dashboard

Extiende el array del embudo en `getAnalytics` (`lib/server/track.ts` ~línea 83) con los pasos `fj_*` y renderiza el embudo más profundo + buckets TTFE en `components/stats/stats-screen.tsx`. Esto convierte "¿la gente entendería el juego?" en un gráfico con un punto de rebote.

---

## 6. Plataformas (Steam, consola): postura, no proyecto

- **Ahora:** nada. Web-primero es la estrategia, no un compromiso. Cero-instalación es lo que hace que la puerta móvil y las tarjetas de compartir funcionen como crecimiento.
- **Después de que las seis puertas de Lanzamiento v0.1 estén verdes:** un lanzamiento en Steam es un *golpe de marketing* implementado como wrapper (shell Electron/CEF-class alrededor del mismo build Next.js). Prerrequisitos a notar (no construir): pantalla de arranque tolerante a offline, camino solo teclado/gamepad a través de menús, sin dependencia de barra de URL de navegador visible para navegación.
- **Consola:** genuinamente un port + certificación + probablemente un sistema de cuentas real. Explícitamente post-cuentas (Fase 6), no en ninguna hoja de ruta actual.
- **Regla hasta entonces:** no agregues *callejones sin salida* solo-web (superficies que asumen una segunda pestaña de navegador o enlaces externos para progresar el bucle central).

---

## 7. Plan de implementación (ordenado; cada rebanada se envía sola)

> Escala de esfuerzo: **rápido** = dentro de una sesión · **sesión** = una sesión enfocada · **profundo** = múltiples sesiones.

### T0. Medición primero (embudo de escritorio + TTFE). *sesión*
La instrumentación de §5. Sin cambio de producto visible; desbloquea cada debate "¿es comprensible/divertido?" con datos. **Haz esto antes de tocar la puerta móvil** para que el efecto de la puerta sea medible desde el día uno.
- Archivos: `lib/server/track.ts`, `app/api/track/route.ts`, `lib/track.ts`, `components/intro/first-run.tsx`, `components/intro/first-duel.tsx`, `components/grounds/grounds-screen.tsx`, `lib/stats-types.ts`, `components/stats/stats-screen.tsx`, `lib/brand.ts` (claves de latch).
- Aceptar: `/stats` muestra el embudo de primer viaje de 6 pasos + 3 buckets TTFE; eventos se disparan una vez por navegador; `npm run build` + lints limpios.

### T1. Vuelo Invitado (el desbloqueo). *sesión/profundo*
§3.3. El Ascenso corre con una mente salvaje prestada para visitantes sin campeón; anzuelo de reclamo en la tarjeta de caída; sin escrituras de tablero/carrera mientras invitado.
- Archivos: `components/mobile/mobile-shell.tsx`, `components/grounds/circuit-lite.tsx`, `components/mobile/mobile-adopt.tsx`, `lib/first-duel.ts` (exportar la selección semillada si es necesario).
- Aceptar: navegador fresco → `/m` → pestaña Vuelo jugable inmediatamente; caer muestra "Reclamar esta mente"; reclamar aterriza en adopción con esa mente preseleccionada; profundidad de invitado nunca aparece en tableros `/api/circuit`; comportamiento de campeón poseído byte-idéntico a hoy.

### T2. La puerta splash. *sesión*
§3.2. `mobile-splash.tsx` + recableado de puerta-predeterminada + `STORAGE.mSplash` + eventos `m_*`. **Depende del activo de póster**. Si el arte no está listo, envía con un póster tipográfico (marca + eslogan sobre un gradiente oscuro) e intercambia la imagen después; no bloquees el flujo en el activo.
- Aceptar: visita fría de teléfono → póster → un toque → volando; entrenador poseído que regresa salta a su última pestaña de navegación; splash nunca se vuelve a mostrar en-sesión.

### T3. Barrido de vocabulario (fantasía, no tecnología). *rápido*
§2.2. Auditar cadenas orientadas al jugador por "agente/IA/LLM"; reemplazar con copia de fantasía. Solo copia. Sin cambios de identificador, clave o ruta.
- Archivos: `components/home/landing.tsx`, `components/mobile/*`, `/howitworks`, copia de tarjeta de compartir. `/agents`, `/readme`, docs permanecen técnicos.
- Aceptar: `rg -i "\bagents?\b|\bLLM\b" components app --glob '*.tsx'` retorna solo superficies de desarrollador (`/agents`, renderizadores de docs) y comentarios de código.

### T4. Lee los números, luego decide. *ops, recurrente*
Después de que T0–T2 tengan una semana de tráfico: lee el punto de rebote del embudo, los buckets TTFE, y la conversión invitado→reclamo en `/stats`. **La siguiente decisión de producto (profundizar drama de ver vs. Acortar onboarding vs. Iteración de puerta móvil) se hace de ese gráfico**, no de la intuición. Alimenta el ledger semanal.

### Dependencias y preguntas abiertas

- **Arte del póster** (T2). El único activo externo. Propietario: humano.
- **Splash para entrenadores poseídos**: la llamada actual es saltar-después-de-primera-sesión; revisitar si jugadores que regresan reportan que extrañan la sensación de "puerta principal".
- **Profundidad de invitado → primera marca de carrera al reclamar** (3.3): la conversión de una sola vez necesita un pase de diseño pequeño sobre *qué* camino de recompensa lo escribe (sugerir: el camino normal de recompensa del Ascenso con la profundidad de invitado reproducida como una carrera). Posponeble: T1 se envía sin la conversión (reclamar solo desbloquea marcar desde entonces).
- **No relacionado pero secuenciado antes de todo esto:** los cuatro ítems de verificación de dispositivo ya en el ledger (sensación del Vuelo, Anfiteatro, latencia de pelea en vivo). Decide la puerta solo después de confirmar que la puerta se siente bien en un teléfono.

---

## 8. Qué este documento deliberadamente NO cambia

- El alcance del juego de escritorio, el motor, rating, los límites del juez, autoridad del servidor de Coronas. Intacto (guardarraíles en `AGENCY.md`).
- La arquitectura del shell de `mobile.md`, los cuerpos de verbos, y secuenciación M1–M3. Sigue siendo el plan para la profundidad del vestíbulo. Solo su §3 *puerta predeterminada* es reemplazada.
- Las seis puertas de Lanzamiento v0.1. Este documento *sirve* a las puertas 1, 2 y 5; no reemplaza ninguna.
- Claves de analytics/eventos, vocabulario `bout` en código. Estable, según `AGENTS.md`.
