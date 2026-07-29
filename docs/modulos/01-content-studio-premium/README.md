# Módulo 1: Content Studio premium

Fecha de inicio: 30 de junio de 2026

Documento relacionado: [Arquitectura de IA y orquestación](../../ARQUITECTURA-IA-Y-ORQUESTACION-WIASOCIAL-2026.md)

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
- `/content-generator` ya incluye una mesa de revisión del carrusel: slide activa grande, miniaturas visuales, copy de la slide, caption, CTA y acciones de descargar/publicar.
- La slide activa puede editarse antes de exportar: titular, apoyo y nota visual. El PNG se recalcula con esos cambios.
- El `AuthGuard` ya no debería dejar la app en un spinner infinito si la sesión tarda o falla.
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
- edición de la slide activa antes de exportar
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

1. Subir la calidad gráfica de cada layout: tipografía, ritmo, espacios, fondos y elementos de marca.
2. Crear variantes visuales por plantilla, no solo una versión.
3. Hacer que la IA extraiga un concepto corto de portada desde cualquier topic con más precisión.
4. Permitir regenerar una slide concreta.
5. Medir cuántos carruseles se generan, editan, copian, descargan y publican por `templateId`.
6. Aprender qué plantillas generan más guardados, leads y publicaciones.

## Criterio de terminado del módulo

Content Studio premium estará realmente terminado cuando:

- el usuario pueda generar una pieza completa
- pueda guardar la pieza
- pueda copiar el pack
- pueda ver carrusel y stories estructurados
- pueda editar el texto de una slide antes de exportar
- pueda exportar al menos un carrusel en PNG
- pueda intentar publicación directa si Instagram está conectado con permisos correctos
- pueda partir de cualquier topic sin romper el diseño ni sonar genérico
- pueda explicar qué plantilla eligió y por qué
- la salida use el perfil de marca cuando exista
- podamos medir piezas guardadas, copiadas, exportadas, publicadas y resultados posteriores

---

## Plan de evolución: IA especializada para contenido e imagen

Fecha de propuesta: 27 de julio de 2026

Estado: propuesta funcional del módulo. Las decisiones transversales vigentes están en [Arquitectura de IA y orquestación](../../ARQUITECTURA-IA-Y-ORQUESTACION-WIASOCIAL-2026.md) y prevalecen si aparece alguna contradicción. Los nombres de rol de esta sección describen tareas tipadas dentro de un workflow, no agentes autónomos.

### 1. Resumen ejecutivo

El siguiente paso de WIASocial no consiste en sustituir un modelo generalista por otro y mantener el mismo prompt. Consiste en construir un sistema creativo especializado que coordine varias responsabilidades:

```text
brief
  -> contexto y memoria de marca
  -> director estratégico
  -> router de formato y narrativa
  -> copywriter
  -> director visual
  -> generador de recursos visuales
  -> compositor
  -> editor crítico
  -> revisión humana
  -> exportación o publicación
  -> feedback y aprendizaje
```

Los modelos externos serán componentes intercambiables. La especialización pertenecerá a WIASocial y estará formada por:

- contexto de marca;
- contratos de datos estrictos;
- etapas creativas separadas;
- biblioteca de formatos;
- reglas editoriales;
- controles de calidad;
- ejemplos aprobados;
- memoria de cambios y resultados;
- renderizado controlado por la aplicación;
- evaluación continua de modelos, prompts y costes.

La meta del primer corte es sencilla:

```text
El usuario introduce un brief real y obtiene una publicación coherente,
editable, visualmente atractiva y suficientemente buena para publicar.
```

### 2. Diagnóstico del sistema actual

El sistema actual ya demuestra varias piezas valiosas:

- brief enriquecido;
- memoria base de marca;
- router de plantillas;
- generación estructurada;
- carrusel editable;
- render 1080 x 1350 con Canvas;
- descarga de PNG;
- publicación mediante la API oficial de Instagram;
- guardado del pack en `generated_content.raw_json`.

Sin embargo, todavía presenta limitaciones importantes:

1. Estrategia, copy, dirección visual y crítica nacen de una misma generación y no tienen independencia real.
2. La puntuación de calidad procede del mismo modelo que creó la pieza, por lo que no es una validación fiable.
3. La dirección visual suele ser texto descriptivo, no un recurso visual generado y conectado al diseño final.
4. Una imagen bonita puede no compartir intención, narrativa o composición con el copy.
5. Las plantillas controlan la maquetación, pero todavía no aprovechan suficientemente el estilo de cada marca.
6. No existe regeneración aislada de estrategia, slide, caption, CTA o imagen.
7. No se guardan de forma estructurada las modificaciones que hace el usuario.
8. No se compara la generación con ejemplos anteriores aprobados por la marca.
9. No existe un conjunto de evaluación estable para impedir regresiones de calidad.
10. No se mide todavía la relación entre pieza generada, pieza publicada y resultado comercial.

