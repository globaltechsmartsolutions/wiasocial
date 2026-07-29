# Puesta En Marcha De WIASocial

Esta guía describe el arranque local actual. No copies credenciales en el repositorio: `.env.local` está ignorado por Git y debe permanecer en cada equipo o en el gestor de variables del despliegue.

## Requisitos

- Node.js 22 (versión fijada en `.node-version`). Node 24 también es compatible.
- Acceso a un proyecto Supabase de desarrollo o staging para probar autenticación y persistencia.
- Las credenciales de OpenAI, Instagram y Stripe solo son necesarias para probar esas integraciones.

## Instalación

```bash
npm ci
```

Copia `.env.example` como `.env.local` y sustituye únicamente los marcadores que vayas a usar. Para levantar la interfaz y autenticar usuarios hacen falta, como mínimo:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

La clave `anon` está diseñada para el navegador y su seguridad depende de Row Level Security. `SUPABASE_SERVICE_ROLE_KEY`, claves de IA, secretos de Stripe y secretos de Instagram son credenciales de servidor: nunca deben llevar el prefijo `NEXT_PUBLIC_` ni copiarse a documentación o commits.

## Base De Datos

El esquema completo y sus migraciones versionadas se aplican con:

```bash
npm run migrate:all
```

Este comando modifica la base configurada. Ejecútalo primero en desarrollo o staging y confirma el destino antes de usarlo. No es necesario para ver las páginas públicas, pero sí para validar todos los flujos persistentes.

## Arranque

```bash
npm run dev:local
```

Abre [http://localhost:3000](http://localhost:3000). Si Supabase no está configurado correctamente, la pantalla de acceso mostrará un aviso en lugar de intentar autenticar con valores de ejemplo.

## Verificación

```bash
npm run check
```

La comprobación completa ejecuta lint, TypeScript, pruebas, detección de código muerto, compilación de producción y auditoría de dependencias.

Para borrar exclusivamente artefactos regenerables del proyecto:

```bash
npm run clean
```
