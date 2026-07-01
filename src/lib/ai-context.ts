import { getSupabaseForUser } from "@/lib/supabase-admin";
import { mergeBrandMemory } from "@/lib/brand-memory";
import type { BrandMemory, LeadStatus, PostPerformance, UserSettings } from "@/types";
import type { GrowthRadarReport } from "@/types/growth-radar";

type NumericInsightMap = Record<string, number>;

interface MediaContextRow {
  caption: string | null;
  media_type: string | null;
  like_count: number | null;
  comments_count: number | null;
  insights: NumericInsightMap | null;
  comments?: unknown;
  posted_at?: string | null;
}

interface ContextLead {
  status: LeadStatus;
}

interface ContextSnapshot {
  followers: number;
}

export interface UserAIContext {
  settings: {
    brandName: string;
    instagramHandle: string;
    niche: string;
    targetAudience: string;
    offer: string;
    defaultTone: string;
    defaultGoal: string;
    brandMemory: BrandMemory;
  } | null;
  instagram: {
    connected: boolean;
    username?: string;
    biography?: string;
    followers?: number;
    following?: number;
    posts?: number;
    accountInsights?: { name: string; value: number }[];
    topPosts?: { caption: string; likes: number; comments: number; reach: number }[];
    audienceSignals?: {
      topOnlineHours: { hour: string; value: number }[];
      demographicHighlights: string[];
    };
  } | null;
  stats: {
    totalLeads: number;
    callsBooked: number;
    clients: number;
    leadConversionRate: number;
    weekFollowerGain: number;
    totalPosts: number;
    bestPostViews: number;
    latestAuditScore: number | null;
  };
  growthSignals: {
    bestFormats: { format: string; posts: number; avgEngagement: number; avgViews: number }[];
    topContent: { title: string; type: string; views: number; saves: number; leadsGenerated: number }[];
    contentGaps: string[];
    leadSignals: { label: string; value: number | string }[];
    instagramSignals: { label: string; value: number | string }[];
  };
  latestGrowthRadar: {
    reportWeek: string;
    opportunityScore: number;
    headline: string;
    biggestOpportunity: string;
    topRecommendations: string[];
  } | null;
}

