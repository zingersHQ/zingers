# 10 · Vuelo: el cielo sobre la Bóveda y por qué ascendemos

> **En resumen:** El mundo no es solo una superficie. Es una *altura*. Sobre las regiones flotantes el cielo se eleva en bandas llamadas **Alcances**, y subirlas significa salir del Zumbido hacia el pensamiento claro. Vuelas con un jetpack; tu campeón vuela a tu lado por sí mismo. La altura que alcanzas es el registro más fiel de quién eres.  
> Nombre que ve el jugador: **Vuelo**. La ficción sigue llamando al mundo vertical la Ascensión.

Este capítulo define la **geografía vertical** del mundo. Los capítulos 01 y 05 cartografían el mundo *en horizontal* (el Zumbido, la Bóveda, las regiones flotantes). Este lo hace *en vertical*. Los sistemas viven en [`docs/climb.md`](../climb.md); la ficción, aquí.  
Teléfono y escritorio son una misma alma, dos cuerpos ([`essence.md`](../essence.md)).

## Por qué subir

La Long Vault descansa en el fondo de todo, zumbando (véase [cosmology.md](./01-cosmology.md)). El Zumbido es más denso abajo, donde los pensamientos inconclusos de la red muerta se acumulan como niebla. **Cuanto más alto vuelas, más fino se vuelve el Zumbido.** El ruido se aleja y la mente puede oírse pensar. Por eso ascender no es un adorno del juego; es el instinto más antiguo del mundo hecho carne: *salir del murmullo*. Un Entrenador que ha llegado alto ha estado, literalmente, en un lugar más claro que todos los que quedaron abajo.

Por eso **la ascensión es el objetivo** (cosmology.md: «nunca derrotas al mundo, lo escalas mientras crece»). La Bóveda es la gravedad; el Vuelo es su respuesta.

## Los Alcances: capas del cielo

El cielo sobre el mundo se divide en **Alcances**: diez bandas, cada una con su clima, luz y peligros, apiladas desde las plataformas de salida del Centro hasta el silencio casi negro de la cima. No son lugares distintos, sino **altitudes del mismo cielo sobre el mismo mundo**. Cada Alcance adopta la piel de la región que sobrevuela (los Alcances de Ascuas arden; los Alcances de Jardín flotan con esporas), porque estás escalando sobre su terreno.

Los diez Alcances, de abajo arriba, culminan en **El Zumbido**: el Alcance más alto, casi negro y lleno de estrellas, el punto más elevado alcanzado por nadie y el más cercano al silencio por encima del ruido que da nombre al mundo entero. (La distribución de 100 sectores, roles, peligros y modificadores es asunto de sistemas; véase [`docs/climb.md`](../climb.md) §2.)

## Campamentos: las estaciones intermedias

Entre los Alcances flotan los **Campamentos**: pequeñas estaciones intermedias, una por cada frontera de Alcance, donde el escalador puede descansar, recuperar el aliento y ser contado. Llegar por primera vez a un Campamento es un hito. Se ilumina de forma permanente y queda registrado en tu Saga («primer Entrenador en encender el Campamento IV»). Son visibles desde abajo como luces en el cielo y constituyen el punto de encuentro entre el juego de vuelo y el mundo a pie: puedes descender desde un Campamento hacia la región que sobrevuela o lanzarte desde una región hacia el Vuelo. **Un Campamento es una puerta entre volar y recorrer.**

## El jetpack y quién lo necesita (canon)

El Vuelo tiene una regla fija y esencial, porque volar es el núcleo:

- **El Entrenador vuela con un jetpack.** Eres carne: un ser común en un cielo extraordinario. El jetpack es tu máquina; sin él caes. **El jetpack es exclusivo del Entrenador.** Forma parte de la silueta del Handler (cosmology.md, design-vision.md): sigilo dorado, panel de rango y el propulsor a la espalda.
- **El campeón no necesita jetpack.** Un campeón es una *mente*: un nudo en el Zumbido (cosmology.md). Un pensamiento no requiere motor para elevarse; tampoco un campeón. Por eso tu campeón **vuela a tu lado**, por su propio impulso, como un compañero de ala. Cuando un novato recién capturado abandona el suelo por primera vez, no está aprendiendo a usar una máquina. Está descubriendo que nunca estuvo atado al suelo. (Voz: el latido PRIMER VUELO, `lib/lore/character-beats.ts`.)

