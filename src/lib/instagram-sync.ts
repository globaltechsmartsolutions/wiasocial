import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchIgLoginAccountInsights,
  fetchIgLoginAudienceInsights,
  fetchIgLoginMedia,
  fetchIgLoginProfile,
  fetchIgLoginStories,
} from "@/lib/instagram-login";
import {
  fetchInstagramAccountInsights,
  fetchInstagramAudienceInsights,
  fetchInstagramFullProfile,
  fetchInstagramMedia,
  fetchInstagramStories,
} from "@/lib/meta";

interface ConnectionRow {
  ig_user_id: string;
  access_token: string;
  loginType?: "instagram" | "facebook";
}

export interface InstagramSyncResult {
  followers: number;
  gained: number;
  postsImported: number;
  commentsImported: number;
  username: string;
  insightsLoaded: number;
  storiesLoaded: number;
}

export async function syncInstagramDataForUser(
  sb: SupabaseClient,
  userId: string,
  connection: ConnectionRow
): Promise<InstagramSyncResult> {
  const useIgLogin = connection.loginType === "instagram";

  const [profile, accountInsights, audience, stories, media] = await Promise.all([
    useIgLogin
      ? fetchIgLoginProfile(connection.ig_user_id, connection.access_token)
      : fetchInstagramFullProfile(connection.ig_user_id, connection.access_token),
    useIgLogin
      ? fetchIgLoginAccountInsights(connection.ig_user_id, connection.access_token)
      : fetchInstagramAccountInsights(connection.ig_user_id, connection.access_token),
    useIgLogin
      ? fetchIgLoginAudienceInsights(connection.ig_user_id, connection.access_token)
      : fetchInstagramAudienceInsights(connection.ig_user_id, connection.access_token),
    useIgLogin
      ? fetchIgLoginStories(connection.ig_user_id, connection.access_token)
      : fetchInstagramStories(connection.ig_user_id, connection.access_token),
    useIgLogin
      ? fetchIgLoginMedia(connection.ig_user_id, connection.access_token, 100)
      : fetchInstagramMedia(connection.ig_user_id, connection.access_token, 100),
  ]);

  const { data: lastSnapshot } = await sb
    .from("follower_snapshots")
    .select("followers")
    .eq("user_id", userId)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const prevFollowers = (lastSnapshot?.followers as number | undefined) ?? profile.followersCount;
  const gained = profile.followersCount - prevFollowers;
  const today = new Date().toISOString().split("T")[0];

  const { data: todaySnapshot } = await sb
    .from("follower_snapshots")
    .select("id")
    .eq("user_id", userId)
    .eq("recorded_at", today)
    .maybeSingle();

  if (todaySnapshot?.id) {
    await sb.from("follower_snapshots").update({
      followers: profile.followersCount,
      gained,
    }).eq("id", todaySnapshot.id);
  } else {
    await sb.from("follower_snapshots").insert({
      user_id: userId,
      recorded_at: today,
      followers: profile.followersCount,
      gained,
    });
  }

  let postsImported = 0;
  let commentsImported = 0;

  for (const post of media) {
    const { data: existing } = await sb
      .from("post_performance")
      .select("id")
      .eq("user_id", userId)
      .eq("instagram_media_id", post.instagramMediaId)
      .maybeSingle();

    const row = {
      user_id: userId,
      instagram_media_id: post.instagramMediaId,
      title: post.title,
      type: post.type,
      posted_at: post.postedAt,
      views: post.views,
      likes: post.likes,
      comments: post.comments,
      saves: post.saves,
      shares: post.shares,
      leads_generated: 0,
    };

    if (existing?.id) {
      const { error: postError } = await sb.from("post_performance").update(row).eq("id", existing.id);
      if (!postError) postsImported += 1;
    } else {
      const { error: postError } = await sb.from("post_performance").insert(row);
      if (!postError) postsImported += 1;
    }

    commentsImported += post.mediaComments.length;

    await sb.from("instagram_media_items").upsert({
      user_id: userId,
      instagram_media_id: post.instagramMediaId,
      media_type: post.mediaType,
      caption: post.caption,
      permalink: post.permalink,
      thumbnail_url: post.thumbnailUrl,
      media_url: post.mediaUrl,
      posted_at: post.postedAt,
      like_count: post.likes,
      comments_count: post.comments,
      insights: post.insights,
      comments: post.mediaComments,
      synced_at: new Date().toISOString(),
    }, { onConflict: "user_id,instagram_media_id" });
  }

  await sb.from("instagram_connections").update({
    ig_username: profile.username,
    followers_count: profile.followersCount,
    follows_count: profile.followsCount,
    media_count: profile.mediaCount,
    profile_data: profile,
    account_insights: accountInsights,
    audience_insights: audience,
    stories_data: stories,
    last_synced_at: new Date().toISOString(),
  }).eq("user_id", userId);

  await sb
    .from("user_settings")
    .upsert({
      user_id: userId,
      instagram_handle: `@${profile.username}`,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

  return {
    followers: profile.followersCount,
    gained,
    postsImported,
    commentsImported,
    username: profile.username,
    insightsLoaded: accountInsights.length,
    storiesLoaded: stories.length,
  };
}
