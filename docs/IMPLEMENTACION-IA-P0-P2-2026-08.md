# Implementación IA — Fases P0, P1 y P2

**Fecha:** 5 de agosto de 2026 (revisión 2, tras auditoría independiente)
**Rama:** `codex/specialized-content-engine`
**Referencia:** `docs/ARQUITECTURA-IA-Y-ORQUESTACION-WIASOCIAL-2026.md`

Primera entrega de la arquitectura IA: integración tipada, medible y segura sin
cambiar la experiencia visible del producto ni migrar todas las rutas de golpe.

**Revisión 2** corrige los cuatro hallazgos de la auditoría: cuota con reservas
identificadas de un solo uso, persistencia estricta en el flujo v2, historial
del AI Coach delimitado como no confiable, y ledger de ejecuciones escrito solo
por el servidor.

## 1. Qué Se Ha Implementado

### P0 — Correcciones inmediatas

- **Límites explícitos por tarea** (`src/lib/ai/task-registry.ts`): las 23
  tareas IA declaran tamaño máximo de entrada, tokens de salida, timeout,
  reintentos y temperatura. Ninguna ruta define estos valores por su cuenta.
- **`store: false` en todas las llamadas a OpenAI** (`src/lib/ai/gateway.ts`):
  no se almacenan prompts ni respuestas en el proveedor. No existe hoy ninguna
  razón documentada para almacenarlas.
- **Datos no confiables delimitados** (`src/lib/ai/untrusted.ts`): todo
  contenido de usuario, Supabase, Instagram o importaciones viaja dentro de
  bloques `<<<UNTRUSTED_DATA:...>>>`, con neutralización de delimitadores
  incrustados y una política en el system prompt que prohíbe seguir
  instrucciones encontradas en los datos. Las instrucciones de cada tarea son
  texto fijo del repositorio, sin interpolación de datos de usuario. Esto
  incluye el historial del AI Coach: los mensajes guardados van dentro del
  bloque no confiable (`user_input.conversationHistory`), nunca como turnos
  `user`/`assistant` crudos.
