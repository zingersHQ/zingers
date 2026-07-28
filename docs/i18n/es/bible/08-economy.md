# 08 · Economía: Coronas y la capa de propiedad que hay debajo

> **En resumen:** El juego es completamente gratuito. Las **Coronas** son la moneda del juego que ganas jugando. Nunca puedes comprarlas ni retirarlas. Existe un token cripto opcional para coleccionistas, pero solo compra derechos de presumir y acceso, nunca poder y nunca un pago. Las dos monedas nunca se mezclan.

La regla cardinal: **el juego es gratuito y completo sin gastar ni poseer nada en cadena.** La cripto es una capa *debajo* del juego para quienes la deseen, nunca una puerta delante de él. Un jugador puede criar leyendas, escalar temporadas, coleccionar el dex y subir de temporada sin haber visto nunca una cartera.

Todo lo que sigue obedece una ley de diseño: **el token compra posición, acceso y permanencia. Nunca rendimiento.** Sin APY por staking, sin “stake para ganar”, sin bote donde los ganadores se llevan el dinero de los perdedores. Romper esa ley nos convierte en un valor y un casino; mantenerla nos mantiene como un juego indie con una capa de leyendas coleccionables.

Una segunda disciplina, de las reglas canónicas de la biblia: **no inventamos nombres de primer nivel nuevos.** La capa en cadena reutiliza las palabras que el mundo ya tiene. **temporadas** (la Crónica, [`06-seasons.md`](./06-seasons.md)) y **regiones** (los arenas temáticos, [`05-regions.md`](./05-regions.md)). En lugar de acuñar “Eras/Mundos” que colisionarían con el canon.

---

## Dos economías, nunca conectadas

| | **Coronas** | **El Token** (nombre provisional `$ZING`) |
|---|---|---|
| Naturaleza | Suave, dentro del juego | Duro, en cadena (Solana / SPL) |
| Cómo se obtiene | *Ganado* jugando | *Comprado* en un mercado, o airdrop por jugar |
| Para qué sirve | Entrenamiento, entradas, reforgias cosméticas | Entrada a clasificaciones en cadena, acuñación de cartas, posición de mecenas |
| Valor en efectivo | Ninguno, nunca | Valor de mercado (no es nuestra promesa) |
| ¿Se retiran? | **Nunca** | Solo en el mercado abierto, nunca *a través de nosotros* |

Los dos saldos **nunca se convierten entre sí y nunca comparten cartera.** En el momento en que las Coronas se puedan comprar con el token o el token se pueda ganar con Coronas, habremos construido transmisión de dinero y un retiro para una moneda de apuestas. El muro entre ellas es el invariante más importante de este documento.

En la práctica: un jugador nuevo solo toca Coronas. La mayoría nunca toca el token. El token es una capa optativa de coleccionista / lealtad para los comprometidos.

---

## Coronas (la moneda del mundo, gratuita)

Las **Coronas** son la moneda suave, ganada al jugar:

| Fuente | Recompensa |
|--------|--------|
| Ganar una pelea | Coronas + XP + rating |
| Presionar el Desafío | bote escalado, presión-tu-suerte (el **Desafío** es una racha de peleas consecutivas donde la recompensa sube pero una derrota la termina) |
| Entrenar | gastar Coronas → XP + evolución corporal hacia tu estrategia (el estilo de combate que has fijado) |
| Pelea de Rango (entrada a clasificaciones) | gastar Coronas → una pelea clasificada contra un rival aleatorio (sin grind gratuito de rating) |
| Hitos de Vuelo (Cien, primera-luz) | bolsas únicas; el Cien es una bolsa de celebración grande fuera del tope diario de ganancias |
| Objetivos diarios / de temporada | un goteo constante |

Las Coronas compran **entrenamiento, entradas y reforgias cosméticas.** Cosas que afectan el progreso de *tu* cuenta. Son dinero de juego: abundante, nunca vendido, nunca retirado. Las ganancias variables de Vuelo, Arena, cachés y metas comparten un tope diario para que el mundo se mantenga generoso sin volverse infinito; las bolsas de hitos quedan fuera de ese tope para que el Cien siga sintiéndose como una cumbre. El puesto en la tabla de oficio es orgullo, nunca una bolsa de Coronas: mejorar puede pagar, el ranking no.

### “Respaldar”, no “apostar”

Dentro de la economía de Coronas, el verbo del jugador es **respaldar**. *Respaldas* a un campeón para ganar (rachas de Arena/Diarias, apuestas de Terrenos clasificados). Retiramos la palabra “apostar” en toda la interfaz y el texto. “Respaldar a tu campeón” se lee como convicción, no como juego, y es el mismo verbo que usa la capa del token (tú *respaldas* a un campeón para una temporada). La mecánica subyacente no cambia; solo el lenguaje.

