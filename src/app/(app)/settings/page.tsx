"use client";

import { Suspense, type ReactNode, useEffect, useState } from "react";
import { Settings, Save, Key, Database, Globe, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { useAuth } from "@/contexts/AuthContext";
import { fetchSettings, saveSettings } from "@/lib/db";
import { countBrandMemoryFields, defaultBrandMemory } from "@/lib/brand-memory";
import { isOpenAIConfigured } from "@/lib/openai";
import { isSupabaseConfigured } from "@/lib/supabase";
import { InstagramConnectCard } from "@/components/settings/InstagramConnectCard";
import type { BrandMemory, ContentGoal, ContentTone, UserSettings } from "@/types";

const defaults: UserSettings = {
  brandName: "", instagramHandle: "", niche: "", targetAudience: "", offer: "",
  defaultTone: "professional", defaultGoal: "leads",
  brandMemory: defaultBrandMemory,
};

const brandMemoryLabels = {
  es: {
    completion: "Memoria de marca",
    baseTitle: "Base del negocio",
    baseDesc: "La IA usa esto para no generar contenido genérico.",
    strategyTitle: "Estrategia y conversión",
    strategyDesc: "Define lo que hace que la marca sea comprable y creíble.",
    voiceTitle: "Voz, límites y estilo",
    voiceDesc: "Evita claims peligrosos y fija el criterio creativo.",
    brandPromise: "Promesa principal",
    brandPromisePlaceholder: "ej. Verte mejor sin parecer otra persona.",
    differentiator: "Diferenciador",
    differentiatorPlaceholder: "ej. Diagnóstico facial médico antes de recomendar tratamientos.",
    customerPain: "Dolor principal del cliente",
    customerPainPlaceholder: "ej. Quiere mejorar, pero teme resultados artificiales.",
    customerDesire: "Deseo aspiracional",
    customerDesirePlaceholder: "ej. Verse descansada, natural y segura en fotos y reuniones.",
    contentPillars: "Pilares de contenido",
    contentPillarsPlaceholder: "Uno por línea: educación, errores, casos, objeciones, prueba social...",
    proofPoints: "Pruebas y credibilidad",
    proofPointsPlaceholder: "Resultados, casos, años de experiencia, método, credenciales, testimonios...",
    objections: "Objeciones frecuentes",
    objectionsPlaceholder: "Precio, miedo, tiempo, desconfianza, 'ya lo probé antes'...",
    forbiddenClaims: "Qué no debe decir la IA",
    forbiddenClaimsPlaceholder: "Promesas absolutas, claims médicos no probados, tono agresivo, descuentos falsos...",
    visualStyle: "Estilo visual",
    visualStylePlaceholder: "Minimalista, editorial, premium, colores, fotografía, ritmo visual...",
    brandVoiceNotes: "Notas de voz y tono",
    brandVoiceNotesPlaceholder: "Cómo habla la marca, palabras que usa, palabras que evita...",
    referenceExamples: "Ejemplos de referencia",
    referenceExamplesPlaceholder: "Posts, hooks o mensajes que sí representan la marca.",
  },
  en: {
    completion: "Brand memory",
    baseTitle: "Business base",
    baseDesc: "AI uses this to avoid generic content.",
    strategyTitle: "Strategy and conversion",
    strategyDesc: "Define what makes the brand credible and buyable.",
    voiceTitle: "Voice, limits and style",
    voiceDesc: "Avoid risky claims and set creative criteria.",
    brandPromise: "Main promise",
    brandPromisePlaceholder: "e.g. Look fresher without looking like someone else.",
    differentiator: "Differentiator",
    differentiatorPlaceholder: "e.g. Medical facial diagnosis before recommending treatments.",
    customerPain: "Main customer pain",
    customerPainPlaceholder: "e.g. Wants to improve, but fears artificial results.",
    customerDesire: "Aspirational desire",
    customerDesirePlaceholder: "e.g. Look rested, natural and confident in photos and meetings.",
    contentPillars: "Content pillars",
    contentPillarsPlaceholder: "One per line: education, mistakes, cases, objections, proof...",
    proofPoints: "Proof and credibility",
    proofPointsPlaceholder: "Results, cases, years of experience, method, credentials, testimonials...",
    objections: "Frequent objections",
    objectionsPlaceholder: "Price, fear, time, distrust, 'I tried this before'...",
    forbiddenClaims: "What AI must not say",
    forbiddenClaimsPlaceholder: "Absolute promises, unproven medical claims, aggressive tone, fake discounts...",
    visualStyle: "Visual style",
    visualStylePlaceholder: "Minimal, editorial, premium, colors, photography, visual rhythm...",
    brandVoiceNotes: "Voice and tone notes",
    brandVoiceNotesPlaceholder: "How the brand speaks, words it uses, words it avoids...",
    referenceExamples: "Reference examples",
    referenceExamplesPlaceholder: "Posts, hooks or messages that represent the brand well.",
  },
};

export default function SettingsPage() {
  const { locale, t } = useTranslation();
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(defaults);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    fetchSettings(user.id).then((s) => { if (s) setSettings(s); setLoading(false); });
  }, [user]);

  const toneOptions = (["luxury", "professional", "aggressive", "educational"] as ContentTone[]).map((tone) => ({ value: tone, label: t.tone[tone] }));
  const goalOptions = (["followers", "leads", "sales"] as ContentGoal[]).map((goal) => ({ value: goal, label: t.goalLabel[goal] }));
  const labels = brandMemoryLabels[locale];
  const memoryCompletion = countBrandMemoryFields(settings.brandMemory);

  const updateMemory = (field: keyof BrandMemory, value: string) => {
    setSettings({
      ...settings,
      brandMemory: {
        ...settings.brandMemory,
        [field]: value,
      },
    });
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError("");
    try {
      await saveSettings(user.id, settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la configuración");
    } finally {
      setSaving(false);
    }
  };

  const openaiOk = isOpenAIConfigured();
  const supabaseOk = isSupabaseConfigured();

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-lime" /></div>;

  return (
    <div>
      <PageHeader title={t.settings.title} description={t.settings.description} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={t.settings.brandProfile}
            description={`${t.settings.brandProfileDesc} · ${labels.completion}: ${memoryCompletion.completed}/${memoryCompletion.total}`}
          />
          <div className="space-y-4">
            <FormSection title={labels.baseTitle} description={labels.baseDesc}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input id="brandName" label={t.settings.brandName} value={settings.brandName} onChange={(e) => setSettings({ ...settings, brandName: e.target.value })} />
                <Input id="handle" label={t.settings.instagramHandle} value={settings.instagramHandle} onChange={(e) => setSettings({ ...settings, instagramHandle: e.target.value })} />
              </div>
              <Input id="niche" label={t.common.niche} value={settings.niche} onChange={(e) => setSettings({ ...settings, niche: e.target.value })} />
              <Input id="audience" label={t.settings.targetAudience} value={settings.targetAudience} onChange={(e) => setSettings({ ...settings, targetAudience: e.target.value })} />
              <Textarea id="offer" label={t.contentGenerator.offer} value={settings.offer} onChange={(e) => setSettings({ ...settings, offer: e.target.value })} rows={2} />
              <Textarea id="brandPromise" label={labels.brandPromise} value={settings.brandMemory.brandPromise} onChange={(e) => updateMemory("brandPromise", e.target.value)} rows={2} placeholder={labels.brandPromisePlaceholder} />
              <Textarea id="differentiator" label={labels.differentiator} value={settings.brandMemory.differentiator} onChange={(e) => updateMemory("differentiator", e.target.value)} rows={2} placeholder={labels.differentiatorPlaceholder} />
            </FormSection>

            <FormSection title={labels.strategyTitle} description={labels.strategyDesc}>
              <Textarea id="customerPain" label={labels.customerPain} value={settings.brandMemory.customerPain} onChange={(e) => updateMemory("customerPain", e.target.value)} rows={2} placeholder={labels.customerPainPlaceholder} />
              <Textarea id="customerDesire" label={labels.customerDesire} value={settings.brandMemory.customerDesire} onChange={(e) => updateMemory("customerDesire", e.target.value)} rows={2} placeholder={labels.customerDesirePlaceholder} />
              <Textarea id="contentPillars" label={labels.contentPillars} value={settings.brandMemory.contentPillars} onChange={(e) => updateMemory("contentPillars", e.target.value)} rows={3} placeholder={labels.contentPillarsPlaceholder} />
              <Textarea id="proofPoints" label={labels.proofPoints} value={settings.brandMemory.proofPoints} onChange={(e) => updateMemory("proofPoints", e.target.value)} rows={3} placeholder={labels.proofPointsPlaceholder} />
              <Textarea id="objections" label={labels.objections} value={settings.brandMemory.objections} onChange={(e) => updateMemory("objections", e.target.value)} rows={3} placeholder={labels.objectionsPlaceholder} />
            </FormSection>

            <FormSection title={labels.voiceTitle} description={labels.voiceDesc}>
              <Textarea id="forbiddenClaims" label={labels.forbiddenClaims} value={settings.brandMemory.forbiddenClaims} onChange={(e) => updateMemory("forbiddenClaims", e.target.value)} rows={3} placeholder={labels.forbiddenClaimsPlaceholder} />
              <Textarea id="visualStyle" label={labels.visualStyle} value={settings.brandMemory.visualStyle} onChange={(e) => updateMemory("visualStyle", e.target.value)} rows={2} placeholder={labels.visualStylePlaceholder} />
              <Textarea id="brandVoiceNotes" label={labels.brandVoiceNotes} value={settings.brandMemory.brandVoiceNotes} onChange={(e) => updateMemory("brandVoiceNotes", e.target.value)} rows={3} placeholder={labels.brandVoiceNotesPlaceholder} />
              <Textarea id="referenceExamples" label={labels.referenceExamples} value={settings.brandMemory.referenceExamples} onChange={(e) => updateMemory("referenceExamples", e.target.value)} rows={3} placeholder={labels.referenceExamplesPlaceholder} />
            </FormSection>

            <div className="grid grid-cols-2 gap-4">
              <Select id="tone" label={t.settings.defaultTone} value={settings.defaultTone} onChange={(e) => setSettings({ ...settings, defaultTone: e.target.value as ContentTone })} options={toneOptions} />
              <Select id="goal" label={t.settings.defaultGoal} value={settings.defaultGoal} onChange={(e) => setSettings({ ...settings, defaultGoal: e.target.value as ContentGoal })} options={goalOptions} />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saved ? t.common.saved : t.settings.saveSettings}</Button>
          </div>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title={t.common.language} />
            <div className="flex items-center gap-3"><Globe className="h-5 w-5 text-lime" /><LanguageToggle /></div>
          </Card>
          <Card>
            <CardHeader title={t.settings.apiIntegrations} description={t.settings.apiIntegrationsDesc} />
            <div className="space-y-4">
              <Suspense fallback={<div className="h-24 animate-pulse rounded-lg bg-surface-elevated" />}>
                <InstagramConnectCard />
              </Suspense>
              <div className="flex items-center justify-between rounded-lg border border-border bg-surface-elevated p-4">
                <div className="flex items-center gap-3"><Key className="h-5 w-5 text-lime" /><div><p className="text-sm font-medium">OpenAI API</p><p className="text-xs text-muted">{t.settings.openaiDesc}</p></div></div>
                <Badge className={openaiOk ? "bg-lime/20 text-lime border-lime/30" : "bg-amber-500/20 text-amber-400 border-amber-500/30"}>
                  {openaiOk ? "✓ Conectado" : t.settings.configureEnv}
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-surface-elevated p-4">
                <div className="flex items-center gap-3"><Database className="h-5 w-5 text-lime" /><div><p className="text-sm font-medium">Supabase</p><p className="text-xs text-muted">{t.settings.supabaseDesc}</p></div></div>
                <Badge className={supabaseOk ? "bg-lime/20 text-lime border-lime/30" : "bg-amber-500/20 text-amber-400 border-amber-500/30"}>
                  {supabaseOk ? "✓ Conectado" : t.settings.configureEnv}
                </Badge>
              </div>
            </div>
          </Card>
          <Card>
            <CardHeader title={t.settings.about} description={t.settings.aboutDesc} />
            <p className="text-sm text-muted">{t.settings.aboutText}</p>
            <div className="mt-3 flex items-center gap-2"><Settings className="h-4 w-4 text-lime" /><span className="text-foreground">{t.common.version} 0.2.0</span></div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-xs text-muted">{description}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
