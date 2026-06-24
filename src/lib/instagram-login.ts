import "server-only";
import crypto from "crypto";
import { getAppUrl, getInstagramRedirectUri } from "@/lib/meta";

const IG_GRAPH = "https://graph.instagram.com/v21.0";

export function getInstagramAppId(): string {
  return process.env.INSTAGRAM_APP_ID ?? "";
}

export function getInstagramAppSecret(): string {
  return process.env.INSTAGRAM_APP_SECRET ?? "";
}

export function isInstagramLoginConfigured(): boolean {
  const id = getInstagramAppId();
  const secret = getInstagramAppSecret();
  return Boolean(id && secret && !id.includes("your_") && !id.includes("your_meta"));
}

export function signInstagramOAuthState(userId: string): string {
  const secret = getInstagramAppSecret();
  if (!secret) throw new Error("INSTAGRAM_APP_SECRET not configured");

  const payload = JSON.stringify({ userId, ts: Date.now() });
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return Buffer.from(JSON.stringify({ payload, sig })).toString("base64url");
}

export function verifyInstagramOAuthState(state: string): string | null {
  try {
    const secret = getInstagramAppSecret();
    if (!secret) return null;

    const { payload, sig } = JSON.parse(Buffer.from(state, "base64url").toString());
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    if (sig !== expected) return null;

    const { userId, ts } = JSON.parse(payload);
    if (Date.now() - ts > 15 * 60 * 1000) return null;
    return userId;
  } catch {
    return null;
  }
}

export function getInstagramLoginScopes(): string {
  return [
    "instagram_business_basic",
    "instagram_business_manage_insights",
    "instagram_business_manage_comments",
  ].join(",");
}

export function buildInstagramLoginUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getInstagramAppId(),
    redirect_uri: getInstagramRedirectUri(),
    response_type: "code",
    scope: getInstagramLoginScopes(),
    state,
    enable_fb_login: "false",
  });
  return `https://www.instagram.com/oauth/authorize?${params}`;
}

export async function exchangeInstagramCodeForToken(code: string) {
  const body = new FormData();
  body.append("client_id", getInstagramAppId());
  body.append("client_secret", getInstagramAppSecret());
  body.append("grant_type", "authorization_code");
  body.append("redirect_uri", getInstagramRedirectUri());
  body.append("code", code);

  const res = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    body,
  });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error_message || data?.error?.message || "Error al obtener token de Instagram");
  }

  const entry = data.data?.[0] ?? data;
  if (!entry?.access_token || !entry?.user_id) {
    throw new Error("Respuesta de token inválida");
  }

  return {
    accessToken: entry.access_token as string,
    userId: String(entry.user_id),
    permissions: entry.permissions as string | undefined,
  };
}

export async function exchangeInstagramLongLivedToken(shortToken: string) {
  const url = new URL(`${IG_GRAPH}/access_token`);
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", getInstagramAppSecret());
  url.searchParams.set("access_token", shortToken);

  const res = await fetch(url.toString());
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Error al obtener token de larga duración");
  }

  return {
    access_token: data.access_token as string,
    expires_in: data.expires_in as number,
  };
}

export async function connectInstagramLoginAccount(code: string) {
  const short = await exchangeInstagramCodeForToken(code);
  const long = await exchangeInstagramLongLivedToken(short.accessToken);
  const profile = await fetchIgLoginProfile(short.userId, long.access_token);

  return {
    igUserId: short.userId,
    igUsername: profile.username,
    accessToken: long.access_token,
    expiresIn: long.expires_in,
    followersCount: profile.followersCount,
    mediaCount: profile.mediaCount,
  };
}

