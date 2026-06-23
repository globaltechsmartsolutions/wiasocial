"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Instagram,
  Loader2,
  RefreshCw,
  Users,
  Heart,
  MessageCircle,
  Eye,
  BarChart3,
  Clock,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import {
  connectInstagram,
  fetchInstagramFullData,
  syncInstagramMetrics,
} from "@/lib/instagram-client";
import { isInstagramLoginConfiguredPublic } from "@/lib/instagram-login";
import type { InstagramFullData } from "@/types/instagram-data";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Tab = "profile" | "insights" | "posts" | "comments" | "stories" | "audience";

export default function InstagramDataPage() {
  const { t, locale } = useTranslation();
  const [data, setData] = useState<InstagramFullData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [tab, setTab] = useState<Tab>("profile");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await fetchInstagramFullData());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncInstagramMetrics();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSyncing(false);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "profile", label: t.instagramData.tabProfile },
    { id: "insights", label: t.instagramData.tabInsights },
    { id: "posts", label: t.instagramData.tabPosts },
    { id: "comments", label: t.instagramData.tabComments },
    { id: "stories", label: t.instagramData.tabStories },
    { id: "audience", label: t.instagramData.tabAudience },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-lime" />
      </div>
    );
  }

  if (!data?.connected) {
    return (
      <div>
        <PageHeader title={t.instagramData.title} description={t.instagramData.description} />
        <Card className="flex flex-col items-center py-16 text-center">
          <Instagram className="h-16 w-16 text-muted/30" />
          <h3 className="mt-4 text-lg font-semibold">{t.instagramData.notConnected}</h3>
          <p className="mt-2 max-w-md text-sm text-muted">{t.instagram.connectDesc}</p>
          {isInstagramLoginConfiguredPublic() ? (
            <Button className="mt-6" onClick={connectInstagram}>
              <Instagram className="h-4 w-4" />
              {t.instagram.connect}
            </Button>
          ) : (
            <Link href="/settings" className="mt-6">
              <Button>{t.instagram.configureMeta}</Button>
            </Link>
          )}
        </Card>
      </div>
    );
  }

  const allComments = data.media.flatMap((m) =>
    m.comments.map((c) => ({ ...c, postId: m.instagramMediaId, postCaption: m.caption.slice(0, 60) }))
  );

  return (
    <div>
      <PageHeader
        title={t.instagramData.title}
        description={t.instagramData.description}
        action={
          <Button onClick={handleSync} disabled={syncing}>
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {t.instagram.sync}
          </Button>
        }
      />

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="mb-6 flex items-center gap-4">
        {data.profile?.profilePictureUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.profile.profilePictureUrl} alt="" className="h-16 w-16 rounded-full border-2 border-lime/30" />
        )}
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">@{data.username}</h2>
            <Badge className="bg-lime/20 text-lime border-lime/30">{t.instagram.connectedBadge}</Badge>
          </div>
          {data.profile?.name && <p className="text-muted">{data.profile.name}</p>}
          {data.lastSyncedAt && (
            <p className="text-xs text-muted mt-1">
              {t.instagramData.lastSync}: {new Date(data.lastSyncedAt).toLocaleString(locale === "es" ? "es-ES" : "en-US")}
            </p>
          )}
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: t.instagram.followers, value: data.profile?.followersCount ?? 0, icon: Users },
          { label: t.instagramData.following, value: data.profile?.followsCount ?? 0, icon: Users },
          { label: t.instagramData.totalLikes, value: data.stats.totalLikes, icon: Heart },
          { label: t.instagramData.totalComments, value: data.stats.totalComments, icon: MessageCircle },
          { label: t.instagramData.totalViews, value: data.stats.totalViews, icon: Eye },
        ].map((stat) => (
          <Card key={stat.label} className="!p-4">
            <div className="flex items-center gap-2 text-muted">
              <stat.icon className="h-4 w-4 text-lime" />
              <span className="text-xs">{stat.label}</span>
            </div>
            <p className="mt-1 text-2xl font-bold">{formatNumber(stat.value)}</p>
          </Card>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-border pb-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              tab === item.id ? "bg-lime/10 text-lime border border-lime/20" : "text-muted hover:text-foreground"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "profile" && data.profile && (
        <Card>
          <CardHeader title={t.instagramData.tabProfile} />
          <div className="space-y-4">
            {data.profile.biography && (
              <div>
                <p className="text-xs font-semibold uppercase text-muted mb-1">Bio</p>
                <p className="text-sm whitespace-pre-wrap">{data.profile.biography}</p>
              </div>
            )}
            {data.profile.website && (
              <div>
                <p className="text-xs font-semibold uppercase text-muted mb-1">{t.instagramData.website}</p>
                <a href={data.profile.website} target="_blank" rel="noopener noreferrer" className="text-sm text-lime hover:underline flex items-center gap-1">
                  {data.profile.website} <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-surface-elevated p-3 text-center">
                <p className="text-lg font-bold text-lime">{formatNumber(data.profile.followersCount)}</p>
                <p className="text-xs text-muted">{t.instagram.followers}</p>
              </div>
              <div className="rounded-lg bg-surface-elevated p-3 text-center">
                <p className="text-lg font-bold">{formatNumber(data.profile.followsCount)}</p>
                <p className="text-xs text-muted">{t.instagramData.following}</p>
              </div>
              <div className="rounded-lg bg-surface-elevated p-3 text-center">
                <p className="text-lg font-bold">{formatNumber(data.profile.mediaCount)}</p>
                <p className="text-xs text-muted">{t.instagram.posts}</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {tab === "insights" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(data.accountInsights ?? []).length > 0 ? (
            data.accountInsights!.map((insight) => (
              <Card key={insight.name} className="!p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-4 w-4 text-lime" />
                  <p className="text-sm font-medium">{insight.title ?? insight.name}</p>
                </div>
                <p className="text-2xl font-bold">{formatNumber(insight.value)}</p>
                <p className="text-xs text-muted mt-1">{t.instagramData.last28days}</p>
              </Card>
            ))
          ) : (
            <Card className="col-span-full flex items-center gap-3 !p-4">
              <AlertCircle className="h-5 w-5 text-amber-400" />
              <p className="text-sm text-muted">{t.instagramData.noInsights}</p>
            </Card>
          )}
        </div>
      )}

      {tab === "posts" && (
        <div className="space-y-3">
          {data.media.map((post) => (
            <Card key={post.instagramMediaId} className="!p-4">
              <div className="flex gap-4">
                {post.thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.thumbnailUrl} alt="" className="h-20 w-20 rounded-lg object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Badge className="bg-lime/20 text-lime border-lime/30 text-[10px] mb-1">{post.mediaType}</Badge>
                      <p className="text-sm font-medium line-clamp-2">{post.caption || t.instagramData.noCaption}</p>
                      <p className="text-xs text-muted mt-1">{new Date(post.postedAt).toLocaleDateString(locale === "es" ? "es-ES" : "en-US")}</p>
                    </div>
                    {post.permalink && (
                      <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-lime">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{formatNumber(Math.max(post.insights.plays ?? 0, post.insights.impressions ?? 0, post.insights.reach ?? 0))}</span>
                    <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{formatNumber(post.likeCount)}</span>
                    <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{formatNumber(post.commentsCount)}</span>
                    {post.insights.saved != null && <span>💾 {formatNumber(post.insights.saved)}</span>}
                    {post.insights.shares != null && <span>↗ {formatNumber(post.insights.shares)}</span>}
                  </div>
                </div>
              </div>
            </Card>
          ))}
          {data.media.length === 0 && <p className="text-muted text-sm">{t.instagramData.noPosts}</p>}
        </div>
      )}

      {tab === "comments" && (
        <div className="space-y-3">
          {allComments.length > 0 ? allComments.map((c) => (
            <Card key={c.id} className="!p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm">@{c.username}</p>
                  <p className="text-sm mt-1">{c.text}</p>
                  <p className="text-xs text-muted mt-2">{t.instagramData.onPost}: {c.postCaption}…</p>
                </div>
                <span className="text-xs text-muted shrink-0">{new Date(c.timestamp).toLocaleDateString()}</span>
              </div>
            </Card>
          )) : (
            <p className="text-muted text-sm">{t.instagramData.noComments}</p>
          )}
        </div>
      )}

      {tab === "stories" && (
        <div className="space-y-3">
          {(data.stories ?? []).length > 0 ? data.stories!.map((s) => (
            <Card key={s.id} className="!p-4 flex items-center justify-between">
              <div>
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">{s.mediaType}</Badge>
                <p className="text-sm mt-1">{new Date(s.timestamp).toLocaleString(locale === "es" ? "es-ES" : "en-US")}</p>
              </div>
              {s.permalink && (
                <a href={s.permalink} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4 text-lime" /></a>
              )}
            </Card>
          )) : (
            <p className="text-muted text-sm">{t.instagramData.noStories}</p>
          )}
        </div>
      )}

      {tab === "audience" && (
        <Card>
          <CardHeader title={t.instagramData.tabAudience} description={t.instagramData.audienceDesc} />
          {(data.audience?.onlineFollowers ?? []).length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-muted flex items-center gap-1">
                <Clock className="h-3 w-3" /> {t.instagramData.onlineHours}
              </p>
              <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
                {data.audience!.onlineFollowers!.map((h) => {
                  const max = Math.max(...data.audience!.onlineFollowers!.map((x) => x.value), 1);
                  return (
                    <div key={h.hour} className="text-center">
                      <div
                        className="mx-auto w-full rounded bg-lime/20"
                        style={{ height: `${Math.max(4, (h.value / max) * 48)}px` }}
                        title={`${h.hour}h: ${h.value}`}
                      />
                      <p className="text-[9px] text-muted mt-1">{h.hour}h</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">{t.instagramData.noAudience}</p>
          )}
          <p className="mt-4 text-xs text-muted border-t border-border pt-4">{t.instagramData.dmNote}</p>
        </Card>
      )}
    </div>
  );
}
