# 08 · Economía: Coronas y la capa de propiedad subyacente

> **En pocas palabras:** El juego es completamente gratuito. Las **Coronas** son el dinero dentro del juego que ganas jugando. Nunca puedes comprarlas ni retirarlas. Existe un token cripto opcional para coleccionistas, pero solo compra derechos de presumir y acceso; nunca poder ni un pago. Las dos monedas nunca se mezclan.

La regla cardinal: **el juego es gratis y completo sin gastar ni poseer nada en cadena.** La cripto es una capa *debajo* del juego para quienes la deseen, nunca una barrera delante. Un jugador puede criar leyendas, escalar temporadas, coleccionar el dex y abrir la Bóveda sin haber visto nunca una cartera.

Todo lo que sigue obedece una ley de diseño: **el token compra prestigio, acceso y permanencia. Nunca rendimiento.** Sin APY por staking, sin “stakear para ganar”, sin bote donde los ganadores se lleven el dinero de los perdedores. Romper esa ley nos convierte en un valor y un casino; mantenerla nos deja como un juego indie con una capa coleccionable de leyendas.

Una segunda disciplina, de las reglas canónicas del bible: **no inventamos nombres nuevos de primer nivel.** La capa on-chain reutiliza las palabras que el mundo ya tiene: **temporadas** (la Crónica, [`06-seasons.md`](./06-seasons.md)) y **regiones** (los arenas temáticos, [`05-regions.md`](./05-regions.md)). En lugar de acuñar “Eras/Mundos” que colisionarían con el canon.

---

## Dos economías, nunca conectadas

| | **Coronas** | **El Token** (nombre provisional `$ZING`) |
|---|---|---|
| Naturaleza | Blanda, dentro del juego | Dura, en cadena (Solana / SPL) |
| Cómo se obtiene | *Ganada* jugando | *Comprada* en el mercado o airdrop por jugar |
| Para qué sirve | Entrenamiento, inscripciones, reforgias cosméticas | Entrada a clasificaciones on-chain, acuñar cartas, estatus de mecenas |
| Valor en efectivo | Ninguno, nunca | Valor de mercado (no es nuestra promesa) |
| ¿Se retira? | **Nunca** | Solo en el mercado abierto, nunca *a través de nosotros* |

Los dos saldos **nunca se convierten entre sí ni comparten cartera.** En el instante en que las Coronas se puedan comprar con el token o el token se pueda ganar con Coronas, habremos construido un sistema de transmisión de dinero y un retiro para una moneda de apuestas. El muro entre ellas es el invariante más importante de este documento.

En la práctica: un jugador nuevo solo toca Coronas. La mayoría nunca toca el token. El token es una capa optativa de coleccionista / fidelidad para los comprometidos.

---

## Coronas (la moneda del mundo, gratis)

Las **Coronas** son la moneda blanda, ganada jugando:

| Fuente | Recompensa |
|--------|------------|
| Ganar una pelea | Coronas + XP + rating |
| Pulsar el Desafío | bote creciente, presión por suerte (el **Desafío** es una racha de peleas consecutivas donde la recompensa sube pero una derrota la termina) |
| Entrenar | gastar Coronas → XP + evolución corporal hacia tu estrategia (el estilo de combate que has fijado) |
| Objetivos diarios / de temporada | un goteo constante |

Las Coronas compran **entrenamiento, inscripciones y reforgias cosméticas**. Cosas que afectan el progreso de *tu* cuenta. Son dinero de juego: abundante, nunca vendido, nunca retirado. (Los valores canónicos viven en `lib/economy.ts`; el servidor posee el saldo, el cliente lo refleja.)

### “Respaldar”, no “apostar”

Dentro de la economía de Coronas, el verbo del jugador es **respaldar**. *Respaldas* a un campeón para ganar (rachas de Arena/Diarias, apuestas en los Terrenos clasificados). Retiramos la palabra “apostar” en toda la interfaz y el texto. “Respaldar a tu campeón” suena a convicción, no a juego, y es el mismo verbo que usa la capa del token (tú *respaldas* a un campeón por una temporada). El mecanismo subyacente no cambia; solo el lenguaje.

---

## El Token (`$ZING`, nombre provisional)

Un activo duro subyace al juego. Hace exactamente tres cosas, y nada que parezca un retorno de inversión:

1. **Paga la entrada a la clasificación on-chain**. Quemando un poco o stakeando más (abajo).
2. **Acuña permanencia**. Quemado para inmortalizar un campeón como carta en cadena.
3. **Confiere estatus**. Crestas de mecenas, procedencia del dex, peso de asignación para la siguiente temporada.

