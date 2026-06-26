"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { useAuth } from "@/contexts/AuthContext";
import { fetchSettings, fetchPosts, saveGeneratedContent } from "@/lib/db";
import { callAI } from "@/lib/ai-client";

export default function BestTimesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [slots, setSlots] = useState<{ day: string; time: string; score: number; reason: string }[]>([]);
  const [tip, setTip] = useState("");
  const [loading, setLoading] = useState(false);

  const analyze = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const settings = await fetchSettings(user.id);
      const posts = await fetchPosts(user.id);
      const result = await callAI("best-times", {
        niche: settings?.niche || "general",
        postData: posts.slice(0, 10).map((p) => ({ title: p.title, views: p.views, date: p.postedAt })),
      });
      setSlots(result.slots);
      setTip(result.tip);
      await saveGeneratedContent(user.id, {
        content_type: "best_times",
        niche: settings?.niche || "general",
        raw_json: result,
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { analyze(); }, [analyze]);

  return (
    <div>
      <PageHeader title={t.bestTimes.title} description={t.bestTimes.description}
        action={<Button onClick={analyze} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}Analizar</Button>} />
      {tip && <Card className="mb-6 border-lime/20 bg-lime/5"><div className="flex items-center gap-3"><Clock className="h-5 w-5 text-lime" /><p className="text-sm text-muted">{tip}</p></div></Card>}
      <Card>
        <CardHeader title={t.bestTimes.topSlots} />
        {slots.length === 0 && !loading ? <p className="text-sm text-muted py-4">Pulsa Analizar para obtener horarios basados en tu nicho y datos</p> : (
          <div className="space-y-3">{slots.map((slot) => (
            <div key={slot.day} className="flex items-center gap-4 rounded-lg border border-border bg-surface-elevated p-4">
              <div className="w-20 text-center"><p className="text-sm font-medium">{slot.day}</p><p className="text-lg font-bold text-lime">{slot.time}</p></div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1"><span className="text-sm font-bold text-lime">{slot.score}%</span>
                  <div className="flex-1 h-1.5 rounded-full bg-surface overflow-hidden"><div className="h-full gradient-lime rounded-full" style={{ width: `${slot.score}%` }} /></div></div>
                <p className="text-sm text-muted">{slot.reason}</p>
              </div>
            </div>
          ))}</div>
        )}
      </Card>
    </div>
  );
}
