# Conectar Instagram (métricas reales)

Importa **seguidores** y **métricas de posts** desde Instagram. Solo lectura — no publica ni hace follow/unfollow.

## Requisitos previos

1. Cuenta **Instagram Business** o **Creator**
2. **Página de Facebook** vinculada a esa cuenta
3. Cuenta en https://developers.facebook.com

---

## Paso 1 — Crear app en Meta

1. https://developers.facebook.com → **My Apps** → **Create App**
2. Tipo: **Business** (o Other)
3. Nombre: `WIA Social`
4. Añade producto **Instagram** → **Instagram API setup with Facebook login**

---

## Paso 2 — Configurar OAuth

En **App settings** → **Basic**:
- Copia **App ID** y **App Secret**

En **Facebook Login** → **Settings**:
- **Valid OAuth Redirect URIs** — añade:

```
https://wiasocial-production.up.railway.app/api/instagram/callback
http://localhost:3000/api/instagram/callback
```

En **App Mode**: empieza en **Development**. Añade tu cuenta como **Tester** en Roles.

---

## Paso 3 — Permisos Instagram

En Instagram API setup, solicita:
- `instagram_basic`
- `instagram_manage_insights`
- `pages_show_list`
- `pages_read_engagement`

En Development mode funcionan con cuentas tester sin revisión de Meta.

---

## Paso 4 — Variables de entorno

En **Railway** y `.env.local`:

```env
META_APP_ID=tu_app_id
META_APP_SECRET=tu_app_secret
NEXT_PUBLIC_META_APP_ID=tu_app_id
NEXT_PUBLIC_APP_URL=https://wiasocial-production.up.railway.app
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

`SUPABASE_SERVICE_ROLE_KEY` está en Supabase → Settings → API → `service_role` (secreta).

---

## Paso 5 — SQL en Supabase

Ejecuta `supabase/instagram-migration.sql` en SQL Editor.

---

## Paso 6 — Conectar en la app

1. **Ajustes** → **Conectar Instagram**
2. Inicia sesión con Facebook
3. Elige la página vinculada a tu Instagram
4. **Sincronizar métricas**

Los datos aparecen en **Growth Tracker**, **Analytics** y **Centro de Datos Instagram** (`/instagram-data`).

### SQL adicional (datos completos)

Ejecuta también `supabase/instagram-full-data-migration.sql` para perfil, comentarios, insights y stories.

---

## Notas

- Los tokens duran ~60 días; reconecta si expiran
- Insights pueden tardar en estar disponibles en posts recientes
- Para producción pública, Meta puede pedir **App Review**
