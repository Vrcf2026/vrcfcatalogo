import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Users, Search, FileText, Wrench, Mail, Phone } from "lucide-react";

export default function GestaoClientes() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["gestao-clientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_profiles")
        .select("*")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60 * 1000,
  });

  // Orçamentos + RMAs do cliente seleccionado
  const { data: clientActivity } = useQuery({
    queryKey: ["gestao-client-activity", selected?.user_id],
    enabled: !!selected?.user_id,
    queryFn: async () => {
      const [quotes, rmas] = await Promise.all([
        supabase.from("quotes")
          .select("id,quote_number,status,total,created_at")
          .eq("user_id", selected.user_id)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase.from("rma_requests")
          .select("id,rma_number,status,product_name,created_at")
          .eq("user_id", selected.user_id)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);
      return { quotes: quotes.data ?? [], rmas: rmas.data ?? [] };
    },
  });

  const filtered = (data ?? []).filter((c: any) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      c.full_name?.toLowerCase().includes(s) ||
      c.company?.toLowerCase().includes(s) ||
      c.email?.toLowerCase().includes(s) ||
      c.tax_id?.includes(s) ||
      c.phone?.includes(s)
    );
  });

  const STATUS_LABEL: Record<string, string> = {
    pending: "Pendente", sent: "Enviado", in_review: "Em análise",
    accepted: "Aceite", rejected: "Rejeitado", cancelled: "Cancelado", completed: "Concluído",
    submitted: "Submetido", approved: "Aprovado", in_repair: "Em reparação",
    shipped_back: "Devolvido",
  };

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-bold">Clientes</h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar por nome, empresa, NIF, email, telefone..."
          className="pl-9 h-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>{search ? "Nenhum cliente encontrado." : "Ainda não há clientes registados."}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((c: any) => (
            <Card key={c.id} className="hover:bg-secondary/20 transition-colors cursor-pointer" onClick={() => setSelected(c)}>
              <CardContent className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{c.full_name || "—"}</span>
                    {c.company && <span className="text-xs text-muted-foreground">· {c.company}</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                    {c.tax_id && <span>NIF: {c.tax_id}</span>}
                    {c.city && <span>{c.city}</span>}
                  </div>
                </div>
                <Button variant="ghost" size="sm">Ver</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detalhe do cliente */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.full_name || "Cliente"}</DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              {/* Contacto */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Dados de contacto</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-1">
                  {selected.company && <p><span className="text-muted-foreground">Empresa:</span> {selected.company}</p>}
                  {selected.tax_id && <p><span className="text-muted-foreground">NIF:</span> {selected.tax_id}</p>}
                  {selected.phone && (
                    <p className="flex items-center gap-2">
                      <span className="text-muted-foreground">Tel:</span> {selected.phone}
                      <a
                        href={`https://wa.me/351${selected.phone.replace(/\D/g, "")}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-xs text-green-600 hover:underline"
                      >
                        WhatsApp
                      </a>
                    </p>
                  )}
                  {selected.address_line1 && (
                    <p>
                      <span className="text-muted-foreground">Morada:</span>{" "}
                      {selected.address_line1}
                      {selected.city && `, ${selected.city}`}
                      {selected.postal_code && ` ${selected.postal_code}`}
                    </p>
                  )}
                  {selected.notes && <p><span className="text-muted-foreground">Notas:</span> {selected.notes}</p>}
                </CardContent>
              </Card>

              {/* Orçamentos */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Orçamentos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!clientActivity ? (
                    <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
                  ) : clientActivity.quotes.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sem orçamentos.</p>
                  ) : (
                    <div className="space-y-1">
                      {clientActivity.quotes.map((q: any) => (
                        <div key={q.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                          <div>
                            <span className="font-mono font-medium">{q.quote_number}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {new Date(q.created_at).toLocaleDateString("pt-PT")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {q.total > 0 && <span className="text-xs font-semibold">{Number(q.total).toFixed(2).replace(".", ",")} €</span>}
                            <span className="text-xs text-muted-foreground">{STATUS_LABEL[q.status] ?? q.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* RMAs */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Wrench className="h-4 w-4" /> RMAs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!clientActivity ? (
                    <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
                  ) : clientActivity.rmas.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sem pedidos de RMA.</p>
                  ) : (
                    <div className="space-y-1">
                      {clientActivity.rmas.map((r: any) => (
                        <div key={r.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                          <div>
                            <span className="font-mono font-medium">{r.rma_number}</span>
                            <span className="text-xs text-muted-foreground ml-2 truncate max-w-[180px] inline-block">{r.product_name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{STATUS_LABEL[r.status] ?? r.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
