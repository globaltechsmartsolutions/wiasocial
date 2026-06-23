import { NextResponse } from "next/server";
import { getAccessTokenFromRequest, getUserFromAccessToken } from "@/lib/auth-server";
import { getSupabaseForUser } from "@/lib/supabase-admin";
import type { InstagramFullData } from "@/types/instagram-data";

export async function GET(request: Request) {
  const token = getAccessTokenFromRequest(request);
  const user = await getUserFromAccessToken(token);
  if (!user || !token) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }

  const sb = getSupabaseForUser(token);

  const { data: connection } = await sb
    .from("instagram_connections")
    .select("ig_username, profile_data, account_insights, audience_insights, stories_data, last_synced_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!connection) {
    return NextResponse.json({ connected: false, media: [], stats: { totalPosts: 0, totalComments: 0, totalLikes: 0, totalReach: 0, totalViews: 0 } } satisfies InstagramFullData);
  }

  const { data: mediaRows } = await sb
    .from("instagram_media_items")
    .select("*")
    .eq("user_id", user.id)
    .order("posted_at", { ascending: false })
    .limit(100);

  const media = (mediaRows ?? []).map((row) => ({
    instagramMediaId: row.instagram_media_id as string,
    mediaType: row.media_type as string,
    caption: (row.caption as string) ?? "",
    permalink: row.permalink as string | undefined,
    thumbnailUrl: row.thumbnail_url as string | undefined,
    postedAt: row.posted_at as string,
    likeCount: row.like_count as number,
    commentsCount: row.comments_count as number,
    insights: (row.insights as Record<string, number>) ?? {},
    comments: (row.comments as InstagramFullData["media"][0]["comments"]) ?? [],
  }));

  const totalLikes = media.reduce((s, m) => s + m.likeCount, 0);
  const totalComments = media.reduce((s, m) => s + m.commentsCount, 0);
  const totalReach = media.reduce((s, m) => s + (m.insights.reach ?? 0), 0);
  const totalViews = media.reduce((s, m) => s + Math.max(m.insights.plays ?? 0, m.insights.impressions ?? 0), 0);

  const accountInsights = (connection.account_insights as InstagramFullData["accountInsights"]) ?? [];

  const payload: InstagramFullData = {
    connected: true,
    username: connection.ig_username as string,
    profile: connection.profile_data as InstagramFullData["profile"],
    accountInsights,
    audience: connection.audience_insights as InstagramFullData["audience"],
    stories: connection.stories_data as InstagramFullData["stories"],
    media,
    lastSyncedAt: connection.last_synced_at as string | undefined,
    stats: {
      totalPosts: media.length,
      totalComments,
      totalLikes,
      totalReach,
      totalViews,
    },
  };

  return NextResponse.json(payload);
}
