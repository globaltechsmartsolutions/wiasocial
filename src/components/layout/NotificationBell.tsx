"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Zap, Calendar, TrendingUp, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { fetchAIUsage } from "@/lib/ai-client";
import { getSupabase } from "@/lib/supabase";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

interface Notification {
  id: string;
  icon: React.ElementType;
  color: string;
  title: string;
  desc: string;
  href: string;
  read: boolean;
}

export function NotificationBell() {
  const router = useRouter();
  const { locale } = useTranslation();
  const es = locale === "es";
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const items: Notification[] = [];

      // AI usage notification
      try {
        const usage = await fetchAIUsage();
        if (usage) {
          if (usage.used >= usage.limit) {
            items.push({
              id: "ai-limit",
              icon: Zap,
              color: "text-red-400",
              title: es ? "Límite de IA alcanzado" : "AI limit reached",
              desc: es ? "Has usado todas tus generaciones este mes. Actualiza tu plan." : "You've used all your generations this month. Upgrade your plan.",
              href: "/upgrade",
              read: false,
            });
          } else if (usage.used >= usage.limit - 2) {
            items.push({
              id: "ai-warning",
              icon: Zap,
              color: "text-amber-400",
              title: es ? `Te quedan ${usage.limit - usage.used} generaciones` : `${usage.limit - usage.used} generations left`,
              desc: es ? "Considera actualizar tu plan para no quedarte sin IA." : "Consider upgrading so you don't run out of AI.",
              href: "/upgrade",
              read: false,
            });
          }
        }
      } catch {}

      // Follow-ups due today
      try {
        const { data: { session } } = await getSupabase().auth.getSession();
        if (session?.user) {
          const today = new Date().toISOString().split("T")[0];
          const { data } = await getSupabase()
            .from("follow_ups")
            .select("id, lead_username, note")
            .eq("user_id", session.user.id)
            .lte("due_date", today)
            .eq("completed", false)
            .limit(3);
          if (data && data.length > 0) {
            items.push({
              id: "followups",
              icon: Calendar,
              color: "text-lime",
              title: es ? `${data.length} seguimiento${data.length > 1 ? "s" : ""} pendiente${data.length > 1 ? "s" : ""}` : `${data.length} follow-up${data.length > 1 ? "s" : ""} due`,
              desc: data.map((f) => `@${f.lead_username}`).join(", "),
              href: "/leads",
              read: false,
            });
          }
        }
      } catch {}

      // Encourage radar if not generated recently
      try {
        const { data: { session } } = await getSupabase().auth.getSession();
        if (session?.user) {
          const { data } = await getSupabase()
            .from("growth_radar_reports")
            .select("created_at")
            .eq("user_id", session.user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          if (!data || new Date(data.created_at) < weekAgo) {
            items.push({
              id: "radar",
              icon: TrendingUp,
              color: "text-lime",
              title: es ? "Genera tu Radar IA semanal" : "Generate your weekly AI Radar",
              desc: es ? "Obtén tu estrategia personalizada de esta semana." : "Get your personalized strategy for this week.",
              href: "/growth-radar",
              read: false,
            });
          }
        }
      } catch {}

      setNotifications(items);
    }

    load();

    const refresh = () => load();
    window.addEventListener("wia:usage-exceeded", refresh);
    return () => window.removeEventListener("wia:usage-exceeded", refresh);
  }, [es]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  const markRead = (id: string) =>
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 text-muted hover:bg-surface-elevated hover:text-foreground"
        title={es ? "Notificaciones" : "Notifications"}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-border bg-surface shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="font-semibold text-foreground text-sm">
              {es ? "Notificaciones" : "Notifications"}
            </p>
            <button onClick={() => setOpen(false)} className="text-muted hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted">
              {es ? "Sin notificaciones nuevas" : "No new notifications"}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => {
                const Icon = n.icon;
                return (
                  <button
                    key={n.id}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-surface-elevated transition-colors ${n.read ? "opacity-50" : ""}`}
                    onClick={() => {
                      markRead(n.id);
                      setOpen(false);
                      router.push(n.href);
                    }}
                  >
                    <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${n.color}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{n.title}</p>
                      <p className="text-xs text-muted mt-0.5 line-clamp-2">{n.desc}</p>
                    </div>
                    {!n.read && <div className="mt-1.5 h-2 w-2 rounded-full bg-lime shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
