import { useState } from "react";
import { Link, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, FileText, Eye, Search, Truck, PackageX, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { calcularPortesPorFornecedor, totalPortesComIva } from "@/lib/calcularPortes";

// Ordem de urgência para a lista: pendentes/sent primeiro, depois por data
const URGENCIA: Record<string, number> = {
  pending: 0, sent: 1, in_review: 2, accepted: 3,
  rejected: 4, completed: 5, cancelled: 6,
};

const STATUS_OPTIONS = [
  { value: "sent",      label: "Enviado — por responder" },
  { value: "in_review", label: "Em análise" },
  { value: "accepted",  label: "Aceite" },
  { value: "rejected",  label: "Rejeitado" },
  { value: "cancelled", label: "Cancelado" },
  { value: "completed", label: "Concluído" },
];

const STATUS_COLOR: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  sent:      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  in_review: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  accepted:  "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected:  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  cancelled: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const PRAZO_OPCOES = ["24-48h", "3-5 dias úteis", "5-10 dias úteis", "Sob consulta"];

// ─── Lista de orçamentos ───────────────────────────────────────────────────

function OrcamentosList() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["gestao-quotes", statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("quotes")
        .select("id,quote_number,status,total,created_at,notes,customer_name,customer_email,customer_phone,customer_profiles!left(full_name,company,phone,tax_id)")
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter as any);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30 * 1000,
  });

  const filtered = (data ?? [])
    .filter((q: any) => {
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      return (
        q.quote_number?.toLowerCase().includes(s) ||
        q.customer_profiles?.full_name?.toLowerCase().includes(s) ||
        q.customer_profiles?.company?.toLowerCase().includes(s) ||
        q.customer_name?.toLowerCase().includes(s) ||
        q.customer_email?.toLowerCase().includes(s)
      );
    })
    .sort((a: any, b: any) => {
      const ua = URGENCIA[a.status] ?? 99;
      const ub = URGENCIA[b.status] ?? 99;
      if (ua !== ub) return ua - ub;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-bold">Orçamentos</h1>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nº, cliente, empresa..."
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
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>Nenhum orçamento encontrado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((q: any) => (
            <Card key={q.id} className="hover:bg-secondary/20 transition-colors">
              <CardContent className="py-3 flex flex-wrap items-center gap-3 justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-semibold">{q.quote_number}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[q.status] ?? ""}`}>
                      {STATUS_OPTIONS.find((s) => s.value === q.status)?.label ?? q.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {q.customer_profiles?.company || q.customer_profiles?.full_name || q.customer_name || "—"}
                    {(q.customer_profiles?.phone || q.customer_phone) && ` · ${q.customer_profiles?.phone || q.customer_phone}`}
                    {" · "}
                    {new Date(q.created_at).toLocaleDateString("pt-PT", { dateStyle: "medium" })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {Number(q.total) > 0 && (
                    <span className="text-sm font-semibold">
                      {Number(q.total).toFixed(2).replace(".", ",")} €
                    </span>
                  )}
                  {q.status === "accepted" && (
                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">✓ Cliente aceitou</span>
                  )}
                  {q.status === "rejected" && (
                    <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200 shrink-0">✗ Cliente rejeitou</span>
                  )}
                  <Button variant={q.status === "pending" ? "default" : "outline"} size="sm" asChild>
                    <Link to={`/gestao/orcamentos/${q.id}`}>
                      {q.status === "pending"
                        ? <><Send className="h-4 w-4 mr-1" /> Responder</>
                        : <><Eye className="h-4 w-4 mr-1" /> Ver</>}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Detalhe / edição de orçamento ────────────────────────────────────────

function OrcamentoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [sendingFinal, setSendingFinal] = useState(false);
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [total, setTotal] = useState("");
  const [shippingTotal, setShippingTotal] = useState("");
  const [prazoEntrega, setPrazoEntrega] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["gestao-quote", id],
    queryFn: async () => {
      const [q, items, shipCfg] = await Promise.all([
        supabase.from("quotes").select("*,customer_profiles!left(*)").eq("id", id!).maybeSingle(),
        supabase.from("quote_items").select("*,products(stock_status,fornecedor,weight)").eq("quote_id", id!),
        supabase.from("shipping_config").select("*").eq("ativo", true),
      ]);
      if (q.error) throw q.error;
      if (q.data) {
        setStatus(q.data.status);
        setNotes(q.data.notes ?? "");
        setTotal(q.data.total != null ? String(q.data.total) : "");
        setShippingTotal((q.data as any).shipping_total != null ? String((q.data as any).shipping_total) : "");
        setPrazoEntrega((q.data as any).prazo_entrega ?? "");

        // Auto-avançar estado: se está "sent" (por responder), marca como "in_review"
        // ao abrir — sinaliza que está a ser tratado, aparece correctamente no Resumo.
        if (q.data.status === "sent") {
          supabase.from("quotes").update({ status: "in_review" as any }).eq("id", id!).then(() => {
            setStatus("in_review");
          });
        }
      }
      return { quote: q.data, items: items.data ?? [], shippingConfigs: shipCfg.data ?? [] };
    },
    enabled: !!id,
  });

  const portesSugeridos = data ? calcularPortesPorFornecedor(
    data.items.map((it: any) => ({
      fornecedor: it.products?.fornecedor,
      quantity: it.quantity,
      weight: it.products?.weight,
    })),
    data.shippingConfigs as any,
  ) : [];
  const sugestaoTotal = totalPortesComIva(portesSugeridos);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);

    // Guardar o estado anterior para saber se mudou
    const estadoAnterior = data?.quote?.status;

    const { error } = await supabase.from("quotes").update({
      status: status as any,
      notes: notes.trim() || null,
      total: total ? parseFloat(total.replace(",", ".")) : null,
      shipping_total: shippingTotal ? parseFloat(shippingTotal.replace(",", ".")) : null,
      prazo_entrega: prazoEntrega.trim() || null,
    } as any).eq("id", id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Orçamento atualizado.");

    // Notificar cliente se o estado mudou para um estado relevante.
    // (accepted é tratado pelo send-quote-final; in_review é transição interna)
    if (status !== estadoAnterior && ["rejected", "cancelled", "completed"].includes(status)) {
      supabase.functions
        .invoke("send-quote-status-update", { body: { quoteId: id, newStatus: status } })
        .then(({ error: emailErr }) => {
          if (emailErr) {
            console.warn("[Orçamento] email notification failed:", emailErr);
            toast.warning("Estado guardado, mas falhou o envio do email ao cliente.");
          } else {
            toast.info("Cliente notificado por email.");
          }
        });
    }

    qc.invalidateQueries({ queryKey: ["gestao-quotes"] });
    qc.invalidateQueries({ queryKey: ["gestao-quote", id] });
    qc.invalidateQueries({ queryKey: ["gestao-stats"] });
    qc.invalidateQueries({ queryKey: ["gestao-recent-quotes"] });
  };

  const handleSendFinal = async () => {
    if (!id) return;
    if (!shippingTotal.trim() || !prazoEntrega.trim()) {
      toast.error("Preenche portes e prazo de entrega antes de enviar o orçamento final.");
      return;
    }
    setSendingFinal(true);
    try {
      // Garante que o que está no ecrã fica gravado antes de enviar.
      await supabase.from("quotes").update({
        status: status as any,
        notes: notes.trim() || null,
        total: total ? parseFloat(total.replace(",", ".")) : null,
        shipping_total: parseFloat(shippingTotal.replace(",", ".")),
        prazo_entrega: prazoEntrega.trim(),
      } as any).eq("id", id);

      const { data: result, error } = await supabase.functions.invoke("send-quote-final", { body: { quoteId: id } });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      if (result?.skipped) {
        toast.warning("Orçamento gravado, mas o cliente não tem email associado — não foi possível enviar.");
      } else {
        // Auto-avançar para "accepted" — o orçamento final foi enviado, está na mão do cliente.
        await supabase.from("quotes").update({ status: "accepted" as any }).eq("id", id!);
        setStatus("accepted");
        toast.success("Orçamento final enviado ao cliente.");
      }
      qc.invalidateQueries({ queryKey: ["gestao-quote", id] });
      qc.invalidateQueries({ queryKey: ["gestao-quotes"] });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao enviar orçamento final.");
    } finally {
      setSendingFinal(false);
    }
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!data?.quote) return <Card><CardContent className="py-12 text-center text-muted-foreground">Orçamento não encontrado.</CardContent></Card>;

  const { quote, items } = data;
  const profile = (quote as any).customer_profiles;
  const sentFinalAt = (quote as any).sent_final_at;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate("/gestao/orcamentos")}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
      </Button>

      <div className="grid md:grid-cols-[1fr_320px] gap-4">
        {/* Itens do orçamento */}
        <Card>
          <CardHeader>
            <CardTitle className="font-mono">{quote.quote_number}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {new Date(quote.created_at).toLocaleString("pt-PT")}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Dados do cliente */}
            {(profile || quote.customer_name) && (
              <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
                <p className="font-medium">{profile?.full_name || quote.customer_name || "—"}</p>
                {profile?.company && <p className="text-muted-foreground">{profile.company}</p>}
                {profile?.tax_id && <p className="text-muted-foreground">NIF: {profile.tax_id}</p>}
                {(profile?.phone || quote.customer_phone) && (
                  <p className="text-muted-foreground">{profile?.phone || quote.customer_phone}</p>
                )}
                {(quote.customer_email) && (
                  <p className="text-muted-foreground">{quote.customer_email}</p>
                )}
                {profile?.address_line1 && (
                  <p className="text-muted-foreground">
                    {profile.address_line1}{profile.city ? `, ${profile.city}` : ""}{profile.postal_code ? ` ${profile.postal_code}` : ""}
                  </p>
                )}
              </div>
            )}

            {/* Linhas de produto */}
            <div className="divide-y divide-border">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Sem itens registados.</p>
              ) : items.map((it: any) => (
                <div key={it.id} className="flex items-center gap-3 py-3">
                  {it.product_image_snapshot && (
                    <img src={it.product_image_snapshot} alt="" className="h-12 w-12 object-cover rounded bg-secondary flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate flex items-center gap-1.5">
                      {it.product_name_snapshot}
                      {it.products?.stock_status === "on_request" && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full flex-shrink-0">
                          <PackageX className="h-2.5 w-2.5" /> Sem stock — confirmar c/ fornecedor
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Qtd: {it.quantity}
                      {it.unit_price != null && ` · ${Number(it.unit_price).toFixed(2).replace(".", ",")} €/un`}
                      {it.products?.fornecedor && ` · ${it.products.fornecedor}`}
                    </p>
                  </div>
                  {it.line_total != null && Number(it.line_total) > 0 && (
                    <span className="text-sm font-semibold flex-shrink-0">
                      {Number(it.line_total).toFixed(2).replace(".", ",")} €
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Painel de gestão */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Gestão</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Estado</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Total (€)</Label>
                <div className="flex gap-2">
                  <Input
                    value={total}
                    onChange={(e) => setTotal(e.target.value)}
                    placeholder="0.00"
                    className="h-9"
                  />
                  <Button
                    type="button" variant="outline" size="sm" className="h-9 whitespace-nowrap text-xs"
                    onClick={() => {
                      const subtotalItens = items.reduce((s: number, it: any) => s + (Number(it.line_total) || 0), 0);
                      const portes = shippingTotal ? parseFloat(shippingTotal.replace(",", ".")) || 0 : 0;
                      setTotal((subtotalItens + portes).toFixed(2));
                    }}
                  >
                    Recalcular
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">Soma dos produtos + portes preenchidos acima.</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1"><Truck className="h-3 w-3" /> Portes (€, c/ IVA)</Label>
                <div className="flex gap-2">
                  <Input
                    value={shippingTotal}
                    onChange={(e) => setShippingTotal(e.target.value)}
                    placeholder="0.00"
                    className="h-9"
                  />
                  {sugestaoTotal > 0 && (
                    <Button
                      type="button" variant="outline" size="sm" className="h-9 whitespace-nowrap text-xs"
                      onClick={() => setShippingTotal(sugestaoTotal.toFixed(2))}
                    >
                      Sugestão: {sugestaoTotal.toFixed(2).replace(".", ",")} €
                    </Button>
                  )}
                </div>
                {portesSugeridos.length > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    {portesSugeridos.map(p => `${p.fornecedor}: ${p.portesComIva.toFixed(2).replace(".", ",")}€ (${p.descricao})`).join(" · ")}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Prazo de entrega</Label>
                <Input
                  value={prazoEntrega}
                  onChange={(e) => setPrazoEntrega(e.target.value)}
                  placeholder="ex: 3-5 dias úteis"
                  className="h-9"
                />
                <div className="flex flex-wrap gap-1.5">
                  {PRAZO_OPCOES.map(opt => (
                    <Button
                      key={opt} type="button" variant="secondary" size="sm" className="h-7 text-[11px] px-2"
                      onClick={() => setPrazoEntrega(opt)}
                    >
                      {opt}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Notas internas / resposta ao cliente</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Observações, condições de pagamento..."
                />
              </div>

              <Button className="w-full" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Guardar alterações
              </Button>

              {quote.customer_email && (
                <Button className="w-full" variant="default" onClick={handleSendFinal} disabled={sendingFinal}>
                  {sendingFinal ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  Enviar Orçamento Final
                </Button>
              )}
              {sentFinalAt && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 justify-center">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  Enviado em {new Date(sentFinalAt).toLocaleString("pt-PT")}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Acções rápidas */}
          {(profile?.phone || quote.customer_phone) && (
            <Card>
              <CardHeader><CardTitle className="text-base">Acções rápidas</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start gap-2" asChild>
                  <a
                    href={`https://wa.me/351${(profile?.phone || quote.customer_phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(`Olá${(profile?.full_name || quote.customer_name) ? " " + (profile?.full_name || quote.customer_name || "").split(" ")[0] : ""}, sobre o orçamento ${quote.quote_number}:`)}`}
                    target="_blank" rel="noopener noreferrer"
                  >
                    💬 WhatsApp
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Router interno ───────────────────────────────────────────────────────

export default function GestaoOrcamentos() {
  return (
    <Routes>
      <Route index element={<OrcamentosList />} />
      <Route path=":id" element={<OrcamentoDetalhe />} />
    </Routes>
  );
}
