# WIASocial Masterplan

Fecha: 1 de julio de 2026

Este es el único documento principal de dirección para WIASocial. La idea es no perdernos entre mil archivos: aquí queda la visión, los módulos, la IA, los límites de Instagram, el roadmap y el criterio para decidir qué construir primero. No mantenemos un `ROADMAP.md` separado: el roadmap vive aquí.

## 1. Tesis

WIASocial no debe ser "otra app que genera captions con IA". Ese mercado es débil para nosotros porque compite contra ChatGPT, Predis, Metricool, Buffer, Later y muchas herramientas baratas.

La tesis buena es:

```text
WIASocial convierte Instagram en un sistema operativo de crecimiento y ventas.
```

La promesa real:

```text
Sabe qué publicar, a quién responder, qué lead priorizar, qué acción hacer hoy y qué está funcionando para convertir Instagram en negocio.
```

El bucle que debe gobernar todo:

```text
Señal -> interpretación -> recomendación -> acción -> resultado -> aprendizaje
```

Si no guardamos acciones y resultados, la IA solo parecerá inteligente. Si guardamos ese bucle, WIASocial puede aprender de cada workspace.

Métrica norte:

```text
acciones comerciales ejecutadas por cuenta y semana
```

Métricas secundarias:

- tiempo hasta primera acción útil
- porcentaje de cuentas con Instagram conectado
- leads capturados desde comentarios, DMs o señales manuales
- seguimientos completados a tiempo
- conversaciones que avanzan a llamada, cliente o venta
- retención semanal de usuarios activos

## 2. Posicionamiento

WIASocial debe vivir entre cuatro categorías:

- gestión social: Metricool, Later, Buffer, Sprout
- generación creativa: Predis y similares
- automatización de DMs: ManyChat
- CRM/revenue: HubSpot, HighLevel, Pipedrive

El hueco defendible:

```text
estrategia de crecimiento + contenido premium + CRM IG-native + siguiente mejor acción + reporting de ingresos
```

No vendemos "más posts". Vendemos menos oportunidades perdidas, mejor contenido, seguimiento claro y más señales convertidas en negocio.

## 3. Segmentos prioritarios

Priorizar:

1. Agencias boutique y social-first.
2. Negocios locales de ticket medio-alto: estética, dental, inmobiliaria, formación, fitness premium, restauración premium.
3. Infoproductores, coaches, formación y expertos que venden por DM o llamada.
4. Marcas personales de servicios.
5. Equipos que ya usan Instagram como fuente de leads y pierden trazabilidad.

Despriorizar al principio:

- creador generalista que solo quiere ideas
- usuario que busca captions baratos
- proyectos que solo miden likes

## 4. Lo que sí permite Instagram

La API oficial de Instagram nos deja construir la parte seria de WIASocial si usamos cuentas profesionales, permisos oficiales y datos propios.

Sí permite, con permisos y App Review cuando aplique:

- conectar cuentas profesionales
- leer y gestionar contenido propio
- publicar contenido con Content Publishing
- leer/responder/moderar comentarios propios
- trabajar con DMs permitidos
- usar webhooks
- consultar insights disponibles
- detectar menciones o señales permitidas

Esto nos permite construir:

- Content Studio
- CRM IG-native
- Lead IQ
- Next Best Action
- Daily Brief
- Growth Radar
- Analytics de ingresos
- Reporting para agencias

## 5. Lo que no debemos prometer

No debemos basar WIASocial en:

- scraping agresivo
- sacar followers de competidores
- cold DMs masivos
- automatizar likes/follows/comentarios
- leer conversaciones ajenas
- mapear audiencias privadas
- bots de engagement

Audience Finder debe ser compliant:

```text
engagers propios + leads propios + comentarios propios + DMs permitidos + imports consentidos + segmentos definidos por el usuario
```

No:

```text
scraping de followers ajenos
```

## 6. Arquitectura de IA

La IA de WIASocial no debe ser un único prompt enorme. Debe ser un sistema con capas:

