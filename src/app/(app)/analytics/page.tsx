"use client";

import { useEffect, useState, useCallback } from "react";
import { BarChart3, Plus, Eye, Heart, MessageCircle, Bookmark, Share2, UserPlus, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { formatNumber, formatDate } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { useAuth } from "@/contexts/AuthContext";
import { fetchPosts, createPost } from "@/lib/db";
import { fetchInstagramConnection, syncInstagramMetrics } from "@/lib/instagram-client";
import type { PostPerformance } from "@/types";

export default function AnalyticsPage() {
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [igConnected, setIgConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [newPost, setNewPost] = useState({ title: "", type: "reel" as PostPerformance["type"], views: "", likes: "", comments: "", saves: "", shares: "", leadsGenerated: "" });

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setPosts(await fetchPosts(user.id));
    setIgConnected(Boolean(await fetchInstagramConnection()));
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const totals = posts.reduce((acc, p) => ({
    views: acc.views + p.views, likes: acc.likes + p.likes, comments: acc.comments + p.comments,
    saves: acc.saves + p.saves, shares: acc.shares + p.shares, leads: acc.leads + p.leadsGenerated,
  }), { views: 0, likes: 0, comments: 0, saves: 0, shares: 0, leads: 0 });

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncInstagramMetrics();
      await load();
    } finally {
      setSyncing(false);
    }
  };

  const handleAddPost = async () => {
    if (!user || !newPost.title) return;
    const post = await createPost(user.id, {
      title: newPost.title, type: newPost.type, postedAt: new Date().toISOString().split("T")[0],
      views: parseInt(newPost.views) || 0, likes: parseInt(newPost.likes) || 0,
      comments: parseInt(newPost.comments) || 0, saves: parseInt(newPost.saves) || 0,
      shares: parseInt(newPost.shares) || 0, leadsGenerated: parseInt(newPost.leadsGenerated) || 0,
    });
    setPosts([post, ...posts]);
    setShowAddForm(false);
    setNewPost({ title: "", type: "reel", views: "", likes: "", comments: "", saves: "", shares: "", leadsGenerated: "" });
  };

  const typeOptions = (["reel", "carousel", "story", "post"] as const).map((type) => ({ value: type, label: t.postType[type] }));
  const typeBadgeColors: Record<string, string> = {
    reel: "bg-pink-500/20 text-pink-400 border-pink-500/30", carousel: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    story: "bg-purple-500/20 text-purple-400 border-purple-500/30", post: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-lime" /></div>;

  return (
    <div>
      <PageHeader title={t.analytics.title} description={t.analytics.description}
        action={
          <div className="flex gap-2">
            {igConnected && (
              <Button variant="secondary" onClick={handleSync} disabled={syncing}>
                {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Sync Instagram
              </Button>
            )}
            <Button onClick={() => setShowAddForm(!showAddForm)}><Plus className="h-4 w-4" />{t.analytics.logPost}</Button>
          </div>
        } />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard title={t.analytics.totalViews} value={totals.views} icon={Eye} />
        <StatCard title={t.analytics.totalLikes} value={totals.likes} icon={Heart} />
        <StatCard title={t.common.comments} value={totals.comments} icon={MessageCircle} />
        <StatCard title={t.common.saves} value={totals.saves} icon={Bookmark} />
        <StatCard title={t.common.shares} value={totals.shares} icon={Share2} />
        <StatCard title={t.common.leads} value={totals.leads} icon={UserPlus} trendUp />
      </div>
      {showAddForm && (
        <Card className="mt-6">
          <CardHeader title={t.analytics.logPostTitle} description={t.analytics.logPostDesc} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Input id="title" label={t.analytics.postTitle} value={newPost.title} onChange={(e) => setNewPost({ ...newPost, title: e.target.value })} />
            <Select id="type" label={t.common.type} value={newPost.type} onChange={(e) => setNewPost({ ...newPost, type: e.target.value as PostPerformance["type"] })} options={typeOptions} />
            <Input id="views" label={t.common.views} type="number" value={newPost.views} onChange={(e) => setNewPost({ ...newPost, views: e.target.value })} />
            <Input id="likes" label={t.common.likes} type="number" value={newPost.likes} onChange={(e) => setNewPost({ ...newPost, likes: e.target.value })} />
            <Input id="comments" label={t.common.comments} type="number" value={newPost.comments} onChange={(e) => setNewPost({ ...newPost, comments: e.target.value })} />
            <Input id="saves" label={t.common.saves} type="number" value={newPost.saves} onChange={(e) => setNewPost({ ...newPost, saves: e.target.value })} />
            <Input id="shares" label={t.common.shares} type="number" value={newPost.shares} onChange={(e) => setNewPost({ ...newPost, shares: e.target.value })} />
            <Input id="leads" label={t.analytics.leadsGenerated} type="number" value={newPost.leadsGenerated} onChange={(e) => setNewPost({ ...newPost, leadsGenerated: e.target.value })} />
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={handleAddPost}>{t.analytics.savePost}</Button>
            <Button variant="ghost" onClick={() => setShowAddForm(false)}>{t.common.cancel}</Button>
          </div>
        </Card>
      )}
      <Card className="mt-8">
        <CardHeader title={t.analytics.performance} description={t.analytics.performanceDesc} action={<BarChart3 className="h-5 w-5 text-lime" />} />
        {posts.length === 0 ? (
          <p className="text-sm text-muted py-8 text-center">Add your first post using real metrics from Instagram Insights</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="pb-3 pr-4">{t.common.post}</th><th className="pb-3 pr-4">{t.common.type}</th><th className="pb-3 pr-4">{t.common.date}</th>
                  <th className="pb-3 pr-4 text-right">{t.common.views}</th><th className="pb-3 pr-4 text-right">{t.common.likes}</th>
                  <th className="pb-3 pr-4 text-right">{t.common.comments}</th><th className="pb-3 pr-4 text-right">{t.common.saves}</th>
                  <th className="pb-3 font-medium text-right">{t.common.leads}</th>
                </tr>
              </thead>
              <tbody>
                {[...posts].sort((a, b) => b.views - a.views).map((post) => (
                  <tr key={post.id} className="border-b border-border-subtle hover:bg-surface-elevated/50">
                    <td className="py-3 pr-4 text-sm font-medium max-w-[200px] truncate">{post.title}</td>
                    <td className="py-3 pr-4"><Badge className={typeBadgeColors[post.type]}>{t.postType[post.type]}</Badge></td>
                    <td className="py-3 pr-4 text-sm text-muted">{formatDate(post.postedAt, locale)}</td>
                    <td className="py-3 pr-4 text-right text-sm font-medium text-lime">{formatNumber(post.views)}</td>
                    <td className="py-3 pr-4 text-right text-sm">{formatNumber(post.likes)}</td>
                    <td className="py-3 pr-4 text-right text-sm">{post.comments}</td>
                    <td className="py-3 pr-4 text-right text-sm">{formatNumber(post.saves)}</td>
                    <td className="py-3 text-right text-sm font-medium text-lime">{post.leadsGenerated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
