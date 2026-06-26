# WIA Instagram Growth OS — Setup Guide

## 1. Supabase (base de datos + auth)

1. Crea un proyecto gratis en [supabase.com](https://supabase.com)
2. Ve a **SQL Editor** → pega y ejecuta `supabase/schema.sql`
3. Ve a **Settings → API** y copia:
   - Project URL
   - `anon` public key

## 2. OpenAI (IA real)

1. Crea una API key en [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

## 3. Configurar .env.local

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
OPENAI_API_KEY=sk-...
```

## 4. Arrancar

```bash
npm run dev
```

Alternativa compatible con Windows y macOS, instalando dependencias si faltan:

```bash
npm run dev:local
```

Abre http://localhost:3000 → crea tu cuenta → empieza a usar datos reales.

## Qué es real ahora

| Feature | Fuente |
|---------|--------|
| Leads, analíticas, seguidores | Supabase (tu cuenta) |
| Configuración de marca | Supabase |
| Calendario, guiones, stories | OpenAI + guardado en Supabase |
| Analizador de ganchos, hashtags | OpenAI en tiempo real |
| Engagement diario | OpenAI genera plan + guardas progreso |
| Competidores | OpenAI analiza + guardas en DB |

## Nota sobre Instagram

Los datos de Instagram (seguidores, métricas) los introduces **manualmente** desde Instagram Insights. La conexión directa con Instagram API requiere cuenta Business + aprobación de Meta.