```text
datos operativos
  -> memoria/RAG
  -> clasificación
  -> scoring
  -> recomendaciones
  -> feedback
  -> aprendizaje
```

### Memorias necesarias

Memoria operacional:

- usuarios
- workspaces
- cuentas conectadas
- posts, Reels, stories, insights
- comentarios y DMs permitidos
- leads
- acciones
- resultados

Memoria semántica:

- perfil de marca
- oferta
- tono
- buyer persona
- objeciones
- posts ganadores
- hooks ganadores
- playbooks
- resúmenes de conversaciones

Memoria episódica:

- acción recomendada
- acción vista
- acción aceptada
- acción descartada
- acción ejecutada
- resultado obtenido

Memoria de aprendizaje:

- exposiciones
- feedback
- outcomes
- predicciones
- coste y latencia de IA
- casos de evaluación

## 7. RAG

Sí, RAG tiene sentido, pero no es toda la inteligencia.

RAG sirve para:

- recordar contexto de marca
- traer posts ganadores
- recuperar objeciones frecuentes
- usar ejemplos anteriores
- personalizar contenido
- explicar recomendaciones

RAG no sustituye:

- CRM
- estados de lead
- métricas
- analytics
- scoring
- eventos de resultado

Implementación recomendada:

- Supabase Postgres
- `pgvector`
- filtros por `workspace_id`
- búsqueda híbrida cuando haya volumen
- resúmenes en vez de meter conversaciones enteras
- trazabilidad de qué memoria se usó

## 8. Content Studio premium

Este es el primer módulo que debemos atacar.

Objetivo:

```text
Que el usuario diga: "esto sí lo publicaría".
```

No basta con generar JSON o captions. Una publicación real tiene:

- estrategia
- hook
- caption
- carrusel
- stories
- guion de Reel
- CTA
- DM de seguimiento
- dirección visual
- plantilla
- export

Principio clave:

```text
cualquier topic
  -> comprensión del sector y la intención
  -> ángulo de contenido
  -> narrativa slide por slide
  -> plantilla visual adecuada
  -> PNG descargable/publicable
```

El Content Studio no debe ser un generador de carruseles para un nicho concreto. Debe ser un motor universal: el usuario puede escribir un tema de clínica dental, fitness, restaurante, IA, marca personal o cualquier otro sector, y WIASocial debe convertirlo en una pieza nativa de Instagram.

La IA no debe copiar el topic entero en la portada. Debe extraer el concepto corto, detectar la tensión principal, elegir una estructura narrativa y adaptar la dirección visual.

Router inteligente de plantillas:

WIASocial debe decidir qué tipo de carrusel conviene antes de escribir los slides. Primeras plantillas:

- mito vs realidad
- error común
- checklist accionable
- objeción
- caso o prueba
- venta directa
- educativo
- comparación
- antes/después

La primera versión del router combina señales del brief con decisión del modelo:

```text
topic + nicho + oferta + funnel + objeción + prueba + acción deseada
  -> plantilla recomendada o plantilla forzada por el usuario
  -> concepto corto
  -> intención
  -> patrón de slides
  -> estilo visual
  -> layout PNG
```

Más adelante deberá aprender con datos reales: guardados, descargas, publicaciones, feedback del usuario, leads generados y resultados por plantilla.

Primer render implementado: cada plantilla ya puede tener una composición visual distinta, no solo un color diferente. Es una base inicial: mito/comparación/antes-después usan composición partida, checklist usa rail de progreso, venta directa usa banda comercial, caso usa tarjetas de evidencia, objeción usa marco de duda y educativo usa layout editorial.

Estado probado el 1 de julio de 2026:

- La preview local `/carrusel-preview.html` puede generar carruseles con Gemini desde cualquier topic.
- La pantalla muestra si la pieza viene de IA, qué modelo se usó, el router elegido, caption y CTA.
- La preview funciona como mesa de revisión: slide seleccionada en grande, miniaturas ordenadas, caption, CTA y router visibles.
- El estado generado persiste en el navegador para poder recargar sin perder la prueba.
- El PNG ya no pinta notas internas como `visualCue` o "dirección visual"; esas notas quedan como metadatos de diseño.
- El render público incluye una barra final de "idea clave" o "siguiente paso", que sí forma parte del contenido publicable.
- La API de preview controla mejor respuestas JSON incompletas de Gemini y devuelve error visible en vez de romper la pantalla.

