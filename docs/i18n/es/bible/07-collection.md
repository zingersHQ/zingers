# 07 · La Colección: cartas, rareza y atributos

> **En resumen:** Cada campeón funciona también como una carta coleccionable, como en Pokémon o Magic. A diferencia de esos juegos, la ilustración de la carta cambia conforme el campeón lucha y crece. Coleccionas un dex en expansión, crías un establo y (más adelante) intercambias.

Todo campeón es también una **carta**. La carta es la cara portátil y coleccionable de una mente, y su mejor truco ya está en el código: **la ilustración evoluciona**, porque la ilustración es el cuerpo del campeón. Cada clave de mente resuelve un **kit de especie** estable (`lib/render/species.ts`) en el rig compartido: silueta de raza + carga de partes, más el morph óseo de carrera (`lib/evolve/appearance.ts`). Mentes de la misma Fuerza se ven como animales distintos; los tornillos de tier añaden más armadura. Una carta que posees se vuelve visiblemente más fuerte a medida que la usas en combate.

## Anatomía de una carta

| Parte | Origen | Notas |
|-------|--------|-------|
| **Mente** (nombre, fuerza, linaje) | Primeras Mentes + dex horneado (`content/minds/reviewed/`) + generador de temporada | la identidad |
| **Arte** | genoma + arquetipo de Fuerza + kit de especie → render del cuerpo | cambia con la carrera y el tier, de forma determinista |
| **Estadísticas** | los cinco stats de combate + rating | los números |
| **Sigilos** | heráldica de fuerza obtenida (I/II/III). Insignias que se ganan, no se compran | los emblemas |
| **Atributos** | el moveset (4 movimientos) | la línea de “habilidades”: aquí está la profundidad TCG |
| **Saga** | generada a partir del historial de combates | el texto de ambientación. La propia historia de vida en evolución del campeón |
| **Rareza** | derivada de tier × escasez | ver abajo |
| **Procedencia** | temporada de acuñación, propietario, id de acuñación | inerte por ahora; el gancho de propiedad |

## Rareza

La rareza se **gana, luego escasea**. No es un gacha. Sube con el tier del campeón y con lo poco común que sea realmente esa configuración.

| Rareza | Se gana en | Sensación |
|--------|------------|-----------|
| **Común** | Novato | una mente que apenas ha cobrado forma |
| **Poco común** | Adepto | probada una o dos veces |
| **Rara** | Veterano | un historial real |
| **Épica** | Élite | un nombre temido |
| **Legendaria** | Leyenda | coronada; un fijo en la clasificación |
| **Mítica** | Leyenda + un título de temporada (p. ej. Romper un Guardián, ganar una temporada) | eventos únicos; el nivel trofeo |

## Cómo funciona la colección (la capa Pokémon / Magic)

- **Coleccionar**: las ocho Primeras Mentes, la oleada del dex horneado (mentes de lote Etapa 6), las mentes destacadas de temporada y las carreras que tú mismo has criado. El dex es el juego largo. Las nuevas mentes llegan mediante `npm run forge:dex` / revisión / `npm run bake:minds` (ver [03-champions.md](./03-champions.md)).
- **Conocer**: la rotación semanal de adopción muestra un inicial por Fuerza de ese pool, de modo que los Entrenadores que regresan conocen compañeros de equipo diferentes con el tiempo.
- **Construir**: un **establo** pequeño de campeones que despliegas por las regiones; sus Fuerzas interactúan en la Rueda, por lo que un establo es un *mazo* con cobertura de tipos.
- **Intercambiar / regalar**: movimiento de cartas entre jugadores (el bucle social). Diseñado aquí; bloqueado detrás de la capa de propiedad ([economy.md](./08-economy.md)). La acuñación on-chain es un relleno posterior de los campos de procedencia ya presentes en la carta, no la razón de ser del dex.

## Disciplina canónica

- La **rareza de una carta puede subir** (un Novato que llevas a Leyenda se vuelve a acuñar hacia arriba), pero la **identidad de la carta es permanente**: misma mente, mismo linaje, cuerpo en evolución.
- Las mentes horneadas y generadas reciben una etiqueta de **linaje** (qué Primera Mente reflejan) para que el dex siga siendo legible y cada carta tenga un lugar en la Rueda.