async function igGraphGet<T>(path: string, accessToken: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${IG_GRAPH}${path}`);
  url.searchParams.set("access_token", accessToken);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString());
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Instagram API error");
  }
  return data as T;
}

async function igGraphGetSafe<T>(path: string, accessToken: string, params: Record<string, string> = {}): Promise<T | null> {
  try {
    return await igGraphGet<T>(path, accessToken, params);
  } catch {
    return null;
  }
}

async function igGraphGetUrl<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Instagram API error");
  return data as T;
}

export async function fetchIgLoginProfile(igUserId: string, accessToken: string) {
  const data = await igGraphGet<{
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

export async function fetchIgLoginAccountInsights(igUserId: string, accessToken: string) {
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

  const data = await igGraphGetSafe<{
    data: { name: string; period: string; title?: string; description?: string; values: { value: number }[] }[];
  }>(`/${igUserId}/insights`, accessToken, { metric: metrics, period: "days_28" });

  return (data?.data ?? []).map((m) => ({
    name: m.name,
    period: m.period,
    value: m.values?.[0]?.value ?? 0,
    title: m.title,
    description: m.description,
  }));
}

export async function fetchIgLoginAudienceInsights(igUserId: string, accessToken: string) {
  const online = await igGraphGetSafe<{
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

  const demographics = await igGraphGetSafe<{
    data: { name: string; total_value?: unknown }[];
  }>(`/${igUserId}/insights`, accessToken, {
    metric: "follower_demographics",
    period: "lifetime",
    metric_type: "total_value",
    breakdown: "age,gender",
  });

  return { onlineFollowers, demographics: demographics?.data?.[0] ?? null };
}

export async function fetchIgLoginStories(igUserId: string, accessToken: string) {
  const data = await igGraphGetSafe<{
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

async function fetchIgLoginMediaComments(mediaId: string, accessToken: string) {
  const data = await igGraphGetSafe<{
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

async function fetchIgLoginMediaInsights(mediaId: string, mediaType: string | undefined, accessToken: string) {
  const reelMetrics = "plays,reach,likes,comments,shares,saved,total_interactions";
  const feedMetrics = "impressions,reach,engagement,saved,shares";
  const metrics = mediaType === "VIDEO" ? reelMetrics : feedMetrics;

  const data = await igGraphGetSafe<{
    data: { name: string; values: { value: number }[] }[];
  }>(`/${mediaId}/insights`, accessToken, { metric: metrics });

  const insights: Record<string, number> = {};
  for (const m of data?.data ?? []) {
    insights[m.name] = m.values?.[0]?.value ?? 0;
  }
  return insights;
}

function mapMediaType(mediaType?: string): "reel" | "carousel" | "story" | "post" {
  if (mediaType === "VIDEO") return "reel";
  if (mediaType === "CAROUSEL_ALBUM") return "carousel";
  if (mediaType === "IMAGE") return "post";
  return "post";
}

export async function fetchIgLoginMedia(igUserId: string, accessToken: string, limit = 100) {
  const fields = "id,caption,timestamp,like_count,comments_count,media_type,permalink,thumbnail_url,media_url";
  let nextUrl: string | null = null;
  const all: {
    id: string;
    caption?: string;
    timestamp: string;
    like_count?: number;
    comments_count?: number;
    media_type?: string;
    permalink?: string;
    thumbnail_url?: string;
    media_url?: string;
  }[] = [];

  const first = await igGraphGet<{ data: typeof all; paging?: { next?: string } }>(
    `/${igUserId}/media`,
    accessToken,
    { fields, limit: "50" }
  );
  all.push(...first.data);
  nextUrl = first.paging?.next ?? null;

  while (nextUrl && all.length < limit) {
    const page = await igGraphGetUrl<{ data: typeof all; paging?: { next?: string } }>(nextUrl);
    all.push(...page.data);
    nextUrl = page.paging?.next ?? null;
  }

  const slice = all.slice(0, limit);

  return Promise.all(
    slice.map(async (item) => {
      const [insights, comments] = await Promise.all([
        fetchIgLoginMediaInsights(item.id, item.media_type, accessToken),
        fetchIgLoginMediaComments(item.id, accessToken),
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
}
