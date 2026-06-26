import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Eye, Loader2, AlertTriangle, ArrowRight } from "lucide-react";

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

export default function ContaOrcamentos() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["conta-quotes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("id,quote_number,status,total,created_at,shipping_total,notes")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const pendingDecision = data?.filter(q => q.status === "sent") ?? [];

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-bold">Os meus orçamentos</h1>

      {pendingDecision.length > 0 && (
        <div className="space-y-2">
          {pendingDecision.map(q => (
            <Card key={q.id} className="border-blue-200 bg-blue-50/60 dark:bg-blue-950/20">
              <CardContent className="py-3 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-blue-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">
                    Orçamento <span className="font-mono">{q.quote_number}</span> aguarda a tua resposta
                  </p>
                  <p className="text-xs text-muted-foreground">Aceita ou rejeita para prosseguirmos.</p>
                </div>
                <Button size="sm" asChild className="shrink-0">
                  <Link to={`/conta/orcamentos/${q.id}`}>
                    Responder <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : !data?.length ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Ainda não tem orçamentos.</p>
            <Button asChild className="mt-4"><Link to="/">Ver catálogo</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.map(q => {
            const needsAction = q.status === "sent";
            return (
              <Link key={q.id} to={`/conta/orcamentos/${q.id}`}>
                <Card className={`transition-all hover:shadow-md ${needsAction ? "border-blue-200 ring-1 ring-blue-200/50" : "hover:border-primary/30"}`}>
                  <CardContent className="py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-semibold">{q.quote_number}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[q.status] ?? ""}`}>
                          {STATUS_LABEL[q.status] ?? q.status}
                        </span>
                        {needsAction && (
                          <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-0.5">
                            <AlertTriangle className="h-3 w-3" /> Aguarda resposta
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {new Date(q.created_at).toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" })}
                        {q.notes && <span className="ml-2 truncate max-w-[180px] inline-block align-bottom">· {q.notes}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {q.total != null && Number(q.total) > 0 ? (
                        <>
                          <p className="text-sm font-bold">{Number(q.total).toFixed(2).replace(".", ",")} €</p>
                          {q.shipping_total != null && Number(q.shipping_total) > 0 && (
                            <p className="text-[10px] text-muted-foreground">incl. {Number(q.shipping_total).toFixed(2).replace(".", ",")}€ portes</p>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">A orçamentar</p>
                      )}
                    </div>
                    <Eye className="h-4 w-4 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
