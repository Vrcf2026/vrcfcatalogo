import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/ProductCard";
import { AddProductDialog } from "@/components/AddProductDialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Search, Cpu, Package, Loader2 } from "lucide-react";

const Index = () => {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

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

  const filtered = products?.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(products?.map((p) => p.category).filter(Boolean) || [])];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Cpu className="h-6 w-6 text-primary" />
            <h1 className="font-heading text-xl font-bold text-foreground">TechCatalog</h1>
          </div>
          <AddProductDialog />
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-12 text-center">
        <h2 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Catálogo de Eletrônicos
        </h2>
        <p className="mt-3 text-lg text-muted-foreground max-w-xl mx-auto">
          Explore nossos produtos. Adicione novos e a IA gera a imagem automaticamente.
        </p>
      </section>

      {/* Filters */}
      <section className="container mx-auto px-4 pb-8">
        <div className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produtos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
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
        </div>
      </section>

      {/* Products Grid */}
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
                name={product.name}
                description={product.description}
                category={product.category}
                price={product.price}
                imageUrl={product.image_url}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Package className="h-16 w-16 mx-auto text-muted-foreground/40" />
            <h3 className="mt-4 font-heading text-lg font-semibold text-foreground">
              Nenhum produto encontrado
            </h3>
            <p className="mt-1 text-muted-foreground">
              Adicione seu primeiro produto clicando em "Novo Produto"
            </p>
          </div>
        )}
      </section>
    </div>
  );
};

export default Index;
