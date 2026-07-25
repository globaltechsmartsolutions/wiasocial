"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Loader2,
  Printer,
  RefreshCw,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
  Target,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { useAuth } from "@/contexts/AuthContext";
import { fetchSettings } from "@/lib/db";
import { fetchMonthlyReport, generateMonthlyReport } from "@/lib/ai-client";
import { cn } from "@/lib/utils";

interface MonthlyReportData {
  period: string;
  executiveSummary: string;
  growthHighlights: string[];
  metrics: {
    followersGained: number;
    followersGainedLabel: string;
    leadsGenerated: number;
    clientsAcquired: number;
    postsPublished: number;
    engagementRate: string;
    topPerformingContent: string;
  };
  leadsPerformance: string;
  contentStats: string;
  topAchievements: string[];
  areasForImprovement: string[];
  nextMonthPlan: Array<{ priority: "high" | "medium" | "low"; action: string; why: string }>;
  clientMessage: string;
}

const priorityClasses = {
  high: "bg-red-500/20 text-red-400 border-red-500/30",
  medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  low: "bg-lime/20 text-lime border-lime/30",
};


export default function MonthlyReportPage() {
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const [report, setReport] = useState<MonthlyReportData | null>(null);
  const [monthKey, setMonthKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brandConfigured, setBrandConfigured] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [existing, settings] = await Promise.all([
        fetchMonthlyReport(),
        fetchSettings(user!.id),
      ]);
      setBrandConfigured(Boolean(settings?.niche));
      setMonthKey(existing.monthKey);
      if (existing.report) setReport(existing.report as MonthlyReportData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await generateMonthlyReport(locale);
      setReport(res.report as MonthlyReportData);
      setMonthKey(res.monthKey);
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

  const mr = t.monthlyReport;

  return (
    <div>
      <PageHeader
        title={mr.title}
        description={mr.description}
        action={
          <div className="flex gap-2">
            {report && (
              <Button variant="secondary" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
                {mr.print}
              </Button>
            )}
            <Button onClick={generate} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {report ? mr.regenerate : mr.generate}
            </Button>
          </div>
        }
      />

      {error && (
        <Card className="mb-6 border-red-500/30 bg-red-500/10">
          <p className="text-sm text-red-300">{error}</p>
        </Card>
      )}

      {!brandConfigured ? (
        <EmptyState
          icon={<FileText className="h-7 w-7" />}
          title={mr.setupRequired}
          description={mr.setupRequiredDesc}
          action={
            <Link href="/settings">
              <Button>
                <Settings className="h-4 w-4" />
                {locale === "es" ? "Configurar perfil" : "Configure profile"}
              </Button>
            </Link>
          }
        />
      ) : !report ? (
        <EmptyState
          icon={<FileText className="h-7 w-7" />}
          title={mr.noReport}
          description={mr.noReportDesc}
          action={
            <Button onClick={generate} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {mr.generate}
            </Button>
          }
        />
      ) : (
        <div className="space-y-6 print:space-y-4">
          <div className="flex items-center gap-3 print:hidden">
            <Badge className="bg-lime/20 text-lime border-lime/30">{monthKey}</Badge>
            {report.period && <span className="text-sm text-muted">{report.period}</span>}
          </div>

          {/* Executive Summary */}
          <Card glow>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-lime" />
              <p className="text-xs font-semibold uppercase tracking-wider text-lime">{mr.executiveSummary}</p>
            </div>
            <p className="text-sm leading-relaxed">{report.executiveSummary}</p>
          </Card>

          {/* Metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-surface p-4 text-center">
              <TrendingUp className="h-5 w-5 text-lime mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">
                {report.metrics.followersGained >= 0 ? "+" : ""}{report.metrics.followersGained}
              </p>
              <p className="text-xs text-muted mt-1">{mr.followersGained}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4 text-center">
              <Users className="h-5 w-5 text-lime mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{report.metrics.leadsGenerated}</p>
              <p className="text-xs text-muted mt-1">{mr.leadsGenerated}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4 text-center">
              <Target className="h-5 w-5 text-lime mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{report.metrics.clientsAcquired}</p>
              <p className="text-xs text-muted mt-1">{mr.clientsAcquired}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4 text-center">
              <FileText className="h-5 w-5 text-lime mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{report.metrics.postsPublished}</p>
              <p className="text-xs text-muted mt-1">{mr.postsPublished}</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Achievements */}
            <Card>
              <CardHeader title={mr.topAchievements} action={<CheckCircle2 className="h-5 w-5 text-lime" />} />
              <ul className="space-y-2">
                {(report.topAchievements ?? []).map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-lime shrink-0 mt-0.5" />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Growth Highlights */}
            <Card>
              <CardHeader title={mr.growthHighlights} action={<TrendingUp className="h-5 w-5 text-lime" />} />
              <ul className="space-y-2">
                {(report.growthHighlights ?? []).map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <ArrowRight className="h-4 w-4 text-lime shrink-0 mt-0.5" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Leads & Content */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title={mr.leadsPerformance} />
              <p className="text-sm leading-relaxed text-muted">{report.leadsPerformance}</p>
            </Card>
            <Card>
              <CardHeader title={mr.contentStats} />
              <p className="text-sm leading-relaxed text-muted">{report.contentStats}</p>
              {report.metrics.topPerformingContent && (
                <div className="mt-3 rounded-lg border border-lime/20 bg-lime/5 p-3">
                  <p className="text-xs font-semibold text-lime uppercase mb-1">
                    {locale === "es" ? "Mejor contenido" : "Top content"}
                  </p>
                  <p className="text-sm">{report.metrics.topPerformingContent}</p>
                </div>
              )}
            </Card>
          </div>

          {/* Areas for improvement */}
          {report.areasForImprovement?.length > 0 && (
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardHeader title={locale === "es" ? "Áreas de mejora" : "Areas for improvement"} action={<AlertTriangle className="h-5 w-5 text-amber-400" />} />
              <ul className="space-y-2">
                {report.areasForImprovement.map((a, i) => (
                  <li key={i} className="text-sm text-amber-100 flex items-start gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                    {a}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Next Month Plan */}
          <Card>
            <CardHeader title={mr.nextMonthPlan} />
            <div className="space-y-3">
              {(report.nextMonthPlan ?? []).map((item, i) => (
                <div key={i} className="rounded-lg border border-border bg-surface-elevated p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="font-medium text-sm">{item.action}</p>
                    <Badge className={cn("shrink-0 text-xs", priorityClasses[item.priority])}>
                      {item.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted">{item.why}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Client Message */}
          {report.clientMessage && (
            <Card className="border-lime/20 bg-lime/5">
              <p className="text-xs font-semibold uppercase tracking-wider text-lime mb-3">
                {locale === "es" ? "Mensaje para el cliente" : "Client message"}
              </p>
              <p className="text-sm leading-relaxed italic text-foreground">{report.clientMessage}</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
