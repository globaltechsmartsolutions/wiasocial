"use client";

import { useState } from "react";
import { BookOpen, Sparkles, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { viralFormats } from "@/constants/viral-formats";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { useAuth } from "@/contexts/AuthContext";
import { fetchSettings, saveGeneratedContent } from "@/lib/db";
import { callAI } from "@/lib/ai-client";

export default function FormatsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [adapted, setAdapted] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const adaptFormat = async (name: string, structure: string[], example: string) => {
    setLoading(true);
    try {
      const settings = user ? await fetchSettings(user.id) : null;
      const result = await callAI("format-adapt", {
        formatName: name, structure, example, niche: settings?.niche || "general",
      });
      setAdapted(result.adapted);
      if (user) {
        await saveGeneratedContent(user.id, {
          content_type: "format_adapt",
          niche: settings?.niche || "general",
          raw_json: { formatName: name, structure, example, adapted: result.adapted },
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title={t.formats.title} description={t.formats.description} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {viralFormats.map((format) => (
          <Card key={format.id} className="flex flex-col">
            <CardHeader title={format.name} action={<Badge className="bg-lime/20 text-lime border-lime/30">{format.avgViews}</Badge>} />
            <p className="text-sm text-muted mb-3">{format.description}</p>
            <p className="text-xs font-semibold text-lime mb-1">{t.formats.structure}:</p>
            <ol className="text-xs text-muted space-y-1 mb-3 flex-1">{format.structure.map((s, i) => <li key={i}>{i + 1}. {s}</li>)}</ol>
            <p className="text-xs italic mb-3">&ldquo;{format.example}&rdquo;</p>
            <Button variant="secondary" size="sm" onClick={() => adaptFormat(format.name, format.structure, format.example)} disabled={loading}>
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}{t.formats.useFormat}
            </Button>
          </Card>
        ))}
      </div>
      {adapted && (
        <Card className="mt-6" glow>
          <CardHeader title={t.formats.adapted} action={<BookOpen className="h-5 w-5 text-lime" />} />
          <p className="whitespace-pre-wrap text-sm">{adapted}</p>
          <Button variant="ghost" size="sm" className="mt-3" onClick={() => navigator.clipboard.writeText(adapted)}>{t.common.copy}</Button>
        </Card>
      )}
    </div>
  );
}
