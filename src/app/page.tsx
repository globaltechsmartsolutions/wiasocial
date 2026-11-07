import Link from "next/link";
import { Zap, Instagram, Sparkles, TrendingUp, Users, BarChart3, CheckCircle2, ArrowRight, Star } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WIA Social — AI-Powered Instagram Growth OS",
  description:
    "The all-in-one platform for creators and agencies that want sustainable Instagram growth through AI content, lead management, and actionable analytics.",
  openGraph: {
    title: "WIA Social — AI-Powered Instagram Growth OS",
    description:
      "The all-in-one platform for creators and agencies that want to grow on Instagram with AI content, lead management, and analytics.",
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
};

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI content generator",
    desc: "Create hooks, Reel scripts, captions, carousels, and Stories tailored to your brand in seconds.",
  },
  {
    icon: TrendingUp,
    title: "Weekly growth radar",
    desc: "Analyze your account and receive personalized growth strategies based on your real performance data.",
  },
  {
    icon: Users,
    title: "Built-in lead CRM",
    desc: "Manage prospects, clients, and follow-ups in one place so no opportunity falls through the cracks.",
  },
  {
    icon: BarChart3,
    title: "Analytics and insights",
    desc: "Connect Instagram and turn engagement, publishing times, and performance signals into clear actions.",
  },
  {
    icon: Instagram,
    title: "Profile audit",
    desc: "Review your profile and get practical recommendations to improve reach, positioning, and conversion.",
  },
  {
    icon: Zap,
    title: "Personalized AI Coach",
    desc: "Get on-demand strategic guidance, campaign ideas, and clear next steps for growing your business.",
  },
];

const PLANS = [
  {
    name: "Free",
    price: "0€",
    period: "",
    desc: "For getting started",
    features: ["5 AI generations per month", "Content generator", "Reel scripts", "Hashtag ideas", "Basic CRM"],
    cta: "Start for free",
    href: "/login",
    highlight: false,
  },
  {
    name: "Starter",
    price: "29€",
    period: "/month",
    desc: "For serious creators",
    badge: "Most popular",
    features: [
      "Unlimited AI generations",
      "Weekly growth radar",
      "Content opportunity detector",
      "Automated monthly reports",
      "Best publishing times",
      "Priority support",
    ],
    cta: "Get started",
    href: "/login",
    highlight: true,
  },
  {
    name: "Agency",
    price: "79€",
    period: "/month",
    desc: "For agencies and teams",
    features: [
      "Everything in Starter",
      "Unlimited multi-client CRM",
      "Custom webhooks",
      "Early access to new features",
      "Dedicated support",
      "Custom billing",
    ],
    cta: "Contact us",
    href: "/login",
    highlight: false,
  },
];

const TESTIMONIALS = [
  {
    name: "María García",
    handle: "@mariafit.ig",
    text: "I went from 2K to 18K followers in four months using WIA. The Reel scripts have been a game changer.",
    stars: 5,
  },
  {
    name: "Carlos Ruiz",
    handle: "@carlosdigital",
    text: "As an agency, WIA saves us hours of work. The CRM and automated reports keep everything organized.",
    stars: 5,
  },
  {
    name: "Laura Sánchez",
    handle: "@lauracoach",
    text: "Finally, a tool that understands Instagram strategy. The weekly growth radar is incredibly useful.",
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
              Pricing
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-elevated transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="rounded-lg gradient-lime px-4 py-2 text-sm font-bold text-black hover:opacity-90 transition-opacity"
            >
              Start for free
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
          Grow on Instagram with{" "}
          <span className="text-gradient-lime">artificial intelligence</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted leading-relaxed">
          WIA Social is the growth operating system for creators and agencies that want
          measurable Instagram results. AI content, real analytics, lead management,
          and personalized strategies come together in one platform.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/login"
            className="flex items-center gap-2 rounded-xl gradient-lime px-8 py-4 text-base font-bold text-black hover:opacity-90 transition-opacity"
          >
            Start for free today
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="#features"
            className="flex items-center gap-2 rounded-xl border border-border bg-surface px-8 py-4 text-base font-medium text-foreground hover:bg-surface-elevated transition-colors"
          >
            Explore features
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted">No credit card required · 5 free AI generations</p>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-20">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-black sm:text-4xl">Everything you need to grow</h2>
          <p className="mt-3 text-muted">One complete system for Instagram growth</p>
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
          <h2 className="text-3xl font-black sm:text-4xl">Simple, transparent pricing</h2>
          <p className="mt-3 text-muted">Start for free and scale when you are ready</p>
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
          <h2 className="text-3xl font-black sm:text-4xl">What our users say</h2>
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
            Start growing on Instagram today
          </h2>
          <p className="mt-4 text-muted">
            Join creators and agencies using WIA Social to build a more effective growth system.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex items-center gap-2 rounded-xl gradient-lime px-8 py-4 text-base font-bold text-black hover:opacity-90 transition-opacity"
          >
            Create a free account
            <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="mt-3 text-xs text-muted">No credit card required</p>
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
              <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
              <Link href="/terms" className="hover:text-foreground">Terms</Link>
              <Link href="/login" className="hover:text-foreground">Sign in</Link>
            </div>
            <p className="text-xs text-muted">© 2026 WIA Social. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