La conclusión es que el proyecto no necesita solo un modelo mejor. Necesita una arquitectura creativa mejor.

### 3. Objetivos del nuevo sistema

#### Objetivo principal

Crear una publicación que parezca producida por un pequeño equipo especializado en estrategia, copy y diseño para Instagram.

#### Objetivos funcionales

- Entender el negocio antes de escribir.
- Elegir un ángulo defendible y específico.
- Escribir contenido nativo de Instagram.
- Mantener una única intención por pieza.
- Generar recursos visuales sin texto incrustado.
- Componer el texto final dentro de WIASocial.
- Revisar calidad, claims, legibilidad y coherencia.
- Permitir correcciones por partes.
- Guardar qué acepta, edita, descarta y publica el usuario.
- Aprender de rendimiento y resultados comerciales.

#### No objetivos del primer corte

- Entrenar un modelo fundacional propio.
- Generar vídeo de forma masiva.
- Automatizar la publicación sin revisión humana.
- Crear un editor gráfico generalista equivalente a Canva.
- Hacer fine-tuning antes de contar con datos aprobados suficientes.
- Generar una imagen distinta para todas las slides por defecto.
- Añadir RAG complejo antes de validar la experiencia básica.

### 4. Principios de arquitectura

#### 4.1. WIASocial es el sistema; el modelo es un proveedor

La lógica de producto no debe depender de nombres concretos de modelos. Cada etapa solicitará una capacidad:

- razonamiento estratégico;
- copy creativo;
- salida JSON fiable;
- crítica editorial;
- generación de imagen;
- edición de imagen.

Una configuración determinista asignará a cada capacidad un modelo homologado. Esto permitirá cambiar modelos sin reescribir el Content Studio y sin delegar el presupuesto o el enrutado a otro LLM.

#### 4.2. Texto e imagen se generan por separado

El contenido importante debe seguir siendo editable:

```text
modelo de texto -> estrategia y copy estructurado
modelo de imagen -> fotografía, fondo o recurso sin texto
WIASocial -> tipografía, jerarquía, marca, CTA y composición final
```

No pediremos al modelo de imagen que escriba titulares, precios, CTAs o textos legales dentro del recurso.

#### 4.3. La crítica debe ser independiente

La calidad combinará dos capas:

1. Reglas deterministas de WIASocial.
2. Revisión semántica con un modelo que no reciba la instrucción de defender la generación anterior.

El editor crítico podrá aprobar, pedir una corrección localizada o rechazar la pieza.

#### 4.4. Revisión humana antes de publicar

El sistema puede recomendar y regenerar, pero el usuario conserva la decisión final. Publicar, modificar claims y aceptar recursos visuales serán acciones explícitas.

#### 4.5. Coste y trazabilidad desde el principio

Cada etapa debe registrar proveedor, modelo, versión de prompt, latencia, estado, error y coste estimado cuando el proveedor lo permita.

### 5. Experiencia objetivo del usuario

#### Paso 1. Preparar la marca

El usuario completa o revisa:

- nombre de marca;
- nicho;
- oferta;
- audiencia;
- promesa;
- diferenciador;
- problemas y deseos del cliente;
- objeciones;
- pruebas disponibles;
- tono;
- palabras o claims prohibidos;
- estilo visual;
- ejemplos de publicaciones aprobadas.

#### Paso 2. Crear el brief

El brief incluirá:

- tema principal;
- objetivo;
- fase del funnel;
- formato;
- intensidad comercial;
- audiencia concreta;
- oferta;
- objeción;
- prueba;
- acción deseada;
- material de partida opcional.

El material de partida podrá evolucionar para aceptar texto, URL, publicación anterior, testimonio, transcripción o nota de voz.

#### Paso 3. Revisar la estrategia

Antes de generar la pieza completa, WIASocial mostrará:

- ángulo;
- tensión principal;
- promesa;
- nivel de conciencia de la audiencia;
- formato recomendado;
- plantilla narrativa;
- prueba que se puede utilizar;
- riesgo principal;
- acción que debe provocar la publicación.

El usuario podrá aceptar la estrategia o pedir otra dirección.

#### Paso 4. Generar el copy

El copywriter producirá:

- hook;
- título de portada;
- narrativa slide por slide;
- caption;
- CTA;
- stories;
- DM de seguimiento;
- variantes de ángulo cuando aporten valor.

