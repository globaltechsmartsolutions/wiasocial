import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "WIA Social — AI-Powered Instagram Growth OS",
    template: "%s — WIA Social",
  },
  description:
    "The all-in-one platform for creators and agencies that want to grow on Instagram with AI content, lead management, analytics, and personalized strategies.",
  metadataBase: new URL("https://wiasocial-production.up.railway.app"),
  openGraph: {
    title: "WIA Social — AI-Powered Instagram Growth OS",
    description:
      "The all-in-one platform for creators and agencies that want to grow on Instagram.",
    url: "https://wiasocial-production.up.railway.app",
    siteName: "WIA Social",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WIA Social — AI-Powered Instagram Growth OS",
    description:
      "The all-in-one platform for creators and agencies that want to grow on Instagram.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>{children}</body>
    </html>
  );
}
