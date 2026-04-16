import { useEffect, useMemo, useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";
import vrcfLogo from "@/assets/vrcf-logo.png";
import vrcfShield from "@/assets/vrcf-shield.png";
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
  customLogoUrl?: string | null;
  customCoverUrl?: string | null;
  brandTheme?: { gradient: string; accent: string; pattern: string } | null;
}

const CATEGORY_THEMES: Record<string, { gradient: string; accent: string; icon: string; pattern: string; bgImage: string }> = {
  Laptops: { gradient: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0c4a6e 100%)", accent: "#3b82f6", icon: "💻", pattern: "radial-gradient(circle at 20% 80%, rgba(59,130,246,0.15) 0%, transparent 50%)", bgImage: "/images/bg-laptops.jpg" },
  Smartphones: { gradient: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)", accent: "#8b5cf6", icon: "📱", pattern: "radial-gradient(circle at 30% 70%, rgba(139,92,246,0.15) 0%, transparent 50%)", bgImage: "/images/bg-smartphones.jpg" },
  Gaming: { gradient: "linear-gradient(135deg, #0a0a0a 0%, #1a0a2e 50%, #2d1b69 100%)", accent: "#ec4899", icon: "🎮", pattern: "radial-gradient(circle at 50% 50%, rgba(236,72,153,0.1) 0%, transparent 40%)", bgImage: "/images/bg-gaming.jpg" },
  Informatica: { gradient: "linear-gradient(135deg, #0a1628 0%, #132744 50%, #1a3a5c 100%)", accent: "#38bdf8", icon: "🖥️", pattern: "radial-gradient(circle at 20% 80%, rgba(56,189,248,0.12) 0%, transparent 50%)", bgImage: "/images/bg-informatica.jpg" },
  "Segurança": { gradient: "linear-gradient(135deg, #1a0a0a 0%, #2d1210 50%, #451a15 100%)", accent: "#f97316", icon: "🔒", pattern: "radial-gradient(circle at 30% 70%, rgba(239,68,68,0.12) 0%, transparent 50%)", bgImage: "/images/bg-seguranca.jpg" },
  Economato: { gradient: "linear-gradient(135deg, #1c1917 0%, #2c2520 50%, #3d342a 100%)", accent: "#22c55e", icon: "📋", pattern: "radial-gradient(circle at 25% 75%, rgba(34,197,94,0.1) 0%, transparent 50%)", bgImage: "/images/bg-economato.jpg" },
  Outros: { gradient: "linear-gradient(135deg, #1c1917 0%, #292524 50%, #44403c 100%)", accent: "#f59e0b", icon: "🔧", pattern: "radial-gradient(circle at 25% 75%, rgba(245,158,11,0.12) 0%, transparent 50%)", bgImage: "/images/bg-outros.jpg" },
};

const DEFAULT_THEME = {
  gradient: "linear-gradient(135deg, #3d2200 0%, #804800 50%, #b36b00 100%)",
  accent: "#f59e0b",
  icon: "📦",
  pattern: "radial-gradient(circle at 30% 70%, rgba(251,146,60,0.15) 0%, transparent 50%)",
  bgImage: "/images/bg-outros.jpg",
};

/* A4 at 96dpi */
const PAGE_W = 794;
const PAGE_H = 1123;