#### Paso 5. Crear la dirección visual

El director visual definirá:

- concepto visual;
- tipo de imagen;
- escena;
- sujeto;
- encuadre;
- iluminación;
- profundidad;
- espacio negativo para el texto;
- paleta;
- relación con la oferta;
- elementos que deben evitarse.

#### Paso 6. Generar recursos visuales

El sistema generará inicialmente:

- una imagen principal para la portada;
- opcionalmente uno o dos recursos de apoyo cuando la narrativa lo justifique;
- variantes visuales bajo petición.

No generaremos una fotografía diferente por slide de forma automática. Eso elevaría costes y podría romper la coherencia visual.

#### Paso 7. Componer la publicación

WIASocial combinará:

- recurso visual;
- plantilla;
- marca;
- tipografía;
- texto editable;
- numeración;
- CTA;
- márgenes seguros;
- formato 4:5.

#### Paso 8. Ejecutar la crítica

El editor crítico revisará la pieza completa y devolverá:

- estado global;
- criterios aprobados;
- bloqueos;
- riesgos;
- correcciones recomendadas;
- etapa concreta que debe regenerarse.

#### Paso 9. Editar y aprobar

El usuario podrá:

- editar una slide;
- regenerar una slide;
- cambiar solo el hook;
- cambiar solo el CTA;
- mantener el copy y regenerar la imagen;
- mantener la imagen y probar otra plantilla;
- aprobar la pieza final.

#### Paso 10. Exportar, publicar y aprender

La pieza aprobada podrá descargarse o publicarse. Después se guardarán eventos de uso y, cuando exista información, resultados de Instagram y del CRM.

### 6. Arquitectura funcional

```text
┌──────────────────────┐
│ Brief del usuario    │
└──────────┬───────────┘
           v
┌──────────────────────┐
│ Normalizador         │
│ valida y completa    │
└──────────┬───────────┘
           v
┌──────────────────────┐
│ Contexto de marca    │
│ memoria + datos      │
└──────────┬───────────┘
           v
┌──────────────────────┐
│ Director estratégico │
└──────────┬───────────┘
           v
┌──────────────────────┐
│ Router narrativo     │
└──────────┬───────────┘
           v
┌──────────────────────┐
│ Copywriter           │
└──────┬─────────┬─────┘
       │         │
       │         v
       │  ┌──────────────────────┐
       │  │ Director visual      │
       │  └──────────┬───────────┘
       │             v
       │  ┌──────────────────────┐
       │  │ Proveedor de imagen  │
       │  └──────────┬───────────┘
       v             v
┌───────────────────────────────┐
│ Compositor WIASocial          │
└──────────────┬────────────────┘
               v
┌───────────────────────────────┐
│ Quality Gate                  │
│ reglas + crítica semántica    │
└──────────────┬────────────────┘
               v
┌───────────────────────────────┐
│ Revisión humana               │
└──────────────┬────────────────┘
               v
┌───────────────────────────────┐
│ Guardar / exportar / publicar │
└──────────────┬────────────────┘
               v
┌───────────────────────────────┐
│ Feedback y resultados         │
└───────────────────────────────┘
```

### 7. Componentes del sistema

#### 7.1. Normalizador de brief

Responsabilidades:

- validar campos obligatorios;
- normalizar idioma y formato;
- detectar contradicciones;
- identificar datos faltantes;
- limitar tamaños;
- separar instrucciones del usuario y contexto confiable de marca.

No generará creatividad. Preparará una entrada limpia y segura.

#### 7.2. Constructor de contexto

Usará inicialmente:

- `user_settings`;
- `brand_memory`;
- publicaciones registradas;
- formatos con mejor rendimiento;
- estado de leads;
- datos permitidos de Instagram;
- último Growth Radar cuando sea relevante.

El contexto debe estar filtrado por usuario o workspace y tener límites claros de tamaño.

#### 7.3. Director estratégico

Producirá una estrategia independiente del copy final:

```text
audiencia -> tensión -> ángulo -> promesa -> prueba -> acción
```

Debe justificar por qué esa dirección es adecuada para el objetivo y el funnel.

#### 7.4. Router narrativo

El router actual se conservará como base y evolucionará para combinar:

- reglas explicables;
- preferencia manual;
- recomendación del modelo;
- resultados históricos por marca;
- adecuación al formato;
- riesgo de repetición.

#### 7.5. Copywriter

Trabajará sobre una estrategia ya aprobada. Sus reglas principales serán:

