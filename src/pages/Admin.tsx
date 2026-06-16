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
import { GenerateDescriptionsDialog } from "@/components/GenerateDescriptionsDialog";
import { ShippingConfig } from "@/components/ShippingConfig";
import { UsersManager } from "@/components/UsersManager";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useMemo, useEffect } from "react";
import { Search, ShieldCheck, LogOut, Trash2, ChevronUp, ChevronDown, Loader2, Package, Image, Truck, LayoutGrid, Download, Shuffle, Users } from "lucide-react";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { LIST_COLUMNS, PRODUCT_COLUMNS } from "@/lib/fetchAllRows";

const FORNECEDORES = ["diginova", "visiotech", "bydemes", "manual"];
const PAGE_SIZE = 50;

interface ProductFilters {
  search: string;
  categoryFilter: string;
  familyFilter: string;
  typeFilter: string;
  brandFilter: string;
  fornecedorFilter: string;
  mundoFilter: string;
  stockFilter: string;
}

// Aplica os filtros do Admin a uma query Supabase sobre "products".
// Usado tanto na listagem paginada como nas operações que precisam de
// TODOS os produtos que correspondem aos filtros (exportar, aleatório,
// navegação anterior/seguinte) — mantém a lógica de filtragem num único
// sítio, em sincronia com o servidor em vez de filtrar em JS.
function applyProductFilters(query: any, f: ProductFilters, opts?: {
  skipBrand?: boolean;
  familyName?: string;
  brandName?: string;
}) {
  if (f.categoryFilter !== "all") query = query.eq("category", f.categoryFilter);
  if (f.familyFilter !== "all") {
    query = opts?.familyName
      ? query.or(`family_id.eq.${f.familyFilter},family.eq.${opts.familyName}`)
      : query.eq("family_id", f.familyFilter);
  }
  if (f.typeFilter !== "all") query = query.eq("type_id", f.typeFilter);
  if (!opts?.skipBrand && f.brandFilter !== "all") {
    query = opts?.brandName
      ? query.or(`brand_id.eq.${f.brandFilter},brand.eq.${opts.brandName}`)
      : query.eq("brand_id", f.brandFilter);
  }
  if (f.fornecedorFilter !== "all") query = query.eq("fornecedor", f.fornecedorFilter);
  if (f.mundoFilter !== "all") query = query.eq("mundo", f.mundoFilter);
  if (f.stockFilter === "out") query = query.eq("stock_status", "out");
  if (f.stockFilter === "low") query = query.eq("stock_status", "low");
  if (f.stockFilter === "in") query = query.neq("stock_status", "out");
  if (f.search.trim()) {
    const q = f.search.trim();
    query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%,description.ilike.%${q}%`);
  }
  return query;
}


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
  const typeMap = Object.fromEntries(types.map((t: any) => [t.id, t.name]));

  // Filtros activos, agrupados — usado como dependência das queries e
  // passado a applyProductFilters.
  const activeFilters: ProductFilters = {
    search, categoryFilter, familyFilter, typeFilter, brandFilter,
    fornecedorFilter, mundoFilter, stockFilter,
  };

  // Nome correspondente ao ID seleccionado — usado por applyProductFilters
  // para também encontrar produtos legados que têm o nome em "family"/
  // "brand" (texto) mas não o respectivo "_id" preenchido.
  const filterOpts = {
    familyName: familyFilter !== "all" ? familyMap[familyFilter] : undefined,
    brandName: brandFilter !== "all" ? brandMap[brandFilter] : undefined,
  };

  // Listagem paginada — server-side: aplica todos os filtros + .range() no
  // Supabase, com colunas reduzidas (LIST_COLUMNS). Substitui o antigo
  // fetchAllProducts() que trazia os 27000+ produtos completos de cada vez.
  const { data: productsData, isLoading, isFetching, error: productsError } = useQuery({
    queryKey: ["products", "page", activeFilters, filterOpts, sortCol, sortDir, page],
    queryFn: async () => {
      let query = supabase.from("products").select(LIST_COLUMNS, { count: "exact" });
      query = applyProductFilters(query, activeFilters, filterOpts);
      query = query.order(sortCol, { ascending: sortDir === "asc", nullsFirst: false });
      if (sortCol !== "id") query = query.order("id", { ascending: true });
      const from = (page - 1) * PAGE_SIZE;
      const { data, error, count } = await query.range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      return { rows: data ?? [], total: count ?? 0 };
    },
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const paginated = productsData?.rows ?? [];
  const totalFiltered = productsData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));

  // Se um filtro reduzir o nº de páginas (ex: estava na página 5 e o novo
  // filtro só tem 2), volta para a última página válida.
  useEffect(() => {
    if (productsData && page > totalPages) setPage(totalPages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages]);

  // Total geral (sem filtros) — usado para "X produtos (de Y)".
  const { data: totalAll = 0 } = useQuery({
    queryKey: ["products", "count-all"],
    queryFn: async () => {
      const { count, error } = await supabase.from("products").select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 5 * 60 * 1000,
  });


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

  // Marcas que existem entre os produtos que já correspondem aos restantes
  // filtros (Mundo/Categoria/Família/Tipo/Fornecedor/Stock/pesquisa) — evita
  // sugerir marcas sem produtos no contexto actual. Query leve (só
  // brand_id/brand), não os produtos completos.
  const { data: visibleBrandRefs = [] } = useQuery({
    queryKey: ["products", "brand-refs", { ...activeFilters, brandFilter: "all" }],
    queryFn: async () => {
      let query = supabase.from("products").select("brand_id,brand");
      query = applyProductFilters(query, activeFilters, { ...filterOpts, skipBrand: true });
      const { data, error } = await query.limit(5000);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60 * 1000,
  });

  const visibleBrands = useMemo(() => {
    const ids = new Set<string>();
    const names = new Set<string>();
    for (const r of visibleBrandRefs as any[]) {
      if (r.brand_id) ids.add(r.brand_id);
      if (r.brand) names.add(r.brand);
    }
    return brands.filter((b: any) => ids.has(b.id) || names.has(b.name));
  }, [visibleBrandRefs, brands]);

  // Se a marca seleccionada deixar de ter produtos no contexto actual
  // (ex: mudou-se a Categoria/Família/Mundo), volta a "Marca" (todas).
  useEffect(() => {
    if (brandFilter !== "all" && !visibleBrands.some((b: any) => b.id === brandFilter)) {
      setBrandFilter("all");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleBrands]);

  // Lista de IDs (apenas IDs, leve) de TODOS os produtos que correspondem
  // aos filtros activos, na mesma ordenação da tabela — usada para
  // navegação anterior/seguinte no EditProductSheet sem precisar de
  // carregar os produtos completos.
  const { data: filteredIds = [] } = useQuery({
    queryKey: ["products", "ids", activeFilters, filterOpts, sortCol, sortDir],
    queryFn: async () => {
      let query = supabase.from("products").select("id");
      query = applyProductFilters(query, activeFilters, filterOpts);
      query = query.order(sortCol, { ascending: sortDir === "asc", nullsFirst: false });
      if (sortCol !== "id") query = query.order("id", { ascending: true });

      const PAGE = 1000;
      const all: { id: string }[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await query.range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...(data as any[]));
        if (data.length < PAGE) break;
        from += PAGE;
      }
      return all.map((r) => r.id);
    },
    staleTime: 60 * 1000,
  });

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
    setPage(1);
  };

  // Navegação anterior/seguinte dentro do EditProductSheet — usa
  // filteredIds (todos os produtos que correspondem aos filtros, não só a
  // página visível). Busca o produto completo correspondente ao novo ID.
  const navigateProduct = async (dir: -1 | 1) => {
    if (!editingProduct) return;
    const idx = filteredIds.indexOf(editingProduct.id);
    if (idx === -1) return;
    const nextId = filteredIds[idx + dir];
    if (!nextId) return;
    const nextPage = Math.floor((idx + dir) / PAGE_SIZE) + 1;
    if (nextPage !== page) setPage(nextPage);
    const { data, error } = await supabase.from("products").select(PRODUCT_COLUMNS).eq("id", nextId).maybeSingle();
    if (error || !data) { toast.error("Erro ao carregar produto"); return; }
    setEditingProduct(data);
  };

  const editingIdx = editingProduct ? filteredIds.indexOf(editingProduct.id) : -1;
  const hasPrev = editingIdx > 0;
  const hasNext = editingIdx >= 0 && editingIdx < filteredIds.length - 1;

  // Exporta a listagem actual (com os filtros aplicados, todas as páginas)
  // para CSV — útil para revisão offline ou partilha com fornecedores.
  const handleExport = async () => {
    toast.info("A preparar exportação...");
    let query = supabase.from("products").select(PRODUCT_COLUMNS);
    query = applyProductFilters(query, activeFilters, filterOpts);
    const PAGE = 1000;
    const all: any[] = [];
    let from = 0;
    while (true) {
      const { data, error } = await query.range(from, from + PAGE - 1);
      if (error) { toast.error(error.message); return; }
      if (!data || data.length === 0) break;
      all.push(...data);
      if (data.length < PAGE) break;
      from += PAGE;
    }

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
    const rows = all.map((p: any) =>
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
    toast.success(`${all.length} produtos exportados`);
  };

  // Marca aleatoriamente alguns produtos da listagem actual (já filtrada,
  // ex: por mundo/categoria/família) como destaque — útil para preencher
  // rapidamente "Destaque na família" e "Destaque na homepage" enquanto não
  // há tempo para curadoria manual.
  const handleRandomizeFeatured = async () => {
    if (totalFiltered === 0) return;
    if (totalFiltered > 500) {
      toast.error("Demasiados produtos na listagem actual (>500) — aplica um filtro (ex: categoria ou família) antes de usar o botão Aleatório.");
      return;
    }
    const allIds = [...filteredIds];
    const pool = [...allIds];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const nFamily = Math.min(6, pool.length);
    const nHomepage = Math.min(6, pool.length);
    const familyIds = pool.slice(0, nFamily);
    const homepageIds = pool.slice(0, nHomepage);

    try {
      // Limpa o destaque anterior apenas dentro da listagem filtrada, depois
      // marca os novos escolhidos.
      await supabase.from("products").update({ featured: false }).in("id", allIds);
      await supabase.from("products").update({ show_on_homepage: false }).in("id", allIds);
      if (familyIds.length > 0) {
        await supabase.from("products").update({ featured: true }).in("id", familyIds);
      }
      if (homepageIds.length > 0) {
        await supabase.from("products").update({ show_on_homepage: true }).in("id", homepageIds);
      }
      toast.success(`${familyIds.length} produtos marcados como destaque, ${homepageIds.length} na homepage`);
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
        <AdminDashboard />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="produtos" className="gap-1.5">
              <Package className="h-4 w-4" /> Produtos ({totalAll})
            </TabsTrigger>
            <TabsTrigger value="banners" className="gap-1.5">
              <Image className="h-4 w-4" /> Banners
            </TabsTrigger>
            <TabsTrigger value="portes" className="gap-1.5">
              <Truck className="h-4 w-4" /> Portes
            </TabsTrigger>
            <TabsTrigger value="utilizadores" className="gap-1.5">
              <Users className="h-4 w-4" /> Utilizadores
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
              <span className="flex items-center gap-1.5">
                {totalFiltered} produto{totalFiltered !== 1 ? "s" : ""} {totalFiltered !== totalAll && `(de ${totalAll})`}
                {isFetching && !isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline" size="sm" className="h-8 gap-1.5"
                  onClick={handleRandomizeFeatured}
                  disabled={totalFiltered === 0}
                  title="Marca aleatoriamente alguns produtos da listagem actual como 'Destaque na família' e 'Destaque na homepage'"
                >
                  <Shuffle className="h-3.5 w-3.5" /> Aleatório
                </Button>
                <Button
                  variant="outline" size="sm" className="h-8 gap-1.5"
                  onClick={handleExport}
                  disabled={totalFiltered === 0}
                  title="Exportar a listagem actual (com os filtros aplicados) para CSV"
                >
                  <Download className="h-3.5 w-3.5" /> Exportar
                </Button>
                <GenerateDescriptionsDialog products={paginated.filter((p: any) => !p.description) as any} />
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
                        <th className="text-left px-3 py-2.5 font-medium text-muted-foreground whitespace-nowrap">Tipo</th>
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
                          <td colSpan={13} className="text-center py-16 text-muted-foreground">
                            <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
                            Nenhum produto encontrado
                          </td>
                        </tr>
                      ) : paginated.map((p: any) => {
                        const specs = typeof p.especificacoes === "string" ? JSON.parse(p.especificacoes || "{}") : (p.especificacoes || {});
                        const familyName = p.family || (p.family_id ? familyMap[p.family_id] : null) || "—";
                        const typeName = p.type || (p.type_id ? typeMap[p.type_id] : null) || "—";
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
                            <td className="px-3 py-2.5 text-muted-foreground text-xs max-w-[120px] truncate" title={typeName}>{typeName}</td>
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

          {/* ── UTILIZADORES ── */}
          <TabsContent value="utilizadores" className="mt-4">
            <UsersManager />
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
