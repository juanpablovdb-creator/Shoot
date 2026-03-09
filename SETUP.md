# Configuración del proyecto Shoot

## 1. Conectar con GitHub

Si ya creaste el repositorio en GitHub, desde la carpeta del proyecto ejecuta:

```bash
# Añade tu repositorio como remote (reemplaza USER/REPO por tu usuario y nombre del repo)
git remote add origin https://github.com/USER/REPO.git

# Opcional: usar rama main en lugar de master
git branch -M main

# Sube el código
git push -u origin main
```

Si usas SSH:
```bash
git remote add origin git@github.com:USER/REPO.git
git push -u origin main
```

## 2. Variables de entorno (Supabase)

1. Copia el archivo de ejemplo:
   ```bash
   copy .env.local.example .env.local
   ```
   (En PowerShell: `Copy-Item .env.local.example .env.local`)

2. En el [Dashboard de Supabase](https://supabase.com/dashboard) → tu proyecto → **Settings** → **API**:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** (clave pública) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. Pega esos valores en `.env.local`. No subas `.env.local` a GitHub (ya está en .gitignore).

## 3. Instalar dependencias

```bash
npm install
```

Las dependencias del stack (Supabase, dnd-kit, Zustand, TanStack Query, shadcn/ui) están en `package.json`. Si añades shadcn después:

```bash
npx shadcn@latest init
```

## 4. Arrancar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).