- una idea central;
- una promesa concreta;
- titulares cortos;
- progresión narrativa;
- una acción final;
- uso exclusivo de pruebas disponibles;
- tono de marca;
- lenguaje natural;
- rechazo de frases vacías y clichés.

#### 7.6. Director visual

No producirá el PNG. Producirá un contrato visual estructurado que pueda utilizar cualquier proveedor de imagen y el compositor.

#### 7.7. Adaptador de proveedores de imagen

Ofrecerá una interfaz estable:

```text
generateImage(visualBrief, options) -> visualAsset
```

Cada adaptador resolverá autenticación, parámetros, errores y normalización de respuesta. El Content Studio no conocerá los detalles del proveedor.

#### 7.8. Compositor

Será responsable del archivo publicable:

- 1080 x 1350;
- áreas seguras;
- contraste;
- jerarquía;
- tipografía;
- recorte de imagen;
- overlays;
- marca;
- numeración;
- consistencia entre slides;
- exportación final.

La imagen seleccionada debe formar parte real del PNG descargado y del contenido enviado a Instagram, no solo de una preview temporal.

#### 7.9. Editor crítico y Quality Gate

El editor crítico no reescribirá todo por defecto. Identificará la etapa responsable del fallo y propondrá una corrección localizada.

#### 7.10. Registro de feedback

Guardará eventos como:

- estrategia aceptada;
- estrategia regenerada;
- hook editado;
- slide editada;
- imagen descartada;
- imagen aprobada;
- plantilla cambiada;
- pieza descargada;
- pieza publicada;
- resultado posterior.

### 8. Estrategia de modelos y proveedores

#### 8.1. Decisión principal

Habrá un proveedor principal por capacidad en producción. Los candidatos competirán en laboratorio y solo se habilitará un fallback si supera los mismos contratos y evaluaciones. No se enviará cada pieza a varios proveedores por defecto.

Los candidatos iniciales, el enrutado por tarea, el pipeline visual, los presupuestos y la metodología completa del bake-off están definidos en [Arquitectura de IA y orquestación](../../ARQUITECTURA-IA-Y-ORQUESTACION-WIASOCIAL-2026.md). Este módulo ejecutará esa decisión y no mantendrá otra lista independiente de modelos.

#### 8.2. Roles a evaluar

| Rol | Prioridad | Requisitos |
| --- | --- | --- |
| Estrategia | Calidad | Razonamiento, contexto de negocio, consistencia |
| Copy | Calidad | Naturalidad, especificidad, tono, capacidad editorial |
| Router | Velocidad | Clasificación fiable y económica |
| Crítica | Independencia | Detección de fallos y justificación |
| Imagen | Calidad visual | Composición, realismo, edición y consistencia |
| Tareas auxiliares | Coste | Resumen, clasificación y normalización |

#### 8.3. Bake-off obligatorio

Antes de elegir modelos por defecto se preparará un conjunto de casos reales:

- restaurante japonés premium;
- clínica dental;
- clínica estética;
- agencia boutique;
- entrenador o programa de fitness;
- inmobiliaria;
- formación o infoproducto;
- marca personal profesional;
- negocio local con reserva;
- caso educativo sin venta directa.

Cada salida se evaluará con la misma rúbrica y sin mostrar al evaluador qué modelo la generó.

#### 8.4. Criterios de comparación

- calidad estratégica;
- calidad del hook;
- naturalidad;
- especificidad;
- fidelidad a marca;
- coherencia con la oferta;
- calidad de la narrativa;
- fiabilidad del JSON;
- calidad visual;
- espacio útil para texto;
- tasa de regeneración;
- latencia;
- coste;
- errores;
- aceptación humana.

#### 8.5. Política de fallback

El sistema podrá:

- usar un proveedor alternativo si falla el principal;
- degradar a una etapa manual si no hay saldo;
- mantener el copy aunque falle la imagen;
- permitir subir una imagen propia;
- no perder la generación si una etapa secundaria falla.

### 9. Contratos de datos propuestos

Los nombres definitivos se cerrarán antes de implementar.

#### `CreativeBrief`

```text
brandId
topic
audience
offer
goal
format
funnelStage
commercialIntensity
tone
objection
proof
desiredAction
preferredTemplateId
sourceMaterial
locale
```

#### `CreativeStrategy`

```text
contentThesis
audienceInsight
awarenessLevel
coreTension
angle
promise
proofPlan
conversionIntent
recommendedFormat
recommendedTemplate
riskNotes
```

#### `CopyPack`

```text
primaryPiece
variants
carousel
stories
caption
cta
dmFollowUp
hashtags
```

#### `VisualBrief`

