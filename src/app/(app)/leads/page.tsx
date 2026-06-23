"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, Plus, Search, Calendar, MessageSquare, Loader2, Brain, Copy, Check } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { statusColors } from "@/data/dummy";
import { formatDate } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { useAuth } from "@/contexts/AuthContext";
import { fetchLeads, createLead, updateLeadStatus } from "@/lib/db";
import { scoreLead, type LeadIQResult } from "@/lib/ai-client";
import type { Lead, LeadStatus } from "@/types";
import { cn } from "@/lib/utils";

function scoreLabel(score: number, t: { leadIq: { hot: string; warm: string; cold: string } }) {
  if (score >= 70) return { label: t.leadIq.hot, className: "bg-lime/20 text-lime border-lime/30" };
  if (score >= 40) return { label: t.leadIq.warm, className: "bg-amber-500/20 text-amber-400 border-amber-500/30" };
  return { label: t.leadIq.cold, className: "bg-red-500/20 text-red-400 border-red-500/30" };
}

export default function LeadsPage() {
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [iqResults, setIqResults] = useState<Record<string, LeadIQResult>>({});
  const [iqLoading, setIqLoading] = useState<string | null>(null);
  const [expandedIq, setExpandedIq] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newLead, setNewLead] = useState({
    username: "", fullName: "", niche: "", source: "Instagram DM", notes: "", followUpDate: "",
  });

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      setLeads(await fetchLeads(user.id));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const statusOptions = (["new", "contacted", "call_booked", "client"] as LeadStatus[]).map(
    (s) => ({ value: s, label: t.status[s] })
  );

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.username.toLowerCase().includes(search.toLowerCase()) ||
      lead.fullName.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (filterStatus === "all" || lead.status === filterStatus);
  });

  const handleAddLead = async () => {
    if (!user || !newLead.username) return;
    const lead = await createLead(user.id, {
      username: newLead.username.startsWith("@") ? newLead.username : `@${newLead.username}`,
      fullName: newLead.fullName,
      niche: newLead.niche,
      source: newLead.source,
      status: "new",
      notes: newLead.notes,
      followUpDate: newLead.followUpDate || null,
    });
    setLeads([lead, ...leads]);
    setNewLead({ username: "", fullName: "", niche: "", source: "Instagram DM", notes: "", followUpDate: "" });
    setShowAddForm(false);
  };

  const handleStatusChange = async (id: string, status: LeadStatus) => {
    await updateLeadStatus(id, status);
    setLeads(leads.map((l) => (l.id === id ? { ...l, status } : l)));
  };

  const handleLeadIQ = async (lead: Lead) => {
    setIqLoading(lead.id);
    try {
      const result = await scoreLead(lead as unknown as Record<string, unknown>, locale);
      setIqResults((prev) => ({ ...prev, [lead.id]: result }));
      setExpandedIq(lead.id);
    } catch {
      // ignore
    } finally {
      setIqLoading(null);
    }
  };

  const copyDm = async (leadId: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(leadId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-lime" /></div>;
  }

  return (
    <div>
      <PageHeader title={t.leads.title} description={t.leads.description}
        action={<Button onClick={() => setShowAddForm(!showAddForm)}><Plus className="h-4 w-4" />{t.leads.addLead}</Button>} />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        {(["new", "contacted", "call_booked", "client"] as LeadStatus[]).map((status) => (
          <div key={status} className="rounded-xl border border-border bg-surface p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{leads.filter((l) => l.status === status).length}</p>
            <p className="text-sm text-muted">{t.status[status]}</p>
          </div>
        ))}
      </div>

      {showAddForm && (
        <Card className="mb-6">
          <CardHeader title={t.leads.addNew} description={t.leads.addNewDesc} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input id="username" label={t.leads.username} value={newLead.username} onChange={(e) => setNewLead({ ...newLead, username: e.target.value })} placeholder={t.leads.usernamePlaceholder} />
            <Input id="fullName" label={t.leads.fullName} value={newLead.fullName} onChange={(e) => setNewLead({ ...newLead, fullName: e.target.value })} />
            <Input id="niche" label={t.common.niche} value={newLead.niche} onChange={(e) => setNewLead({ ...newLead, niche: e.target.value })} />
            <Input id="source" label={t.common.source} value={newLead.source} onChange={(e) => setNewLead({ ...newLead, source: e.target.value })} />
            <Input id="followUpDate" label={t.leads.followUpDate} type="date" value={newLead.followUpDate} onChange={(e) => setNewLead({ ...newLead, followUpDate: e.target.value })} />
            <Textarea id="notes" label={t.leads.notes} value={newLead.notes} onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })} rows={1} />
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={handleAddLead}>{t.leads.saveLead}</Button>
            <Button variant="ghost" onClick={() => setShowAddForm(false)}>{t.common.cancel}</Button>
          </div>
        </Card>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input type="text" placeholder={t.leads.search} value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface-elevated py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted focus:border-lime/50 focus:outline-none" />
        </div>
        <Select id="filter" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          options={[{ value: "all", label: t.common.allStatuses }, ...statusOptions]} className="sm:w-48" />
      </div>

      <div className="space-y-3">
        {filteredLeads.map((lead) => (
          <Card key={lead.id} className="!p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-lime/10 text-sm font-bold text-lime">
                  {lead.fullName.charAt(0) || lead.username.charAt(1).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{lead.username}</p>
                    <Badge className={statusColors[lead.status]}>{t.status[lead.status]}</Badge>
                  </div>
                  <p className="text-sm text-muted">{lead.fullName} · {lead.niche}</p>
                  {lead.notes && <p className="mt-1 text-sm text-muted flex items-center gap-1"><MessageSquare className="h-3 w-3" />{lead.notes}</p>}
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted">
                    <span>{t.common.source}: {lead.source}</span>
                    <span>{t.common.added}: {formatDate(lead.createdAt, locale)}</span>
                    {lead.followUpDate && <span className="flex items-center gap-1 text-amber-400"><Calendar className="h-3 w-3" />{formatDate(lead.followUpDate, locale)}</span>}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleLeadIQ(lead)}
                  disabled={iqLoading === lead.id}
                >
                  {iqLoading === lead.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Brain className="h-3 w-3" />
                  )}
                  {iqResults[lead.id] ? `${t.leadIq.score}: ${iqResults[lead.id].score}` : t.leadIq.analyze}
                </Button>
                <Select id={`status-${lead.id}`} value={lead.status} onChange={(e) => handleStatusChange(lead.id, e.target.value as LeadStatus)} options={statusOptions} className="sm:w-48" />
              </div>
            </div>
            {iqResults[lead.id] && expandedIq === lead.id && (
              <div className="mt-4 rounded-lg border border-lime/20 bg-lime/5 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <span className={cn("text-3xl font-bold", iqResults[lead.id].score >= 70 ? "text-lime" : iqResults[lead.id].score >= 40 ? "text-amber-400" : "text-red-400")}>
                    {iqResults[lead.id].score}
                  </span>
                  <Badge className={scoreLabel(iqResults[lead.id].score, t).className}>
                    {scoreLabel(iqResults[lead.id].score, t).label}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted">{t.leadIq.reasoning}</p>
                  <p className="text-sm mt-1">{iqResults[lead.id].reasoning}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted">{t.leadIq.nextAction}</p>
                  <p className="text-sm mt-1">{iqResults[lead.id].nextAction}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted">{t.leadIq.dmTemplate}</p>
                  <p className="text-sm mt-1 whitespace-pre-wrap rounded-lg bg-surface-elevated p-3">{iqResults[lead.id].dmTemplate}</p>
                  <Button variant="ghost" size="sm" className="mt-2" onClick={() => copyDm(lead.id, iqResults[lead.id].dmTemplate)}>
                    {copiedId === lead.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copiedId === lead.id ? t.leadIq.copied : t.leadIq.copyDm}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        ))}
        {filteredLeads.length === 0 && (
          <Card className="flex flex-col items-center py-12">
            <Users className="h-12 w-12 text-muted/30" />
            <p className="mt-4 text-muted">{t.leads.noLeads}</p>
          </Card>
        )}
      </div>
    </div>
  );
}