La interfaz debe permitir dos modos: `Auto`, donde decide WIASocial, y selección manual, donde el usuario fuerza el tipo de carrusel.

Arquitectura creativa:

```text
Brief
  -> contexto de marca
  -> director estratégico
  -> copywriter
  -> diseñador de carrusel
  -> editor crítico
  -> render
  -> export
```

Para carruseles y stories no conviene pedir a una IA de imagen que haga todo con texto dentro. Mejor:

```text
LLM escribe y estructura
WIASocial renderiza texto y diseño con plantillas
modelo de imagen genera fondos o recursos si hace falta
```

MVP:

- formulario mejorado
- selector de objetivo
- selector de formato
- 3 variantes
- crítica de calidad
- botón guardar
- botón copiar
- conversión a carrusel
- primer carrusel PNG con plantilla propia
- motor universal por topic
- router inteligente de plantillas
- preview local con generación Gemini
- render PNG sin metadatos internos visibles
- manejo robusto de JSON imperfecto en la prueba con Gemini

## 9. Modelos de IA

No debemos casarnos con un modelo por marca. Hay que hacer bake-off por casos reales de WIASocial.

Candidatos:

- GPT premium: razonamiento, estructura, tool use, JSON fiable.
- Claude premium: copy, naturalidad, criterio editorial.
- Gemini: velocidad, coste, multimodalidad y buen rendimiento inicial.
- Modelos rápidos: variantes, clasificación, resúmenes y tareas baratas.

Prueba ya hecha:

- Gemini generó resultados decentes en casos de clínica estética, agencia, coach, negocio local y marca personal.
- Pasa primera criba, pero no debe ser declarado ganador premium hasta compararlo con GPT y Claude.

Runner:

- `scripts/model-bakeoff.mjs`
- `scripts/model-bakeoff/cases.json`

Comandos:

```bash
npm run model:bakeoff:dry-run
npm run model:bakeoff -- --providers=gemini
npm run model:bakeoff -- --providers=gemini --cases=clinica-estetica-premium
```

## 10. Módulos

### 1. Content Studio premium

Genera contenido que el usuario quiera publicar: hooks, captions, carruseles, stories, guiones, CTA, DMs y variantes. Debe funcionar desde cualquier topic, no desde plantillas rígidas por sector. Primer módulo a construir.

### 2. Perfil de marca y memoria base

Recoge nicho, oferta, público, tono, promesa, diferenciador, objeciones, pruebas, límites, estilo visual y ejemplos. Evita contenido genérico.

Estado inicial implementado el 1 de julio de 2026:

- `/settings` funciona como ficha de marca ampliada.
- `user_settings.brand_memory` guarda la memoria base como JSONB.
- `buildUserAIContext` expone esa memoria a las rutas IA.
- Content Studio debe tratar `settings.brandMemory` como fuente de verdad cuando exista.

### 3. Biblioteca de formatos ganadores

Catálogo de estructuras: error común, mito vs realidad, caso real, objeción, checklist, antes/después, opinión contraria, problema-coste-solución.

### 4. Next Best Action

Muestra 3-5 acciones claras cada día. Debe guardar exposición, aceptación, descarte, ejecución y resultado.

### 5. CRM IG-native

Convierte comentarios, DMs y entradas manuales en leads con estado, prioridad, próxima acción y seguimiento.

### 6. Lead IQ

Puntúa leads por intención, urgencia, encaje, objeción, valor potencial y siguiente paso. Debe explicar el motivo y sugerir DM.

### 7. RAG y memoria por workspace

Recupera contexto útil para cada workspace y lo usa en Content Studio, Lead IQ, Daily Brief y Growth Radar.

### 8. Growth Radar

