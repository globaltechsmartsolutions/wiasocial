"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Flame,
  Loader2,
  RefreshCw,
  Settings,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { useAuth } from "@/contexts/AuthContext";
import { fetchSettings } from "@/lib/db";
import { fetchTrendDetector, generateTrendDetector } from "@/lib/ai-client";
import { cn, formatDate } from "@/lib/utils";

interface Trend {
  topic: string;
  whyTrending: string;
  urgency: "high" | "medium" | "low";
  contentIdea: string;
  hookSuggestion: string;
  bestFormat: string;
  viralAngle: string;
  audienceInsight: string;
}

interface TrendResult {
  trends: Trend[];
  overallInsight: string;
  weeklyFocus: string;
}

const urgencyClasses = {
  high: "bg-red-500/20 text-red-400 border-red-500/30",
  medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  low: "bg-lime/20 text-lime border-lime/30",
};


export default function TrendDetectorPage() {
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const [result, setResult] = useState<TrendResult | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brandConfigured, setBrandConfigured] = useState(true);
  const [expandedTrend, setExpandedTrend] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [existing, settings] = await Promise.all([
        fetchTrendDetector(),
        fetchSettings(user!.id),
      ]);
      setBrandConfigured(Boolean(settings?.niche && settings?.targetAudience));
      if (existing.result) {
        setResult(existing.result as TrendResult);
        setCreatedAt(existing.createdAt);
      } else if (settings?.niche) {
        const generated = await generateTrendDetector(locale);
        setResult(generated.result as TrendResult);
        setCreatedAt(generated.createdAt);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const regenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const generated = await generateTrendDetector(locale);
      setResult(generated.result as TrendResult);
      setCreatedAt(generated.createdAt);
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

  const td = t.trendDetector;

  return (
    <div>
      <PageHeader
        title={td.title}
        description={td.description}
        action={
          <Button onClick={regenerate} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {td.regenerate}
          </Button>
        }
      />

      {error && (
        <Card className="mb-6 border-red-500/30 bg-red-500/10">
          <p className="text-sm text-red-300">{error}</p>
        </Card>
      )}

      {!brandConfigured ? (
        <EmptyState
          icon={<Flame className="h-7 w-7" />}
          title={td.setupRequired}
          description={td.setupRequiredDesc}
          action={
            <Link href="/settings">
              <Button>
                <Settings className="h-4 w-4" />
                {td.completeProfile}
              </Button>
            </Link>
          }
        />
      ) : !result ? (
        <EmptyState
          icon={<Flame className="h-7 w-7" />}
          title={td.noTrends}
          description={td.noTrendsDesc}
          action={
            <Button onClick={regenerate} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {td.detect}
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {createdAt && (
            <p className="text-xs text-muted">
              {locale === "es" ? "Actualizado" : "Updated"}: {formatDate(createdAt.split("T")[0], locale)}
            </p>
          )}

          {result.weeklyFocus && (
            <Card glow className="border-lime/20 bg-lime/5">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-5 w-5 text-lime" />
                <p className="text-xs font-semibold uppercase tracking-wider text-lime">
                  {locale === "es" ? "Foco de la semana" : "Weekly focus"}
                </p>
              </div>
              <p className="font-semibold text-foreground">{result.weeklyFocus}</p>
              {result.overallInsight && (
                <p className="mt-2 text-sm text-muted">{result.overallInsight}</p>
              )}
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {(result.trends ?? []).map((trend, i) => (
              <div key={`${trend.topic}-${i}`} className="cursor-pointer" onClick={() => setExpandedTrend(expandedTrend === i ? null : i)}>
            <Card className="hover:border-lime/30 transition-colors">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-lime shrink-0" />
                    <h3 className="font-semibold text-foreground">{trend.topic}</h3>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={cn("text-xs", urgencyClasses[trend.urgency])}>
                      {td.urgency}: {td[trend.urgency]}
                    </Badge>
                    <Badge className="bg-surface-elevated text-muted border-border text-xs">
                      {trend.bestFormat}
                    </Badge>
                  </div>
                </div>

                <p className="text-sm text-muted">{trend.whyTrending}</p>

                {expandedTrend === i && (
                  <div className="mt-4 space-y-3 border-t border-border pt-4">
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted mb-1">{td.contentIdeas}</p>
                      <p className="text-sm">{trend.contentIdea}</p>
                    </div>
                    <div className="rounded-lg border border-lime/20 bg-lime/5 p-3">
                      <p className="text-xs font-semibold uppercase text-lime mb-1">{td.hookSuggestion}</p>
                      <p className="text-sm font-medium">&ldquo;{trend.hookSuggestion}&rdquo;</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted mb-1">{td.viralAngles}</p>
                      <p className="text-sm">{trend.viralAngle}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted mb-1">{td.audienceInsight}</p>
                      <p className="text-sm text-muted">{trend.audienceInsight}</p>
                    </div>
                  </div>
                )}
              </Card>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
