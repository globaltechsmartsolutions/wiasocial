# Guía Paso A Paso

## 1. Preparar El Equipo

1. Instala Node.js 22.
2. Abre PowerShell o Terminal dentro de la carpeta del proyecto.
3. Ejecuta `npm ci`.
4. Copia `.env.example` y renombra la copia como `.env.local`.

## 2. Conectar Un Supabase De Desarrollo

1. Entra en el panel del proyecto Supabase que vaya a usarse para desarrollo o staging.
2. Copia la URL del proyecto y la clave pública (`anon` o publishable).
3. Rellena en `.env.local` `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Si debes crear o actualizar el esquema, añade las credenciales de base de datos indicadas en `.env.example`, confirma que no apuntan a producción y ejecuta `npm run migrate:all`.

La clave pública puede llegar al navegador; la protección real de los datos la aplica RLS. La clave `SUPABASE_SERVICE_ROLE_KEY` evita RLS y solo puede existir en el servidor. No la pegues en chats, documentos ni archivos que vayan a Git.

## 3. Abrir La Aplicación

```bash
npm run dev:local
```

Abre [http://localhost:3000](http://localhost:3000). Desde `/login` puedes crear una cuenta si el proyecto Supabase permite registros y tiene configuradas sus URL de redirección.

## 4. Activar Integraciones Opcionales

- OpenAI o Gemini: generación de contenido y herramientas de IA.
- Instagram/Meta: conexión, sincronización y publicación con una aplicación autorizada.
- Stripe: suscripciones, checkout y webhook de facturación.

Las variables necesarias están documentadas como marcadores en `.env.example`. Cada credencial pertenece al proyecto externo que la emitió; tener el código no concede acceso automático a esos servicios.

## 5. Comprobar Antes De Continuar

```bash
npm run check
```

No subas `.env.local`. En Railway u otro proveedor, configura las variables desde el panel del servicio y añade la URL pública a las URL permitidas de Supabase, Meta y Stripe según corresponda.

La guía técnica ampliada está en [SETUP.md](SETUP.md) y la configuración específica de Instagram en [INSTAGRAM_SETUP.md](INSTAGRAM_SETUP.md).
