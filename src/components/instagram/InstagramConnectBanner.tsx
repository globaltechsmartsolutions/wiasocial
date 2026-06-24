"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, RefreshCw, CheckCircle2, AlertCircle, LogOut } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { InstagramBrandIcon } from "@/components/icons/InstagramBrandIcon";
import {
  connectInstagram,
  disconnectInstagram,
  fetchInstagramConnection,
  syncInstagramMetrics,
} from "@/lib/instagram-client";
import { isInstagramLoginConfiguredPublic } from "@/lib/instagram-config";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

export function InstagramConnectBanner() {
  const { t, locale } = useTranslation();
  const searchParams = useSearchParams();
  const [connection, setConnection] = useState<Awaited<ReturnType<typeof fetchInstagramConnection>>>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [toast, setToast] = useState("");

  const configured = isInstagramLoginConfiguredPublic();

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
    const user = searchParams.get("user");
    const synced = searchParams.get("synced");
    if (status === "connected" && user) {
      setToast(
        synced === "1"
          ? t.instagram.connectedSynced.replace("{user}", user)
          : t.instagram.connected.replace("{user}", user)
      );
      load();
    }
  }, [searchParams, t]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncInstagramMetrics();
      setToast(
        t.instagram.syncSuccess
          .replace("{followers}", String(result.followers))
          .replace("{posts}", String(result.postsImported))
      );
      await load();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Error");
    } finally {
      setSyncing(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    setToast("");
    try {
      await connectInstagram();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Error");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setToast("");
    try {
      await disconnectInstagram();
      setConnection(null);
      setToast(locale === "es" ? "Instagram desconectado" : "Instagram disconnected");
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Error");
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <Card className="flex h-24 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-lime" />
      </Card>
    );
  }

  if (connection) {
    return (
      <Card glow className="border-lime/30">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl">
              <InstagramBrandIcon className="h-11 w-11" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-semibold">@{connection.username}</p>
                <Badge className="bg-lime/20 text-lime border-lime/30">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {t.instagram.connectedBadge}
                </Badge>
              </div>
              <p className="text-sm text-muted mt-0.5">
                {connection.followersCount.toLocaleString(locale === "es" ? "es-ES" : "en-US")} {t.instagram.followers}
                {" · "}
                {connection.mediaCount} {t.instagram.posts}
              </p>
            </div>
          </div>
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:w-auto lg:flex-wrap lg:justify-end">
            <Button onClick={handleSync} disabled={syncing} size="sm" className="w-full lg:w-auto">
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {t.instagram.sync}
            </Button>
            <Button onClick={handleConnect} disabled={connecting} variant="secondary" size="sm" className="w-full lg:w-auto">
              {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <InstagramBrandIcon className="h-4 w-4" />}
              {t.instagram.switchAccount}
            </Button>
            <Link href="/instagram-data" className="w-full lg:w-auto">
              <Button variant="secondary" size="sm" className="w-full lg:w-auto">{t.instagramData.title}</Button>
            </Link>
            <Link href="/growth-tracker" className="w-full lg:w-auto">
              <Button variant="secondary" size="sm" className="w-full lg:w-auto">{t.instagram.viewGrowth}</Button>
            </Link>
            <Button onClick={handleDisconnect} disabled={disconnecting} variant="danger" size="sm" className="w-full lg:w-auto">
              {disconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              {t.instagram.logout}
            </Button>
          </div>
        </div>
        {toast && <p className="mt-3 text-sm text-lime">{toast}</p>}
      </Card>
    );
  }

  return (
    <Card className="border-amber-500/20 bg-amber-500/5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl">
            <InstagramBrandIcon className="h-11 w-11" />
          </div>
          <div>
            <p className="font-semibold">{t.instagram.connectTitle}</p>
            <p className="text-sm text-muted mt-1">{t.instagram.connectDesc}</p>
            {!configured && (
              <p className="mt-2 text-xs text-amber-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {t.instagram.configureMeta}
              </p>
            )}
          </div>
        </div>
        <Button onClick={handleConnect} disabled={connecting}>
          {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <InstagramBrandIcon className="h-4 w-4" />}
          {t.instagram.connect}
        </Button>
      </div>
      {toast && <p className="mt-3 text-sm text-lime">{toast}</p>}
    </Card>
  );
}
