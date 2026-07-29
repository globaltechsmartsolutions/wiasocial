"use client";

import { useEffect, useState, useCallback } from "react";
import { TrendingUp, Plus, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { formatDate } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { useAuth } from "@/contexts/AuthContext";
import { fetchFollowerSnapshots, logFollowers } from "@/lib/db";
import { fetchInstagramConnection, syncInstagramMetrics } from "@/lib/instagram-client";

export default function GrowthTrackerPage() {
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const [snapshots, setSnapshots] = useState<{ id: string; date: string; followers: number; gained: number; topPost?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [igConnected, setIgConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setSnapshots(await fetchFollowerSnapshots(user.id));
    setIgConnected(Boolean(await fetchInstagramConnection()));
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const latest = snapshots[snapshots.length - 1];
  const weekAgo = snapshots[snapshots.length - 2];
  const monthAgo = snapshots[0];
  const weekGain = latest && weekAgo ? latest.followers - weekAgo.followers : 0;
  const monthGain = latest && monthAgo ? latest.followers - monthAgo.followers : 0;

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncInstagramMetrics();
      await load();
    } finally {
      setSyncing(false);
    }
  };

  const handleLog = async () => {
    if (!user || !count) return;
    const newCount = parseInt(count);
    const prev = latest?.followers ?? 0;
    await logFollowers(user.id, newCount, newCount - prev);
    await load();
    setCount("");
    setShowForm(false);
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-lime" /></div>;

  return (
    <div>
      <PageHeader title={t.growthTracker.title} description={t.growthTracker.description}
        action={
          <div className="flex gap-2">
            {igConnected && (
              <Button variant="secondary" onClick={handleSync} disabled={syncing}>
                {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {locale === "es" ? "Sync Instagram" : "Sync Instagram"}
              </Button>
            )}
            <Button onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4" />{t.growthTracker.logFollowers}</Button>
          </div>
        } />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title={t.growthTracker.current} value={latest?.followers ?? 0} icon={TrendingUp} trendUp />
        <StatCard title={t.growthTracker.thisWeek} value={`+${weekGain}`} icon={TrendingUp} trendUp />
        <StatCard title={t.growthTracker.thisMonth} value={`+${monthGain}`} icon={TrendingUp} trendUp />
      </div>
      {showForm && (
        <Card className="mt-6">
          <div className="flex gap-4">
            <Input id="count" label={t.growthTracker.count} type="number" value={count} onChange={(e) => setCount(e.target.value)} className="flex-1" />
            <div className="flex items-end gap-2"><Button onClick={handleLog}>{t.common.save}</Button><Button variant="ghost" onClick={() => setShowForm(false)}>{t.common.cancel}</Button></div>
          </div>
        </Card>
      )}
      <Card className="mt-6">
        <CardHeader title={t.growthTracker.history} />
        {snapshots.length === 0 ? (
          <p className="text-sm text-muted py-8 text-center">Registra tus seguidores actuales desde Instagram para empezar a trackear</p>
        ) : (
          <>
            <FollowerChart snapshots={snapshots} locale={locale} />
            <div className="mb-2" />
            <div className="space-y-2">
              {[...snapshots].reverse().map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg bg-surface-elevated p-3 text-sm">
                  <span className="text-muted">{formatDate(s.date, locale)}</span>
                  <span className="font-bold">{s.followers.toLocaleString()}</span>
                  <span className="text-lime">+{s.gained}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function FollowerChart({
  snapshots,
  locale,
}: {
  snapshots: { id: string; date: string; followers: number; gained: number }[];
  locale: string;
}) {
  if (snapshots.length < 2) {
    return (
      <div className="mb-6 flex items-end gap-2 h-40">
        {snapshots.map((s) => {
          const maxF = Math.max(...snapshots.map((x) => x.followers), 1);
          return (
            <div key={s.id} className="flex flex-1 flex-col items-center gap-1">
              <div className="w-full rounded-t gradient-lime min-h-[4px]" style={{ height: `${(s.followers / maxF) * 100}%` }} />
              <span className="text-[10px] text-muted">{formatDate(s.date, locale).split(" ")[0]}</span>
              <span className="text-xs font-bold text-lime">{s.followers.toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    );
  }

  const W = 600;
  const H = 160;
  const PAD = { top: 16, right: 16, bottom: 36, left: 48 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const minF = Math.min(...snapshots.map((s) => s.followers));
  const maxF = Math.max(...snapshots.map((s) => s.followers));
  const range = maxF - minF || 1;

  const toX = (i: number) => PAD.left + (i / (snapshots.length - 1)) * chartW;
  const toY = (f: number) => PAD.top + chartH - ((f - minF) / range) * chartH;

  const points = snapshots.map((s, i) => ({ x: toX(i), y: toY(s.followers), s }));
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${PAD.top + chartH} L${points[0].x},${PAD.top + chartH} Z`;

  const yTicks = [minF, Math.round((minF + maxF) / 2), maxF];

  return (
    <div className="mb-6 w-full overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height: "160px" }}>
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a3e635" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#a3e635" stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={toY(v)} y2={toY(v)} stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
            <text x={PAD.left - 6} y={toY(v)} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="currentColor" fillOpacity="0.4">
              {v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
            </text>
          </g>
        ))}

        <path d={areaPath} fill="url(#chartGrad)" />
        <path d={linePath} fill="none" stroke="#a3e635" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {points.map((p) => (
          <g key={p.s.id}>
            <circle cx={p.x} cy={p.y} r="4" fill="#a3e635" />
            <text x={p.x} y={H - 4} textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity="0.5">
              {formatDate(p.s.date, locale).split(" ")[0]}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
