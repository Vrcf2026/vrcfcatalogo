import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Wrench, Users, ArrowRight, Clock } from "lucide-react";

export default function GestaoDashboard() {
  const { data: stats } = useQuery({
    queryKey: ["gestao-stats"],
    queryFn: async () => {
      const [quotes, rmas, clients, pendingQuotes, pendingRmas] = await Promise.all([
        supabase.from("quotes").select("id", { count: "exact", head: true }),
        supabase.from("rma_requests").select("id", { count: "exact", head: true }),
        supabase.from("customer_profiles").select("id", { count: "exact", head: true }),
        supabase.from("quotes").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("rma_requests").select("id", { count: "exact", head: true }).eq("status", "submitted"),
      ]);
      return {
        quotes: quotes.count ?? 0,
        rmas: rmas.count ?? 0,
        clients: clients.count ?? 0,
        pendingQuotes: pendingQuotes.count ?? 0,
        pendingRmas: pendingRmas.count ?? 0,
      };
    },
    staleTime: 60 * 1000,
  });

  // Orçamentos recentes (últimos 5)
  const { data: recentQuotes } = useQuery({
    queryKey: ["gestao-recent-quotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("id,quote_number,status,total,created_at,customer_profiles(full_name,company)")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60 * 1000,
  });

  const STATUS_LABEL: Record<string, string> = {
    pending: "Pendente", sent: "Enviado", in_review: "Em análise",
    accepted: "Aceite", rejected: "Rejeitado", cancelled: "Cancelado", completed: "Concluído",
  };
  const STATUS_COLOR: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    sent: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    in_review: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    accepted: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    cancelled: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Resumo</h1>
        <p className="text-muted-foreground text-sm">Visão geral da actividade comercial</p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Orçamentos</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.quotes ?? "—"}</div>
            {(stats?.pendingQuotes ?? 0) > 0 && (
              <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                <Clock className="h-3 w-3" /> {stats?.pendingQuotes} pendente{stats?.pendingQuotes !== 1 ? "s" : ""}
              </p>
            )}
            <Button variant="link" size="sm" asChild className="px-0 h-auto mt-1">
              <Link to="/gestao/orcamentos">Ver todos <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">RMAs</CardTitle>
            <Wrench className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.rmas ?? "—"}</div>
            {(stats?.pendingRmas ?? 0) > 0 && (
              <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                <Clock className="h-3 w-3" /> {stats?.pendingRmas} por analisar
              </p>
            )}
            <Button variant="link" size="sm" asChild className="px-0 h-auto mt-1">
              <Link to="/gestao/rma">Ver todos <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.clients ?? "—"}</div>
            <Button variant="link" size="sm" asChild className="px-0 h-auto mt-1">
              <Link to="/gestao/clientes">Ver todos <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Orçamentos recentes */}
      {recentQuotes && recentQuotes.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Orçamentos Recentes</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/gestao/orcamentos">Ver todos</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {recentQuotes.map((q: any) => (
                <div key={q.id} className="flex items-center justify-between px-6 py-3 hover:bg-secondary/30 transition-colors">
                  <div>
                    <span className="font-mono text-sm font-semibold">{q.quote_number}</span>
                    <p className="text-xs text-muted-foreground">
                      {q.customer_profiles?.company || q.customer_profiles?.full_name || "Cliente"}
                      {" · "}
                      {new Date(q.created_at).toLocaleDateString("pt-PT", { dateStyle: "medium" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {q.total > 0 && (
                      <span className="text-sm font-semibold">
                        {Number(q.total).toFixed(2).replace(".", ",")} €
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[q.status] ?? ""}`}>
                      {STATUS_LABEL[q.status] ?? q.status}
                    </span>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/gestao/orcamentos/${q.id}`}>Ver</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
