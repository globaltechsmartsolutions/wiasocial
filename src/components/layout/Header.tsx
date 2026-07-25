"use client";

import { useState, useEffect } from "react";
import type { KeyboardEvent } from "react";
import Image from "next/image";
import { Menu, Bell, Search, LogOut, Zap } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { useAuth } from "@/contexts/AuthContext";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { useRouter } from "next/navigation";
import { fetchAIUsage } from "@/lib/ai-client";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [aiUsage, setAiUsage] = useState<{ used: number; limit: number } | null>(null);

  useEffect(() => {
    fetchAIUsage().then((u) => setAiUsage(u)).catch(() => null);
    const refresh = () => fetchAIUsage().then((u) => setAiUsage(u)).catch(() => null);
    window.addEventListener("wia:usage-exceeded", refresh);
    return () => window.removeEventListener("wia:usage-exceeded", refresh);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  const handleSearch = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    const value = query.trim().toLowerCase();
    if (!value) return;

    const routes = [
      { label: t.nav.dashboard, href: "/dashboard" },
      { label: t.nav.growthRadar, href: "/growth-radar" },
      { label: t.nav.audienceFinder, href: "/audience-finder" },
      { label: t.nav.marketingPlan, href: "/marketing-plan" },
      { label: t.nav.funnelBuilder, href: "/funnel-builder" },
      { label: t.nav.aiCoach, href: "/ai-coach" },
      { label: t.nav.contentGenerator, href: "/content-generator" },
      { label: t.nav.calendar, href: "/calendar" },
      { label: t.nav.leads, href: "/leads" },
      { label: t.nav.analytics, href: "/analytics" },
      { label: t.nav.settings, href: "/settings" },
    ];

    const match = routes.find((route) => route.label.toLowerCase().includes(value));
    router.push(match?.href ?? "/ai-coach");
    setQuery("");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 backdrop-blur-xl px-4 lg:px-8">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-muted hover:bg-surface-elevated hover:text-foreground lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center rounded-lg focus:outline-none focus:ring-2 focus:ring-lime/60"
          aria-label="Ir al dashboard"
        >
          <Image
            src="/logo-casa-olivo.png"
            alt="Logo de la marca"
            width={120}
            height={80}
            priority
            className="h-10 w-auto rounded-md object-contain"
          />
        </button>
        <div className="hidden sm:flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
          <Search className="h-4 w-4 text-muted" />
          <input
            type="text"
            placeholder={t.common.search}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleSearch}
            className="w-48 bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none lg:w-64"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {aiUsage && (
          <div
            className={`hidden sm:flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium border ${
              aiUsage.used >= aiUsage.limit
                ? "border-red-500/30 bg-red-500/10 text-red-400"
                : aiUsage.used >= aiUsage.limit - 1
                ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
                : "border-lime/20 bg-lime/5 text-lime"
            }`}
          >
            <Zap className="h-3 w-3" />
            {aiUsage.used}/{aiUsage.limit === Infinity ? "∞" : aiUsage.limit} IA
          </div>
        )}
        <LanguageToggle />
        <button
          onClick={() => router.push("/dashboard")}
          title="Brief diario"
          className="relative rounded-lg p-2 text-muted hover:bg-surface-elevated hover:text-foreground"
        >
          <Bell className="h-5 w-5" />
        </button>
        <button
          onClick={handleSignOut}
          title="Cerrar sesión"
          className="rounded-lg p-2 text-muted hover:bg-surface-elevated hover:text-foreground"
        >
          <LogOut className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-foreground truncate max-w-[120px]">
              {user?.email?.split("@")[0]}
            </p>
            <p className="text-xs text-lime">● Activo</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full gradient-lime text-sm font-bold text-black">
            {(user?.email?.[0] ?? "W").toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}