```text
concept
subject
scene
composition
camera
lighting
mood
palette
negativeSpace
brandSignals
forbiddenElements
slideAssetPlan
```

#### `VisualAsset`

```text
id
provider
model
promptVersion
mimeType
width
height
storagePath
role
status
createdAt
```

#### `QualityReport`

```text
gateStatus
hardFailures
warnings
strengths
recommendedRepairs
stageToRegenerate
```

#### `GenerationRun`

```text
id
userId
workspaceId
brief
strategy
copyPack
visualBrief
visualAssets
qualityReport
providerTrace
promptVersions
costEstimate
status
createdAt
```

### 10. Sistema de calidad

#### 10.1. Reglas duras

Una pieza no podrá aprobarse automáticamente si:

- falta una acción clara;
- usa una prueba no aportada;
- contiene un claim prohibido;
- el titular de portada no cabe;
- existe texto crítico dentro de una imagen no editable;
- hay varias acciones incompatibles;
- el carrusel no sigue una progresión;
- la imagen contradice la oferta o el sector;
- el contenido incluye datos sensibles no necesarios;
- el PNG final no cumple dimensiones o legibilidad.

#### 10.2. Rúbrica humana offline

| Criterio | Peso |
| --- | ---: |
| Estrategia y objetivo | 20 |
| Especificidad y relevancia | 15 |
| Hook y portada | 15 |
| Narrativa | 15 |
| Oferta, prueba y CTA | 15 |
| Fidelidad a marca | 10 |
| Calidad visual y legibilidad | 10 |

#### 10.3. Estados de ejecución

- `passed`: no hay bloqueos y la pieza puede pasar a revisión humana.
- `needs_repair`: existe un defecto localizado que puede corregirse una vez.
- `blocked`: hay un error factual, legal, de marca o de formato.

La puntuación ponderada se utilizará en el benchmark y la revisión humana, no como nota decorativa generada por el propio modelo dentro del producto.

#### 10.4. Detecciones deterministas

- longitud de titulares;
- número de slides;
- ausencia de CTA;
- repetición de palabras;
- frases genéricas conocidas;
- claims numéricos sin prueba;
- inconsistencias entre acción deseada y CTA;
- contraste y ocupación del canvas;
- desbordamiento de texto;
- dimensiones del recurso;
- formato y tamaño de archivo.

#### 10.5. Crítica semántica

Revisará aspectos difíciles de medir con reglas:

- originalidad;
- claridad de la idea;
- madurez comercial;
- tono de marca;
- credibilidad;
- coherencia emocional;
- relación entre imagen y mensaje;
- utilidad real para la audiencia.

### 11. Estrategia visual

#### 11.1. Imagen como recurso, no como publicación cerrada

La IA de imagen producirá una capa visual. WIASocial será responsable de convertirla en publicación.

#### 11.2. Primera política de assets

- Una imagen principal para portada.
- Fondos gráficos programados para slides informativas.
- Uno o dos recursos secundarios cuando sean necesarios.
- Reutilización coherente de la imagen principal cuando ayude a mantener unidad.
- Variantes de imagen solo bajo petición o cuando la crítica rechace el recurso.

#### 11.3. Requisitos de los prompts visuales

- sin texto;
- sin logos inventados;
- sin marcas de agua;
- sin carteles legibles;
- espacio negativo planificado;
- sujeto relevante;
- composición 4:5;
- estilo compatible con la marca;
- instrucciones de exclusión;
- referencia al objetivo comercial sin representar claims falsos.

#### 11.4. Consistencia de marca

La primera versión utilizará reglas explícitas de marca. Después podrá añadir referencias visuales autorizadas y edición basada en imagen.

### 12. Personalización y memoria

#### Nivel 1. Memoria declarativa

Ya disponible parcialmente:

- tono;
- oferta;
- audiencia;
- promesa;
- diferenciador;
- objeciones;
- pruebas;
- estilo visual;
- claims prohibidos.

#### Nivel 2. Memoria editorial

- publicaciones aprobadas;
- publicaciones rechazadas;
- hooks aceptados;
- correcciones frecuentes;
- palabras preferidas;
- estructuras repetidas que deben evitarse.

#### Nivel 3. Memoria de comportamiento

- partes que el usuario edita;
- imágenes descartadas;
- plantillas elegidas;
- regeneraciones;
- tiempo hasta aprobación.

#### Nivel 4. Memoria de resultados

- alcance;
- guardados;
- compartidos;
- conversaciones;
- leads;
- reservas;
- ventas atribuidas o asistidas.

No se aplicará fine-tuning hasta tener un conjunto limpio de ejemplos aprobados, rechazados y resultados asociados.

