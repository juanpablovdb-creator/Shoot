import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Evita inyectar el indicador/portal de devtools en pantalla durante desarrollo.
  // (Sigue mostrando errores y overlays cuando existen.)
  devIndicators: false,
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    // Service role solo en servidor (API routes); no se expone al cliente
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
};

export default nextConfig;