const IMAGE_PROXY_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proxy-image`;

function getPdfSafeImageUrl(url: string | null | undefined) {
  if (!url) return null;
  const u = url.trim();
  if (!u) return null;
  if (u.startsWith("data:") || u.startsWith("blob:") || u.startsWith("/") || u.includes("/storage/v1/object/public/product-images/")) return u;
  return `${IMAGE_PROXY_BASE}?url=${encodeURIComponent(u)}`;
}

function getProductImage(product: CatalogProduct, imagesByProduct: Record<string, any[]>) {
  const imgs = imagesByProduct[product.id];
  if (imgs && imgs.length > 0) return imgs.sort((a: any, b: any) => a.position - b.position)[0].image_url;
  return product.image_url;
}

async function waitForImage(img: HTMLImageElement) {
  if (img.complete && img.naturalWidth > 0) {
    try { await img.decode(); } catch { /* ok */ }
    return;
  }
  await new Promise<void>((resolve) => {
    const done = () => resolve();
    img.addEventListener("load", done, { once: true });
    img.addEventListener("error", done, { once: true });
  });
  try { await img.decode(); } catch { /* ok */ }
}

async function waitForRenderableAssets(container: HTMLDivElement) {
  try { await document.fonts?.ready; } catch { /* ok */ }
  const images = Array.from(container.querySelectorAll("img"));
  await Promise.all(images.map((img) => waitForImage(img as HTMLImageElement)));
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

export function CatalogPdfRenderer({
  category, products, imagesByProduct, familyMap, onComplete,
  brandLogo, customLogoUrl, customCoverUrl, brandTheme,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pages = useMemo(() => buildCatalogFamilyPages(products, familyMap), [products, familyMap]);
  const isBrand = !CATEGORY_THEMES[category];
  const theme = brandTheme
    ? { ...DEFAULT_THEME, ...brandTheme, icon: DEFAULT_THEME.icon, bgImage: DEFAULT_THEME.bgImage }
    : (CATEGORY_THEMES[category] || DEFAULT_THEME);

  const coverBg = useMemo(() => {
    if (customCoverUrl) return getPdfSafeImageUrl(customCoverUrl);
    if (CATEGORY_THEMES[category]) return theme.bgImage;
    const feat = products.find((p) => p.featured) || products[0];
    return feat ? getPdfSafeImageUrl(getProductImage(feat, imagesByProduct)) || theme.bgImage : theme.bgImage;
  }, [category, customCoverUrl, imagesByProduct, products, theme.bgImage]);

  const brandLogoUrl = useMemo(() => getPdfSafeImageUrl(customLogoUrl || brandLogo), [brandLogo, customLogoUrl]);

  useEffect(() => {
    const generate = async () => {
      try {
        toast.info(`A gerar PDF "${category}"...`);
        const container = containerRef.current;
        if (!container) return;
        await waitForRenderableAssets(container);
        const pageEls = container.querySelectorAll("[data-pdf-page]");
        if (pageEls.length === 0) { toast.error("Sem páginas."); onComplete(); return; }
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        for (let i = 0; i < pageEls.length; i++) {
          const el = pageEls[i] as HTMLElement;
          const canvas = await html2canvas(el, {
            scale: 2, useCORS: true, allowTaint: false, backgroundColor: null,
            windowWidth: PAGE_W, windowHeight: PAGE_H, imageTimeout: 0, removeContainer: true, logging: false,
          });
          if (i > 0) pdf.addPage("a4", "portrait");
          pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 210, 297, undefined, "FAST");
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

  /* ── Shared sizes ── */
  const pad = 14;
  const headerH = 34;
  const footerH = 22;
  const gap = 6;
  const familyBarH = 44;

  /* ── Inline styles as objects for readability ── */
  const pageBase: React.CSSProperties = { width: PAGE_W, height: PAGE_H, position: "relative", overflow: "hidden" };

  return (
    <div ref={containerRef} style={{ position: "fixed", left: -20000, top: 0, pointerEvents: "none", width: PAGE_W }}>
      {/* ═══ COVER ═══ */}
      <div data-pdf-page style={{ ...pageBase, background: theme.gradient }}>
        {coverBg && (
          <>
            <img src={coverBg} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} crossOrigin="anonymous" loading="eager" />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.7) 100%)" }} />
          </>
        )}
        <div style={{ position: "absolute", inset: 0, background: theme.pattern }} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: theme.accent }} />
        <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1, padding: "0 60px" }}>
          <div style={{ position: "absolute", top: 28, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <img src={vrcfLogo} alt="VRCF" style={{ height: 112, width: 112, objectFit: "contain" }} crossOrigin="anonymous" loading="eager" />
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 9, letterSpacing: "0.4em", textTransform: "uppercase", marginTop: 4, fontWeight: 500 }}>Informática & Segurança</p>
          </div>
          {isBrand && brandLogoUrl ? (
            <div style={{ marginBottom: 26, width: 128, height: 128, borderRadius: 18, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, boxShadow: "0 24px 40px rgba(0,0,0,0.22)" }}>
              <img src={brandLogoUrl} alt={category} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} crossOrigin="anonymous" loading="eager" />
            </div>
          ) : (
            <div style={{ fontSize: 72, marginBottom: 24 }}>{theme.icon}</div>
          )}
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 42, height: 1, backgroundColor: `${theme.accent}80` }} />
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, fontWeight: 600, letterSpacing: "0.5em", textTransform: "uppercase", margin: 0 }}>{isBrand ? "Catálogo de Marca" : "Catálogo"}</p>
              <div style={{ width: 42, height: 1, backgroundColor: `${theme.accent}80` }} />
            </div>
            <h1 style={{ fontSize: 56, fontWeight: 700, color: "#fff", lineHeight: 1, margin: 0, textShadow: "0 10px 24px rgba(0,0,0,0.35)" }}>{category}</h1>
            <div style={{ width: 80, height: 4, borderRadius: 999, backgroundColor: theme.accent }} />
            <p style={{ color: "rgba(255,255,255,0.52)", fontSize: 16, fontWeight: 500, margin: 0 }}>{products.length} {products.length === 1 ? "produto" : "produtos"}</p>
          </div>
          <p style={{ position: "absolute", bottom: 36, color: "rgba(255,255,255,0.32)", fontSize: 9, letterSpacing: "0.12em", margin: 0 }}>Catálogo VRCF</p>
        </div>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, backgroundColor: `${theme.accent}60` }} />
      </div>

      {/* ═══ CONTENT PAGES ═══ */}
      {pages.map((page, pageIndex) => {
        /* Available height for the grid = PAGE_H - pad*2 - headerH - footerH - familyBarH - gaps */
        const gridAreaH = PAGE_H - pad * 2 - headerH - footerH - familyBarH - gap * 4;
        const gridAreaW = PAGE_W - pad * 2;
        const cardW = (gridAreaW - gap) / 2;
        const cardH = (gridAreaH - gap * 2) / 3;
        const imgH = Math.round(cardH * 0.58); /* matches 16/10 aspect ratio */
        const textPad = 6;

        return (
          <div key={pageIndex} data-pdf-page style={{ ...pageBase, background: "#fff" }}>
            <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: pad }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: headerH, marginBottom: gap, paddingBottom: gap, borderBottom: "1px solid #e5e5e5", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {brandLogoUrl ? (
                    <img src={brandLogoUrl} alt={category} style={{ height: 24, objectFit: "contain" }} crossOrigin="anonymous" loading="eager" />
                  ) : (
                    <img src={vrcfLogo} alt="VRCF" style={{ height: 24, width: 24, objectFit: "contain" }} crossOrigin="anonymous" loading="eager" />
                  )}
                  <span style={{ fontWeight: 700, fontSize: 13, color: "#1a1a1a" }}>{category}</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 500, color: theme.accent }}>VRCF</span>
              </div>

              {/* Family banner */}
              <div style={{ borderRadius: 10, overflow: "hidden", position: "relative", height: familyBarH, marginBottom: gap, flexShrink: 0, background: `linear-gradient(135deg, ${theme.accent}30, ${theme.accent}60)` }}>
                <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", alignItems: "center", gap: 8, padding: "0 14px" }}>
                  <div style={{ width: 4, height: 22, borderRadius: 999, backgroundColor: theme.accent }} />
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>{page.familyName}</h3>
                  {page.totalPagesInFamily > 1 && (
                    <span style={{ fontSize: 10, color: "#666", marginLeft: "auto" }}>
                      {page.pageNumberInFamily} / {page.totalPagesInFamily}
                    </span>
                  )}
                </div>
              </div>

              {/* Product grid 2x3 */}
              <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gridTemplateRows: "repeat(3, 1fr)", gap }}>
                {page.products.map((product) => {
                  const imgUrl = getPdfSafeImageUrl(getProductImage(product, imagesByProduct));
                  return (
                    <div key={product.id} style={{ display: "flex", flexDirection: "column", borderRadius: 8, overflow: "hidden", border: product.featured ? `2px solid ${theme.accent}` : "1px solid #eee", backgroundColor: product.featured ? "#fffbf0" : "#fff", position: "relative" }}>
                      {product.featured && (
                        <div style={{ position: "absolute", top: 0, left: 0, zIndex: 2, borderBottomRightRadius: 8, color: "#fff", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", backgroundColor: theme.accent, fontSize: 8, padding: "2px 6px" }}>
                          ★ Destaque
                        </div>
                      )}
                      <div style={{ height: imgH, flexShrink: 0, backgroundColor: "#f5f5f5", overflow: "hidden" }}>
                        {imgUrl ? (
                          <img src={imgUrl} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} crossOrigin="anonymous" loading="eager" />
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#ccc", fontSize: 28 }}>📷</div>
                        )}
                      </div>
                      <div style={{ padding: textPad, display: "flex", flexDirection: "column", flex: 1 }}>
                        <h4 style={{ margin: 0, fontSize: 11, fontWeight: 700, lineHeight: 1.25, color: "#1a1a1a", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>{product.name}</h4>
                        <div style={{ marginTop: "auto", paddingTop: 3 }}>
                          {product.price != null ? (
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>{product.price.toFixed(2).replace(".", ",")} €</span>
                          ) : (
                            <span style={{ fontSize: 10, color: "#aaa" }}>Consultar</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div style={{ height: footerH, marginTop: gap, paddingTop: gap, borderTop: "1px solid #eee", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 10, color: "#bbb", flexShrink: 0 }}>
                <span>Catálogo {category}</span>
                <span>{pageIndex + 1} / {pages.length}</span>
              </div>
            </div>
          </div>
        );
      })}

      {/* ═══ CONTACTS PAGE ═══ */}
      <div data-pdf-page style={{ ...pageBase, background: theme.gradient }}>
        <div style={{ position: "absolute", inset: 0, background: theme.pattern }} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: theme.accent }} />
        <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1, padding: "0 60px" }}>
          <img src={vrcfShield} alt="VRCF" style={{ height: 160, width: 160, objectFit: "contain", marginBottom: 26 }} crossOrigin="anonymous" loading="eager" />
          <h2 style={{ fontWeight: 700, fontSize: 34, color: "#fff", margin: "0 0 6px" }}>VRCF</h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, letterSpacing: "0.3em", textTransform: "uppercase", margin: "0 0 34px" }}>Informática & Segurança</p>
          <div style={{ width: 64, height: 1, backgroundColor: `${theme.accent}80`, marginBottom: 34 }} />
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 18 }}>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 16, margin: 0 }}>📞 +351 911 564 243</p>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 16, margin: 0 }}>✉️ geral@vrcf.pt</p>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 16, margin: 0 }}>📍 Rua Luis Calado Nunes 15 LJB — 2870-350 Montijo</p>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 16, margin: 0 }}>🌐 www.vrcf.pt</p>
          </div>
          <p style={{ position: "absolute", bottom: 28, color: "rgba(255,255,255,0.2)", fontSize: 9, letterSpacing: "0.1em", margin: 0 }}>
            © {new Date().getFullYear()} VRCF — Todos os direitos reservados
          </p>
        </div>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, backgroundColor: `${theme.accent}60` }} />
      </div>
    </div>
  );
}
