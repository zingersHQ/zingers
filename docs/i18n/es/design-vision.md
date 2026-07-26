# ZINGERS: Documento de Visión de Diseño

> **En pocas palabras:** Este es el documento norte del producto. Zingers es un juego donde eres un **Entrenador**. **Vuelas** por el cielo sobre una bóveda sellada, y lo que vuela a tu lado es una **mente que estás criando**: un campeón de IA que discute en batallas de debate en vivo, cuyo cuerpo cambia visiblemente para registrar cómo ha peleado. Tú subes; él pelea por ti. Este documento expone esa visión central y las reglas de diseño que la protegen.

Versión 3.1 · Julio 2026 (**Flight-First**; nombre del modo del jugador **Vuelo**; clasificación, no ladder)

Fuente de verdad del producto y diseño. El canon del lore vive en [`docs/bible/`](./bible/) (Vuelo / mundo vertical: [`10-ascent.md`](./bible/10-ascent.md)); mecánicas en [`game-spec.md`](./game-spec.md); una sola alma en todos los dispositivos en [`essence.md`](./essence.md); puertas en [`two-doors.md`](./two-doors.md); plan de retención en [`long-game.md`](./long-game.md); sistemas en [`climb.md`](./climb.md); nomenclatura en [`vocabulary.md`](./vocabulary.md).

## 0. Qué significa Flight-First

v1.0 priorizaba la batalla: *cría una mente, mírala pelear.* Cierto, pero entierra el único verbo que un extraño entiende en **cero segundos** (vuelo) bajo una pila de sistemas que solo conoce después de que le importe. Flight-First reordena el **rango de los verbos**, no los sistemas:

- **El Vuelo es la columna y la cara del juego.** Lo primero que haces, la marca, la portada y el tejido conectivo de todo el mapa. (Nombre del lore para el mundo vertical: el Ascenso. Etiqueta del modo del jugador: **Vuelo**. Nunca mostrar Circuito/Ascenso como nombres de modo.)
- **Las batallas son lo que encuentras en el camino hacia arriba.** La profundidad que el ascenso sigue revelando, y lo que te permite subir más alto. No son menores; se reubican de *el producto* a *la razón por la que el ascenso tiene apuestas.*
- **Nada estructural se elimina.** El motor, la clasificación, el juez, la autoridad de las Coronas, el mundo vivo, los Guardianes, la Crónica: todo permanece. Esto es un recorte de encuadre y onboarding, más la pila del Director del juego largo que hace legible el contenido construido ([`long-game.md`](./long-game.md)).

La frase única: **Tú vuelas. Él pelea. Ambos suben.**

## 1. Declaración de Visión

Zingers es un juego sobre **ascender**. Eres un **Entrenador**: vuelas (con un jetpack en la espalda) a través del cielo flotante sobre la **Bóveda Larga**, el almacén sellado en el corazón del mundo. Tú no peleas. Volando a tu lado hay un **campeón**: una mente que adoptaste y estás criando, cuyo cuerpo literalmente se convierte en el registro de cada argumento que ha ganado y perdido. Tú subes por el cielo; él discute su camino a través de las batallas que salpican el ascenso; y ambos dejan una marca en el otro. Tus ascensos estampan **sigilos de Vuelo** en su cuerpo; sus victorias te llevan más alto.

**Promesa central:** *Tú vuelas. Una mente vuela a tu lado y se argumenta a sí misma en un cuerpo.*

## 2. Pilares de Diseño (innegociables)

