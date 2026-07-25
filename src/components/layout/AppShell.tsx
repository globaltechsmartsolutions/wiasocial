"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { UpgradeModal } from "@/components/ui/UpgradeModal";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [upgradeModal, setUpgradeModal] = useState<{ used: number; limit: number } | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const { used, limit } = (e as CustomEvent<{ used: number; limit: number }>).detail;
      setUpgradeModal({ used, limit });
    };
    window.addEventListener("wia:usage-exceeded", handler);
    return () => window.removeEventListener("wia:usage-exceeded", handler);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
      </div>
      {upgradeModal && (
        <UpgradeModal
          used={upgradeModal.used}
          limit={upgradeModal.limit}
          onClose={() => setUpgradeModal(null)}
        />
      )}
    </div>
  );
}
