"use client";

import { useEffect, useState, useCallback } from "react";
import { Swords, Plus, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { useAuth } from "@/contexts/AuthContext";
import { fetchCompetitors, saveCompetitor, fetchSettings } from "@/lib/db";
import { callAI } from "@/lib/ai-client";

export default function CompetitorsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [competitors, setCompetitors] = useState<{ id: string; username: string; followers: string; niche: string; topPosts: { title: string; views: string; format: string; hook: string }[]; patterns: string[] }[]>([]);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setCompetitors(await fetchCompetitors(user.id));
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const analyze = async () => {
    if (!user || !username.trim()) return;
    setAnalyzing(true);
    setError("");
    try {
      const settings = await fetchSettings(user.id);
      const result = await callAI("competitor-analyze", { username: username.replace("@", ""), niche: settings?.niche || "general" });
      await saveCompetitor(user.id, {
        username: result.username, followers: result.followers, niche: result.niche,
        topPosts: result.topPosts, patterns: result.patterns,
      });
      await load();
      setUsername("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-lime" /></div>;

  return (
    <div>
      <PageHeader title={t.competitors.title} description={t.competitors.description} />
      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
      <Card className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row">
          <Input id="username" label={t.competitors.username} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@competidor" className="flex-1" />
          <div className="flex items-end"><Button onClick={analyze} disabled={analyzing || !username.trim()}><Plus className="h-4 w-4" />{analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : t.competitors.add}</Button></div>
        </div>
      </Card>
      <div className="space-y-6">
        {competitors.map((comp) => (
          <Card key={comp.id}>
            <div className="flex items-center justify-between mb-4">
              <div><p className="text-lg font-bold">{comp.username}</p><p className="text-sm text-muted">{comp.followers} · {comp.niche}</p></div>
              <Swords className="h-6 w-6 text-lime/50" />
            </div>
            <CardHeader title={t.competitors.topPosts} />
            <div className="space-y-2 mb-4">{comp.topPosts?.map((post, i) => (
              <div key={i} className="rounded-lg bg-surface-elevated p-3">
                <div className="flex justify-between"><p className="font-medium text-sm">{post.title}</p><Badge className="bg-lime/20 text-lime border-lime/30">{post.views} {t.competitors.views}</Badge></div>
                <p className="text-xs text-muted mt-1">{post.format} · &ldquo;{post.hook}&rdquo;</p>
              </div>
            ))}</div>
            <CardHeader title={t.competitors.patterns} />
            <div className="flex flex-wrap gap-2">{comp.patterns?.map((p, i) => <Badge key={i} className="bg-surface-elevated text-foreground border-border">{p}</Badge>)}</div>
          </Card>
        ))}
        {competitors.length === 0 && <Card className="py-12 text-center text-muted">Add a competitor to analyze their content patterns</Card>}
      </div>
    </div>
  );
}
