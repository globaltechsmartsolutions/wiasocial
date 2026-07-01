import type { InstagramFullData } from "@/types/instagram-data";
import { getSupabase } from "@/lib/supabase";

async function getSessionToken(): Promise<string> {
  const { data: { session } } = await getSupabase().auth.getSession();
  if (!session?.access_token) throw new Error("No hay sesión activa");
  return session.access_token;
}

export async function connectInstagram() {
  const popup = openInstagramPopup();
  const cleanup = popup ? listenForInstagramOAuth(popup) : undefined;

  try {
    const status = await fetch("/api/instagram/status").then((r) => r.json()).catch(() => null);
    if (status && status.ready === false) {
      throw new Error(status.message ?? "Instagram no configurado.");
    }

    const token = await getSessionToken();
    const authRes = await fetch("/api/instagram/auth", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const authData = await authRes.json();
    if (!authRes.ok || !authData.url) {
      throw new Error(authData.error || "No se pudo iniciar Instagram.");
    }
    const url = authData.url as string;

    if (popup) {
      popup.location.href = url;
      popup.focus();
      return;
    }

    window.location.href = url;
  } catch (error) {
    cleanup?.();
    popup?.close();
    throw error;
  }
}

function openInstagramPopup() {
  const popup = window.open(
    "about:blank",
    `wia-instagram-connect-${Date.now()}`,
    "width=520,height=720,menubar=no,toolbar=no,location=yes,status=no"
  );

  if (popup) {
    popup.document.write("<p style='font-family: system-ui, sans-serif; padding: 24px;'>Abriendo Instagram...</p>");
    popup.document.close();
  }

  return popup;
}

function listenForInstagramOAuth(popup: Window) {
  const handler = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
    const data = event.data as { type?: string; redirectTo?: string };
    if (data.type !== "wia:instagram-connected" && data.type !== "wia:instagram-error") return;

    window.removeEventListener("message", handler);
    popup.close();
    window.location.href = data.redirectTo ?? "/dashboard";
  };

  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
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

export async function publishInstagramCarousel(payload: {
  caption: string;
  slides: { slide: number; dataUrl: string }[];
}) {
  const token = await getSessionToken();
  const res = await fetch("/api/instagram/publish", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error al publicar en Instagram");
  return data as { ok: boolean; instagramMediaId: string; slides: number };
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
