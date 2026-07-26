# Zingers. Plan de desarrollo Flight-First (bloqueo de sesión)

> **En pocas palabras:** Climb es la cara; las batallas son la profundidad; el escritorio es la ascensión completa.
> La billetera Solana opcional = identidad del Entrenador (no economía). La moneda/token es una **pista independiente futura**. Este documento es la hoja de ruta de implementación activa de la sesión de planificación de julio de 2026.

Compañeros: [`climb-feel.md`](./climb-feel.md), [`two-doors.md`](./two-doors.md),
[`launch-week.md`](./launch-week.md), [`flyover.md`](./flyover.md),
[`zing-model.md`](./zing-model.md) (aplazado).

---

## Estrella del norte

**Frase del jugador al minuto dos:** *Vuelo. Lucha. Ascendemos.*

| Puerta | Primeros ~2 min |
|---|---|
| **Móvil** | Póster → Vuelo → Climb → reclamar compañero alado → una más + tablas |
| **Escritorio** | Despertar → vuelo ≤15s → reclamar → Reach corto → duelo *motivado* por la ascensión |

**Invisible:** los agentes piensan (copia de fantasía); billetera opcional; Coronas solo dentro del juego.

---

## Alcance

### Dentro
Sensación de Climb · invitado→reclamar · medición del embudo · tablas ligeras · un puente de altitud/elevación · recorte de 90s en escritorio · identidad Phantom opcional · operaciones LLM ligeras

### Fuera
lanzamiento de $ZING · vesting · airdrops · Coronas↔token · partidas en cadena · protocolos personalizados · Fly con billetera · nuevos escenarios / profundidad de Keeper como trabajo de cara

### Congelado hasta aceptación de sensación de Climb
Sin nuevos modos, aluvión de arte Reach, comercio de colecciones, promoción de Casa, interfaz de token.

---

## Compuertas de lanzamiento (alineadas)

| Compuerta | Métrica |
|---|---|
| **1′** | Teléfono frío → volar &lt;10s después de Vuelo |
| **2′** | invitado→reclamar visible en `/stats` |
| **3′** | “una carrera más” de Climb en dispositivos reales |
| **4** | `LLM_DAILY_BUDGET_USD` configurado; Climb-heavy se mantiene barato |
| **5** | Empuje de crecimiento solo después de que la puerta se sienta bien |
| **6** | Secundario: evolución / colección |
| **. ** | Token aplazado; billetera ≠ moneda |

---

## Fases y estado

| Fase | Estado | Notas |
|---|---|---|
| **0 Alinear** | hecho (este doc) | Compuertas + no-objetivos bloqueados |
| **1.0 Ley del plano móvil** | enviado | `x=0`, sin facilidad lateral, `cpNextRef` verde, cámara Flappy |
| **1.1 Arquetipos de diseño** | enviado | plantillas de rol en `climb/sectors.ts` |
| **1.2 Avance automático en escritorio** | enviado | `CIRCUIT_CRUISE` en `world.tsx` |
| **1.3 Correa de compañero** | enviado | compañero alado en escritorio; Entrenador+seguidor en móvil |
| **1.4 Corredor Y de peligros** | enviado | espíritus/cenizas solo en Y; peligros ya en el plano de vuelo |
| **2.0–2.1 Eventos de puerta + reclamo** | enviado | `m_*` + gancho de reclamo de invitado |
| **2.0b Embudo de puerta de estadísticas** | enviado | panel PUERTA MÓVIL en `/stats` |
| **2.2 Profundidad de invitado → carrera** | enviado | `lib/guest-climb.ts` → XP de Entrenador al adoptar |
| **2.3 Barrido de copia de fantasía** | enviado | `/howitworks` + superficies de intro/compartir; `/agents` sigue técnico |
| **2.4–2.5 Identidad de billetera Solana** | enviado | Phantom SIWS → `/api/solana-link`; interfaz de código de Rango + Entrenador |
| **3 Cromo de tablas** | mayormente enviado | PB + tabla en tarjeta de caída de Climb |
| **4 Playtests** | operaciones en curso | barra de ingeniería cumplida; mantener 10–30 sesiones humanas como post-lanzamiento |
| **5 Una llave de altitud** | enviado (delgado) | Reach II necesita 1 victoria en duelo (Climb + Circuito de escritorio) |
| **6 Primeros 90s en escritorio** | enviado (corregido) | invocación → **elegir** (no CircuitLite); escenario Circuito nativo desbloqueado pre-duelo. `/m` móvil mantiene Climb-primero. |
| **7 Higiene** | enviado / ops | `LLM_DAILY_BUDGET_USD` configurado en prod; empuje de crecimiento + notas de envío después de la sensación |

---

## Reglas de billetera (innegociables)

- Nunca requerida para Vuelo / Climb / reclamar / Coronas.
- Solo prueba de propiedad estilo SIWS. Sin aprobaciones de gasto.
- El servidor vincula `pubkey` ↔ token del propietario; el estado del juego permanece fuera de cadena.
- Copia = sigilo de Entrenador / conectar. Nunca depositar ni abastecer.
- La moneda futura se adjunta al mismo socket; **cero lógica de token ahora**.

---

## Orden de ejecución

1. Verificación de sensación en dispositivo (1.x) → parche 1.4 si es necesario  
2. Embudo de puerta de estadísticas + identidad de billetera (2.x)  
3. Ritmo fly-first en escritorio (6.x) + llave de altitud delgada (5.x)  
4. Playtests (4) → iterar  
5. Higiene de crecimiento (7)

---

## Definición de hecho

1. Móvil: Vuelo → Climb divertido → reclamar en una sesión  
2. Escritorio: vuelo antes del volcado de sistemas  
3. `/stats`: puerta + reclamo (+ evolución secundaria)  
4. Competencia fantasma vía tablas  
5. Un puente de elevación o copia motivada  
6. Enlace Phantom opcional; bucle central sin billetera  
7. Sin interfaz de token · economía solo de Coronas · presupuesto LLM configurado  

**Lanzamiento v0.1 (julio 2026): cerrado de ingeniería.** Las compuertas anteriores están activas en `zingers.gg`.
Los playtests humanos y el empuje de crecimiento son operaciones post-lanzamiento, no bloqueadores de ingeniería abiertos.
