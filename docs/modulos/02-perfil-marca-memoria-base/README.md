# Módulo 2: Perfil de marca y memoria base

Fecha de inicio: 1 de julio de 2026

## Objetivo

Hacer que la IA de WIASocial deje de partir de un brief aislado y empiece a trabajar con una memoria estable de marca.

La idea no es crear RAG todavía. La memoria base es el primer escalón:

```text
perfil de marca -> contexto IA -> contenido más específico -> futuras memorias/RAG
```

## Por qué este módulo importa

Sin memoria de marca, la IA puede escribir correctamente, pero tenderá a sonar genérica. Con una ficha de marca buena, WIASocial puede:

- mantener tono y posicionamiento;
- evitar claims peligrosos o falsos;
- reutilizar objeciones frecuentes;
- hablar desde pruebas reales;
- elegir mejores ángulos de contenido;
- adaptar carruseles, DMs, briefs y análisis al negocio.

## MVP implementado

Se amplía `user_settings` con una columna:

```text
brand_memory JSONB
```

Decisión:

- usar JSONB para poder ampliar memoria sin crear una migración por cada matiz;
- mantener los campos base existentes (`brand_name`, `niche`, `target_audience`, `offer`, etc.);
- alimentar `buildUserAIContext` con la memoria para que las rutas IA la reciban como contexto confiable.

## Campos de memoria

Primera versión:

- `brandPromise`: promesa principal.
- `differentiator`: diferenciador.
- `customerPain`: dolor principal.
- `customerDesire`: deseo aspiracional.
- `contentPillars`: pilares de contenido.
- `proofPoints`: pruebas y credibilidad.
- `objections`: objeciones frecuentes.
- `forbiddenClaims`: qué no debe decir la IA.
- `visualStyle`: estilo visual.
- `brandVoiceNotes`: notas de voz y tono.
- `referenceExamples`: ejemplos que representan bien la marca.

## Flujo implementado

```text
/settings
  -> ficha de marca ampliada
  -> user_settings.brand_memory
  -> buildUserAIContext
  -> rutas IA
  -> Content Studio usa memoria como fuente de verdad
```

## Qué se puede probar

1. Abrir `/settings`.
2. Completar la memoria de marca.
3. Guardar configuración.
4. Generar contenido desde `/content-generator`.
5. Comprobar si la salida respeta tono, pruebas, objeciones, límites y estilo definidos.

## Migración

Ejecutar:

```bash
npm run migrate:brand-profile
```

Esto aplica:

```text
supabase/brand-profile-migration.sql
```

## Qué no es todavía

Este módulo todavía no es:

- RAG vectorial;
- memoria episódica de acciones y resultados;
- aprendizaje automático;
- extracción automática desde posts antiguos;
- análisis semántico de comentarios o DMs.

Es la base estable sobre la que luego construiremos esas capas.

## Siguiente mejora

Orden recomendado:

1. Añadir indicador de calidad del perfil de marca.
2. Permitir que la IA sugiera completar campos vacíos a partir de la web, Instagram o un brief.
3. Guardar ejemplos de posts ganadores como memoria separada.
4. Crear `ai_runs` para saber qué memoria se usó en cada generación.
5. Convertir contenido publicado y resultados en memoria de aprendizaje.

## Criterio de terminado

El módulo estará completo cuando:

- la marca tenga una ficha clara y guardada;
- todas las rutas IA importantes reciban esa memoria;
- el usuario pueda ver qué datos está usando la IA;
- podamos distinguir memoria base, memoria semántica, memoria episódica y memoria de aprendizaje;
- el Content Studio genere piezas claramente más específicas al rellenar la memoria.
