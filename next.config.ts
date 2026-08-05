import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

const scriptSources = isProduction
  ? "'self' 'unsafe-inline'"
  : "'self' 'unsafe-inline' 'unsafe-eval'";

// Solo en desarrollo: permite apuntar el navegador a un Supabase local
// (`supabase start`), que sirve por http en 127.0.0.1. En producción la
// política sigue admitiendo únicamente https://*.supabase.co.
const localSupabaseSources = isProduction
  ? ""
  : " http://127.0.0.1:* http://localhost:* ws://127.0.0.1:* ws://localhost:*";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: false,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; script-src ${scriptSources}; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://*.instagram.com https://*.facebook.com https://graph.instagram.com https://graph.facebook.com${localSupabaseSources}; frame-src 'self' https://www.instagram.com https://www.facebook.com; frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self';`,
          },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
