"use client";

import { useState } from "react";
import { X, Zap, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { getSupabase } from "@/lib/supabase";

interface UpgradeModalProps {
  used: number;
  limit: number;
  onClose: () => void;
}

async function getToken() {
  const { data: { session } } = await getSupabase().auth.getSession();
  return session?.access_token ?? null;
}

export function UpgradeModal({ used, limit, onClose }: UpgradeModalProps) {
  const { locale } = useTranslation();
  const es = locale === "es";
  const pct = Math.min((used / limit) * 100, 100);
  const [loading, setLoading] = useState<"starter" | "agency" | null>(null);

  const handleUpgrade = async (plan: "starter" | "agency") => {
    setLoading(plan);
    try {
      const token = await getToken();
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Error al crear sesión de pago");
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-lime">
              <Zap className="h-5 w-5 text-black" />
            </div>
            <div>
              <p className="font-bold text-foreground">
                {es ? "Límite de generaciones alcanzado" : "AI generation limit reached"}
              </p>
              <p className="text-xs text-muted">
                {es ? "Plan gratuito · 5 generaciones/mes" : "Free plan · 5 generations/month"}
              </p>
            </div>
          </div>

          {/* Usage bar */}
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted">{es ? "Generaciones usadas" : "Generations used"}</span>
              <span className="font-bold text-red-400">{used}/{limit}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-surface-elevated overflow-hidden">
              <div className="h-full rounded-full bg-red-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* Plans */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {/* Starter */}
            <div className="rounded-xl border border-lime/30 bg-lime/5 p-4">
              <p className="font-bold text-foreground mb-1">Starter</p>
              <p className="text-2xl font-black text-lime mb-3">29€<span className="text-sm font-normal text-muted">/mes</span></p>
              <ul className="space-y-1.5 mb-4">
                {[
                  es ? "IA ilimitada" : "Unlimited AI",
                  es ? "Radar semanal" : "Weekly radar",
                  es ? "Detector tendencias" : "Trend detector",
                  es ? "Informes mensuales" : "Monthly reports",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-1.5 text-xs text-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-lime shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full text-sm"
                onClick={() => handleUpgrade("starter")}
                disabled={!!loading}
              >
                {loading === "starter" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                {es ? "Empezar" : "Get started"}
              </Button>
            </div>

            {/* Agency */}
            <div className="rounded-xl border border-border bg-surface-elevated p-4">
              <p className="font-bold text-foreground mb-1">Agency</p>
              <p className="text-2xl font-black text-foreground mb-3">79€<span className="text-sm font-normal text-muted">/mes</span></p>
              <ul className="space-y-1.5 mb-4">
                {[
                  es ? "Todo Starter" : "Everything Starter",
                  es ? "CRM multi-cliente" : "Multi-client CRM",
                  es ? "Webhooks" : "Webhooks",
                  es ? "Soporte dedicado" : "Dedicated support",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-1.5 text-xs text-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-muted shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                variant="secondary"
                className="w-full text-sm"
                onClick={() => handleUpgrade("agency")}
                disabled={!!loading}
              >
                {loading === "agency" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {es ? "Empezar" : "Get started"}
              </Button>
            </div>
          </div>

          <Button variant="ghost" className="w-full text-muted text-sm" onClick={onClose}>
            {es ? "Continuar con plan gratuito" : "Continue with free plan"}
          </Button>
        </div>
      </div>
    </div>
  );
}
