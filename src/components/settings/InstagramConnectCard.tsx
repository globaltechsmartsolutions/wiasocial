"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Instagram, Loader2, RefreshCw, Unplug } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  connectInstagram,
  disconnectInstagram,
  fetchInstagramConnection,
  syncInstagramMetrics,
} from "@/lib/instagram-client";
import { isInstagramLoginConfiguredPublic } from "@/lib/instagram-login";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

export function InstagramConnectCard() {
  const { t, locale } = useTranslation();
  const searchParams = useSearchParams();
  const [connection, setConnection] = useState<Awaited<ReturnType<typeof fetchInstagramConnection>>>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      setConnection(await fetchInstagramConnection());
    } catch {
      setConnection(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const status = searchParams.get("instagram");
    const msg = searchParams.get("message");
    const user = searchParams.get("user");
    if (status === "connected" && user) {
      setMessage(t.instagram.connected.replace("{user}", user));
      load();
    }
    if (status === "error") {
      setError(msg ? decodeURIComponent(msg) : (locale === "es" ? "Error al conectar Instagram" : "Instagram connection failed"));
    }
  }, [searchParams, t, locale]);

  const handleSync = async () => {
    setSyncing(true);
    setError("");
    setMessage("");
    try {
      const result = await syncInstagramMetrics();
      setMessage(
        t.instagram.syncSuccess
          .replace("{followers}", String(result.followers))
          .replace("{posts}", String(result.postsImported))
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync error");
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    setError("");
    try {
      await disconnectInstagram();
      setConnection(null);
      setMessage(locale === "es" ? "Instagram desconectado" : "Instagram disconnected");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  };

  const configured = isInstagramLoginConfiguredPublic();

  return (
    <div className="rounded-lg border border-lime/20 bg-lime/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Instagram className="h-5 w-5 text-lime" />
          <div>
            <p className="text-sm font-medium">Instagram</p>
            <p className="text-xs text-muted">{t.instagram.connectDesc}</p>
          </div>
        </div>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted" />
        ) : connection ? (
          <Badge className="bg-lime/20 text-lime border-lime/30">@{connection.username}</Badge>
        ) : (
          <Badge className={configured ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}>
            {configured ? t.instagram.notConnected : t.instagram.configureMeta}
          </Badge>
        )}
      </div>

      {connection && (
        <p className="mt-3 text-xs text-muted">
          {connection.followersCount.toLocaleString()} {t.instagram.followers} · {connection.mediaCount} {t.instagram.posts}
          {connection.lastSyncedAt && ` · ${new Date(connection.lastSyncedAt).toLocaleString(locale === "es" ? "es-ES" : "en-US")}`}
        </p>
      )}

      {message && <p className="mt-3 text-sm text-lime">{message}</p>}
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        {!connection ? (
          <Button onClick={connectInstagram} disabled={!configured}>
            <Instagram className="h-4 w-4" />
            {t.instagram.connect}
          </Button>
        ) : (
          <>
            <Button onClick={handleSync} disabled={syncing}>
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {t.instagram.syncMetrics}
            </Button>
            <Button variant="ghost" onClick={handleDisconnect}>
              <Unplug className="h-4 w-4" />
              {t.instagram.disconnect}
            </Button>
          </>
        )}
      </div>

      {!configured && (
        <div className="mt-3 space-y-1 text-xs text-muted">
          <p>{t.instagram.configureMeta}</p>
          <p>{t.instagram.setupHint}</p>
        </div>
      )}
    </div>
  );
}
