import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Wrench, Users, ArrowRight, Clock, TrendingUp, CalendarDays } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente", sent: "Enviado", in_review: "Em análise",
  accepted: "Aceite", rejected: "Rejeitado", cancelled: "Cancelado", completed: "Concluído",
};
const STATUS_COLOR: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  sent:      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  in_review: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  accepted:  "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected:  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  cancelled: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
};

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: any; label: string; value: number | string; sub?: string; color?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <Icon className={`h-5 w-5 flex-shrink-0 ${color || "text-primary"}`} />
        <div>
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          {sub && <p className="text-xs text-amber-600 mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function GestaoDashboard() {
  const [weeks, setWeeks] = useState("12");

  // Stats gerais
  const { data: stats } = useQuery({
    queryKey: ["gestao-stats"],
    queryFn: async () => {
      const [quotes, rmas, clients, pendingQ, pendingR, acceptedQ] = await Promise.all([
        supabase.from("quotes").select("id", { count: "exact", head: true }),
        supabase.from("rma_requests").select("id", { count: "exact", head: true }),
        supabase.from("customer_profiles").select("id", { count: "exact", head: true }),
        supabase.from("quotes").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("rma_requests").select("id", { count: "exact", head: true }).eq("status", "submitted"),
        supabase.from("quotes").select("id", { count: "exact", head: true }).eq("status", "accepted"),
      ]);
      return {
        quotes: quotes.count ?? 0,
        rmas: rmas.count ?? 0,
        clients: clients.count ?? 0,
        pendingQuotes: pendingQ.count ?? 0,
        pendingRmas: pendingR.count ?? 0,
        acceptedQuotes: acceptedQ.count ?? 0,
      };
    },
    staleTime: 60 * 1000,
  });

  // Evolução temporal de orçamentos
  const { data: overtime = [] } = useQuery({
    queryKey: ["gestao-quotes-overtime", weeks],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_quotes_over_time", {
        p_weeks: parseInt(weeks),
      });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        ...r,
        total: Number(r.total),
        accepted: Number(r.accepted),
        pending: Number(r.pending),
        week: new Date(r.week).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" }),
      }));
    },
    staleTime: 60 * 1000,
  });

  // Orçamentos recentes (últimos 8)
  const { data: recentQuotes = [] } = useQuery({
    queryKey: ["gestao-recent-quotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("id,quote_number,status,total,created_at,customer_profiles(full_name,company)")
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30 * 1000,
  });

  // RMAs pendentes (urgentes)
  const { data: pendingRmas = [] } = useQuery({
    queryKey: ["gestao-pending-rmas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rma_requests")
        .select("id,rma_number,status,product_name,created_at,customer_profiles(full_name,company)")
        .in("status", ["submitted", "in_review"])
        .order("created_at", { ascending: true })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30 * 1000,
  });

  // Taxa de conversão (aceites / total)
  const conversionRate = stats?.quotes
    ? Math.round((stats.acceptedQuotes / stats.quotes) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Resumo Comercial</h1>
        <p className="text-muted-foreground text-sm">Visão geral da actividade comercial</p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={FileText} label="Total orçamentos" value={stats?.quotes ?? "—"}
          sub={stats?.pendingQuotes ? `${stats.pendingQuotes} pendente${stats.pendingQuotes !== 1 ? "s" : ""}` : undefined}
          color="text-blue-500"
        />
        <StatCard
          icon={TrendingUp} label="Aceites" value={`${conversionRate}%`}
          sub={`${stats?.acceptedQuotes ?? 0} orçamentos aceites`}
          color="text-green-500"
        />
        <StatCard
          icon={Wrench} label="Pedidos RMA" value={stats?.rmas ?? "—"}
          sub={stats?.pendingRmas ? `${stats.pendingRmas} por analisar` : undefined}
          color="text-purple-500"
        />
        <StatCard
          icon={Users} label="Clientes" value={stats?.clients ?? "—"}
          color="text-cyan-500"
        />
      </div>

      {/* Evolução temporal */}
      {overtime.length > 0 && (
        <Card className="hidden md:block">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> Evolução de orçamentos
            </CardTitle>
            <Select value={weeks} onValueChange={setWeeks}>
              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="4">4 semanas</SelectItem>
                <SelectItem value="12">12 semanas</SelectItem>
                <SelectItem value="24">24 semanas</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="flex items-end gap-2 min-w-0 h-32">
                {overtime.map((w: any) => {
                  const maxVal = Math.max(...overtime.map((x: any) => x.total), 1);
                  const heightPct = Math.max((w.total / maxVal) * 100, 4);
                  const acceptedPct = w.total > 0 ? (w.accepted / w.total) * heightPct : 0;
                  return (
                    <div key={w.week} className="flex flex-col items-center gap-1 flex-1 min-w-[28px]">
                      <span className="text-[9px] text-muted-foreground tabular-nums">{w.total}</span>
                      <div className="w-full flex flex-col justify-end h-24 relative rounded overflow-hidden bg-muted/30">
                        <div
                          className="w-full bg-primary/20 absolute bottom-0"
                          style={{ height: `${heightPct}%` }}
                        />
                        <div
                          className="w-full bg-green-500/60 absolute bottom-0"
                          style={{ height: `${acceptedPct}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-muted-foreground text-center leading-tight">{w.week}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-primary/20 inline-block" /> Total</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-green-500/60 inline-block" /> Aceites</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Orçamentos recentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Orçamentos Recentes</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/gestao/orcamentos">Ver todos <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {recentQuotes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sem orçamentos</p>
            ) : (
              <div className="divide-y divide-border">
                {recentQuotes.map((q: any) => (
                  <div key={q.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-secondary/20 transition-colors">
                    <div className="min-w-0">
                      <span className="font-mono text-xs font-semibold">{q.quote_number}</span>
                      <p className="text-xs text-muted-foreground truncate">
                        {q.customer_profiles?.company || q.customer_profiles?.full_name || "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      {q.total > 0 && (
                        <span className="text-xs font-semibold">{Number(q.total).toFixed(2).replace(".", ",")} €</span>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLOR[q.status] ?? ""}`}>
                        {STATUS_LABEL[q.status] ?? q.status}
                      </span>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
                        <Link to={`/gestao/orcamentos/${q.id}`}>Ver</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* RMAs pendentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" /> RMAs Por Tratar
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/gestao/rma">Ver todos <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {pendingRmas.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum RMA pendente 🎉</p>
            ) : (
              <div className="divide-y divide-border">
                {pendingRmas.map((r: any) => (
                  <div key={r.id} className="px-4 py-2.5 hover:bg-secondary/20 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold">{r.rma_number}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        r.status === "submitted" ? STATUS_COLOR.pending : STATUS_COLOR.in_review
                      }`}>
                        {r.status === "submitted" ? "Novo" : "Em análise"}
                      </span>
                    </div>
                    <p className="text-xs text-foreground mt-0.5 truncate">{r.product_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {r.customer_profiles?.company || r.customer_profiles?.full_name || "—"}
                      {" · "}
                      {new Date(r.created_at).toLocaleDateString("pt-PT", { dateStyle: "short" })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
