# Setup en la portátil

1. **Clona o copia el proyecto** (si usas Git: `git pull` en la carpeta del proyecto).

2. **Crea `.env.local`** en la raíz del proyecto (misma carpeta que `package.json`) con **exactamente dos líneas**:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
   ```
   Sustituye por los valores de tu proyecto en Supabase (Dashboard → Settings → API).  
   Cada variable en **su propia línea**, sin espacios alrededor del `=`.

3. **Instala y arranca:**
   ```bash
   npm install
   npm run dev
   ```

4. Abre el navegador en **http://localhost:3000**.

Si ves el error de "Faltan NEXT_PUBLIC_SUPABASE_URL...", comprueba que `.env.local` tenga las dos líneas, guarda el archivo, cierra el servidor (Ctrl+C) y ejecuta otra vez `npm run dev`.
