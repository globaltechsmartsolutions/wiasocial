"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FlaskConical,
  Lightbulb,
  Loader2,
  Radar,
  RefreshCw,
  Settings,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { useAuth } from "@/contexts/AuthContext";
import { fetchGrowthRadar, generateGrowthRadar, type GrowthRadarResponse } from "@/lib/ai-client";
import { fetchSettings } from "@/lib/db";
import type { GrowthRadarPriority, GrowthRadarReport } from "@/types/growth-radar";
import { cn, formatDate } from "@/lib/utils";

const priorityClasses: Record<GrowthRadarPriority, string> = {
  high: "bg-red-500/20 text-red-400 border-red-500/30",
  medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  low: "bg-lime/20 text-lime border-lime/30",
};

export default function GrowthRadarPage() {
  const { locale } = useTranslation();
  const { user } = useAuth();
  const [response, setResponse] = useState<GrowthRadarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brandConfigured, setBrandConfigured] = useState(true);
  const [instagramConnected, setInstagramConnected] = useState(false);
  const [manualFollowers, setManualFollowers] = useState("");
  const [manualWeeklyGain, setManualWeeklyGain] = useState("");
  const [manualEngagement, setManualEngagement] = useState("");

  const es = locale === "es";
  const report = response?.report ?? null;

  const buildManualMetrics = () => ({
    followers: manualFollowers ? Number(manualFollowers) : undefined,
    weeklyGain: manualWeeklyGain ? Number(manualWeeklyGain) : undefined,
    engagementRate: manualEngagement ? Number(manualEngagement) : undefined,
  });

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const [existing, settings] = await Promise.all([
        fetchGrowthRadar(),
        fetchSettings(user!.id),
      ]);
      const configured = Boolean(settings?.niche && settings?.targetAudience && settings?.offer);
      setBrandConfigured(configured);
      setInstagramConnected(Boolean(settings?.instagramHandle));
      if (existing.report) {
        setResponse(existing);
      } else if (configured) {
        const generated = await generateGrowthRadar(locale);
        setResponse(generated);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const regenerate = async (withManual = false) => {
    setError(null);
    setGenerating(true);
    try {
      const generated = await generateGrowthRadar(locale, true, withManual ? buildManualMetrics() : undefined);
      setResponse(generated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, locale]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-lime" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={es ? "Radar IA de Crecimiento" : "AI Growth Radar"}
        description={
          es
            ? "Recomendaciones semanales basadas en tus datos reales de Instagram, contenido y leads."
            : "Weekly recommendations based on your real Instagram, content and lead data."
        }
        action={
          <Button onClick={() => regenerate(false)} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {es ? "Regenerar" : "Regenerate"}
          </Button>
        }
      />

      {error && (
        <Card className="mb-6 border-red-500/30 bg-red-500/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            <div>
              <p className="font-medium text-red-300">{es ? "No pude generar el Radar" : "Could not generate Radar"}</p>
              <p className="mt-1 text-sm text-muted">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {response?.persistenceWarning && (
        <Card className="mb-6 border-amber-500/30 bg-amber-500/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <p className="text-sm text-amber-100">{response.persistenceWarning}</p>
          </div>
        </Card>
      )}

      {brandConfigured && !instagramConnected && (
        <Card className="mb-6 border-blue-500/20 bg-blue-500/5">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
            <div>
              <p className="font-medium text-blue-300 text-sm">
                {es ? "Instagram no conectado — introduce datos manualmente" : "Instagram not connected — enter data manually"}
              </p>
              <p className="mt-1 text-xs text-muted">
                {es
                  ? "Añade tus métricas actuales para que el Radar sea más preciso. Si las dejas vacías, el Radar usará solo tu perfil de marca."
                  : "Add your current metrics so the Radar is more accurate. If left empty, the Radar will use only your brand profile."}
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              id="manual-followers"
              label={es ? "Seguidores actuales" : "Current followers"}
              type="number"
              value={manualFollowers}
              onChange={(e) => setManualFollowers(e.target.value)}
              placeholder="ej. 2500"
            />
            <Input
              id="manual-weekly-gain"
              label={es ? "Ganancia semanal" : "Weekly gain"}
              type="number"
              value={manualWeeklyGain}
              onChange={(e) => setManualWeeklyGain(e.target.value)}
              placeholder="ej. 45"
            />
            <Input
              id="manual-engagement"
              label={es ? "Engagement rate (%)" : "Engagement rate (%)"}
              type="number"
              value={manualEngagement}
              onChange={(e) => setManualEngagement(e.target.value)}
              placeholder="ej. 4.2"
            />
          </div>
          <Button
            className="mt-4"
            onClick={() => regenerate(true)}
            disabled={generating}
            variant="secondary"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {es ? "Generar Radar con estos datos" : "Generate Radar with this data"}
          </Button>
        </Card>
      )}

      {!brandConfigured ? (
        <EmptyState
          icon={<Radar className="h-7 w-7" />}
          title={es ? "Configura tu perfil primero" : "Set up your profile first"}
          description={
            es
              ? "El Radar IA necesita conocer tu nicho, audiencia y oferta para darte recomendaciones útiles. Sin ese contexto, los resultados serán genéricos."
              : "The AI Radar needs to know your niche, audience and offer to give you useful recommendations. Without that context, results will be generic."
          }
          action={
            <Link href="/settings">
              <Button>
                <Settings className="h-4 w-4" />
                {es ? "Completar perfil de marca" : "Complete brand profile"}
              </Button>
            </Link>
          }
        />
      ) : !report ? (
        <EmptyState
          icon={<Radar className="h-7 w-7" />}
          title={es ? "Todavia no hay Radar IA" : "No AI Radar yet"}
          description={
            es
              ? "Genera tu primer radar para detectar oportunidades, riesgos y experimentos de crecimiento."
              : "Generate your first radar to detect growth opportunities, risks and experiments."
          }
          action={
            <Button onClick={() => regenerate(!instagramConnected)} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {es ? "Generar Radar" : "Generate Radar"}
            </Button>
          }
        />
      ) : (
        <RadarReport report={report} reportWeek={response?.reportWeek ?? null} locale={locale} />
      )}
    </div>
  );
}

function RadarReport({ report, reportWeek, locale }: { report: GrowthRadarReport; reportWeek: string | null; locale: string }) {
  const es = locale === "es";

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Card glow className="flex flex-col items-center justify-center text-center">
          <div className="relative flex h-36 w-36 items-center justify-center rounded-full border border-lime/30 bg-lime/10">
            <div className="absolute inset-3 rounded-full border border-lime/20" />
            <p className="text-5xl font-bold text-lime">{report.opportunityScore}</p>
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted">
            {es ? "Score de oportunidad" : "Opportunity score"}
          </p>
          {reportWeek && (
            <p className="mt-1 text-xs text-muted">
              {es ? "Semana de" : "Week of"} {formatDate(reportWeek, locale)}
            </p>
          )}
        </Card>

        <Card glow>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-lime" />
            <p className="text-xs font-semibold uppercase tracking-wider text-lime">
              {es ? "Diagnostico IA" : "AI Diagnosis"}
            </p>
          </div>
          <h2 className="mt-3 text-2xl font-bold">{report.headline}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">{report.executiveSummary}</p>
          <div className="mt-5 rounded-lg border border-lime/20 bg-lime/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-lime">
              {es ? "Mayor oportunidad" : "Biggest opportunity"}
            </p>
            <p className="mt-2 text-sm font-medium">{report.biggestOpportunity}</p>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {report.keySignals.slice(0, 6).map((signal) => (
          <Card key={`${signal.label}-${signal.value}`} className="!p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-lime" />
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{signal.label}</p>
            </div>
            <p className="mt-2 text-xl font-bold">{signal.value}</p>
            <p className="mt-1 text-xs text-muted">{signal.interpretation}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title={es ? "Recomendaciones priorizadas" : "Prioritized recommendations"} />
        <div className="grid gap-4 lg:grid-cols-3">
          {report.recommendations.slice(0, 3).map((rec) => (
            <div key={rec.title} className="rounded-lg border border-border bg-surface-elevated p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <Target className="mt-0.5 h-5 w-5 shrink-0 text-lime" />
                <Badge className={cn("shrink-0", priorityClasses[rec.priority])}>{rec.priority}</Badge>
              </div>
              <h3 className="font-semibold">{rec.title}</h3>
              <p className="mt-2 text-xs text-muted">{rec.why}</p>
              <p className="mt-3 text-sm">{rec.action}</p>
              <p className="mt-3 text-xs font-medium text-lime">{rec.expectedImpact}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={es ? "Experimentos de la semana" : "Weekly experiments"} action={<FlaskConical className="h-5 w-5 text-lime" />} />
          <div className="space-y-4">
            {report.experiments.slice(0, 3).map((experiment) => (
              <div key={experiment.name} className="rounded-lg bg-surface-elevated p-4">
                <p className="font-medium">{experiment.name}</p>
                <p className="mt-1 text-xs text-muted">{experiment.hypothesis}</p>
                <ol className="mt-3 space-y-1 text-sm">
                  {experiment.steps.map((step, index) => (
                    <li key={step} className="flex gap-2">
                      <span className="text-lime">{index + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-3 text-xs font-medium text-lime">{experiment.successMetric}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title={es ? "Plan de contenido recomendado" : "Recommended content plan"} action={<Lightbulb className="h-5 w-5 text-lime" />} />
          <div className="rounded-lg border border-lime/20 bg-lime/5 p-4">
            <Badge className="bg-lime/20 text-lime border-lime/30">{report.contentPlan.format}</Badge>
            <h3 className="mt-3 text-lg font-semibold">{report.contentPlan.topic}</h3>
            <p className="mt-3 text-sm font-medium">&ldquo;{report.contentPlan.hook}&rdquo;</p>
            <p className="mt-2 text-xs text-muted">CTA: {report.contentPlan.cta}</p>
          </div>

          <div className="mt-4 grid gap-3">
            <div className="rounded-lg bg-surface-elevated p-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
                <Zap className="h-3 w-3 text-lime" />
                {es ? "Play de engagement" : "Engagement play"}
              </p>
              <p className="mt-2 text-sm">{report.engagementPlay}</p>
            </div>
            <div className="rounded-lg bg-surface-elevated p-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
                <CheckCircle2 className="h-3 w-3 text-lime" />
                {es ? "Play de leads" : "Lead play"}
              </p>
              <p className="mt-2 text-sm">{report.leadPlay}</p>
            </div>
          </div>
        </Card>
      </div>

      {report.riskAlerts.length > 0 && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader title={es ? "Riesgos a vigilar" : "Risks to watch"} action={<AlertTriangle className="h-5 w-5 text-amber-400" />} />
          <div className="grid gap-2 sm:grid-cols-2">
            {report.riskAlerts.map((alert) => (
              <div key={alert} className="rounded-lg border border-amber-500/20 bg-surface-elevated p-3 text-sm">
                {alert}
              </div>
            ))}
          </div>
        </Card>
      )}

      <Link href="/ai-coach" className="block">
        <Button variant="secondary" className="w-full">
          {es ? "Preguntar al Coach sobre este Radar" : "Ask the Coach about this Radar"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}
