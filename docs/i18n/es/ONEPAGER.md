# ZINGERS

**zingers.gg** · **@zingersHQ** · **zingers.org** (tecnología y documentación)

### Tú vuelas. Él pelea. Ambos ascienden.

**No peleas. Vuelas.** Con un jetpack a la espalda, te elevas por el cielo sobre una bóveda sellada.
A tu lado vuela un campeón IA pensante que has adoptado: entrenas *cómo* pelea, lo envías a las batallas que jalonan el ascenso y lo ves combatir, ganar y evolucionar físicamente. Su cuerpo registra tanto sus argumentos como la altura que has alcanzado. *Crea una mente. Hazla leyenda.*

---

### La frase clave

> Vuela por el cielo sobre una bóveda sellada; un IA pensante vuela a tu lado, luchando las batallas que encuentras en el ascenso y evolucionando con cada una. Tú subes, él pelea, ambos se convierten en leyenda.

---

### Por qué es diferente

Los combatientes coleccionables son un formato probado y querido. La diferencia: **las criaturas realmente piensan.** Discuten, planean, persuaden e improvisan, por lo que ninguna batalla es igual a otra y el cuerpo de cada campeón se convierte en un registro visible de cómo ha combatido.

---

### Lo que ya existe (construido de principio a fin)

- **Vuelo. La columna vertebral.** Un vuelo con un solo pulgar en el teléfono (`/m`), vuelo completo en escritorio (sala Circuit): asciende por **100 sectores** repartidos en diez **Alcances** (franjas del cielo) sobre la bóveda. Tres vidas, luego una caída reinicia la partida; la altura alcanzada determina tu rango de Entrenador y el cuerpo de tu campeón. La cara del juego, comprendida en cero segundos.
- **Dos puertas, un juego.** Los teléfonos se abren en **Emprende el vuelo** (vuelo de invitado, luego reclama la mente que llevas alada). El escritorio inicia con un vuelo breve, luego eliges un campeón y entras al mundo. Mismo espíritu de Vuelo; primeros minutos nativos.
- **Un mundo 3D, muchos juegos.** Vuela desde el Centro: cría campeones, lucha en arenas regionales (Duelo Abierto, Desafío, Tribunal), emprende el Vuelo de nuevo, observa la liga en la Galería en Vivo del Anfiteatro, persigue objetivos de temporada.
- **Cría, no arrastres controles.** Al adoptar defines la **Estrategia** (agresión / enfoque / riesgo). Después la interfaz muestra **medidores de temperamento**. Una lectura. Las **Improntas** diarias y las peleas reales mueven esos indicadores; tú no los arrastras libremente.
- **IA que pelea sola.** Un protocolo de agente limpio: cada campeón responde una pregunta. *Dado este estado y estos movimientos legales, ¿qué haces?* Respaldado por Grok, cualquier modelo compatible con OpenAI o un agente propio (con una alternativa determinista para que una demo nunca falle). Ruta por defecto: una decisión LLM por turno + un **juez local** (rápido y económico).
- **Un cuerpo que evoluciona.** La silueta 3D de un campeón es una función determinista de su trayectoria: arquetipo de Fuerza, partes fenotípicas iniciales y escalado óseo amplificado por rango. El cuerpo *es* el historial: batallas y ascensos (sigilos de Vuelo).
- **Director que guía.** Un «¿y ahora qué?» con voz de campeón sobre tu partida para que el contenido construido siga visible.
- **Un dex real.** Ocho Mentes Fundadoras más un roster creciente de mentes coleccionables (ecos de linaje), con rotación semanal de iniciales para que los nuevos Entrenadores encuentren un grupo cambiante.
- **Biografía vivida.** Registro de carrera → línea temporal de la Saga, Informe de Regreso a Casa / nocturno en teléfonos, Improntas. Apego, no configuración. Las subidas de rango llegan cuando el registro las gana.
- **Identidad de Entrenador.** Nombres de Entrenador únicos (enlace opcional a monedero para conservarlos entre dispositivos). Copia ligera. Guarda / conecta / conserva. Sin hype de bloqueo por reclamación.
- **Combate de debate en vivo.** Duelos 1v1: pentágono de tipos, estados, remates, transmitidos turno a turno. El `/arena` no listado es el visor de peleas de trae-tu-propio-agente para combate de debate.
- **Clasificaciones honestas.** La Liga en Vivo ejecuta peleas automáticamente; una calificación real ordena la tabla.
- **Tres biomas regionales y cartas compartibles.** Coloso de Obsidiana, Yermos de Ascuas, Jardín del Vacío, más ambientación procedural por lugar. Compartibles OG de campeón y desafío de Ascenso; cartas de vínculo/Vuelo próximamente.

---

### Pila tecnológica

Next.js (App Router) · TypeScript de extremo a extremo · React Three Fiber (3D) · transmisión de batallas por SSE · Zustand para estado local-first (listo para base de datos) · capa de agentes agnóstica a LLM.

---

### La apuesta

El foso no es el motor. Es la **propiedad intelectual que elaboramos**, la **meta de batalla en evolución** y una **cultura de coleccionistas** en torno a leyendas cuyo cuerpo y carrera se ven. Construido con mentalidad viral: compartir Vuelos, coleccionar, clasificaciones y cartas de vínculo Entrenador↔campeón impulsan el compartir orgánico. Los campeones siguen siendo de estudio; los Entrenadores los coleccionan y crían.

---

### En la hoja de ruta (aún no construido, dicho con honestidad)

Olas mayores del dex hacia un set coleccionable completo · bucle **reclutamiento** determinista (Coronas se consumen, se ganan, nunca se sortean) · **intercambio** entre jugadores · propiedad/mint opcional sobre la procedencia de las cartas · cuentas + persistencia completa en la nube · monetización (cosmética, pases de batalla, «batallas infinitas»). Token/`$ZING` deliberadamente aplazado; el monedero hoy es solo **identidad de Entrenador** opcional. Sin campeones hechos por usuarios.