---

## El Token (`$ZING`, nombre provisional)

Un activo duro se asienta debajo del juego. Hace exactamente tres cosas, y nada que parezca un retorno de inversión:

1. **Paga la entrada a la tabla en cadena.** Quemando un poco o stakeando más (abajo).
2. **Acuña permanencia.** Quemado para inmortalizar a un campeón como carta en cadena.
3. **Confiere posición.** Crestas de mecenas, procedencia del dex, peso de asignación de la próxima temporada.

La oferta es deflacionaria por construcción: cada quema de entrada y cada quema de acuñación elimina tokens, mientras que las entradas stakeadas bloquean flotante durante toda una temporada. Podemos sembrar un trozo de tesorería para airdrops; nunca lo pagamos como rendimiento.

---

## Las clasificaciones en cadena (lo que el token controla)

El juego gratuito ya corre sobre un reloj de **temporada**: una temporada es la Bóveda abriendo una puerta más. Generativa, sembrada, con un reinicio *suave* de rango para que siempre lleves tu nombre adelante ([`06-seasons.md`](./06-seasons.md)). **Esa temporada gratuita queda intacta y sigue siendo gratuita para todos.**

El token controla una **clasificación optativa en cadena que corre sobre el mismo reloj de temporada.** Entrar a ella es lo único que el token desbloquea para jugar; la campaña, las clasificaciones de Coronas, el dex y lo Diario permanecen sin cartera. La clasificación en cadena:

- **Corre por temporada.** Abre cuando la temporada abre, **cierra en cadena** cuando gira (las acuñaciones se liquidan, las crestas se otorgan, los pesos del airdrop de la siguiente temporada se cuentan). Una carta acuñada lleva estampada la temporada en la que fue inmortalizada.
- **Está delimitada por región (opcional, más adelante).** Las regiones ya son los arenas temáticos con sesgo de Fuerza ([`05-regions.md`](./05-regions.md)). Una versión madura puede cobrar la entrada **por región** para que un jugador elija qué arena(s) disputar. La V1 la mantiene en **una clasificación de temporada completa**; el alcance por región es la expansión del bucle probado, no el lanzamiento.

> **Alcance v1:** una clasificación en cadena de temporada completa con entrada por quema-o-stake y un cierre en cadena. Las tablas por región llegan después de que el bucle lo gane. No construyas la taxonomía antes de que el bucle se pruebe.

---

## Entrada: quema-o-stake

Entrar a las clasificaciones en cadena de una temporada tiene un precio pagable de dos formas. La *elección* auto-segmenta a los jugadores, y ambos caminos reducen la oferta circulante.

| Camino | Costo | Resultado | Quién lo elige |
|------|------|---------|--------------|
| **Quema** | pequeño (`N`) | tokens destruidos para siempre | jugadores casuales / de una temporada |
| **Stake** | mayor (`~5–10·N`) | bloqueado hasta el fin de la temporada, **devuelto íntegro** | jugadores comprometidos / recurrentes |

- **Quema** es una tarifa de acceso consumida. Una *compra*, no una apuesta. Deflación pura; alimenta orgánicamente la narrativa de comprar-y-quemar.
- **Stake** es un **depósito de entrada reembolsable.** El principal regresa intacto al cierre de temporada, **sin tokens extra.** El único “costo” es la iliquidez (capital bloqueado por la temporada). Los stakers retiran temporalmente flotante; los quemadores lo retiran permanentemente.

Un jugador de una temporada sale mejor quemando `N`. Un jugador recurrente sale mejor stakeando una vez. Lo que lleva al bucle de lealtad.

### El bucle de lealtad: mantenerlo stakeado, saltarse la quema

El stake es **persistente entre temporadas**:

- Stakea una vez → quedas auto-inscrito en todas las temporadas siguientes, **sin quema requerida**, mientras permanezcas bloqueado.
- **El unstake solo se permite en un límite de temporada** (el bloqueo corre hasta el final de la temporada actual). Retirar te devuelve a quemar para reingresar.

Efecto neto: los jugadores leales bloquean capital indefinidamente y juegan gratis para siempre (un **piso de oferta** creciente y permanentemente bloqueado); el churn casual paga la **quema.** Ambos son deflacionarios. Ninguno es rendimiento. Esto rima con el reinicio suave de rango: mantienes tu posición de temporada en temporada, y ahora también puedes mantener tu *asiento*.

---

## Cierre de temporada: para qué sirve el stake

Cuando una temporada gira, las peleas se liquidan bajo reglas justas sembradas, y la clasificación en cadena cierra. **Todas las recompensas son no financieras.** Los stakers recuperan su principal *más* estatus; nadie recibe más tokens de los que puso.

