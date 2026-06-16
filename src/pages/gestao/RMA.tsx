import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Wrench, Search } from "lucide-react";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  { value: "submitted",    label: "Submetido" },
  { value: "in_review",   label: "Em análise" },
  { value: "approved",    label: "Aprovado" },
  { value: "rejected",    label: "Rejeitado" },
  { value: "in_repair",   label: "Em reparação" },
  { value: "shipped_back",label: "Devolvido" },
  { value: "completed",   label: "Concluído" },
  { value: "cancelled",   label: "Cancelado" },
];

const STATUS_COLOR: Record<string, string> = {
  submitted:    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  in_review:    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  approved:     "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected:     "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  in_repair:    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  shipped_back: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400",
  completed:    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  cancelled:    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

export default function GestaoRMA() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["gestao-rma", statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("rma_requests")
        .select("*,customer_profiles(full_name,company,phone)")
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter as any);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30 * 1000,
  });

  const filtered = (data ?? []).filter((r: any) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      r.rma_number?.toLowerCase().includes(s) ||
      r.product_name?.toLowerCase().includes(s) ||
      r.customer_profiles?.full_name?.toLowerCase().includes(s) ||
      r.customer_profiles?.company?.toLowerCase().includes(s)
    );
  });

  const openEdit = (r: any) => {
    setEditing(r);
    setEditStatus(r.status);
    setEditNotes(r.resolution_notes ?? "");
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase.from("rma_requests").update({
      status: editStatus as any,
      resolution_notes: editNotes.trim() || null,
    }).eq("id", editing.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("RMA atualizado.");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["gestao-rma"] });
    qc.invalidateQueries({ queryKey: ["gestao-stats"] });
  };

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-bold">Pedidos de RMA</h1>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nº, produto, cliente..."
            className="pl-9 h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Wrench className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>Nenhum pedido de RMA encontrado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((r: any) => (
            <Card key={r.id} className="hover:bg-secondary/20 transition-colors">
              <CardContent className="py-3 flex flex-wrap items-start gap-3 justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-semibold">{r.rma_number}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[r.status] ?? ""}`}>
                      {STATUS_OPTIONS.find((s) => s.value === r.status)?.label ?? r.status}
                    </span>
                  </div>
                  <p className="text-sm font-medium mt-0.5 truncate">{r.product_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.customer_profiles?.company || r.customer_profiles?.full_name || "—"}
                    {r.customer_profiles?.phone && ` · ${r.customer_profiles.phone}`}
                    {" · "}
                    {new Date(r.created_at).toLocaleDateString("pt-PT", { dateStyle: "medium" })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Motivo: {r.reason}</p>
                  {r.resolution_notes && (
                    <p className="text-xs text-foreground mt-1 border-l-2 border-primary pl-2">{r.resolution_notes}</p>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={() => openEdit(r)}>
                  Gerir
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de edição */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.rma_number}</DialogTitle>
            <DialogDescription>{editing?.product_name}</DialogDescription>
          </DialogHeader>

          {editing && (
            <div className="space-y-4">
              {/* Info do cliente */}
              <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-0.5">
                <p className="font-medium">{editing.customer_profiles?.full_name || "—"}</p>
                {editing.customer_profiles?.company && <p className="text-muted-foreground">{editing.customer_profiles.company}</p>}
                {editing.customer_profiles?.phone && <p className="text-muted-foreground">{editing.customer_profiles.phone}</p>}
              </div>

              {/* Info do pedido */}
              <div className="text-sm space-y-1 text-muted-foreground">
                {editing.serial_number && <p>Nº série: <span className="text-foreground font-mono">{editing.serial_number}</span></p>}
                {editing.invoice_number && <p>Nº fatura: <span className="text-foreground font-mono">{editing.invoice_number}</span></p>}
                {editing.purchase_date && <p>Data de compra: <span className="text-foreground">{new Date(editing.purchase_date).toLocaleDateString("pt-PT")}</span></p>}
                <p>Motivo: <span className="text-foreground">{editing.reason}</span></p>
                {editing.description && <p className="whitespace-pre-wrap pt-1 text-foreground border-t border-border">{editing.description}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Estado</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Notas de resolução / resposta ao cliente</Label>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={4}
                  placeholder="Diagnóstico, resolução, prazo estimado..."
                />
              </div>

              {editing.customer_profiles?.phone && (
                <Button variant="outline" size="sm" className="gap-2 w-full" asChild>
                  <a
                    href={`https://wa.me/351${editing.customer_profiles.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá, sobre o pedido de RMA ${editing.rma_number} (${editing.product_name}):`)}`}
                    target="_blank" rel="noopener noreferrer"
                  >
                    💬 Contactar via WhatsApp
                  </a>
                </Button>
              )}

              <Button className="w-full" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Guardar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
