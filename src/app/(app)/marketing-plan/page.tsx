"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BarChart3, CalendarDays, Loader2, RefreshCw, Sparkles, Target, TrendingUp } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { useAuth } from "@/contexts/AuthContext";
import { fetchMarketingPlan, generateMarketingPlan, type MarketingPlanResponse } from "@/lib/ai-client";
import type { MonthlyMarketingPlan } from "@/types/marketing-os";

export default function MarketingPlanPage() {
  const { locale } = useTranslation();
  const { user } = useAuth();
  const [objective, setObjective] = useState("leads");
  const [data, setData] = useState<MarketingPlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const es = locale === "es";

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMarketingPlan();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const generate = async (force = false) => {
    setGenerating(true);
    setError(null);
    try {
      const result = await generateMarketingPlan(locale, objective, force);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    load();
  }, [user, locale]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-lime" /></div>;
  }

  const plan = data?.plan ?? null;

  return (
    <div>
      <PageHeader
        title={es ? "Plan de Marketing IA Mensual" : "Monthly AI Marketing Plan"}
        description={
          es
            ? "Un plan de 30 días que conecta contenido, funnel, oferta, leads y métricas."
            : "A 30-day plan connecting content, funnel, offer, leads and metrics."
        }
        action={
          <div className="flex gap-2">
            <Select
              id="objective"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              options={[
                { value: "leads", label: es ? "Generar leads" : "Generate leads" },
                { value: "sales", label: es ? "Impulsar ventas" : "Drive sales" },
                { value: "authority", label: es ? "Crear autoridad" : "Build authority" },
                { value: "followers", label: es ? "Crecer seguidores" : "Grow followers" },
              ]}
            />
            <Button onClick={() => generate(Boolean(plan))} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {plan ? (es ? "Regenerar" : "Regenerate") : (es ? "Generar" : "Generate")}
            </Button>
          </div>
        }
      />

      {error && (
        <Card className="mb-6 border-red-500/30 bg-red-500/10">
          <p className="text-sm text-red-300">{error}</p>
        </Card>
      )}

      {data?.persistenceWarning && (
        <Card className="mb-6 border-amber-500/30 bg-amber-500/10">
          <p className="text-sm text-amber-100">{data.persistenceWarning}</p>
        </Card>
      )}

      {!plan ? (
        <EmptyState
          icon={<CalendarDays className="h-7 w-7" />}
          title={es ? "Todavía no hay plan mensual" : "No monthly plan yet"}
          description={
            es
              ? "Genera un plan estratégico para publicar con intención comercial durante el mes."
              : "Generate a strategic plan to post with commercial intent this month."
          }
          action={
            <Button onClick={() => generate(false)} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {es ? "Crear plan mensual" : "Create monthly plan"}
            </Button>
          }
        />
      ) : (
        <PlanView plan={plan} es={es} />
      )}
    </div>
  );
}

function PlanView({ plan, es }: { plan: MonthlyMarketingPlan; es: boolean }) {
  return (
    <div className="space-y-6">
      <Card glow>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-lime" />
          <p className="text-xs font-semibold uppercase tracking-wider text-lime">{plan.month}</p>
        </div>
        <h2 className="mt-3 text-2xl font-bold">{plan.objective}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">{plan.positioningDiagnosis}</p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Object.entries(plan.funnelStrategy).map(([stage, value]) => (
          <Card key={stage} className="!p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-lime">{stage}</p>
            <p className="mt-2 text-sm text-muted">{value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title={es ? "Pilares de contenido" : "Content pillars"} action={<Target className="h-5 w-5 text-lime" />} />
        <div className="grid gap-4 lg:grid-cols-3">
          {plan.contentPillars.map((pillar) => (
            <div key={pillar.name} className="rounded-lg border border-border bg-surface-elevated p-4">
              <h3 className="font-semibold">{pillar.name}</h3>
              <p className="mt-1 text-xs text-muted">{pillar.role}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {pillar.exampleTopics.map((topic) => <Badge key={topic} className="border-lime/20 text-lime">{topic}</Badge>)}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title={es ? "Campañas semanales" : "Weekly campaigns"} action={<CalendarDays className="h-5 w-5 text-lime" />} />
        <div className="space-y-4">
          {plan.weeklyCampaigns.map((campaign) => (
            <div key={campaign.week} className="rounded-xl border border-border bg-surface-elevated p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">{es ? "Semana" : "Week"} {campaign.week}</p>
                  <h3 className="text-lg font-semibold">{campaign.theme}</h3>
                  <p className="text-sm text-muted">{campaign.goal}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {campaign.kpis.map((kpi) => <Badge key={kpi} className="border-lime/20 text-lime">{kpi}</Badge>)}
                </div>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {campaign.content.map((item) => (
                  <div key={`${campaign.week}-${item.topic}`} className="rounded-lg bg-surface p-3">
                    <p className="text-xs font-semibold uppercase text-lime">{item.format}</p>
                    <p className="mt-1 font-medium">{item.topic}</p>
                    <p className="mt-1 text-sm text-muted">&ldquo;{item.hook}&rdquo;</p>
                    <p className="mt-2 text-xs text-muted">CTA: {item.cta}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <ListCard title={es ? "Ángulos de oferta" : "Offer angles"} items={plan.offerAngles} />
        <ListCard title={es ? "Lead magnets" : "Lead magnets"} items={plan.leadMagnets} />
        <Card>
          <CardHeader title={es ? "Medición" : "Measurement"} action={<BarChart3 className="h-5 w-5 text-lime" />} />
          <div className="space-y-3">
            {plan.measurementPlan.map((metric) => (
              <div key={metric.metric} className="rounded-lg bg-surface-elevated p-3">
                <p className="font-medium">{metric.metric}</p>
                <p className="text-xs text-lime">{metric.target}</p>
                <p className="mt-1 text-xs text-muted">{metric.whyItMatters}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Link href="/funnel-builder" className="block">
        <Button variant="secondary" className="w-full">
          {es ? "Convertir este plan en funnel" : "Turn this plan into a funnel"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <Card>
      <CardHeader title={title} />
      <ul className="space-y-2 text-sm">
        {items.map((item) => (
          <li key={item} className="rounded-lg bg-surface-elevated p-3">{item}</li>
        ))}
      </ul>
    </Card>
  );
}
