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
  Laptops: {
    gradient: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0c4a6e 100%)",
    accent: "#3b82f6",
    icon: "💻",
    pattern: "radial-gradient(circle at 20% 80%, rgba(59,130,246,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(14,165,233,0.1) 0%, transparent 50%)",
    bgImage: "/images/bg-laptops.jpg",
  },
  Smartphones: {
    gradient: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
    accent: "#8b5cf6",
    icon: "📱",
    pattern: "radial-gradient(circle at 30% 70%, rgba(139,92,246,0.15) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(99,102,241,0.1) 0%, transparent 50%)",
    bgImage: "/images/bg-smartphones.jpg",
  },
  Gaming: {
    gradient: "linear-gradient(135deg, #0a0a0a 0%, #1a0a2e 50%, #2d1b69 100%)",
    accent: "#ec4899",
    icon: "🎮",
    pattern: "radial-gradient(circle at 50% 50%, rgba(236,72,153,0.1) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(168,85,247,0.12) 0%, transparent 50%)",
    bgImage: "/images/bg-gaming.jpg",
  },
  Informatica: {
    gradient: "linear-gradient(135deg, #0a1628 0%, #132744 50%, #1a3a5c 100%)",
    accent: "#38bdf8",
    icon: "🖥️",
    pattern: "radial-gradient(circle at 20% 80%, rgba(56,189,248,0.12) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(59,130,246,0.1) 0%, transparent 50%)",
    bgImage: "/images/bg-informatica.jpg",
  },
  "Segurança": {
    gradient: "linear-gradient(135deg, #1a0a0a 0%, #2d1210 50%, #451a15 100%)",
    accent: "#f97316",
    icon: "🔒",
    pattern: "radial-gradient(circle at 30% 70%, rgba(239,68,68,0.12) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(251,146,60,0.1) 0%, transparent 50%)",
    bgImage: "/images/bg-seguranca.jpg",
  },
  Economato: {
    gradient: "linear-gradient(135deg, #1c1917 0%, #2c2520 50%, #3d342a 100%)",
    accent: "#22c55e",
    icon: "📋",
    pattern: "radial-gradient(circle at 25% 75%, rgba(34,197,94,0.1) 0%, transparent 50%), radial-gradient(circle at 75% 25%, rgba(132,204,22,0.08) 0%, transparent 50%)",
    bgImage: "/images/bg-economato.jpg",
  },
  Outros: {
    gradient: "linear-gradient(135deg, #1c1917 0%, #292524 50%, #44403c 100%)",
    accent: "#f59e0b",
    icon: "🔧",
    pattern: "radial-gradient(circle at 25% 75%, rgba(245,158,11,0.12) 0%, transparent 50%), radial-gradient(circle at 75% 25%, rgba(251,146,60,0.08) 0%, transparent 50%)",
    bgImage: "/images/bg-outros.jpg",
  },
};

const DEFAULT_THEME = {
  gradient: "linear-gradient(135deg, #3d2200 0%, #804800 50%, #b36b00 100%)",
  accent: "#f59e0b",
  icon: "📦",
  pattern: "radial-gradient(circle at 30% 70%, rgba(251,146,60,0.15) 0%, transparent 50%)",
  bgImage: "/images/bg-outros.jpg",
};

const PAGE_W = 794;
const PAGE_H = 1123;
const PDF_LAYOUT_SCALE = 1.2;

