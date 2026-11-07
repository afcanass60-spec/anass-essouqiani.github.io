import type { NextConfig } from "next";

/*
 * STATIC_EXPORT=1 : version statique de démonstration (GitHub Pages), sans routes
 * serveur — les fonctions IA s'affichent alors comme « non connectées ».
 * Voir scripts/build-static.mjs.
 */
const isStatic = process.env.STATIC_EXPORT === "1";
const basePath = process.env.STATIC_BASE_PATH ?? "";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  // Le micro est nécessaire au Speaking Studio et à la conversation vocale.
  { key: "Permissions-Policy", value: "microphone=(self), camera=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  ...(isStatic
    ? { output: "export", basePath, trailingSlash: true, images: { unoptimized: true }, env: { NEXT_PUBLIC_BASE_PATH: basePath, NEXT_PUBLIC_STATIC: "1" } }
    : {
        async headers() {
          return [{ source: "/:path*", headers: securityHeaders }];
        },
      }),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
