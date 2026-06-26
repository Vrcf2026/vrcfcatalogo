import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText, Wrench, UserCog, ArrowRight,
  AlertTriangle, CheckCircle2, Clock, ShoppingCart,
} from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente", sent: "Enviado", in_review: "Em análise",
  accepted: "Aceite", rejected: "Rejeitado", cancelled: "Cancelado", completed: "Concluído",
};

const STATUS_COLOR: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-800",
  sent:      "bg-blue-100 text-blue-800",
  in_review: "bg-purple-100 text-purple-800",
  accepted:  "bg-emerald-100 text-emerald-800",
  rejected:  "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-600",
  completed: "bg-emerald-100 text-emerald-800",
};

export default function ContaDashboard() {
  const { user } = useAuth();

  const { data: quotes } = useQuery({
    queryKey: ["conta-quotes-dash", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("quotes")
        .select("id, quote_number, status, total, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const { data: rmaCount } = useQuery({
    queryKey: ["conta-rma-count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await supabase
        .from("rma_requests")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id);
      return count ?? 0;
    },
  });

  const pendingDecision = quotes?.filter(q => q.status === "sent") ?? [];
  const recentQuote     = quotes?.[0];
  const totalQuotes     = quotes?.length ?? 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-xl font-bold">A minha conta</h1>
        <p className="text-muted-foreground text-sm">{user?.email}</p>
      </div>

      {/* Alertas — orçamentos a aguardar resposta */}
      {pendingDecision.length > 0 && (
        <div className="space-y-2">
          {pendingDecision.map(q => (
            <Card key={q.id} className="border-blue-200 bg-blue-50/60 dark:bg-blue-950/20 dark:border-blue-900/40">
              <CardContent className="py-3 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-blue-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    Orçamento <span className="font-mono">{q.quote_number}</span> aguarda a tua resposta
                  </p>
                  <p className="text-xs text-muted-foreground">Aceita ou rejeita para continuarmos.</p>
                </div>
                <Button size="sm" asChild className="shrink-0">
                  <Link to={`/conta/orcamentos/${q.id}`}>
                    Ver <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <FileText className="h-5 w-5 text-primary mx-auto mb-1" />
            <div className="text-2xl font-bold">{totalQuotes}</div>
            <p className="text-xs text-muted-foreground">Orçamentos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <Wrench className="h-5 w-5 text-primary mx-auto mb-1" />
            <div className="text-2xl font-bold">{rmaCount ?? "-"}</div>
            <p className="text-xs text-muted-foreground">RMAs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
            <div className="text-2xl font-bold">
              {quotes?.filter(q => q.status === "completed" || q.status === "accepted").length ?? "-"}
            </div>
            <p className="text-xs text-muted-foreground">Concluídos</p>
          </CardContent>
        </Card>
      </div>

      {/* Último orçamento */}
      {recentQuote && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-muted-foreground" /> Último orçamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-semibold">{recentQuote.quote_number}</span>
              <Badge className={`text-[10px] ${STATUS_COLOR[recentQuote.status] ?? ""}`}>
                {STATUS_LABEL[recentQuote.status] ?? recentQuote.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{new Date(recentQuote.created_at).toLocaleDateString("pt-PT")}</span>
              {recentQuote.total && Number(recentQuote.total) > 0 && (
                <span className="font-semibold text-foreground">
                  {Number(recentQuote.total).toFixed(2).replace(".", ",")} €
                </span>
              )}
            </div>
            <Button variant="outline" size="sm" asChild className="w-full gap-1 mt-1">
              <Link to={`/conta/orcamentos/${recentQuote.id}`}>
                Ver detalhes <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Orçamentos recentes */}
      {quotes && quotes.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Orçamentos recentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quotes.slice(1, 4).map(q => (
              <Link key={q.id} to={`/conta/orcamentos/${q.id}`}
                className="flex items-center justify-between py-1.5 border-b border-border last:border-0 hover:text-primary transition-colors">
                <div>
                  <span className="font-mono text-xs font-medium">{q.quote_number}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {new Date(q.created_at).toLocaleDateString("pt-PT")}
                  </span>
                </div>
                <Badge className={`text-[10px] ${STATUS_COLOR[q.status] ?? ""}`}>
                  {STATUS_LABEL[q.status] ?? q.status}
                </Badge>
              </Link>
            ))}
            <Button variant="link" size="sm" asChild className="px-0 h-auto">
              <Link to="/conta/orcamentos">Ver todos <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Ações rápidas */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" asChild className="h-auto py-3 flex-col gap-1">
          <Link to="/conta/rma">
            <Wrench className="h-4 w-4 text-primary" />
            <span className="text-xs">Abrir RMA</span>
          </Link>
        </Button>
        <Button variant="outline" asChild className="h-auto py-3 flex-col gap-1">
          <Link to="/">
            <ShoppingCart className="h-4 w-4 text-primary" />
            <span className="text-xs">Novo orçamento</span>
          </Link>
        </Button>
        <Button variant="outline" asChild className="h-auto py-3 flex-col gap-1 col-span-2">
          <Link to="/conta/dados">
            <UserCog className="h-4 w-4 text-primary" />
            <span className="text-xs">Editar dados</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
