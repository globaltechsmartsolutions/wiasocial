import type { InstagramFullData } from "@/types/instagram-data";
import { getSupabase } from "@/lib/supabase";

async function getSessionToken(): Promise<string> {
  const { data: { session } } = await getSupabase().auth.getSession();
  if (!session?.access_token) throw new Error("No hay sesión activa");
  return session.access_token;
}

export async function connectInstagram() {
  const token = await getSessionToken();
  const url = `/api/instagram/auth?token=${encodeURIComponent(token)}`;

  const res = await fetch(url, { redirect: "manual" });

  if (res.status === 503 || res.status === 401) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string }).error ??
        "Instagram no configurado. Añade INSTAGRAM_APP_ID y INSTAGRAM_APP_SECRET en Railway."
    );
  }

  const location = res.headers.get("Location");
  if (location) {
    openInstagramOAuth(location);
    return;
  }

  // Fallback for browsers that follow redirects differently
  openInstagramOAuth(url);
}

function openInstagramOAuth(url: string) {
  const popup = window.open(
    url,
    "wia-instagram-connect",
    "width=520,height=720,menubar=no,toolbar=no,location=yes,status=no"
  );

  if (!popup) {
    window.location.href = url;
    return;
  }

  const handler = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
    const data = event.data as { type?: string; redirectTo?: string };
    if (data.type !== "wia:instagram-connected" && data.type !== "wia:instagram-error") return;

    window.removeEventListener("message", handler);
    popup.close();
    window.location.href = data.redirectTo ?? "/dashboard";
  };

  window.addEventListener("message", handler);
  popup.focus();
}

export async function syncInstagramMetrics() {
  const token = await getSessionToken();
  const res = await fetch("/api/instagram/sync", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error al sincronizar Instagram");
  return data as {
    followers: number;
    gained: number;
    postsImported: number;
    commentsImported?: number;
    username: string;
    insightsLoaded?: number;
    storiesLoaded?: number;
  };
}

export async function fetchInstagramFullData(): Promise<InstagramFullData> {
  const token = await getSessionToken();
  const res = await fetch("/api/instagram/data", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error al cargar datos de Instagram");
  return data as InstagramFullData;
}

export async function disconnectInstagram() {
  const token = await getSessionToken();
  const res = await fetch("/api/instagram/disconnect", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error al desconectar");
  return data;
}

export async function fetchInstagramConnection() {
  const { data: { session } } = await getSupabase().auth.getSession();
  if (!session?.user) return null;

  const { data, error } = await getSupabase()
    .from("instagram_connections")
    .select("ig_username, followers_count, media_count, last_synced_at, connected_at")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    username: data.ig_username as string,
    followersCount: data.followers_count as number,
    mediaCount: data.media_count as number,
    lastSyncedAt: data.last_synced_at as string | null,
    connectedAt: data.connected_at as string,
  };
}
