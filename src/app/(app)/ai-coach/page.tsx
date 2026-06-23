"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send, Trash2, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { useAuth } from "@/contexts/AuthContext";
import {
  clearCoachHistory,
  fetchCoachMessages,
  sendCoachMessage,
  type CoachMessage,
} from "@/lib/ai-client";
import { cn } from "@/lib/utils";

const QUICK_PROMPTS_ES = [
  "¿Qué debo publicar hoy para generar leads?",
  "Analiza mi crecimiento y dime qué mejorar",
  "Dame 3 ideas de Reels para mi nicho",
  "¿Cómo convierto más DMs en llamadas?",
];

const QUICK_PROMPTS_EN = [
  "What should I post today to generate leads?",
  "Analyze my growth and tell me what to improve",
  "Give me 3 Reel ideas for my niche",
  "How do I convert more DMs into calls?",
];

export default function AICoachPage() {
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const quickPrompts = locale === "es" ? QUICK_PROMPTS_ES : QUICK_PROMPTS_EN;

  useEffect(() => {
    if (!user) return;
    fetchCoachMessages()
      .then(setMessages)
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const handleSend = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;

    setInput("");
    setSending(true);
    const tempUser: CoachMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: msg,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUser]);

    try {
      const reply = await sendCoachMessage(msg, locale);
      setMessages((prev) => [
        ...prev,
        {
          id: `reply-${Date.now()}`,
          role: "assistant",
          content: reply,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: err instanceof Error ? err.message : "Error",
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleClear = async () => {
    await clearCoachHistory();
    setMessages([]);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-lime" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <PageHeader
        title={t.aiCoach.title}
        description={t.aiCoach.description}
        action={
          messages.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={handleClear}>
              <Trash2 className="h-4 w-4" />
              {t.aiCoach.clear}
            </Button>
          ) : undefined
        }
      />

      <Card className="mb-4 border-lime/20 bg-lime/5 !py-3 !px-4">
        <div className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-lime shrink-0" />
          <span className="text-muted">{t.aiCoach.contextNote}</span>
        </div>
      </Card>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-lime/10 mb-4">
              <Bot className="h-8 w-8 text-lime" />
            </div>
            <h3 className="text-lg font-semibold">{t.aiCoach.welcome}</h3>
            <p className="mt-2 max-w-md text-sm text-muted">{t.aiCoach.welcomeDesc}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-2xl">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  className="rounded-full border border-border bg-surface-elevated px-4 py-2 text-xs hover:border-lime/30 hover:text-lime transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                m.role === "user"
                  ? "bg-lime text-black rounded-br-md"
                  : "bg-surface-elevated border border-border rounded-bl-md"
              )}
            >
              {m.role === "assistant" && (
                <div className="flex items-center gap-1.5 mb-2 text-xs text-lime font-medium">
                  <Bot className="h-3 w-3" />
                  WIA Coach
                </div>
              )}
              {m.content}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-surface-elevated border border-border px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-lime" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="mt-4 shrink-0">
        <div className="flex gap-2">
          <Textarea
            id="coach-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={t.aiCoach.placeholder}
            rows={2}
            className="resize-none"
          />
          <Button onClick={() => handleSend()} disabled={!input.trim() || sending} className="shrink-0 self-end">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-muted">{t.aiCoach.disclaimer}</p>
      </div>
    </div>
  );
}
