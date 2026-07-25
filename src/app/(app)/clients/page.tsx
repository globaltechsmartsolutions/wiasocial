"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  Euro,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { useAuth } from "@/contexts/AuthContext";
import { fetchClients, createClient, updateClientStatus, deleteClient, type Client } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const statusColors: Record<Client["status"], string> = {
  active: "bg-lime/20 text-lime border-lime/30",
  paused: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  churned: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function ClientsPage() {
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const cp = t.clientsPage;

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [newClient, setNewClient] = useState({
    brandName: "",
    instagramHandle: "",
    niche: "",
    monthlyFee: "",
    status: "active" as Client["status"],
    notes: "",
  });

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      setClients(await fetchClients(user.id));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!user || !newClient.brandName) return;
    setSaveError("");
    try {
      const client = await createClient(user.id, {
        ...newClient,
        monthlyFee: Number(newClient.monthlyFee) || 0,
      });
      setClients([client, ...clients]);
      setNewClient({ brandName: "", instagramHandle: "", niche: "", monthlyFee: "", status: "active", notes: "" });
      setShowForm(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Error al guardar");
    }
  };

  const handleStatusChange = async (id: string, status: Client["status"]) => {
    await updateClientStatus(id, status);
    setClients(clients.map((c) => (c.id === id ? { ...c, status } : c)));
  };

  const handleDelete = async (id: string) => {
    if (!confirm(cp.confirmDelete)) return;
    await deleteClient(id);
    setClients(clients.filter((c) => c.id !== id));
  };

  const totalMonthly = clients.filter((c) => c.status === "active").reduce((s, c) => s + c.monthlyFee, 0);
  const activeCount = clients.filter((c) => c.status === "active").length;

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-lime" /></div>;
  }

  const statusOptions = (["active", "paused", "churned"] as Client["status"][]).map((s) => ({
    value: s,
    label: cp[s],
  }));

  return (
    <div>
      <PageHeader
        title={cp.title}
        description={cp.description}
        action={<Button onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4" />{cp.addClient}</Button>}
      />

      {/* Summary stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{activeCount}</p>
          <p className="text-sm text-muted">{cp.active}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{clients.length}</p>
          <p className="text-sm text-muted">{locale === "es" ? "Total clientes" : "Total clients"}</p>
        </div>
        <div className="rounded-xl border border-lime/20 bg-lime/5 p-4 text-center">
          <p className="text-2xl font-bold text-lime">{totalMonthly.toLocaleString()}€</p>
          <p className="text-sm text-muted">{cp.monthlyRevenue}</p>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <Card className="mb-6">
          <CardHeader title={cp.addClient} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input id="brandName" label={cp.brandName} value={newClient.brandName} onChange={(e) => setNewClient({ ...newClient, brandName: e.target.value })} placeholder="Ej. Marca Fitness" />
            <Input id="instagramHandle" label={cp.instagramHandle} value={newClient.instagramHandle} onChange={(e) => setNewClient({ ...newClient, instagramHandle: e.target.value })} placeholder="@marcafitness" />
            <Input id="niche" label={cp.niche} value={newClient.niche} onChange={(e) => setNewClient({ ...newClient, niche: e.target.value })} />
            <Input id="monthlyFee" label={cp.monthlyFee} type="number" value={newClient.monthlyFee} onChange={(e) => setNewClient({ ...newClient, monthlyFee: e.target.value })} />
            <Select id="status" label={cp.status} value={newClient.status} onChange={(e) => setNewClient({ ...newClient, status: e.target.value as Client["status"] })} options={statusOptions} />
            <Textarea id="notes" label={cp.notes} value={newClient.notes} onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })} rows={2} />
          </div>
          {saveError && <p className="mt-3 text-sm text-red-400">{saveError}</p>}
          <div className="mt-4 flex gap-2">
            <Button onClick={handleAdd}>{cp.saveClient}</Button>
            <Button variant="ghost" onClick={() => { setShowForm(false); setSaveError(""); }}>{t.common.cancel}</Button>
          </div>
        </Card>
      )}

      {/* Client list */}
      {clients.length === 0 ? (
        <Card className="flex flex-col items-center py-12">
          <Building2 className="h-12 w-12 text-muted/30" />
          <p className="mt-4 text-muted">{cp.noClients}</p>
          <p className="text-sm text-muted/60 mt-1">{cp.noClientsDesc}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {clients.map((client) => (
            <Card key={client.id} className="!p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-lime/10 text-sm font-bold text-lime">
                    {client.brandName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{client.brandName}</p>
                      <Badge className={statusColors[client.status]}>{cp[client.status]}</Badge>
                    </div>
                    <p className="text-sm text-muted">{client.instagramHandle} · {client.niche}</p>
                    {client.notes && <p className="mt-1 text-xs text-muted">{client.notes}</p>}
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted">
                      <span className={cn("flex items-center gap-1", client.monthlyFee > 0 && "text-lime font-medium")}>
                        <Euro className="h-3 w-3" />{client.monthlyFee.toLocaleString()}/mes
                      </span>
                      <span>{cp.clientSince}: {formatDate(client.createdAt, locale)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select id={`status-${client.id}`} value={client.status} onChange={(e) => handleStatusChange(client.id, e.target.value as Client["status"])} options={statusOptions} className="w-36" />
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(client.id)}>
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
