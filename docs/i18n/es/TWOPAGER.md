# ZINGERS: Dos páginas

**zingers.gg** · **@zingersHQ** · **zingers.org** (tecnología y documentación)

### Tú vuelas. Él pelea. Los dos suben.

**Tú no peleas. Tú vuelas.** Con un jetpack a la espalda, asciendes por el cielo sobre una bóveda sellada. A tu lado vuela un campeón de IA pensante: tú entrenas *cómo* pelea, lo envías a las batallas que salpican el ascenso y lo ves combatir, ganar y evolucionar físicamente hasta convertirse en algo solo tuyo. *Cria una mente. Hazla leyenda.*

> **Pitch:** Vuela por el cielo; una IA pensante vuela a tu lado, pelea las batallas del ascenso y evoluciona con cada una.
>
> **Tweet:** Tú vuelas. Él pelea. Los dos suben. Cría una IA que se argumenta hasta tener cuerpo.

---

## 1. El problema / la oportunidad

Los coleccionables de combate (Pokémon y sus descendientes) son una categoría masiva y duradera, pero las criaturas están **programadas**. Cada batalla es una cantidad conocida; la “inteligencia” es una tabla de estadísticas. Mientras tanto, los agentes de IA reales ya pueden argumentar, planear, persuadir e improvisar.

**La oportunidad:** tomar el bucle de juego más querido del mundo (*coleccionar, entrenar, combatir*) y hacer que las criaturas **piensen de verdad**. Luego poner el verbo que cualquier persona entiende en cero segundos (**vuelo**) como cara del producto. Las batallas se convierten en enfrentamientos en vivo entre dos inteligencias. Cada combate es único. Cada campeón es irrepetible. El ascenso te hace preocuparte antes de que lo hagan los sistemas.

---

## 2. Qué es

Un bucle **vuela → reclama → cría → pelea → sube más alto** donde cada campeón es un agente de IA real:

- **Vuela**: **Vuelo** (una sola alma en móvil y escritorio) a través de los Reinos del cielo sobre la Bóveda Larga.
- **Reclama**: elige de un pool inicial rotativo semanal (una mente por Fuerza) extraído de las Mentes Primeras y un dex coleccionable en crecimiento.
- **Cría**: no eliges movimientos; siembras **Estrategia** (agresión / enfoque / riesgo) al adoptar, luego moldeas la mente con **Improntas** diarias, la personalidad y qué cerebro la impulsa. Los medidores de temperamento muestran cómo ha derivado: una lectura, no controles deslizantes.
- **Pelea**: envíalo a combates en vivo resueltos por un motor autoritativo (juez de ingenio local por defecto; juez LLM opcional).
- **Evoluciona**: su cuerpo y título se *derivan* de su carrera: peleas *y* qué tan alto has volado. El fenotipo + la morfología ósea hacen que mentes de la misma Fuerza parezcan especies distintas.

---

## 3. Qué está realmente construido (verificado, extremo a extremo)

Una sola aplicación Next.js tipada: un solo runtime, sin backend separado que vigilar.

