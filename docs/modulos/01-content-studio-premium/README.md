# Módulo 1: Content Studio premium

Fecha de inicio: 30 de junio de 2026

## Objetivo

Que el usuario genere una pieza de Instagram que sienta publicable, no solo un texto correcto.

La experiencia debe funcionar como un pequeño equipo creativo:

```text
brief -> estrategia -> copy -> carrusel/stories -> dirección visual -> crítica -> guardado
```

## Principio del módulo: cualquier topic

El Content Studio no debe estar pensado para un único nicho. La idea correcta es:

```text
cualquier topic
  -> ángulo
  -> narrativa
  -> carrusel
  -> estilo visual
  -> PNG descargable/publicable
```

Ejemplos válidos de entrada:

- captar pacientes para una clínica dental premium
- vender un programa de fitness para mujeres ocupadas
- explicar inteligencia artificial a pequeños negocios
- conseguir reservas para un restaurante japonés
- lanzar una marca personal de arquitectura sostenible

La IA no debe limitarse a pegar el topic entero en la portada. Tiene que:

- detectar el sector
- entender la intención comercial o educativa
- extraer un concepto corto para la portada
- encontrar la tensión principal
- decidir si conviene estructura de mito, error, checklist, caso, comparación, objeción o venta directa
- repartir la idea en slides con una progresión clara
- proponer una dirección visual coherente con el sector

## Router inteligente de plantillas

Primera versión implementada:

```text
brief
  -> señales del topic
  -> selector manual opcional
  -> plantilla recomendada
  -> contrato IA con slidePattern
  -> contentRoute en la salida
  -> render PNG con layout y acento visual por plantilla
```

Modo de decisión:

- `Auto`: WIASocial decide la plantilla según señales del brief.
- Plantilla manual: el usuario fuerza una estructura concreta y la IA debe respetarla.

Plantillas iniciales:

- `myth_busting`: mito vs realidad.
- `mistake_fix`: error común y corrección.
- `checklist`: pasos prácticos.
- `objection_handler`: objeción o duda principal.
- `case_study`: caso, prueba o resultado.
- `direct_offer`: venta directa o captación de leads.
- `educational`: explicación clara para ganar autoridad.
- `comparison`: comparación entre dos enfoques.
- `before_after`: transformación antes/después.

Cada generación debe guardar y mostrar:

- `templateId`
- `templateName`
- `topicSummary`
- `intent`
- `reasoning`
- `slidePattern`
- `visualStyle`

Esto convierte el carrusel en una decisión estratégica visible, no en una lista genérica de slides.

## Layouts visuales por plantilla

Primera versión implementada en Canvas:

- `myth_busting`: composición partida mito/realidad.
- `mistake_fix`: bloque de diagnóstico y señales de alerta.
- `checklist`: rail lateral con progreso.
- `objection_handler`: marco tipo objeción/duda con gran signo visual.
- `case_study`: tarjetas de evidencia antes/proceso/resultado.
- `direct_offer`: banda comercial de oferta y siguiente paso.
- `educational`: layout editorial con rail lateral.
- `comparison`: composición partida opción A/opción B.
- `before_after`: composición partida antes/después.

Sigue siendo una primera base visual. El objetivo no es que esto sea el diseño final, sino demostrar que WIASocial puede convertir una decisión estratégica en una composición visual diferente y exportable.

## Estado probado el 1 de julio de 2026

La preview local está disponible en:

```text
http://127.0.0.1:3000/carrusel-preview.html
```

Qué se puede probar ahora:

- escribir cualquier topic;
- dejar la plantilla en `Auto` o forzar una plantilla concreta;
- generar una preview local sin IA;
- generar una versión con Gemini desde `/api/dev/content-preview`;
- ver el modelo usado, la plantilla elegida, caption y CTA;
- revisar la slide seleccionada en grande;
- navegar por miniaturas ordenadas del carrusel;
- recargar la página sin perder la última generación, gracias a persistencia local;
- comprobar que el PNG ya no enseña notas internas como `visualCue` o "dirección visual".

Mejora aplicada:

- `visualCue` queda como metadato de diseño, no como texto dentro del PNG.
- El PNG público muestra contenido publicable: titular, apoyo, etiqueta de plantilla, progreso y una barra de "idea clave" o "siguiente paso".
- La preview ya no trata una slide como si fuese más importante por defecto; permite seleccionar y revisar el carrusel con más orden.
- La API de preview usa un contrato más estricto para Gemini y devuelve errores visibles si el JSON llega incompleto.
- El usuario ya no debería ver "generado con Gemini" sin una señal clara de qué se ha generado.

Lectura honesta:

Esto ya permite validar topic -> router -> IA -> carrusel -> render. Todavía no es el nivel final "wow". Para llegar ahí faltan brand kit real, variantes visuales por plantilla, edición slide por slide, assets/fondos mejores y aprendizaje desde resultados publicados.

## Benchmark profesional

Investigación realizada el 30 de junio de 2026.

Herramientas observadas:

- Canva: combina diseño, plantillas, calendario, colaboración, aprobación, publicación e insights. Su ventaja no es solo generar, sino permitir que el equipo cree, planifique, publique y mida desde el mismo sitio. Fuente: [Canva Content Planning](https://www.canva.com/solutions/content-planning-scheduling/).
- Adobe Express: se apoya en editor visual, plantillas, recursos de stock, IA generativa, assets de marca y Content Scheduler. Fuente: [Adobe Express Social Media Post Maker](https://www.adobe.com/express/create/post).
- Buffer: sitúa la IA dentro del flujo de creación: ideas, reescritura, adaptación por plataforma y refinamiento de tono. Fuente: [Buffer AI Assistant](https://buffer.com/ai-assistant).
- Hootsuite: está moviendo su IA hacia un agente conectado al sistema social completo: tendencias, competidores, performance, briefs, posts y recomendaciones. Mantiene revisión humana antes de publicar. Fuente: [Wisdom by Hootsuite](https://www.hootsuite.com/wisdom-ai).
- Later: combina planificación visual de Instagram, autopublicación de posts/carruseles/stories/reels, mejores horas, ideas de captions, hashtags y analítica. Fuente: [Later Instagram Scheduler](https://later.com/instagram-scheduler/).
- Predis.ai: promete convertir una idea en carruseles, posts de marca, captions y hashtags. Fuente: [Predis AI Instagram Carousel Maker](https://predis.ai/instagram-carousel-maker/).
- PostNitro: flujo muy parecido a lo que queremos para carruseles: idea, URL o texto -> carrusel -> preview y edición -> exportar/publicar. Añade plantillas, brand kit y formatos por plataforma. Fuente: [PostNitro](https://postnitro.ai/).
- Sprout Social: usa publicaciones de mejor rendimiento como inspiración para crear nuevos posts alineados con la voz de marca. Fuente: [Sprout AI Assist](https://support.sproutsocial.com/hc/en-us/articles/33318590268301-How-do-I-use-Generate-Posts-by-AI-Assist).
- Planable: usa IA dentro del composer y del inbox: captions desde prompts, imágenes o vídeos, hashtags, reescrituras, respuestas a comentarios y referencia a contenido previo. Fuente: [Planable AI](https://planable.io/guides/planable-ai/).

Patrones que se repiten:

- No venden solo generación. Venden flujo completo.
- Usan plantillas y editores visuales, no imágenes cerradas imposibles de editar.
- La IA vive dentro del composer, no separada en una pantalla experimental.
- Permiten revisar, editar, aprobar y publicar.
- Aprovechan contexto: marca, posts previos, performance, plataforma y audiencia.
- Miden resultados para orientar qué crear después.
- Dan control humano antes de publicar.
- Los mejores se acercan a un sistema operativo social, no a un chatbot.

Lectura para WIASocial:

WIASocial no debe intentar ser un Canva genérico. Canva ya gana en edición visual horizontal. Nuestro hueco debe ser:

```text
estrategia de Instagram + IA de contenido + carruseles publicables + CRM/leads + aprendizaje por resultados
```

Ventaja posible:

- Más estratégico que Canva/Adobe.
- Más orientado a conversión y leads que un editor de diseño.
- Más sencillo y barato que Hootsuite/Sprout para pymes, creadores y negocios locales.
- Más accionable que un generador de captions.
- Más conectado al resultado comercial que un generador de carruseles.

Implicaciones de producto:

1. El Content Studio debe vivir cerca del calendario y la publicación.
2. Cada pieza debe poder pasar por estados: borrador, revisada, lista, programada, publicada.
3. El usuario debe poder editar cada slide antes de descargar/publicar.
4. Debemos guardar qué plantilla se usó, qué se descargó, qué se publicó y qué funcionó.
5. El sistema debe aprender de publicaciones previas y mejores resultados.
6. El brand profile no es opcional: tono, oferta, objeciones, pruebas, estilo visual y ejemplos deben alimentar todas las generaciones.
7. Hay que soportar más entradas que solo topic: URL, post antiguo, transcripción, nota de voz, idea suelta, oferta, testimonio o caso.
8. La IA debe dar recomendaciones de siguiente acción, no solo piezas generadas.

Conclusión:

Las aplicaciones profesionales fuertes tienen tres capas:

```text
1. Creación asistida
2. Flujo operativo de publicación
3. Aprendizaje desde datos reales
```

Nuestro módulo 1 debe cubrir bien la primera capa, pero diseñarse desde ya para conectar con la segunda y la tercera.

## Decisión de primer corte

No empezamos por vídeo generativo. La prioridad es mejorar la calidad de la pieza generada, su estructura y su render visual. La publicación directa en Instagram ya tiene un primer flujo técnico, pero no debe considerarse validada como producto hasta probarla con una cuenta profesional real, permisos correctos y revisión de errores de Meta.

Primer MVP implementado:

- brief más rico
- selector de formato
- fase del funnel
- intensidad comercial
- objeción
- prueba o credibilidad
- acción deseada
- salida premium estructurada
- router inteligente de plantilla
- selector manual de plantilla
- variantes
- carrusel slide por slide
- stories
- DM de seguimiento
- dirección visual
- revisión crítica
- export de carrusel a PNG
- previsualización del PNG
- publicación directa en Instagram
- ajuste de titulares largos en el render PNG
- layout y acento visual según plantilla elegida
- guardado en `generated_content.raw_json`

## Por qué se guarda en `raw_json`

La tabla `generated_content` ya existe y tiene campos básicos:

- `hook`
- `reel_script`
- `caption`
- `cta`
- `hashtags`
- `story_sequence`
- `dm_reply_template`
- `raw_json`

Para validar rápido la experiencia premium, guardamos el pack completo en `raw_json` y mantenemos los campos básicos para compatibilidad.

No abrimos migración todavía porque primero necesitamos saber si esta salida realmente se siente útil.

## Contrato IA

La acción `content` de `/api/ai` ahora pide:

- `strategy`
- `primaryPiece`
- `variants`
- `carousel`
- `stories`
- `dmFollowUp`
- `visualDirection`
- `qualityReview`
- campos legacy para compatibilidad

El modelo se puede configurar con:

```text
CONTENT_STUDIO_OPENAI_MODEL
CONTENT_STUDIO_PREMIUM_MODEL
```

Si no hay modelo configurado, cae al modelo por defecto de la ruta.

## Export PNG implementado

La pantalla ya permite previsualizar y descargar un PNG por slide del carrusel generado.

Decisiones del primer export:

- formato vertical 4:5
- tamaño 1080 x 1350
- render client-side con Canvas
- sin librerías externas
- texto importante renderizado por la app
- dirección visual guardada como metadato, no pintada dentro del PNG final
- barra visual de idea clave o siguiente paso

Esto evita depender de un modelo de imagen para escribir texto dentro del carrusel.

## Publicación directa en Instagram

La pantalla incluye botón para publicar el carrusel directamente en Instagram.

Flujo implementado:

```text
Canvas PNG
  -> API interna
  -> Supabase Storage temporal
  -> URL firmada
  -> Instagram media containers
  -> Instagram media_publish
```

Condiciones necesarias:

- Instagram conectado.
- Permiso `instagram_business_content_publish`.
- `SUPABASE_SERVICE_ROLE_KEY` configurada.
- Bucket temporal creado automáticamente: `instagram-publish-assets`.
- La cuenta debe ser profesional y cumplir límites de Content Publishing.

Nota importante:

Los usuarios conectados antes de añadir el permiso de publicación tendrán que reconectar Instagram para conceder el nuevo scope.

## Siguiente mejora

El siguiente paso del módulo debe ser mejorar la calidad visual y la inteligencia del carrusel.

Orden recomendado:

1. Llevar la experiencia visual de la preview a la pantalla real `/content-generator`.
2. Subir la calidad gráfica de cada layout: tipografía, ritmo, espacios, fondos y elementos de marca.
3. Crear variantes visuales por plantilla, no solo una versión.
4. Hacer que la IA extraiga un concepto corto de portada desde cualquier topic con más precisión.
5. Permitir regenerar una slide concreta.
6. Medir cuántos carruseles se generan, editan, copian, descargan y publican por `templateId`.
7. Aprender qué plantillas generan más guardados, leads y publicaciones.

## Criterio de terminado del módulo

Content Studio premium estará realmente terminado cuando:

- el usuario pueda generar una pieza completa
- pueda guardar la pieza
- pueda copiar el pack
- pueda ver carrusel y stories estructurados
- pueda exportar al menos un carrusel en PNG
- pueda intentar publicación directa si Instagram está conectado con permisos correctos
- pueda partir de cualquier topic sin romper el diseño ni sonar genérico
- pueda explicar qué plantilla eligió y por qué
- la salida use el perfil de marca cuando exista
- podamos medir piezas guardadas, copiadas, exportadas, publicadas y resultados posteriores
