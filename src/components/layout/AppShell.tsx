"use client";

import { useState, useEffect } from "react";
import { Zap, X } from "lucide-react";
import Link from "next/link";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { UpgradeModal } from "@/components/ui/UpgradeModal";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { fetchAIUsage } from "@/lib/ai-client";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Swipe left to close sidebar on mobile
  useEffect(() => {
    let startX = 0;
    const onTouchStart = (e: TouchEvent) => { startX = e.touches[0].clientX; };
    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (dx < -60) setSidebarOpen(false);
    };
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, []);
  const [upgradeModal, setUpgradeModal] = useState<{ used: number; limit: number } | null>(null);
  const [upgradeBanner, setUpgradeBanner] = useState<{ used: number; limit: number } | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setShowOnboarding(!localStorage.getItem("wia:onboarding-dismissed"));
    }
    const handler = () => setShowOnboarding(!localStorage.getItem("wia:onboarding-dismissed"));
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const { used, limit } = (e as CustomEvent<{ used: number; limit: number }>).detail;
      setUpgradeModal({ used, limit });
    };
    window.addEventListener("wia:usage-exceeded", handler);
    return () => window.removeEventListener("wia:usage-exceeded", handler);
  }, []);

  // Show soft banner when ≤2 generations left
  useEffect(() => {
    fetchAIUsage().then((usage) => {
      if (!usage) return;
      const remaining = usage.limit - usage.used;
      if (remaining <= 2 && remaining > 0) {
        setUpgradeBanner(usage);
      }
    }).catch(() => null);

    const refresh = () => {
      fetchAIUsage().then((usage) => {
        if (!usage) return;
        const remaining = usage.limit - usage.used;
        if (remaining <= 2 && remaining > 0) setUpgradeBanner(usage);
      }).catch(() => null);
    };
    window.addEventListener("wia:usage-exceeded", refresh);
    return () => window.removeEventListener("wia:usage-exceeded", refresh);
  }, []);

  const showBanner = upgradeBanner && !bannerDismissed;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        {showBanner && (
          <div className="flex items-center justify-between gap-3 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-sm">
            <div className="flex items-center gap-2 text-amber-400">
              <Zap className="h-4 w-4 shrink-0" />
              <span>
                Te quedan <strong>{upgradeBanner.limit - upgradeBanner.used}</strong> generaciones IA este mes.{" "}
                <Link href="/upgrade" className="underline font-semibold hover:text-amber-300">
                  Actualiza tu plan
                </Link>{" "}
                para no quedarte sin acceso.
              </span>
            </div>
            <button onClick={() => setBannerDismissed(true)} className="text-amber-400/60 hover:text-amber-400 shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
      </div>
      {upgradeModal && (
        <UpgradeModal
          used={upgradeModal.used}
          limit={upgradeModal.limit}
          onClose={() => setUpgradeModal(null)}
        />
      )}
      {showOnboarding && !upgradeModal && <OnboardingWizard />}
    </div>
  );
}