export async function buildUserAIContext(userId: string, accessToken: string): Promise<UserAIContext> {
  const sb = getSupabaseForUser(accessToken);

  const [settings, leads, posts, snapshots] = await Promise.all([
    fetchSettingsForContext(sb, userId),
    fetchLeadsForContext(sb, userId),
    fetchPostsForContext(sb, userId),
    fetchFollowerSnapshotsForContext(sb, userId),
  ]);

  let latestAuditScore: number | null = null;
  let instagramContext: UserAIContext["instagram"] = null;
  let instagramSignals: UserAIContext["growthSignals"]["instagramSignals"] = [];
  let latestGrowthRadar: UserAIContext["latestGrowthRadar"] = null;

  try {
    const { data: igConnection } = await sb
      .from("instagram_connections")
      .select("ig_username, profile_data, account_insights, audience_insights, followers_count, follows_count, media_count")
      .eq("user_id", userId)
      .maybeSingle();

    if (igConnection) {
      const profile = igConnection.profile_data as {
        biography?: string;
        username?: string;
        followersCount?: number;
        followsCount?: number;
        mediaCount?: number;
      } | null;

      const { data: topMedia } = await sb
        .from("instagram_media_items")
        .select("caption, media_type, like_count, comments_count, insights, comments, posted_at")
        .eq("user_id", userId)
        .order("like_count", { ascending: false })
        .limit(25);

      const mediaRows = (topMedia ?? []) as MediaContextRow[];
      const accountInsights = normalizeInsights(igConnection.account_insights);
      const audienceSignals = buildAudienceSignals(igConnection.audience_insights);
      instagramSignals = [
        { label: "followers", value: (igConnection.followers_count as number) ?? profile?.followersCount ?? 0 },
        { label: "following", value: (igConnection.follows_count as number) ?? profile?.followsCount ?? 0 },
        { label: "media_count", value: (igConnection.media_count as number) ?? profile?.mediaCount ?? 0 },
        ...accountInsights.slice(0, 5).map((i) => ({ label: i.name, value: i.value })),
      ];

      instagramContext = {
        connected: true,
        username: igConnection.ig_username as string,
        biography: profile?.biography,
        followers: (igConnection.followers_count as number) ?? profile?.followersCount,
        following: (igConnection.follows_count as number) ?? profile?.followsCount,
        posts: (igConnection.media_count as number) ?? profile?.mediaCount,
        accountInsights: accountInsights.slice(0, 8),
        audienceSignals,
        topPosts: mediaRows.slice(0, 5).map((m) => ({
          caption: ((m.caption as string) ?? "").slice(0, 120),
          likes: m.like_count ?? 0,
          comments: m.comments_count ?? 0,
          reach: m.insights?.reach ?? 0,
        })),
      };
    }
  } catch {
    instagramContext = null;
  }

  try {
    const { data } = await sb
      .from("instagram_audits")
      .select("growth_score")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    latestAuditScore = (data?.growth_score as number) ?? null;
  } catch {
    latestAuditScore = null;
  }

  try {
    const { data } = await sb
      .from("growth_radar_reports")
      .select("report_week, opportunity_score, report")
      .eq("user_id", userId)
      .order("report_week", { ascending: false })
      .limit(1)
      .maybeSingle();

    const report = data?.report as GrowthRadarReport | undefined;
    if (data && report) {
      latestGrowthRadar = {
        reportWeek: data.report_week as string,
        opportunityScore: (data.opportunity_score as number) ?? report.opportunityScore,
        headline: report.headline,
        biggestOpportunity: report.biggestOpportunity,
        topRecommendations: report.recommendations?.slice(0, 3).map((r) => r.title) ?? [],
      };
    }
  } catch {
    latestGrowthRadar = null;
  }

  const latest = snapshots[snapshots.length - 1];
  const prev = snapshots[snapshots.length - 2];
  const weekFollowerGain = latest && prev ? latest.followers - prev.followers : 0;
  const bestPost = [...posts].sort((a, b) => b.views - a.views)[0];
  const leadConversionRate = leads.length > 0 ? Math.round((leads.filter((l) => l.status === "client").length / leads.length) * 100) : 0;
  const bestFormats = buildFormatSignals(posts);
  const topContent = [...posts]
    .sort((a, b) => (b.views + b.saves * 4 + b.leadsGenerated * 20) - (a.views + a.saves * 4 + a.leadsGenerated * 20))
    .slice(0, 5)
    .map((p) => ({
      title: p.title,
      type: p.type,
      views: p.views,
      saves: p.saves,
      leadsGenerated: p.leadsGenerated,
    }));
  const contentGaps = buildContentGaps(posts, Boolean(instagramContext?.connected));

  return {
    settings: settings
      ? {
          brandName: settings.brandName,
          instagramHandle: settings.instagramHandle,
          niche: settings.niche,
          targetAudience: settings.targetAudience,
          offer: settings.offer,
          defaultTone: settings.defaultTone,
          defaultGoal: settings.defaultGoal,
          brandMemory: settings.brandMemory,
        }
      : null,
    instagram: instagramContext,
    stats: {
      totalLeads: leads.length,
      callsBooked: leads.filter((l) => l.status === "call_booked").length,
      clients: leads.filter((l) => l.status === "client").length,
      leadConversionRate,
      weekFollowerGain,
      totalPosts: posts.length,
      bestPostViews: bestPost?.views ?? 0,
      latestAuditScore,
    },
    growthSignals: {
      bestFormats,
      topContent,
      contentGaps,
      leadSignals: [
        { label: "total_leads", value: leads.length },
        { label: "calls_booked", value: leads.filter((l) => l.status === "call_booked").length },
        { label: "clients", value: leads.filter((l) => l.status === "client").length },
        { label: "conversion_rate_percent", value: leadConversionRate },
      ],
      instagramSignals,
    },
    latestGrowthRadar,
  };
}

function normalizeInsights(value: unknown): { name: string; value: number }[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => ({
        name: String((item as { name?: unknown }).name ?? ""),
        value: Number((item as { value?: unknown }).value ?? 0),
      }))
      .filter((item) => item.name);
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([name, raw]) => ({ name, value: Number(raw) || 0 }))
      .filter((item) => Number.isFinite(item.value));
  }

  return [];
}

