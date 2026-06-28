import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/contexts/CartContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Repeat2, Loader2, Download, Mail, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { generateQuotePdf } from "@/lib/quotePdf";

const STATUS_LABEL: Record<string, string> = {
  pending:        "Pedido recebido",
  in_review:      "A preparar orçamento",
  sent:           "Orçamento enviado",
  accepted:       "Aceite",
  paid:           "Pago",
  in_preparation: "Em preparação",
  shipped:        "Expedido",
  completed:      "Concluído",
  rejected:       "Rejeitado",
  cancelled:      "Cancelado",
};

// Mensagem contextual por estado — o que o cliente precisa de saber
const STATUS_INFO: Record<string, { msg: string; color: string }> = {
  pending:        { msg: "O seu pedido foi recebido. Estamos a preparar o orçamento.", color: "bg-amber-50 border-amber-200 text-amber-800" },
  in_review:      { msg: "Estamos a analisar o seu pedido e a preparar o orçamento. Receberá um email quando estiver pronto.", color: "bg-purple-50 border-purple-200 text-purple-800" },
  accepted:       { msg: "Orçamento aceite. Aguarde contacto para confirmação do pagamento.", color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
  paid:           { msg: "Pagamento recebido. O pedido vai ser processado em breve.", color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
  in_preparation: { msg: "O seu pedido está em preparação.", color: "bg-cyan-50 border-cyan-200 text-cyan-800" },
  shipped:        { msg: "O seu pedido foi expedido.", color: "bg-indigo-50 border-indigo-200 text-indigo-800" },
  completed:      { msg: "Pedido concluído. Obrigado pela preferência!", color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
  rejected:       { msg: "Orçamento rejeitado.", color: "bg-red-50 border-red-200 text-red-800" },
};

const STATUS_COLOR: Record<string, string> = {
  pending:        "bg-amber-100 text-amber-800 border-amber-200",
  in_review:      "bg-purple-100 text-purple-800 border-purple-200",
  sent:           "bg-blue-100 text-blue-800 border-blue-200",
  accepted:       "bg-emerald-100 text-emerald-800 border-emerald-200",
  paid:           "bg-emerald-100 text-emerald-800 border-emerald-200",
  in_preparation: "bg-cyan-100 text-cyan-800 border-cyan-200",
  shipped:        "bg-indigo-100 text-indigo-800 border-indigo-200",
  completed:      "bg-gray-100 text-gray-700 border-gray-200",
  rejected:       "bg-red-100 text-red-800 border-red-200",
  cancelled:      "bg-gray-100 text-gray-600 border-gray-200",
};

export default function OrcamentoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { addItem, clearCart, setIsOpen } = useCart();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [resending, setResending] = useState(false);
  const [deciding, setDeciding] = useState<"accepted" | "rejected" | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["quote-detail", id, user?.id],
    enabled: !!id && !!user,
    queryFn: async () => {
      const [q, items] = await Promise.all([
        supabase.from("quotes").select("*").eq("id", id!).eq("user_id", user!.id).maybeSingle(),
        supabase.from("quote_items").select("*").eq("quote_id", id!),
      ]);
      if (q.error) throw q.error;
      if (items.error) throw items.error;
      return { quote: q.data, items: items.data ?? [] };
    },
  });

  const handleDecision = async (decision: "accepted" | "rejected") => {
    if (!data?.quote) return;
    setDeciding(decision);
    try {
      const updateData: any = {
        status: decision,
        decided_at: new Date().toISOString(),
      };
      if (decision === "rejected" && rejectReason.trim()) {
        updateData.rejection_reason = rejectReason.trim();
      }
      const { error } = await supabase
        .from("quotes")
        .update(updateData)
        .eq("id", data.quote.id)
        .eq("user_id", user!.id);
      if (error) throw error;

      await supabase.functions.invoke("send-quote-status-update", {
        body: {
          quoteId: data.quote.id,
          newStatus: decision,
          triggeredBy: "customer",
          rejectionReason: rejectReason.trim() || undefined,
        },
      });

      queryClient.invalidateQueries({ queryKey: ["quote-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["conta-quotes"] });
      toast.success(
        decision === "accepted"
          ? "Orçamento aceite! Entraremos em contacto brevemente."
          : "Orçamento rejeitado. Obrigado pelo feedback."
      );
      setShowRejectForm(false);
      setRejectReason("");
    } catch {
      toast.error("Não foi possível registar a decisão. Tenta novamente.");
    } finally {
      setDeciding(null);
    }
  };

  const handleRepeat = () => {
    if (!data?.items.length) return;
    clearCart();
    data.items.forEach((it) => {
      addItem({
        id: it.product_id ?? it.id,
        name: it.product_name_snapshot,
        price: it.unit_price ? Number(it.unit_price) : null,
        imageUrl: it.product_image_snapshot,
        category: null,
      }, it.quantity);
    });
    toast.success("Itens adicionados ao carrinho.");
    setIsOpen(true);
    navigate("/");
  };

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!data?.quote) return <Card><CardContent className="py-10 text-center text-muted-foreground">Orçamento não encontrado.</CardContent></Card>;

  const { quote, items } = data;
  const canDecide = quote.status === "sent";
  const hasShipping = quote.shipping_total != null && Number(quote.shipping_total) > 0;
  const subtotal = Number(quote.total) - (hasShipping ? Number(quote.shipping_total) : 0);

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/conta/orcamentos"><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Link>
      </Button>

      {/* Bloco informativo para estados de espera */}
      {["pending", "in_review"].includes(quote?.status ?? "") && STATUS_INFO[quote?.status ?? ""] && (
        <Card className={`border ${STATUS_INFO[quote!.status].color}`}>
          <CardContent className="py-3 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-current/10 flex items-center justify-center shrink-0">
              <Loader2 className="h-4 w-4 animate-spin opacity-60" />
            </div>
            <div>
              <p className="text-sm font-semibold">{STATUS_LABEL[quote!.status]}</p>
              <p className="text-xs opacity-80 mt-0.5">{STATUS_INFO[quote!.status].msg}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bloco de decisão — só quando gestor enviou orçamento */}
      {canDecide && !showRejectForm && (
        <Card className="border-blue-200 bg-blue-50/60 dark:bg-blue-950/20 dark:border-blue-900/40">
          <CardContent className="py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-blue-600" />
                Orçamento aguarda a tua resposta
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Aceita para confirmar a encomenda ou rejeita se não pretenderes avançar.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={() => setShowRejectForm(true)}
                className="gap-1.5 border-red-200 text-red-700 hover:bg-red-50">
                <XCircle className="h-4 w-4" /> Rejeitar
              </Button>
              <Button size="sm" onClick={() => handleDecision("accepted")} disabled={deciding === "accepted"}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                {deciding === "accepted" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Aceitar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulário de rejeição */}
      {canDecide && showRejectForm && (
        <Card className="border-red-200 bg-red-50/60 dark:bg-red-950/20 dark:border-red-900/40">
          <CardContent className="py-4 space-y-3">
            <p className="text-sm font-semibold text-red-700 flex items-center gap-1.5">
              <XCircle className="h-4 w-4" /> Rejeitar orçamento
            </p>
            <Textarea
              placeholder="Motivo da rejeição (opcional) — ex: preço elevado, prazo longo..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="resize-none text-sm" rows={3}
            />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setShowRejectForm(false); setRejectReason(""); }}>
                Cancelar
              </Button>
              <Button size="sm" variant="destructive" onClick={() => handleDecision("rejected")}
                disabled={deciding === "rejected"} className="gap-1.5">
                {deciding === "rejected" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                Confirmar rejeição
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="font-mono">{quote.quote_number}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{new Date(quote.created_at).toLocaleString("pt-PT")}</p>
            {(quote as any).decided_at && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {quote.status === "accepted" ? "Aceite" : "Rejeitado"} em{" "}
                {new Date((quote as any).decided_at).toLocaleString("pt-PT")}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className={STATUS_COLOR[quote.status] ?? ""}>{STATUS_LABEL[quote.status] ?? quote.status}</Badge>
            <div className="flex flex-wrap gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => generateQuotePdf(quote, items)} className="gap-1">
                <Download className="h-4 w-4" />PDF
              </Button>
              <Button size="sm" variant="outline" disabled={resending || !quote.customer_email}
                onClick={async () => {
                  if (!quote.customer_email) return;
                  setResending(true);
                  const { error } = await supabase.functions.invoke("send-quote-request", {
                    body: {
                      customerName: quote.customer_name ?? "",
                      customerEmail: quote.customer_email,
                      customerPhone: quote.customer_phone ?? "",
                      notes: `[Reenvio do orçamento ${quote.quote_number}] ${quote.notes ?? ""}`.trim(),
                      sendCopyToCustomer: true,
                      items: items.map((it: any) => ({
                        name: it.product_name_snapshot, category: null,
                        quantity: it.quantity, price: it.unit_price != null ? Number(it.unit_price) : null,
                      })),
                    },
                  });
                  setResending(false);
                  if (error) { toast.error("Não foi possível reenviar."); return; }
                  toast.success("Orçamento reenviado por email.");
                }} className="gap-1">
                {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Reenviar
              </Button>
              <Button size="sm" onClick={handleRepeat} className="gap-1">
                <Repeat2 className="h-4 w-4" />Repetir
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            {items.map((it) => (
              <div key={it.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                {it.product_image_snapshot && (
                  <img src={it.product_image_snapshot} alt="" className="h-12 w-12 object-cover rounded bg-secondary" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{it.product_name_snapshot}</div>
                  <div className="text-xs text-muted-foreground">{it.quantity}×</div>
                </div>
                {it.line_total != null && Number(it.line_total) > 0 && (
                  <div className="text-sm font-semibold">{Number(it.line_total).toFixed(2).replace(".", ",")} €</div>
                )}
              </div>
            ))}
          </div>

          {Number(quote.total) > 0 && (
            <div className="space-y-1 pt-2 border-t border-border">
              {hasShipping && (
                <>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Subtotal</span><span>{subtotal.toFixed(2).replace(".", ",")} €</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Portes</span><span>{Number(quote.shipping_total).toFixed(2).replace(".", ",")} €</span>
                  </div>
                </>
              )}
              <div className="flex justify-between font-semibold">
                <span>Total c/ IVA</span><span>{Number(quote.total).toFixed(2).replace(".", ",")} €</span>
              </div>
            </div>
          )}

          {/* Tracking quando expedido */}
          {quote.status === "shipped" && (quote as any).tracking_code && (
            <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 px-3 py-2">
              <p className="text-xs font-medium text-indigo-700 mb-0.5">Nº de seguimento / Tracking</p>
              <p className="text-sm font-mono text-indigo-800">{(quote as any).tracking_code}</p>
            </div>
          )}

          {/* Mensagem de estado para accepted/paid/in_preparation/shipped/completed */}
          {STATUS_INFO[quote.status] && !["pending","in_review","sent","rejected","cancelled"].includes(quote.status) && (
            <div className={`rounded-lg border px-3 py-2 ${STATUS_INFO[quote.status].color}`}>
              <p className="text-xs">{STATUS_INFO[quote.status].msg}</p>
            </div>
          )}

          {quote.status === "rejected" && (quote as any).rejection_reason && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 px-3 py-2">
              <p className="text-xs font-medium text-red-700 mb-0.5">Motivo da rejeição</p>
              <p className="text-sm text-red-800 dark:text-red-300">{(quote as any).rejection_reason}</p>
            </div>
          )}

          {quote.notes && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Observações</p>
              <p className="text-sm whitespace-pre-wrap">{quote.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}