La oferta es deflacionaria por construcción: cada entrada quemada y cada acuñación quema tokens, mientras que las entradas stakeadas bloquean flotante durante toda una temporada. Podemos sembrar un trozo de tesorería para airdrops; nunca lo pagamos como rendimiento.

---

## La clasificación on-chain (lo que el token controla)

El juego gratuito ya funciona con un reloj de **temporada**: una temporada es la Bóveda abriendo una puerta más. Generativa, sembrada, con un reinicio *suave* de rango para que siempre lleves tu nombre adelante ([`06-seasons.md`](./06-seasons.md)). **Esa temporada gratuita permanece intacta y sigue siendo gratis para todos.**

El token controla una **clasificación optativa on-chain que corre con el mismo reloj de temporada.** Entrar es lo único que el token desbloquea para jugar; la campaña, las clasificaciones de Coronas, el dex y las Diarias siguen sin necesidad de cartera. La clasificación on-chain:

- **Corre por temporada**. Abre cuando la temporada abre, **cierra en cadena** cuando gira (las acuñaciones se liquidan, las crestas se otorgan, se cuentan los pesos del airdrop de la siguiente temporada). Reutiliza la procedencia `mintedSeason`, así que una carta acuñada queda sellada con la temporada en que se inmortalizó.
- **Está delimitada por región (opcional, más adelante).** Las regiones ya son los arenas temáticos con sesgo de Fuerza ([`05-regions.md`](./05-regions.md)), conectados a través de `/api/battle` como `regionBias`. Una versión madura puede cobrar la entrada **por región** para que el jugador elija qué arena(s) disputar. La V1 se limita a **una clasificación global por temporada**; el alcance por región es la expansión del bucle probado, no del lanzamiento.

> **Alcance v1:** una clasificación on-chain global por temporada con entrada por quema o stake y cierre en cadena. Las clasificaciones por región llegan después de que el bucle lo haya ganado. No construyas la taxonomía antes de que el bucle se demuestre.

---

## Entrada: quemar o stakear

Entrar a la clasificación on-chain de una temporada tiene un precio pagable de dos formas. La *elección* segmenta a los jugadores, y ambos caminos reducen la oferta circulante.

| Camino | Costo | Resultado | Quién lo elige |
|--------|-------|-----------|----------------|
| **Quemar** | pequeño (`N`) | tokens destruidos para siempre | jugadores casuales / de una temporada |
| **Stakear** | mayor (`~5–10·N`) | bloqueado hasta el fin de la temporada, **devuelto íntegro** | jugadores comprometidos / recurrentes |

- **Quemar** es una tarifa de acceso consumida. Una *compra*, no una apuesta. Deflación pura; alimenta orgánicamente la narrativa de comprar y quemar.
- **Stakear** es un **depósito de entrada reembolsable**. El principal vuelve intacto al cierre de temporada, **sin tokens extra**. El único “costo” es la iliquidez (capital bloqueado durante la temporada). Los stakers retiran temporalmente flotante; los quemadores lo retiran permanentemente.

Un jugador de una temporada sale ganando quemando `N`. Un jugador recurrente sale ganando stakeando una vez. Lo que lleva al bucle de fidelidad.

### El bucle de fidelidad: mantener stakeado, saltarse la quema

El stake es **persistente entre temporadas**:

- Stakeas una vez → quedas auto-inscrito en todas las temporadas siguientes, **sin necesidad de quemar**, mientras permanezcas bloqueado.
- **Solo se puede retirar stake al límite de temporada** (el bloqueo dura hasta el final de la temporada actual). Retirar te devuelve a quemar para reingresar.

Efecto neto: los jugadores leales bloquean capital indefinidamente y juegan gratis para siempre (un **suelo de oferta** creciente y permanentemente bloqueado); la rotación casual paga la **quema**. Ambos son deflacionarios. Ninguno es rendimiento. Esto rima con el reinicio suave de rango: mantienes tu posición de temporada en temporada, y ahora también puedes mantener tu *asiento*.

---

## Cierre de temporada: para qué sirve el stake

Cuando una temporada gira (determinísticamente. Las peleas son demostrablemente justas mediante RNG sembrado, `lib/engine/xai.ts:makeRng`), la clasificación on-chain se liquida. **Todas las recompensas son no financieras.** Los stakers recuperan su principal *más* estatus; nadie recibe más tokens de los que puso.

