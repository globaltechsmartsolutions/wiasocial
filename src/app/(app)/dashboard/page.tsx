"use client";

import { Suspense, useEffect, useState } from "react";
import { Users, Phone, TrendingUp, Calendar, Lightbulb, ArrowRight, Target, Hash, UserCheck, Clock, Layers, Loader2, Megaphone, Workflow } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatNumber, formatDate, isToday } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { useAuth } from "@/contexts/AuthContext";
import { fetchLeads, fetchPosts, fetchFollowUps, fetchFollowerSnapshots } from "@/lib/db";
import { DailyBriefCard } from "@/components/ai/DailyBriefCard";
import { GrowthRadarCard } from "@/components/ai/GrowthRadarCard";
import { InstagramConnectBanner } from "@/components/instagram/InstagramConnectBanner";

export default function DashboardPage() {
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [totalLeads, setTotalLeads] = useState(0);
  const [callsBooked, setCallsBooked] = useState(0);
  const [clients, setClients] = useState(0);
  const [followUpsToday, setFollowUpsToday] = useState<{ leadUsername: string; note: string }[]>([]);
  const [bestPost, setBestPost] = useState<{ title: string; postedAt: string; type: string; views: number; saves: number; leadsGenerated: number } | null>(null);
  const [weekGain, setWeekGain] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [leads, posts, followUps, snapshots] = await Promise.all([
        fetchLeads(user.id), fetchPosts(user.id), fetchFollowUps(user.id), fetchFollowerSnapshots(user.id),
      ]);
      setTotalLeads(leads.length);
      setCallsBooked(leads.filter((l) => l.status === "call_booked").length);
      setClients(leads.filter((l) => l.status === "client").length);
      setFollowUpsToday(followUps.filter((f) => isToday(f.dueDate)));
      const sorted = [...posts].sort((a, b) => b.views - a.views);
      if (sorted[0]) setBestPost(sorted[0]);
      const latest = snapshots[snapshots.length - 1];
      const prev = snapshots[snapshots.length - 2];
      if (latest && prev) setWeekGain(latest.followers - prev.followers);
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-lime" /></div>;

  return (
    <div>
      <PageHeader title={t.dashboard.title} description={t.dashboard.description}
        action={<Link href="/content-generator"><Button><Lightbulb className="h-4 w-4" />{t.dashboard.generateContent}</Button></Link>} />

      <Suspense fallback={<div className="h-24 animate-pulse rounded-xl bg-surface-elevated" />}>
        <InstagramConnectBanner />
      </Suspense>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title={t.dashboard.totalLeads} value={totalLeads} icon={Users} trendUp />
        <StatCard title={t.dashboard.callsBooked} value={callsBooked} icon={Phone} trendUp />
        <StatCard title={t.dashboard.activeClients} value={clients} icon={TrendingUp} />
        <StatCard title={t.dashboard.followUpsToday} value={followUpsToday.length} icon={Calendar} />
      </div>

      <div className="mt-4">
        <StatCard title="Seguidores esta semana" value={`+${weekGain}`} icon={TrendingUp} trend={`+${weekGain} ganados`} trendUp />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <GrowthRadarCard />
        <DailyBriefCard />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card glow>
          <CardHeader title={t.dashboard.bestContent} description={t.dashboard.bestContentDesc} />
          {bestPost ? (
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div><p className="font-medium">{bestPost.title}</p><p className="text-sm text-muted">{t.common.posted} {formatDate(bestPost.postedAt, locale)} · {t.postType[bestPost.type as keyof typeof t.postType]}</p></div>
                <Badge className="bg-lime/20 text-lime border-lime/30">#1 {t.dashboard.top}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-surface-elevated p-3 text-center"><p className="text-lg font-bold text-lime">{formatNumber(bestPost.views)}</p><p className="text-xs text-muted">{t.common.views}</p></div>
                <div className="rounded-lg bg-surface-elevated p-3 text-center"><p className="text-lg font-bold">{formatNumber(bestPost.saves)}</p><p className="text-xs text-muted">{t.common.saves}</p></div>
                <div className="rounded-lg bg-surface-elevated p-3 text-center"><p className="text-lg font-bold">{bestPost.leadsGenerated}</p><p className="text-xs text-muted">{t.common.leads}</p></div>
              </div>
              <Link href="/analytics"><Button variant="secondary" size="sm" className="w-full">{t.dashboard.viewAnalytics}<ArrowRight className="h-3 w-3" /></Button></Link>
            </div>
          ) : <p className="text-sm text-muted">Registra publicaciones en Analíticas para ver tu mejor contenido</p>}
        </Card>

        <Card>
          <CardHeader title={t.dashboard.followUpsDue} description={`${followUpsToday.length} ${t.dashboard.reminders}`} />
          {followUpsToday.length > 0 ? (
            <div className="space-y-3">{followUpsToday.map((f, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-surface-elevated p-3">
                <div><p className="text-sm font-medium">{f.leadUsername}</p><p className="text-xs text-muted">{f.note}</p></div>
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">{t.common.due}</Badge>
              </div>
            ))}</div>
          ) : <p className="text-sm text-muted">{t.dashboard.noFollowUps}</p>}
          <Link href="/leads" className="mt-4 block"><Button variant="ghost" size="sm">{t.dashboard.manageLeads}<ArrowRight className="h-3 w-3" /></Button></Link>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title={t.dashboard.growthTools} description={t.dashboard.growthToolsDesc} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { href: "/calendar", icon: Calendar, label: t.nav.calendar },
            { href: "/hook-analyzer", icon: Target, label: t.nav.hookAnalyzer },
            { href: "/hashtags", icon: Hash, label: t.nav.hashtags },
            { href: "/profile-audit", icon: UserCheck, label: t.nav.profileAudit },
            { href: "/best-times", icon: Clock, label: t.nav.bestTimes },
            { href: "/content-series", icon: Layers, label: t.nav.contentSeries },
            { href: "/marketing-plan", icon: Megaphone, label: t.nav.marketingPlan },
            { href: "/funnel-builder", icon: Workflow, label: t.nav.funnelBuilder },
          ].map((tool) => (
            <Link key={tool.href} href={tool.href} className="flex items-center gap-3 rounded-lg border border-border bg-surface-elevated p-4 hover:border-lime/30">
              <tool.icon className="h-5 w-5 text-lime" /><span className="text-sm font-medium">{tool.label}</span><ArrowRight className="h-3 w-3 text-muted ml-auto" />
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