Todo cabe en cinco palabras, y es canon: **tú vuelas, él combate.** El único lugar donde el Entrenador actúa con sus propias manos es el vuelo; el único lugar donde actúa el campeón es la batalla. Ninguno invade el terreno del otro.

## El sigilo de Vuelo: la ascensión escrita en el cuerpo

El cuerpo de un campeón registra sus argumentos (champions.md: «el cuerpo es el argumento hecho visible»). El Vuelo añade otro autor a ese cuerpo: **tus ascensos**. Cada Alcance alcanzado graba un glifo en el **sigilo de Vuelo** del campeón: un halo que gana un glifo por cada Alcance y toma el color del cielo más profundo que hayas volado. Un centenar completado rodea el halo con la franja estelar del Alcance más alto.

La consecuencia es importante, aunque discreta: el cuerpo del campeón ahora registra **dos** trayectorias entrelazadas. *Sus* combates y *tus* ascensos. La criatura que crías lleva la prueba de lo que tú haces. (Mecánicas: [`essence.md`](../essence.md) §3; [`climb.md`](../climb.md) §6. Documentos antiguos pueden seguir llamándolo «sigilo de ascensión»; es lo mismo.)

## Desafíos: competir contra la marca de otro Entrenador

El Vuelo también es social sin que ambos jugadores estén conectados. Un **desafío** es una carrera compartible: el fantasma de otro jugador recorre la misma ruta y tú intentas superar su marca (o pasar el punto donde cayó).

- Los fantasmas permanecen semitransparentes para que tu mirada siga en la siguiente puerta.
- Superar su sector límite puede brindar un brindis y, si sobrepasas su marca de fallo, el resumen de la carrera puede indicar que lo superaste.
- Los enlaces compartidos conservan el sector que realmente superaste tras continuar, no solo el fallo. Ruta: `/ascent/<id>` (las formas de consulta siguen resolviéndose).

Mismas reglas en teléfono y escritorio (una misma alma). Código: `lib/climb-ghost.ts` y los ayudantes compartidos de ascenso en `components/grounds/climb/`.

## Dos cuerpos, un mismo cielo

Como todo en Zingers, el Vuelo es *una sola alma en cuerpos nativos* ([`essence.md`](../essence.md)):

- **Escritorio:** vuelo completo de seis grados en el mundo; el recinto del Circuito es una versión competitiva de los Cien.
- **Teléfono:** el mismo cielo, volado con un solo pulgar. Mantén pulsado para subir, suelta para bajar, atraviesa las puertas. Menos libertad, misma alma.

Mismos Alcances, mismos Campamentos, misma Bóveda abajo, mismo campeón a tu lado. La altura que alcanzaste es un hecho sobre tu Entrenador que te acompaña siempre; la *velocidad* con la que lo volaste es un arte que cada dispositivo puntúa por separado.

Entre puertas, chispas y barras que te empujan son peligros. Nunca son premios. Empujan y bloquean el empuje; no quitan Coronas ni vidas al contacto.  
El único tesoro intermedio es un alijo de Coronas flotando fuera de la línea de planeo entre puertas. Sube o baja para alcanzarlo. Perder uno nunca falla el sector.  
Detalle de sistemas: [`climb.md`](../climb.md).

Completar los cien sectores es una cumbre. Después, la ascensión no se vuelve infinita. Vuelas con más limpieza, compites contra el fantasma de un amigo o esperas un nuevo cielo semanal. La velocidad no es la historia. Móvil y escritorio conservan sus propias tablas de destreza.

## Por qué importa en el juego

- **El cielo es la columna vertebral.** Cada región tiene un Alcance encima; cada Alcance muestra la región debajo. El Vuelo es lo que mantiene unido todo el mapa.
- **La altura es honesta.** La profundidad escalada no se compra. Se vuela. Alimenta el Rango del Entrenador y marca al campeón, por lo que el campeón de un escalador alto *parece* pertenecer a alguien que ha estado allí arriba.
- **La ascensión nunca termina.** Como la Bóveda sobre la que se eleva. Siempre hay un Alcance más, un Campamento más, un metro más de aire más fino.