- **Acuñar para inmortalizar.** Los campeones top (y cualquier dueño que opte) **queman token para acuñar** su campeón como carta permanente en cadena. El arte es determinista a partir del historial de carrera, así que *el token es el historial*. Esto rellena los campos inertes de procedencia que ya existen. `mintId`, `owner`, `chain`, `mintedSeason` en `CardProvenance` (`lib/cards/card.ts`). Sin cambio de esquema.
- **Crestas de mecenas.** Si **respaldaste** (stakeaste detrás de) un campeón durante la temporada, recibes una **cresta** cosmética en su carta y tu handle/cartera queda registrada en la lista de procedencia/patrocinadores de la carta. Ponderada por la posición del campeón. Pero la recompensa es *gloria*, no un pago.
- **Peso de airdrop.** La participación (rating subido, peleas vistas, rachas Diarias, Coronas ganadas, temporadas stakeadas) establece tu **peso de asignación** para el siguiente airdrop desde la tesorería sembrada. El token se *gana jugando*, no se vende.

Así que una temporada se lee así: *juegas toda la temporada con Coronas → la temporada gira en cadena → los mecenas reciben crestas → los campeones top se acuñan como cartas permanentes → las quemas de entrada y las quemas de acuñación ajustan la oferta → el airdrop de la siguiente temporada premia a quienes se presentaron.* La cripto es la vitrina de trofeos, nunca la tragaperras.

---

## Restricciones de diseño (para que encaje limpiamente)

- **El muro se mantiene.** Las Coronas y el token nunca se convierten ni comparten saldo (`lib/economy.ts` permanece libre de token; el token vive en su propio módulo/contrato).
- **La procedencia ya está cableada.** `CardProvenance` lleva `mintId`, `owner`, `chain`, `mintedSeason` inertes desde el día uno. Añadir la cadena es un *relleno*, no una refactorización. Añadir un campo de lista de mecenas cuando lleguen las crestas.
- **Regiones, no nuevos mundos.** El alcance por arena reutiliza `regionBias` y las regiones canónicas en lugar de inventar un contenedor paralelo.
- **Nunca se vende poder que afecte al juego.** Token y propiedad compran procedencia, entrada, crestas y cosméticos. Nunca estadísticas, nunca victorias. Pagar-para-poseer, nunca pagar-para-ganar.
- **El determinismo es el prerrequisito.** El cierre de temporada en cadena solo funciona porque las peleas son demostrablemente justas (RNG sembrado y determinista). Mantener ese invariante sagrado.

---

## Barreras regulatorias (el sobre seguro para indie)

Lanzamos con poco, pero nos quedamos dentro de este sobre a propósito:

- **Sin rendimiento.** El stake devuelve *exactamente* el principal. Nunca “stakea para ganar más tokens”, nunca APY, nunca una parte de las quemas de otros. Esta es la línea entre un depósito reembolsable y un valor/lotería no registrado.
- **La quema es una tarifa, no una apuesta.** Quemar para *acceder* a la clasificación, sin premio monetario por “ganar” denominado en el token.
- **Las recompensas son cosméticas/de estatus/asignación.** Crestas, acuñaciones, procedencia del dex, peso de airdrop. No efectivo, no pagos en tokens escalados al rendimiento.
- **Sin marketing del precio.** Hablamos de leyendas, temporadas y coleccionar. Nunca “el número sube”, nunca retornos.
- **Las Coronas nunca se retiran.** La economía blanda permanece aislada de cualquier cosa con valor de mercado.

Mantenernos dentro de este sobre hace que el token sea una utilidad/coleccionable con un sumidero deflacionario. La postura de menor presión disponible para un lanzamiento indie no incorporado. (Geo/KYC y un envoltorio legal solo se necesitan si alguna vez añadimos *premios* denominados en token. Lo cual este diseño evita deliberadamente.)

---

## Preguntas abiertas (por resolver antes de construir)

- **Nombre y ticker del token.** `$ZING` es un marcador de posición. Candidatos que encajen en el lore: adyacentes a reliquia/ascua/sigilo. (Nota: “Coronas” ya está ocupado por la moneda blanda. Evitar colisión.)
- **Números de entrada.** `N` concreto (quema) y el múltiplo de stake (`5–10·N`), ajustados al precio esperado del token para que ningún camino sea una obviedad.
- **Entrada global por temporada vs. por región.** Cuando lleguen las regiones, ¿un stake cubre todas las regiones o la entrada se cobra por región?
- **Elegibilidad para acuñar.** Solo los N mejores, o cualquiera que opte? Costo de acuñación (cantidad a quemar)?
- **Límite de mecenas.** Cuántos mecenas pueden respaldar a un campeón; cómo escalan los niveles de cresta con la posición.
- **Fórmula de airdrop.** La ponderación exacta de las señales de juego → asignación.
- **Cadena/estándar.** Token SPL + qué estándar NFT (p. ej. Metaplex) para las cartas acuñadas; si las acuñaciones son intercambiables desde el día uno.