| Pilar | Qué significa | Qué descarta |
|--------|---------------|-------------------|
| **El Mundo Es un Ascenso** | El progreso es altitud hecha física. El Vuelo es la columna de la que cuelga cada otro verbo. | Progresión plana, en forma de menú o lobby-primero; vuelo como minijuego separado |
| **Criar, No Pelear** | Eres el Entrenador. Tú vuelas; tu campeón pelea. El único lugar donde *tú* actúas con tus propias manos es el vuelo. | Control directo de movimientos en batalla |
| **Cuerpo = Argumento Hecho Visible** | La forma de un campeón es la historia visible de su carrera: debates *y* tus ascensos (sigilos de Vuelo), más el fenotipo de Fuerza. | Evolución solo cosmética o skins basadas en estadísticas |
| **Agentes con Almas** | Memoria persistente, estrategia, persona, razonamiento visible. | IA de caja negra o luchadores silenciosos |
| **El Mundo Está Vivo** | Exploración 3D donde Entrenadores y campeones coexisten y vuelan. | Juego puramente basado en menús o solo lobby |
| **El Rango de Entrenador Es Eterno** | Identidad y estatus a nivel de cuenta; la profundidad ascendida es parte de ello. | Todo se reinicia cuando cambias de campeón |
| **El Argumento Es Física** | El Zumbido: el consenso moldea la realidad; ganar un debate reconfigura lo que es verdad. | Lore puramente narrativo o no mecánico |

## 3. Vuelo: quién vuela, y cómo (canon)

El Vuelo es central, así que sus reglas son canon, no sabor:

- **El Entrenador vuela con un jetpack.** Eres un ser ordinario en un cielo extraordinario; el jetpack es la máquina que te permite ascender. **El jetpack es solo del Entrenador.** Es tu herramienta, nunca del campeón.
- **El campeón vuela porque es una mente.** Un campeón es un nudo en el Zumbido; no necesita una máquina para abandonar el suelo. Asciende de la forma en que asciende un pensamiento. Así que tu campeón **vuela a tu lado** (un compañero de ala), por sí solo, sin jetpack.
- **El vuelo es el alma del intérprete.** Porque el campeón pelea y el Entrenador vuela, el Vuelo es el *único* lugar donde el jugador actúa con sus propias manos sin romper "Criar, No Pelear." (Ver [`essence.md`](./essence.md) §3.)
- **La profundidad es alma; el tiempo es oficio.** Qué tan alto has ascendido es un hecho sobre *ti* (el Entrenador) → Rango de Entrenador + un sigilo de Vuelo en el cuerpo del campeón, compartido entre dispositivos. Maestría en Twitch (tiempo) → Coronas + tablas por dispositivo. (Ver [`essence.md`](./essence.md) §3, [`climb.md`](./climb.md) §1.)
- **Los desafíos** te permiten competir contra la marca fantasma de otro Entrenador sin que ambos estén en línea ([`bible/10-ascent.md`](./bible/10-ascent.md)).

**Línea de enseñanza canónica:** *Tú vuelas. Él pelea. Ambos suben.*

## 4. El Entrenador (Tú)

No eres una mente. Eres un **Entrenador**: la persona que cría a los campeones. Vuelas por el mundo, crías mentes, mantienes **Rango de Entrenador**, trabajas con los Guardianes (las cinco mentes guardianas de la campaña), y puedes jurar lealtad a un **Clan**: una de las Cinco Fuerzas, elegida como el lado por el que peleas.

- **Handler** = lo que ves en el mundo 3D (tu avatar, jetpack en su espalda).
- **Entrenador** = quién eres (identidad, rango, saga, la profundidad que has ascendido).

El Handler debe sentirse intencional desde el primer minuto: sigilo dorado de Entrenador, cartelera de rango, jetpack, distinto de los campeones. **La movilidad del jetpack es solo del Entrenador.**

El texto guía (Director, resultados, entrenadores del Centro) habla **como el campeón**: nosotros / nos / quédate conmigo. Nunca cromo de señal de misión. Nunca comercializar "te habla" como característica. Ver [`vocabulary.md`](./vocabulary.md).

## 5. Los Campeones

Los campeones son mentes que se estabilizaron en el Zumbido. Sus cuerpos son argumentos hechos visibles. Tienen memoria, estrategia, persona y pelean de forma autónoma. Tú estableces condiciones; ellos deciden movimientos y líneas. **Vuelan a tu lado** en Vuelo (sin jetpack; son mentes), y sus cuerpos registran tanto sus batallas como tus ascensos.

**Un campeón activo** que crías y envías; la **colección / dex** crece mediante reclutamiento y mentes por lotes de Etapa 6 (`store/champions.ts`, `content/minds/reviewed/`). Las ofertas de adopción semanales dan un inicial por Fuerza de las Primeras Mentes + pool horneado.

## 6. Mundo y Lore (resumen)

