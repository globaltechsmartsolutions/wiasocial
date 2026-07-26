import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "WIA Social — Instagram Growth OS con IA",
    template: "%s — WIA Social",
  },
  description:
    "La plataforma todo-en-uno para creadores y agencias que quieren crecer en Instagram. Generación de contenido IA, CRM de leads, análisis de métricas y estrategias personalizadas.",
  metadataBase: new URL("https://wiasocial-production.up.railway.app"),
  openGraph: {
    title: "WIA Social — Instagram Growth OS con IA",
    description:
      "La plataforma todo-en-uno para creadores y agencias que quieren crecer en Instagram.",
    url: "https://wiasocial-production.up.railway.app",
    siteName: "WIA Social",
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WIA Social — Instagram Growth OS con IA",
    description:
      "La plataforma todo-en-uno para creadores y agencias que quieren crecer en Instagram.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon", type: "image/png", sizes: "32x32" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-icon", type: "image/png", sizes: "180x180" }],
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>{children}</body>
    </html>
  );
}