### 13. Interfaz propuesta

#### Modo Auto

WIASocial decide estrategia, plantilla, copy y dirección visual. El usuario revisa el resultado y puede regenerar partes.

#### Modo Manual

El usuario puede bloquear:

- estrategia;
- formato;
- plantilla;
- hook;
- CTA;
- recurso visual;
- paleta;
- intensidad comercial.

#### Estados visibles

```text
Brief -> Estrategia -> Copy -> Visual -> Composición -> Crítica -> Aprobación
```

La interfaz mostrará qué etapa está trabajando, qué proveedor se utilizó y qué partes están aprobadas o pendientes.

#### Edición por bloques

Cada bloque tendrá acciones específicas. No habrá un único botón de “regenerar todo” como única salida.

### 14. Persistencia propuesta

#### Primer corte

Mantener compatibilidad con `generated_content.raw_json` mientras validamos el contrato final.

#### Evolución posterior

Entidades candidatas, alineadas con la arquitectura transversal:

- `generation_runs`;
- `generation_steps`;
- `generation_artifacts`;
- `usage_events`;
- `quality_findings`;
- `content_feedback_events`;
- `visual_assets`;
- `content_versions`;
- `content_outcomes`;
- `outbox_events`.

Todas las tablas deberán incluir políticas RLS y separación por usuario o workspace.

### 15. APIs propuestas

Estas rutas son orientativas y no están implementadas todavía:

```text
POST /api/content-studio/strategy
POST /api/content-studio/copy
POST /api/content-studio/visual-brief
POST /api/content-studio/images
POST /api/content-studio/quality
POST /api/content-studio/repair
POST /api/content-studio/render
POST /api/content-studio/feedback
```

Durante el MVP podremos usar una ruta orquestadora interna, manteniendo las etapas separadas en código. No debemos convertir cada etapa en una API pública si no aporta valor.

### 16. Costes y límites

#### Principios

- Una acción del usuario puede ejecutar varias etapas internas, pero debe mostrarse como una sola generación de producto.
- Las regeneraciones parciales deben consumir menos que una generación completa.
- La imagen será opcional cuando no exista saldo o proveedor configurado.
- Los assets se reutilizarán entre slides cuando tenga sentido.
- Se aplicarán límites por usuario y por workspace.
- Nunca se expondrán claves en el cliente.

#### Optimización inicial

- modelo potente para estrategia y copy principal;
- modelo rápido para clasificación y tareas auxiliares;
- crítica determinista antes de llamar a otro modelo;
- generación de una sola portada por defecto;
- caché de contexto de marca;
- versiones de prompt para comparar resultados;
- presupuesto máximo por generación.

No se fijarán costes comerciales definitivos hasta medir consumo real con el bake-off.

### 17. Seguridad, privacidad y compliance

- Autenticación obligatoria en rutas de generación.
- RLS en cualquier tabla nueva.
- `SUPABASE_SERVICE_ROLE_KEY` y claves de proveedores solo en servidor.
- Rate limit por usuario, IP y feature.
- Validación de tamaño y formato de imágenes.
- Sanitización del material de entrada.
- Separación entre instrucciones, hechos aprobados y material importado no confiable.
- No enviar datos innecesarios a proveedores.
- No generar claims médicos, financieros o comerciales sin prueba.
- Revisión humana antes de publicar.
- Uso de APIs oficiales de Instagram.
- Trazabilidad de borrado de assets y datos.
- Política clara de retención de imágenes.

### 18. Observabilidad

Cada ejecución debe poder responder:

- qué brief se utilizó;
- qué memoria se recuperó;
- qué regla de enrutado decidió la estructura;
- qué modelos participaron;
- qué versiones de prompt se usaron;
- cuánto tardó cada etapa;
- qué etapa falló;
- cuántas veces se regeneró;
- qué coste estimado tuvo;
- qué aceptó o modificó el usuario;
- si terminó descargada o publicada;
- qué resultado obtuvo después.

### 19. Evaluación continua

#### Conjunto fijo de pruebas

Mantendremos briefs representativos y resultados esperados. Cada cambio de modelo, prompt o regla deberá ejecutarse contra ese conjunto.

#### Métricas automáticas

- JSON válido;
- campos obligatorios;
- titulares dentro de límites;
- CTA coherente;
- uso correcto de pruebas;
- ausencia de claims prohibidos;
- slides correctas;
- render sin desbordamiento;
- imagen con dimensiones correctas.

#### Evaluación humana

Una rúbrica ciega valorará:

- “lo publicaría”;
- calidad de la idea;
- calidad del copy;
- calidad visual;
- fidelidad a marca;
- capacidad de conversión;
- necesidad de edición.

