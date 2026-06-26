# Guía paso a paso (sin conocimientos técnicos)

## PARTE 1 — Conectar Supabase (15 minutos)

### Paso 1: Abre Supabase
1. Ve a https://supabase.com/dashboard
2. Entra en **tu proyecto**

### Paso 2: Crea las tablas
1. Menú izquierdo → **SQL Editor**
2. Clic en **New query**
3. En tu Mac, abre el archivo `supabase/schema.sql` de este proyecto
4. Copia **todo** el contenido (Cmd+A, Cmd+C)
5. Pégalo en Supabase (Cmd+V)
6. Clic en **Run** (abajo a la derecha)
7. Debe decir "Success"

### Paso 3: Copia tus claves
1. Menú izquierdo → **Project Settings** (engranaje)
2. Clic en **API**
3. Copia estos dos valores (botón copiar al lado):
   - **Project URL** → algo como `https://abcdefgh.supabase.co`
   - **anon public** → empieza por `eyJ...`

### Paso 4: Pega las claves en el proyecto
1. En tu Mac, abre la carpeta `wia-instagram-growth-os` en el Escritorio
2. Abre el archivo `.env.local` con TextEdit o Cursor
3. Sustituye las líneas por tus datos reales:

```
NEXT_PUBLIC_SUPABASE_URL=https://TU-URL-AQUI.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...TU-KEY-AQUI
OPENAI_API_KEY=your_openai_api_key
```

4. Guarda el archivo (Cmd+S)

### Paso 5: Arranca la app
1. Abre **Terminal** en Mac o **PowerShell** en Windows
2. Pega esto y pulsa Enter:

```bash
cd RUTA-DE-TU-PROYECTO
npm run dev
```

3. Abre el navegador en: **http://localhost:3000**
4. Crea tu cuenta (email + contraseña)
5. ¡Listo! Ya funciona en tu ordenador.

---

## PARTE 2 — Subir a Railway (opcional, cuando quieras estar online)

### Paso A: Subir código a GitHub

1. Ve a https://github.com/new
2. Nombre del repo: `wia-instagram-growth-os`
3. Deja todo en **Private** si quieres
4. **No** marques "Add README"
5. Clic **Create repository**

6. En Terminal, pega esto (cambia TU-USUARIO por tu usuario de GitHub):

```bash
cd ~/Desktop/wia-instagram-growth-os
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/wia-instagram-growth-os.git
git push -u origin main
```

(GitHub te pedirá usuario y contraseña o token)

### Paso B: Conectar Railway

1. Ve a https://railway.app
2. **New Project** → **Deploy from GitHub repo**
3. Elige `wia-instagram-growth-os`
4. Espera que empiece a construir

### Paso C: Variables en Railway

1. Clic en tu servicio (el recuadro del proyecto)
2. Pestaña **Variables**
3. Añade las mismas 3 que en `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY`
4. Railway redesplegará solo

### Paso D: URL pública

1. Pestaña **Settings** → **Networking** → **Generate Domain**
2. Copia la URL (ej: `https://wia-instagram.up.railway.app`)

### Paso E: Permitir login en Supabase

1. Supabase → **Authentication** → **URL Configuration**
2. **Site URL:** pega tu URL de Railway
3. **Redirect URLs:** añade `https://tu-url.up.railway.app/**`
4. Guarda

---

## ¿Necesitas ayuda?

Dime en qué paso estás atascado (1, 2, 3...) y te guío.
