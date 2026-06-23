"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Sparkles,
  Film,
  CircleDot,
  Users,
  Handshake,
  BarChart3,
  Settings,
  Zap,
  X,
  Calendar,
  Target,
  Hash,
  UserCheck,
  Clock,
  TrendingUp,
  Swords,
  Layers,
  BookOpen,
  ClipboardCheck,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useTranslation();

  const sections = [
    {
      label: null,
      items: [
        { name: t.nav.dashboard, href: "/dashboard", icon: LayoutDashboard },
      ],
    },
    {
      label: t.nav.sectionContent,
      items: [
        { name: t.nav.contentGenerator, href: "/content-generator", icon: Sparkles },
        { name: t.nav.reelScripts, href: "/reel-scripts", icon: Film },
        { name: t.nav.stories, href: "/stories", icon: CircleDot },
        { name: t.nav.contentSeries, href: "/content-series", icon: Layers },
        { name: t.nav.formats, href: "/formats", icon: BookOpen },
      ],
    },
    {
      label: t.nav.sectionGrowth,
      items: [
        { name: t.nav.calendar, href: "/calendar", icon: Calendar },
        { name: t.nav.hookAnalyzer, href: "/hook-analyzer", icon: Target },
        { name: t.nav.hashtags, href: "/hashtags", icon: Hash },
        { name: t.nav.profileAudit, href: "/profile-audit", icon: UserCheck },
        { name: t.nav.instagramAuditPro, href: "/instagram-audit-pro", icon: ClipboardCheck },
        { name: t.nav.bestTimes, href: "/best-times", icon: Clock },
        { name: t.nav.growthTracker, href: "/growth-tracker", icon: TrendingUp },
        { name: t.nav.competitors, href: "/competitors", icon: Swords },
      ],
    },
    {
      label: t.nav.sectionAI,
      items: [
        { name: t.nav.aiCoach, href: "/ai-coach", icon: Bot },
      ],
    },
    {
      label: t.nav.sectionManage,
      items: [
        { name: t.nav.leads, href: "/leads", icon: Users },
        { name: t.nav.engagement, href: "/engagement", icon: Handshake },
        { name: t.nav.analytics, href: "/analytics", icon: BarChart3 },
        { name: t.nav.settings, href: "/settings", icon: Settings },
      ],
    },
  ];

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-surface transition-transform duration-300 lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-6 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-lime">
              <Zap className="h-4 w-4 text-black" />
            </div>
            <div>
              <span className="text-sm font-bold text-foreground">WIA</span>
              <span className="block text-[10px] text-muted leading-none">
                Instagram Growth OS
              </span>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden text-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-4">
          {sections.map((section, si) => (
            <div key={si}>
              {section.label && (
                <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-lime/10 text-lime border border-lime/20"
                          : "text-muted hover:bg-surface-elevated hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-4 shrink-0">
          <div className="rounded-lg border border-lime/20 bg-lime/5 p-3">
            <p className="text-xs font-medium text-lime">{t.nav.legalTitle}</p>
            <p className="mt-1 text-[11px] text-muted leading-relaxed">
              {t.nav.legalDesc}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
