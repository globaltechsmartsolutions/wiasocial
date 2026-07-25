"use client";

import { X, Zap, TrendingUp, Users, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

interface UpgradeModalProps {
  used: number;
  limit: number;
  onClose: () => void;
}

export function UpgradeModal({ used, limit, onClose }: UpgradeModalProps) {
  const { locale } = useTranslation();
  const es = locale === "es";
  const pct = Math.min((used / limit) * 100, 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl">
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
              <div
                className="h-full rounded-full bg-red-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* What you get */}
          <div className="mb-6 rounded-xl border border-lime/20 bg-lime/5 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-lime">
              {es ? "Desbloquea con el plan Pro" : "Unlock with Pro plan"}
            </p>
            {[
              { icon: Zap, label: es ? "Generaciones IA ilimitadas" : "Unlimited AI generations" },
              { icon: TrendingUp, label: es ? "Radar de crecimiento semanal" : "Weekly growth radar" },
              { icon: Users, label: es ? "CRM multi-cliente" : "Multi-client CRM" },
              { icon: FileText, label: es ? "Informes mensuales automáticos" : "Auto monthly reports" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm">
                <Icon className="h-4 w-4 text-lime shrink-0" />
                <span className="text-foreground">{label}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="space-y-2">
            <Button className="w-full" onClick={onClose}>
              <Zap className="h-4 w-4" />
              {es ? "Ver planes — desde 29€/mes" : "See plans — from €29/month"}
            </Button>
            <Button variant="ghost" className="w-full text-muted" onClick={onClose}>
              {es ? "Continuar con plan gratuito" : "Continue with free plan"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
