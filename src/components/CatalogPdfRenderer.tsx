import { useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";
import vrcfLogo from "@/assets/vrcf-logo.png";
import { buildCatalogFamilyPages } from "@/lib/catalogPagination";

interface CatalogProduct {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number | null;
  image_url: string | null;
  family_id: string | null;
  featured?: boolean;
}

interface Props {
  category: string;
  products: CatalogProduct[];
  imagesByProduct: Record<string, { id: string; image_url: string; position: number }[]>;
  familyMap: Record<string, string>;
  onComplete: () => void;
  brandLogo?: string | null;
}

const CATEGORY_THEMES: Record<string, { gradient: string; accent: string; icon: string }> = {
  Laptops: { gradient: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0c4a6e 100%)", accent: "#3b82f6", icon: "💻" },
  Smartphones: { gradient: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)", accent: "#8b5cf6", icon: "📱" },
  Gaming: { gradient: "linear-gradient(135deg, #0a0a0a 0%, #1a0a2e 50%, #2d1b69 100%)", accent: "#ec4899", icon: "🎮" },
  Informatica: { gradient: "linear-gradient(135deg, #0a1628 0%, #132744 50%, #1a3a5c 100%)", accent: "#38bdf8", icon: "🖥️" },
  "Segurança": { gradient: "linear-gradient(135deg, #1a0a0a 0%, #2d1210 50%, #451a15 100%)", accent: "#f97316", icon: "🔒" },
  Economato: { gradient: "linear-gradient(135deg, #1c1917 0%, #2c2520 50%, #3d342a 100%)", accent: "#22c55e", icon: "📋" },
  Outros: { gradient: "linear-gradient(135deg, #1c1917 0%, #292524 50%, #44403c 100%)", accent: "#f59e0b", icon: "🔧" },
};

const DEFAULT_THEME = { gradient: "linear-gradient(135deg, #3d2200 0%, #804800 50%, #b36b00 100%)", accent: "#f59e0b", icon: "📦" };

// Render dimensions in px (large enough for good detail)
const PAGE_W = 794;  // ~A4 proportion
const PAGE_H = 1123; // 794 * 297/210

// A4 in mm for jsPDF
const A4_W_MM = 210;
const A4_H_MM = 297;

function getProductImage(product: CatalogProduct, imagesByProduct: Record<string, any[]>) {
  const imgs = imagesByProduct[product.id];
  if (imgs && imgs.length > 0) return imgs.sort((a: any, b: any) => a.position - b.position)[0].image_url;
  return product.image_url;
}

export function CatalogPdfRenderer({ category, products, imagesByProduct, familyMap, onComplete, brandLogo }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const generate = async () => {
      try {
        toast.info(`A gerar PDF do catálogo "${category}"...`);

        const container = containerRef.current;
        if (!container) return;

        // Wait for images to load
        await new Promise((r) => setTimeout(r, 2000));

        const pageElements = container.querySelectorAll("[data-pdf-page]");
        if (pageElements.length === 0) {
          toast.error("Sem páginas para gerar.");
          onComplete();
          return;
        }

        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

        for (let i = 0; i < pageElements.length; i++) {
          const el = pageElements[i] as HTMLElement;
          const canvas = await html2canvas(el, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#ffffff",
            width: PAGE_W,
            height: PAGE_H,
          });

          const imgData = canvas.toDataURL("image/jpeg", 0.95);
          if (i > 0) pdf.addPage("a4", "portrait");
          pdf.addImage(imgData, "JPEG", 0, 0, A4_W_MM, A4_H_MM);
        }

        pdf.save(`Catalogo_${category.replace(/\s+/g, "_")}_VRCF.pdf`);
        toast.success(`PDF "${category}" descarregado!`);
      } catch (err) {
        console.error("PDF generation error:", err);
        toast.error("Erro ao gerar o PDF.");
      } finally {
        onComplete();
      }
    };

    generate();
  }, [category, onComplete]);

  const theme = CATEGORY_THEMES[category] || DEFAULT_THEME;
  const isBrand = !CATEGORY_THEMES[category];
  const pages = buildCatalogFamilyPages(products, familyMap);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        left: "-9999px",
        top: 0,
        zIndex: -1,
        opacity: 0,
        pointerEvents: "none",
      }}
    >
      {/* Cover page */}
      <div data-pdf-page style={{ width: PAGE_W, height: PAGE_H, position: "relative", overflow: "hidden", background: theme.gradient }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: theme.accent }} />
        <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 60px" }}>
          <img src={vrcfLogo} alt="VRCF" style={{ height: 90, width: 90, objectFit: "contain", marginBottom: 12 }} crossOrigin="anonymous" />
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, letterSpacing: "0.4em", textTransform: "uppercase", marginBottom: 50 }}>Informática & Segurança</p>
          
          {isBrand && brandLogo ? (
            <div style={{ width: 160, height: 160, borderRadius: 16, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, marginBottom: 30 }}>
              <img src={brandLogo} alt={category} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} crossOrigin="anonymous" />
            </div>
          ) : (
            <div style={{ fontSize: 80, marginBottom: 30 }}>{theme.icon}</div>
          )}
          
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, letterSpacing: "0.5em", textTransform: "uppercase", marginBottom: 16 }}>
            {isBrand ? "Catálogo de Marca" : "Catálogo"}
          </p>
          <h1 style={{ fontFamily: "sans-serif", fontSize: 56, fontWeight: "bold", color: "#fff", textAlign: "center", margin: 0 }}>{category}</h1>
          <div style={{ width: 100, height: 5, borderRadius: 2, backgroundColor: theme.accent, margin: "24px auto" }} />
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 18 }}>{products.length} {products.length === 1 ? "produto" : "produtos"}</p>
        </div>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, backgroundColor: `${theme.accent}80` }} />
      </div>

      {/* Product pages */}
      {pages.map((page, pageIndex) => (
        <div key={pageIndex} data-pdf-page style={{ width: PAGE_W, height: PAGE_H, background: "#fff", position: "relative", overflow: "hidden" }}>
          <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: 30 }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid #e5e5e5" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <img src={vrcfLogo} alt="VRCF" style={{ height: 28, width: 28, objectFit: "contain" }} crossOrigin="anonymous" />
                <span style={{ fontWeight: "bold", fontSize: 16, color: "#1a1a1a" }}>{category}</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: theme.accent }}>VRCF</span>
            </div>

            {/* Family header */}
            <div style={{ height: 50, borderRadius: 8, overflow: "hidden", marginBottom: 10, background: `linear-gradient(135deg, ${theme.accent}30, ${theme.accent}50)`, display: "flex", alignItems: "center", padding: "0 16px", gap: 10 }}>
              <div style={{ width: 4, height: 26, borderRadius: 2, backgroundColor: theme.accent }} />
              <span style={{ fontWeight: "bold", fontSize: 17, color: "#1a1a1a" }}>{page.familyName}</span>
              {page.totalPagesInFamily > 1 && (
                <span style={{ fontSize: 12, color: "#666", marginLeft: "auto" }}>
                  {page.pageNumberInFamily} / {page.totalPagesInFamily}
                </span>
              )}
            </div>

            {/* Products 2x2 grid */}
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gridTemplateRows: "repeat(2, 1fr)", gap: 14 }}>
              {page.products.map((product) => {
                const imgUrl = getProductImage(product, imagesByProduct);
                const descShort = product.description ? product.description.split("\n")[0].replace(/^•\s*/, "").slice(0, 60) : null;

                return (
                  <div key={product.id} style={{ border: product.featured ? `2px solid ${theme.accent}` : "1px solid #ddd", borderRadius: 8, overflow: "hidden", backgroundColor: product.featured ? "#fffbf0" : "#fff", display: "flex", flexDirection: "column" }}>
                    {product.featured && (
                      <div style={{ backgroundColor: theme.accent, color: "#fff", fontSize: 10, fontWeight: "bold", padding: "3px 10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>★ Destaque</div>
                    )}
                    <div style={{ flex: 1, backgroundColor: "#f5f5f5", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {imgUrl ? (
                        <img src={imgUrl} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} crossOrigin="anonymous" />
                      ) : (
                        <div style={{ color: "#ccc", fontSize: 32 }}>📷</div>
                      )}
                    </div>
                    <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                      <h4 style={{ fontSize: 14, fontWeight: "bold", color: "#1a1a1a", margin: 0, lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any }}>{product.name}</h4>
                      {descShort && <p style={{ fontSize: 11, color: "#888", margin: 0, lineHeight: 1.3 }}>{descShort}</p>}
                      <div style={{ marginTop: "auto", paddingTop: 5 }}>
                        {product.price != null ? (
                          <span style={{ fontWeight: "bold", fontSize: 16, color: "#1a1a1a" }}>{product.price.toFixed(2).replace(".", ",")} €</span>
                        ) : (
                          <span style={{ fontSize: 11, color: "#aaa" }}>Consultar</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #eee", display: "flex", justifyContent: "space-between", fontSize: 12, color: "#bbb" }}>
              <span>Catálogo {category}</span>
              <span>{pageIndex + 1} / {pages.length}</span>
            </div>
          </div>
        </div>
      ))}

      {/* Contacts page */}
      <div data-pdf-page style={{ width: PAGE_W, height: PAGE_H, position: "relative", overflow: "hidden", background: theme.gradient }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: theme.accent }} />
        <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 60px" }}>
          <img src={vrcfLogo} alt="VRCF" style={{ height: 100, width: 100, objectFit: "contain", marginBottom: 30 }} crossOrigin="anonymous" />
          
          {isBrand && brandLogo ? (
            <div style={{ width: 130, height: 130, borderRadius: 12, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, marginBottom: 24 }}>
              <img src={brandLogo} alt={category} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} crossOrigin="anonymous" />
            </div>
          ) : null}
          
          <h2 style={{ fontWeight: "bold", fontSize: 32, color: "#fff", margin: "0 0 8px" }}>{isBrand ? category : "VRCF"}</h2>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 15, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 40 }}>{isBrand ? "Catálogo de Marca • VRCF" : "Informática & Segurança"}</p>
          <div style={{ width: 80, height: 1, backgroundColor: `${theme.accent}80`, marginBottom: 40 }} />
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 20 }}>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 17, margin: 0 }}>📞 +351 911 564 243</p>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 17, margin: 0 }}>✉️ geral@vrcf.pt</p>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 17, margin: 0 }}>📍 Rua Luis Calado Nunes 15 LJB — 2870-350 Montijo</p>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 17, margin: 0 }}>🌐 www.vrcf.pt</p>
          </div>
          <p style={{ position: "absolute", bottom: 32, color: "rgba(255,255,255,0.15)", fontSize: 12, letterSpacing: "0.1em" }}>
            © {new Date().getFullYear()} VRCF — Todos os direitos reservados
          </p>
        </div>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, backgroundColor: `${theme.accent}80` }} />
      </div>
    </div>
  );
}