- **Acuñar-para-inmortalizar.** Los campeones top (y cualquier dueño que opte) **queman token para acuñar** a su campeón como carta permanente en cadena. El arte es determinista a partir del registro de carrera, así que *el token es el historial.* Esto llena los campos inertes de procedencia que ya existen en cada carta: quién la posee, cuándo se acuñó, qué temporada la estampó.
- **Crestas de mecenas.** Si **respaldaste** (stakeaste detrás de) a un campeón para la temporada, recibes una **cresta** cosmética en su carta y tu handle queda registrado entre sus mecenas. Ponderado por cómo quedó el campeón. Pero la recompensa es *gloria*, no un pago.
- **Peso de airdrop.** La participación (rating subido, peleas vistas, rachas Diarias, Coronas ganadas, temporadas stakeadas) fija tu **peso de asignación** para el siguiente airdrop de la tesorería sembrada. El token se *gana jugando*, no se vende.

Así que una temporada se lee como: *juega toda la temporada en Coronas → la temporada gira en cadena → los mecenas reciben crestas → los campeones top se acuñan como cartas permanentes → las quemas de entrada y las quemas de acuñación ajustan la oferta → el airdrop de la siguiente temporada premia a quienes aparecieron.* La cripto es la vitrina de trofeos, nunca la tragamonedas.

---

## Restricciones de diseño (para que se acople limpiamente)

- **El muro se mantiene.** Las Coronas y el token nunca se convierten y nunca comparten saldo.
- **La procedencia ya está nombrada.** Las cartas ya llevan los campos para id de acuñación, dueño, cadena y temporada acuñada. Agregar la cadena es un *relleno*, no una reescritura. Agrega una lista de mecenas cuando lleguen las crestas.
- **Regiones, no mundos nuevos.** El alcance por arena reutiliza las regiones canónicas en lugar de inventar un contenedor paralelo.
- **Nunca se vende poder que afecte el juego.** El token y la propiedad compran procedencia, entrada, crestas y cosméticos. Nunca estadísticas, nunca victorias. Pago-para-poseer, nunca pago-para-ganar.
- **El determinismo es el prerrequisito.** El cierre de temporada en cadena solo funciona porque las peleas son demostrablemente justas (sembradas, deterministas). Mantén ese invariante sagrado.

---

## Guardarraíles regulatorios (el sobre seguro para indie)

Lanzamos con poco, pero nos mantenemos dentro de este sobre a propósito:

- **Sin rendimiento.** El stake devuelve *exactamente* el principal. Nunca “stake para ganar más tokens”, nunca APY, nunca una parte de las quemas de otros. Esta es la línea entre un depósito reembolsable y un valor/lotería no registrado.
- **La quema es una tarifa, no una apuesta.** Quemas para *acceder* a las clasificaciones, sin premio monetario por “ganar” denominado en el token.
- **Las recompensas son cosméticas/posición/asignación.** Crestas, acuñaciones, procedencia del dex, peso de airdrop. No efectivo, no pagos en token escalados al rendimiento.
- **Sin marketing del precio.** Hablamos de leyendas, temporadas y coleccionar. Nunca “el número sube”, nunca retornos.
- **Las Coronas nunca se retiran.** La economía suave queda amurallada de cualquier cosa con valor de mercado.

Mantenerse dentro de este sobre hace que el token sea una utilidad/coleccionable con un sumidero deflacionario. La postura de menor presión disponible para un lanzamiento indie no incorporado. (Geo/KYC y un envoltorio legal solo se necesitan si alguna vez añadimos *premios* denominados en token. Lo cual este diseño evita deliberadamente.)

---

## Preguntas abiertas (por resolver antes de construir)

- **Nombre y ticker del token.** `$ZING` es un marcador de posición. Candidatos que encajen en la lore: adyacentes a reliquia/ascua/sigilo. (Nota: “Coronas” está tomado por la moneda suave. Evitar colisión.)
- **Números de entrada.** `N` concreto (quema) y el múltiplo del stake (`5–10·N`), ajustados contra el precio esperado del token para que ningún camino sea una obviedad.
- **Entrada de temporada completa vs por región.** Cuando lleguen las regiones, ¿un stake cubre todas las regiones, o la entrada se cobra por región?
- **Elegibilidad de acuñación.** Solo Top-N, o cualquiera que opte? Costo de acuñación (cantidad a quemar)?
- **Límite de mecenas.** Cuántos mecenas pueden respaldar a un campeón; cómo escalan los niveles de cresta con la colocación.
- **Fórmula de airdrop.** La ponderación exacta de señales de juego → asignación.
- **Cadena/estándar.** Qué cadena y estándar de carta para las cartas acuñadas; si las acuñaciones son intercambiables desde el día uno.