Detecta oportunidades, caídas, riesgos y experimentos. Debe crear acciones, no solo informes.

### 9. Daily Brief

Resumen operativo diario: acción comercial, contenido, lead prioritario, métrica a vigilar y seguimiento.

### 10. Analytics de ingresos

Conecta contenido -> conversación -> lead -> llamada -> oportunidad -> venta.

### 11. Audience Finder compliant

Segmentos accionables desde datos propios y permitidos. Nada de scraping de terceros.

### 12. Reporting para agencias

Reporte mensual compartible: contenidos, leads, acciones ejecutadas, resultados y próximos pasos.

### 13. Observabilidad IA y costes

Guarda modelo, feature, prompt version, latencia, tokens, coste, errores, output schema y feedback.

### 14. Compliance y seguridad

APIs oficiales, RLS, minimización, revisión humana, transparencia IA, límites de Meta, RGPD y AI Act.

## 11. Orden de construcción

Bloque A: experiencia "guau"

1. Content Studio premium.
2. Perfil de marca.
3. Formatos ganadores.
4. Guardado de piezas.
5. Primer carrusel PNG.

Bloque B: sistema operativo diario

1. Next Best Action.
2. `action_events`.
3. Daily Brief.
4. Growth Radar accionable.

Bloque C: revenue

1. CRM IG-native.
2. Lead IQ.
3. Analytics de ingresos.
4. Reporting para agencias.

Bloque D: inteligencia avanzada

1. RAG completo.
2. Memoria de resultados.
3. Scoring aprendido.
4. Forecasting.
5. Bandits contextuales cuando haya datos.

## 12. Datos mínimos

Tablas o entidades necesarias:

- `workspaces`
- `workspace_members`
- `instagram_connections`
- `instagram_media_items`
- `instagram_comments`
- `instagram_dm_threads`
- `instagram_dm_messages`
- `generated_content`
- `leads`
- `lead_events`
- `next_best_actions`
- `action_events`
- `outcome_events`
- `ai_runs`
- `knowledge_items`
- `knowledge_chunks`
- `retrieval_events`
- `growth_radar_reports`
- `daily_briefs`
- `agency_reports`

Prioridad v1:

```text
generated_content
ai_runs
next_best_actions
action_events
leads mejorado
user_settings.brand_memory
knowledge_items
```

## 13. Scoring inicial

Primero reglas explicables. Después modelos.

Fórmula base:

```text
score =
  impacto * 0.35 +
  urgencia * 0.25 +
  probabilidad de conversión * 0.20 +
  confianza * 0.10 -
  esfuerzo * 0.10
```

No usar bandits, RL o modelos complejos hasta tener eventos reales.

## 14. Métricas

Activación:

- perfil completado
- primera pieza generada
- primera pieza guardada
- Instagram conectado
- primer lead creado
- tiempo hasta primer valor

Uso:

- WAU/MAU
- piezas guardadas
- acciones vistas
- acciones ejecutadas
- briefs abiertos
- leads actualizados

Negocio:

- leads capturados
- velocidad de respuesta
- llamadas agendadas
- oportunidades creadas
- clientes ganados
- ingresos atribuidos o asistidos

IA:

- coste por workspace
- latencia p95
- tasa de error
- outputs guardados
- regeneraciones
- cumplimiento de schema
- aceptación de recomendaciones

## 15. Compliance

Reglas no negociables:

- datos propios primero
- APIs oficiales
- RLS por workspace
- minimización de datos
- no scraping agresivo
- no bots de engagement
- revisión humana en acciones externas sensibles
- scoring explicable
- transparencia cuando se use IA
- data deletion preparado para Meta si aplica

Antes de pedir permisos avanzados de Meta:

- definir permisos mínimos
- preparar screencast de App Review
- política de privacidad
- explicación de uso de datos
- fallback manual si falta permiso

## 16. Roadmap de seis meses

Mes 1:

- mejorar Content Studio
- completar perfil de marca
- biblioteca inicial de formatos
- bake-off GPT/Claude/Gemini
- primer carrusel PNG

