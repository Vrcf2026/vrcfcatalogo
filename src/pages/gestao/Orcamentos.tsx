import { useState, useEffect } from "react";
import { Link, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Loader2, Send, CheckCircle2, Truck, FileText,
  Eye, Search, PackageX, Download, Edit2, Save, X, Plus, Package,
  Upload, Receipt, ExternalLink, Clock, CreditCard, Wrench, MapPin,
} from "lucide-react";
import { EditProductSheet } from "@/components/EditProductSheet";
import { toast } from "sonner";
import { generateQuotePdf } from "@/lib/quotePdf";
import { quoteStatusClass } from "@/lib/statusColors";

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

// Status colors — moved to semantic tokens in src/index.css.
// Use quoteStatusClass(status) which returns "status-badge status-badge-<key>".

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
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("all");
  const [produtosOpen, setProdutosOpen] = useState(false);
  const [portesOpen, setPortesOpen] = useState(false);
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
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="font-heading text-2xl font-bold">Orçamentos</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setProdutosOpen(true)}>
            <Package className="h-4 w-4" /> Produtos
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setPortesOpen(true)}>
            <Truck className="h-4 w-4" /> Portes
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => navigate("/gestao/orcamentos/novo")}>
            <Plus className="h-4 w-4" /> Novo orçamento
          </Button>
        </div>
      </div>

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
      {/* Modal de produtos para consulta */}
      <Dialog open={produtosOpen} onOpenChange={setProdutosOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" /> Catálogo de Produtos
            </DialogTitle>
          </DialogHeader>
          <GestorProductList />
        </DialogContent>
      </Dialog>

      {/* Modal de portes */}
      <Dialog open={portesOpen} onOpenChange={setPortesOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" /> Tabela de Portes DHL
            </DialogTitle>
          </DialogHeader>
          <TabelaPortes />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Timeline de estados ─────────────────────────────────────────────────────

const TIMELINE_STEPS = [
  { key: "pending",        label: "Pedido",      icon: FileText,     color: "text-amber-500",  bg: "bg-amber-50 border-amber-200" },
  { key: "in_review",      label: "Em análise",  icon: Clock,        color: "text-purple-500", bg: "bg-purple-50 border-purple-200" },
  { key: "sent",           label: "Enviado",     icon: Send,         color: "text-blue-500",   bg: "bg-blue-50 border-blue-200" },
  { key: "accepted",       label: "Aceite",      icon: CheckCircle2, color: "text-emerald-500",bg: "bg-emerald-50 border-emerald-200" },
  { key: "paid",           label: "Pago",        icon: CreditCard,   color: "text-emerald-600",bg: "bg-emerald-50 border-emerald-200" },
  { key: "in_preparation", label: "Preparação",  icon: Wrench,       color: "text-cyan-500",   bg: "bg-cyan-50 border-cyan-200" },
  { key: "shipped",        label: "Expedido",    icon: Truck,        color: "text-indigo-500", bg: "bg-indigo-50 border-indigo-200" },
  { key: "completed",      label: "Concluído",   icon: CheckCircle2, color: "text-gray-500",   bg: "bg-gray-50 border-gray-200" },
];

const TERMINAL_STEPS = ["rejected", "cancelled"];

function StatusTimeline({ currentStatus, onChangeStatus }: { currentStatus: string; onChangeStatus: (s: string) => void }) {
  const isTerminal = TERMINAL_STEPS.includes(currentStatus);
  const currentIdx = TIMELINE_STEPS.findIndex(s => s.key === currentStatus);

  return (
    <div className="space-y-2">
      {/* Timeline visual */}
      <div className="flex items-center gap-0 overflow-x-auto pb-1">
        {TIMELINE_STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isDone    = idx < currentIdx;
          const isCurrent = step.key === currentStatus;
          const isFuture  = idx > currentIdx;
          return (
            <div key={step.key} className="flex items-center shrink-0">
              <button
                onClick={() => !isTerminal && onChangeStatus(step.key)}
                title={step.label}
                className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition-all ${
                  isCurrent
                    ? `${step.bg} border ring-1 ring-offset-1`
                    : isDone
                    ? "opacity-70 hover:opacity-100"
                    : isFuture
                    ? "opacity-30 hover:opacity-60"
                    : ""
                } ${!isTerminal ? "cursor-pointer" : "cursor-default"}`}
              >
                <div className={`h-7 w-7 rounded-full flex items-center justify-center ${
                  isDone ? "bg-emerald-100" : isCurrent ? "bg-white shadow-sm" : "bg-gray-100"
                }`}>
                  {isDone
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    : <Icon className={`h-4 w-4 ${isCurrent ? step.color : "text-gray-400"}`} />
                  }
                </div>
                <span className={`text-[9px] font-medium whitespace-nowrap ${isCurrent ? "text-foreground" : "text-muted-foreground"}`}>
                  {step.label}
                </span>
              </button>
              {idx < TIMELINE_STEPS.length - 1 && (
                <div className={`h-px w-3 shrink-0 mx-0.5 ${idx < currentIdx ? "bg-emerald-400" : "bg-border"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Estado terminal */}
      {isTerminal && (
        <div className={`text-xs px-3 py-2 rounded-lg font-medium ${
          currentStatus === "rejected" ? "bg-red-50 text-red-700 border border-red-200" : "bg-gray-50 text-gray-600 border border-gray-200"
        }`}>
          {currentStatus === "rejected" ? "✗ Rejeitado pelo cliente" : "✗ Cancelado"}
          <button className="ml-2 underline text-[11px]" onClick={() => onChangeStatus("in_review")}>
            Reabrir
          </button>
        </div>
      )}

      {/* Próximo passo */}
      {!isTerminal && currentIdx >= 0 && currentIdx < TIMELINE_STEPS.length - 1 && (
        <button
          onClick={() => onChangeStatus(TIMELINE_STEPS[currentIdx + 1].key)}
          className="w-full text-xs text-center py-1.5 px-3 rounded-lg border border-dashed border-primary/40 text-primary hover:bg-primary/5 transition-colors"
        >
          Avançar → {TIMELINE_STEPS[currentIdx + 1].label}
        </button>
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
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [viewProduct, setViewProduct] = useState<any>(null);
  const [productSearch, setProductSearch] = useState(false);
  const [productSearchQ, setProductSearchQ] = useState("");
  const [extraItems, setExtraItems] = useState<any[]>([]);
  const [itemEdits, setItemEdits] = useState<Record<string, { qty: number; unit_price: string; description: string }>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["gestao-quote", id],
    enabled: !!id,
    queryFn: async () => {
      const [q, i] = await Promise.all([
        supabase.from("quotes").select("*").eq("id", id!).maybeSingle(),
        supabase.from("quote_items").select("*,products(stock_status,weight,price)").eq("quote_id", id!),
      ]);
      if (q.error) throw q.error;
      const items = i.data ?? [];
      const productIds = Array.from(new Set(items.map((it: any) => it.product_id).filter(Boolean)));
      if (productIds.length) {
        const { data: pricing } = await (supabase as any).rpc("get_products_internal_pricing", { p_ids: productIds });
        const priceMap = new Map<string, any>();
        for (const row of (pricing ?? []) as any[]) priceMap.set(row.id, row);
        for (const it of items as any[]) {
          const extra = it.product_id ? priceMap.get(it.product_id) : null;
          if (extra && it.products) it.products = { ...it.products, ...extra };
        }
      }
      return { quote: q.data, items };
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

  const items = [...(data?.items ?? []), ...extraItems];

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

  const handleUploadInvoice = async (file: File) => {
    if (!id) return;
    setUploadingInvoice(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${id}/fatura-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("invoices").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("invoices").getPublicUrl(path);
      const invoiceUrl = urlData.publicUrl;
      await supabase.from("quotes").update({
        invoice_url: invoiceUrl,
        invoice_uploaded_at: new Date().toISOString(),
      } as any).eq("id", id!);
      // Notificar cliente por email
      await supabase.functions.invoke("send-quote-status-update", {
        body: { quoteId: id, newStatus: "invoice_ready", triggeredBy: "gestor", invoiceUrl },
      });
      qc.invalidateQueries({ queryKey: ["gestao-quote", id] });
      toast.success("Fatura carregada e cliente notificado por email.");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao carregar fatura.");
    } finally {
      setUploadingInvoice(false);
    }
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
                <span>Produtos</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-normal text-muted-foreground hidden sm:inline">✏️ para editar linha</span>
                  <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs"
                    onClick={() => setProductSearch(true)}>
                    <Search className="h-3.5 w-3.5" /> Pesquisar produto
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs"
                    onClick={() => {
                      const newId = `custom-${Date.now()}`;
                      setExtraItems(p => [...p, { id: newId, product_name_snapshot: "", product_sku_snapshot: "", quantity: 1, unit_price: "", line_total: 0, product_image_snapshot: null, products: null }]);
                      setEditingItem(newId);
                      setItemEdits(p => ({ ...p, [newId]: { qty: 1, unit_price: "", description: "" } }));
                    }}>
                    <Plus className="h-3.5 w-3.5" /> Linha
                  </Button>
                </div>
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
                            <div className="flex items-center gap-3 flex-wrap">
                              {(it.product_sku_snapshot || it.products?.sku) && (
                                <span className="text-[10px] font-mono text-muted-foreground/70">
                                  REF: {it.product_sku_snapshot}
                                </span>
                              )}
                              {it.products?.purchase_price && (
                                <span className="text-[10px] text-amber-600 font-medium">
                                  Custo: {Number(it.products.purchase_price).toFixed(2)}€
                                </span>
                              )}
                              {it.product_id && (
                                <>
                                  <a href={`/produto/${it.product_id}`} target="_blank" rel="noopener noreferrer"
                                    className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                                    <ExternalLink className="h-2.5 w-2.5" /> Catálogo
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      supabase.from("products").select("*").eq("id", it.product_id!).maybeSingle()
                                        .then(({ data }) => { if (data) setViewProduct(data); });
                                    }}
                                    className="text-[10px] text-purple-600 hover:underline">
                                    📋 Ficha produto
                                  </button>
                                </>
                              )}
                            </div>
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
        <div className="space-y-3">

          {/* Timeline de estados */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Progresso</span>
                <Badge className={STATUS_COLOR[status] ?? ""}>{STATUS_OPTIONS.find(s => s.value === status)?.label ?? status}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StatusTimeline currentStatus={status} onChangeStatus={handleUpdateStatus} />
              {status === "shipped" && (
                <div className="space-y-1.5 mt-3 pt-3 border-t">
                  <Label className="text-xs">Nº de tracking</Label>
                  <Input value={trackingCode} onChange={e => setTrackingCode(e.target.value)} placeholder="ex: CTT123456789PT" className="h-9" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Proposta + Ações num só card */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Proposta</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Portes c/ IVA (€)</Label>
                  <Input value={shippingTotal} onChange={(e) => setShippingTotal(e.target.value)} placeholder="0.00" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Validade</Label>
                  <Input value={validade} onChange={(e) => setValidade(e.target.value)} placeholder="30 dias" className="h-8 text-sm" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Prazo de entrega</Label>
                <Input value={prazoEntrega} onChange={(e) => setPrazoEntrega(e.target.value)} placeholder="ex: 3-5 dias úteis" className="h-8 text-sm" />
                <div className="flex flex-wrap gap-1 mt-1">
                  {PRAZO_OPCOES.map(opt => (
                    <Button key={opt} type="button" variant="secondary" size="sm" className="h-6 text-[10px] px-2"
                      onClick={() => setPrazoEntrega(opt)}>{opt}</Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Botões principais */}
              <Button className="w-full" variant="outline" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                <Save className="h-4 w-4 mr-1.5" /> Guardar
              </Button>

              {canSendFinal && quote.customer_email && (
                <Button className="w-full bg-primary hover:bg-primary/90" onClick={handleSendFinal} disabled={sendingFinal}>
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

              {/* Upload fatura */}
              <div className="pt-2 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Receipt className="h-3.5 w-3.5" /> Fatura
                </p>
                {(quote as any).invoice_url ? (
                  <div className="space-y-1.5">
                    <Button variant="outline" size="sm" className="w-full gap-1.5 border-emerald-300 text-emerald-700" asChild>
                      <a href={(quote as any).invoice_url} target="_blank" rel="noopener noreferrer">
                        <Download className="h-3.5 w-3.5" /> Ver fatura
                      </a>
                    </Button>
                    <p className="text-[10px] text-muted-foreground text-center">
                      Enviada em {new Date((quote as any).invoice_uploaded_at).toLocaleString("pt-PT")}
                    </p>
                  </div>
                ) : (
                  <label className="w-full cursor-pointer">
                    <input type="file" accept=".pdf" className="sr-only"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadInvoice(f); }} />
                    <Button variant="outline" size="sm" className="w-full gap-1.5 pointer-events-none" disabled={uploadingInvoice}>
                      {uploadingInvoice ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      {uploadingInvoice ? "A carregar..." : "Carregar fatura PDF"}
                    </Button>
                  </label>
                )}
              </div>
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

      {/* Ficha de produto (EditProductSheet) */}
      {viewProduct && (
        <EditProductSheet
          open={!!viewProduct}
          onOpenChange={(open) => !open && setViewProduct(null)}
          product={viewProduct}
          families={[]}
          types={[]}
          categories={[]}
          brands={[]}
        />
      )}

      {/* Modal pesquisa de produto */}
      <ProductSearchModal open={productSearch} onClose={() => setProductSearch(false)} onSelect={(p) => {
        const iva = 0.23;
        const unitPrice = p.price ? (Number(p.price) * (1 + iva)).toFixed(2) : "";
        const newId = `search-${Date.now()}`;
        setExtraItems(prev => [...prev, {
          id: newId,
          product_id: p.id,
          product_name_snapshot: p.name,
          product_sku_snapshot: p.sku ?? "",
          product_image_snapshot: p.image_url ?? null,
          quantity: 1,
          unit_price: parseFloat(unitPrice) || 0,
          line_total: parseFloat(unitPrice) || 0,
          products: { stock_status: p.stock_status, fornecedor: p.fornecedor, purchase_price: p.purchase_price },
        }]);
        setItemEdits(prev => ({ ...prev, [newId]: { qty: 1, unit_price: unitPrice, description: p.name } }));
        setEditingItem(null);
      }} />
    </div>
  );
}

// ─── Lista de produtos para consulta do gestor ───────────────────────────────

function GestorProductList() {
  const [q, setQ] = useState("");
  const [fornecedor, setFornecedor] = useState("todos");

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["gestor-products", q, fornecedor],
    queryFn: async () => {
      let query = supabase.from("products")
        .select("id,name,sku,price,taxa_iva,image_url,stock_status,weight,category")
        .eq("include_in_catalog", true)
        .order("name")
        .limit(50);
      if (q.length > 1) query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%`) as any;
      const { data } = await query;
      let rows = (data ?? []) as any[];
      if (rows.length) {
        const { data: pricing } = await (supabase as any).rpc("get_products_internal_pricing", { p_ids: rows.map(r => r.id) });
        const map = new Map<string, any>();
        for (const row of (pricing ?? []) as any[]) map.set(row.id, row);
        rows = rows.map(r => ({ ...r, ...(map.get(r.id) ?? {}) }));
        if (fornecedor !== "todos") rows = rows.filter(r => r.fornecedor === fornecedor);
      }
      return rows;
    },
    staleTime: 60_000,
  });

  return (
    <div className="flex flex-col gap-3 overflow-hidden">
      <div className="flex gap-2 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Nome ou REF..." className="pl-9 h-9" />
        </div>
        <select value={fornecedor} onChange={e => setFornecedor(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="todos">Todos</option>
          <option value="visiotech">Segurança</option>
          <option value="diginova">Informática</option>
          <option value="allto">Economato</option>
        </select>
      </div>
      <div className="overflow-y-auto flex-1 space-y-1">
        {isLoading && <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>}
        {!isLoading && results.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum produto encontrado.</p>}
        {results.map((p: any) => {
          const iva = (Number(p.taxa_iva) || 23) / 100;
          const priceVat = p.price ? (Number(p.price) * (1 + iva)).toFixed(2) : null;
          return (
            <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg border border-border hover:bg-muted/30">
              {p.image_url
                ? <img src={p.image_url} alt="" className="h-10 w-10 object-cover rounded bg-muted shrink-0" />
                : <div className="h-10 w-10 bg-muted rounded flex items-center justify-center shrink-0"><Package className="h-4 w-4 text-muted-foreground" /></div>
              }
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {p.sku && <span className="font-mono mr-2">REF: {p.sku}</span>}
                  {p.category && <span className="mr-2">{p.category}</span>}
                  {p.weight && <span className="mr-2">{p.weight}kg</span>}
                  {p.stock_status === "on_request" && <span className="text-amber-600">⚠ Por encomenda</span>}
                </p>
              </div>
              <div className="text-right shrink-0 space-y-0.5">
                {priceVat && <p className="text-sm font-bold">{priceVat.replace(".",",")} €</p>}
                {p.purchase_price && <p className="text-[10px] text-amber-600">Custo: {Number(p.purchase_price).toFixed(2)}€</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tabela de portes DHL ─────────────────────────────────────────────────────

function TabelaPortes() {
  const DHL_TABELA: [number, number][] = [
    [1, 3.65], [3, 3.78], [5, 3.78], [10, 4.37], [20, 4.88],
    [30, 5.20], [40, 6.22], [50, 7.59], [60, 9.08], [70, 10.59],
    [80, 12.11], [90, 13.62], [100, 15.13], [125, 18.51], [150, 22.22],
    [175, 25.92], [200, 29.62], [225, 33.33], [250, 37.03],
  ];
  const MARGEM = 0.15;

  const { data: configs = [] } = useQuery({
    queryKey: ["shipping_config"],
    queryFn: async () => {
      const { data } = await supabase.from("shipping_config").select("*").eq("ativo", true).order("fornecedor");
      return data ?? [];
    },
  });

  return (
    <div className="space-y-4">
      {/* Portes por fornecedor */}
      {configs.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Por fornecedor</p>
          <div className="space-y-1">
            {configs.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                <span className="capitalize font-medium">{c.fornecedor}</span>
                <div className="text-right text-xs text-muted-foreground">
                  <span>1ª un: {Number(c.preco_primeira_unidade ?? 0).toFixed(2)}€</span>
                  <span className="ml-2">+un: {Number(c.preco_unidade_adicional ?? 0).toFixed(2)}€</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabela DHL por peso */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          DHL por peso (Portugal Continental) — margem 15%
        </p>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Até (kg)</th>
                <th className="text-right px-3 py-2 font-medium">Custo s/IVA</th>
                <th className="text-right px-3 py-2 font-medium">Cobrado s/IVA</th>
                <th className="text-right px-3 py-2 font-medium">c/IVA</th>
              </tr>
            </thead>
            <tbody>
              {DHL_TABELA.map(([peso, custo]) => {
                const cobrado = custo * (1 + MARGEM);
                const comIva = cobrado * 1.23;
                return (
                  <tr key={peso} className="border-t border-border">
                    <td className="px-3 py-1.5 font-mono">{peso} kg</td>
                    <td className="px-3 py-1.5 text-right text-muted-foreground">{custo.toFixed(2)}€</td>
                    <td className="px-3 py-1.5 text-right">{cobrado.toFixed(2)}€</td>
                    <td className="px-3 py-1.5 text-right font-semibold text-primary">{comIva.toFixed(2)}€</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Pesquisa de produto (modal interno) ─────────────────────────────────────

function ProductSearchModal({ open, onClose, onSelect }: {
  open: boolean;
  onClose: () => void;
  onSelect: (p: any) => void;
}) {
  const [q, setQ] = useState("");
  const { data: results = [], isLoading } = useQuery({
    queryKey: ["gestao-product-search", q],
    enabled: q.length > 2,
    queryFn: async () => {
      const { data } = await supabase.from("products")
        .select("id,name,sku,price,image_url,stock_status,taxa_iva")
        .eq("include_in_catalog", true)
        .or(`name.ilike.%${q}%,sku.ilike.%${q}%`)
        .limit(20);
      let rows = (data ?? []) as any[];
      if (rows.length) {
        const { data: pricing } = await (supabase as any).rpc("get_products_internal_pricing", { p_ids: rows.map(r => r.id) });
        const map = new Map<string, any>();
        for (const row of (pricing ?? []) as any[]) map.set(row.id, row);
        rows = rows.map(r => ({ ...r, ...(map.get(r.id) ?? {}) }));
      }
      return rows;
    },
    staleTime: 30_000,
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Pesquisar produto</DialogTitle>
        </DialogHeader>
        <Input autoFocus value={q} onChange={e => setQ(e.target.value)}
          placeholder="Nome ou referência (mín. 3 letras)..." className="shrink-0" />
        <div className="overflow-y-auto flex-1 space-y-1 mt-2">
          {isLoading && <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>}
          {!isLoading && q.length > 2 && results.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum produto encontrado.</p>
          )}
          {results.map((p: any) => {
            const iva = (Number(p.taxa_iva) || 23) / 100;
            const priceVat = p.price ? Number(p.price) * (1 + iva) : null;
            return (
              <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer border border-transparent hover:border-border"
                onClick={() => { onSelect(p); onClose(); setQ(""); }}>
                {p.image_url
                  ? <img src={p.image_url} alt="" className="h-10 w-10 object-cover rounded bg-muted shrink-0" />
                  : <div className="h-10 w-10 bg-muted rounded flex items-center justify-center shrink-0"><Package className="h-4 w-4 text-muted-foreground" /></div>
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.sku && <span className="font-mono mr-2">REF: {p.sku}</span>}
                    {p.fornecedor && <span className="mr-2">{p.fornecedor}</span>}
                    {p.stock_status === "on_request" && <span className="text-amber-600">⚠ Por encomenda</span>}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {priceVat && <p className="text-sm font-bold">{priceVat.toFixed(2).replace(".",",")} €</p>}
                  {p.purchase_price && <p className="text-[10px] text-amber-600">Custo: {Number(p.purchase_price).toFixed(2)}€</p>}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Novo Orçamento (criação do zero) ────────────────────────────────────────

function NovoOrcamento() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [productSearch, setProductSearch] = useState(false);
  const [lines, setLines] = useState<any[]>([]);
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "", company: "", tax_id: "", address: "" });
  const [notes, setNotes] = useState("");
  const [prazoEntrega, setPrazoEntrega] = useState("");
  const [shippingTotal, setShippingTotal] = useState("");
  const [validade, setValidade] = useState("30 dias");

  const addProduct = (p: any) => {
    const iva = (Number(p.taxa_iva) || 23) / 100;
    const unitPrice = p.price ? Number(p.price) * (1 + iva) : 0;
    setLines(prev => [...prev, {
      id: `line-${Date.now()}`,
      product_id: p.id,
      product_name_snapshot: p.name,
      product_sku_snapshot: p.sku ?? "",
      product_image_snapshot: p.image_url ?? null,
      quantity: 1,
      unit_price: unitPrice.toFixed(2),
      purchase_price: p.purchase_price,
    }]);
  };

  const updateLine = (id: string, field: string, value: any) =>
    setLines(p => p.map(l => l.id === id ? { ...l, [field]: value } : l));

  const removeLine = (id: string) =>
    setLines(p => p.filter(l => l.id !== id));

  const subtotal = lines.reduce((s, l) => s + (parseFloat(l.unit_price) || 0) * (parseInt(l.quantity) || 0), 0);
  const shipping = parseFloat(shippingTotal.replace(",", ".")) || 0;
  const total = subtotal + shipping;
  const subtotalSIva = total / 1.23;
  const ivaValor = total - subtotalSIva;

  const handleSave = async () => {
    if (!customer.name.trim() || !customer.email.trim()) {
      toast.error("Nome e email do cliente são obrigatórios.");
      return;
    }
    setSaving(true);
    try {
      const { data: quote, error: qErr } = await supabase.from("quotes").insert({
        status: "sent" as any,
        customer_name: customer.name.trim(),
        customer_email: customer.email.trim(),
        customer_phone: customer.phone.trim() || null,
        customer_company: customer.company.trim() || null,
        customer_tax_id: customer.tax_id.trim() || null,
        shipping_address: customer.address.trim() || null,
        notes: notes.trim() || null,
        total: total > 0 ? total : null,
        shipping_total: shipping > 0 ? shipping : null,
        prazo_entrega: prazoEntrega.trim() || null,
      } as any).select("id").single();
      if (qErr) throw qErr;

      if (lines.length > 0) {
        const rows = lines.map(l => ({
          quote_id: quote.id,
          product_id: l.product_id ?? null,
          product_name_snapshot: l.product_name_snapshot,
          product_sku_snapshot: l.product_sku_snapshot || null,
          product_image_snapshot: l.product_image_snapshot ?? null,
          quantity: parseInt(l.quantity) || 1,
          unit_price: parseFloat(l.unit_price) || 0,
          line_total: (parseFloat(l.unit_price) || 0) * (parseInt(l.quantity) || 1),
        }));
        const { error: iErr } = await supabase.from("quote_items").insert(rows);
        if (iErr) throw iErr;
      }

      qc.invalidateQueries({ queryKey: ["gestao-quotes"] });
      toast.success("Orçamento criado e enviado ao cliente.");
      navigate(`/gestao/orcamentos/${quote.id}`);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao criar orçamento.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/gestao/orcamentos")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <h1 className="font-heading text-xl font-bold">Novo Orçamento</h1>
      </div>

      <div className="grid md:grid-cols-[1fr_280px] gap-4 items-start">
        <div className="space-y-4">

          {/* Dados do cliente */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Dados do cliente</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Nome *</Label>
                  <Input value={customer.name} onChange={e => setCustomer(p => ({...p, name: e.target.value}))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Email *</Label>
                  <Input type="email" value={customer.email} onChange={e => setCustomer(p => ({...p, email: e.target.value}))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Telefone</Label>
                  <Input value={customer.phone} onChange={e => setCustomer(p => ({...p, phone: e.target.value}))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Empresa</Label>
                  <Input value={customer.company} onChange={e => setCustomer(p => ({...p, company: e.target.value}))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">NIF</Label>
                  <Input value={customer.tax_id} onChange={e => setCustomer(p => ({...p, tax_id: e.target.value}))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Morada de entrega</Label>
                  <Input value={customer.address} onChange={e => setCustomer(p => ({...p, address: e.target.value}))} /></div>
              </div>
            </CardContent>
          </Card>

          {/* Produtos */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Produtos / Linhas</span>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs"
                    onClick={() => setProductSearch(true)}>
                    <Search className="h-3.5 w-3.5" /> Pesquisar
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs"
                    onClick={() => setLines(p => [...p, { id: `custom-${Date.now()}`, product_id: null, product_name_snapshot: "", product_sku_snapshot: "", product_image_snapshot: null, quantity: 1, unit_price: "", purchase_price: null }])}>
                    <Plus className="h-3.5 w-3.5" /> Linha manual
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lines.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  Adicione produtos ou linhas manuais
                </div>
              ) : (
                <div className="space-y-3 divide-y divide-border">
                  {lines.map(l => (
                    <div key={l.id} className="pt-3 first:pt-0 space-y-2">
                      <div className="flex items-center gap-2">
                        {l.product_image_snapshot && <img src={l.product_image_snapshot} alt="" className="h-8 w-8 object-cover rounded shrink-0" />}
                        <Input value={l.product_name_snapshot}
                          onChange={e => updateLine(l.id, "product_name_snapshot", e.target.value)}
                          placeholder="Descrição do produto/serviço" className="h-8 text-sm flex-1" />
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive shrink-0"
                          onClick={() => removeLine(l.id)}><X className="h-4 w-4" /></Button>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <div><Label className="text-[10px]">REF/SKU</Label>
                          <Input value={l.product_sku_snapshot} onChange={e => updateLine(l.id, "product_sku_snapshot", e.target.value)} className="h-7 text-xs font-mono" /></div>
                        <div><Label className="text-[10px]">Qtd</Label>
                          <Input type="number" min={1} value={l.quantity} onChange={e => updateLine(l.id, "quantity", e.target.value)} className="h-7 text-xs" /></div>
                        <div><Label className="text-[10px]">Preço c/IVA (€)</Label>
                          <Input value={l.unit_price} onChange={e => updateLine(l.id, "unit_price", e.target.value)} className="h-7 text-xs" placeholder="0.00" /></div>
                        <div><Label className="text-[10px]">Total</Label>
                          <Input readOnly className="h-7 text-xs bg-muted/30"
                            value={((parseFloat(l.unit_price)||0)*(parseInt(l.quantity)||0)).toFixed(2)} /></div>
                      </div>
                      {l.purchase_price && (
                        <p className="text-[10px] text-amber-600">Custo: {Number(l.purchase_price).toFixed(2)}€</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {lines.length > 0 && (
                <>
                  <Separator className="my-3" />
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal s/ IVA</span><span>{subtotalSIva.toFixed(2).replace(".",",")} €</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>IVA (23%)</span><span>{ivaValor.toFixed(2).replace(".",",")} €</span>
                    </div>
                    {shipping > 0 && <div className="flex justify-between text-muted-foreground">
                      <span>Portes</span><span>{shipping.toFixed(2).replace(".",",")} €</span>
                    </div>}
                    <div className="flex justify-between font-bold border-t pt-1 text-base">
                      <span>Total c/ IVA</span><span className="text-primary">{total.toFixed(2).replace(".",",")} €</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Notas */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Notas para o cliente</CardTitle></CardHeader>
            <CardContent>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                placeholder="Condições, observações..." />
            </CardContent>
          </Card>
        </div>

        {/* Painel lateral */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Proposta</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Portes c/ IVA (€)</Label>
                <Input value={shippingTotal} onChange={e => setShippingTotal(e.target.value)} placeholder="0.00" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Prazo de entrega</Label>
                <Input value={prazoEntrega} onChange={e => setPrazoEntrega(e.target.value)} placeholder="3-5 dias úteis" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Validade</Label>
                <Input value={validade} onChange={e => setValidade(e.target.value)} placeholder="30 dias" className="h-9" />
              </div>
            </CardContent>
          </Card>
          <Button className="w-full gap-2" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            <Send className="h-4 w-4" /> Criar e enviar ao cliente
          </Button>
        </div>
      </div>

      <ProductSearchModal open={productSearch} onClose={() => setProductSearch(false)} onSelect={addProduct} />
    </div>
  );
}

// ─── Router ───────────────────────────────────────────────────────────────────

export default function GestaoOrcamentos() {
  return (
    <Routes>
      <Route index element={<OrcamentosList />} />
      <Route path="novo" element={<NovoOrcamento />} />
      <Route path=":id" element={<OrcamentoDetalhe />} />
    </Routes>
  );
}
