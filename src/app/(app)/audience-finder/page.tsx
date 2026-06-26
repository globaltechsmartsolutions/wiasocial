"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  Compass,
  Loader2,
  MessageCircle,
  Plus,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { createLead } from "@/lib/db";
import {
  fetchAudienceFinder,
  generateAudienceFinder,
  type AudienceFinderResponse,
} from "@/lib/ai-client";
import type { PotentialFollowerCandidate } from "@/types/audience-finder";
import { cn, formatDate } from "@/lib/utils";

const interestClasses: Record<PotentialFollowerCandidate["interestLevel"], string> = {
  high: "bg-lime/20 text-lime border-lime/30",
  medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  low: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function AudienceFinderPage() {
  const { user } = useAuth();
  const { locale } = useTranslation();
  const es = locale === "es";
  const [response, setResponse] = useState<AudienceFinderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedUsernames, setSavedUsernames] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({
    niche: "",
    goal: es ? "ganar seguidores cualificados" : "gain qualified followers",
    similarAccounts: "",
    keywords: "",
    observedUsers: "",
    notes: "",
  });

  useEffect(() => {
    if (!user) return;
    async function load() {
      setLoading(true);
      try {
        const data = await fetchAudienceFinder();
        setResponse(data);
        const input = data.input as Partial<typeof form> | null | undefined;
        if (input) {
          setForm((prev) => ({
            ...prev,
            niche: typeof input.niche === "string" ? input.niche : prev.niche,
            goal: typeof input.goal === "string" ? input.goal : prev.goal,
            similarAccounts: Array.isArray(input.similarAccounts) ? input.similarAccounts.join("\n") : prev.similarAccounts,
            keywords: Array.isArray(input.keywords) ? input.keywords.join(", ") : prev.keywords,
            observedUsers: Array.isArray(input.observedUsers) ? input.observedUsers.join("\n") : prev.observedUsers,
            notes: typeof input.notes === "string" ? input.notes : prev.notes,
          }));
        }
      } catch {
        setResponse(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const generate = async () => {
    setError(null);
    setGenerating(true);
    try {
      const data = await generateAudienceFinder(form, locale);
      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setGenerating(false);
    }
  };

  const saveCandidateAsLead = async (candidate: PotentialFollowerCandidate) => {
    if (!user || !candidate.username) return;
    await createLead(user.id, {
      username: candidate.username,
      fullName: candidate.displayName,
      niche: response?.report?.niche ?? form.niche,
      source: "Audience Finder IA",
      status: "new",
      notes: `${candidate.correlationReason}\n\nAccion: ${candidate.recommendedAction}`,
      followUpDate: null,
    });
    setSavedUsernames((prev) => ({ ...prev, [candidate.username as string]: true }));
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-lime" /></div>;
  }

  const report = response?.report ?? null;

  return (
    <div>
      <PageHeader
        title={es ? "Buscador IA de Seguidores Potenciales" : "AI Potential Follower Finder"}
        description={
          es
            ? "Detecta perfiles y segmentos con alta afinidad por tu nicho usando señales públicas/manuales y estrategia de marketing."
            : "Find profiles and segments likely to care about your niche using public/manual signals and marketing strategy."
        }
        action={
          <Button onClick={generate} disabled={generating || !form.niche.trim()}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {es ? "Generar radar" : "Generate radar"}
          </Button>
        }
      />

      <Card className="mb-6 border-lime/20 bg-lime/5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-lime" />
          <p className="text-sm text-muted">
            {es
              ? "Esta función no usa bots ni datos privados. Si pegas usuarios observados manualmente en comentarios públicos, la IA los puntuará; si no, generará segmentos y perfiles tipo sin inventar cuentas reales."
              : "This feature does not use bots or private data. If you paste manually observed users from public comments, AI scores them; otherwise it creates segments and archetypes without inventing real accounts."}
          </p>
        </div>
      </Card>

      {error && (
        <Card className="mb-6 border-red-500/30 bg-red-500/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            <div>
              <p className="font-medium text-red-300">{es ? "No pude generar el radar" : "Could not generate radar"}</p>
              <p className="mt-1 text-sm text-muted">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {response?.persistenceWarning && (
        <Card className="mb-6 border-amber-500/30 bg-amber-500/10">
          <p className="text-sm text-amber-100">{response.persistenceWarning}</p>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader
            title={es ? "Brief de búsqueda" : "Search brief"}
            description={es ? "Define el nicho y las fuentes legales para encontrar afinidad." : "Define the niche and legal sources for affinity scoring."}
          />
          <div className="space-y-4">
            <Input
              id="niche"
              label={es ? "Nicho específico" : "Specific niche"}
              value={form.niche}
              onChange={(e) => setForm({ ...form, niche: e.target.value })}
              placeholder={es ? "ej. trading, inversión, viajes de lujo" : "e.g. trading, investing, luxury travel"}
            />
            <p className="-mt-2 text-xs text-muted">
              {es
                ? "Ejemplo: trading para principiantes, viajes en pareja, fitness para mujeres, restaurantes premium."
                : "Example: beginner trading, couples travel, fitness for women, premium restaurants."}
            </p>
            <Input
              id="goal"
              label={es ? "Objetivo" : "Goal"}
              value={form.goal}
              onChange={(e) => setForm({ ...form, goal: e.target.value })}
            />
            <p className="-mt-2 text-xs text-muted">
              {es
                ? "Ejemplo: conseguir seguidores cualificados, atraer clientes potenciales o encontrar audiencia para mi oferta."
                : "Example: get qualified followers, attract potential clients, or find an audience for my offer."}
            </p>
            <Textarea
              id="similarAccounts"
              label={es ? "Cuentas similares o competidores" : "Similar accounts or competitors"}
              value={form.similarAccounts}
              onChange={(e) => setForm({ ...form, similarAccounts: e.target.value })}
              placeholder="@"
              rows={3}
            />
            <p className="-mt-2 text-xs text-muted">
              {es
                ? "Ejemplo: pon cuentas que tengan una audiencia parecida a la que quieres atraer."
                : "Example: add accounts with an audience similar to the one you want to attract."}
            </p>
            <Input
              id="keywords"
              label={es ? "Palabras clave / hashtags" : "Keywords / hashtags"}
              value={form.keywords}
              onChange={(e) => setForm({ ...form, keywords: e.target.value })}
              placeholder={es ? "trading, bolsa, inversión, libertad financiera" : "trading, stocks, investing, financial freedom"}
            />
            <p className="-mt-2 text-xs text-muted">
              {es
                ? "Ejemplo: temas que suele buscar o comentar tu audiencia: inversión, hoteles, recetas, pérdida de grasa."
                : "Example: topics your audience searches or comments on: investing, hotels, recipes, fat loss."}
            </p>
            <Textarea
              id="observedUsers"
              label={es ? "Usuarios observados manualmente (opcional)" : "Manually observed users (optional)"}
              value={form.observedUsers}
              onChange={(e) => setForm({ ...form, observedUsers: e.target.value })}
              placeholder="@"
              rows={4}
            />
            <p className="-mt-2 text-xs text-muted">
              {es
                ? "Ejemplo: usuarios que hayas visto comentando públicamente en cuentas similares o que tengan una bio relacionada."
                : "Example: users you manually saw commenting publicly on similar accounts or with a related bio."}
            </p>
            <Textarea
              id="notes"
              label={es ? "Notas de contexto" : "Context notes"}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder={es ? "Qué señales viste, qué tipo de seguidores quieres evitar, oferta..." : "Signals you saw, followers to avoid, offer..."}
              rows={3}
            />
            <p className="-mt-2 text-xs text-muted">
              {es
                ? "Ejemplo: busco personas que comenten dudas reales, no cuentas spam; vendo mentorías, asesorías o servicios."
                : "Example: I want people asking real questions, not spam accounts; I sell mentoring, consulting, or services."}
            </p>
            <Button onClick={generate} disabled={generating || !form.niche.trim()} className="w-full">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {es ? "Buscar seguidores potenciales" : "Find potential followers"}
            </Button>
          </div>
        </Card>

        {!report ? (
          <EmptyState
            icon={<Radar className="h-7 w-7" />}
            title={es ? "Aún no hay radar" : "No radar yet"}
            description={
              es
                ? "Introduce un nicho y cuentas similares para generar segmentos y candidatos con afinidad."
                : "Enter a niche and similar accounts to generate high-affinity segments and candidates."
            }
          />
        ) : (
          <div className="space-y-6">
            <Card glow>
              <div className="flex items-center gap-2">
                <Compass className="h-5 w-5 text-lime" />
                <p className="text-xs font-semibold uppercase tracking-wider text-lime">{report.niche}</p>
              </div>
              <h2 className="mt-3 text-2xl font-bold">{report.headline}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">{report.summary}</p>
              {response?.createdAt && (
                <p className="mt-4 text-xs text-muted">
                  {es ? "Generado" : "Generated"} {formatDate(response.createdAt, locale)}
                </p>
              )}
            </Card>

            <Card>
              <CardHeader title={es ? "Candidatos recomendados" : "Recommended candidates"} action={<Users className="h-5 w-5 text-lime" />} />
              <div className="space-y-3">
                {report.candidates.map((candidate) => (
                  <CandidateCard
                    key={`${candidate.username ?? candidate.displayName}-${candidate.fitScore}`}
                    candidate={candidate}
                    es={es}
                    saved={candidate.username ? savedUsernames[candidate.username] : false}
                    onSave={() => saveCandidateAsLead(candidate)}
                  />
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>

      {report && (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader title={es ? "Segmentos con afinidad" : "High-affinity segments"} action={<Target className="h-5 w-5 text-lime" />} />
            <div className="space-y-4">
              {report.segments.map((segment) => (
                <div key={segment.name} className="rounded-lg bg-surface-elevated p-4">
                  <p className="font-semibold">{segment.name}</p>
                  <p className="mt-1 text-sm text-muted">{segment.whyItFits}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {segment.publicSignals.slice(0, 3).map((signal) => (
                      <Badge key={signal} className="border-lime/20 bg-lime/10 text-lime">{signal}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title={es ? "Ángulos de búsqueda" : "Search angles"} action={<Search className="h-5 w-5 text-lime" />} />
            <div className="space-y-2">
              {report.searchAngles.map((angle) => (
                <div key={angle} className="rounded-lg border border-border bg-surface-elevated p-3 text-sm">{angle}</div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title={es ? "Plan de interacción" : "Engagement plan"} action={<MessageCircle className="h-5 w-5 text-lime" />} />
            <ol className="space-y-2">
              {report.engagementPlan.map((step, index) => (
                <li key={step} className="flex gap-2 rounded-lg bg-surface-elevated p-3 text-sm">
                  <span className="text-lime">{index + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <div className="mt-4 rounded-lg border border-lime/20 bg-lime/5 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-lime">DM</p>
              <p className="mt-2 text-sm">{report.dmTemplate}</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function CandidateCard({
  candidate,
  es,
  saved,
  onSave,
}: {
  candidate: PotentialFollowerCandidate;
  es: boolean;
  saved: boolean;
  onSave: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-elevated p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{candidate.username ?? candidate.displayName}</p>
            {candidate.username && <span className="text-sm text-muted">{candidate.displayName}</span>}
            <Badge className={interestClasses[candidate.interestLevel]}>{candidate.interestLevel}</Badge>
          </div>
          <p className="mt-2 text-sm text-muted">{candidate.correlationReason}</p>
        </div>
        <div className="text-left sm:text-right">
          <p className={cn("text-3xl font-bold", candidate.fitScore >= 75 ? "text-lime" : candidate.fitScore >= 50 ? "text-amber-400" : "text-red-400")}>
            {candidate.fitScore}
          </p>
          <p className="text-xs text-muted">{es ? "afinidad" : "fit"}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <SignalBlock title={es ? "Señales de nicho" : "Niche signals"} items={candidate.nicheSignals} />
        <SignalBlock title={es ? "Señales públicas/manuales" : "Public/manual signals"} items={candidate.interactionSignals} />
      </div>

      <div className="mt-4 rounded-lg border border-border bg-surface p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">{es ? "Acción recomendada" : "Recommended action"}</p>
        <p className="mt-1 text-sm">{candidate.recommendedAction}</p>
        <p className="mt-2 text-xs text-muted">{candidate.sourceHint}</p>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-surface p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">{es ? "Comentario inicial" : "Opening comment"}</p>
          <p className="mt-1 text-sm">{candidate.openingComment}</p>
        </div>
        <div className="rounded-lg bg-surface p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">{es ? "Ángulo de DM" : "DM angle"}</p>
          <p className="mt-1 text-sm">{candidate.dmAngle}</p>
        </div>
      </div>

      {candidate.username && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onSave} disabled={saved}>
          {saved ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          {saved ? (es ? "Guardado en CRM" : "Saved to CRM") : (es ? "Guardar como lead" : "Save as lead")}
        </Button>
      )}
    </div>
  );
}

function SignalBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <Badge key={item} className="border-border bg-surface text-muted">{item}</Badge>
        ))}
      </div>
    </div>
  );
}
