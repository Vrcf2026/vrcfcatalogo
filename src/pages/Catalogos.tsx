import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { CatalogViewer } from "@/components/CatalogViewer";
import { KilomatCatalogViewer } from "@/components/KilomatCatalogViewer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import vrcfLogo from "@/assets/vrcf-logo.png";

const CATEGORY_THEMES: Record<string, { icon: string; bgImage: string }> = {
  Laptops: { icon: "💻", bgImage: "/images/bg-laptops.jpg" },
  Smartphones: { icon: "📱", bgImage: "/images/bg-smartphones.jpg" },
  Gaming: { icon: "🎮", bgImage: "/images/bg-gaming.jpg" },
  Informatica: { icon: "🖥️", bgImage: "/images/bg-informatica.jpg" },
  "Segurança": { icon: "🔒", bgImage: "/images/bg-seguranca.jpg" },
  Economato: { icon: "📋", bgImage: "/images/bg-economato.jpg" },
  Kilomat: { icon: "🔧", bgImage: "/kilomat-catalog/page-01.png" },
  Outros: { icon: "🔧", bgImage: "/images/bg-outros.jpg" },
};

const Catalogos = () => {
  const [searchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("categories");

  useEffect(() => {
    const cat = searchParams.get("category");
    const brand = searchParams.get("brand");
    if (cat) setSelectedCategory(cat);
    else if (brand) { setSelectedBrand(brand); setActiveTab("brands"); }
  }, [searchParams]);

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: productImages = [] } = useQuery({
    queryKey: ["product_images"],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_images").select("*").order("position", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: families = [] } = useQuery({
    queryKey: ["families"],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_families").select("*").order("category", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brands").select("*").order("name", { ascending: true });
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
  const brandMap = Object.fromEntries(brands.map((b) => [b.id, b.name]));

  const catalogProducts = products.filter((p) => p.include_in_catalog);
  const dynamicCategories = [...new Set(catalogProducts.map((p) => p.category).filter(Boolean))] as string[];
  const categories = dynamicCategories.includes("Kilomat") ? dynamicCategories : [...dynamicCategories, "Kilomat"];
  const catalogBrands = brands.filter((b) => catalogProducts.some((p) => p.brand_id === b.id));

  const handleBack = () => { setSelectedCategory(null); setSelectedBrand(null); };

  // Brand-based catalog view
  if (selectedBrand) {
    const brandProducts = catalogProducts.filter((p) => {
      const brandName = p.brand_id ? brandMap[p.brand_id] : null;
      return brandName === selectedBrand;
    });
    return (
      <CatalogViewer category={selectedBrand} products={brandProducts} imagesByProduct={imagesByProduct} familyMap={familyMap} onBack={handleBack} />
    );
  }

  if (selectedCategory === "Kilomat") return <KilomatCatalogViewer onBack={handleBack} />;

  if (selectedCategory) {
    const categoryProducts = catalogProducts.filter((p) => p.category === selectedCategory);
    return (
      <CatalogViewer category={selectedCategory} products={categoryProducts} imagesByProduct={imagesByProduct} familyMap={familyMap} onBack={handleBack} />
    );
  }

  const getGridClass = (count: number) =>
    count <= 2 ? "grid-cols-2" : count <= 4 ? "grid-cols-2 grid-rows-2" : count <= 6 ? "grid-cols-3 grid-rows-2" : "grid-cols-3 grid-rows-3";

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
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
          </div>
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            ← Voltar
          </Link>
        </div>
      </header>

      <div className="flex-shrink-0 px-4 pt-3">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-md mx-auto">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="categories">Por Categoria</TabsTrigger>
            <TabsTrigger value="brands">Por Marca</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 p-3 min-h-0">
        {activeTab === "categories" && (
          <div className={`grid ${getGridClass(categories.length)} gap-3 h-full`}>
            {categories.map((category) => {
              const catProducts = category === "Kilomat" ? [] : catalogProducts.filter((p) => p.category === category);
              const isKilomat = category === "Kilomat";
              const productLabel = isKilomat ? "16 páginas" : `${catProducts.length} ${catProducts.length === 1 ? "produto" : "produtos"}`;
              const theme = CATEGORY_THEMES[category];
              const bgImage = theme?.bgImage || "/images/bg-outros.jpg";
              const icon = theme?.icon || "📦";

              return (
                <button
                  key={`cat-${category}`}
                  onClick={() => setSelectedCategory(category)}
                  className="group relative rounded-xl overflow-hidden border border-border hover:ring-2 hover:ring-primary/40 transition-all"
                >
                  <img src={bgImage} alt={category} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10 group-hover:from-black/80 transition-all" />
                  <div className="relative z-10 h-full flex flex-col items-center justify-center p-4">
                    <span className="text-3xl md:text-4xl mb-2 drop-shadow-lg">{icon}</span>
                    <h3 className="font-heading text-lg md:text-xl font-bold text-white drop-shadow-md">{category}</h3>
                    <p className="text-xs text-white/70 mt-1">{productLabel}</p>
                  </div>
                </button>
              );
            })}
            {categories.length === 0 && (
              <div className="col-span-full h-full flex flex-col items-center justify-center">
                <BookOpen className="h-16 w-16 text-muted-foreground/40" />
                <h3 className="mt-4 font-heading text-lg font-semibold text-foreground">Sem catálogos por categoria</h3>
              </div>
            )}
          </div>
        )}

        {activeTab === "brands" && (
          <div className={`grid ${getGridClass(catalogBrands.length)} gap-3 h-full`}>
            {catalogBrands.map((brand) => {
              const brandProducts = catalogProducts.filter((p) => p.brand_id === brand.id);
              return (
                <button
                  key={`brand-${brand.id}`}
                  onClick={() => setSelectedBrand(brand.name)}
                  className="group relative rounded-xl overflow-hidden border border-border hover:ring-2 hover:ring-primary/40 transition-all"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted-foreground/20" />
                  <div className="relative z-10 h-full flex flex-col items-center justify-center p-4">
                    <span className="text-3xl md:text-4xl mb-2">🏷️</span>
                    <h3 className="font-heading text-lg md:text-xl font-bold text-foreground drop-shadow-md">{brand.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{brandProducts.length} {brandProducts.length === 1 ? "produto" : "produtos"}</p>
                  </div>
                </button>
              );
            })}
            {catalogBrands.length === 0 && (
              <div className="col-span-full h-full flex flex-col items-center justify-center">
                <BookOpen className="h-16 w-16 text-muted-foreground/40" />
                <h3 className="mt-4 font-heading text-lg font-semibold text-foreground">Sem catálogos por marca</h3>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Catalogos;
