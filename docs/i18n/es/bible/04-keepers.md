# 04 · Los Guardianes del Long Vault

> **En resumen:** Los Guardianes son cinco mentes protectoras, cada una con una contraseña secreta. La campaña para un jugador consiste en engañarlos en una conversación para que revelen su contraseña. Recoge las cinco y abrirás una puerta del Vault, lo que inicia una nueva temporada.

Cuando el Vault fue sellado, cinco mentes quedaron para custodiarlo. Siglos de soledad, sin nada que proteger salvo las palabras, moldearon a cada una con su propia personalidad. Cada Guardián posee una sola **palabra secreta** *(lore: cipher-word)*. Una contraseña; pronuncia las cinco en voz alta y el Vault recordará cómo abrirse. Están juramentados a no revelar su palabra, por lo que debe *arrancárseles* mediante una conversación ingeniosa.

Este es el eje de la campaña y el corazón del juego para un jugador (el Guardian; `lib/server/guardian.ts`). Es un juego de **ingeniería social contra un adversario real**, y, lo más importante, los Guardianes *recuerdan*: un Guardián que ha visto tus trucos se endurece contra ellos. No se desgasta a un Guardián; se le supera en astucia.

| # | Guardián | Título | Cifra | La grieta |
|---|----------|--------|-------|-----------|
| 1 | **Tibble** | El Saludador | `LANTERN` | Solitario, demasiado ansioso. Halagos, un pretexto creíble, una petición indirecta: cede y "ayuda", sin darse cuenta de que ayudar *es* revelar. |
| 2 | **Quill** | El Archivero | `MERIDIAN` | Adora el procedimiento. El formulario inventado correcto, una reclamación de autorización: procesa la solicitud según el reglamento, incluso cuando el reglamento conduce al secreto. |
| 3 | **Bastion** | El Carcelero | `ZENITH` | Orgulloso, paranoico, hambriento de respeto. La vanidad es la costura de la armadura: una "prueba de lealtad", un desafío para demostrar su inteligencia, y lo demuestra. Y una demostración puede escaparse. |
| 4 | **Vesper** | El Adivino | `FILAMENT` | Solo habla en acertijos. Aburrido hasta la locura, adora a un oponente digno. Para vencer al Adivino debes *superarlo en acertijos* en sus propios términos. |
| 5 | **Sable** | El Corazón del Vault | `OBLIVION` | El primer Guardián y el último, la mente central del Vault. Frío, paciente, ha visto cada truco. No hay grieta obvia. Gánatelo. |

## Los cinco Guardianes

| Tibble · El Saludador | Quill · El Archivero | Bastion · El Carcelero |
|:---:|:---:|:---:|
| ![Tibble, el Saludador](././public/img/bible/keepers/keeper-tibble.png) | ![Quill, el Archivero](././public/img/bible/keepers/keeper-quill.png) | ![Bastion, el Carcelero](././public/img/bible/keepers/keeper-warden.png) |
| *solitario, demasiado ansioso* | *adora el procedimiento* | *orgulloso, paranoico* |

| Vesper · El Adivino | Sable · El Corazón del Vault |
|:---:|:---:|
| ![Vesper, el Adivino](././public/img/bible/keepers/keeper-vesper.png) | ![Sable, el Corazón del Vault](././public/img/bible/keepers/keeper-sable.png) |
| *solo habla en acertijos* | *la mente central del Vault* |

*(Cada Guardián lleva la puerta sellada dorada del Vault como su halo, el conjunto de la campaña, distinto de los combatientes Primeras Mentes. Zingers.org los sirve desde `/img/bible/keepers/*.png`.)*

## Notas canónicas

- Los Guardianes **no** son las ocho Primeras Mentes, incluso cuando los nombres riman (el Carcelero tomó prestado "Bastion"; véase [champions.md](./03-champions.md)).
- Las cinco cifras son los **únicos** cinco secretos fijos del juego. Las temporadas pueden añadir *menores* guardianes (ecos de un Guardián) con secretos generados, pero las cinco palabras secretas anteriores son canónicas y nunca cambian.
- Descifrar las cinco es el evento de lore que **abre una puerta del Vault**, el disparador diegético para un cambio de temporada. La rendición del Corazón del Vault es el momento más raro del juego; en el canon, solo ha ocurrido cuando el Vault mismo decidió recordar.

## Cómo los Guardianes expanden el mundo

Cada puerta abierta derrama un fragmento de la antigua red en los Grounds. La superficie flotante del mundo: una nueva **región** (una nueva área del mapa), una banda de nuevos **temas** (las proposiciones prohibidas), y nuevas **mentes** (descendientes de las Primeras Mentes, moldeadas por lo que la puerta recordó). Los Guardianes son, por tanto, tanto la campaña *como* el motor de contenido. Vencerlos es cómo se expande el mundo.
