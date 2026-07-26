import Link from "next/link";
import { Zap, Instagram, Sparkles, TrendingUp, Users, BarChart3, CheckCircle2, ArrowRight, Star } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WIA Social — Instagram Growth OS con IA",
  description:
    "La plataforma todo-en-uno para creadores y agencias que quieren crecer en Instagram de forma real y sostenible. Generación de contenido IA, CRM de leads, análisis de métricas y más.",
  openGraph: {
    title: "WIA Social — Instagram Growth OS con IA",
    description:
      "La plataforma todo-en-uno para creadores y agencias que quieren crecer en Instagram. Generación de contenido IA, CRM de leads, análisis de métricas.",
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
};

const FEATURES = [
  {
    icon: Sparkles,
    title: "Generador de contenido IA",
    desc: "Ganchos virales, guiones de Reels, captions, carruseles y stories generados por IA en segundos.",
  },
  {
    icon: TrendingUp,
    title: "Radar de crecimiento semanal",
    desc: "Análisis automático de tu cuenta con estrategias de crecimiento personalizadas basadas en tus métricas reales.",
  },
  {
    icon: Users,
    title: "CRM de leads integrado",
    desc: "Gestiona prospectos, clientes y seguimientos desde un solo lugar. Nunca pierdas una oportunidad.",
  },
  {
    icon: BarChart3,
    title: "Análisis y métricas",
    desc: "Conecta tu Instagram y obtén insights accionables sobre engagement, mejores horarios y tendencias.",
  },
  {
    icon: Instagram,
    title: "Auditoría de perfil",
    desc: "Análisis completo de tu perfil con recomendaciones concretas para aumentar tu alcance y conversión.",
  },
  {
    icon: Zap,
    title: "AI Coach personalizado",
    desc: "Tu asistente IA disponible 24/7 para responder preguntas, idear estrategias y acelerar tu crecimiento.",
  },
];

const PLANS = [
  {
    name: "Free",
    price: "0€",
    period: "",
    desc: "Para empezar",
    features: ["5 generaciones IA / mes", "Generador de contenido", "Guiones de Reels", "Hashtags", "CRM básico"],
    cta: "Empezar gratis",
    href: "/login",
    highlight: false,
  },
  {
    name: "Starter",
    price: "29€",
    period: "/mes",
    desc: "Para creadores serios",
    badge: "Más popular",
    features: [
      "IA ilimitada",
      "Radar de crecimiento semanal",
      "Detector de tendencias",
      "Informes mensuales automáticos",
      "Mejores horarios de publicación",
      "Soporte prioritario",
    ],
    cta: "Comenzar ahora",
    href: "/login",
    highlight: true,
  },
  {
    name: "Agency",
    price: "79€",
    period: "/mes",
    desc: "Para agencias y equipos",
    features: [
      "Todo lo de Starter",
      "CRM multi-cliente ilimitado",
      "Webhooks personalizados",
      "Acceso anticipado a nuevas funciones",
      "Soporte dedicado",
      "Facturación personalizada",
    ],
    cta: "Contactar",
    href: "/login",
    highlight: false,
  },
];

