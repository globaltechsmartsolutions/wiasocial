# Implementación IA — Fases P0, P1 y P2

**Fecha:** 5 de agosto de 2026
**Rama:** `codex/specialized-content-engine`
**Referencia:** `docs/ARQUITECTURA-IA-Y-ORQUESTACION-WIASOCIAL-2026.md`

Primera entrega de la arquitectura IA: integración tipada, medible y segura sin
cambiar la experiencia visible del producto ni migrar todas las rutas de golpe.

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
  texto fijo del repositorio, sin interpolación de datos de usuario.
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
  estimado, error normalizado y fechas.
- **Cuotas** (`src/lib/ai/quota.ts` + `release_ai_usage` en SQL): reserva
  atómica antes de ejecutar (RPC existente con `FOR UPDATE`), confirmación
  implícita al completar, y liberación si el proveedor falla, con eventos
  `reserve/settle/release/failure` en `usage_events`.
- **Content Studio migrado** (`src/lib/ai/content-studio.ts`): el run se crea
  en servidor antes de llamar al proveedor y el resultado se persiste en
  servidor antes de responder — cerrar el navegador no pierde una generación
  pagada. La ruta antigua sigue disponible tras feature flag. Las otras diez
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
| Flag `CONTENT_STUDIO_V2` activado por defecto | La respuesta v2 es compatible con el cliente actual (misma forma + `runId`). El rollback es una variable de entorno, no un despliegue. |
| Persistencia best-effort hasta ejecutar la migración | Si `generation_runs` no existe aún, la generación continúa y se registra una advertencia. Evita romper producción en el despliegue; la trazabilidad completa exige la migración. |
| Liberación de cuota como RPC `SECURITY DEFINER` separada | `ai_usage` sigue siendo de solo lectura para el titular; reservar y liberar pasan por funciones con verificación de identidad. Si la RPC aún no existe, el comportamiento degrada al actual (slot consumido) y queda registrado. |
| Rutas legacy endurecidas vía `runLegacyJsonTask`, no migradas | P0 exige límites/`store:false`/delimitación en todo; la restricción de P2 prohíbe migrar las otras diez funcionalidades al flujo persistido en este corte. |
| Contexto sobredimensionado se trunca (solo tareas legacy) | El historial de posts puede crecer sin límite; truncar el bloque de contexto (que es datos de apoyo) evita romper cuentas grandes. La entrada del usuario sí falla con error claro si excede el límite. |
| Gemini queda solo en la ruta legacy de `content` | El gateway v2 es OpenAI-first según P2. Si OpenAI no está configurada y Gemini sí, la acción `content` usa automáticamente la ruta legacy. |
| `qualityReview` sigue en la salida del producto pero fuera del bake-off | La UI actual lo muestra; retirarlo del producto es un cambio visible (P3). En evaluación no puntúa jamás. |

## 3. Migración De Base De Datos

Archivo: `supabase/ai-core-migration.sql` (añadido también a `migrate-all`).

```bash
npm run migrate:ai-core
```

- Crea `generation_runs`, `generation_steps`, `usage_events` (RLS: el titular
  lee y escribe solo sus filas; `usage_events` sin UPDATE/DELETE).
- Crea `release_ai_usage(uuid, text)` (`SECURITY DEFINER`, `search_path`
  fijado, floor en 0).
- **No se ha ejecutado contra ninguna base de datos.** Ejecutarla primero en
  staging, verificar, y después en producción.

### Rollback

1. **Código:** `CONTENT_STUDIO_V2=0` devuelve `content` a la ruta antigua al
   instante (sin despliegue). El resto de cambios P0 no tiene flag: revertir el
   commit si hiciera falta.
2. **Base de datos:** la migración es aditiva; el código funciona sin ella.
   Para revertirla por completo:
   ```sql
   DROP FUNCTION IF EXISTS public.release_ai_usage(UUID, TEXT);
   DROP TABLE IF EXISTS usage_events;
   DROP TABLE IF EXISTS generation_steps;
   DROP TABLE IF EXISTS generation_runs;
   ```

## 4. Variables De Entorno

| Variable | Efecto | Por defecto |
|---|---|---|
| `CONTENT_STUDIO_V2` | `0/false/off/legacy` desactiva el motor migrado | activado |
| `AI_MODEL_TEXT_PREMIUM` | Modelo del alias `TEXT_PREMIUM_PRIMARY` | `gpt-4o-mini` |
| `AI_MODEL_TEXT_STANDARD` | Modelo del alias `TEXT_STANDARD_PRIMARY` | `gpt-4o-mini` |
| `AI_MODEL_TEXT_ECONOMY` | Modelo del alias `TEXT_ECONOMY_PRIMARY` | `gpt-4o-mini` |
| `CONTENT_STUDIO_OPENAI_MODEL` / `CONTENT_STUDIO_PREMIUM_MODEL` | Compatibilidad: override antiguo del premium | — |

## 5. Riesgos Y Pendientes Antes De P3

- **Ejecutar la migración `ai-core` en staging y producción.** Hasta entonces,
  los runs no se persisten (hay warning en logs) y la liberación de cuota
  degrada al comportamiento actual. Tras aplicarla en staging, verificar el
  aislamiento con `npm run test:rls:ai-core` (requiere `SUPABASE_TEST_DB_URL`
  apuntando a staging; el test nunca usa `SUPABASE_DB_URL` y revierte todo).
- **Rellenar la baseline** de `docs/COMPARATIVA-MODELOS-CONTENT-STUDIO.md` con
  una ejecución real del bake-off (requiere claves propias, fuera de CI).
- **La liberación de cuota no es transaccional con el run**: si el proceso
  muere entre el fallo del proveedor y el `release`, el slot queda consumido.
  Es el mismo riesgo del sistema actual; la solución completa llega con la
  outbox de P4.
- **Prompt de v2 vs legacy**: la instrucción v2 se apoya en Structured Outputs
  en lugar del bloque "Return JSON exactly". Conviene comparar unas cuantas
  generaciones reales antes de retirar el flag legacy definitivamente.
- **Las tareas `legacy-full` siguen recibiendo el contexto completo** (ahora
  delimitado como no confiable y truncado por presupuesto). La reducción de
  contexto por tarea llega al migrarlas al núcleo.
- **Coste estimado ≠ factura**: la tabla de precios de `model-aliases.ts` es
  manual; revisar contra la factura del proveedor y actualizar al cambiar de
  modelo.
- El `runId` se devuelve en la respuesta de `content` pero la UI todavía no lo
  usa (recuperación de runs perdidos será parte de P3/P4).
