import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Eye, Loader2 } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  sent: "Enviado",
  in_review: "Em análise",
  accepted: "Aceite",
  rejected: "Rejeitado",
  cancelled: "Cancelado",
  completed: "Concluído",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "secondary",
  sent: "default",
  in_review: "default",
  accepted: "default",
  rejected: "destructive",
  cancelled: "outline",
  completed: "default",
};

export default function ContaOrcamentos() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["conta-quotes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("id,quote_number,status,total,created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-bold">Histórico de Orçamentos</h1>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Ainda não tem orçamentos.</p>
            <Button asChild className="mt-4"><Link to="/">Ver catálogo</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.map((q) => (
            <Card key={q.id} className="hover:bg-secondary/30 transition-colors">
              <CardContent className="py-3 flex flex-wrap items-center gap-3 justify-between">
                <div>
                  <div className="font-mono text-sm font-semibold">{q.quote_number}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(q.created_at).toLocaleDateString("pt-PT", { dateStyle: "medium" })}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {q.total != null && Number(q.total) > 0 && (
                    <span className="text-sm font-semibold">{Number(q.total).toFixed(2).replace(".", ",")} €</span>
                  )}
                  <Badge variant={STATUS_VARIANT[q.status] ?? "default"}>{STATUS_LABEL[q.status] ?? q.status}</Badge>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/conta/orcamentos/${q.id}`}><Eye className="h-4 w-4 mr-1" />Ver</Link>
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