const A4_W_MM = 210;
const A4_H_MM = 297;
const IMAGE_PROXY_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proxy-image`;

function getPdfSafeImageUrl(url: string | null | undefined) {
  if (!url) return null;

  const normalizedUrl = url.trim();
  if (!normalizedUrl) return null;

  if (
    normalizedUrl.startsWith("data:") ||
    normalizedUrl.startsWith("blob:") ||
    normalizedUrl.startsWith("/") ||
    normalizedUrl.includes("/storage/v1/object/public/product-images/")
  ) {
    return normalizedUrl;
  }

  return `${IMAGE_PROXY_BASE}?url=${encodeURIComponent(normalizedUrl)}`;
}

function getProductImage(product: CatalogProduct, imagesByProduct: Record<string, any[]>) {
  const imgs = imagesByProduct[product.id];
  if (imgs && imgs.length > 0) return imgs.sort((a: any, b: any) => a.position - b.position)[0].image_url;
  return product.image_url;
}

async function waitForImage(img: HTMLImageElement) {
  if (img.complete && img.naturalWidth > 0) {
    if (typeof img.decode === "function") {
      try {
        await img.decode();
      } catch {
        return;
      }
    }
    return;
  }

  await new Promise<void>((resolve) => {
    const done = () => resolve();
    img.addEventListener("load", done, { once: true });
    img.addEventListener("error", done, { once: true });
  });

  if (typeof img.decode === "function") {
    try {
      await img.decode();
    } catch {
      return;
    }
  }
}

async function waitForRenderableAssets(container: HTMLDivElement) {
  const fontsReady = document.fonts?.ready?.catch(() => undefined);
  if (fontsReady) await fontsReady;

  const images = Array.from(container.querySelectorAll("img"));
  await Promise.all(images.map((img) => waitForImage(img as HTMLImageElement)));

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export function CatalogPdfRenderer({
  category,
  products,
  imagesByProduct,
  familyMap,
  onComplete,
  brandLogo,
  customLogoUrl,
  customCoverUrl,
  brandTheme,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pages = useMemo(() => buildCatalogFamilyPages(products, familyMap), [products, familyMap]);
  const isBrand = !CATEGORY_THEMES[category];
  const pageTheme = brandTheme
    ? { ...DEFAULT_THEME, ...brandTheme, icon: DEFAULT_THEME.icon, bgImage: DEFAULT_THEME.bgImage }
    : (CATEGORY_THEMES[category] || DEFAULT_THEME);
  const rawCoverBgImage = useMemo(() => {
    if (customCoverUrl) return customCoverUrl;
    if (CATEGORY_THEMES[category]) return pageTheme.bgImage;

    const featured = products.find((product) => product.featured);
    const firstProduct = featured || products[0];
    return firstProduct ? getProductImage(firstProduct, imagesByProduct) || pageTheme.bgImage : pageTheme.bgImage;
  }, [category, customCoverUrl, imagesByProduct, pageTheme.bgImage, products]);
  const coverBgImage = useMemo(() => getPdfSafeImageUrl(rawCoverBgImage), [rawCoverBgImage]);
  const effectiveBrandLogo = useMemo(() => getPdfSafeImageUrl(customLogoUrl || brandLogo), [brandLogo, customLogoUrl]);
  const contentBgImage = useMemo(() => getPdfSafeImageUrl(pageTheme.bgImage), [pageTheme.bgImage]);

  useEffect(() => {
    const generate = async () => {
      try {
        toast.info(`A gerar PDF do catálogo "${category}"...`);

        const container = containerRef.current;
        if (!container) return;

        await waitForRenderableAssets(container);

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
            allowTaint: false,
            backgroundColor: null,
            windowWidth: PAGE_W,
            windowHeight: PAGE_H,
            imageTimeout: 0,
            removeContainer: true,
            logging: false,
          });

          const imgData = canvas.toDataURL("image/png");
          if (i > 0) pdf.addPage("a4", "portrait");
          pdf.addImage(imgData, "PNG", 0, 0, A4_W_MM, A4_H_MM, undefined, "FAST");
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

  const pagePad = Math.round(12 * PDF_LAYOUT_SCALE);
  const headerH = Math.round(28 * PDF_LAYOUT_SCALE);
  const footerH = Math.round(20 * PDF_LAYOUT_SCALE);
  const gapSize = Math.round(4 * PDF_LAYOUT_SCALE);
  const cardPad = Math.round(4 * PDF_LAYOUT_SCALE);
  const fontTitle = Math.max(12, Math.round(10 * PDF_LAYOUT_SCALE));
  const fontDesc = Math.max(10, Math.round(8 * PDF_LAYOUT_SCALE));
  const fontPrice = Math.max(14, Math.round(11 * PDF_LAYOUT_SCALE));
  const fontHeader = Math.max(12, Math.round(10 * PDF_LAYOUT_SCALE));
  const logoH = Math.round(20 * PDF_LAYOUT_SCALE);
  const metaFont = Math.max(10, Math.round(8 * PDF_LAYOUT_SCALE));
  const familyHeaderH = Math.round(40 * PDF_LAYOUT_SCALE);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        left: "-20000px",
        top: 0,
        pointerEvents: "none",
        width: PAGE_W,
      }}
    >
      <div data-pdf-page style={{ width: PAGE_W, height: PAGE_H, position: "relative", overflow: "hidden", background: pageTheme.gradient }}>
        {coverBgImage ? (
          <>
            <img src={coverBgImage} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} crossOrigin="anonymous" loading="eager" />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.7) 100%)" }} />
          </>
        ) : null}
        <div style={{ position: "absolute", inset: 0, background: pageTheme.pattern }} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: pageTheme.accent }} />

        <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1, padding: "0 60px" }}>
          <div style={{ position: "absolute", top: 28, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <img src={vrcfLogo} alt="VRCF" style={{ height: 112, width: 112, objectFit: "contain" }} crossOrigin="anonymous" loading="eager" />
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 9, letterSpacing: "0.4em", textTransform: "uppercase", marginTop: 4, fontWeight: 500 }}>Informática & Segurança</p>
          </div>

          {isBrand && effectiveBrandLogo ? (
            <div style={{ marginBottom: 26, width: 128, height: 128, borderRadius: 18, background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, boxShadow: "0 24px 40px rgba(0,0,0,0.22)" }}>
              <img src={effectiveBrandLogo} alt={category} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} crossOrigin="anonymous" loading="eager" />
            </div>
          ) : (
            <div style={{ fontSize: 72, marginBottom: 24 }}>{pageTheme.icon}</div>
          )}

          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 42, height: 1, backgroundColor: `${pageTheme.accent}80` }} />
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, fontWeight: 600, letterSpacing: "0.5em", textTransform: "uppercase", margin: 0 }}>
                {isBrand ? "Catálogo de Marca" : "Catálogo"}
              </p>
              <div style={{ width: 42, height: 1, backgroundColor: `${pageTheme.accent}80` }} />
            </div>

            <h1 style={{ fontSize: 56, fontWeight: 700, color: "#fff", lineHeight: 1, letterSpacing: "-0.02em", textAlign: "center", margin: 0, textShadow: "0 10px 24px rgba(0,0,0,0.35)" }}>{category}</h1>
            <div style={{ width: 80, height: 4, borderRadius: 999, backgroundColor: pageTheme.accent }} />
            <p style={{ color: "rgba(255,255,255,0.52)", fontSize: 16, fontWeight: 500, margin: 0 }}>{products.length} {products.length === 1 ? "produto" : "produtos"}</p>
          </div>

          <div style={{ position: "absolute", bottom: 36, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ width: 22, height: 32, borderRadius: 999, border: "1px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 4 }}>
              <div style={{ width: 4, height: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.55)" }} />
            </div>
            <p style={{ color: "rgba(255,255,255,0.32)", fontSize: 9, letterSpacing: "0.12em", margin: 0 }}>Catálogo VRCF</p>
          </div>
        </div>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, backgroundColor: `${pageTheme.accent}60` }} />
      </div>

      {pages.map((page, pageIndex) => (
        <div key={pageIndex} data-pdf-page style={{ width: PAGE_W, height: PAGE_H, background: "#fff", position: "relative", overflow: "hidden" }}>
          {pageTheme.bgImage ? (
            <div style={{ position: "absolute", inset: 0 }}>
              <img src={pageTheme.bgImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} crossOrigin="anonymous" loading="eager" />
              <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.90)" }} />
            </div>
          ) : null}

          <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", padding: pagePad }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: headerH, marginBottom: gapSize, paddingBottom: gapSize, borderBottom: "1px solid #e5e5e5", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: gapSize }}>
               {effectiveBrandLogo ? (
                   <img src={effectiveBrandLogo} alt={category} style={{ height: logoH, objectFit: "contain" }} crossOrigin="anonymous" loading="eager" />
                ) : (
                  <img src={vrcfLogo} alt="VRCF" style={{ height: logoH, width: logoH, objectFit: "contain" }} crossOrigin="anonymous" loading="eager" />
                )}
                <span style={{ fontWeight: 700, fontSize: fontHeader, color: "#1a1a1a" }}>{category}</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 500, color: pageTheme.accent }}>VRCF</span>
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", gap: gapSize }}>
              {page.products.length === 0 ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: fontDesc }}>
                  Nenhum produto encontrado
                </div>
              ) : (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                  <div style={{ borderRadius: 10, overflow: "hidden", position: "relative", height: familyHeaderH, marginBottom: 6 }}>
                    {contentBgImage ? (
                      <>
                        <img src={contentBgImage} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} crossOrigin="anonymous" loading="eager" />
                        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} />
                      </>
                    ) : (
                      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${pageTheme.accent}20, ${pageTheme.accent}40)` }} />
                    )}
                    <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", alignItems: "center", gap: 8, padding: "0 12px" }}>
                      <div style={{ width: 4, height: 24, borderRadius: 999, backgroundColor: pageTheme.accent }} />
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: 0, textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>{page.familyName}</h3>
                    </div>
                  </div>

                  <div style={{ minHeight: 16, marginBottom: gapSize }}>
                    {page.totalPagesInFamily > 1 ? (
                      <p style={{ fontSize: metaFont, color: "#666", margin: 0 }}>
                        {page.pageNumberInFamily} / {page.totalPagesInFamily} da família {page.familyName}
                      </p>
                    ) : null}
                  </div>

                  <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gridTemplateRows: "repeat(2, minmax(0, 1fr))", gap: gapSize }}>
                    {page.products.map((product) => {
                      const imgUrl = getPdfSafeImageUrl(getProductImage(product, imagesByProduct));
                      const descShort = product.description ? product.description.split("\n")[0].replace(/^•\s*/, "").slice(0, 50) : null;

                      return (
                        <div key={product.id} style={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column", borderRadius: 8, overflow: "hidden", position: "relative", border: product.featured ? `2px solid ${pageTheme.accent}` : "1px solid #eee", backgroundColor: product.featured ? "#fffbf0" : "#fff" }}>
                          {product.featured ? (
                            <div style={{ position: "absolute", top: 0, left: 0, zIndex: 2, borderBottomRightRadius: 8, color: "#fff", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", backgroundColor: pageTheme.accent, fontSize: 8, padding: "2px 6px" }}>
                              ★ Destaque
                            </div>
                          ) : null}

                          <div style={{ position: "relative", overflow: "hidden", flexShrink: 0, backgroundColor: "#f5f5f5", aspectRatio: "4 / 3" }}>
                            {imgUrl ? (
                              <img src={imgUrl} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} crossOrigin="anonymous" loading="eager" />
                            ) : (
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#ccc", fontSize: 28 }}>📷</div>
                            )}
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, padding: cardPad, gap: 3 }}>
                            <h4 style={{ margin: 0, fontSize: fontTitle, fontWeight: 700, lineHeight: 1.2, color: "#1a1a1a", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
                              {product.name}
                            </h4>

                            {descShort ? (
                              <p style={{ margin: 0, fontSize: fontDesc, lineHeight: 1.25, color: "#888", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" as const }}>
                                {descShort}
                              </p>
                            ) : null}

                            <div style={{ marginTop: "auto", paddingTop: 3 }}>
                              {product.price != null ? (
                                <span style={{ fontSize: fontPrice, fontWeight: 700, color: "#1a1a1a" }}>{product.price.toFixed(2).replace(".", ",")} €</span>
                              ) : (
                                <span style={{ fontSize: fontDesc, color: "#aaa" }}>Consultar</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div style={{ height: footerH, marginTop: gapSize, paddingTop: gapSize, borderTop: "1px solid #eee", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: metaFont, color: "#bbb", flexShrink: 0 }}>
              <span>Catálogo {category}</span>
              <span>{pageIndex + 1} / {pages.length}</span>
            </div>
          </div>
        </div>
      ))}

      <div data-pdf-page style={{ width: PAGE_W, height: PAGE_H, position: "relative", overflow: "hidden", background: pageTheme.gradient }}>
        <div style={{ position: "absolute", inset: 0, background: pageTheme.pattern }} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: pageTheme.accent }} />
        <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1, padding: "0 60px" }}>
          <img src={vrcfShield} alt="VRCF" style={{ height: 160, width: 160, objectFit: "contain", marginBottom: 26 }} crossOrigin="anonymous" loading="eager" />
          <h2 style={{ fontWeight: 700, fontSize: 34, color: "#fff", margin: "0 0 6px" }}>VRCF</h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, letterSpacing: "0.3em", textTransform: "uppercase", margin: "0 0 34px" }}>Informática & Segurança</p>
          <div style={{ width: 64, height: 1, backgroundColor: `${pageTheme.accent}80`, marginBottom: 34 }} />
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
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, backgroundColor: `${pageTheme.accent}60` }} />
      </div>
    </div>
  );
}