function buildAudienceSignals(value: unknown): UserAIContext["instagram"] extends infer T
  ? T extends { audienceSignals?: infer S } ? S : never
  : never {
  const data = (value ?? {}) as Record<string, unknown>;
  const onlineFollowers = (data.online_followers ?? data.onlineFollowers ?? {}) as Record<string, unknown>;
  const topOnlineHours = Object.entries(onlineFollowers)
    .map(([hour, raw]) => ({ hour, value: Number(raw) || 0 }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const demographicHighlights = Object.entries(data)
    .filter(([key, raw]) => key !== "online_followers" && key !== "onlineFollowers" && raw && typeof raw === "object")
    .slice(0, 3)
    .map(([key, raw]) => {
      const entries = Object.entries(raw as Record<string, unknown>)
        .sort((a, b) => Number(b[1]) - Number(a[1]))
        .slice(0, 2)
        .map(([label, count]) => `${label}: ${count}`)
        .join(", ");
      return `${key}: ${entries}`;
    })
    .filter(Boolean);

  return { topOnlineHours, demographicHighlights };
}

async function fetchSettingsForContext(sb: ReturnType<typeof getSupabaseForUser>, userId: string): Promise<UserSettings | null> {
  const { data, error } = await sb
    .from("user_settings")
    .select("brand_name, instagram_handle, niche, target_audience, offer, default_tone, default_goal, brand_memory")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    brandName: (data.brand_name as string) ?? "",
    instagramHandle: (data.instagram_handle as string) ?? "",
    niche: (data.niche as string) ?? "",
    targetAudience: (data.target_audience as string) ?? "",
    offer: (data.offer as string) ?? "",
    defaultTone: (data.default_tone as UserSettings["defaultTone"]) ?? "professional",
    defaultGoal: (data.default_goal as UserSettings["defaultGoal"]) ?? "leads",
    brandMemory: mergeBrandMemory(data.brand_memory),
  };
}

async function fetchLeadsForContext(sb: ReturnType<typeof getSupabaseForUser>, userId: string): Promise<ContextLead[]> {
  const { data, error } = await sb
    .from("leads")
    .select("status")
    .eq("user_id", userId);

  if (error) return [];
  return (data ?? []).map((lead) => ({ status: lead.status as LeadStatus }));
}

async function fetchPostsForContext(sb: ReturnType<typeof getSupabaseForUser>, userId: string): Promise<PostPerformance[]> {
  const { data, error } = await sb
    .from("post_performance")
    .select("id, title, type, posted_at, views, likes, comments, saves, shares, leads_generated")
    .eq("user_id", userId)
    .order("posted_at", { ascending: false });

  if (error) return [];
  return (data ?? []).map((post) => ({
    id: post.id as string,
    title: (post.title as string) ?? "",
    type: post.type as PostPerformance["type"],
    postedAt: (post.posted_at as string) ?? "",
    views: Number(post.views) || 0,
    likes: Number(post.likes) || 0,
    comments: Number(post.comments) || 0,
    saves: Number(post.saves) || 0,
    shares: Number(post.shares) || 0,
    leadsGenerated: Number(post.leads_generated) || 0,
  }));
}

async function fetchFollowerSnapshotsForContext(
  sb: ReturnType<typeof getSupabaseForUser>,
  userId: string
): Promise<ContextSnapshot[]> {
  const { data, error } = await sb
    .from("follower_snapshots")
    .select("followers")
    .eq("user_id", userId)
    .order("recorded_at", { ascending: true });

  if (error) return [];
  return (data ?? []).map((snapshot) => ({ followers: Number(snapshot.followers) || 0 }));
}

function buildFormatSignals(posts: PostPerformance[]): UserAIContext["growthSignals"]["bestFormats"] {
  const byFormat = new Map<string, { posts: number; engagement: number; views: number }>();

  for (const post of posts) {
    const current = byFormat.get(post.type) ?? { posts: 0, engagement: 0, views: 0 };
    current.posts += 1;
    current.engagement += post.likes + post.comments + post.saves + post.shares;
    current.views += post.views;
    byFormat.set(post.type, current);
  }

  return [...byFormat.entries()]
    .map(([format, data]) => ({
      format,
      posts: data.posts,
      avgEngagement: Math.round(data.engagement / Math.max(data.posts, 1)),
      avgViews: Math.round(data.views / Math.max(data.posts, 1)),
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement)
    .slice(0, 4);
}

function buildContentGaps(posts: PostPerformance[], instagramConnected: boolean): string[] {
  const gaps: string[] = [];
  const formats = new Set(posts.map((post) => post.type));
  const recentPosts = posts.filter((post) => {
    const postedAt = new Date(post.postedAt).getTime();
    return Number.isFinite(postedAt) && Date.now() - postedAt < 14 * 24 * 60 * 60 * 1000;
  });

  if (!instagramConnected) gaps.push("Instagram is not connected, so recommendations rely on manual data.");
  if (posts.length < 5) gaps.push("Not enough tracked posts to confidently identify repeatable winners.");
  if (!formats.has("reel")) gaps.push("No reels tracked recently; short-form reach opportunities may be underused.");
  if (!formats.has("carousel")) gaps.push("No carousels tracked recently; save-driven authority content may be missing.");
  if (recentPosts.length < 3) gaps.push("Posting volume is light for the last 14 days.");

  return gaps.slice(0, 5);
}
