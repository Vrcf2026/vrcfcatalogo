import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, Send, Truck, FileText, Eye, Search,
  Plus, Package,
} from "lucide-react";
import { STATUS_OPTIONS, URGENCIA } from "./constants";
import { quoteStatusClass } from "@/lib/statusColors";
import { GestorProductList } from "./GestorProductList";
import { TabelaPortes } from "./TabelaPortes";

export function OrcamentosList() {
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
                    <span className={quoteStatusClass(q.status)}>
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
                    <span className="status-badge status-badge-accepted">✓ Cliente aceitou</span>
                  )}
                  {q.status === "rejected" && (
                    <span className="status-badge status-badge-rejected">✗ Cliente rejeitou</span>
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
