import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/ProductCard";
import { ProductDetailDialog } from "@/components/ProductDetailDialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Search, Package, Loader2, BookOpen, ShoppingCart } from "lucide-react";
import vrcfLogo from "@/assets/vrcf-logo.png";
import { Link } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { CartDrawer } from "@/components/CartDrawer";
import { Button } from "@/components/ui/button";

const Index = () => {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [familyFilter, setFamilyFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const { totalItems, setIsOpen } = useCart();

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: families = [] } = useQuery({
    queryKey: ["families"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_families")
        .select("*")
        .order("category", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: productImages = [] } = useQuery({
    queryKey: ["product_images"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_images")
        .select("*")
        .order("position", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const imagesByProduct = productImages.reduce((acc: Record<string, typeof productImages>, img) => {
    if (!acc[img.product_id]) acc[img.product_id] = [];
    acc[img.product_id].push(img);
    return acc;
  }, {});

  const familyMap = Object.fromEntries(families.map((f) => [f.id, f.name]));

  const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const filtered = products?.filter((p) => {
    const searchTerms = normalize(search).split(/\s+/).filter(Boolean);
    const nameNorm = normalize(p.name);
    const descNorm = normalize(p.description || "");
    const matchesSearch = searchTerms.length === 0 || searchTerms.every((term) =>
      nameNorm.includes(term) || descNorm.includes(term)
    );
    const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
    const matchesFamily = familyFilter === "all" || p.family_id === familyFilter;
    const matchesBrand = brandFilter === "all" || p.brand_id === brandFilter;
    return matchesSearch && matchesCategory && matchesFamily && matchesBrand;
  })?.sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return 0;
  });

  const categories = [...new Set(products?.map((p) => p.category).filter(Boolean) || [])];
  const visibleFamilies = families.filter((f) => (categoryFilter === "all" || f.category === categoryFilter) && (brandFilter === "all" || products?.some((p) => p.family_id === f.id && p.brand_id === brandFilter)));
  const visibleBrands = brands.filter((b) => products?.some((p) => p.brand_id === b.id && (categoryFilter === "all" || p.category === categoryFilter) && (familyFilter === "all" || p.family_id === familyFilter)));

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-7 w-7 text-primary" />
            <div>
              <h1 className="font-heading text-xl font-bold text-foreground leading-tight">VRCF</h1>
              <p className="text-[10px] font-medium text-muted-foreground tracking-wider uppercase">Informática & Segurança</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/catalogos" className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors">
              <BookOpen className="h-4 w-4" />
              Catálogos
            </Link>
            <Button variant="outline" size="sm" className="relative gap-1.5" onClick={() => setIsOpen(true)}>
              <ShoppingCart className="h-4 w-4" />
              Orçamento
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Button>
            <Link to="/login" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Admin
            </Link>
          </div>
        </div>
      </header>

      <section className="container mx-auto px-4 py-12 text-center">
        <h2 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Catálogo de Produtos
        </h2>
        <p className="mt-3 text-lg text-muted-foreground max-w-xl mx-auto">
          Tecnologia e Segurança ao Seu Alcance
        </p>
      </section>

      <section className="container mx-auto px-4 pb-8">
        <div className="flex flex-col sm:flex-row gap-3 max-w-3xl mx-auto flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Pesquisar produtos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setFamilyFilter("all"); setBrandFilter("all"); }}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Categorias</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat!} value={cat!}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {visibleFamilies.length > 0 && (
            <Select value={familyFilter} onValueChange={setFamilyFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Famílias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Famílias</SelectItem>
                {visibleFamilies.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {visibleBrands.length > 0 && (
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Marcas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Marcas</SelectItem>
                {visibleBrands.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </section>

      <section className="container mx-auto px-4 pb-16">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered && filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filtered.map((product) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  description={product.description}
                  category={product.category}
                  price={product.price}
                  imageUrl={product.image_url}
                  images={imagesByProduct[product.id] || []}
                  familyName={product.family_id ? familyMap[product.family_id] || null : null}
                  featured={product.featured}
                  onClick={() => setSelectedProduct({
                    id: product.id,
                    name: product.name,
                    description: product.description,
                    category: product.category,
                    price: product.price,
                    imageUrl: product.image_url,
                    images: imagesByProduct[product.id] || [],
                    familyName: product.family_id ? familyMap[product.family_id] || null : null,
                  })}
                />
              ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Package className="h-16 w-16 mx-auto text-muted-foreground/40" />
            <h3 className="mt-4 font-heading text-lg font-semibold text-foreground">Nenhum produto encontrado</h3>
            <p className="mt-1 text-muted-foreground">Nenhum produto disponível no momento.</p>
          </div>
        )}
      </section>

      <footer className="border-t border-border bg-accent text-accent-foreground py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <div>
                <p className="font-heading font-bold text-sm">VRCF - Informática & Segurança</p>
                <p className="text-xs text-accent-foreground/70">Tecnologia e Segurança ao Seu Alcance</p>
              </div>
            </div>
            <div className="text-center md:text-right space-y-1">
              <p className="text-xs text-accent-foreground/70">
                <a href="https://vrcf.pt" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                  vrcf.pt
                </a>
              </p>
              <p className="text-xs text-accent-foreground/70">
                Todos os preços apresentados incluem IVA à taxa legal em vigor.
              </p>
              <p className="text-xs text-accent-foreground/70">
                As imagens apresentadas são meramente ilustrativas.
              </p>
            </div>
          </div>
        </div>
      </footer>

      {selectedProduct && (
        <ProductDetailDialog
          open={!!selectedProduct}
          onOpenChange={(open) => !open && setSelectedProduct(null)}
          product={selectedProduct}
        />
      )}

      <CartDrawer />
    </div>
  );
};

export default Index;
