import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Plus, Wrench, CheckCircle2, Clock, Search, Package, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const STATUS_LABEL: Record<string, string> = {
  submitted:   "Submetido",
  in_review:   "Em análise",
  approved:    "Aprovado",
  rejected:    "Rejeitado",
  in_repair:   "Em reparação",
  shipped_back:"Devolvido",
  completed:   "Concluído",
  cancelled:   "Cancelado",
};

const STATUS_COLOR: Record<string, string> = {
  submitted:    "bg-amber-100 text-amber-800",
  in_review:    "bg-blue-100 text-blue-800",
  approved:     "bg-emerald-100 text-emerald-800",
  rejected:     "bg-red-100 text-red-800",
  in_repair:    "bg-purple-100 text-purple-800",
  shipped_back: "bg-cyan-100 text-cyan-800",
  completed:    "bg-emerald-100 text-emerald-800",
  cancelled:    "bg-gray-100 text-gray-600",
};

// Descrição do que acontece em cada estado
const STATUS_DESC: Record<string, string> = {
  submitted:    "O seu pedido foi recebido e será analisado brevemente.",
  in_review:    "Estamos a analisar o seu pedido. Entraremos em contacto.",
  approved:     "O RMA foi aprovado. Aguarde instruções de envio.",
  rejected:     "O RMA não foi aprovado. Consulte as notas de resolução.",
  in_repair:    "O equipamento está em reparação.",
  shipped_back: "O equipamento foi devolvido. Verifique os dados de envio.",
  completed:    "Pedido concluído.",
  cancelled:    "Pedido cancelado.",
};

// Ícone por estado
function StatusIcon({ status }: { status: string }) {
  if (["completed", "approved"].includes(status)) return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (["rejected", "cancelled"].includes(status)) return <AlertTriangle className="h-4 w-4 text-red-500" />;
  if (status === "submitted") return <Clock className="h-4 w-4 text-amber-500" />;
  return <Package className="h-4 w-4 text-blue-500" />;
}

export default function ContaRMA() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    product_name: "", serial_number: "", invoice_number: "",
    purchase_date: "", reason: "", description: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["conta-rma", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rma_requests").select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.product_name.trim() || !form.reason.trim()) {
      toast.error("Indique o produto e o motivo.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("rma_requests").insert({
      user_id:        user.id,
      product_name:   form.product_name.trim(),
      serial_number:  form.serial_number.trim() || null,
      invoice_number: form.invoice_number.trim() || null,
      purchase_date:  form.purchase_date || null,
      reason:         form.reason.trim(),
      description:    form.description.trim() || null,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Pedido de RMA submetido. Entraremos em contacto brevemente.");
    setOpen(false);
    setForm({ product_name: "", serial_number: "", invoice_number: "", purchase_date: "", reason: "", description: "" });
    qc.invalidateQueries({ queryKey: ["conta-rma", user.id] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Pedidos de RMA</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Devoluções e reparações de equipamento</p>
        </div>
        <Button onClick={() => setOpen(true)} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Novo pedido
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : !data?.length ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <Wrench className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Sem pedidos de RMA</p>
            <p className="text-xs mt-1">Se tiver um equipamento com problema, clique em "Novo pedido".</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((r) => (
            <Card key={r.id} className={`${["submitted", "in_review", "approved"].includes(r.status) ? "border-amber-200/60" : ""}`}>
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <StatusIcon status={r.status} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-xs font-semibold">{r.rma_number}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[r.status] ?? ""}`}>
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                    </div>
                    <p className="text-sm font-medium truncate">{r.product_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {r.reason} · {new Date(r.created_at).toLocaleDateString("pt-PT")}
                    </p>
                    {/* Descrição do estado atual */}
                    <p className="text-xs text-muted-foreground mt-1.5 italic">
                      {STATUS_DESC[r.status]}
                    </p>
                    {/* Notas de resolução da VRCF */}
                    {r.resolution_notes && (
                      <div className="mt-2 rounded-lg bg-muted/60 px-3 py-2">
                        <p className="text-xs font-semibold text-foreground mb-0.5">Resposta VRCF:</p>
                        <p className="text-xs">{r.resolution_notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Diálogo novo RMA */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Pedido de RMA</DialogTitle>
            <DialogDescription>
              Preencha os dados do equipamento com problema. Entraremos em contacto após análise — normalmente em 24-48h.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-2">
              <Label>Produto *</Label>
              <Input value={form.product_name}
                onChange={(e) => setForm({ ...form, product_name: e.target.value })}
                placeholder="Ex: Câmara IP Hikvision DS-2CD2143G2" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nº de série</Label>
                <Input value={form.serial_number}
                  onChange={(e) => setForm({ ...form, serial_number: e.target.value })}
                  placeholder="Opcional" />
              </div>
              <div className="space-y-2">
                <Label>Nº fatura</Label>
                <Input value={form.invoice_number}
                  onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
                  placeholder="Opcional" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Data de compra</Label>
              <Input type="date" value={form.purchase_date}
                onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Motivo *</Label>
              <Input value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="Ex: não liga, ecrã partido, avaria..." required />
            </div>
            <div className="space-y-2">
              <Label>Descrição detalhada</Label>
              <Textarea value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descreva o problema com o máximo de detalhe possível..."
                rows={3} />
            </div>
            <Button type="submit" disabled={submitting} className="w-full gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Submeter pedido
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
