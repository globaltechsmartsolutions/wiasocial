# Conectar Instagram — Continuar con Instagram

Login directo con Instagram (sin Facebook). Solo lectura — importa perfil, posts, insights y comentarios.

## Requisitos del cliente

1. Cuenta **Instagram Business** o **Creator** (gratis en ajustes de Instagram)
2. **No hace falta** página de Facebook

---

## Paso 1 — App en Meta Developers

1. https://developers.facebook.com → **Create App** → tipo **Business**
2. Nombre: `WIA Social`
3. Añade producto **Instagram** → **API setup with Instagram login**

---

## Paso 2 — Business Login (Instagram)

En **Instagram → API setup with Instagram login → Set up Instagram business login**:

**OAuth Redirect URIs** — añade exactamente:
```
https://wiasocial-production.up.railway.app/api/instagram/callback
http://localhost:3000/api/instagram/callback
```

Copia de **Business login settings**:
- **Instagram App ID**
- **Instagram App Secret**

(Pueden ser distintos del App ID general de Meta.)

---

## Paso 3 — Permisos

Solicita en App Review (o Development con testers):
- `instagram_business_basic`
- `instagram_business_manage_insights`
- `instagram_business_manage_comments`

---

## Paso 4 — Variables en Railway

```env
INSTAGRAM_APP_ID=tu_instagram_app_id
INSTAGRAM_APP_SECRET=tu_instagram_app_secret
NEXT_PUBLIC_INSTAGRAM_APP_ID=tu_instagram_app_id
NEXT_PUBLIC_APP_URL=https://wiasocial-production.up.railway.app
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

También válido (fallback): `META_APP_ID` / `META_APP_SECRET` / `NEXT_PUBLIC_META_APP_ID`

---

## Paso 5 — SQL en Supabase

Ejecuta (o `npm run migrate:instagram` con `SUPABASE_DB_PASSWORD` en `.env.local`):
1. `supabase/instagram-migration.sql`
2. `supabase/instagram-full-data-migration.sql`

---

## Paso 6 — Experiencia del cliente

1. Registro en WIA Social
2. **Continuar con Instagram** (un clic)
3. Login con usuario/contraseña de Instagram
4. Autorizar → datos sincronizados automáticamente

---

## Producción (todos los clientes)

1. **Business Verification** en Meta
2. **App Review** → modo **Live**
3. Privacy Policy URL en la app (requerido por Meta)

---

## Notas

- Tokens duran ~60 días; reconectar si expiran
- Cuentas personales (no Business/Creator) no funcionan
- DMs requieren permiso adicional + App Review
