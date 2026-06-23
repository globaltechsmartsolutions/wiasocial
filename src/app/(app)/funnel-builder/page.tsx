"use client";

import { useEffect, useState } from "react";
import { Bot, ClipboardList, Loader2, MessageCircle, RefreshCw, Sparkles, Target, UserCheck } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { useAuth } from "@/contexts/AuthContext";
import { fetchLatestFunnel, generateFunnel, type FunnelBuilderResponse } from "@/lib/ai-client";
import type { InstagramFunnelPlan } from "@/types/marketing-os";

export default function FunnelBuilderPage() {
  const { locale } = useTranslation();
  const { user } = useAuth();
  const [offer, setOffer] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [funnelGoal, setFunnelGoal] = useState("leads");
  const [data, setData] = useState<FunnelBuilderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const es = locale === "es";

  useEffect(() => {
    if (!user) return;
    fetchLatestFunnel()
      .then((result) => setData(result))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [user]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const result = await generateFunnel({ offer, targetAudience, funnelGoal }, locale);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-lime" /></div>;
  }

  const funnel = data?.funnel ?? null;

  return (
    <div>
      <PageHeader
        title={es ? "Funnel Builder Instagram" : "Instagram Funnel Builder"}
        description={
          es
            ? "Convierte una oferta en perfil, contenido, stories, DMs y follow-ups listos para vender."
            : "Turn an offer into profile, content, stories, DMs and follow-ups ready to sell."
        }
      />

      <Card glow className="mb-6">
        <CardHeader title={es ? "Brief del funnel" : "Funnel brief"} description={es ? "Define la oferta y deja que la IA diseñe el sistema." : "Define the offer and let AI design the system."} />
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_180px_auto]">
          <Input
            id="offer"
            value={offer}
            onChange={(e) => setOffer(e.target.value)}
            placeholder={es ? "Oferta: consultoría, programa, servicio..." : "Offer: consulting, program, service..."}
          />
          <Input
            id="target-audience"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            placeholder={es ? "Audiencia objetivo" : "Target audience"}
          />
          <Select
            id="funnel-goal"
            value={funnelGoal}
            onChange={(e) => setFunnelGoal(e.target.value)}
            options={[
              { value: "leads", label: es ? "Leads" : "Leads" },
              { value: "calls", label: es ? "Llamadas" : "Calls" },
              { value: "sales", label: es ? "Ventas" : "Sales" },
              { value: "community", label: es ? "Comunidad" : "Community" },
            ]}
          />
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {funnel ? (es ? "Regenerar" : "Regenerate") : (es ? "Generar" : "Generate")}
          </Button>
        </div>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        {data?.persistenceWarning && <p className="mt-3 text-sm text-amber-300">{data.persistenceWarning}</p>}
      </Card>

      {!funnel ? (
        <EmptyState
          icon={<Target className="h-7 w-7" />}
          title={es ? "Todavía no hay funnel" : "No funnel yet"}
          description={es ? "Crea un sistema de conversión completo para tu oferta." : "Create a full conversion system for your offer."}
          action={
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {es ? "Crear funnel" : "Create funnel"}
            </Button>
          }
        />
      ) : (
        <FunnelView funnel={funnel} es={es} />
      )}
    </div>
  );
}

function FunnelView({ funnel, es }: { funnel: InstagramFunnelPlan; es: boolean }) {
  return (
    <div className="space-y-6">
      <Card glow>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-lime">{funnel.funnelGoal}</p>
            <h2 className="mt-2 text-2xl font-bold">{funnel.offer}</h2>
            <p className="mt-2 text-sm text-muted">{funnel.targetAudience}</p>
          </div>
          <Badge className="border-lime/30 bg-lime/10 text-lime">DM: {funnel.dmKeyword}</Badge>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted">{funnel.positioning}</p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={es ? "Perfil que convierte" : "Conversion profile"} action={<UserCheck className="h-5 w-5 text-lime" />} />
          <div className="rounded-lg border border-lime/20 bg-lime/5 p-4">
            <p className="text-sm whitespace-pre-wrap">{funnel.profileConversion.bio}</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <List title={es ? "Highlights" : "Highlights"} items={funnel.profileConversion.highlights} />
            <List title={es ? "Posts fijados" : "Pinned posts"} items={funnel.profileConversion.pinnedPosts} />
          </div>
        </Card>

        <Card>
          <CardHeader title={es ? "Lead magnet" : "Lead magnet"} action={<ClipboardList className="h-5 w-5 text-lime" />} />
          <h3 className="text-lg font-semibold">{funnel.leadMagnet.title}</h3>
          <p className="mt-2 text-sm text-muted">{funnel.leadMagnet.promise}</p>
          <p className="mt-4 rounded-lg bg-surface-elevated p-3 text-sm">{funnel.leadMagnet.delivery}</p>
        </Card>
      </div>

      <Card>
        <CardHeader title={es ? "Secuencia de contenido" : "Content sequence"} />
        <div className="grid gap-3 lg:grid-cols-2">
          {funnel.contentSequence.map((item) => (
            <div key={`${item.stage}-${item.topic}`} className="rounded-lg border border-border bg-surface-elevated p-4">
              <div className="flex items-center gap-2">
                <Badge className="border-lime/30 text-lime">{item.stage}</Badge>
                <span className="text-xs text-muted">{item.format}</span>
              </div>
              <p className="mt-3 font-medium">{item.topic}</p>
              <p className="mt-1 text-sm text-muted">&ldquo;{item.hook}&rdquo;</p>
              <p className="mt-2 text-xs text-lime">CTA: {item.cta}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={es ? "Stories de conversión" : "Conversion stories"} />
          <div className="space-y-2">
            {funnel.storySequence.map((slide) => (
              <div key={slide.slide} className="rounded-lg bg-surface-elevated p-3">
                <p className="text-xs font-semibold text-lime">{es ? "Slide" : "Slide"} {slide.slide}: {slide.goal}</p>
                <p className="mt-1 text-sm">{slide.copy}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title={es ? "DMs y follow-ups" : "DMs and follow-ups"} action={<MessageCircle className="h-5 w-5 text-lime" />} />
          <div className="space-y-4">
            {funnel.dmScripts.map((script) => (
              <div key={script.situation} className="rounded-lg bg-surface-elevated p-3">
                <p className="text-xs font-semibold uppercase text-lime">{script.situation}</p>
                <p className="mt-1 text-sm">{script.message}</p>
              </div>
            ))}
            {funnel.followUpSequence.map((followUp) => (
              <div key={`${followUp.day}-${followUp.objective}`} className="rounded-lg border border-border p-3">
                <p className="text-xs font-semibold text-muted">{es ? "Día" : "Day"} {followUp.day}: {followUp.objective}</p>
                <p className="mt-1 text-sm">{followUp.message}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ListCard title={es ? "Guion de llamada" : "Call script"} items={funnel.callScript} icon={<Bot className="h-5 w-5 text-lime" />} />
        <ListCard title={es ? "Métricas de éxito" : "Success metrics"} items={funnel.successMetrics} icon={<Target className="h-5 w-5 text-lime" />} />
      </div>
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</p>
      <ul className="mt-2 space-y-1 text-sm">
        {items.map((item) => <li key={item}>• {item}</li>)}
      </ul>
    </div>
  );
}

function ListCard({ title, items, icon }: { title: string; items: string[]; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} action={icon} />
      <ol className="space-y-2 text-sm">
        {items.map((item, index) => (
          <li key={item} className="flex gap-2 rounded-lg bg-surface-elevated p-3">
            <span className="text-lime">{index + 1}.</span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
