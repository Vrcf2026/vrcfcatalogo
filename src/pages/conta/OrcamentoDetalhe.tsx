import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/contexts/CartContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Repeat2, Loader2, Download, Mail } from "lucide-react";
import { toast } from "sonner";
import { generateQuotePdf } from "@/lib/quotePdf";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente", sent: "Enviado", in_review: "Em análise",
  accepted: "Aceite", rejected: "Rejeitado", cancelled: "Cancelado", completed: "Concluído",
};


export default function OrcamentoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { addItem, clearCart, setIsOpen } = useCart();
  const navigate = useNavigate();
  const [resending, setResending] = useState(false);


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

  if (isLoading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (!data?.quote) {
    return (
      <Card><CardContent className="py-10 text-center text-muted-foreground">Orçamento não encontrado.</CardContent></Card>
    );
  }

  const { quote, items } = data;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/conta/orcamentos"><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Link>
      </Button>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="font-mono">{quote.quote_number}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(quote.created_at).toLocaleString("pt-PT")}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge>{STATUS_LABEL[quote.status] ?? quote.status}</Badge>
            <div className="flex flex-wrap gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => generateQuotePdf(quote, items)} className="gap-1">
                <Download className="h-4 w-4" />PDF
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={resending || !quote.customer_email}
                title={!quote.customer_email ? "Sem email associado ao orçamento" : "Reenviar cópia para o teu email"}
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
                        name: it.product_name_snapshot,
                        category: null,
                        quantity: it.quantity,
                        price: it.unit_price != null ? Number(it.unit_price) : null,
                      })),
                    },
                  });
                  setResending(false);
                  if (error) {
                    toast.error("Não foi possível reenviar. Tenta novamente.");
                    return;
                  }
                  toast.success("Orçamento reenviado por email.");
                }}
                className="gap-1"
              >
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
                  <div className="text-xs text-muted-foreground">{it.quantity}x</div>
                </div>
                {it.line_total != null && Number(it.line_total) > 0 && (
                  <div className="text-sm font-semibold">{Number(it.line_total).toFixed(2).replace(".", ",")} €</div>
                )}
              </div>
            ))}
          </div>

          {Number(quote.total) > 0 && (
            <div className="flex justify-between pt-2 border-t border-border font-semibold">
              <span>Total</span>
              <span>{Number(quote.total).toFixed(2).replace(".", ",")} €</span>
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
