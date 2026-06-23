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
