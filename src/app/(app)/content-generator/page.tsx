"use client";

import { useEffect, useState } from "react";
import {
  Clipboard,
  Clock,
  Download,
  GitBranch,
  ImageIcon,
  Layers,
  ListChecks,
  Loader2,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { OutputBlock } from "@/components/ui/PageHeader";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { useAuth } from "@/contexts/AuthContext";
import { callAI } from "@/lib/ai-client";
import { CAROUSEL_TEMPLATE_DEFINITIONS, getTemplateRenderColors, normalizeContentRoute } from "@/lib/content-template-router";
import { publishInstagramCarousel } from "@/lib/instagram-client";
import { saveGeneratedContent, fetchSettings, fetchGeneratedContent } from "@/lib/db";
import type {
  CarouselTemplateId,
  CommercialIntensity,
  ContentFormat,
  ContentFunnelStage,
  ContentGoal,
  ContentTone,
  PremiumCarouselSlide,
  PremiumContentRoute,
  PremiumContentVariant,
  PremiumGeneratedContent,
  PremiumStorySlide,
} from "@/types";

type TemplateSelection = "auto" | CarouselTemplateId;

type HistoryItem = PremiumGeneratedContent & {
  id: string;
  createdAt: string;
  niche: string;
};

type GeneratedContentRow = {
  id: string;
  createdAt: string;
  niche: string;
  hook: string;
  reelScript: string;
  caption: string;
  cta: string;
  hashtags: string[];
  storySequence: string[];
  dmReplyTemplate: string;
  rawJson?: unknown;
};

const contentLabels = {
  es: {
    title: "Content Studio premium",
    description: "Crea piezas estratégicas para Instagram: copy, carrusel, stories, DM y revisión crítica.",
    brief: "Brief creativo",
    briefDesc: "Cuanto más concreto sea el brief, menos genérica será la pieza.",
    targetAudience: "Audiencia objetivo",
    offer: "Oferta",
    topic: "Idea principal",
    objection: "Objeción a romper",
    proof: "Prueba o credibilidad",
    desiredAction: "Acción deseada",
    goal: "Objetivo",
    tone: "Tono",
    format: "Formato",
    template: "Plantilla de carrusel",
    autoTemplate: "Auto",
    funnelStage: "Fase del funnel",
    intensity: "Intensidad comercial",
    generate: "Generar pack premium",
    empty: "Completa el brief y genera una pieza premium.",
    history: "Generaciones guardadas",
    historyDesc: "Recupera una pieza anterior.",
    strategy: "Estrategia",
    primaryPiece: "Pieza principal",
    variants: "Variantes",
    carousel: "Carrusel",
    stories: "Stories",
    dm: "DM de seguimiento",
    visual: "Dirección visual",
    templateRouter: "Router de plantilla",
    topicSummary: "Concepto corto",
    pattern: "Patrón",
    review: "Revisión crítica",
    score: "Calidad",
    copyPack: "Copiar pack",
    downloadCarousel: "Descargar PNG",
    publishInstagram: "Publicar en Instagram",
    publishing: "Publicando...",
    published: "Publicado en Instagram",
    publishHelp: "Publica el carrusel generado usando la conexión oficial de Instagram.",
    preview: "Vista previa PNG",
    carouselStudio: "Mesa de revisión del carrusel",
    previewHelp: "Revisa cada slide como PNG final antes de descargar o publicar.",
    selectedSlide: "Slide activa",
    slideCopy: "Copy de la slide",
    headlineLabel: "Titular",
    supportLabel: "Apoyo",
    visualCueLabel: "Nota visual",
    captionLabel: "Caption",
    ctaLabel: "CTA",
    nichePlaceholder: "ej. Clínica estética premium",
    audiencePlaceholder: "ej. Mujeres de 35-55 que quieren verse mejor sin cambios artificiales",
    offerPlaceholder: "ej. Diagnóstico facial + tratamiento personalizado",
    topicPlaceholder: "ej. Por qué un tratamiento facial no debería elegirse por precio",
    objectionPlaceholder: "ej. Me da miedo que se note demasiado",
    proofPlaceholder: "ej. Más de 300 diagnósticos faciales realizados",
    desiredActionPlaceholder: "ej. Enviar DM con la palabra DIAGNÓSTICO",
  },
  en: {
    title: "Premium Content Studio",
    description: "Create strategic Instagram pieces: copy, carousel, stories, DM and critical review.",
    brief: "Creative brief",
    briefDesc: "The more specific the brief, the less generic the output.",
    targetAudience: "Target audience",
    offer: "Offer",
    topic: "Main idea",
    objection: "Objection to address",
    proof: "Proof or credibility",
    desiredAction: "Desired action",
    goal: "Goal",
    tone: "Tone",
    format: "Format",
    template: "Carousel template",
    autoTemplate: "Auto",
    funnelStage: "Funnel stage",
    intensity: "Commercial intensity",
    generate: "Generate premium pack",
    empty: "Complete the brief and generate a premium piece.",
    history: "Saved generations",
    historyDesc: "Load a previous piece.",
    strategy: "Strategy",
    primaryPiece: "Primary piece",
    variants: "Variants",
    carousel: "Carousel",
    stories: "Stories",
    dm: "Follow-up DM",
    visual: "Visual direction",
    templateRouter: "Template router",
    topicSummary: "Short concept",
    pattern: "Pattern",
    review: "Critical review",
    score: "Quality",
    copyPack: "Copy pack",
    downloadCarousel: "Download PNG",
    publishInstagram: "Publish to Instagram",
    publishing: "Publishing...",
    published: "Published to Instagram",
    publishHelp: "Publish the generated carousel using the official Instagram connection.",
    preview: "PNG preview",
    carouselStudio: "Carousel review desk",
    previewHelp: "Review each slide as the final PNG before downloading or publishing.",
    selectedSlide: "Active slide",
    slideCopy: "Slide copy",
    headlineLabel: "Headline",
    supportLabel: "Support",
    visualCueLabel: "Visual note",
    captionLabel: "Caption",
    ctaLabel: "CTA",
    nichePlaceholder: "e.g. Premium aesthetics clinic",
    audiencePlaceholder: "e.g. Women 35-55 who want to look fresher without obvious changes",
    offerPlaceholder: "e.g. Facial diagnosis + personalized treatment",
    topicPlaceholder: "e.g. Why a facial treatment should not be chosen by price",
    objectionPlaceholder: "e.g. I am afraid it will look too obvious",
    proofPlaceholder: "e.g. More than 300 facial diagnoses completed",
    desiredActionPlaceholder: "e.g. Send DM with the word DIAGNOSIS",
  },
};

const formatOptions: { value: ContentFormat; label: string }[] = [
  { value: "carousel", label: "Carrusel" },
  { value: "reel", label: "Reel" },
  { value: "stories", label: "Stories" },
  { value: "post", label: "Post" },
];

const templateOptions = (autoLabel: string): { value: TemplateSelection; label: string }[] => [
  { value: "auto", label: autoLabel },
  ...CAROUSEL_TEMPLATE_DEFINITIONS.map((template) => ({
    value: template.id,
    label: template.name,
  })),
];

const funnelOptions: { value: ContentFunnelStage; label: string }[] = [
  { value: "awareness", label: "Descubrimiento" },
  { value: "consideration", label: "Consideración" },
  { value: "conversion", label: "Conversión" },
];

const intensityOptions: { value: CommercialIntensity; label: string }[] = [
  { value: "soft", label: "Suave" },
  { value: "balanced", label: "Equilibrada" },
  { value: "direct", label: "Directa" },
];

export default function ContentGeneratorPage() {
  const { t, locale } = useTranslation();
  const labels = contentLabels[locale];
  const { user } = useAuth();
  const [niche, setNiche] = useState("");
  const [audience, setAudience] = useState("");
  const [offer, setOffer] = useState("");
  const [goal, setGoal] = useState<ContentGoal>("leads");
  const [tone, setTone] = useState<ContentTone>("professional");
  const [format, setFormat] = useState<ContentFormat>("carousel");
  const [preferredTemplate, setPreferredTemplate] = useState<TemplateSelection>("auto");
  const [funnelStage, setFunnelStage] = useState<ContentFunnelStage>("conversion");
  const [commercialIntensity, setCommercialIntensity] = useState<CommercialIntensity>("balanced");
  const [keyMessage, setKeyMessage] = useState("");
  const [objection, setObjection] = useState("");
  const [proof, setProof] = useState("");
  const [desiredAction, setDesiredAction] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [output, setOutput] = useState<PremiumGeneratedContent | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchSettings(user.id).then((s) => {
      if (s) {
        setNiche(s.niche);
        setAudience(s.targetAudience);
        setOffer(s.offer);
        setGoal(s.defaultGoal);
        setTone(s.defaultTone);
      }
    });
    loadHistory(user.id).then(setHistory).catch(() => setHistory([]));
  }, [user]);

  const goalOptions = [
    { value: "followers", label: t.goalLabel.followers },
    { value: "leads", label: t.goalLabel.leads },
    { value: "sales", label: t.goalLabel.sales },
  ];
  const toneOptions = [
    { value: "luxury", label: t.tone.luxury },
    { value: "professional", label: t.tone.professional },
    { value: "aggressive", label: t.tone.aggressive },
    { value: "educational", label: t.tone.educational },
  ];

  const handleGenerate = async () => {
    if (!niche.trim() || !audience.trim() || !offer.trim()) {
      setError(locale === "es" ? "Completa nicho, audiencia y oferta antes de generar." : "Complete niche, audience and offer before generating.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await callAI(
        "content",
        {
          niche,
          audience,
          offer,
          goal,
          tone,
          format,
          funnelStage,
          commercialIntensity,
          preferredTemplateId: preferredTemplate === "auto" ? "" : preferredTemplate,
          keyMessage,
          objection,
          proof,
          desiredAction,
        },
        locale
      );
      const content = normalizePremiumContent(result);
      setOutput(content);
      if (user) {
        await saveGeneratedContent(user.id, {
          content_type: "full",
          niche,
          audience,
          offer,
          goal,
          tone,
          hook: content.hook,
          reel_script: content.reelScript,
          caption: content.caption,
          cta: content.cta,
          hashtags: content.hashtags,
          story_sequence: content.storySequence,
          dm_reply_template: content.dmReplyTemplate,
          raw_json: content,
        });
        setHistory(await loadHistory(user.id));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title={labels.title} description={labels.description} />
      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card className="h-fit">
          <CardHeader title={labels.brief} description={labels.briefDesc} />
          <div className="space-y-4">
            <Input id="niche" label={t.common.niche} value={niche} onChange={(e) => setNiche(e.target.value)} placeholder={labels.nichePlaceholder} />
            <Input id="audience" label={labels.targetAudience} value={audience} onChange={(e) => setAudience(e.target.value)} placeholder={labels.audiencePlaceholder} />
            <Textarea id="offer" label={labels.offer} value={offer} onChange={(e) => setOffer(e.target.value)} rows={2} placeholder={labels.offerPlaceholder} />
            <Textarea id="keyMessage" label={labels.topic} value={keyMessage} onChange={(e) => setKeyMessage(e.target.value)} rows={2} placeholder={labels.topicPlaceholder} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select id="goal" label={labels.goal} value={goal} onChange={(e) => setGoal(e.target.value as ContentGoal)} options={goalOptions} />
              <Select id="format" label={labels.format} value={format} onChange={(e) => setFormat(e.target.value as ContentFormat)} options={formatOptions} />
              <Select
                id="preferredTemplate"
                label={labels.template}
                value={preferredTemplate}
                onChange={(e) => setPreferredTemplate(e.target.value as TemplateSelection)}
                options={templateOptions(labels.autoTemplate)}
              />
              <Select id="tone" label={labels.tone} value={tone} onChange={(e) => setTone(e.target.value as ContentTone)} options={toneOptions} />
              <Select id="funnelStage" label={labels.funnelStage} value={funnelStage} onChange={(e) => setFunnelStage(e.target.value as ContentFunnelStage)} options={funnelOptions} />
            </div>
            <Select id="commercialIntensity" label={labels.intensity} value={commercialIntensity} onChange={(e) => setCommercialIntensity(e.target.value as CommercialIntensity)} options={intensityOptions} />
            <Textarea id="objection" label={labels.objection} value={objection} onChange={(e) => setObjection(e.target.value)} rows={2} placeholder={labels.objectionPlaceholder} />
            <Textarea id="proof" label={labels.proof} value={proof} onChange={(e) => setProof(e.target.value)} rows={2} placeholder={labels.proofPlaceholder} />
            <Input id="desiredAction" label={labels.desiredAction} value={desiredAction} onChange={(e) => setDesiredAction(e.target.value)} placeholder={labels.desiredActionPlaceholder} />
            <Button onClick={handleGenerate} disabled={loading} className="w-full" size="lg">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t.common.generating}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {labels.generate}
                </>
              )}
            </Button>
          </div>
        </Card>

        {output ? (
          <PremiumOutput output={output} labels={labels} copyLabel={t.common.copy} onChangeOutput={setOutput} />
        ) : (
          <Card className="flex min-h-[520px] items-center justify-center">
            <div className="text-center">
              <Sparkles className="mx-auto h-12 w-12 text-lime/30" />
              <p className="mt-4 text-muted">{labels.empty}</p>
            </div>
          </Card>
        )}
      </div>

      {history.length > 0 && (
        <Card className="mt-8">
          <CardHeader title={labels.history} description={labels.historyDesc} />
          <div className="grid gap-3 md:grid-cols-2">
            {history.map((item) => (
              <button
                key={item.id}
                onClick={() => setOutput(item)}
                className="flex min-h-24 w-full items-start justify-between gap-4 rounded-lg border border-border bg-surface-elevated p-4 text-left transition-colors hover:border-lime/30"
              >
                <div>
                  <p className="line-clamp-2 font-medium">{item.primaryPiece.title || item.hook}</p>
                  <p className="mt-1 text-sm text-muted">{item.niche || labels.title}</p>
                </div>
                <span className="flex shrink-0 items-center gap-2 text-xs text-muted">
                  <Clock className="h-3 w-3" />
                  {item.createdAt}
                </span>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

async function loadHistory(userId: string): Promise<HistoryItem[]> {
  const items = await fetchGeneratedContent(userId, "full", 8);
  return items.map((item) => mapHistoryItem(item as GeneratedContentRow));
}

function mapHistoryItem(item: GeneratedContentRow): HistoryItem {
  return {
    id: item.id,
    createdAt: item.createdAt,
    niche: item.niche,
    ...normalizePremiumContent(item.rawJson ?? item),
  };
}

function PremiumOutput({
  output,
  labels,
  copyLabel,
  onChangeOutput,
}: {
  output: PremiumGeneratedContent;
  labels: typeof contentLabels.es;
  copyLabel: string;
  onChangeOutput: (output: PremiumGeneratedContent) => void;
}) {
  const [publishing, setPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState("");
  const [publishError, setPublishError] = useState("");

  const handlePublish = async () => {
    setPublishing(true);
    setPublishMessage("");
    setPublishError("");
    try {
      const slides = output.carousel.map((slide, index) => ({
        slide: slide.slide,
        dataUrl: renderCarouselSlide(output, slide, index).toDataURL("image/png"),
      }));
      const result = await publishInstagramCarousel({
        caption: buildInstagramCaption(output),
        slides,
      });
      setPublishMessage(`${labels.published}: ${result.instagramMediaId}`);
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "No se pudo publicar en Instagram");
    } finally {
      setPublishing(false);
    }
  };

  const handleUpdateSlide = (index: number, patch: Partial<PremiumCarouselSlide>) => {
    onChangeOutput({
      ...output,
      carousel: output.carousel.map((slide, slideIndex) => (
        slideIndex === index ? { ...slide, ...patch } : slide
      )),
    });
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-lime/20 bg-surface p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-lime">
              <ShieldCheck className="h-4 w-4" />
              {labels.score}: {output.qualityReview.score}/100
            </div>
            <h2 className="mt-2 text-xl font-semibold text-foreground">{output.primaryPiece.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{output.strategy.whyThisWillWork}</p>
          </div>
          <Button
            variant="secondary"
            onClick={() => navigator.clipboard.writeText(buildPackText(output))}
            className="shrink-0"
          >
            <Clipboard className="h-4 w-4" />
            {labels.copyPack}
          </Button>
        </div>
      </div>

      <ContentRoutePanel route={output.contentRoute} labels={labels} />

      <section className="grid gap-4 lg:grid-cols-3">
        <InfoTile icon={<Target className="h-4 w-4" />} label="Ángulo" value={output.strategy.angle} />
        <InfoTile icon={<Sparkles className="h-4 w-4" />} label="Promesa" value={output.strategy.promise} />
        <InfoTile icon={<MessageCircle className="h-4 w-4" />} label="Intención" value={output.strategy.conversionIntent} />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <OutputBlock label={labels.primaryPiece} content={formatPrimaryPiece(output)} copyLabel={copyLabel} />
        <OutputBlock label={labels.dm} content={output.dmFollowUp || output.dmReplyTemplate} copyLabel={copyLabel} />
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <SectionTitle icon={<Sparkles className="h-4 w-4" />} title={labels.variants} />
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {output.variants.map((variant, index) => (
            <VariantCard key={`${variant.label}-${index}`} variant={variant} />
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SectionTitle icon={<Layers className="h-4 w-4" />} title={labels.carousel} />
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => downloadCarouselPngs(output)}>
              <Download className="h-4 w-4" />
              {labels.downloadCarousel}
            </Button>
            <Button variant="secondary" size="sm" onClick={handlePublish} disabled={publishing}>
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
              {publishing ? labels.publishing : labels.publishInstagram}
            </Button>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted">{labels.publishHelp}</p>
        {publishMessage && <p className="mt-3 text-sm text-lime">{publishMessage}</p>}
        {publishError && <p className="mt-3 text-sm text-red-400">{publishError}</p>}
        <CarouselStudioPreview output={output} labels={labels} onUpdateSlide={handleUpdateSlide} />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5">
          <SectionTitle icon={<MessageCircle className="h-4 w-4" />} title={labels.stories} />
          <div className="mt-4 space-y-3">
            {output.stories.map((story) => (
              <StorySlideCard key={story.slide} story={story} />
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <SectionTitle icon={<ImageIcon className="h-4 w-4" />} title={labels.visual} />
          <div className="mt-4 space-y-4 text-sm">
            <InfoRow label="Plantilla" value={output.visualDirection.template} />
            <InfoRow label="Mood" value={output.visualDirection.mood} />
            <InfoRow label="Portada" value={output.visualDirection.coverIdea} />
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-lime">Paleta</p>
              <div className="flex flex-wrap gap-2">
                {output.visualDirection.palette.map((color, index) => (
                  <span key={`${color}-${index}`} className="rounded-full border border-border bg-surface-elevated px-3 py-1 text-xs text-muted">
                    {color}
                  </span>
                ))}
              </div>
            </div>
            <OutputBlock label="Assets" content={output.visualDirection.assetPrompts} copyLabel={copyLabel} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <SectionTitle icon={<ShieldCheck className="h-4 w-4" />} title={labels.review} />
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <ReviewList title="Fortalezas" items={output.qualityReview.strengths} />
          <ReviewList title="Riesgos" items={output.qualityReview.risks} />
          <ReviewList title="Mejoras" items={output.qualityReview.improvements} />
        </div>
      </section>
    </div>
  );
}

function ContentRoutePanel({
  route,
  labels,
}: {
  route: PremiumContentRoute;
  labels: typeof contentLabels.es;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <SectionTitle icon={<GitBranch className="h-4 w-4" />} title={labels.templateRouter} />
          <h3 className="mt-3 text-lg font-semibold text-foreground">{route.templateName}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">{route.reasoning}</p>
        </div>
        <div className="rounded-lg border border-lime/20 bg-lime/10 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-lime">
          {route.templateId}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <InfoRow label={labels.topicSummary} value={route.topicSummary} />
        <InfoRow label="Intención" value={route.intent} />
        <InfoRow label="Estilo" value={route.visualStyle} />
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-lime">
          <ListChecks className="h-4 w-4" />
          {labels.pattern}
        </div>
        <div className="flex flex-wrap gap-2">
          {route.slidePattern.map((step, index) => (
            <span
              key={`${step}-${index}`}
              className="rounded-full border border-border bg-surface-elevated px-3 py-1 text-xs text-muted"
            >
              {index + 1}. {step}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-lime">
        {icon}
        {label}
      </div>
      <p className="text-sm leading-relaxed text-foreground">{value}</p>
    </div>
  );
}

function CarouselStudioPreview({
  output,
  labels,
  onUpdateSlide,
}: {
  output: PremiumGeneratedContent;
  labels: typeof contentLabels.es;
  onUpdateSlide: (index: number, patch: Partial<PremiumCarouselSlide>) => void;
}) {
  const [selected, setSelected] = useState(0);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    const urls = output.carousel.map((slide, index) => renderCarouselSlide(output, slide, index).toDataURL("image/png"));
    setPreviewUrls(urls);
    setSelected((current) => Math.min(current, Math.max(output.carousel.length - 1, 0)));
  }, [output]);

  const activeSlide = output.carousel[selected] ?? output.carousel[0];
  const activePreview = previewUrls[selected] ?? previewUrls[0];

  if (!activeSlide || !activePreview) return null;

  return (
    <div className="mt-5 rounded-xl border border-lime/20 bg-background/60 p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">{labels.carouselStudio}</p>
          <p className="mt-1 text-xs text-muted">{labels.previewHelp}</p>
        </div>
        <div className="rounded-full border border-lime/30 bg-lime/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-lime">
          {labels.selectedSlide}: {activeSlide.slide}/{output.carousel.length}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(320px,520px)_1fr]">
        <div className="mx-auto w-full max-w-[520px]">
          <div className="overflow-hidden rounded-xl border border-lime/30 bg-black p-3 shadow-2xl shadow-black/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={activePreview} alt={`${labels.preview} ${activeSlide.slide}`} className="aspect-[4/5] w-full rounded-lg object-cover" />
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="rounded-lg border border-border bg-surface-elevated p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-lime">{labels.slideCopy}</p>
              <span className="rounded-full bg-lime/10 px-2.5 py-1 text-xs font-medium text-lime">{activeSlide.type}</span>
            </div>
            <div className="space-y-3">
              <Textarea
                id={`slide-headline-${activeSlide.slide}`}
                label={labels.headlineLabel}
                value={activeSlide.headline}
                onChange={(event) => onUpdateSlide(selected, { headline: event.target.value })}
                rows={2}
              />
              <Textarea
                id={`slide-support-${activeSlide.slide}`}
                label={labels.supportLabel}
                value={activeSlide.support}
                onChange={(event) => onUpdateSlide(selected, { support: event.target.value })}
                rows={3}
              />
              <Textarea
                id={`slide-visual-${activeSlide.slide}`}
                label={labels.visualCueLabel}
                value={activeSlide.visualCue}
                onChange={(event) => onUpdateSlide(selected, { visualCue: event.target.value })}
                rows={2}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-surface-elevated p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-lime">{labels.captionLabel}</p>
              <p className="mt-2 max-h-36 overflow-auto text-sm leading-relaxed text-foreground">{output.primaryPiece.caption}</p>
            </div>
            <div className="rounded-lg border border-border bg-surface-elevated p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-lime">{labels.ctaLabel}</p>
              <p className="mt-2 text-sm leading-relaxed text-foreground">{output.primaryPiece.cta}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-3 2xl:grid-cols-4">
            {output.carousel.map((slide, index) => (
              <button
                key={slide.slide}
                onClick={() => setSelected(index)}
                className={`group rounded-lg border p-1.5 text-left transition-colors ${
                  selected === index
                    ? "border-lime bg-lime/10"
                    : "border-border bg-surface-elevated hover:border-lime/40"
                }`}
              >
                <div className="overflow-hidden rounded-md bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrls[index] ?? activePreview}
                    alt={`${labels.preview} ${slide.slide}`}
                    className="aspect-[4/5] w-full object-cover transition-transform group-hover:scale-[1.02]"
                  />
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 px-0.5">
                  <span className="text-xs font-semibold text-foreground">Slide {slide.slide}</span>
                  <span className="truncate text-[11px] text-muted">{slide.type}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
      <span className="text-lime">{icon}</span>
      {title}
    </div>
  );
}

function VariantCard({ variant }: { variant: PremiumContentVariant }) {
  return (
    <div className="min-h-56 rounded-lg border border-border bg-surface-elevated p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-lime">{variant.label}</p>
      <p className="mt-2 text-sm text-muted">{variant.angle}</p>
      <p className="mt-3 text-sm font-semibold text-foreground">{variant.hook}</p>
      <p className="mt-3 text-sm leading-relaxed text-foreground">{variant.caption}</p>
      <p className="mt-3 text-sm font-medium text-lime">{variant.cta}</p>
    </div>
  );
}

function StorySlideCard({ story }: { story: PremiumStorySlide }) {
  return (
    <div className="rounded-lg border border-border bg-surface-elevated p-4">
      <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted">
        <span>Story {story.slide}</span>
        <span className="rounded-full bg-lime/10 px-2 py-0.5 text-lime">{story.type}</span>
      </div>
      <p className="text-sm leading-relaxed text-foreground">{story.text}</p>
      <p className="mt-2 text-xs text-muted">{story.sticker}</p>
      <p className="mt-2 text-sm font-medium text-lime">{story.cta}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-lime">{label}</p>
      <p className="mt-1 leading-relaxed text-foreground">{value}</p>
    </div>
  );
}

function ReviewList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-border bg-surface-elevated p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-lime">{title}</p>
      <ul className="mt-3 space-y-2">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="text-sm leading-relaxed text-foreground">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatPrimaryPiece(output: PremiumGeneratedContent) {
  return [
    `Hook: ${output.primaryPiece.hook}`,
    `Caption:\n${output.primaryPiece.caption}`,
    `CTA: ${output.primaryPiece.cta}`,
    `Guion:\n${output.primaryPiece.reelScript}`,
    `Notas: ${output.primaryPiece.publishingNotes}`,
    `Hashtags: ${output.hashtags.join(" ")}`,
  ].join("\n\n");
}

function buildPackText(output: PremiumGeneratedContent) {
  return [
    `Título: ${output.primaryPiece.title}`,
    `Plantilla: ${output.contentRoute.templateName} (${output.contentRoute.templateId})`,
    `Concepto corto: ${output.contentRoute.topicSummary}`,
    `Patrón: ${output.contentRoute.slidePattern.join(" -> ")}`,
    `Ángulo: ${output.strategy.angle}`,
    `Promesa: ${output.strategy.promise}`,
    "",
    formatPrimaryPiece(output),
    "",
    `DM:\n${output.dmFollowUp || output.dmReplyTemplate}`,
    "",
    "Carrusel:",
    ...output.carousel.map((slide) => `${slide.slide}. ${slide.headline}\n${slide.support}\nVisual: ${slide.visualCue}`),
    "",
    "Stories:",
    ...output.stories.map((story) => `${story.slide}. ${story.text}\n${story.sticker}\n${story.cta}`),
  ].join("\n\n");
}

function buildInstagramCaption(output: PremiumGeneratedContent) {
  return [
    output.primaryPiece.caption,
    "",
    output.primaryPiece.cta,
    "",
    output.hashtags.join(" "),
  ].filter(Boolean).join("\n");
}

function downloadCarouselPngs(output: PremiumGeneratedContent) {
  output.carousel.forEach((slide, index) => {
    const canvas = renderCarouselSlide(output, slide, index);
    const link = document.createElement("a");
    link.download = `wiasocial-carousel-${String(slide.slide).padStart(2, "0")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
}

type CarouselRenderPalette = {
  accent: string;
  secondaryAccent: string;
  mutedAccent: string;
  background: string;
  surface: string;
  foreground: string;
  muted: string;
};

type TextBlockLayout = {
  x: number;
  y: number;
  width: number;
  maxSize: number;
  minSize: number;
  maxLines: number;
  lineHeightRatio: number;
};

type SlideTextLayout = {
  headline: TextBlockLayout;
  support: { x: number; y: number; width: number; fontSize: number; lineHeight: number; maxLines: number };
  cuePanel: { x: number; y: number; width: number; height: number };
  cue: { x: number; y: number; width: number; fontSize: number; lineHeight: number; maxLines: number };
};

const DISTINCT_LAYOUT_TEMPLATES = [
  "myth_busting",
  "mistake_fix",
  "checklist",
  "objection_handler",
  "case_study",
  "direct_offer",
  "educational",
  "comparison",
  "before_after",
];

function renderCarouselSlide(output: PremiumGeneratedContent, slide: PremiumCarouselSlide, index: number) {
  if (!DISTINCT_LAYOUT_TEMPLATES.includes(output.contentRoute.templateId)) {
    return renderCarouselSlideLegacy(output, slide, index);
  }

  const width = 1080;
  const height = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible");

  const primaryColors = getTemplateRenderColors(output.contentRoute.templateId, index);
  const secondaryColors = getTemplateRenderColors(output.contentRoute.templateId, index + 1);
  const palette: CarouselRenderPalette = {
    accent: primaryColors.accent,
    secondaryAccent: secondaryColors.accent,
    mutedAccent: primaryColors.mutedAccent,
    background: "#0a0a0b",
    surface: "#141416",
    foreground: "#f8fafc",
    muted: "#cbd5e1",
  };

  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, width, height);
  drawTemplateBackground(ctx, output.contentRoute.templateId, slide.type, index, width, height, palette);
  drawSlideChrome(ctx, output, slide, width, height, palette);
  drawSlideContent(
    ctx,
    slide,
    getSlideTextLayout(output.contentRoute.templateId),
    palette,
    output.primaryPiece.cta,
    index === output.carousel.length - 1
  );

  return canvas;
}

function drawTemplateBackground(
  ctx: CanvasRenderingContext2D,
  templateId: string,
  slideType: string,
  index: number,
  width: number,
  height: number,
  palette: CarouselRenderPalette
) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, palette.surface);
  gradient.addColorStop(0.55, "#111113");
  gradient.addColorStop(1, palette.mutedAccent);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 38;
  ctx.shadowOffsetY = 18;
  ctx.fillStyle = gradient;
  roundRect(ctx, 54, 54, width - 108, height - 108, 44);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  roundRect(ctx, 54, 54, width - 108, height - 108, 44);
  ctx.stroke();
  drawSubtleGrid(ctx, width, height);
  drawAccentWash(ctx, width, height, palette);

  switch (templateId) {
    case "myth_busting":
      drawSplitTension(ctx, width, height, palette, "MITO", "REALIDAD");
      break;
    case "mistake_fix":
      drawDiagnosticLayout(ctx, width, height, palette, slideType);
      break;
    case "checklist":
      drawChecklistLayout(ctx, height, palette, index);
      break;
    case "objection_handler":
      drawObjectionLayout(ctx, width, palette);
      break;
    case "case_study":
      drawEvidenceLayout(ctx, palette);
      break;
    case "direct_offer":
      drawOfferLayout(ctx, width, palette);
      break;
    case "comparison":
      drawSplitTension(ctx, width, height, palette, "OPCION A", "OPCION B");
      break;
    case "before_after":
      drawSplitTension(ctx, width, height, palette, "ANTES", "DESPUES");
      break;
    default:
      drawEditorialLayout(ctx, width, height, palette);
      break;
  }
}

function drawSlideChrome(
  ctx: CanvasRenderingContext2D,
  output: PremiumGeneratedContent,
  slide: PremiumCarouselSlide,
  width: number,
  _height: number,
  palette: CarouselRenderPalette
) {
  const templateLabel = output.contentRoute.templateName.toUpperCase().slice(0, 26);

  ctx.fillStyle = palette.accent;
  roundRect(ctx, 90, 96, 92, 54, 27);
  ctx.fill();

  ctx.fillStyle = "#050505";
  ctx.font = "800 24px Inter, Arial, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText(String(slide.slide).padStart(2, "0"), 120, 124);

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  roundRect(ctx, 200, 96, 170, 54, 27);
  ctx.fill();
  ctx.fillStyle = palette.foreground;
  ctx.font = "700 20px Inter, Arial, sans-serif";
  ctx.fillText(slide.type.toUpperCase().slice(0, 16), 224, 124);

  ctx.fillStyle = palette.muted;
  ctx.font = "700 20px Inter, Arial, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(templateLabel, width - 90, 124);
  ctx.textAlign = "left";

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.moveTo(90, 1220);
  ctx.lineTo(width - 90, 1220);
  ctx.stroke();

  ctx.fillStyle = palette.muted;
  ctx.font = "600 22px Inter, Arial, sans-serif";
  ctx.fillText("WIASocial / Content OS", 90, 1248);
  ctx.textAlign = "right";
  ctx.fillText(`${slide.slide}/${output.carousel.length}`, width - 90, 1248);
  ctx.textAlign = "left";
}

function drawSubtleGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.025)";
  ctx.lineWidth = 1;
  for (let x = 126; x < width - 90; x += 96) {
    ctx.beginPath();
    ctx.moveTo(x, 190);
    ctx.lineTo(x, height - 190);
    ctx.stroke();
  }
  for (let y = 220; y < height - 180; y += 96) {
    ctx.beginPath();
    ctx.moveTo(90, y);
    ctx.lineTo(width - 90, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawAccentWash(ctx: CanvasRenderingContext2D, width: number, height: number, palette: CarouselRenderPalette) {
  const wash = ctx.createLinearGradient(90, 220, width - 90, height - 180);
  wash.addColorStop(0, `${palette.accent}20`);
  wash.addColorStop(0.45, "rgba(255,255,255,0)");
  wash.addColorStop(1, `${palette.secondaryAccent}18`);
  ctx.fillStyle = wash;
  roundRect(ctx, 72, 72, width - 144, height - 144, 38);
  ctx.fill();
}

function drawSlideContent(
  ctx: CanvasRenderingContext2D,
  slide: PremiumCarouselSlide,
  layout: SlideTextLayout,
  palette: CarouselRenderPalette,
  actionText: string,
  isLastSlide: boolean
) {
  const headlineFont = chooseFontSize(
    ctx,
    slide.headline,
    layout.headline.width,
    layout.headline.maxSize,
    layout.headline.minSize,
    layout.headline.maxLines
  );
  ctx.fillStyle = palette.foreground;
  ctx.font = `800 ${headlineFont}px Inter, Arial, sans-serif`;
  ctx.textBaseline = "top";
  wrapText(
    ctx,
    slide.headline,
    layout.headline.x,
    layout.headline.y,
    layout.headline.width,
    headlineFont * layout.headline.lineHeightRatio,
    layout.headline.maxLines
  );

  ctx.fillStyle = palette.muted;
  ctx.font = `400 ${layout.support.fontSize}px Inter, Arial, sans-serif`;
  wrapText(
    ctx,
    slide.support,
    layout.support.x,
    layout.support.y,
    layout.support.width,
    layout.support.lineHeight,
    layout.support.maxLines
  );

  drawSlideActionBar(ctx, slide, palette, actionText, isLastSlide);
}

function makeSlideActionCopy(slide: PremiumCarouselSlide, actionText: string, isLastSlide: boolean) {
  const type = slide.type.toLowerCase();
  if ((isLastSlide || type.includes("cta")) && actionText) return actionText;

  const copyByType: Record<string, string> = {
    cover: "Desliza para ver el criterio antes de decidir.",
    pain: "El problema no es interés: es falta de siguiente paso.",
    offer: "La oferta debe sentirse como respuesta, no como presión.",
    proof: "La confianza sube cuando la prueba es concreta.",
    "why-now": "No fuerces urgencia falsa: explica el coste de esperar.",
    objection: "Una buena objeción se responde con calma y prueba.",
    reframe: "Cambia el marco antes de pedir una acción.",
    "safe-next-step": "Haz que el siguiente paso sea fácil de aceptar.",
    myth: "Primero nombra la creencia que bloquea la decisión.",
    reality: "Después enseña la versión más precisa y útil.",
    mistake: "El error debe reconocerse en dos segundos.",
    fix: "La solución tiene que ser concreta y accionable.",
    cta: "Guarda, responde o reserva: una sola acción clara.",
  };

  return copyByType[type] || "Guarda esta idea para revisar el siguiente paso.";
}

function drawSlideActionBar(
  ctx: CanvasRenderingContext2D,
  slide: PremiumCarouselSlide,
  palette: Pick<CarouselRenderPalette, "accent" | "foreground" | "muted">,
  actionText: string,
  isLastSlide: boolean
) {
  const label = isLastSlide || slide.type.toLowerCase().includes("cta") ? "SIGUIENTE PASO" : "IDEA CLAVE";
  const copy = makeSlideActionCopy(slide, actionText, isLastSlide);

  ctx.fillStyle = "rgba(255,255,255,0.09)";
  roundRect(ctx, 90, 1060, 900, 138, 28);
  ctx.fill();

  ctx.fillStyle = palette.accent;
  roundRect(ctx, 112, 1084, 10, 90, 5);
  ctx.fill();

  ctx.fillStyle = palette.accent;
  ctx.font = "800 23px Inter, Arial, sans-serif";
  ctx.fillText(label, 146, 1088);

  ctx.fillStyle = palette.foreground;
  ctx.font = "600 32px Inter, Arial, sans-serif";
  wrapText(ctx, copy, 146, 1128, 800, 40, 2);
}

function getSlideTextLayout(templateId: string): SlideTextLayout {
  const base: SlideTextLayout = {
    headline: { x: 90, y: 310, width: 880, maxSize: 92, minSize: 48, maxLines: 5, lineHeightRatio: 1.1 },
    support: { x: 92, y: 760, width: 850, fontSize: 36, lineHeight: 48, maxLines: 6 },
    cuePanel: { x: 90, y: 1070, width: 900, height: 128 },
    cue: { x: 124, y: 1140, width: 828, fontSize: 28, lineHeight: 36, maxLines: 2 },
  };

  switch (templateId) {
    case "checklist":
      return {
        headline: { x: 222, y: 292, width: 720, maxSize: 84, minSize: 44, maxLines: 5, lineHeightRatio: 1.08 },
        support: { x: 224, y: 748, width: 720, fontSize: 34, lineHeight: 46, maxLines: 6 },
        cuePanel: base.cuePanel,
        cue: base.cue,
      };
    case "direct_offer":
      return {
        headline: { x: 90, y: 270, width: 880, maxSize: 94, minSize: 50, maxLines: 5, lineHeightRatio: 1.08 },
        support: { x: 92, y: 720, width: 850, fontSize: 38, lineHeight: 50, maxLines: 5 },
        cuePanel: { x: 90, y: 1048, width: 900, height: 150 },
        cue: { x: 124, y: 1124, width: 828, fontSize: 30, lineHeight: 38, maxLines: 2 },
      };
    case "objection_handler":
      return {
        headline: { x: 130, y: 340, width: 820, maxSize: 86, minSize: 46, maxLines: 5, lineHeightRatio: 1.1 },
        support: { x: 132, y: 780, width: 810, fontSize: 34, lineHeight: 46, maxLines: 5 },
        cuePanel: base.cuePanel,
        cue: base.cue,
      };
    case "comparison":
    case "before_after":
      return {
        headline: { x: 90, y: 258, width: 880, maxSize: 88, minSize: 46, maxLines: 5, lineHeightRatio: 1.08 },
        support: { x: 92, y: 730, width: 850, fontSize: 35, lineHeight: 47, maxLines: 5 },
        cuePanel: base.cuePanel,
        cue: base.cue,
      };
    case "case_study":
      return {
        headline: { x: 90, y: 286, width: 880, maxSize: 88, minSize: 48, maxLines: 5, lineHeightRatio: 1.08 },
        support: { x: 92, y: 700, width: 850, fontSize: 35, lineHeight: 47, maxLines: 5 },
        cuePanel: base.cuePanel,
        cue: base.cue,
      };
    default:
      return base;
  }
}

function drawSplitTension(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: CarouselRenderPalette,
  leftLabel: string,
  rightLabel: string
) {
  ctx.fillStyle = "rgba(255,255,255,0.045)";
  roundRect(ctx, 90, 194, 424, 832, 34);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.025)";
  roundRect(ctx, 566, 194, 424, 832, 34);
  ctx.fill();
  ctx.fillStyle = palette.accent;
  ctx.font = "800 24px Inter, Arial, sans-serif";
  ctx.fillText(leftLabel, 124, 238);
  ctx.fillStyle = palette.secondaryAccent;
  ctx.textAlign = "right";
  ctx.fillText(rightLabel, width - 124, 238);
  ctx.textAlign = "left";
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.moveTo(width / 2, 220);
  ctx.lineTo(width / 2, height - 250);
  ctx.stroke();
}

function drawDiagnosticLayout(ctx: CanvasRenderingContext2D, width: number, _height: number, palette: CarouselRenderPalette, slideType: string) {
  ctx.fillStyle = "rgba(249,115,22,0.12)";
  roundRect(ctx, 90, 210, width - 180, 112, 24);
  ctx.fill();
  ctx.fillStyle = palette.accent;
  ctx.font = "800 28px Inter, Arial, sans-serif";
  ctx.fillText(slideType.toUpperCase(), 124, 250);
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? palette.accent : "rgba(255,255,255,0.1)";
    roundRect(ctx, 90 + i * 184, 994, 132, 14, 7);
    ctx.fill();
  }
}

function drawChecklistLayout(ctx: CanvasRenderingContext2D, height: number, palette: CarouselRenderPalette, index: number) {
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  roundRect(ctx, 90, 214, 92, height - 384, 46);
  ctx.fill();
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = i <= index % 5 ? palette.accent : "rgba(255,255,255,0.12)";
    roundRect(ctx, 112, 278 + i * 132, 48, 48, 24);
    ctx.fill();
  }
}

function drawObjectionLayout(ctx: CanvasRenderingContext2D, width: number, palette: CarouselRenderPalette) {
  ctx.fillStyle = "rgba(255,255,255,0.055)";
  roundRect(ctx, 98, 244, width - 196, 726, 54);
  ctx.fill();
  ctx.fillStyle = palette.accent;
  ctx.font = "900 150px Inter, Arial, sans-serif";
  ctx.fillText("?", width - 224, 360);
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  roundRect(ctx, 122, 268, width - 244, 678, 44);
  ctx.stroke();
}

function drawEvidenceLayout(ctx: CanvasRenderingContext2D, palette: CarouselRenderPalette) {
  ["ANTES", "PROCESO", "RESULTADO"].forEach((label, index) => {
    ctx.fillStyle = "rgba(255,255,255,0.055)";
    roundRect(ctx, 90 + index * 304, 874, 268, 120, 26);
    ctx.fill();
    ctx.fillStyle = index === 2 ? palette.accent : palette.muted;
    ctx.font = "800 22px Inter, Arial, sans-serif";
    ctx.fillText(label, 116 + index * 304, 918);
  });
}

function drawOfferLayout(ctx: CanvasRenderingContext2D, width: number, palette: CarouselRenderPalette) {
  ctx.fillStyle = "rgba(163,230,53,0.08)";
  roundRect(ctx, 90, 214, width - 180, 108, 30);
  ctx.fill();
  ctx.fillStyle = palette.accent;
  ctx.font = "800 24px Inter, Arial, sans-serif";
  ctx.fillText("OFERTA CLARA -> SIGUIENTE PASO", 124, 254);
}

function drawEditorialLayout(ctx: CanvasRenderingContext2D, width: number, height: number, palette: CarouselRenderPalette) {
  ctx.fillStyle = palette.accent;
  roundRect(ctx, 90, 220, 12, height - 430, 6);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.045)";
  roundRect(ctx, width - 292, 232, 202, 202, 38);
  ctx.fill();
}

function renderCarouselSlideLegacy(output: PremiumGeneratedContent, slide: PremiumCarouselSlide, index: number) {
  const width = 1080;
  const height = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible");

  const { accent, mutedAccent } = getTemplateRenderColors(output.contentRoute.templateId, index);
  const background = "#0a0a0b";
  const surface = "#141416";
  const foreground = "#f8fafc";
  const muted = "#cbd5e1";

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, surface);
  gradient.addColorStop(0.55, "#111113");
  gradient.addColorStop(1, mutedAccent);
  ctx.fillStyle = gradient;
  roundRect(ctx, 54, 54, width - 108, height - 108, 44);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  roundRect(ctx, 54, 54, width - 108, height - 108, 44);
  ctx.stroke();

  ctx.fillStyle = accent;
  roundRect(ctx, 90, 96, 180, 54, 27);
  ctx.fill();

  ctx.fillStyle = "#050505";
  ctx.font = "700 26px Inter, Arial, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText(`SLIDE ${slide.slide}`, 122, 124);

  ctx.fillStyle = muted;
  ctx.font = "600 24px Inter, Arial, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(output.strategy.recommendedFormat.toUpperCase(), width - 90, 124);
  ctx.textAlign = "left";

  const headlineFont = chooseFontSize(ctx, slide.headline, 880, 92, 48, 5);
  ctx.fillStyle = foreground;
  ctx.font = `800 ${headlineFont}px Inter, Arial, sans-serif`;
  ctx.textBaseline = "top";
  wrapText(ctx, slide.headline, 90, 310, 880, headlineFont * 1.1, 5);

  ctx.fillStyle = muted;
  ctx.font = "400 36px Inter, Arial, sans-serif";
  wrapText(ctx, slide.support, 92, 760, 850, 48, 6);

  drawSlideActionBar(
    ctx,
    slide,
    { accent, foreground, muted },
    output.primaryPiece.cta,
    index === output.carousel.length - 1
  );

  ctx.fillStyle = muted;
  ctx.font = "600 22px Inter, Arial, sans-serif";
  ctx.fillText("WIASocial", 90, 1248);
  ctx.textAlign = "right";
  ctx.fillText(`${slide.slide}/${output.carousel.length}`, width - 90, 1248);
  ctx.textAlign = "left";

  return canvas;
}

function chooseFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxSize: number,
  minSize: number,
  maxLines: number
) {
  for (let size = maxSize; size >= minSize; size -= 2) {
    ctx.font = `800 ${size}px Inter, Arial, sans-serif`;
    const longest = text.split(/\s+/).reduce((current, word) => Math.max(current, ctx.measureText(word).width), 0);
    if (longest <= maxWidth && measureWrappedLines(ctx, text, maxWidth).length <= maxLines) return size;
  }
  return minSize;
}

function measureWrappedLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = word;
  }

  if (line) lines.push(line);
  return lines;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
) {
  const lines = measureWrappedLines(ctx, text, maxWidth);
  const visibleLines = lines.slice(0, maxLines);

  if (lines.length > maxLines && visibleLines.length > 0) {
    const lastIndex = visibleLines.length - 1;
    visibleLines[lastIndex] = fitLineWithEllipsis(ctx, visibleLines[lastIndex], maxWidth);
  }

  visibleLines.forEach((item, index) => {
    ctx.fillText(item, x, y + index * lineHeight);
  });
}

function fitLineWithEllipsis(ctx: CanvasRenderingContext2D, line: string, maxWidth: number) {
  const suffix = "...";
  let result = line.replace(/[.,;:!?]$/, "");

  while (result.length > 0 && ctx.measureText(`${result}${suffix}`).width > maxWidth) {
    result = result.slice(0, -1).trimEnd();
  }

  return `${result}${suffix}`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function normalizePremiumContent(value: unknown): PremiumGeneratedContent {
  const source = asRecord(value);
  const primary = asRecord(source.primaryPiece);
  const strategy = asRecord(source.strategy);
  const visual = asRecord(source.visualDirection);
  const review = asRecord(source.qualityReview);

  const hook = asString(source.hook) || asString(primary.hook);
  const reelScript = asString(source.reelScript) || asString(primary.reelScript);
  const caption = asString(source.caption) || asString(primary.caption);
  const cta = asString(source.cta) || asString(primary.cta);
  const storySequence = asStringArray(source.storySequence);
  const dmReplyTemplate = asString(source.dmReplyTemplate) || asString(source.dmFollowUp);
  const contentRoute = normalizeContentRoute(source.contentRoute, {
    topic: asString(primary.title) || hook || caption,
    offer: caption,
    goal: "leads",
  });

  return {
    hook,
    reelScript,
    caption,
    cta,
    hashtags: asStringArray(source.hashtags),
    storySequence,
    dmReplyTemplate,
    contentRoute,
    strategy: {
      angle: asString(strategy.angle) || "Ángulo pendiente de refinar",
      promise: asString(strategy.promise) || "Promesa pendiente de refinar",
      audiencePain: asString(strategy.audiencePain) || "",
      conversionIntent: asString(strategy.conversionIntent) || "Generar conversación cualificada",
      recommendedFormat: normalizeFormat(strategy.recommendedFormat),
      whyThisWillWork: asString(strategy.whyThisWillWork) || "La pieza conecta problema, oferta y acción comercial.",
    },
    primaryPiece: {
      title: asString(primary.title) || hook || "Pieza de Instagram",
      hook,
      caption,
      cta,
      reelScript,
      publishingNotes: asString(primary.publishingNotes) || "Revisar longitud final antes de publicar.",
    },
    variants: normalizeVariants(source.variants, hook, caption, cta),
    carousel: normalizeCarousel(source.carousel, hook, cta),
    stories: normalizeStories(source.stories, storySequence, cta),
    dmFollowUp: asString(source.dmFollowUp) || dmReplyTemplate,
    visualDirection: {
      template: asString(visual.template) || contentRoute.templateName,
      mood: asString(visual.mood) || "Profesional, claro y orientado a conversión",
      palette: asStringArray(visual.palette, [contentRoute.templateName, "negro", "alto contraste"]),
      coverIdea: asString(visual.coverIdea) || hook,
      assetPrompts: asStringArray(visual.assetPrompts, ["Fondo editorial limpio con alto contraste y espacio para titular."]),
    },
    qualityReview: {
      score: normalizeScore(review.score),
      strengths: asStringArray(review.strengths, ["Tiene una promesa clara."]),
      risks: asStringArray(review.risks, ["Revisar claims específicos antes de publicar."]),
      improvements: asStringArray(review.improvements, ["Ajustar el ejemplo al caso real del negocio."]),
    },
  };
}

function normalizeVariants(value: unknown, hook: string, caption: string, cta: string): PremiumContentVariant[] {
  const items = Array.isArray(value) ? value : [];
  const variants = items.map((item, index) => {
    const row = asRecord(item);
    return {
      label: asString(row.label) || `Variante ${index + 1}`,
      angle: asString(row.angle) || "Ángulo alternativo",
      hook: asString(row.hook) || hook,
      caption: asString(row.caption) || caption,
      cta: asString(row.cta) || cta,
    };
  });
  if (variants.length) return variants.slice(0, 3);
  return [
    { label: "Directa", angle: "Más comercial", hook, caption, cta },
    { label: "Educativa", angle: "Más didáctica", hook, caption, cta },
    { label: "Emocional", angle: "Más aspiracional", hook, caption, cta },
  ];
}

function normalizeCarousel(value: unknown, hook: string, cta: string): PremiumCarouselSlide[] {
  const items = Array.isArray(value) ? value : [];
  const slides = items.map((item, index) => {
    const row = asRecord(item);
    return {
      slide: Number(row.slide) || index + 1,
      type: normalizeCarouselType(row.type),
      headline: asString(row.headline) || (index === 0 ? hook : `Idea ${index + 1}`),
      support: asString(row.support),
      visualCue: asString(row.visualCue) || "Diseño limpio con jerarquía fuerte.",
    };
  });
  if (slides.length) return slides.slice(0, 8);
  return [
    { slide: 1, type: "cover", headline: hook || "Idea principal", support: "", visualCue: "Portada con titular protagonista." },
    { slide: 2, type: "cta", headline: cta || "Siguiente paso", support: "", visualCue: "Cierre claro con CTA visible." },
  ];
}

function normalizeStories(value: unknown, fallback: string[], cta: string): PremiumStorySlide[] {
  const items = Array.isArray(value) ? value : [];
  const stories = items.map((item, index) => {
    const row = asRecord(item);
    return {
      slide: Number(row.slide) || index + 1,
      type: normalizeStoryType(row.type),
      text: asString(row.text) || fallback[index] || "",
      sticker: asString(row.sticker) || "Pregunta",
      cta: asString(row.cta) || cta,
    };
  });
  if (stories.length) return stories.slice(0, 5);
  return fallback.slice(0, 5).map((text, index) => ({
    slide: index + 1,
    type: index === 0 ? "hook" : index === 4 ? "cta" : "context",
    text,
    sticker: index === 4 ? "DM" : "Pregunta",
    cta,
  }));
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown, fallback: string[] = []): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => asString(item)).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return fallback;
}

function normalizeFormat(value: unknown): ContentFormat {
  return value === "reel" || value === "carousel" || value === "stories" || value === "post" ? value : "carousel";
}

function normalizeCarouselType(value: unknown): PremiumCarouselSlide["type"] {
  return asString(value) || "insight";
}

function normalizeStoryType(value: unknown): PremiumStorySlide["type"] {
  return value === "hook" || value === "context" || value === "proof" || value === "engagement" || value === "cta" ? value : "context";
}

function normalizeScore(value: unknown): number {
  const score = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(score)) return 70;
  return Math.max(0, Math.min(100, Math.round(score)));
}
