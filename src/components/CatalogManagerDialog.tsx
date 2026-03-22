import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookOpen, Download, Link2, Loader2, Check } from "lucide-react";
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
  featured?: boolean;
  include_in_catalog?: boolean;
}

interface CatalogManagerDialogProps {
  products: CatalogProduct[];
  imagesByProduct: Record<string, { id: string; image_url: string; position: number }[]>;
  familyMap: Record<string, string>;
  categories: string[];
}

export function CatalogManagerDialog({ products, imagesByProduct, familyMap, categories }: CatalogManagerDialogProps) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [renderCategory, setRenderCategory] = useState<string | null>(null);

  const catalogProducts = products.filter((p) => p.include_in_catalog);
  const allCategories = [...new Set(catalogProducts.map((p) => p.category).filter(Boolean))] as string[];

  const publishedUrl = "https://vrcfcatalogo.lovable.app";

  const handleCopyLink = (category?: string) => {
    const url = category
      ? `${publishedUrl}/catalogos?category=${encodeURIComponent(category)}`
      : `${publishedUrl}/catalogos`;
    navigator.clipboard.writeText(url);
    setCopiedLink(category || "__all__");
    toast.success("Link copiado!");
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleDownloadPdf = (category: string) => {
    setDownloading(category);
    setRenderCategory(category);
  };

  const handlePdfReady = () => {
    setDownloading(null);
    setRenderCategory(null);
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

          <div className="space-y-2">
            {/* Share all */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <span className="text-lg">📚</span>
                <div>
                  <p className="font-medium text-sm text-foreground">Todos os Catálogos</p>
                  <p className="text-xs text-muted-foreground">{allCategories.length} categorias</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => handleCopyLink()}
              >
                {copiedLink === "__all__" ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Link2 className="h-3.5 w-3.5" />}
                {copiedLink === "__all__" ? "Copiado" : "Copiar Link"}
              </Button>
            </div>

            {/* Per category */}
            {allCategories.map((cat) => {
              const catProducts = catalogProducts.filter((p) => p.category === cat);
              const icon = CATEGORY_ICONS[cat] || "📦";
              const isDownloading = downloading === cat;
              const isCopied = copiedLink === cat;

              return (
                <div key={cat} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{icon}</span>
                    <div>
                      <p className="font-medium text-sm text-foreground">{cat}</p>
                      <p className="text-xs text-muted-foreground">{catProducts.length} produtos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => handleCopyLink(cat)}
                    >
                      {isCopied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Link2 className="h-3.5 w-3.5" />}
                      <span className="hidden sm:inline">{isCopied ? "Copiado" : "Link"}</span>
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => handleDownloadPdf(cat)}
                      disabled={isDownloading}
                    >
                      {isDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      <span className="hidden sm:inline">PDF</span>
                    </Button>
                  </div>
                </div>
              );
            })}

            {allCategories.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">
                Nenhum produto marcado para catálogo.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden PDF renderer */}
      {renderCategory && (
        <CatalogPdfRenderer
          category={renderCategory}
          products={catalogProducts.filter((p) => p.category === renderCategory)}
          imagesByProduct={imagesByProduct}
          familyMap={familyMap}
          onComplete={handlePdfReady}
        />
      )}
    </>
  );
}
