import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/ProductCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Search, Cpu, Package, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [familyFilter, setFamilyFilter] = useState("all");

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

  const filtered = products?.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
    const matchesFamily = familyFilter === "all" || p.family_id === familyFilter;
    return matchesSearch && matchesCategory && matchesFamily;
  });

  const categories = [...new Set(products?.map((p) => p.category).filter(Boolean) || [])];
  const visibleFamilies = families.filter((f) => categoryFilter === "all" || f.category === categoryFilter);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Cpu className="h-6 w-6 text-primary" />
            <h1 className="font-heading text-xl font-bold text-foreground">TechCatalog</h1>
          </div>
          <Link to="/login" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Admin
          </Link>
        </div>
      </header>

      <section className="container mx-auto px-4 py-12 text-center">
        <h2 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Catálogo de Eletrônicos
        </h2>
        <p className="mt-3 text-lg text-muted-foreground max-w-xl mx-auto">
          Explore nossos produtos de tecnologia.
        </p>
      </section>

      <section className="container mx-auto px-4 pb-8">
        <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar produtos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setFamilyFilter("all"); }}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat!} value={cat!}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {visibleFamilies.length > 0 && (
            <Select value={familyFilter} onValueChange={setFamilyFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Família" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {visibleFamilies.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
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

      <footer className="border-t border-border py-6 text-center">
        <p className="text-xs text-muted-foreground">
          As imagens apresentadas são meramente ilustrativas. O produto real pode variar.
        </p>
      </footer>
    </div>
  );
};

export default Index;