### 20. Roadmap de implementación

Las duraciones son estimaciones técnicas iniciales y se revisarán después de aprobar el alcance.

#### Fase 0. Documento, casos y línea base

Estimación: 1-2 días de trabajo.

Entregables:

- arquitectura aprobada;
- decisiones abiertas cerradas;
- diez briefs de evaluación;
- rúbrica de calidad;
- capturas de la línea base actual;
- presupuesto inicial por proveedor.

Criterio de salida:

```text
Sabemos qué vamos a construir y cómo mediremos si mejora.
```

#### Fase 1. Pipeline especializado de texto

Estimación: 3-5 días.

Entregables:

- normalizador de brief;
- director estratégico;
- router narrativo integrado;
- copywriter separado;
- contratos tipados;
- proveedor intercambiable;
- trazabilidad de etapas;
- compatibilidad con la interfaz actual.

Criterio de salida:

```text
Estrategia y copy dejan de depender de un único prompt monolítico.
```

#### Fase 2. Quality Gate y regeneración localizada

Estimación: 3-4 días.

Entregables:

- reglas deterministas;
- rúbrica;
- crítica semántica;
- umbrales;
- regeneración de hook, slide, caption o CTA;
- visualización de bloqueos.

Criterio de salida:

```text
WIASocial deja de presentar como final una pieza claramente mediocre.
```

#### Fase 3. Dirección visual y proveedores de imagen

Estimación: 3-5 días.

Entregables:

- contrato `VisualBrief`;
- adaptador de proveedores;
- primer proveedor conectado;
- generación de portada sin texto;
- subida manual como fallback;
- control de errores y saldo;
- variantes visuales bajo petición.

Criterio de salida:

```text
La imagen nace del mismo brief estratégico que el copy.
```

#### Fase 4. Composición y editor visual

Estimación: 3-5 días.

Entregables:

- imagen integrada en el PNG real;
- descarga y publicación con el mismo render;
- layouts mejorados;
- brand kit;
- edición por slide;
- regeneración visual por slide;
- comprobación de legibilidad.

Criterio de salida:

```text
La preview, la descarga y la publicación son exactamente la misma pieza.
```

#### Fase 5. Feedback, versiones y observabilidad

Estimación: 3-5 días.

Entregables:

- eventos de edición y aprobación;
- versiones de una pieza;
- `ai_runs` o equivalente;
- costes y latencias;
- historial de assets;
- migraciones Supabase reproducibles;
- panel técnico mínimo.

Criterio de salida:

```text
Podemos explicar cómo se creó una pieza y qué cambió el usuario.
```

#### Fase 6. Validación real con Instagram

Estimación: 2-3 días más tiempo de observación.

Entregables:

- publicación con cuenta profesional de prueba;
- manejo de errores de Meta;
- eventos de publicación;
- sincronización de métricas disponibles;
- comparación entre piezas publicadas.

Criterio de salida:

```text
El flujo funciona desde el brief hasta una publicación real y medible.
```

#### Fase 7. Aprendizaje por marca

Estimación: evolutiva, después de acumular uso real.

Entregables:

- memoria editorial;
- recuperación de ejemplos aprobados;
- detección de patrones de edición;
- recomendaciones por rendimiento;
- bake-off periódico;
- análisis de viabilidad de fine-tuning.

Criterio de salida:

```text
WIASocial mejora para cada marca a partir de decisiones y resultados reales.
```

### 21. Alcance del MVP

El MVP de esta evolución incluirá:

- pipeline separado de estrategia y copy;
- router narrativo;
- dirección visual estructurada;
- una imagen principal opcional;
- composición final con texto editable;
- Quality Gate;
- regeneración localizada básica;
- guardado compatible;
- descarga de PNG;
- publicación manual aprobada por el usuario;
- trazabilidad mínima.

Quedarán fuera del MVP:

- fine-tuning;
- vídeo;
- edición avanzada de fotografías;
- colaboración multiusuario;
- generación masiva;
- aprendizaje automático desde resultados sin revisión;
- publicación totalmente autónoma.

