import { getSupabaseForUser } from "@/lib/supabase-admin";
import {
  fetchFollowerSnapshots,
  fetchLeads,
  fetchPosts,
  fetchSettings,
} from "@/lib/db";

export interface UserAIContext {
  settings: {
    brandName: string;
    instagramHandle: string;
    niche: string;
    targetAudience: string;
    offer: string;
    defaultGoal: string;
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
  } | null;
  stats: {
    totalLeads: number;
    callsBooked: number;
    clients: number;
    weekFollowerGain: number;
    totalPosts: number;
    bestPostViews: number;
    latestAuditScore: number | null;
  };
}

export async function buildUserAIContext(userId: string, accessToken: string): Promise<UserAIContext> {
  const sb = getSupabaseForUser(accessToken);

  const [settings, leads, posts, snapshots] = await Promise.all([
    fetchSettings(userId),
    fetchLeads(userId),
    fetchPosts(userId),
    fetchFollowerSnapshots(userId),
  ]);

  let latestAuditScore: number | null = null;
  let instagramContext: UserAIContext["instagram"] = null;

  try {
    const { data: igConnection } = await sb
      .from("instagram_connections")
      .select("ig_username, profile_data, account_insights, followers_count, follows_count, media_count")
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
        .select("caption, like_count, comments_count, insights")
        .eq("user_id", userId)
        .order("like_count", { ascending: false })
        .limit(5);

      instagramContext = {
        connected: true,
        username: igConnection.ig_username as string,
        biography: profile?.biography,
        followers: (igConnection.followers_count as number) ?? profile?.followersCount,
        following: (igConnection.follows_count as number) ?? profile?.followsCount,
        posts: (igConnection.media_count as number) ?? profile?.mediaCount,
        accountInsights: ((igConnection.account_insights as { name: string; value: number }[]) ?? []).slice(0, 8),
        topPosts: (topMedia ?? []).map((m) => ({
          caption: ((m.caption as string) ?? "").slice(0, 120),
          likes: m.like_count as number,
          comments: m.comments_count as number,
          reach: ((m.insights as Record<string, number>)?.reach) ?? 0,
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

  const latest = snapshots[snapshots.length - 1];
  const prev = snapshots[snapshots.length - 2];
  const weekFollowerGain = latest && prev ? latest.followers - prev.followers : 0;
  const bestPost = [...posts].sort((a, b) => b.views - a.views)[0];

  return {
    settings: settings
      ? {
          brandName: settings.brandName,
          instagramHandle: settings.instagramHandle,
          niche: settings.niche,
          targetAudience: settings.targetAudience,
          offer: settings.offer,
          defaultGoal: settings.defaultGoal,
        }
      : null,
    instagram: instagramContext,
    stats: {
      totalLeads: leads.length,
      callsBooked: leads.filter((l) => l.status === "call_booked").length,
      clients: leads.filter((l) => l.status === "client").length,
      weekFollowerGain,
      totalPosts: posts.length,
      bestPostViews: bestPost?.views ?? 0,
      latestAuditScore,
    },
  };
}
