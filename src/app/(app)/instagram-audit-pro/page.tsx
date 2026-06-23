"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ClipboardCheck,
  Loader2,
  Download,
  Sparkles,
  History,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/PageHeader";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { useAuth } from "@/contexts/AuthContext";
import { fetchSettings } from "@/lib/db";
import { runInstagramAudit, fetchAuditHistory, fetchAuditById } from "@/lib/audit-client";
import {
  buildAuditExportMarkdown,
  progressBarColor,
  scoreColor,
  scoreInstagramProfile,
} from "@/lib/audit-scoring";
import { DEMO_AUDIT_INPUT, type AuditAIReport, type AuditProfileInput, type AuditScoringResult } from "@/types/audit";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const defaultInput: AuditProfileInput = {
  displayName: "",
  username: "",
  profilePhotoQuality: "casual",
  bio: "",
  bioLink: "",
  ctaInBio: "",
  hasHighlights: false,
  highlightNames: "",
  postsPerWeek: 2,
  contentTypes: ["reel"],
  hasAuthorityContent: false,
  hasConversionContent: false,
  offerClarity: "vague",
  estimatedEngagement: "",
  niche: "",
};

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className={cn("font-semibold", scoreColor(score))}>{score}</span>
      </div>
      <div className="h-2 rounded-full bg-surface-elevated overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", progressBarColor(score))} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function AuditResults({
  input,
  scores,
  aiReport,
  onExport,
  locale,
}: {
  input: AuditProfileInput;
  scores: AuditScoringResult;
  aiReport: AuditAIReport | null;
  onExport: () => void;
  locale: string;
}) {
  const es = locale === "es";
  const subscoreLabels: Record<string, string> = es
    ? { branding: "Branding", bio: "Bio", content: "Contenido", conversion: "Conversión", authority: "Autoridad", consistency: "Consistencia" }
    : { branding: "Branding", bio: "Bio", content: "Content", conversion: "Conversion", authority: "Authority", consistency: "Consistency" };

  return (
    <div className="space-y-6 mt-8">
      <Card glow className="text-center py-8">
        <p className="text-sm text-muted mb-2">Instagram Growth Score</p>
        <p className={cn("text-6xl font-bold", scoreColor(scores.growthScore))}>{scores.growthScore}</p>
        <p className="text-muted text-sm mt-2">/ 100 — @{input.username.replace("@", "")}</p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(Object.entries(scores.subscores) as [keyof typeof scores.subscores, number][]).map(([key, value]) => (
          <Card key={key} className="!p-4">
            <ScoreBar label={subscoreLabels[key]} score={value} />
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={es ? "Qué está bien" : "What's working"} action={<CheckCircle2 className="h-5 w-5 text-lime" />} />
          {scores.strengths.length === 0 ? (
            <p className="text-sm text-muted">{es ? "Sin fortalezas claras detectadas." : "No clear strengths detected."}</p>
          ) : (
            <ul className="space-y-2">{scores.strengths.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm"><span className="text-lime">✓</span>{s}</li>
            ))}</ul>
          )}
        </Card>
        <Card>
          <CardHeader title={es ? "Errores detectados" : "Issues detected"} action={<XCircle className="h-5 w-5 text-red-400" />} />
          <ul className="space-y-2">
            {scores.issues.map((issue) => (
              <li key={issue.id} className="flex items-start gap-2 text-sm">
                <Badge className={issue.severity === "critical" ? "bg-red-500/20 text-red-400 border-red-500/30 shrink-0" : "bg-amber-500/20 text-amber-400 border-amber-500/30 shrink-0"}>
                  -{issue.pointsDeducted}
                </Badge>
                <span>{issue.message}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader title={es ? "Cambios inmediatos" : "Immediate changes"} action={<AlertTriangle className="h-5 w-5 text-amber-400" />} />
        <ol className="space-y-2 list-decimal list-inside text-sm">
          {scores.priorities.map((p, i) => <li key={i}>{p}</li>)}
        </ol>
      </Card>

      {aiReport && (
        <>
          <Card>
            <CardHeader title={es ? "Informe profesional (IA)" : "Professional report (AI)"} />
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{aiReport.generalDiagnosis}</p>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title={es ? "Nueva bio propuesta" : "Proposed bio"} />
              <p className="text-sm whitespace-pre-wrap">{aiReport.proposedBio}</p>
            </Card>
            <Card>
              <CardHeader title={es ? "Foto de perfil" : "Profile photo"} />
              <p className="text-sm">{aiReport.profilePhotoRecommendation}</p>
            </Card>
            <Card>
              <CardHeader title={es ? "Destacados recomendados" : "Recommended highlights"} />
              <p className="text-sm">{aiReport.highlightsRecommendation}</p>
            </Card>
            <Card>
              <CardHeader title={es ? "Errores principales" : "Main errors"} />
              <ul className="space-y-1 text-sm">{aiReport.mainErrors.map((e, i) => <li key={i}>• {e}</li>)}</ul>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader title={es ? "5 ideas de contenido" : "5 content ideas"} />
              <ol className="space-y-2 text-sm list-decimal list-inside">{aiReport.contentIdeas.map((idea, i) => <li key={i}>{idea}</li>)}</ol>
            </Card>
            <Card>
              <CardHeader title={es ? "5 hooks para Reels" : "5 Reel hooks"} />
              <ol className="space-y-2 text-sm list-decimal list-inside">{aiReport.reelHooks.map((h, i) => <li key={i}>{h}</li>)}</ol>
            </Card>
            <Card>
              <CardHeader title={es ? "5 CTA comerciales" : "5 commercial CTAs"} />
              <ol className="space-y-2 text-sm list-decimal list-inside">{aiReport.commercialCTAs.map((c, i) => <li key={i}>{c}</li>)}</ol>
            </Card>
          </div>

          <Card>
            <CardHeader title={es ? "Plan de acción 7 días" : "7-day action plan"} />
            <ol className="space-y-2 text-sm">{aiReport.sevenDayPlan.map((day, i) => (
              <li key={i} className="rounded-lg bg-surface-elevated p-3"><span className="text-lime font-medium">Día {i + 1}:</span> {day}</li>
            ))}</ol>
          </Card>
        </>
      )}

      <div className="flex flex-wrap gap-3">
        <Button onClick={onExport} variant="secondary"><Download className="h-4 w-4" />{es ? "Exportar auditoría" : "Export audit"}</Button>
        <Link href={`/content-series?idea=${encodeURIComponent(input.niche || "Instagram growth")}`}>
          <Button><Sparkles className="h-4 w-4" />{es ? "Generar plan de contenido" : "Generate content plan"}</Button>
        </Link>
      </div>
    </div>
  );
}

export default function InstagramAuditProPage() {
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const es = locale === "es";

  const [input, setInput] = useState<AuditProfileInput>(defaultInput);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    input: AuditProfileInput;
    scores: AuditScoringResult;
    aiReport: AuditAIReport | null;
  } | null>(null);
  const [history, setHistory] = useState<{ id: string; instagram_username: string; growth_score: number; created_at: string }[]>([]);
  const [showManual, setShowManual] = useState(true);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    try {
      setHistory(await fetchAuditHistory());
    } catch {
      setHistory([]);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchSettings(user.id).then((s) => {
      if (s) {
        setInput((prev) => ({
          ...prev,
          displayName: s.brandName || prev.displayName,
          username: s.instagramHandle || prev.username,
          niche: s.niche || prev.niche,
          bio: prev.bio || `${s.brandName} | ${s.offer}`,
          offerClarity: s.offer ? "vague" : "none",
        }));
      }
    });
    loadHistory();
  }, [user, loadHistory]);

  const handleRun = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await runInstagramAudit(input, locale);
      setResult({ input: data.inputData, scores: data.scores, aiReport: data.aiReport });
      await loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    setResult({ input, scores: scoreInstagramProfile(input), aiReport: null });
  };

  const handleLoadDemo = () => {
    setInput(DEMO_AUDIT_INPUT);
    setShowManual(true);
  };

  const handleExport = () => {
    if (!result) return;
    const md = buildAuditExportMarkdown(result.input, result.scores, result.aiReport);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `instagram-audit-${result.input.username.replace("@", "")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadPastAudit = async (id: string) => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAuditById(id);
      setInput(data.inputData);
      setResult({ input: data.inputData, scores: data.scores, aiReport: data.aiReport });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const photoOptions = [
    { value: "professional", label: es ? "Profesional" : "Professional" },
    { value: "casual", label: es ? "Casual" : "Casual" },
    { value: "unclear", label: es ? "Poco clara" : "Unclear" },
    { value: "missing", label: es ? "Sin foto / mala" : "Missing / poor" },
  ];

  const offerOptions = [
    { value: "clear", label: es ? "Clara" : "Clear" },
    { value: "vague", label: es ? "Vaga" : "Vague" },
    { value: "none", label: es ? "No hay oferta" : "No offer" },
  ];

  return (
    <div>
      <PageHeader
        title={t.instagramAuditPro.title}
        description={t.instagramAuditPro.description}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleLoadDemo}>{es ? "Cargar demo" : "Load demo"}</Button>
            <Button onClick={handleRun} disabled={loading || !input.username.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
              {t.instagramAuditPro.runAudit}
            </Button>
          </div>
        }
      />

      {error && (
        <Card className="mb-6 border-red-500/30 bg-red-500/5">
          <p className="text-sm text-red-400">{error}</p>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader
              title={es ? "Datos del perfil" : "Profile data"}
              description={es ? "Introduce el usuario o completa los datos manualmente" : "Enter username or fill data manually"}
              action={
                <button type="button" onClick={() => setShowManual(!showManual)} className="text-xs text-lime hover:underline">
                  {showManual ? (es ? "Modo rápido" : "Quick mode") : (es ? "Modo completo" : "Full mode")}
                </button>
              }
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input id="username" label={es ? "Usuario Instagram" : "Instagram username"} value={input.username} onChange={(e) => setInput({ ...input, username: e.target.value })} placeholder="@tuusuario" />
              <Input id="displayName" label={es ? "Nombre del perfil" : "Profile name"} value={input.displayName} onChange={(e) => setInput({ ...input, displayName: e.target.value })} />
              <Input id="niche" label={t.common.niche} value={input.niche} onChange={(e) => setInput({ ...input, niche: e.target.value })} />
              <Input id="engagement" label={es ? "Engagement estimado" : "Estimated engagement"} value={input.estimatedEngagement} onChange={(e) => setInput({ ...input, estimatedEngagement: e.target.value })} placeholder="2.5%" />
            </div>

            {showManual && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Textarea id="bio" label="Bio" value={input.bio} onChange={(e) => setInput({ ...input, bio: e.target.value })} rows={3} />
                </div>
                <Input id="bioLink" label={es ? "Link en bio" : "Bio link"} value={input.bioLink} onChange={(e) => setInput({ ...input, bioLink: e.target.value })} />
                <Input id="cta" label="CTA" value={input.ctaInBio} onChange={(e) => setInput({ ...input, ctaInBio: e.target.value })} />
                <Select id="photo" label={es ? "Foto de perfil" : "Profile photo"} value={input.profilePhotoQuality} onChange={(e) => setInput({ ...input, profilePhotoQuality: e.target.value as AuditProfileInput["profilePhotoQuality"] })} options={photoOptions} />
                <Select id="offer" label={es ? "Claridad de oferta" : "Offer clarity"} value={input.offerClarity} onChange={(e) => setInput({ ...input, offerClarity: e.target.value as AuditProfileInput["offerClarity"] })} options={offerOptions} />
                <Input id="posts" label={es ? "Posts por semana" : "Posts per week"} type="number" min={0} max={21} value={String(input.postsPerWeek)} onChange={(e) => setInput({ ...input, postsPerWeek: Number(e.target.value) })} />
                <Input id="highlights" label={es ? "Destacados (nombres)" : "Highlights"} value={input.highlightNames} onChange={(e) => setInput({ ...input, highlightNames: e.target.value, hasHighlights: e.target.value.length > 0 })} placeholder={es ? "Mentorías, Testimonios, FAQ" : "Coaching, Testimonials, FAQ"} />
                <div className="sm:col-span-2 flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={input.hasHighlights} onChange={(e) => setInput({ ...input, hasHighlights: e.target.checked })} />{es ? "Tiene destacados" : "Has highlights"}</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={input.hasAuthorityContent} onChange={(e) => setInput({ ...input, hasAuthorityContent: e.target.checked })} />{es ? "Contenido de autoridad" : "Authority content"}</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={input.hasConversionContent} onChange={(e) => setInput({ ...input, hasConversionContent: e.target.checked })} />{es ? "Contenido de conversión" : "Conversion content"}</label>
                </div>
                <div className="sm:col-span-2">
                  <Input id="contentTypes" label={es ? "Tipos de contenido (separados por coma)" : "Content types (comma separated)"} value={input.contentTypes.join(", ")} onChange={(e) => setInput({ ...input, contentTypes: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} placeholder="reel, carousel, story" />
                </div>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <Button variant="ghost" onClick={handlePreview}>{es ? "Vista previa scores" : "Preview scores"}</Button>
            </div>
          </Card>

          {loading && (
            <Card className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-lime mb-4" />
              <p className="text-muted">{es ? "Analizando perfil como director de marketing..." : "Analyzing profile as marketing director..."}</p>
            </Card>
          )}

          {!loading && result && (
            <AuditResults input={result.input} scores={result.scores} aiReport={result.aiReport} onExport={handleExport} locale={locale} />
          )}

          {!loading && !result && (
            <EmptyState
              icon={<ClipboardCheck className="h-6 w-6" />}
              title={t.instagramAuditPro.emptyTitle}
              description={t.instagramAuditPro.emptyDesc}
            />
          )}
        </div>

        <div>
          <Card>
            <CardHeader title={es ? "Historial" : "History"} action={<History className="h-5 w-5 text-lime" />} />
            {history.length === 0 ? (
              <p className="text-sm text-muted py-4 text-center">{es ? "Sin auditorías guardadas" : "No saved audits"}</p>
            ) : (
              <div className="space-y-2">
                {history.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => loadPastAudit(item.id)}
                    className="w-full rounded-lg border border-border bg-surface-elevated p-3 text-left hover:border-lime/30 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm">@{item.instagram_username}</span>
                      <span className={cn("font-bold", scoreColor(item.growth_score))}>{item.growth_score}</span>
                    </div>
                    <p className="text-xs text-muted mt-1">{formatDate(item.created_at, locale)}</p>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
