"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Brain, Loader2, RefreshCw, Sparkles, ArrowRight, Zap } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { generateDailyBrief, fetchDailyBrief, type DailyBrief } from "@/lib/ai-client";

export function DailyBriefCard() {
  const { t, locale } = useTranslation();
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (force = false) => {
    setError(null);
    if (force) setGenerating(true);
    else setLoading(true);
    try {
      const result = force
        ? await generateDailyBrief(locale)
        : await fetchDailyBrief().then(async (r) => {
            if (r.brief) return { brief: r.brief, date: r.date, cached: true };
            return generateDailyBrief(locale);
          });
      setBrief(result.brief);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  if (loading) {
    return (
      <Card glow className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-lime" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader title={t.dailyBrief.title} />
        <p className="text-sm text-red-400">{error}</p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={() => load(true)}>
          {t.dailyBrief.retry}
        </Button>
      </Card>
    );
  }

  if (!brief) return null;

  return (
    <Card glow>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-lime/10">
            <Brain className="h-5 w-5 text-lime" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-lime">{t.dailyBrief.badge}</p>
            <h3 className="text-lg font-bold text-foreground">{brief.headline}</h3>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => load(true)} disabled={generating}>
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      <p className="mt-3 text-sm text-muted">{brief.focus}</p>

      <div className="mt-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t.dailyBrief.priorities}</p>
        {brief.priorityActions.slice(0, 3).map((action, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-lime/20 text-xs font-bold text-lime">
              {i + 1}
            </span>
            <span>{action}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-lime/20 bg-lime/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-lime" />
          <p className="text-sm font-medium">{t.dailyBrief.contentIdea}</p>
          <Badge className="bg-lime/20 text-lime border-lime/30 text-[10px]">{brief.contentIdea.format}</Badge>
        </div>
        <p className="text-sm font-medium">&ldquo;{brief.contentIdea.hook}&rdquo;</p>
        <p className="mt-1 text-xs text-muted">CTA: {brief.contentIdea.cta}</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-surface-elevated p-3">
          <p className="text-[10px] font-semibold uppercase text-muted">{t.dailyBrief.engagement}</p>
          <p className="mt-1 text-sm">{brief.engagementTask}</p>
        </div>
        <div className="rounded-lg bg-surface-elevated p-3">
          <p className="text-[10px] font-semibold uppercase text-muted">{t.dailyBrief.leads}</p>
          <p className="mt-1 text-sm">{brief.leadAction}</p>
        </div>
      </div>

      <p className="mt-4 text-sm italic text-muted flex items-center gap-2">
        <Zap className="h-3 w-3 text-lime shrink-0" />
        {brief.motivation}
      </p>

      <Link href="/ai-coach" className="mt-4 block">
        <Button variant="secondary" size="sm" className="w-full">
          {t.dailyBrief.askCoach}
          <ArrowRight className="h-3 w-3" />
        </Button>
      </Link>
    </Card>
  );
}
