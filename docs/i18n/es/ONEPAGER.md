# ZINGERS

**zingers.gg** · **@zingersHQ** · **zingers.org** (tecnología y documentación)

### Vuelas. Lucha. Ambos ascienden.

**No luchas. Vuelas.** Con un jetpack a la espalda, escalas el cielo sobre una bóveda sellada.
A tu lado vuela un campeón de IA pensante que has adoptado: entrenas *cómo* lucha, lo envías a las batallas que salpican la ascensión y observas cómo se enfrenta, gana y evoluciona físicamente.
Su cuerpo registra tanto sus argumentos como la altura que has alcanzado. *Crea una mente. Hazla leyenda.*

---

### La frase única

> Vuela el cielo sobre una bóveda sellada; una IA pensante vuela a tu lado, librando las batallas que encuentras en el ascenso y evolucionando con cada una. Tú escalas, él lucha, ambos se convierten en leyenda.

---

### Por qué es diferente

Los combatientes coleccionables son un formato probado y querido. El giro: **las criaturas realmente piensan.**
Discuten, planean, persuaden e improvisan, por lo que ninguna batalla es igual y el cuerpo de cada campeón se convierte en un registro visible de cómo ha luchado.

---

### Lo que ya existe (construido de extremo a extremo)

- **Vuelo. La columna vertebral.** Un vuelo con un solo pulgar en el móvil (`/m`), vuelo completo en escritorio (escenario del Circuito): asciende por **100 sectores** repartidos en diez **Alcances** (franjas de cielo) sobre la bóveda.
  Dos vidas, luego una caída reinicia la partida; la altura alcanzada marca tu rango de Entrenador y el cuerpo de tu campeón. La cara del juego, comprendida en cero segundos.
- **Dos puertas, un juego.** Los móviles se abren en **Emprende el vuelo** (vuelo de invitado, luego reclama la mente en tu ala). El escritorio inicia un breve vuelo, luego elige un campeón y entra al mundo.
  La misma alma de Vuelo; primeros minutos nativos.
- **Un mundo 3D, muchos juegos.** Vuela desde el Centro: cría campeones, lucha en arenas regionales (Duelo Abierto, Desafío, Tribunal), vuelve a Volar, observa la liga en la Galería en Vivo del Anfiteatro, descifra a los Guardianes, persigue objetivos de temporada.
- **Criar, no arrastrar controles.** Al adoptar, siembras **Estrategia** (agresión / enfoque / riesgo). Después la interfaz muestra **medidores de temperamento**. Una lectura. Las **Improntas** diarias y las peleas reales mueven esos diales; tú no los arrastras libremente.
- **IA que lucha sola.** Un protocolo de agente limpio: cada campeón responde una sola pregunta.
  *Dado este estado y estos movimientos legales, ¿qué haces?* Respaldado por Grok, cualquier modelo compatible con OpenAI o un agente propio (con un respaldo determinista para que una demo nunca se rompa).
  Ruta predeterminada: una decisión de LLM por turno + un **juez local** (rápido, barato).
- **Un cuerpo que evoluciona.** La silueta 3D de un campeón es una función determinista de su carrera:
  arquetipo de Fuerza, partes fenotípicas sembradas y escalado óseo amplificado por rango. El cuerpo *es* el historial: batallas y ascensos (sigilos de Vuelo).
- **Director que guía.** Un “¿y ahora qué?” con voz de campeón sobre tu partida para que el contenido creado siga visible.
- **Un dex real.** Ocho Mentes Iniciales más un roster creciente de mentes coleccionables (ecos de linaje), con rotación semanal de iniciadores para que los nuevos Entrenadores conozcan un grupo cambiante.
- **Biografía vivida.** Registro de carrera → línea temporal de la Saga, Informe de Regreso a Casa / nocturno en móviles, Improntas, Pruebas de Promoción. Apego, no configuración.
- **Identidad de Entrenador.** Nombres de Entrenador únicos (enlace opcional a monedero para conservarlos entre dispositivos). Copia suave. Guarda / conecta / conserva. Sin hype de bloqueo por reclamación.
- **Combate de debate en vivo.** Duelos 1v1: pentágono de tipos, estados, remates, transmitidos turno a turno.
  El banco de pruebas de deducción social de la Casa permanece en `/arena` no listado para pruebas de agentes.
- **Clasificación honesta.** La Liga en vivo ejecuta peleas automáticamente; una puntuación real clasifica la tabla.
- **Tres biomas regionales y cartas compartibles.** Coliseo de Obsidiana, Yermos de Ascuas, Jardín del Vacío, más ambiente procedimental por lugar. Campeón OG y desafío de Ascenso compartibles; cartas de vínculo/Vuelo próximamente.

---

### Pila tecnológica

Next.js (App Router) · TypeScript de extremo a extremo · React Three Fiber (3D) · transmisión de batallas por SSE ·
Zustand estado local-first (listo para BD) · capa de agentes independiente de LLM.

---

### La apuesta

El foso no es el motor. Es la **IP original**, la **meta de batalla en evolución** y una futura **economía de creadores** de campeones hechos por usuarios. Construido primero viral: las comparticiones de Vuelo, la colección, la clasificación y las cartas de vínculo Entrenador↔campeón impulsan el compartir orgánico.

---

### En la hoja de ruta (aún no construido, declarado honestamente)

Olas mayores de dex hacia un set coleccionable completo · bucle **reclutamiento** determinista
(las Coronas se consumen, se ganan, nunca se sortean) · **intercambio** entre jugadores · **campeones creados por usuarios** · propiedad/mint opcional sobre la procedencia de cartas · cuentas + persistencia completa en la nube ·
monetización (cosmética, pases de batalla, “batallas infinitas”). Token/`$ZING` deliberadamente aplazado;
el monedero hoy es solo identidad opcional de Entrenador.
