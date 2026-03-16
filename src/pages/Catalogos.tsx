import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, BookOpen } from "lucide-react";
import { CatalogViewer } from "@/components/CatalogViewer";

const Catalogos = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
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

  const imagesByProduct = productImages.reduce((acc: Record<string, typeof productImages>, img) => {
    if (!acc[img.product_id]) acc[img.product_id] = [];
    acc[img.product_id].push(img);
    return acc;
  }, {});

  const familyMap = Object.fromEntries(families.map((f) => [f.id, f.name]));

  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))] as string[];

  const categoryProducts = selectedCategory
    ? products.filter((p) => p.category === selectedCategory)
    : [];

  if (selectedCategory) {
    return (
      <CatalogViewer
        category={selectedCategory}
        products={categoryProducts}
        imagesByProduct={imagesByProduct}
        familyMap={familyMap}
        onBack={() => setSelectedCategory(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-3">
            <ShieldCheck className="h-7 w-7 text-primary" />
            <div>
              <h1 className="font-heading text-xl font-bold text-foreground leading-tight">VRCF</h1>
              <p className="text-[10px] font-medium text-muted-foreground tracking-wider uppercase">Informática & Segurança</p>
            </div>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Voltar
          </Link>
        </div>
      </header>

      <section className="container mx-auto px-4 py-12 text-center">
        <BookOpen className="h-12 w-12 mx-auto text-primary mb-4" />
        <h2 className="font-heading text-4xl font-bold tracking-tight text-foreground">
          Os Nossos Catálogos
        </h2>
        <p className="mt-3 text-lg text-muted-foreground max-w-xl mx-auto">
          Explore os nossos produtos organizados por categoria
        </p>
      </section>

      <section className="container mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {categories.map((category) => {
            const catProducts = products.filter((p) => p.category === category);
            const firstImage = catProducts.find((p) => {
              const imgs = imagesByProduct[p.id];
              return (imgs && imgs.length > 0) || p.image_url;
            });
            const coverUrl = firstImage
              ? (imagesByProduct[firstImage.id]?.[0]?.image_url || firstImage.image_url)
              : null;

            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className="group text-left rounded-2xl overflow-hidden border border-border bg-card product-card-shadow hover:ring-2 hover:ring-primary/30 transition-all"
              >
                <div className="aspect-[4/3] bg-secondary relative overflow-hidden">
                  {coverUrl ? (
                    <img
                      src={coverUrl}
                      alt={category}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <BookOpen className="h-16 w-16 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="font-heading text-xl font-bold text-white">{category}</h3>
                    <p className="text-sm text-white/80 mt-1">
                      {catProducts.length} {catProducts.length === 1 ? "produto" : "produtos"}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {categories.length === 0 && (
          <div className="text-center py-20">
            <BookOpen className="h-16 w-16 mx-auto text-muted-foreground/40" />
            <h3 className="mt-4 font-heading text-lg font-semibold text-foreground">Sem catálogos disponíveis</h3>
            <p className="mt-1 text-muted-foreground">Ainda não existem produtos no catálogo.</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default Catalogos;
