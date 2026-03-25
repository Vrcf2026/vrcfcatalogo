import { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";
import vrcfLogo from "@/assets/vrcf-logo.png";

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

const CATEGORY_THEMES: Record<string, { gradient: string; accent: string; icon: string; bgImage: string }> = {
  Laptops: { gradient: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0c4a6e 100%)", accent: "#3b82f6", icon: "💻", bgImage: "/images/bg-laptops.jpg" },
  Smartphones: { gradient: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)", accent: "#8b5cf6", icon: "📱", bgImage: "/images/bg-smartphones.jpg" },
  Gaming: { gradient: "linear-gradient(135deg, #0a0a0a 0%, #1a0a2e 50%, #2d1b69 100%)", accent: "#ec4899", icon: "🎮", bgImage: "/images/bg-gaming.jpg" },
  Informatica: { gradient: "linear-gradient(135deg, #0a1628 0%, #132744 50%, #1a3a5c 100%)", accent: "#38bdf8", icon: "🖥️", bgImage: "/images/bg-informatica.jpg" },
  "Segurança": { gradient: "linear-gradient(135deg, #1a0a0a 0%, #2d1210 50%, #451a15 100%)", accent: "#f97316", icon: "🔒", bgImage: "/images/bg-seguranca.jpg" },
  Economato: { gradient: "linear-gradient(135deg, #1c1917 0%, #2c2520 50%, #3d342a 100%)", accent: "#22c55e", icon: "📋", bgImage: "/images/bg-economato.jpg" },
  Outros: { gradient: "linear-gradient(135deg, #1c1917 0%, #292524 50%, #44403c 100%)", accent: "#f59e0b", icon: "🔧", bgImage: "/images/bg-outros.jpg" },
};

const DEFAULT_THEME = { gradient: "linear-gradient(135deg, #3d2200 0%, #804800 50%, #b36b00 100%)", accent: "#f59e0b", icon: "📦", bgImage: "/images/bg-outros.jpg" };

function buildPages(products: CatalogProduct[], familyMap: Record<string, string>) {
  const sorted = [...products].sort((a, b) => (a.featured && !b.featured ? -1 : !a.featured && b.featured ? 1 : 0));
  const familyGroups: Record<string, CatalogProduct[]> = {};
  const noFamily: CatalogProduct[] = [];
  sorted.forEach((p) => {
    if (p.family_id && familyMap[p.family_id]) {
      const fname = familyMap[p.family_id];
      if (!familyGroups[fname]) familyGroups[fname] = [];
      familyGroups[fname].push(p);
    } else {
      noFamily.push(p);
    }
  });

  const allFamilies: { name: string; products: CatalogProduct[] }[] = [];
  Object.entries(familyGroups).forEach(([name, prods]) => allFamilies.push({ name, products: prods }));
  if (noFamily.length > 0) allFamilies.push({ name: "Outros", products: noFamily });

  const MAX_PRODUCTS = 6;
  const MAX_FAMILIES = 2;
  const pages: { families: { name: string; products: CatalogProduct[] }[] }[] = [];
  let currentFamilies: { name: string; products: CatalogProduct[] }[] = [];
  let currentCount = 0;

  allFamilies.forEach((family) => {
    let remaining = [...family.products];
    while (remaining.length > 0) {
      const spaceLeft = MAX_PRODUCTS - currentCount;
      const slotAvailable = currentFamilies.length < MAX_FAMILIES;
      if (spaceLeft <= 0 || !slotAvailable) {
        if (currentFamilies.length > 0) pages.push({ families: currentFamilies });
        currentFamilies = [];
        currentCount = 0;
        continue;
      }
      const take = remaining.splice(0, spaceLeft);
      currentFamilies.push({ name: family.name, products: take });
      currentCount += take.length;
      if (remaining.length > 0) {
        pages.push({ families: currentFamilies });
        currentFamilies = [];
        currentCount = 0;
      }
    }
  });
  if (currentFamilies.length > 0) pages.push({ families: currentFamilies });
  return pages;
}

function getProductImage(product: CatalogProduct, imagesByProduct: Record<string, any[]>) {
  const imgs = imagesByProduct[product.id];
  if (imgs && imgs.length > 0) return imgs.sort((a: any, b: any) => a.position - b.position)[0].image_url;
  return product.image_url;
}

export function CatalogPdfRenderer({ category, products, imagesByProduct, familyMap, onComplete }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const generate = async () => {
      try {
        toast.info(`A gerar PDF do catálogo "${category}"...`);

        const container = containerRef.current;
        if (!container) return;

        // Wait for images to load
        await new Promise((r) => setTimeout(r, 1500));

        const pageElements = container.querySelectorAll("[data-pdf-page]");
        if (pageElements.length === 0) {
          toast.error("Sem páginas para gerar.");
          onComplete();
          return;
        }

        const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [550, 750] });

        for (let i = 0; i < pageElements.length; i++) {
          const el = pageElements[i] as HTMLElement;
          const canvas = await html2canvas(el, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#ffffff",
            width: 550,
            height: 750,
          });

          const imgData = canvas.toDataURL("image/jpeg", 0.92);
          if (i > 0) pdf.addPage([550, 750]);
          pdf.addImage(imgData, "JPEG", 0, 0, 550, 750);
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
  const pages = buildPages(products, familyMap);

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
      <div data-pdf-page style={{ width: 550, height: 750, position: "relative", overflow: "hidden", background: theme.gradient }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: theme.accent }} />
        <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 40px" }}>
          <img src={vrcfLogo} alt="VRCF" style={{ height: 60, width: 60, objectFit: "contain", marginBottom: 8 }} crossOrigin="anonymous" />
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 8, letterSpacing: "0.4em", textTransform: "uppercase", marginBottom: 30 }}>Informática & Segurança</p>
          <div style={{ fontSize: 56, marginBottom: 20 }}>{theme.icon}</div>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, letterSpacing: "0.5em", textTransform: "uppercase", marginBottom: 12 }}>Catálogo</p>
          <h1 style={{ fontFamily: "sans-serif", fontSize: 42, fontWeight: "bold", color: "#fff", textAlign: "center", margin: 0 }}>{category}</h1>
          <div style={{ width: 80, height: 4, borderRadius: 2, backgroundColor: theme.accent, margin: "16px auto" }} />
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14 }}>{products.length} {products.length === 1 ? "produto" : "produtos"}</p>
        </div>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, backgroundColor: `${theme.accent}80` }} />
      </div>

      {/* Product pages */}
      {pages.map((page, pageIndex) => (
        <div key={pageIndex} data-pdf-page style={{ width: 550, height: 750, background: "#fff", position: "relative", overflow: "hidden" }}>
          <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: 20 }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, paddingBottom: 8, borderBottom: "1px solid #e5e5e5" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <img src={vrcfLogo} alt="VRCF" style={{ height: 20, width: 20, objectFit: "contain" }} crossOrigin="anonymous" />
                <span style={{ fontWeight: "bold", fontSize: 12, color: "#1a1a1a" }}>{category}</span>
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: theme.accent }}>VRCF</span>
            </div>

            {/* Families */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              {page.families.map((family, fi) => (
                <div key={fi} style={{ flex: page.families.length === 1 ? 1 : undefined, display: "flex", flexDirection: "column" }}>
                  {/* Family header */}
                  <div style={{ height: 40, borderRadius: 6, overflow: "hidden", marginBottom: 8, background: `linear-gradient(135deg, ${theme.accent}30, ${theme.accent}50)`, display: "flex", alignItems: "center", padding: "0 12px", gap: 8 }}>
                    <div style={{ width: 3, height: 20, borderRadius: 2, backgroundColor: theme.accent }} />
                    <span style={{ fontWeight: "bold", fontSize: 13, color: "#1a1a1a" }}>{family.name}</span>
                  </div>

                  {/* Products grid */}
                  <div style={{ display: "grid", gridTemplateColumns: page.families.length === 1 ? "repeat(3, 1fr)" : "repeat(2, 1fr)", gap: 8 }}>
                    {family.products.map((product) => {
                      const imgUrl = getProductImage(product, imagesByProduct);
                      const descShort = product.description ? product.description.split("\n")[0].replace(/^•\s*/, "").slice(0, 50) : null;

                      return (
                        <div key={product.id} style={{ border: product.featured ? `2px solid ${theme.accent}` : "1px solid #eee", borderRadius: 6, overflow: "hidden", backgroundColor: product.featured ? "#fffbf0" : "#fff", display: "flex", flexDirection: "column" }}>
                          {product.featured && (
                            <div style={{ backgroundColor: theme.accent, color: "#fff", fontSize: 7, fontWeight: "bold", padding: "2px 6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>★ Destaque</div>
                          )}
                          <div style={{ aspectRatio: "1/1", backgroundColor: "#f5f5f5", overflow: "hidden" }}>
                            {imgUrl ? (
                              <img src={imgUrl} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} crossOrigin="anonymous" />
                            ) : (
                              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#ccc", fontSize: 20 }}>📷</div>
                            )}
                          </div>
                          <div style={{ padding: 6, display: "flex", flexDirection: "column", gap: 2 }}>
                            <h4 style={{ fontSize: 10, fontWeight: "bold", color: "#1a1a1a", margin: 0, lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any }}>{product.name}</h4>
                            {descShort && <p style={{ fontSize: 8, color: "#888", margin: 0, lineHeight: 1.3 }}>{descShort}</p>}
                            <div style={{ marginTop: "auto", paddingTop: 4 }}>
                              {product.price != null ? (
                                <span style={{ fontWeight: "bold", fontSize: 11, color: "#1a1a1a" }}>{product.price.toFixed(2).replace(".", ",")} €</span>
                              ) : (
                                <span style={{ fontSize: 8, color: "#aaa" }}>Consultar</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #eee", display: "flex", justifyContent: "space-between", fontSize: 9, color: "#bbb" }}>
              <span>Catálogo {category}</span>
              <span>{pageIndex + 1} / {pages.length}</span>
            </div>
          </div>
        </div>
      ))}

      {/* Contacts page */}
      <div data-pdf-page style={{ width: 550, height: 750, position: "relative", overflow: "hidden", background: theme.gradient }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: theme.accent }} />
        <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 40px" }}>
          <img src={vrcfLogo} alt="VRCF" style={{ height: 80, width: 80, objectFit: "contain", marginBottom: 24 }} crossOrigin="anonymous" />
          <h2 style={{ fontWeight: "bold", fontSize: 24, color: "#fff", margin: "0 0 4px" }}>VRCF</h2>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 32 }}>Informática & Segurança</p>
          <div style={{ width: 64, height: 1, backgroundColor: `${theme.accent}80`, marginBottom: 32 }} />
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, margin: 0 }}>📞 +351 912 345 678</p>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, margin: 0 }}>✉️ info@vrcf.pt</p>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, margin: 0 }}>📍 Rua Exemplo, 123 — Lisboa</p>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, margin: 0 }}>🌐 www.vrcf.pt</p>
          </div>
          <p style={{ position: "absolute", bottom: 24, color: "rgba(255,255,255,0.15)", fontSize: 9, letterSpacing: "0.1em" }}>
            © {new Date().getFullYear()} VRCF — Todos os direitos reservados
          </p>
        </div>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, backgroundColor: `${theme.accent}80` }} />
      </div>
    </div>
  );
}