### 22. Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| Copy genérico | Memoria de marca, estrategia previa, ejemplos y Quality Gate |
| Imagen bonita pero irrelevante | `VisualBrief` derivado de la estrategia |
| Texto ilegible | Composición controlada y validación de canvas |
| Claims inventados | Pruebas explícitas, reglas duras y revisión humana |
| Coste elevado | Assets limitados, regeneración parcial y presupuesto por etapa |
| Dependencia de proveedor | Adaptadores y contratos propios |
| JSON inválido | Salida estructurada, normalización y reintentos limitados |
| Latencia elevada | Modelos por capacidad, paralelización segura y progreso por etapas |
| Datos de marca mal usados | Contexto confiable separado y filtros por workspace |
| Migraciones incompletas | SQL versionado, RLS y pruebas de migración |
| Resultado distinto al publicado | Render único compartido por preview, descarga y publicación |
| Evaluación subjetiva | Rúbrica fija, pruebas ciegas y métricas de aceptación |

### 23. Dependencias y aportaciones necesarias

#### Dependencias técnicas

- Supabase configurado;
- claves de los proveedores que se vayan a evaluar;
- saldo de API para pruebas automatizadas;
- almacenamiento de assets;
- cuenta profesional de Instagram para validación;
- permisos de publicación;
- acceso de escritura al repositorio remoto.

#### Aportaciones de producto

- ejemplos de publicaciones consideradas buenas;
- ejemplos rechazados;
- marcas de prueba;
- tono y criterios visuales;
- presupuesto máximo por generación;
- definición de qué significa “publicable” para el negocio.

### 24. Decisiones ya tomadas

- No entrenar un modelo propio en la primera fase.
- No usar una única llamada monolítica.
- Separar texto, imagen y composición.
- Mantener el texto importante editable.
- Revisar antes de publicar.
- No fijar un proveedor sin bake-off.
- Mantener fallback manual de imágenes.
- Medir costes y decisiones desde el principio.
- Construir sobre el Content Studio actual, no empezar otra aplicación.

### 25. Decisiones pendientes de aprobación

1. ¿La primera versión genera solo portada o portada más un recurso secundario?
2. ¿Cuál es el coste máximo aceptable por publicación completa?
3. ¿Qué tres sectores se usarán para la validación inicial?
4. ¿Qué ejemplos representan el nivel visual esperado?
5. ¿El usuario debe aprobar la estrategia antes de generar o se ofrece como paso opcional?
6. ¿Qué modelo gana el bake-off de estrategia y cuál el de copy por canal?
7. ¿Qué proveedor visual gana por fotografía, ilustración y diseño?
8. ¿Cuándo se debe descontar una generación del plan: al comenzar, al aprobar o por etapa?
9. ¿Cuánto tiempo se conservarán imágenes y versiones descartadas?
10. ¿Qué datos de rendimiento se consideran suficientes para recomendar una plantilla?

### 26. Criterio de terminado de esta evolución

La evolución estará terminada cuando se cumplan todas estas condiciones:

- estrategia y copy son etapas independientes;
- los modelos se pueden sustituir mediante adaptadores;
- la imagen procede del mismo brief estratégico;
- el texto importante permanece editable;
- existe un Quality Gate independiente;
- se puede regenerar una parte sin perder el resto;
- la preview coincide con el PNG descargado y publicado;
- los datos se guardan con trazabilidad;
- las migraciones son reproducibles;
- el usuario puede aprobar o rechazar cada etapa relevante;
- existe un conjunto de pruebas estable;
- podemos medir aceptación, coste, latencia y resultado;
- una cuenta profesional real puede completar el flujo;
- la calidad supera de forma consistente la línea base actual.

### 27. Ejemplo completo: restaurante japonés premium

Entrada:

```text
Tema: conseguir reservas para un restaurante japonés premium en Madrid
Audiencia: parejas y profesionales de 30-50 años
Oferta: menú omakase de temporada
Objetivo: reservas
Objeción: parece demasiado caro
Prueba: chef formado en Japón y producto de temporada
Acción: reservar desde el enlace del perfil
```

Estrategia esperada:

```text
No vender “comida japonesa”. Vender una experiencia guiada,
limitada y difícil de comparar con una cena convencional.
```

Copy esperado:

```text
Portada: “No vienes a elegir platos”
Narrativa: expectativa -> experiencia omakase -> criterio del chef
-> producto -> prueba -> reserva
```

Dirección visual esperada:

```text
Barra omakase íntima, chef trabajando, luz cálida,
producto visible, composición editorial y espacio negativo para titular.
Sin texto, logos inventados ni cartas legibles.
```

Composición:

```text
Fotografía en portada + titular editable + subtítulo breve.
Slides interiores con ritmo editorial, detalles del producto,
prueba y cierre con una sola acción.
```

Quality Gate:

```text
Debe rechazar frases genéricas como “vive una experiencia única”,
claims no demostrados, exceso de texto y CTAs distintos entre slides.
```

Este ejemplo resume la diferencia entre generar una imagen bonita y construir una publicación completa con intención, contenido, diseño y control.
