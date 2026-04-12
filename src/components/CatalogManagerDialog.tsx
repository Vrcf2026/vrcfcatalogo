import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Download, Link2, Loader2, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { CatalogPdfRenderer } from "./CatalogPdfRenderer";

interface CatalogProduct {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number | null;
  image_url: string | null;
  family_id: string | null;
  brand_id?: string | null;
  featured?: boolean;
  include_in_catalog?: boolean;
}

interface CatalogManagerDialogProps {
  products: CatalogProduct[];
  imagesByProduct: Record<string, { id: string; image_url: string; position: number }[]>;
  familyMap: Record<string, string>;
  categories: string[];
  brands: { id: string; name: string; logo_url?: string | null }[];
  brandMap: Record<string, string>;
}

export function CatalogManagerDialog({ products, imagesByProduct, familyMap, categories, brands, brandMap }: CatalogManagerDialogProps) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [renderConfig, setRenderConfig] = useState<{ label: string; products: CatalogProduct[]; brandLogo?: string | null } | null>(null);

  const catalogProducts = products.filter((p) => p.include_in_catalog);
  const allCategories = [...new Set(catalogProducts.map((p) => p.category).filter(Boolean))] as string[];
  const allBrands = brands.filter((b) => catalogProducts.some((p) => p.brand_id === b.id));
  const featuredProducts = products.filter((p) => p.featured && p.include_in_catalog);

  const publishedUrl = "https://vrcfcatalogo.lovable.app";

  const handleCopyLink = (key?: string, type: "category" | "brand" | "all" = "all") => {
    let url = `${publishedUrl}/catalogos`;
    if (type === "category" && key) url += `?category=${encodeURIComponent(key)}`;
    if (type === "brand" && key) url += `?brand=${encodeURIComponent(key)}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(key || "__all__");
    toast.success("Link copiado!");
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleDownloadPdf = (label: string, filteredProducts: CatalogProduct[], brandLogo?: string | null) => {
    setDownloading(label);
    setRenderConfig({ label, products: filteredProducts, brandLogo });
  };

  const handlePdfReady = () => {
    setDownloading(null);
    setRenderConfig(null);
  };

  const CATEGORY_ICONS: Record<string, string> = {
    Laptops: "💻",
    Smartphones: "📱",
    Gaming: "🎮",
    Informatica: "🖥️",
    "Segurança": "🔒",
    Economato: "📋",
    Outros: "🔧",
  };

  const renderList = (
    items: { key: string; label: string; count: number; products: CatalogProduct[]; brandLogo?: string | null }[],
    type: "category" | "brand"
  ) => (
    <div className="space-y-2">
      {items.map((item) => {
        const isDownloading = downloading === item.key;
        const isCopied = copiedLink === item.key;
        const icon = type === "category" ? (CATEGORY_ICONS[item.label] || "📦") : "🏷️";

        return (
          <div key={item.key} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/20 transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-lg">{icon}</span>
              <div>
                <p className="font-medium text-sm text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.count} produtos</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
                const url = type === "category" ? `/catalogos?category=${encodeURIComponent(item.label)}` : `/catalogos?brand=${encodeURIComponent(item.label)}`;
                window.open(url, "_blank");
              }}>
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Abrir</span>
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleCopyLink(item.label, type)}>
                {isCopied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Link2 className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{isCopied ? "Copiado" : "Link"}</span>
              </Button>
              <Button variant="default" size="sm" className="gap-1.5" onClick={() => handleDownloadPdf(item.key, item.products, item.brandLogo)} disabled={isDownloading}>
                {isDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">PDF</span>
              </Button>
            </div>
          </div>
        );
      })}
      {items.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-4">Nenhum produto marcado para catálogo.</p>
      )}
    </div>
  );

  const categoryItems = allCategories.map((cat) => {
    const prods = catalogProducts.filter((p) => p.category === cat);
    return { key: cat, label: cat, count: prods.length, products: prods };
  });

  const brandItems = allBrands.map((b) => {
    const prods = catalogProducts.filter((p) => p.brand_id === b.id);
    return { key: b.id, label: b.name, count: prods.length, products: prods, brandLogo: b.logo_url };
  });

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Catálogos</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Gestão de Catálogos
            </DialogTitle>
          </DialogHeader>

          {/* Share all */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">📚</span>
              <div>
                <p className="font-medium text-sm text-foreground">Todos os Catálogos</p>
                <p className="text-xs text-muted-foreground">{allCategories.length} categorias · {allBrands.length} marcas</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleCopyLink()}>
              {copiedLink === "__all__" ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Link2 className="h-3.5 w-3.5" />}
              {copiedLink === "__all__" ? "Copiado" : "Copiar Link"}
            </Button>
          </div>

          <Tabs defaultValue="categories" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="categories">Categorias</TabsTrigger>
              <TabsTrigger value="brands">Marcas</TabsTrigger>
              <TabsTrigger value="hidden">Privados</TabsTrigger>
            </TabsList>
            <TabsContent value="categories" className="mt-3">
              {renderList(categoryItems, "category")}
            </TabsContent>
            <TabsContent value="brands" className="mt-3">
              {renderList(brandItems, "brand")}
            </TabsContent>
            <TabsContent value="hidden" className="mt-3">
              <p className="text-xs text-muted-foreground mb-3">Catálogos acessíveis apenas por link direto — não aparecem no índice público.</p>
              <div className="space-y-2">
                {/* Destaques */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⭐</span>
                    <div>
                      <p className="font-medium text-sm text-foreground">Destaques</p>
                      <p className="text-xs text-muted-foreground">{featuredProducts.length} produtos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.open("/catalogos/destaques", "_blank")}>
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Abrir</span>
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
                      navigator.clipboard.writeText(`${publishedUrl}/catalogos/destaques`);
                      setCopiedLink("__destaques__");
                      toast.success("Link copiado!");
                      setTimeout(() => setCopiedLink(null), 2000);
                    }}>
                      {copiedLink === "__destaques__" ? <Check className="h-3.5 w-3.5 text-primary" /> : <Link2 className="h-3.5 w-3.5" />}
                      <span className="hidden sm:inline">{copiedLink === "__destaques__" ? "Copiado" : "Link"}</span>
                    </Button>
                    <Button variant="default" size="sm" className="gap-1.5" onClick={() => handleDownloadPdf("Destaques", featuredProducts)} disabled={downloading === "Destaques"}>
                      {downloading === "Destaques" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      <span className="hidden sm:inline">PDF</span>
                    </Button>
                  </div>
                </div>
                {/* Kilomat */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🏷️</span>
                    <div>
                      <p className="font-medium text-sm text-foreground">Kilomat</p>
                      <p className="text-xs text-muted-foreground">Catálogo digitalizado</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.open("/catalogos/kilomat", "_blank")}>
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Abrir</span>
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
                      navigator.clipboard.writeText(`${publishedUrl}/catalogos/kilomat`);
                      setCopiedLink("__kilomat__");
                      toast.success("Link copiado!");
                      setTimeout(() => setCopiedLink(null), 2000);
                    }}>
                      {copiedLink === "__kilomat__" ? <Check className="h-3.5 w-3.5 text-primary" /> : <Link2 className="h-3.5 w-3.5" />}
                      <span className="hidden sm:inline">{copiedLink === "__kilomat__" ? "Copiado" : "Link"}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {renderConfig && (
        <CatalogPdfRenderer
          category={renderConfig.label}
          products={renderConfig.products}
          imagesByProduct={imagesByProduct}
          familyMap={familyMap}
          onComplete={handlePdfReady}
          brandLogo={renderConfig.brandLogo}
        />
      )}
    </>
  );
}
