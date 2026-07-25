"use client";

import { useEffect, useState } from "react";
import { Zap, CheckCircle2, Loader2, Crown, Sparkles, ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { getSupabase } from "@/lib/supabase";

async function getToken() {
  const { data: { session } } = await getSupabase().auth.getSession();
  return session?.access_token ?? null;
}

type Plan = "free" | "starter" | "agency";

interface StripeStatus {
  plan: Plan;
  hasSubscription: boolean;
}

const PLANS = [
  {
    key: "free" as Plan,
    name: "Free",
    price: 0,
    period: "",
    icon: Sparkles,
    color: "border-border",
    badge: null,
    features: [
      "5 generaciones IA / mes",
      "Generador de contenido",
      "Guiones de Reels",
      "Hashtags",
      "CRM básico",
    ],
    cta: null,
  },
  {
    key: "starter" as Plan,
    name: "Starter",
    price: 29,
    period: "/mes",
    icon: Zap,
    color: "border-lime/40",
    badge: "Más popular",
    features: [
      "IA ilimitada",
      "Radar de crecimiento semanal",
      "Detector de tendencias",
      "Informes mensuales automáticos",
      "Mejores horarios de publicación",
      "Soporte prioritario",
    ],
    cta: "starter",
  },
  {
    key: "agency" as Plan,
    name: "Agency",
    price: 79,
    period: "/mes",
    icon: Crown,
    color: "border-amber-500/40",
    badge: "Para agencias",
    features: [
      "Todo lo de Starter",
      "CRM multi-cliente ilimitado",
      "Webhooks personalizados",
      "Acceso anticipado a nuevas funciones",
      "Soporte dedicado",
      "Facturación personalizada",
    ],
    cta: "agency",
  },
];

export default function UpgradePage() {
  const { locale } = useTranslation();
  const es = locale === "es";
  const [status, setStatus] = useState<StripeStatus | null>(null);
  const [loading, setLoading] = useState<"starter" | "agency" | "portal" | null>(null);
  const [aiUsage, setAiUsage] = useState<{ used: number; limit: number } | null>(null);

  useEffect(() => {
    async function load() {
      const token = await getToken();
      if (!token) return;
      const [stripeRes, usageRes] = await Promise.all([
        fetch("/api/stripe/status", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/ai-usage", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (stripeRes.ok) setStatus(await stripeRes.json());
      if (usageRes.ok) setAiUsage(await usageRes.json());
    }
    load();
  }, []);

  const handleCheckout = async (plan: "starter" | "agency") => {
    setLoading(plan);
    try {
      const token = await getToken();
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(null);
    }
  };

  const handlePortal = async () => {
    setLoading("portal");
    try {
      const token = await getToken();
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(null);
    }
  };

  const currentPlan = status?.plan ?? "free";

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-lime/10 border border-lime/20 px-4 py-1.5 text-sm text-lime font-medium">
          <Zap className="h-4 w-4" />
          {es ? "Planes y precios" : "Plans & Pricing"}
        </div>
        <h1 className="text-3xl font-black text-foreground">
          {es ? "Escala tu crecimiento en Instagram" : "Scale your Instagram growth"}
        </h1>
        <p className="text-muted max-w-xl mx-auto">
          {es
            ? "Elige el plan que mejor se adapta a tu negocio. Sin permanencia, cancela cuando quieras."
            : "Choose the plan that fits your business. No lock-in, cancel anytime."}
        </p>
      </div>

      {/* AI usage bar (free plan) */}
      {currentPlan === "free" && aiUsage && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5 text-sm">
              <span className="text-muted">{es ? "Generaciones IA este mes" : "AI generations this month"}</span>
              <span className={`font-bold ${aiUsage.used >= aiUsage.limit ? "text-red-400" : "text-amber-400"}`}>
                {aiUsage.used}/{aiUsage.limit}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-surface-elevated overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${aiUsage.used >= aiUsage.limit ? "bg-red-500" : "bg-amber-400"}`}
                style={{ width: `${Math.min((aiUsage.used / aiUsage.limit) * 100, 100)}%` }}
              />
            </div>
          </div>
          {aiUsage.used >= aiUsage.limit && (
            <span className="text-xs text-red-400 font-medium whitespace-nowrap">
              {es ? "Límite alcanzado" : "Limit reached"}
            </span>
          )}
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const isCurrent = currentPlan === plan.key;
          const isPopular = plan.badge === "Más popular";

          return (
            <div
              key={plan.key}
              className={`relative rounded-2xl border ${plan.color} bg-surface p-6 flex flex-col gap-5 ${isPopular ? "shadow-lg shadow-lime/10" : ""}`}
            >
              {plan.badge && (
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold ${isPopular ? "bg-lime text-black" : "bg-amber-500 text-black"}`}>
                  {plan.badge}
                </div>
              )}

              {isCurrent && (
                <Badge className="absolute top-4 right-4 bg-lime/20 text-lime border-lime/30 text-xs">
                  {es ? "Plan actual" : "Current plan"}
                </Badge>
              )}

              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isPopular ? "gradient-lime" : "bg-surface-elevated"}`}>
                  <Icon className={`h-5 w-5 ${isPopular ? "text-black" : "text-foreground"}`} />
                </div>
                <div>
                  <p className="font-bold text-foreground">{plan.name}</p>
                  <div className="flex items-baseline gap-1">
                    {plan.price === 0 ? (
                      <span className="text-xl font-black text-muted">{es ? "Gratis" : "Free"}</span>
                    ) : (
                      <>
                        <span className="text-2xl font-black text-foreground">{plan.price}€</span>
                        <span className="text-sm text-muted">{plan.period}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <ul className="space-y-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle2 className={`h-4 w-4 shrink-0 mt-0.5 ${isPopular ? "text-lime" : "text-muted"}`} />
                    {f}
                  </li>
                ))}
              </ul>

              {plan.cta ? (
                isCurrent ? (
                  <Button variant="secondary" className="w-full" onClick={handlePortal} disabled={loading === "portal"}>
                    {loading === "portal" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                    {es ? "Gestionar suscripción" : "Manage subscription"}
                  </Button>
                ) : (
                  <Button
                    className={`w-full ${!isPopular ? "bg-surface-elevated text-foreground hover:bg-surface-elevated/80" : ""}`}
                    onClick={() => handleCheckout(plan.cta as "starter" | "agency")}
                    disabled={!!loading}
                  >
                    {loading === plan.cta ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                    {es ? "Empezar ahora" : "Get started"}
                  </Button>
                )
              ) : (
                <Button variant="secondary" className="w-full opacity-50 cursor-default" disabled>
                  {es ? "Plan actual" : "Current plan"}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* FAQ */}
      <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
        <h2 className="font-bold text-foreground">{es ? "Preguntas frecuentes" : "FAQ"}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {[
            {
              q: es ? "¿Puedo cancelar en cualquier momento?" : "Can I cancel anytime?",
              a: es ? "Sí, sin penalización. Tu plan sigue activo hasta el final del período pagado." : "Yes, no penalties. Your plan stays active until the end of the paid period.",
            },
            {
              q: es ? "¿Qué pasa si supero el límite gratuito?" : "What happens if I exceed the free limit?",
              a: es ? "Verás un modal para actualizar tu plan. Tus datos y configuración se conservan siempre." : "You'll see an upgrade modal. Your data and settings are always preserved.",
            },
            {
              q: es ? "¿Hay contrato de permanencia?" : "Is there a contract?",
              a: es ? "No. Los planes son mensuales y puedes cambiar o cancelar cuando quieras." : "No. Plans are monthly and you can change or cancel whenever you want.",
            },
            {
              q: es ? "¿Qué métodos de pago aceptáis?" : "What payment methods do you accept?",
              a: es ? "Tarjeta de crédito/débito, Apple Pay y Google Pay a través de Stripe." : "Credit/debit card, Apple Pay, and Google Pay via Stripe.",
            },
          ].map(({ q, a }) => (
            <div key={q} className="space-y-1">
              <p className="font-semibold text-foreground">{q}</p>
              <p className="text-muted">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
