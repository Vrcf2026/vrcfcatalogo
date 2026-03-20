import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { CatalogViewer } from "@/components/CatalogViewer";
import vrcfLogo from "@/assets/vrcf-logo.png";

const CATEGORY_THEMES: Record<string, { icon: string; bgImage: string }> = {
  Laptops: { icon: "💻", bgImage: "/images/bg-laptops.jpg" },
  Smartphones: { icon: "📱", bgImage: "/images/bg-smartphones.jpg" },
  Gaming: { icon: "🎮", bgImage: "/images/bg-gaming.jpg" },
  Informatica: { icon: "🖥️", bgImage: "/images/bg-informatica.jpg" },
  "Segurança": { icon: "🔒", bgImage: "/images/bg-seguranca.jpg" },
  Economato: { icon: "📋", bgImage: "/images/bg-economato.jpg" },
  Kilomat: { icon: "🛠️", bgImage: "/kilomat/kilomat_pag_1_frente.png" },
  Outros: { icon: "🔧", bgImage: "/images/bg-outros.jpg" },
};

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
  // Only show products marked for catalog
  const catalogProducts = products.filter((p) => p.include_in_catalog);
  const categories = [...new Set(catalogProducts.map((p) => p.category).filter(Boolean))] as string[];

  const categoryProducts = selectedCategory
    ? catalogProducts.filter((p) => p.category === selectedCategory)
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

  // Dynamic grid: adapt to number of categories to fill screen without scroll
  const count = categories.length;
  // For 1-2: single row; 3-4: 2x2; 5-6: 2x3 or 3x2; 7+: 3x3
  const gridClass =
    count <= 2
      ? "grid-cols-2"
      : count <= 4
      ? "grid-cols-2 grid-rows-2"
      : count <= 6
      ? "grid-cols-3 grid-rows-2"
      : "grid-cols-3 grid-rows-3";

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Compact header */}
      <header className="flex-shrink-0 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="flex items-center justify-between px-4 py-2">
          <Link to="/" className="flex items-center gap-2">
            <img src={vrcfLogo} alt="VRCF" className="h-8 w-8 object-contain" />
            <div>
              <h1 className="font-heading text-lg font-bold text-foreground leading-tight">VRCF</h1>
              <p className="text-[9px] font-medium text-muted-foreground tracking-wider uppercase">Informática & Segurança</p>
            </div>
          </Link>
          <div className="text-center">
            <h2 className="font-heading text-sm font-bold text-foreground">Os Nossos Catálogos</h2>
            <p className="text-[10px] text-muted-foreground">Selecione uma categoria</p>
          </div>
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            ← Voltar
          </Link>
        </div>
      </header>

      {/* Full-height grid that fills remaining space */}
      <div className="flex-1 p-3 min-h-0">
        <div className={`grid ${gridClass} gap-3 h-full`}>
          {categories.map((category) => {
            const catProducts = catalogProducts.filter((p) => p.category === category);
            const theme = CATEGORY_THEMES[category];
            const bgImage = theme?.bgImage || "/images/bg-outros.jpg";
            const icon = theme?.icon || "📦";

            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className="group relative rounded-xl overflow-hidden border border-border hover:ring-2 hover:ring-primary/40 transition-all"
              >
                {/* Background image */}
                <img
                  src={bgImage}
                  alt={category}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10 group-hover:from-black/80 transition-all" />

                {/* Content */}
                <div className="relative z-10 h-full flex flex-col items-center justify-center p-4">
                  <span className="text-3xl md:text-4xl mb-2 drop-shadow-lg">{icon}</span>
                  <h3 className="font-heading text-lg md:text-xl font-bold text-white drop-shadow-md">{category}</h3>
                  <p className="text-xs text-white/70 mt-1">
                    {catProducts.length} {catProducts.length === 1 ? "produto" : "produtos"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {categories.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center">
            <BookOpen className="h-16 w-16 text-muted-foreground/40" />
            <h3 className="mt-4 font-heading text-lg font-semibold text-foreground">Sem catálogos disponíveis</h3>
            <p className="mt-1 text-muted-foreground">Ainda não existem produtos no catálogo.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Catalogos;