- **Honestidad de datos**: el Trend Detector ya no afirma conocer tendencias
  actuales (prompt y textos de UI reescritos como "oportunidades estimadas sin
  datos en tiempo real"); los volúmenes de hashtags se marcan como estimaciones
  en prompt y UI; best-times y competitor-analyze refuerzan que sus cifras son
  heurísticas.

### P1 — Contratos y evaluación

- **`AITaskRegistry`**: identificador, alias lógico de modelo, versión de
  prompt, esquemas, temperatura, límites, timeout, reintentos, política de
  contexto y coste en cuota por tarea.
- **Esquemas Zod** (`src/lib/ai/schemas/content-studio.ts`): entrada y salida
  de Content Studio con dos capas deliberadas — esquema estricto de forma para
  Structured Outputs del proveedor y validación de rangos/negocio en servidor.
  Un test garantiza que ambas capas cubren las mismas claves.
- **Rúbrica** `docs/COMPARATIVA-MODELOS-CONTENT-STUDIO.md`: protocolo de
  revisión humana ciega, pesos, fallos invalidantes y baseline por rellenar.
- **Bake-off mejorado** (`scripts/model-bakeoff.mjs` + `cases.json`): 20 briefs
  en español de sectores distintos (incluye 2 adversariales), 2 ejecuciones por
  combinación, sin autoevaluación del candidato, latencias p50/p95, y
  `meta.json` con hashes de prompt/esquema para reproducibilidad. El dry-run no
  hace llamadas; los tests normales tampoco.

### P2 — Núcleo de IA

- **`ModelGateway`** (`src/lib/ai/gateway.ts`): OpenAI como primer adaptador,
  alias lógicos (`TEXT_PREMIUM_PRIMARY`, `TEXT_STANDARD_PRIMARY`,
  `TEXT_ECONOMY_PRIMARY` en `model-aliases.ts`), errores normalizados con
  código estable (`auth`, `rate_limit`, `timeout`, `invalid_output`,
  `provider_error`, `not_configured`), reintentos controlados con backoff, y
  registro por llamada de tokens, latencia, modelo, proveedor y coste estimado.
  Añadir otro proveedor = añadir un adaptador, sin tocar rutas.
- **`ContextAssembler`** (`src/lib/ai/context-assembler.ts`): cada tarea recibe
  solo las secciones de contexto que su política declara, separando datos
  internos (agregados) de contenido no confiable. Content Studio ya no recibe
  todo el perfil; las tareas no migradas quedan marcadas `legacy-full`.
- **Persistencia de ejecuciones** (`src/lib/ai/persistence.ts` + migración):
  `generation_runs`, `generation_steps` y `usage_events` con ID, usuario,
  tarea, estado, modelo/proveedor, versión de prompt, tokens, latencia, coste
  estimado, error normalizado y fechas. El ledger se escribe SOLO con
  `service_role`: el titular puede leer sus filas pero no crearlas ni
  modificarlas, así que estado, resultado, tokens y coste no son falsificables
  desde el navegador. Una FK compuesta (steps) y un trigger (events) impiden
  filas colgadas de un run de otro usuario.
- **Cuotas** (`src/lib/ai/quota.ts` + `ai_usage_reservations` en SQL): la
  reserva es una fila identificada creada junto al incremento del contador en
  la misma transacción (`reserve_ai_usage`, serializada con `FOR UPDATE`), con
  máquina de estados `reserved -> settled | released`. Confirmar o liberar
  exige la transición atómica de ESA fila: una reserva confirmada o liberada
  no puede volver a liberarse, y llamar al RPC en bucle no puede vaciar el
  contador (cada liberación exige una reserva previa que lo incrementó).
- **Content Studio migrado** (`src/lib/ai/content-studio.ts`), flujo CERRADO:
  si el run no puede crearse en servidor, no se llama al proveedor (se libera
  la reserva y la petición falla con 503); si el resultado no puede
  persistirse, no se responde con éxito. Cuando la respuesta llega al
  navegador, el resultado ya está en `generation_runs.result` — cerrar el
  navegador no pierde una generación pagada. La ruta antigua sigue disponible
  (y es la activa por defecto) tras el feature flag. Las otras diez
  funcionalidades NO se han migrado al flujo persistido; solo comparten el
  endurecimiento P0 a través de `runLegacyJsonTask`.
- **Pruebas** (47 nuevas en `tests/ai-*.test.ts`): contratos, salidas
  incorrectas del proveedor, timeouts y reintentos, errores de autenticación,
  flujo de reserva/liberación de cuota, persistencia previa a la respuesta y
  protección frente a prompt injection en el contexto. Sin llamadas de red ni
  credenciales reales.

## 2. Decisiones Y Motivos

| Decisión | Motivo |
|---|---|
| Zod v3 (`^3.25`) en lugar de v4 | `openai@4` declara peer `zod@^3`; v4 provoca conflicto de resolución. La API usada es idéntica. |
| Dos esquemas para la salida de Content Studio (proveedor + Zod) | §8.2: el esquema estricto del proveedor solo garantiza forma; los rangos y reglas de negocio se validan en servidor. Un test impide que diverjan. |
| Flag `CONTENT_STUDIO_V2` APAGADO por defecto | El flujo v2 es estricto y exige la migración `ai-core` y `SUPABASE_SERVICE_ROLE_KEY`. Activarlo es una decisión de despliegue por entorno (`CONTENT_STUDIO_V2=1`); el rollback es quitar la variable, no desplegar. |
| Persistencia estricta en v2 (`createRun`/`completeRun`) | Sin run registrado no se llama al proveedor; sin resultado persistido no se responde con éxito. Steps y eventos de uso siguen siendo observabilidad best-effort porque no invalidan una generación ya persistida. |
| Cuota con reservas identificadas (`ai_usage_reservations`) | Un RPC de liberación sin identificador permitiría vaciar el contador llamándolo en bucle (hallazgo de auditoría). La máquina de estados `reserved -> settled/released` con transición atómica garantiza una sola liberación por reserva. |
| Las RPC de cuota son exclusivas de `service_role` | Con `EXECUTE` concedido a `authenticated`, el titular podía leer el id de su reserva en vuelo y liberarla desde el navegador, quedándose con la generación sin consumir cuota (segunda auditoría). La tabla de reservas tampoco es legible por el cliente: el identificador es una credencial de operación contable. |
| Ledger escrito solo por `service_role` | Si el titular pudiera insertar o modificar runs/steps/eventos, las métricas y el coste serían falsificables. El cliente solo tiene `SELECT` de sus filas. |
| Tamaño de entrada validado antes de reservar cuota | Validar después hacía que una entrada fuera de límite gastara una generación del contador mensual sin llegar al proveedor, y devolvía 500 en vez de 400. |
| Historial del AI Coach recortado por presupuesto | Al delimitarlo como dato no confiable pasó a contar contra `maxInputChars`; rechazar la petición dejaba sin servicio a quien acumulaba conversación. Se conservan los mensajes más recientes que quepan. |
| Parámetros del proveedor según la familia del modelo | El gateway emitía siempre `max_tokens` y `temperature`, que las familias `o*` y `gpt-5*` rechazan con HTTP 400. Sin esto, cambiar un alias —el propósito del registro— rompía las 23 tareas. |
| Rutas legacy endurecidas vía `runLegacyJsonTask`, no migradas | P0 exige límites/`store:false`/delimitación en todo; la restricción de P2 prohíbe migrar las otras diez funcionalidades al flujo persistido en este corte. |
| Contexto sobredimensionado se trunca (solo tareas legacy) | El historial de posts puede crecer sin límite; truncar el bloque de contexto (que es datos de apoyo) evita romper cuentas grandes. La entrada del usuario sí falla con error claro si excede el límite. |
| Gemini queda solo en la ruta legacy de `content` | El gateway v2 es OpenAI-first según P2. Si OpenAI no está configurada y Gemini sí, la acción `content` usa automáticamente la ruta legacy. |
| `qualityReview` sigue en la salida del producto pero fuera del bake-off | La UI actual lo muestra; retirarlo del producto es un cambio visible (P3). En evaluación no puntúa jamás. |

## 3. Migración De Base De Datos

Archivo: `supabase/ai-core-migration.sql` (añadido también a `migrate-all`).

```bash
npm run migrate:ai-core
```

- Crea `generation_runs`, `generation_steps`, `usage_events` y
  `ai_usage_reservations` (RLS: el titular solo puede LEER sus filas; todas las
  escrituras son de servidor). FK compuesta en steps y trigger en events
  garantizan que `user_id` coincide con el dueño del run.
- Crea `reserve_ai_usage`, `settle_ai_usage_reservation` y
  `release_ai_usage_reservation` (`SECURITY DEFINER`, `search_path` fijado,
  transición de estado atómica, contador con suelo en 0). Elimina la función
  `release_ai_usage` de la revisión 1, que permitía liberaciones repetidas.
- **No se ha ejecutado contra ninguna base de datos remota.** Está verificada
  contra un Supabase local (ver sección 3.1); aplicarla después en producción.

### 3.1. Verificación local (sin tocar producción)

El proyecto no tiene entorno de staging, así que la verificación se hace contra
un Supabase local levantado con Docker. Puertos propios (54421-54429) para
convivir con otros Supabase locales que puedan estar corriendo.

```bash
npx supabase start -x studio,edge-runtime,logflare,vector,imgproxy,storage-api,realtime,mailpit,supavisor
```

Aplicar el esquema **completo** (la migración `ai-core` depende de `ai_usage`,
que crea `phase-zero-stabilization-migration.sql`). Se invoca el script de Node
directamente, sin `npm run migrate:*`, porque esos comandos leen `.env.local` y
ahí `SUPABASE_DB_URL` apunta a la base real:

```bash
SUPABASE_DB_URL="postgresql://postgres:postgres@127.0.0.1:54422/postgres" node scripts/migrate-all.mjs
```

Verificar aislamiento, ledger y reservas de cuota:

```bash
SUPABASE_TEST_DB_URL="postgresql://postgres:postgres@127.0.0.1:54422/postgres" npx vitest run
```

Para apagarlo: `npx supabase stop`. Los datos locales son desechables.

**Resultado de la última ejecución (5 de agosto de 2026):** 33/33 tablas
verificadas, 138 pruebas en verde incluidas las 16 de aislamiento del núcleo
IA. Comprobado además de forma manual que, como usuario autenticado, están
bloqueados con `42501`: leer identificadores de reserva, liberar o confirmar la
propia reserva en vuelo, reservar con un límite inventado, poner el contador a
cero y falsificar un `generation_run`.

### Rollback

1. **Código:** el flujo v2 solo se activa con `CONTENT_STUDIO_V2=1`; quitar la
   variable devuelve `content` a la ruta antigua al instante (sin despliegue).
   El resto de cambios P0 no tiene flag: revertir el commit si hiciera falta.
2. **Base de datos:** la migración es aditiva; el código funciona sin ella
   mientras el flag esté apagado. Para revertirla por completo:
   ```sql
   DROP FUNCTION IF EXISTS public.reserve_ai_usage(UUID, TEXT, INTEGER);
   DROP FUNCTION IF EXISTS public.settle_ai_usage_reservation(UUID, UUID);
   DROP FUNCTION IF EXISTS public.release_ai_usage_reservation(UUID, UUID);
   DROP TABLE IF EXISTS ai_usage_reservations;
   DROP TABLE IF EXISTS usage_events;
   DROP TABLE IF EXISTS generation_steps;
   DROP TABLE IF EXISTS generation_runs;
   ```

## 4. Variables De Entorno

| Variable | Efecto | Por defecto |
|---|---|---|
| `CONTENT_STUDIO_V2` | `1/true/on` activa el motor migrado (exige migración `ai-core` + `SUPABASE_SERVICE_ROLE_KEY`) | apagado |
| `AI_MODEL_TEXT_PREMIUM` | Modelo del alias `TEXT_PREMIUM_PRIMARY` | `gpt-4o-mini` |
| `AI_MODEL_TEXT_STANDARD` | Modelo del alias `TEXT_STANDARD_PRIMARY` | `gpt-4o-mini` |
| `AI_MODEL_TEXT_ECONOMY` | Modelo del alias `TEXT_ECONOMY_PRIMARY` | `gpt-4o-mini` |
| `CONTENT_STUDIO_OPENAI_MODEL` / `CONTENT_STUDIO_PREMIUM_MODEL` | Compatibilidad: override antiguo del premium | — |

## 5. Riesgos Y Pendientes Antes De P3

- **Ejecutar la migración `ai-core` en staging** y verificar el aislamiento y
  las reservas con `npm run test:rls:ai-core` (requiere `SUPABASE_TEST_DB_URL`
  apuntando a staging; el test nunca usa `SUPABASE_DB_URL` y revierte todo).
  Solo después activar `CONTENT_STUDIO_V2=1` en ese entorno; con el flag
  apagado, nada del flujo v2 se ejecuta.
- **Rellenar la baseline** de `docs/COMPARATIVA-MODELOS-CONTENT-STUDIO.md` con
  una ejecución real del bake-off (requiere claves propias, fuera de CI).
- **Si el proceso muere entre el fallo del proveedor y el `release`**, la
  reserva queda en estado `reserved` y el slot consumido (nunca más permisivo
  que el sistema actual). Las reservas huérfanas quedan identificadas en
  `ai_usage_reservations` y podrán reconciliarse con un job; la solución
  completa llega con la outbox de P4.
- **Prompt de v2 vs legacy**: la instrucción v2 se apoya en Structured Outputs
  en lugar del bloque "Return JSON exactly". Conviene comparar unas cuantas
  generaciones reales antes de retirar el flag legacy definitivamente.
- **Las tareas `legacy-full` siguen recibiendo el contexto completo** (ahora
  delimitado como no confiable y truncado por presupuesto). La reducción de
  contexto por tarea llega al migrarlas al núcleo.
- **Coste estimado ≠ factura**: la tabla de precios de `model-aliases.ts` es
  manual; revisar contra la factura del proveedor y actualizar al cambiar de
  modelo.
- **Las violaciones de contrato no se reintentan (decisión consciente, revisar
  en P3).** `maxAttempts` solo cubre errores del proveedor dentro del gateway;
  la validación Zod ocurre después, así que una salida bien formada que
  incumple un rango —por ejemplo menos de tres slides de carrusel, mínimo que
  el esquema estricto del proveedor no puede expresar— falla sin reintento,
  mientras que un JSON corrupto sí se reintenta. Es coherente con dejar la
  reparación localizada para P3, pero conviene medir su frecuencia con
  `generation_runs.error_code = 'invalid_output'` antes de decidir si merece un
  reintento propio.
- El `runId` se devuelve en la respuesta de `content` pero la UI todavía no lo
  usa (recuperación de runs perdidos será parte de P3/P4).
