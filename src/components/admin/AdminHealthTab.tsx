import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ImageOff, Tag, FileText, PackageX, Link2Off,
  RefreshCw, ChevronRight, AlertTriangle, CheckCircle2,
} from "lucide-react";

type Problema = "sem_imagem" | "sem_preco" | "sem_descricao" | "fora_catalogo" | "sem_familia";

const PROBLEMAS: { key: Problema; label: string; icon: any; color: string; desc: string }[] = [
  { key: "sem_imagem",    label: "Sem imagem",        icon: ImageOff,   color: "text-red-500",    desc: "Produto sem image_url" },
  { key: "sem_preco",     label: "Sem preço",         icon: Tag,        color: "text-amber-500",  desc: "Preço nulo ou zero" },
  { key: "sem_descricao", label: "Sem descrição",     icon: FileText,   color: "text-blue-500",   desc: "Sem descrição curta" },
  { key: "fora_catalogo", label: "Fora do catálogo",  icon: PackageX,   color: "text-gray-500",   desc: "include_in_catalog = false" },
  { key: "sem_familia",   label: "Sem família",       icon: Link2Off,   color: "text-purple-500", desc: "family_id não associado" },
];

const MUNDOS = ["todos", "seguranca", "escritorio", "economato"];

export function AdminHealthTab({ onEditProduct }: { onEditProduct?: (p: any) => void }) {
  const [mundo, setMundo]         = useState("todos");
  const [problema, setProblema]   = useState<Problema>("sem_imagem");
  const [page, setPage]           = useState(0);
  const PAGE = 50;

  const { data: counts, isLoading: loadingCounts, refetch: refetchCounts } = useQuery({
    queryKey: ["health-counts", mundo],
    queryFn: async () => {
      const base = (q: any) => mundo !== "todos" ? q.eq("mundo", mundo) : q;

      const [semImagem, semPreco, semDesc, foraCatalogo, semFamilia] = await Promise.all([
        base(supabase.from("products").select("*", { count: "exact", head: true }).is("image_url", null).eq("include_in_catalog", true)),
        base(supabase.from("products").select("*", { count: "exact", head: true }).or("price.is.null,price.eq.0").eq("include_in_catalog", true)),
        base(supabase.from("products").select("*", { count: "exact", head: true }).or("short_description.is.null,short_description.eq.").eq("include_in_catalog", true)),
        base(supabase.from("products").select("*", { count: "exact", head: true }).eq("include_in_catalog", false)),
        base(supabase.from("products").select("*", { count: "exact", head: true }).is("family_id", null).eq("include_in_catalog", true)),
      ]);
      return {
        sem_imagem:    semImagem.count ?? 0,
        sem_preco:     semPreco.count ?? 0,
        sem_descricao: semDesc.count ?? 0,
        fora_catalogo: foraCatalogo.count ?? 0,
        sem_familia:   semFamilia.count ?? 0,
      };
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data: produtos, isLoading: loadingProdutos } = useQuery({
    queryKey: ["health-produtos", mundo, problema, page],
    queryFn: async () => {
      const from = page * PAGE;
      let q = supabase.from("products")
        .select("id, sku, name, image_url, price, include_in_catalog, family_id, mundo, fornecedor")
        .range(from, from + PAGE - 1)
        .order("name");

      if (mundo !== "todos") q = q.eq("mundo", mundo) as any;

      switch (problema) {
        case "sem_imagem":    q = q.is("image_url", null).eq("include_in_catalog", true) as any; break;
        case "sem_preco":     q = q.or("price.is.null,price.eq.0").eq("include_in_catalog", true) as any; break;
        case "sem_descricao": q = q.or("short_description.is.null,short_description.eq.").eq("include_in_catalog", true) as any; break;
        case "fora_catalogo": q = q.eq("include_in_catalog", false) as any; break;
        case "sem_familia":   q = q.is("family_id", null).eq("include_in_catalog", true) as any; break;
      }

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 2 * 60 * 1000,
  });

  const totalProblemas = counts
    ? Object.values(counts).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-heading text-lg font-bold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Saúde do Catálogo
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Produtos que precisam de atenção para aparecer corretamente no catálogo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={mundo} onValueChange={v => { setMundo(v); setPage(0); }}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os mundos</SelectItem>
              <SelectItem value="seguranca">Segurança</SelectItem>
              <SelectItem value="escritorio">Escritório</SelectItem>
              <SelectItem value="economato">Economato</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetchCounts()} className="gap-1.5 h-8">
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar
          </Button>
        </div>
      </div>

      {/* Cards de contadores */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {PROBLEMAS.map(({ key, label, icon: Icon, color, desc }) => {
          const count = counts?.[key] ?? 0;
          const active = problema === key;
          return (
            <button key={key} onClick={() => { setProblema(key); setPage(0); }}
              className={`rounded-xl border p-3 text-left transition-all hover:shadow-md ${
                active ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border bg-card hover:border-primary/30"
              }`}>
              <div className="flex items-center justify-between mb-2">
                <Icon className={`h-4 w-4 ${color}`} />
                {count === 0
                  ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  : <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{count}</Badge>
                }
              </div>
              <p className="text-xs font-semibold text-foreground">{label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
            </button>
          );
        })}
      </div>

      {/* Lista de produtos problemáticos */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            {(() => { const p = PROBLEMAS.find(p => p.key === problema)!; const Icon = p.icon; return <><Icon className={`h-4 w-4 ${p.color}`} />{p.label}</> })()}
            {counts && <Badge variant="secondary" className="ml-auto">{counts[problema]} produtos</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingProdutos ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !produtos || produtos.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-2 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              <p className="text-sm font-medium">Sem problemas nesta categoria!</p>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                {produtos.map((p: any) => (
                  <div key={p.id}
                    className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                    onClick={() => onEditProduct?.(p)}>
                    {p.image_url
                      ? <img src={p.image_url} alt="" className="h-9 w-9 rounded object-cover bg-muted shrink-0" />
                      : <div className="h-9 w-9 rounded bg-muted flex items-center justify-center shrink-0">
                          <ImageOff className="h-4 w-4 text-muted-foreground" />
                        </div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">{p.sku} · {p.fornecedor} · {p.mundo}</p>
                    </div>
                    {p.price && Number(p.price) > 0 && (
                      <span className="text-xs font-semibold shrink-0">{Number(p.price).toFixed(2)}€</span>
                    )}
                    {onEditProduct && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    )}
                  </div>
                ))}
              </div>
              {/* Paginação */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  Anterior
                </Button>
                <span className="text-xs text-muted-foreground">
                  {page * PAGE + 1}–{Math.min((page + 1) * PAGE, counts?.[problema] ?? 0)} de {counts?.[problema] ?? 0}
                </span>
                <Button variant="outline" size="sm"
                  disabled={(page + 1) * PAGE >= (counts?.[problema] ?? 0)}
                  onClick={() => setPage(p => p + 1)}>
                  Seguinte
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminHealthTab;