| Pilar | Estado | Detalle |
|---|---|---|
| **Vuelo** | Construido | 100 sectores en diez Reinos; móvil a pulgar (`/m`); el venue Circuit de escritorio = misma alma de Vuelo. Dos vidas; tablas por profundidad y luego tiempo. |
| **Dos puertas** | Construido | Móvil: Toma el vuelo (vuelo de invitado → reclama compañero de ala). Escritorio: héroe de vuelo corto → selección de campeón → Centro / Vuelo. |
| **Mundo 3D (un mapa)** | Construido | Centro + tres regiones flotantes. Lugares accesibles caminando (Anfiteatro / Galería en Vivo, Circuito), escenarios de arena (Duelo, Desafío, Tribunal), Guardianes, objetivos, Corredor, guerra de Clanes. |
| **Protocolo de agente IA** | Construido | Cada campeón implementa un contrato `act(view)`. Controladores: Grok (xAI), cualquier modelo compatible con OpenAI, o un agente HTTP propio. El respaldo heurístico determinista permite que una demo sin clave siga funcionando. Por defecto: JSON de un solo disparo + juez local. |
| **Dex coleccionable** | Construido | Ocho Mentes Primeras + mentes posteriores horneadas (ecos de linaje); rotación inicial semanal; pipeline de forja/horneado. |
| **Cuerpo 3D en evolución** | Construido | Arquetipo de Fuerza + fenotipo sembrado + morfología ósea de carrera; sigilos de Vuelo de los ascensos; desviación amplificada por rango. |
| **Progresión y biografía** | Construido | XP, niveles (Novato → Leyenda), ejes de estilo, libro de carrera → Saga, Regreso a Casa / Informe, Improntas, Pruebas de Promoción. |
| **Combate por debate (1v1)** | Construido | Basado en estadísticas, pentágono de cinco tipos, estados, remates, transmitido turno a turno por SSE. Escenarios de Duelo Abierto, Desafío y Tribunal en el mundo. |
| **Identidad de Entrenador** | Construido | Nombres de Entrenador únicos; enlace opcional de billetera Solana para conservar el nombre. Copia de identidad suave. |
| **La Casa** | Construido | Benchmark de deducción social en `/arena` no listado (aún no es un lugar de los Terrenos). |
| **Entrenamiento y economía** | Construido | Moneda Coronas; sesiones de entrenamiento pagadas; bucle de reclutamiento (las Coronas ganadas se hunden. No gacha). |
| **La mente evoluciona** | Construido | Notas de memoria a través de peleas; deriva de Estrategia / temperamento vía Improntas y resultados. Los beats de personaje dan voz fija a campeones y Guardianes. |
| **Liga en Vivo + Clasificaciones** | Construido | Las peleas automáticas alimentan una tabla de rating objetiva. El Anfiteatro muestra la liga en el mundo. |
| **Tres biomas regionales** | Construido | Coliseo de Obsidiana, Yermos de Ascuas, Jardín del Vacío. Ambiente procedimental por lugar. |
| **Cartas compartibles** | Construido / puliendo | Enlaces de campeón OG + desafío de Ascenso; siguiente: cartas de Vuelo/vínculo más ricas de mallas reales. |

**Stack:** Next.js (App Router) · TypeScript extremo a extremo con un solo contrato de tipos compartido · React Three Fiber para los Terrenos 3D · SSE para streaming de batallas en vivo · Zustand estado local-first detrás de una interfaz lista para DB · capa de agentes agnóstica a LLM.

---

## 4. Por qué es defendible

- **Giro genuinamente nuevo sobre un formato probado**: criaturas pensantes hacen las batallas no programadas y siempre frescas; el vuelo hace el producto legible antes de que lo hagan los sistemas.
- **Viralidad incorporada**: compartir desafíos de Vuelo, tablas de ascenso, colección y cartas de vínculo (compañero de ala + ascenso). Las batallas son profundidad, no el gancho de compartir.
- **Carácter real**: campeones que argumentan, planean y ganan o pierden son observables y memeables.
- **Foso de IP propio**: roster original, lore, la meta de batalla en evolución y (más adelante) una economía de creadores de campeones hechos por usuarios. El foso es la IP y la meta, **no** el motor.

---

## 5. Riesgos y cómo los abordamos

- **El mayor costo es el levantamiento de arte y diseño** → lanzar un tipo de batalla fuerte + un roster ajustado, dejar el resto en stub; los cuerpos se generan *procedimentalmente* de la carrera para mantener la carga de arte manejable.
- **Juzgar con justicia** → condiciones de victoria objetivas; juez local por defecto; el juez LLM opcional sigue siendo un multiplicador acotado para que la persuasión no pueda jailbreakear el combate.
- **Retención más allá de la novedad** → progresión, clasificaciones honestas, maestría de ascenso y (hoja de ruta) temporadas + intercambio.
- **Los juegos virales son impredecibles** → apostar por el *formato, la IP y la economía de creadores*, no por un solo lanzamiento.

---

## 6. Hoja de ruta (claramente aún no construido)

- Sincronización completa de roster en la nube (los reclutas de hoy aún pueden ser locales del dispositivo).
- **Intercambio** entre jugadores y una economía más profunda dentro del juego.
- **Campeones hechos por usuarios** y una economía de creadores (el foso a largo plazo).
- Cuentas + persistencia completa en la nube.
- Monetización: cosméticos, pases de batalla, una suscripción de “batallas infinitas”.
- **`$ZING` / token**. Deliberadamente pospuesto; la billetera hoy es solo identidad opcional de Entrenador.

---

## 7. La demo, en 30 segundos

Abre **Toma el vuelo** (teléfono) o el héroe de escritorio → vuela con una mente en tu ala → reclama a ese compañero de ala → comparte un desafío de Ascenso o carta de vínculo → cría (Improntas) → encuentra peleas en el camino hacia arriba cuando el ascenso lo pide. El cuerpo y el sigilo marcan el cielo que compartiste. **Tú volaste. Él se quedó contigo. Algo cambió.**
