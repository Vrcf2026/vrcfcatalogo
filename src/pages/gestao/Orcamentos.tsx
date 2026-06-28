import { useState, useEffect } from "react";
import { Link, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Loader2, Send, CheckCircle2, Truck, FileText,
  Eye, Search, PackageX, Download, Edit2, Save, X,
} from "lucide-react";
import { toast } from "sonner";
import { generateQuotePdf } from "@/lib/quotePdf";

const URGENCIA: Record<string, number> = {
  pending: 0, sent: 1, in_review: 2, accepted: 3,
  paid: 4, in_preparation: 5, shipped: 6,
  rejected: 7, cancelled: 8, completed: 9,
};

const STATUS_OPTIONS = [
  { value: "pending",        label: "Pendente — por analisar" },
  { value: "in_review",     label: "Em análise" },
  { value: "sent",          label: "Orçamento enviado" },
  { value: "accepted",      label: "Aceite pelo cliente" },
  { value: "paid",          label: "Pago" },
  { value: "in_preparation",label: "Em preparação" },
  { value: "shipped",       label: "Enviado / Expedido" },
  { value: "completed",     label: "Concluído" },
  { value: "rejected",      label: "Rejeitado" },
  { value: "cancelled",     label: "Cancelado" },
];

const STATUS_COLOR: Record<string, string> = {
  pending:        "bg-amber-100 text-amber-800",
  in_review:      "bg-purple-100 text-purple-800",
  sent:           "bg-blue-100 text-blue-800",
  accepted:       "bg-emerald-100 text-emerald-800",
  paid:           "bg-emerald-100 text-emerald-800",
  in_preparation: "bg-cyan-100 text-cyan-800",
  shipped:        "bg-indigo-100 text-indigo-800",
  completed:      "bg-gray-100 text-gray-700",
  rejected:       "bg-red-100 text-red-800",
  cancelled:      "bg-gray-100 text-gray-500",
};

const PRAZO_OPCOES = ["24-48h", "3-5 dias úteis", "5-10 dias úteis", "Sob consulta"];

const FORMAS_PAGAMENTO = [
  "Transferência bancária (IBAN: PT50 XXXX XXXX XXXX XXXX XXXX X)",
  "MB Way (+351 911 564 243)",
  "Multibanco (referência enviada por email)",
  "Numerário (pagamento em loja)",
];

const IVA_RATE = 0.23;

// ─── Lista ────────────────────────────────────────────────────────────────────

