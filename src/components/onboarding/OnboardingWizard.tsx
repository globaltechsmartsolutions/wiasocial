"use client";

import { useState } from "react";
import { Zap, Instagram, Sparkles, ArrowRight, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";

const STEPS = [
  {
    id: "welcome",
    icon: Zap,
    title: "Bienvenido a WIA Social",
    desc: "Tu OS de crecimiento en Instagram. En 3 pasos tendrás todo listo para que la IA trabaje para ti.",
    cta: "Empezar →",
    href: null,
  },
  {
    id: "brand",
    icon: Sparkles,
    title: "Define tu marca",
    desc: "Configura tu nicho, audiencia y oferta para que la IA genere contenido personalizado, no genérico.",
    cta: "Configurar perfil",
    href: "/settings",
  },
  {
    id: "instagram",
    icon: Instagram,
    title: "Conecta Instagram",
    desc: "Importa tus métricas reales para que WIA analice tu cuenta y te dé estrategias basadas en datos.",
    cta: "Conectar Instagram",
    href: "/instagram-data",
  },
  {
    id: "generate",
    icon: Sparkles,
    title: "Genera tu primer contenido",
    desc: "Prueba el Generador IA. Crea ganchos, guiones y captions virales en segundos.",
    cta: "Generar contenido",
    href: "/content-generator",
  },
];

const STORAGE_KEY = "wia:onboarding-dismissed";

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    // Force re-render by dispatching storage event
    window.dispatchEvent(new Event("storage"));
  };

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  const handleCta = () => {
    if (current.href) {
      handleDismiss();
      router.push(current.href);
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl">
        <button
          onClick={handleDismiss}
          className="absolute right-4 top-4 text-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-8 space-y-6">
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-lime" : i < step ? "w-3 bg-lime/40" : "w-3 bg-surface-elevated"}`}
              />
            ))}
          </div>

          {/* Icon */}
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-lime">
              <Icon className="h-8 w-8 text-black" />
            </div>
          </div>

          {/* Content */}
          <div className="text-center space-y-2">
            <h2 className="text-xl font-black text-foreground">{current.title}</h2>
            <p className="text-sm text-muted leading-relaxed">{current.desc}</p>
          </div>

          {/* Steps summary */}
          {step === 0 && (
            <div className="space-y-2">
              {STEPS.slice(1).map((s, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg bg-surface-elevated px-3 py-2">
                  <CheckCircle2 className="h-4 w-4 text-muted shrink-0" />
                  <span className="text-sm text-muted">{s.title}</span>
                </div>
              ))}
            </div>
          )}

          {/* CTA */}
          <div className="flex flex-col gap-2">
            <Button className="w-full" onClick={handleCta}>
              <ArrowRight className="h-4 w-4" />
              {current.cta}
            </Button>
            {step > 0 && (
              <Button variant="ghost" className="w-full text-muted text-sm" onClick={handleDismiss}>
                Saltar configuración
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function useOnboarding() {
  if (typeof window === "undefined") return false;
  return !localStorage.getItem(STORAGE_KEY);
}
