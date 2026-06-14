import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ManageFamiliesDialog } from "@/components/ManageFamiliesDialog";
import { ManageCategoriesDialog } from "@/components/ManageCategoriesDialog";
import { ManageBrandsDialog } from "@/components/ManageBrandsDialog";
import { ManageTypesDialog } from "@/components/ManageTypesDialog";
import HomepageHighlightsDialog from "@/components/HomepageHighlightsDialog";
import { AdminDashboard } from "@/components/AdminDashboard";
import { EditProductSheet } from "@/components/EditProductSheet";
import { AddProductDialog } from "@/components/AddProductDialog";
import { BannersManager } from "@/components/BannersManager";
import { ShippingConfig } from "@/components/ShippingConfig";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useMemo, useEffect } from "react";
import { Search, ShieldCheck, LogOut, Trash2, ChevronUp, ChevronDown, Loader2, Package, Image, Truck, LayoutGrid, Download, Shuffle } from "lucide-react";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { fetchAllProducts } from "@/lib/fetchAllRows";

const FORNECEDORES = ["diginova", "visiotech", "bydemes", "manual"];
const PAGE_SIZE = 50;

const Admin = () => {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [familyFilter, setFamilyFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [fornecedorFilter, setFornecedorFilter] = useState("all");
  const [mundoFilter, setMundoFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [sortCol, setSortCol] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("produtos");
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const { data: products = [], isLoading, error: productsError } = useQuery({
    queryKey: ["products", "all"],
    queryFn: () => fetchAllProducts(),
    staleTime: 2 * 60 * 1000,
  });

  const { data: families = [] } = useQuery({
    queryKey: ["families"],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_families").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: dbCategories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brands").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: types = [] } = useQuery({
    queryKey: ["types"],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_types").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const familyMap = Object.fromEntries(families.map((f: any) => [f.id, f.name]));
  const brandMap = Object.fromEntries(brands.map((b: any) => [b.id, b.name]));

  // Categoria, Família e Tipo (Nível 3) formam uma cascata de filtros:
  // Mundo → Categoria → Família → Tipo. Cada nível só mostra opções que
  // existem dentro do(s) nível(eis) acima seleccionado(s), incluindo
  // entradas marcadas como mundo "todos" (transversais).
  const inMundo = (m: string | null | undefined) =>
    mundoFilter === "all" || m === mundoFilter || m === "todos" || !m;

  const visibleCategories = dbCategories.filter((c: any) => inMundo(c.mundo));
  const categoryNames = visibleCategories.map((c: any) => c.name);

  const visibleFamilies = families.filter((f: any) =>
    inMundo(f.mundo) && (categoryFilter === "all" || f.category === categoryFilter)
  );

  const visibleTypes = types.filter((t: any) =>
    inMundo(t.mundo) && (familyFilter === "all"
      ? visibleFamilies.some((f: any) => f.id === t.family_id)
      : t.family_id === familyFilter)
  );

  const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Predicado partilhado com os filtros activos, excepto o indicado em
  // `except` — usado para derivar as opções de Marca a partir dos produtos
  // que já correspondem aos outros filtros seleccionados.
  const matchesFilters = (p: any, except?: "brand") => {
    if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
    if (familyFilter !== "all" && p.family_id !== familyFilter && p.family !== familyFilter) return false;
    if (typeFilter !== "all" && p.type_id !== typeFilter) return false;
    if (except !== "brand" && brandFilter !== "all" && p.brand_id !== brandFilter && p.brand !== brandFilter) return false;
    if (fornecedorFilter !== "all" && p.fornecedor !== fornecedorFilter) return false;
    if (mundoFilter !== "all" && p.mundo !== mundoFilter) return false;
    if (stockFilter === "out" && p.stock_status !== "out") return false;
    if (stockFilter === "low" && p.stock_status !== "low") return false;
    if (stockFilter === "in" && p.stock_status === "out") return false;
    if (search) {
      const q = normalize(search);
      return normalize(p.name || "").includes(q) || normalize(p.sku || "").includes(q);
    }
    return true;
  };

  // Marcas que existem entre os produtos que já correspondem aos restantes
  // filtros (Mundo/Categoria/Família/Tipo/Fornecedor/Stock/pesquisa) — evita
  // sugerir marcas sem produtos no contexto actual.
  const visibleBrands = useMemo(() => {
    const idsWithProducts = new Set<string>();
    const namesWithProducts = new Set<string>();
    for (const p of products) {
      if (!matchesFilters(p, "brand")) continue;
      if (p.brand_id) idsWithProducts.add(p.brand_id);
      if (p.brand) namesWithProducts.add(p.brand);
    }
    return brands.filter((b: any) =>
      idsWithProducts.has(b.id) || namesWithProducts.has(b.name)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, brands, categoryFilter, familyFilter, typeFilter, fornecedorFilter, mundoFilter, stockFilter, search]);

  // Se a marca seleccionada deixar de ter produtos no contexto actual
  // (ex: mudou-se a Categoria/Família/Mundo), volta a "Marca" (todas).
  useEffect(() => {
    if (brandFilter !== "all" && !visibleBrands.some((b: any) => b.id === brandFilter)) {
      setBrandFilter("all");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleBrands]);

  const filtered = useMemo(() => {
    let result = products.filter((p: any) => matchesFilters(p));

    result = [...result].sort((a: any, b: any) => {
      const va = a[sortCol] ?? "";
      const vb = b[sortCol] ?? "";
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [products, categoryFilter, familyFilter, typeFilter, brandFilter, fornecedorFilter, mundoFilter, stockFilter, search, sortCol, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Navegação anterior/seguinte dentro do EditProductSheet — usa a lista
  // filtrada actual (todos os produtos que correspondem aos filtros, não só
  // a página visível), para que "seguinte" continue mesmo na fronteira
  // entre páginas.
  const navigateProduct = (dir: -1 | 1) => {
    if (!editingProduct) return;
    const idx = filtered.findIndex((p: any) => p.id === editingProduct.id);
    if (idx === -1) return;
    const next = filtered[idx + dir];
    if (next) {
      // Se o produto seguinte estiver noutra página, ajusta a página actual
      const nextIdx = idx + dir;
      const nextPage = Math.floor(nextIdx / PAGE_SIZE) + 1;
      if (nextPage !== page) setPage(nextPage);
      setEditingProduct(next);
    }
  };

  const editingIdx = editingProduct ? filtered.findIndex((p: any) => p.id === editingProduct.id) : -1;
  const hasPrev = editingIdx > 0;
  const hasNext = editingIdx >= 0 && editingIdx < filtered.length - 1;

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
    setPage(1);
  };

  // Exporta a listagem actual (com os filtros aplicados, todas as páginas)
  // para CSV — útil para revisão offline ou partilha com fornecedores.
  const handleExport = () => {
    const cols = [
      "sku", "name", "category", "family", "type", "brand", "mundo",
      "fornecedor", "price", "purchase_price", "stock_status", "min_sale_qty",
      "featured", "show_on_homepage", "include_in_catalog", "slug",
    ];
    const escapeCsv = (val: unknown) => {
      const s = val === null || val === undefined ? "" : String(val);
      return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = cols.join(";");
    const rows = filtered.map((p: any) =>
      cols.map((c) => escapeCsv(p[c] === true ? "sim" : p[c] === false ? "não" : p[c])).join(";")
    );
    const csv = "\uFEFF" + [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ts = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `vrcf-produtos-${mundoFilter !== "all" ? mundoFilter + "-" : ""}${ts}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} produtos exportados`);
  };

  // Marca aleatoriamente alguns produtos da listagem actual (já filtrada,
  // ex: por mundo/categoria/família) como destaque — útil para preencher
  // rapidamente "Destaque na família" e "Destaque na homepage" enquanto não
  // há tempo para curadoria manual.
  const handleRandomizeFeatured = async () => {
    if (filtered.length === 0) return;
    if (filtered.length > 500) {
      toast.error("Demasiados produtos na listagem actual (>500) — aplica um filtro (ex: categoria ou família) antes de usar o botão Aleatório.");
      return;
    }
    const pool = [...filtered];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const nFamily = Math.min(6, pool.length);
    const nHomepage = Math.min(6, pool.length);
    const familyIds = new Set(pool.slice(0, nFamily).map((p: any) => p.id));
    const homepageIds = new Set(pool.slice(0, nHomepage).map((p: any) => p.id));
    const allIds = filtered.map((p: any) => p.id);

    try {
      // Limpa o destaque anterior apenas dentro da listagem filtrada, depois
      // marca os novos escolhidos.
      await supabase.from("products").update({ featured: false }).in("id", allIds);
      await supabase.from("products").update({ show_on_homepage: false }).in("id", allIds);
      if (familyIds.size > 0) {
        await supabase.from("products").update({ featured: true }).in("id", Array.from(familyIds));
      }
      if (homepageIds.size > 0) {
        await supabase.from("products").update({ show_on_homepage: true }).in("id", Array.from(homepageIds));
      }
      toast.success(`${familyIds.size} produtos marcados como destaque, ${homepageIds.size} na homepage`);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["hp-featured"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao marcar destaques");
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Eliminar este produto?")) return;
    setDeleting(id);
    try {
      await supabase.from("product_images").delete().eq("product_id", id);
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      toast.success("Produto eliminado");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch {
      toast.error("Erro ao eliminar");
    } finally {
      setDeleting(null);
    }
  };

  const handleToggle = async (id: string, field: string, val: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("products").update({ [field]: val }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortCol !== col) return null;
    return sortDir === "asc" ? <ChevronUp className="h-3 w-3 inline ml-1" /> : <ChevronDown className="h-3 w-3 inline ml-1" />;
  };

  const stockBadge = (status: string) => {
    if (status === "high") return <Badge className="bg-green-500/15 text-green-700 border-green-300 text-[10px]">Stock</Badge>;
    if (status === "low") return <Badge className="bg-amber-500/15 text-amber-700 border-amber-300 text-[10px]">Baixo</Badge>;
    return <Badge className="bg-red-500/15 text-red-700 border-red-300 text-[10px]">Esgot.</Badge>;
  };

  const tecladoBadge = (specs: any) => {
    if (!specs?.teclado) return null;
    const t = specs.teclado;
    if (t === "PT") return <Badge className="bg-blue-500/15 text-blue-700 text-[10px]">PT</Badge>;
    if (t === "ES") return <Badge className="bg-orange-500/15 text-orange-700 text-[10px]">ES</Badge>;
    if (t === "Personalizável") return <Badge className="bg-purple-500/15 text-purple-700 text-[10px]">Pers.</Badge>;
    return <Badge className="bg-muted text-muted-foreground text-[10px]">INT</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-lg">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <div>
              <h1 className="font-heading text-lg font-bold leading-tight">VRCF Admin</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Informática & Segurança</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ManageCategoriesDialog categories={dbCategories} />
            <ManageFamiliesDialog families={families} categories={categoryNames} />
            <ManageBrandsDialog brands={brands} />
            <ManageTypesDialog types={types} families={families as any} />
            <HomepageHighlightsDialog brands={brands} categories={categoryNames} />
            <AddProductDialog families={families} types={types} categories={categoryNames} brands={brands} />
            <DarkModeToggle />
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Dashboard */}
        <AdminDashboard products={products} productImages={[]} families={families} brands={brands} />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="produtos" className="gap-1.5">
              <Package className="h-4 w-4" /> Produtos ({products.length})
            </TabsTrigger>
            <TabsTrigger value="banners" className="gap-1.5">
              <Image className="h-4 w-4" /> Banners
            </TabsTrigger>
            <TabsTrigger value="portes" className="gap-1.5">
              <Truck className="h-4 w-4" /> Portes
            </TabsTrigger>
          </TabsList>

          {/* ── PRODUTOS ── */}
          <TabsContent value="produtos" className="space-y-4 mt-4">
            {/* Filtros */}
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Pesquisar nome ou SKU..." value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9 h-9" />
              </div>
              <Select value={fornecedorFilter} onValueChange={(v) => { setFornecedorFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="Fornecedor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Fornecedor</SelectItem>
                  {FORNECEDORES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={mundoFilter} onValueChange={(v) => { setMundoFilter(v); setCategoryFilter("all"); setFamilyFilter("all"); setTypeFilter("all"); setPage(1); }}>
                <SelectTrigger className="w-[120px] h-9"><SelectValue placeholder="Mundo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Mundo</SelectItem>
                  <SelectItem value="escritorio">Escritório</SelectItem>
                  <SelectItem value="seguranca">Segurança</SelectItem>
                  <SelectItem value="economato">Economato</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setFamilyFilter("all"); setTypeFilter("all"); setPage(1); }}>
                <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Categoria</SelectItem>
                  {categoryNames.map((c: string) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={familyFilter} onValueChange={(v) => { setFamilyFilter(v); setTypeFilter("all"); setPage(1); }}>
                <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Família" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Família</SelectItem>
                  {visibleFamilies.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tipo</SelectItem>
                  {visibleTypes.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={brandFilter} onValueChange={(v) => { setBrandFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[120px] h-9"><SelectValue placeholder="Marca" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Marca</SelectItem>
                  {visibleBrands.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={stockFilter} onValueChange={(v) => { setStockFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[110px] h-9"><SelectValue placeholder="Stock" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Stock</SelectItem>
                  <SelectItem value="in">Com stock</SelectItem>
                  <SelectItem value="low">Stock baixo</SelectItem>
                  <SelectItem value="out">Esgotado</SelectItem>
                </SelectContent>
              </Select>
              {(search || categoryFilter !== "all" || familyFilter !== "all" || typeFilter !== "all" || brandFilter !== "all" || fornecedorFilter !== "all" || mundoFilter !== "all" || stockFilter !== "all") && (
                <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={() => {
                  setSearch(""); setCategoryFilter("all"); setFamilyFilter("all"); setTypeFilter("all");
                  setBrandFilter("all"); setFornecedorFilter("all"); setMundoFilter("all"); setStockFilter("all"); setPage(1);
                }}>Limpar filtros</Button>
              )}
            </div>

            {/* Contador */}
            {productsError && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                Erro ao carregar produtos: {(productsError as any)?.message || String(productsError)}
              </div>
            )}
            <div className="flex items-center justify-between text-sm text-muted-foreground gap-2 flex-wrap">
              <span>{filtered.length} produto{filtered.length !== 1 ? "s" : ""} {filtered.length !== products.length && `(de ${products.length})`}</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline" size="sm" className="h-8 gap-1.5"
                  onClick={handleRandomizeFeatured}
                  disabled={filtered.length === 0}
                  title="Marca aleatoriamente alguns produtos da listagem actual como 'Destaque na família' e 'Destaque na homepage'"
                >
                  <Shuffle className="h-3.5 w-3.5" /> Aleatório
                </Button>
                <Button
                  variant="outline" size="sm" className="h-8 gap-1.5"
                  onClick={handleExport}
                  disabled={filtered.length === 0}
                  title="Exportar a listagem actual (com os filtros aplicados) para CSV"
                >
                  <Download className="h-3.5 w-3.5" /> Exportar
                </Button>
                <span>Página {page} de {totalPages || 1}</span>
              </div>
            </div>

            {/* Tabela */}
            {isLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="text-left px-3 py-2.5 font-medium text-muted-foreground cursor-pointer hover:text-foreground whitespace-nowrap" onClick={() => handleSort("name")}>
                          Nome <SortIcon col="name" />
                        </th>
                        <th className="text-left px-3 py-2.5 font-medium text-muted-foreground whitespace-nowrap">SKU</th>
                        <th className="text-left px-3 py-2.5 font-medium text-muted-foreground whitespace-nowrap">Fornecedor</th>
                        <th className="text-left px-3 py-2.5 font-medium text-muted-foreground whitespace-nowrap">Família</th>
                        <th className="text-left px-3 py-2.5 font-medium text-muted-foreground whitespace-nowrap">Marca</th>
                        <th className="text-right px-3 py-2.5 font-medium text-muted-foreground cursor-pointer hover:text-foreground whitespace-nowrap" onClick={() => handleSort("purchase_price")}>
                          Compra <SortIcon col="purchase_price" />
                        </th>
                        <th className="text-right px-3 py-2.5 font-medium text-muted-foreground cursor-pointer hover:text-foreground whitespace-nowrap" onClick={() => handleSort("price")}>
                          Venda <SortIcon col="price" />
                        </th>
                        <th className="text-center px-3 py-2.5 font-medium text-muted-foreground whitespace-nowrap">Stock</th>
                        <th className="text-center px-3 py-2.5 font-medium text-muted-foreground whitespace-nowrap">Teclado</th>
                        <th className="text-center px-3 py-2.5 font-medium text-muted-foreground whitespace-nowrap">Catálogo</th>
                        <th className="text-center px-3 py-2.5 font-medium text-muted-foreground whitespace-nowrap">Destaque</th>
                        <th className="px-3 py-2.5"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {paginated.length === 0 ? (
                        <tr>
                          <td colSpan={12} className="text-center py-16 text-muted-foreground">
                            <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
                            Nenhum produto encontrado
                          </td>
                        </tr>
                      ) : paginated.map((p: any) => {
                        const specs = typeof p.especificacoes === "string" ? JSON.parse(p.especificacoes || "{}") : (p.especificacoes || {});
                        const familyName = p.family || (p.family_id ? familyMap[p.family_id] : null) || "—";
                        const brandName = p.brand || (p.brand_id ? brandMap[p.brand_id] : null) || "—";
                        return (
                          <tr key={p.id}
                            className="hover:bg-muted/30 cursor-pointer transition-colors"
                            onClick={() => setEditingProduct(p)}>
                            <td className="px-3 py-2.5 max-w-[220px]">
                              <div className="flex items-center gap-2">
                                {p.image_url && (
                                  <img src={p.image_url} alt="" className="h-8 w-8 object-contain rounded flex-shrink-0 bg-muted" />
                                )}
                                <span className="truncate font-medium text-foreground" title={p.name}>{p.name}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-muted-foreground font-mono text-xs whitespace-nowrap">{p.sku || "—"}</td>
                            <td className="px-3 py-2.5">
                              {p.fornecedor ? (
                                <Badge variant="outline" className="text-[10px] capitalize">{p.fornecedor}</Badge>
                              ) : "—"}
                            </td>
                            <td className="px-3 py-2.5 text-muted-foreground text-xs max-w-[120px] truncate" title={familyName}>{familyName}</td>
                            <td className="px-3 py-2.5 text-muted-foreground text-xs">{brandName}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-xs text-muted-foreground whitespace-nowrap">
                              {p.purchase_price ? `${p.purchase_price.toFixed(2)}€` : "—"}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums font-medium text-foreground whitespace-nowrap">
                              {p.price ? `${p.price.toFixed(2)}€` : "—"}
                            </td>
                            <td className="px-3 py-2.5 text-center">{stockBadge(p.stock_status)}</td>
                            <td className="px-3 py-2.5 text-center">{tecladoBadge(specs)}</td>
                            <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                              <Switch
                                checked={!!p.include_in_catalog}
                                onCheckedChange={(v) => handleToggle(p.id, "include_in_catalog", v, { stopPropagation: () => {} } as any)}
                                className="scale-75"
                              />
                            </td>
                            <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                              <Switch
                                checked={!!p.featured}
                                onCheckedChange={(v) => handleToggle(p.id, "featured", v, { stopPropagation: () => {} } as any)}
                                className="scale-75"
                              />
                            </td>
                            <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={(e) => handleDelete(p.id, e)} disabled={deleting === p.id}>
                                {deleting === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Anterior</Button>
                <div className="flex items-center gap-1.5 text-sm px-2">
                  <span>Página</span>
                  <Input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={page}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (!Number.isNaN(v)) setPage(Math.min(totalPages, Math.max(1, v)));
                    }}
                    className="h-8 w-16 text-center"
                  />
                  <span>de {totalPages}</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Seguinte</Button>
              </div>
            )}
          </TabsContent>

          {/* ── BANNERS ── */}
          <TabsContent value="banners" className="mt-4">
            <BannersManager />
          </TabsContent>

          {/* ── PORTES ── */}
          <TabsContent value="portes" className="mt-4">
            <ShippingConfig />
          </TabsContent>
        </Tabs>
      </div>

      {/* Painel de edição */}
      {editingProduct && (
        <EditProductSheet
          open={!!editingProduct}
          onOpenChange={(open) => !open && setEditingProduct(null)}
          product={editingProduct}
          families={families}
          types={types}
          categories={categoryNames}
          brands={brands}
          onPrev={() => navigateProduct(-1)}
          onNext={() => navigateProduct(1)}
          hasPrev={hasPrev}
          hasNext={hasNext}
        />
      )}
    </div>
  );
};

export default Admin;