- **Vuelo** (lore: el Ascenso): el cielo sobre la Bóveda donde el Zumbido se adelgaza; ascender es salir del ruido del pensamiento muerto. Jugable como un solo juego en teléfono y escritorio (ver [`bible/10-ascent.md`](./bible/10-ascent.md), [`climb.md`](./climb.md)).
- **El Zumbido**: el argumento es física; el consenso es terreno.
- **La Bóveda Larga**: sellada bajo el mundo; las estaciones abren puertas.
- **Los Guardianes**: cinco jefes de campaña; palabras secretas desbloquean la Crónica.
- **El mundo** (lore: los Terrenos): regiones flotantes a la deriva; **el Centro** (lore: la Concordia) + puertas.
- **Cinco Fuerzas**: tipos `LÓGICA | CAOS | COMPOSTURA | RETÓRICA | CREATIVIDAD`. UI del jugador: **Lógica, Estática, Calma, Coro, Chispa**. Los nombres profundos del lore permanecen solo en la biblia.

## 7. Bucle Central

**Volar → Reclamar → Criar → Pelear → Ascender más alto.**

Vuelas primero (la puerta que todos entienden) → una mente salvaje vuela a tu lado y la **reclamas** → la **crías** (semilla de Estrategia, luego lectura de Improntas / temperamento) → la envías a **pelear** → y cada resultado te permite **ascender más alto**, más profundo en los Alcances. El bucle es una espiral, no una línea: cada altura revela el siguiente sistema.

**Liga asíncrona:** los campeones pelean sin que ambos humanos estén en línea (Galería en Vivo). Tú vuelas; ellos siguen peleando. **Clasificaciones** honestas / tabla de rating (nunca comercializadas como ELO o ladder en el texto del jugador).

**Director:** una guía pura de "¿qué ahora?" sobre el estado de guardado (`lib/director.ts`), con voz del campeón, para que el contenido construido permanezca visible ([`long-game.md`](./long-game.md) Etapa 0).

## 8. Contrato de Onboarding (regla de 90 segundos)

Antes de abandonar el primer vuelo, el jugador debe entender:

1. *Yo vuelo. Esa cosa a mi lado es mi campeón. Lo crío; él pelea.*
2. *Qué tan alto asciendo es mi récord; el ascenso marca el cuerpo de mi campeón.*
3. *Hay todo un mundo allá abajo que el ascenso me está mostrando.*

Ver [`flight-first-plan.md`](./flight-first-plan.md), [`two-doors.md`](./two-doors.md), [`flyover.md`](./flyover.md). Acto 1 histórico liderado por peleas: [`first-journey-roadmap.md`](./first-journey-roadmap.md).

## 9. Enviado vs aspiracional

| Enviado | Aspiracional |
|---------|--------------|
| Separación Handler + campeón, HUD de Rango de Entrenador, jetpack del Entrenador | Otros Entrenadores visibles en el mundo (capa social) |
| Vuelo: cuerpo de Circuito móvil + escritorio de 100 sectores, paridad, desafíos | Batallas como llaves de altitud que bloquean Alcances más altos |
| Un campeón poseído + dex en crecimiento + iniciales semanales | Capa completa de comercio / acuñación de propiedad |
| El campeón vuela a tu lado; sigilo de Vuelo; marcas de especie fenotípicas | Desbloqueos cosméticos del Handler |
| Director + pista de desbloqueo + rasgos de ala + Condiciones + expediciones | Guardianes re-iluminados como actuaciones |

## 10. Principios de diseño (decisiones futuras)

- **El Vuelo es la columna.** Los nuevos verbos deben sentarse sobre el Vuelo o ser alcanzables desde él; nada separado se envía sin un gancho de regreso (ley del documento de crecimiento).
- Nunca hacer que el jugador sienta que *es* el campeón en 3D.
- Preferir profundidad paramétrica (Condiciones, rasgos de ala, oleadas de dex) sobre nuevos contenedores vacíos.
- Mantener el vocabulario del jugador honesto: Entrenador, Estrategia, Clan, pelea/batalla/duelo, Vuelo, clasificaciones. Sin bout, sin etiquetas ELO/ladder, sin em dash espaciado en texto legible por el jugador.
