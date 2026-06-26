import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Plus, Wrench } from "lucide-react";
import { toast } from "sonner";

const STATUS_LABEL: Record<string, string> = {
  submitted: "Submetido", in_review: "Em análise", approved: "Aprovado",
  rejected: "Rejeitado", in_repair: "Em reparação", shipped_back: "Devolvido",
  completed: "Concluído", cancelled: "Cancelado",
};

const STATUS_DESC: Record<string, string> = {
  submitted:    "O seu pedido foi recebido e será analisado brevemente.",
  in_review:    "Estamos a analisar o seu pedido. Entraremos em contacto.",
  approved:     "O RMA foi aprovado. Aguarde instruções de envio.",
  rejected:     "O RMA não foi aprovado. Consulte as notas de resolução.",
  in_repair:    "O equipamento está em reparação.",
  shipped_back: "O equipamento foi devolvido. Verifique os dados de envio.",
  completed:    "Pedido concluído com sucesso.",
  cancelled:    "Pedido cancelado.",
};

export default function ContaRMA() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ product_name: "", serial_number: "", invoice_number: "", purchase_date: "", reason: "", description: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["conta-rma", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rma_requests")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.product_name.trim() || !form.reason.trim() || !form.invoice_number.trim() || !form.purchase_date) {
      toast.error("Produto, motivo, nº de fatura e data de compra são obrigatórios.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("rma_requests").insert({
      user_id: user.id,
      product_name: form.product_name.trim(),
      serial_number: form.serial_number.trim() || null,
      invoice_number: form.invoice_number.trim() || null,
      purchase_date: form.purchase_date || null,
      reason: form.reason.trim(),
      description: form.description.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Pedido de RMA submetido.");
    setOpen(false);
    setForm({ product_name: "", serial_number: "", invoice_number: "", purchase_date: "", reason: "", description: "" });
    qc.invalidateQueries({ queryKey: ["conta-rma", user.id] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Pedidos de RMA</h1>
        <Button onClick={() => setOpen(true)} size="sm" className="gap-1"><Plus className="h-4 w-4" />Novo</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : !data?.length ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <Wrench className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Sem pedidos de RMA.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.map((r) => (
            <Card key={r.id}>
              <CardContent className="py-3 flex flex-wrap items-center gap-3 justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{r.rma_number}</span>
                    <Badge variant="secondary">{STATUS_LABEL[r.status] ?? r.status}</Badge>
                  </div>
                  <div className="text-sm truncate">{r.product_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("pt-PT")} · {r.reason}
                  </div>
                  {STATUS_DESC[r.status] && (
                    <p className="text-xs text-muted-foreground/80 italic mt-1">{STATUS_DESC[r.status]}</p>
                  )}
                  {r.resolution_notes && (
                    <div className="mt-2 rounded-lg bg-muted/60 px-3 py-2">
                      <p className="text-xs font-semibold mb-0.5">Resposta VRCF:</p>
                      <p className="text-xs">{r.resolution_notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Pedido de RMA</DialogTitle>
            <DialogDescription>Descreva o problema. Entraremos em contacto após análise.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-2"><Label>Produto *</Label><Input value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Nº de série</Label><Input value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} /></div>
              <div className="space-y-2"><Label>Nº fatura *</Label><Input value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} placeholder="Ex: FT2026/1234" required /></div>
            </div>
            <div className="space-y-2"><Label>Data de compra *</Label><Input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Motivo *</Label><Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Ex: não liga, ecrã partido..." required /></div>
            <div className="space-y-2"><Label>Descrição detalhada</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></div>
            <Button type="submit" disabled={submitting} className="w-full gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Submeter
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