const TESTIMONIALS = [
  {
    name: "María García",
    handle: "@mariafit.ig",
    text: "Pasé de 2k a 18k seguidores en 4 meses usando WIA. Los guiones de Reels son una pasada.",
    stars: 5,
  },
  {
    name: "Carlos Ruiz",
    handle: "@carlosdigital",
    text: "Como agencia, WIA nos ha ahorrado horas de trabajo. El CRM y los reportes automáticos son top.",
    stars: 5,
  },
  {
    name: "Laura Sánchez",
    handle: "@lauracoach",
    text: "Por fin una herramienta que entiende Instagram de verdad. El radar semanal es brutal.",
    stars: 5,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-lime">
              <Zap className="h-4 w-4 text-black" />
            </div>
            <span className="font-bold text-foreground">WIA Social</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="#pricing" className="hidden text-sm text-muted hover:text-foreground sm:block">
              Precios
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-elevated transition-colors"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/login"
              className="rounded-lg gradient-lime px-4 py-2 text-sm font-bold text-black hover:opacity-90 transition-opacity"
            >
              Empezar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-24 text-center">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-lime/30 bg-lime/10 px-4 py-1.5">
          <Zap className="h-3.5 w-3.5 text-lime" />
          <span className="text-xs font-medium text-lime">Powered by GPT-4o</span>
        </div>
        <h1 className="mx-auto max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
          Crece en Instagram con{" "}
          <span className="text-gradient-lime">inteligencia artificial</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted leading-relaxed">
          WIA Social es el sistema operativo para creadores y agencias que quieren
          resultados reales en Instagram. Contenido IA, métricas reales, CRM de leads
          y estrategias personalizadas en una sola plataforma.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/login"
            className="flex items-center gap-2 rounded-xl gradient-lime px-8 py-4 text-base font-bold text-black hover:opacity-90 transition-opacity"
          >
            Empieza gratis hoy
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="#features"
            className="flex items-center gap-2 rounded-xl border border-border bg-surface px-8 py-4 text-base font-medium text-foreground hover:bg-surface-elevated transition-colors"
          >
            Ver funcionalidades
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted">Sin tarjeta de crédito · 5 generaciones gratis</p>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-20">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-black sm:text-4xl">Todo lo que necesitas para crecer</h2>
          <p className="mt-3 text-muted">Un sistema completo para dominar Instagram</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border bg-surface p-6 hover:border-lime/30 transition-colors"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-lime/10">
                <f.icon className="h-5 w-5 text-lime" />
              </div>
              <h3 className="mb-2 font-bold text-foreground">{f.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-4 py-20">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-black sm:text-4xl">Planes simples y transparentes</h2>
          <p className="mt-3 text-muted">Empieza gratis, escala cuando estés listo</p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-8 ${
                plan.highlight
                  ? "border-lime/40 bg-lime/5 shadow-xl shadow-lime/5"
                  : "border-border bg-surface"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full gradient-lime px-4 py-1 text-xs font-bold text-black">
                    {plan.badge}
                  </span>
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                <p className="text-sm text-muted">{plan.desc}</p>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-foreground">{plan.price}</span>
                  <span className="text-muted">{plan.period}</span>
                </div>
              </div>
              <ul className="mb-8 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-lime" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.href}
                className={`block w-full rounded-xl py-3 text-center text-sm font-bold transition-opacity hover:opacity-90 ${
                  plan.highlight
                    ? "gradient-lime text-black"
                    : "border border-border bg-surface-elevated text-foreground"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-black sm:text-4xl">Lo que dicen nuestros usuarios</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="rounded-xl border border-border bg-surface p-6">
              <div className="mb-3 flex gap-1">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-lime text-lime" />
                ))}
              </div>
              <p className="mb-4 text-sm text-muted leading-relaxed">&ldquo;{t.text}&rdquo;</p>
              <div>
                <p className="text-sm font-semibold text-foreground">{t.name}</p>
                <p className="text-xs text-lime">{t.handle}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center">
        <div className="rounded-2xl border border-lime/20 bg-lime/5 p-12">
          <h2 className="text-3xl font-black sm:text-4xl">
            Empieza a crecer en Instagram hoy
          </h2>
          <p className="mt-4 text-muted">
            Únete a creadores y agencias que ya están usando WIA Social para crecer más rápido.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex items-center gap-2 rounded-xl gradient-lime px-8 py-4 text-base font-bold text-black hover:opacity-90 transition-opacity"
          >
            Crear cuenta gratis
            <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="mt-3 text-xs text-muted">Sin tarjeta de crédito requerida</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-lime">
                <Zap className="h-3.5 w-3.5 text-black" />
              </div>
              <span className="text-sm font-bold text-foreground">WIA Social</span>
            </div>
            <div className="flex gap-6 text-sm text-muted">
              <Link href="/privacy" className="hover:text-foreground">Privacidad</Link>
              <Link href="/terms" className="hover:text-foreground">Términos</Link>
              <Link href="/login" className="hover:text-foreground">Acceder</Link>
            </div>
            <p className="text-xs text-muted">© 2026 WIA Social. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
