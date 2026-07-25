"use client";

import { useEffect, useState, useCallback } from "react";
import { Calendar, Loader2, CheckCircle2, Bot, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { useAuth } from "@/contexts/AuthContext";
import { fetchCalendar, saveCalendarItems, markCalendarPosted, fetchSettings } from "@/lib/db";
import { callAI } from "@/lib/ai-client";
import type { CalendarItem } from "@/types";

export default function CalendarPage() {
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setItems(await fetchCalendar(user.id));
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    if (!user) return;
    setGenerating(true);
    setError("");
    try {
      const settings = await fetchSettings(user.id);
      const result = await callAI("calendar", {
        niche: settings?.niche || "Instagram growth",
        goal: settings?.defaultGoal || "followers",
        startDate: new Date().toISOString().split("T")[0],
      }, locale);
      await saveCalendarItems(user.id, result.items);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setGenerating(false);
    }
  };

  const markPosted = async (id: string) => {
    await markCalendarPosted(id);
    setItems(items.map((i) => (i.id === id ? { ...i, status: "posted" as const } : i)));
  };

  const typeColors: Record<string, string> = {
    reel: "bg-pink-500/20 text-pink-400 border-pink-500/30", carousel: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    story: "bg-purple-500/20 text-purple-400 border-purple-500/30", post: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  };

  const pendingItems = items.filter((i) => i.status === "planned");

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-lime" /></div>;

  return (
    <div>
      <PageHeader title={t.calendar.title} description={t.calendar.description}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={generate} disabled={generating} title={locale === "es" ? "Agente IA: genera calendario semanal completo" : "AI Agent: generate full weekly calendar"}>
              <Bot className="h-4 w-4" />
              {locale === "es" ? "Agente IA" : "AI Agent"}
            </Button>
            <Button onClick={generate} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
              {generating ? t.calendar.generating : t.calendar.generate}
            </Button>
          </div>
        }
      />
      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {items.length > 0 && pendingItems.length > 0 && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-lime/20 bg-lime/5 p-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-lime shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {locale === "es" ? `${pendingItems.length} contenidos pendientes de publicar` : `${pendingItems.length} pieces pending publication`}
              </p>
              <p className="text-xs text-muted">
                {locale === "es" ? "Revisa el calendario y marca como publicado cuando lo hagas" : "Review the calendar and mark as posted when you publish"}
              </p>
            </div>
          </div>
        </div>
      )}
      {items.length > 0 ? (
        <div className="grid gap-3">
          {items.map((item) => (
            <Card key={item.id} className="!p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-surface-elevated">
                    <span className="text-xs text-muted">{item.dayLabel}</span>
                    <span className="text-sm font-bold text-lime">{item.time}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{item.title}</p>
                      <Badge className={typeColors[item.type]}>{t.postType[item.type]}</Badge>
                      {item.status === "posted" && <Badge className="bg-lime/20 text-lime border-lime/30"><CheckCircle2 className="h-3 w-3 mr-1" />{t.calendar.posted}</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-muted">{item.hook}</p>
                  </div>
                </div>
                {item.status !== "posted" && <Button variant="secondary" size="sm" onClick={() => markPosted(item.id)}>{t.calendar.markPosted}</Button>}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="flex min-h-[300px] items-center justify-center"><p className="text-muted">{t.calendar.empty}</p></Card>
      )}
    </div>
  );
}
