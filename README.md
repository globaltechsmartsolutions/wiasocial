# WIASocial

WIASocial es una plataforma SaaS para que agencias y equipos de marketing conviertan un objetivo comercial en una campaña adaptada a cada red social, la aprueben, la publiquen y relacionen sus resultados con oportunidades reales de negocio.

> Estado actual: alfa funcional en proceso de estabilización. El producto existente está centrado en Instagram; la arquitectura objetivo amplía el sistema a Instagram, Facebook, LinkedIn y X sin convertirlo en otro programador genérico de publicaciones.

## Qué Funciona Hoy

- Autenticación y persistencia con Supabase.
- Perfil y memoria básica de marca.
- Generación de contenido con IA.
- Content Studio con composición y exportación de carruseles.
- Conexión, sincronización y publicación en Instagram.
- CRM básico de leads, calendario, métricas e informes.
- Auditoría de perfil, radar de crecimiento y otras herramientas de apoyo.
- Suscripciones con Stripe cuando la integración está configurada.

## Dirección Del Producto

El núcleo futuro es **Campaign Studio**:

```text
objetivo comercial
  -> fuentes y memoria de marca
  -> concepto de campaña
  -> variantes nativas por canal
  -> imagen y composición final
  -> control de calidad
  -> aprobación
  -> publicación
  -> señales, oportunidades y aprendizaje
```

La definición funcional, las decisiones técnicas y el orden de construcción están en [Arquitectura y roadmap](docs/ARQUITECTURA-Y-ROADMAP-WIASOCIAL-2026.md).

## Tecnología

- Next.js 15 con App Router y React 19.
- TypeScript estricto.
- Tailwind CSS 4.
- Supabase Auth, PostgreSQL, Storage y RLS.
- OpenAI como proveedor de IA actual, detrás de una futura capa de adaptadores.
- Meta Graph API para Instagram.
- Stripe para facturación.
- Railway para el despliegue actual.

## Desarrollo Local

Requisitos:

- Node.js 22, definido en `.node-version`.
- Una instancia de Supabase para usar los flujos autenticados.

```bash
npm install
```

Crea `.env.local` a partir de `.env.example` y completa, como mínimo, las variables públicas de Supabase. OpenAI, Meta y Stripe son integraciones opcionales para el arranque local.

```bash
npm run dev:local
```

La aplicación estará disponible normalmente en [http://localhost:3000](http://localhost:3000).

## Comprobaciones

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Para ejecutar todas las comprobaciones:

```bash
npm run check
```

GitHub Actions ejecuta la misma línea base en cada `pull request` y en cada actualización de `main`.

## Base De Datos

Para aplicar el esquema base y todas las migraciones versionadas en el orden correcto:

```bash
npm run migrate:all
```

Este comando modifica la base indicada por las variables `SUPABASE_DB_URL`, `DATABASE_URL` o la combinación de credenciales documentada en `.env.example`. Debe ejecutarse primero en un entorno de desarrollo o staging.

## Estructura Actual

```text
src/app/          páginas y rutas HTTP de Next.js
src/components/   interfaz compartida
src/lib/          servicios e integraciones actuales
src/types/        contratos TypeScript
supabase/         esquema y migraciones SQL
scripts/          desarrollo, migraciones y evaluación de modelos
docs/             producto, mercado, auditoría y arquitectura
```

La evolución prevista mantiene un monolito modular: las rutas de `src/app` serán finas y la lógica se moverá gradualmente a módulos de dominio, sin reescribir de golpe las funciones que ya trabajan.

## Documentación

- [Índice de documentación](docs/README.md)
- [Arquitectura y roadmap](docs/ARQUITECTURA-Y-ROADMAP-WIASOCIAL-2026.md)
- [Arquitectura de IA y orquestación](docs/ARQUITECTURA-IA-Y-ORQUESTACION-WIASOCIAL-2026.md)
- [Auditoría técnica](docs/AUDITORIA-TECNICA-WIASOCIAL-2026.md)
- [Estudio de mercado multicanal](docs/ESTUDIO-MERCADO-MULTICANAL-WIASOCIAL-2026.md)
- [Módulo 1: Content Studio](docs/modulos/01-content-studio-premium/README.md)
- [Módulo 2: perfil y memoria de marca](docs/modulos/02-perfil-marca-memoria-base/README.md)