function OrcamentosList() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["gestao-quotes", statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("quotes")
        .select("id,quote_number,status,total,created_at,notes,customer_name,customer_email,customer_phone,shipping_total")
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
          <Input placeholder="Pesquisar por nº, cliente..." className="pl-9 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48 h-9"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>Nenhum orçamento encontrado.</p>
        </CardContent></Card>
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
                    {q.customer_name || q.customer_email || "—"}
                    {q.customer_phone && ` · ${q.customer_phone}`}
                    {" · "}{new Date(q.created_at).toLocaleDateString("pt-PT")}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {Number(q.total) > 0 && (
                    <span className="text-sm font-semibold">{Number(q.total).toFixed(2).replace(".", ",")} €</span>
                  )}
                  {q.status === "accepted" && (
                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">✓ Cliente aceitou</span>
                  )}
                  {q.status === "rejected" && (
                    <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">✗ Cliente rejeitou</span>
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

// ─── Detalhe ──────────────────────────────────────────────────────────────────

function OrcamentoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [saving, setSaving] = useState(false);
  const [sendingFinal, setSendingFinal] = useState(false);
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [total, setTotal] = useState("");
  const [shippingTotal, setShippingTotal] = useState("");
  const [prazoEntrega, setPrazoEntrega] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [validade, setValidade] = useState("30 dias");
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [itemEdits, setItemEdits] = useState<Record<string, { qty: number; unit_price: string; description: string }>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["gestao-quote", id],
    enabled: !!id,
    queryFn: async () => {
      const [q, i] = await Promise.all([
        supabase.from("quotes").select("*").eq("id", id!).maybeSingle(),
        supabase.from("quote_items").select("*,products(stock_status,fornecedor,weight)").eq("quote_id", id!),
      ]);
      if (q.error) throw q.error;
      return { quote: q.data, items: i.data ?? [] };
    },
  });

  useEffect(() => {
    if (!data?.quote) return;
    const q = data.quote as any;
    if (q.status === "sent") {
      supabase.from("quotes").update({ status: "in_review" as any }).eq("id", id!).then(() => {
        qc.invalidateQueries({ queryKey: ["gestao-quotes"] });
      });
    }
    setStatus(q.status);
    setNotes(q.notes ?? "");
    setAdminNotes(q.admin_notes ?? "");
    setTotal(q.total != null ? String(q.total) : "");
    setShippingTotal(q.shipping_total != null ? String(q.shipping_total) : "");
    setPrazoEntrega(q.prazo_entrega ?? "");
    setTrackingCode((q as any).tracking_code ?? "");
  }, [data?.quote]);

  const items = data?.items ?? [];

  // Calcular subtotal dos itens editados
  const subtotalItens = items.reduce((s: number, it: any) => {
    const edit = itemEdits[it.id];
    const qty = edit?.qty ?? it.quantity;
    const price = edit ? parseFloat(edit.unit_price) || 0 : (it.unit_price ?? 0);
    return s + qty * price;
  }, 0);

  const shippingNum = parseFloat(shippingTotal.replace(",", ".")) || 0;
  const totalCalc = subtotalItens + shippingNum;
  const subtotalSemIva = totalCalc / (1 + IVA_RATE);
  const ivaValor = totalCalc - subtotalSemIva;

  const handleSave = async () => {
    setSaving(true);
    try {
      // Gravar edições de itens
      for (const [itemId, edit] of Object.entries(itemEdits)) {
        const qty = edit.qty;
        const unitPrice = parseFloat(edit.unit_price) || 0;
        await supabase.from("quote_items").update({
          quantity: qty,
          unit_price: unitPrice,
          line_total: qty * unitPrice,
          product_name_snapshot: edit.description,
        }).eq("id", itemId);
      }
      setItemEdits({});
      setEditingItem(null);

      await supabase.from("quotes").update({
        status: status as any,
        notes: notes.trim() || null,
        admin_notes: adminNotes.trim() || null,
        total: totalCalc > 0 ? totalCalc : null,
        shipping_total: shippingNum > 0 ? shippingNum : null,
        prazo_entrega: prazoEntrega.trim() || null,
      } as any).eq("id", id!);

      qc.invalidateQueries({ queryKey: ["gestao-quote", id] });
      qc.invalidateQueries({ queryKey: ["gestao-quotes"] });
      toast.success("Guardado.");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao guardar.");
    } finally {
      setSaving(false);
    }
  };

  const handleSendFinal = async () => {
    if (!id) return;
    if (!shippingTotal.trim() || !prazoEntrega.trim()) {
      toast.error("Preenche portes e prazo de entrega antes de enviar.");
      return;
    }
    setSendingFinal(true);
    try {
      await supabase.from("quotes").update({
        status: status as any,
        notes: notes.trim() || null,
        total: totalCalc > 0 ? totalCalc : null,
        shipping_total: shippingNum > 0 ? shippingNum : null,
        prazo_entrega: prazoEntrega.trim() || null,
      } as any).eq("id", id);

      const { data: result, error } = await supabase.functions.invoke("send-quote-final", { body: { quoteId: id } });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      await supabase.from("quotes").update({ status: "sent" as any }).eq("id", id!);
      setStatus("sent");
      toast.success("Orçamento enviado ao cliente — aguarda resposta.");
      qc.invalidateQueries({ queryKey: ["gestao-quote", id] });
      qc.invalidateQueries({ queryKey: ["gestao-quotes"] });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao enviar.");
    } finally {
      setSendingFinal(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    setStatus(newStatus);
    await supabase.from("quotes").update({ status: newStatus as any }).eq("id", id!);
    // Notificar cliente nos estados relevantes
    if (["shipped", "in_preparation", "paid", "completed"].includes(newStatus)) {
      await supabase.functions.invoke("send-quote-status-update", {
        body: { quoteId: id, newStatus, triggeredBy: "gestor" },
      });
    }
    qc.invalidateQueries({ queryKey: ["gestao-quotes"] });
    toast.success(`Estado actualizado para "${STATUS_OPTIONS.find(s => s.value === newStatus)?.label ?? newStatus}".`);
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!data?.quote) return <Card><CardContent className="py-12 text-center text-muted-foreground">Orçamento não encontrado.</CardContent></Card>;

  const { quote } = data;
  const sentFinalAt = (quote as any).sent_final_at;
  const canSendFinal = !["completed", "cancelled", "rejected"].includes(status);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/gestao/orcamentos")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <span className="font-mono font-bold text-lg">{quote.quote_number}</span>
        <Badge className={STATUS_COLOR[status] ?? ""}>{STATUS_OPTIONS.find(s => s.value === status)?.label ?? status}</Badge>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => generateQuotePdf(
            { ...quote, notes, prazo_entrega: prazoEntrega, total: totalCalc, shipping_total: shippingNum, validade } as any,
            items.map((it: any) => ({
              ...it,
              quantity: itemEdits[it.id]?.qty ?? it.quantity,
              unit_price: itemEdits[it.id] ? parseFloat(itemEdits[it.id].unit_price) : it.unit_price,
              line_total: (itemEdits[it.id]?.qty ?? it.quantity) * (itemEdits[it.id] ? parseFloat(itemEdits[it.id].unit_price) || 0 : it.unit_price ?? 0),
              product_name_snapshot: itemEdits[it.id]?.description ?? it.product_name_snapshot,
            }))
          )} className="gap-1.5">
            <Download className="h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_300px] gap-4 items-start">

        {/* ── Coluna principal ── */}
        <div className="space-y-4">

          {/* Dados do cliente */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Cliente</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <p className="font-semibold">{quote.customer_name || "—"}</p>
              {(quote as any).customer_company && <p className="text-muted-foreground">{(quote as any).customer_company}</p>}
              {(quote as any).customer_tax_id && <p className="text-muted-foreground">NIF: {(quote as any).customer_tax_id}</p>}
              {quote.customer_phone && <p className="text-muted-foreground">{quote.customer_phone}</p>}
              {quote.customer_email && <p className="text-muted-foreground">{quote.customer_email}</p>}
              {(quote as any).shipping_address && (
                <p className="text-muted-foreground mt-1">{(quote as any).shipping_address}</p>
              )}
            </CardContent>
          </Card>

          {/* Produtos — editáveis */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                Produtos
                <span className="text-xs font-normal text-muted-foreground">Clica em ✏️ para editar</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Sem itens registados.</p>
                ) : items.map((it: any) => {
                  const edit = itemEdits[it.id];
                  const isEditing = editingItem === it.id;
                  const qty = edit?.qty ?? it.quantity;
                  const unitPrice = edit ? parseFloat(edit.unit_price) || 0 : (it.unit_price ?? 0);
                  const lineTotal = qty * unitPrice;
                  const name = edit?.description ?? it.product_name_snapshot;

                  return (
                    <div key={it.id} className="py-3">
                      {isEditing ? (
                        <div className="space-y-2">
                          <Input
                            value={edit?.description ?? it.product_name_snapshot}
                            onChange={e => setItemEdits(p => ({ ...p, [it.id]: { ...p[it.id], description: e.target.value } }))}
                            className="h-8 text-sm"
                          />
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <Label className="text-[10px]">Qtd</Label>
                              <Input type="number" min={1} value={edit?.qty ?? it.quantity}
                                onChange={e => setItemEdits(p => ({ ...p, [it.id]: { ...p[it.id], qty: parseInt(e.target.value) || 1 } }))}
                                className="h-8 text-sm" />
                            </div>
                            <div>
                              <Label className="text-[10px]">Preço unit. c/IVA (€)</Label>
                              <Input value={edit?.unit_price ?? (it.unit_price != null ? String(it.unit_price) : "")}
                                onChange={e => setItemEdits(p => ({ ...p, [it.id]: { ...p[it.id], unit_price: e.target.value } }))}
                                className="h-8 text-sm" placeholder="0.00" />
                            </div>
                            <div>
                              <Label className="text-[10px]">Total (€)</Label>
                              <Input value={lineTotal > 0 ? lineTotal.toFixed(2) : ""} readOnly className="h-8 text-sm bg-muted/30" />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => setEditingItem(null)} className="h-7 gap-1"><Save className="h-3 w-3" /> OK</Button>
                            <Button size="sm" variant="ghost" onClick={() => { setEditingItem(null); setItemEdits(p => { const n = { ...p }; delete n[it.id]; return n; }); }} className="h-7"><X className="h-3 w-3" /></Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          {it.product_image_snapshot && (
                            <img src={it.product_image_snapshot} alt="" className="h-10 w-10 object-cover rounded bg-secondary flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{name}</p>
                            <p className="text-xs text-muted-foreground">
                              {qty}× {unitPrice > 0 ? `${unitPrice.toFixed(2).replace(".", ",")} €/un` : "—"}
                              {it.products?.fornecedor && ` · ${it.products.fornecedor}`}
                              {it.products?.stock_status === "on_request" && (
                                <span className="ml-1 text-amber-600">⚠ Confirmar stock</span>
                              )}
                            </p>
                          </div>
                          {lineTotal > 0 && (
                            <span className="text-sm font-semibold flex-shrink-0">{lineTotal.toFixed(2).replace(".", ",")} €</span>
                          )}
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 flex-shrink-0"
                            onClick={() => {
                              setEditingItem(it.id);
                              if (!itemEdits[it.id]) {
                                setItemEdits(p => ({ ...p, [it.id]: {
                                  qty: it.quantity,
                                  unit_price: it.unit_price != null ? String(it.unit_price) : "",
                                  description: it.product_name_snapshot,
                                }}));
                              }
                            }}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Totais */}
              <Separator className="my-3" />
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal s/ IVA</span>
                  <span>{subtotalSemIva > 0 ? subtotalSemIva.toFixed(2).replace(".", ",") + " €" : "—"}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>IVA (23%)</span>
                  <span>{ivaValor > 0 ? ivaValor.toFixed(2).replace(".", ",") + " €" : "—"}</span>
                </div>
                {shippingNum > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Portes</span>
                    <span>{shippingNum.toFixed(2).replace(".", ",")} €</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-1 border-t">
                  <span>Total c/ IVA</span>
                  <span className="text-primary">{totalCalc > 0 ? totalCalc.toFixed(2).replace(".", ",") + " €" : "—"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notas para o cliente */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Notas para o cliente</CardTitle></CardHeader>
            <CardContent>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                placeholder="Condições, observações, informações que saem no email e PDF..." />
            </CardContent>
          </Card>

          {/* Notas internas */}
          <Card className="border-amber-200/60 bg-amber-50/30 dark:bg-amber-950/10">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-amber-700">🔒 Notas internas</CardTitle></CardHeader>
            <CardContent>
              <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={2}
                placeholder="Notas internas — não saem no email nem no PDF..." />
            </CardContent>
          </Card>
        </div>

        {/* ── Painel lateral ── */}
        <div className="space-y-4">

          {/* Estado */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Estado</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Select value={status} onValueChange={handleUpdateStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>

              {/* Campo de tracking quando expedido */}
              {status === "shipped" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Nº de tracking / transportadora</Label>
                  <Input value={trackingCode} onChange={e => setTrackingCode(e.target.value)} placeholder="ex: CTT123456789PT" className="h-9" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Orçamento */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Proposta</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1"><Truck className="h-3 w-3" /> Portes c/ IVA (€)</Label>
                <Input value={shippingTotal} onChange={(e) => setShippingTotal(e.target.value)} placeholder="0.00" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Prazo de entrega</Label>
                <Input value={prazoEntrega} onChange={(e) => setPrazoEntrega(e.target.value)} placeholder="ex: 3-5 dias úteis" className="h-9" />
                <div className="flex flex-wrap gap-1">
                  {PRAZO_OPCOES.map(opt => (
                    <Button key={opt} type="button" variant="secondary" size="sm" className="h-6 text-[10px] px-2"
                      onClick={() => setPrazoEntrega(opt)}>{opt}</Button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Validade do orçamento</Label>
                <Input value={validade} onChange={(e) => setValidade(e.target.value)} placeholder="30 dias" className="h-9" />
              </div>
            </CardContent>
          </Card>

          {/* Ações */}
          <Card>
            <CardContent className="pt-4 space-y-2">
              <Button className="w-full" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Guardar alterações
              </Button>

              {canSendFinal && quote.customer_email && (
                <Button className="w-full" variant="default" onClick={handleSendFinal} disabled={sendingFinal}>
                  {sendingFinal ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  Enviar Orçamento ao Cliente
                </Button>
              )}

              {sentFinalAt && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 justify-center">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  Enviado em {new Date(sentFinalAt).toLocaleString("pt-PT")}
                </p>
              )}

              {/* WhatsApp */}
              {quote.customer_phone && (
                <Button variant="outline" size="sm" className="w-full gap-2" asChild>
                  <a href={`https://wa.me/351${quote.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá${quote.customer_name ? " " + quote.customer_name.split(" ")[0] : ""}, sobre o orçamento ${quote.quote_number}:`)}`}
                    target="_blank" rel="noopener noreferrer">
                    💬 WhatsApp
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Info */}
          <Card>
            <CardContent className="pt-4 text-xs text-muted-foreground space-y-1">
              <p>Criado: {new Date(quote.created_at).toLocaleString("pt-PT")}</p>
              <p>Ref: <span className="font-mono">{quote.quote_number}</span></p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Router ───────────────────────────────────────────────────────────────────

export default function GestaoOrcamentos() {
  return (
    <Routes>
      <Route index element={<OrcamentosList />} />
      <Route path=":id" element={<OrcamentoDetalhe />} />
    </Routes>
  );
}
