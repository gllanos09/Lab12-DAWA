import type { NextConfig } from "next";

// `cacheComponents` viene activado por create-next-app, pero esta aplicación
// no tiene nada que prerenderizar: todas las páginas leen datos de la base de
// datos en tiempo de ejecución y las API Routes dependen de `request.url`.
// Con la opción activada el build fallaba pidiendo <Suspense> o "use cache"
// en /authors/[id] y en /api/books/search, así que se deja desactivada.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Evita que `next dev` genere y reescriba el archivo AGENTS.md.
  agentRules: false,
};

export default nextConfig;