Mes 2:

- guardar piezas generadas
- `ai_runs`
- `next_best_actions`
- `action_events`
- dashboard accionable v1

Mes 3:

- CRM IG-native básico
- Lead IQ v1
- Daily Brief conectado
- feedback de acciones

Mes 4:

- Growth Radar accionable
- analytics contenido -> lead
- reporting básico para agencias
- primeros playbooks verticales

Mes 5:

- RAG por workspace
- retrieval híbrido
- memoria de resultados
- panel de costes IA

Mes 6:

- scoring más robusto
- forecasting básico
- Audience Finder compliant
- reporting de agencia mejorado

## 17. Qué no hacer ahora

No meter en la primera ola:

- RL profundo
- GNNs
- fine-tuning amplio
- automatización de DMs sin revisión
- scraping de audiencias
- vídeo generativo masivo
- mil módulos a medias
- mil documentos

## 18. Regla de trabajo

Para cualquier cambio importante:

1. Leer este documento.
2. Elegir el módulo afectado.
3. Revisar código actual.
4. Definir MVP pequeño.
5. Implementar.
6. Guardar eventos si aplica.
7. Verificar lint/build.
8. Actualizar este documento solo si cambia la dirección.

La brújula es simple:

```text
menos documentos, más producto real
```

## 19. Estructura de documentación

La documentación debe mantenerse simple:

```text
docs/WIASOCIAL-MASTERPLAN.md     -> documento maestro vivo
docs/modulos/<modulo>/           -> investigación y decisiones del módulo cuando lo trabajemos
```

Reglas:

1. El master manda sobre todo.
2. El master se actualiza cuando cambia visión, arquitectura, roadmap, riesgos, módulos o prioridades.
3. Cada módulo tiene su carpeta para no mezclar decisiones.
4. No se crean documentos profundos de un módulo hasta que vayamos a trabajarlo.
5. Cuando un módulo empiece, su carpeta puede tener un `README.md` con investigación, MVP, decisiones técnicas, pendientes y criterios de terminado.
6. Si un detalle deja de ser importante, no se crea otro documento: se resume en el master o se elimina.
7. No mantener roadmaps paralelos. Si cambia el roadmap, se actualiza este documento.

Carpetas de módulos:

- `docs/modulos/01-content-studio-premium`
- `docs/modulos/02-perfil-marca-memoria-base`
- `docs/modulos/03-biblioteca-formatos-ganadores`
- `docs/modulos/04-next-best-action`
- `docs/modulos/05-crm-ig-native`
- `docs/modulos/06-lead-iq`
- `docs/modulos/07-rag-memoria-workspace`
- `docs/modulos/08-growth-radar`
- `docs/modulos/09-daily-brief`
- `docs/modulos/10-analytics-ingresos`
- `docs/modulos/11-audience-finder-compliant`
- `docs/modulos/12-reporting-agencias`
- `docs/modulos/13-observabilidad-ia-costes`
- `docs/modulos/14-compliance-seguridad`

## 20. Fuentes base

Fuentes externas usadas como contexto:

- `C:/Users/aleja/Downloads/Dónde WIASocial puede hacerse fuerte como Growth OS para Instagram.pdf`
- `C:/Users/aleja/Downloads/deep-research-report (1).md`

Fuentes oficiales relevantes:

- Instagram API with Instagram Login: https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login
- Instagram Platform overview: https://developers.facebook.com/documentation/instagram-platform/overview
- Instagram Messaging: https://developers.facebook.com/documentation/business-messaging/instagram-messaging
- Instagram Platform Webhooks: https://developers.facebook.com/documentation/instagram-platform/webhooks
- Instagram App Review: https://developers.facebook.com/docs/instagram-platform/app-review/
- OpenAI models: https://developers.openai.com/api/docs/models
- OpenAI Structured Outputs: https://developers.openai.com/api/docs/guides/structured-outputs
- Google Gemini API: https://ai.google.dev/gemini-api/docs
- Canva Connect API: https://www.canva.dev/docs/connect/
