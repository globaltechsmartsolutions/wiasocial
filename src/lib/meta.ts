import "server-only";

import { getAppUrl } from "@/lib/app-url";

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export function getInstagramRedirectUri(): string {
  return `${getAppUrl()}/api/instagram/callback`;
}

async function graphGet<T>(path: string, accessToken: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${GRAPH_BASE}${path}`);
  if (accessToken) url.searchParams.set("access_token", accessToken);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString());
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Meta API error");
  }
  return data as T;
}

async function graphGetUrl<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Meta API error");
  }
  return data as T;
}

async function graphGetSafe<T>(path: string, accessToken: string, params: Record<string, string> = {}): Promise<T | null> {
  try {
    return await graphGet<T>(path, accessToken, params);
  } catch {
    return null;
  }
}

export async function fetchInstagramFullProfile(igUserId: string, accessToken: string) {
  const data = await graphGet<{
    id: string;
    username: string;
    name?: string;
    biography?: string;
    profile_picture_url?: string;
    website?: string;
    followers_count: number;
    follows_count: number;
    media_count: number;
  }>(`/${igUserId}`, accessToken, {
    fields: "id,username,name,biography,profile_picture_url,website,followers_count,follows_count,media_count",
  });

  return {
    id: data.id,
    username: data.username,
    name: data.name,
    biography: data.biography,
    profilePictureUrl: data.profile_picture_url,
    website: data.website,
    followersCount: data.followers_count ?? 0,
    followsCount: data.follows_count ?? 0,
    mediaCount: data.media_count ?? 0,
  };
}

export async function fetchInstagramAccountInsights(igUserId: string, accessToken: string) {
  const metrics = [
    "reach",
    "profile_views",
    "website_clicks",
    "accounts_engaged",
    "total_interactions",
    "likes",
    "comments",
    "shares",
    "saves",
    "views",
  ].join(",");

  const data = await graphGetSafe<{
    data: { name: string; period: string; title?: string; description?: string; values: { value: number }[] }[];
  }>(`/${igUserId}/insights`, accessToken, { metric: metrics, period: "days_28" });

  if (!data?.data) return [];

  return data.data.map((m) => ({
    name: m.name,
    period: m.period,
    value: m.values?.[0]?.value ?? 0,
    title: m.title,
    description: m.description,
  }));
}

export async function fetchInstagramAudienceInsights(igUserId: string, accessToken: string) {
  const online = await graphGetSafe<{
    data: { name: string; values: { value: Record<string, number> }[] }[];
  }>(`/${igUserId}/insights`, accessToken, {
    metric: "online_followers",
    period: "lifetime",
  });

  const onlineFollowers: { hour: number; value: number }[] = [];
  const onlineValues = online?.data?.[0]?.values?.[0]?.value;
  if (onlineValues) {
    for (const [hour, value] of Object.entries(onlineValues)) {
      onlineFollowers.push({ hour: Number(hour), value: Number(value) });
    }
    onlineFollowers.sort((a, b) => a.hour - b.hour);
  }

  const demographics = await graphGetSafe<{
    data: { name: string; total_value?: { breakdowns?: { results: { dimension_values: string[]; value: number }[] }[] } }[];
  }>(`/${igUserId}/insights`, accessToken, {
    metric: "follower_demographics",
    period: "lifetime",
    metric_type: "total_value",
    breakdown: "age,gender",
  });

  return {
    onlineFollowers,
    demographics: demographics?.data?.[0] ?? null,
  };
}

export async function fetchInstagramStories(igUserId: string, accessToken: string) {
  const data = await graphGetSafe<{
    data: { id: string; media_type?: string; permalink?: string; timestamp: string }[];
  }>(`/${igUserId}/stories`, accessToken, {
    fields: "id,media_type,permalink,timestamp",
  });

  return (data?.data ?? []).map((s) => ({
    id: s.id,
    mediaType: s.media_type ?? "STORY",
    permalink: s.permalink,
    timestamp: s.timestamp,
  }));
}

async function fetchMediaComments(mediaId: string, accessToken: string) {
  const data = await graphGetSafe<{
    data: { id: string; text: string; username?: string; timestamp: string; like_count?: number }[];
  }>(`/${mediaId}/comments`, accessToken, {
    fields: "id,text,username,timestamp,like_count",
    limit: "50",
  });

  return (data?.data ?? []).map((c) => ({
    id: c.id,
    text: c.text,
    username: c.username ?? "unknown",
    timestamp: c.timestamp,
    likeCount: c.like_count ?? 0,
  }));
}

async function fetchMediaInsights(mediaId: string, mediaType: string | undefined, accessToken: string) {
  const reelMetrics = "plays,reach,likes,comments,shares,saved,total_interactions";
  const feedMetrics = "impressions,reach,engagement,saved,shares";
  const metrics = mediaType === "VIDEO" ? reelMetrics : feedMetrics;

  const data = await graphGetSafe<{
    data: { name: string; values: { value: number }[] }[];
  }>(`/${mediaId}/insights`, accessToken, { metric: metrics });

  const insights: Record<string, number> = {};
  for (const m of data?.data ?? []) {
    insights[m.name] = m.values?.[0]?.value ?? 0;
  }
  return insights;
}

interface IgMedia {
  id: string;
  caption?: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
  media_type?: string;
  permalink?: string;
  thumbnail_url?: string;
  media_url?: string;
}

export async function fetchInstagramMedia(igUserId: string, accessToken: string, limit = 100) {
  const fields = "id,caption,timestamp,like_count,comments_count,media_type,permalink,thumbnail_url,media_url";
  let nextUrl: string | null = null;
  const all: IgMedia[] = [];

  const first = await graphGet<{ data: IgMedia[]; paging?: { next?: string } }>(
    `/${igUserId}/media`,
    accessToken,
    { fields, limit: "50" }
  );
  all.push(...first.data);
  nextUrl = first.paging?.next ?? null;

  while (nextUrl && all.length < limit) {
    const page = await graphGetUrl<{ data: IgMedia[]; paging?: { next?: string } }>(nextUrl);
    all.push(...page.data);
    nextUrl = page.paging?.next ?? null;
  }

  const slice = all.slice(0, limit);

  const enriched = await Promise.all(
    slice.map(async (item) => {
      const [insights, comments] = await Promise.all([
        fetchMediaInsights(item.id, item.media_type, accessToken),
        fetchMediaComments(item.id, accessToken),
      ]);

      const views = Math.max(
        insights.plays ?? 0,
        insights.impressions ?? 0,
        insights.reach ?? 0,
        item.like_count ?? 0
      );

      return {
        instagramMediaId: item.id,
        title: (item.caption?.slice(0, 80) || "Publicación de Instagram").trim(),
        type: mapMediaType(item.media_type),
        postedAt: item.timestamp.split("T")[0],
        views,
        likes: item.like_count ?? 0,
        comments: item.comments_count ?? 0,
        saves: insights.saved ?? 0,
        shares: insights.shares ?? 0,
        permalink: item.permalink,
        thumbnailUrl: item.thumbnail_url,
        mediaUrl: item.media_url,
        mediaType: item.media_type ?? "IMAGE",
        caption: item.caption ?? "",
        insights,
        mediaComments: comments,
      };
    })
  );

  return enriched;
}

function mapMediaType(mediaType?: string): "reel" | "carousel" | "story" | "post" {
  if (mediaType === "VIDEO") return "reel";
  if (mediaType === "CAROUSEL_ALBUM") return "carousel";
  if (mediaType === "IMAGE") return "post";
  return "post";
}
