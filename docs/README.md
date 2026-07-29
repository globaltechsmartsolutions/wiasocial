# Documentación De WIASocial

Este directorio separa las decisiones vigentes de los estudios que sirven como evidencia. La fuente principal para construir producto es la arquitectura; la auditoría describe el punto de partida y los estudios de mercado explican por qué se ha elegido esta dirección.

## Documentos Principales

| Documento | Función | Estado |
|---|---|---|
| [Arquitectura y roadmap](ARQUITECTURA-Y-ROADMAP-WIASOCIAL-2026.md) | Fuente de verdad para producto, arquitectura, fases y criterios de salida | Vigente |
| [Arquitectura de IA y orquestación](ARQUITECTURA-IA-Y-ORQUESTACION-WIASOCIAL-2026.md) | Workflow determinista, contexto, modelos, imagen, evaluación, costes, trabajos duraderos y decisión sobre n8n | Revisión 2 vigente |
| [Auditoría técnica](AUDITORIA-TECNICA-WIASOCIAL-2026.md) | Riesgos y deuda del repositorio antes de la estabilización | Referencia de partida |
| [Revisión técnica previa a la siguiente fase](REVISION-TECNICA-PREFASE-2026-07-29.md) | Evidencia de limpieza, endurecimiento, comprobaciones y límites externos | Vigente |
| [Estudio multicanal](ESTUDIO-MERCADO-MULTICANAL-WIASOCIAL-2026.md) | Mercado, competidores, posicionamiento y oportunidad | Vigente |
| [Estudio inicial](ESTUDIO-MERCADO-WIASOCIAL-2026.md) | Hipótesis inicial centrada en Instagram | Histórico |
| [Masterplan anterior](WIASOCIAL-MASTERPLAN.md) | Visión previa del producto | Histórico, no normativo |

## Módulos

| Módulo | Documento | Estado |
|---|---|---|
| 01 | [Content Studio Premium](modulos/01-content-studio-premium/README.md) | Propuesta detallada; debe alinearse con Campaign Studio |
| 02 | [Perfil y memoria de marca](modulos/02-perfil-marca-memoria-base/README.md) | Base existente; evolucionará a conocimiento verificable de marca |

## Regla De Decisión

Si dos documentos se contradicen, prevalece este orden:

1. `ARQUITECTURA-Y-ROADMAP-WIASOCIAL-2026.md`.
2. `ARQUITECTURA-IA-Y-ORQUESTACION-WIASOCIAL-2026.md` para decisiones específicas de IA y automatización.
3. Decisiones aprobadas posteriormente y registradas en el repositorio.
4. Auditoría técnica.
5. Estudios de mercado.
6. Masterplans y propuestas históricas.
