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

// A4 at 72 DPI
const A4_W = 595;
const A4_H = 842;

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

        const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

        for (let i = 0; i < pageElements.length; i++) {
          const el = pageElements[i] as HTMLElement;
          const canvas = await html2canvas(el, {
            scale: 3,
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#ffffff",
            width: A4_W,
            height: A4_H,
          });

          const imgData = canvas.toDataURL("image/jpeg", 0.95);
          if (i > 0) pdf.addPage("a4", "portrait");
          pdf.addImage(imgData, "JPEG", 0, 0, A4_W, A4_H);
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
      <div data-pdf-page style={{ width: A4_W, height: A4_H, position: "relative", overflow: "hidden", background: theme.gradient }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: theme.accent }} />
        <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 50px" }}>
          <img src={vrcfLogo} alt="VRCF" style={{ height: 70, width: 70, objectFit: "contain", marginBottom: 10 }} crossOrigin="anonymous" />
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 9, letterSpacing: "0.4em", textTransform: "uppercase", marginBottom: 40 }}>Informática & Segurança</p>
          
          {isBrand && brandLogo ? (
            <div style={{ width: 140, height: 140, borderRadius: 16, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, marginBottom: 24 }}>
              <img src={brandLogo} alt={category} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} crossOrigin="anonymous" />
            </div>
          ) : (
            <div style={{ fontSize: 64, marginBottom: 24 }}>{theme.icon}</div>
          )}
          
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, letterSpacing: "0.5em", textTransform: "uppercase", marginBottom: 14 }}>
            {isBrand ? "Catálogo de Marca" : "Catálogo"}
          </p>
          <h1 style={{ fontFamily: "sans-serif", fontSize: 48, fontWeight: "bold", color: "#fff", textAlign: "center", margin: 0 }}>{category}</h1>
          <div style={{ width: 90, height: 4, borderRadius: 2, backgroundColor: theme.accent, margin: "20px auto" }} />
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 15 }}>{products.length} {products.length === 1 ? "produto" : "produtos"}</p>
        </div>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, backgroundColor: `${theme.accent}80` }} />
      </div>

      {/* Product pages */}
      {pages.map((page, pageIndex) => (
        <div key={pageIndex} data-pdf-page style={{ width: A4_W, height: A4_H, background: "#fff", position: "relative", overflow: "hidden" }}>
          <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: 24 }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid #e5e5e5" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <img src={vrcfLogo} alt="VRCF" style={{ height: 22, width: 22, objectFit: "contain" }} crossOrigin="anonymous" />
                <span style={{ fontWeight: "bold", fontSize: 13, color: "#1a1a1a" }}>{category}</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: theme.accent }}>VRCF</span>
            </div>

            {/* Family header */}
            <div style={{ height: 44, borderRadius: 6, overflow: "hidden", marginBottom: 6, background: `linear-gradient(135deg, ${theme.accent}30, ${theme.accent}50)`, display: "flex", alignItems: "center", padding: "0 14px", gap: 8 }}>
              <div style={{ width: 3, height: 22, borderRadius: 2, backgroundColor: theme.accent }} />
              <span style={{ fontWeight: "bold", fontSize: 14, color: "#1a1a1a" }}>{page.familyName}</span>
              {page.totalPagesInFamily > 1 && (
                <span style={{ fontSize: 10, color: "#666", marginLeft: "auto" }}>
                  {page.pageNumberInFamily} / {page.totalPagesInFamily}
                </span>
              )}
            </div>

            {/* Products 2x2 grid */}
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gridTemplateRows: "repeat(2, 1fr)", gap: 10 }}>
              {page.products.map((product) => {
                const imgUrl = getProductImage(product, imagesByProduct);
                const descShort = product.description ? product.description.split("\n")[0].replace(/^•\s*/, "").slice(0, 60) : null;

                return (
                  <div key={product.id} style={{ border: product.featured ? `2px solid ${theme.accent}` : "1px solid #eee", borderRadius: 6, overflow: "hidden", backgroundColor: product.featured ? "#fffbf0" : "#fff", display: "flex", flexDirection: "column" }}>
                    {product.featured && (
                      <div style={{ backgroundColor: theme.accent, color: "#fff", fontSize: 8, fontWeight: "bold", padding: "2px 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>★ Destaque</div>
                    )}
                    <div style={{ flex: 1, backgroundColor: "#f5f5f5", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {imgUrl ? (
                        <img src={imgUrl} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} crossOrigin="anonymous" />
                      ) : (
                        <div style={{ color: "#ccc", fontSize: 24 }}>📷</div>
                      )}
                    </div>
                    <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 3 }}>
                      <h4 style={{ fontSize: 12, fontWeight: "bold", color: "#1a1a1a", margin: 0, lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any }}>{product.name}</h4>
                      {descShort && <p style={{ fontSize: 9, color: "#888", margin: 0, lineHeight: 1.3 }}>{descShort}</p>}
                      <div style={{ marginTop: "auto", paddingTop: 4 }}>
                        {product.price != null ? (
                          <span style={{ fontWeight: "bold", fontSize: 13, color: "#1a1a1a" }}>{product.price.toFixed(2).replace(".", ",")} €</span>
                        ) : (
                          <span style={{ fontSize: 9, color: "#aaa" }}>Consultar</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #eee", display: "flex", justifyContent: "space-between", fontSize: 10, color: "#bbb" }}>
              <span>Catálogo {category}</span>
              <span>{pageIndex + 1} / {pages.length}</span>
            </div>
          </div>
        </div>
      ))}

      {/* Contacts page */}
      <div data-pdf-page style={{ width: A4_W, height: A4_H, position: "relative", overflow: "hidden", background: theme.gradient }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: theme.accent }} />
        <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 50px" }}>
          <img src={vrcfLogo} alt="VRCF" style={{ height: 90, width: 90, objectFit: "contain", marginBottom: 28 }} crossOrigin="anonymous" />
          
          {isBrand && brandLogo ? (
            <div style={{ width: 110, height: 110, borderRadius: 12, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", padding: 14, marginBottom: 20 }}>
              <img src={brandLogo} alt={category} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} crossOrigin="anonymous" />
            </div>
          ) : null}
          
          <h2 style={{ fontWeight: "bold", fontSize: 28, color: "#fff", margin: "0 0 6px" }}>{isBrand ? category : "VRCF"}</h2>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 36 }}>{isBrand ? "Catálogo de Marca • VRCF" : "Informática & Segurança"}</p>
          <div style={{ width: 72, height: 1, backgroundColor: `${theme.accent}80`, marginBottom: 36 }} />
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 18 }}>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, margin: 0 }}>📞 +351 911 564 243</p>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, margin: 0 }}>✉️ geral@vrcf.pt</p>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, margin: 0 }}>📍 Rua Luis Calado Nunes 15 LJB — 2870-350 Montijo</p>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, margin: 0 }}>🌐 www.vrcf.pt</p>
          </div>
          <p style={{ position: "absolute", bottom: 28, color: "rgba(255,255,255,0.15)", fontSize: 10, letterSpacing: "0.1em" }}>
            © {new Date().getFullYear()} VRCF — Todos os direitos reservados
          </p>
        </div>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, backgroundColor: `${theme.accent}80` }} />
      </div>
    </div>
  );
}
