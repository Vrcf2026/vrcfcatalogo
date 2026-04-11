import { useState, useMemo, useRef, useCallback, forwardRef, useEffect } from "react";
import { trackEvent } from "@/lib/trackEvent";
import HTMLFlipBook from "react-pageflip";
import {
  ChevronLeft,
  ChevronRight,
  ImageOff,
  Search,
  X,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize,
  Grid3X3,
  Phone,
  Mail,
  MapPin,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductDetailDialog } from "@/components/ProductDetailDialog";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import vrcfLogo from "@/assets/vrcf-logo.png";
import vrcfShield from "@/assets/vrcf-shield.png";

const WHATSAPP_NUMBER = "351911564243";

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

interface CatalogViewerProps {
  category: string;
  products: CatalogProduct[];
  imagesByProduct: Record<string, { id: string; image_url: string; position: number }[]>;
  familyMap: Record<string, string>;
  onBack: () => void;
  productsPerPage?: number;
  brandLogo?: string | null;
  brandTheme?: { gradient: string; accent: string; pattern: string } | null;
  customLogoUrl?: string | null;
  customCoverUrl?: string | null;
}

// Flipbook page wrapper
const FlipPage = forwardRef<HTMLDivElement, { children: React.ReactNode }>(
  ({ children }, ref) => (
    <div ref={ref} className="bg-white dark:bg-gray-50 h-full w-full overflow-hidden shadow-lg">
      {children}
    </div>
  )
);
FlipPage.displayName = "FlipPage";

// Category themes
const CATEGORY_THEMES: Record<string, { gradient: string; icon: string; pattern: string; accent: string; bgImage: string }> = {
  Laptops: {
    gradient: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0c4a6e 100%)",
    icon: "💻",
    pattern: "radial-gradient(circle at 20% 80%, rgba(59,130,246,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(14,165,233,0.1) 0%, transparent 50%)",
    accent: "#3b82f6",
    bgImage: "/images/bg-laptops.jpg",
  },
  Smartphones: {
    gradient: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
    icon: "📱",
    pattern: "radial-gradient(circle at 30% 70%, rgba(139,92,246,0.15) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(99,102,241,0.1) 0%, transparent 50%)",
    accent: "#8b5cf6",
    bgImage: "/images/bg-smartphones.jpg",
  },
  Gaming: {
    gradient: "linear-gradient(135deg, #0a0a0a 0%, #1a0a2e 50%, #2d1b69 100%)",
    icon: "🎮",
    pattern: "radial-gradient(circle at 50% 50%, rgba(236,72,153,0.1) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(168,85,247,0.12) 0%, transparent 50%)",
    accent: "#ec4899",
    bgImage: "/images/bg-gaming.jpg",
  },
  Informatica: {
    gradient: "linear-gradient(135deg, #0a1628 0%, #132744 50%, #1a3a5c 100%)",
    icon: "🖥️",
    pattern: "radial-gradient(circle at 20% 80%, rgba(56,189,248,0.12) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(59,130,246,0.1) 0%, transparent 50%)",
    accent: "#38bdf8",
    bgImage: "/images/bg-informatica.jpg",
  },
  "Segurança": {
    gradient: "linear-gradient(135deg, #1a0a0a 0%, #2d1210 50%, #451a15 100%)",
    icon: "🔒",
    pattern: "radial-gradient(circle at 30% 70%, rgba(239,68,68,0.12) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(251,146,60,0.1) 0%, transparent 50%)",
    accent: "#f97316",
    bgImage: "/images/bg-seguranca.jpg",
  },
  Economato: {
    gradient: "linear-gradient(135deg, #1c1917 0%, #2c2520 50%, #3d342a 100%)",
    icon: "📋",
    pattern: "radial-gradient(circle at 25% 75%, rgba(34,197,94,0.1) 0%, transparent 50%), radial-gradient(circle at 75% 25%, rgba(132,204,22,0.08) 0%, transparent 50%)",
    accent: "#22c55e",
    bgImage: "/images/bg-economato.jpg",
  },
  Outros: {
    gradient: "linear-gradient(135deg, #1c1917 0%, #292524 50%, #44403c 100%)",
    icon: "🔧",
    pattern: "radial-gradient(circle at 25% 75%, rgba(245,158,11,0.12) 0%, transparent 50%), radial-gradient(circle at 75% 25%, rgba(251,146,60,0.08) 0%, transparent 50%)",
    accent: "#f59e0b",
    bgImage: "/images/bg-outros.jpg",
  },
};

const DEFAULT_THEME = {
  gradient: "linear-gradient(135deg, hsl(27 90% 20%) 0%, hsl(27 90% 35%) 50%, hsl(27 90% 50%) 100%)",
  icon: "📦",
  pattern: "radial-gradient(circle at 30% 70%, rgba(251,146,60,0.15) 0%, transparent 50%)",
  accent: "hsl(27 90% 50%)",
  bgImage: "/images/bg-outros.jpg",
};

/* ─── Cover Page ─── */
function CoverPage({ category, productCount, bgImage, brandLogo, brandTheme }: { category: string; productCount: number; bgImage: string; brandLogo?: string | null; brandTheme?: { gradient: string; accent: string; pattern: string } | null }) {
  const theme = brandTheme ? { ...DEFAULT_THEME, ...brandTheme } : (CATEGORY_THEMES[category] || DEFAULT_THEME);
  const isBrand = !CATEGORY_THEMES[category];

  return (
    <div className="h-full w-full relative overflow-hidden">
      {/* Full-bleed background image */}
      {bgImage ? (
        <>
          <img src={bgImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.7) 100%)" }} />
        </>
      ) : (
        <div className="absolute inset-0" style={{ background: theme.gradient }} />
      )}
      <div className="absolute inset-0" style={{ background: theme.pattern }} />

      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: theme.accent }} />

      {/* Content */}
      <div className="h-full flex flex-col items-center justify-center relative z-10 px-8">
        {/* Logo at top */}
        <div className="absolute top-6 left-0 right-0 flex flex-col items-center">
          <img src={vrcfLogo} alt="VRCF" className="h-28 w-28 object-contain drop-shadow-lg" />
          <p className="text-white/60 text-[8px] tracking-[0.4em] uppercase mt-1 font-medium">Informática & Segurança</p>
        </div>

        {/* Brand logo or Category icon */}
        {isBrand && brandLogo ? (
          <div className="mb-5 w-32 h-32 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center p-4 shadow-2xl">
            <img src={brandLogo} alt={category} className="max-w-full max-h-full object-contain drop-shadow-lg" />
          </div>
        ) : (
          <div className="text-6xl mb-5 drop-shadow-2xl">{theme.icon}</div>
        )}

        {/* Category title */}
        <div className="text-center space-y-3">
          <div className="flex items-center gap-3 justify-center">
            <div className="w-10 h-px" style={{ backgroundColor: `${theme.accent}80` }} />
            <p className="text-white/60 text-[10px] font-semibold tracking-[0.5em] uppercase">
              {isBrand ? "Catálogo de Marca" : "Catálogo"}
            </p>
            <div className="w-10 h-px" style={{ backgroundColor: `${theme.accent}80` }} />
          </div>

          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-white leading-none tracking-tight drop-shadow-lg">
            {category}
          </h1>

          <div className="w-20 h-1 rounded-full mx-auto" style={{ backgroundColor: theme.accent }} />

          <p className="text-white/50 text-sm font-medium">
            {productCount} {productCount === 1 ? "produto" : "produtos"}
          </p>
        </div>

        {/* Bottom hint */}
        <div className="absolute bottom-8 flex flex-col items-center gap-1">
          <div className="w-5 h-8 rounded-full border border-white/25 flex items-start justify-center p-1">
            <div className="w-1 h-2 rounded-full bg-white/50 animate-bounce" />
          </div>
          <p className="text-white/30 text-[9px] tracking-wider">Arraste para folhear</p>
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: `${theme.accent}60` }} />
    </div>
  );
}

/* ─── Contacts Last Page ─── */
function ContactsPage({ category, brandLogo, brandTheme }: { category: string; brandLogo?: string | null; brandTheme?: { gradient: string; accent: string; pattern: string } | null }) {
  const theme = brandTheme ? { ...DEFAULT_THEME, ...brandTheme } : (CATEGORY_THEMES[category] || DEFAULT_THEME);
  const isBrand = !CATEGORY_THEMES[category];

  return (
    <div className="h-full w-full relative overflow-hidden" style={{ background: theme.gradient }}>
      <div className="absolute inset-0" style={{ background: theme.pattern }} />
      <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: theme.accent }} />

      <div className="h-full flex flex-col items-center justify-center relative z-10 px-8">
        {/* Shield icon on contacts page */}
        <img src={vrcfShield} alt="VRCF" className="h-40 w-40 object-contain drop-shadow-lg mb-6" />

        <h2 className="font-heading text-2xl font-bold text-white mb-1">VRCF</h2>
        <p className="text-white/50 text-xs tracking-[0.3em] uppercase mb-8">Informática & Segurança</p>

        <div className="w-16 h-px mb-8" style={{ backgroundColor: `${theme.accent}80` }} />

        {/* Contact info */}
        <div className="space-y-4 text-center">
          <div className="flex items-center gap-3 justify-center">
            <Phone className="h-4 w-4" style={{ color: theme.accent }} />
            <span className="text-white/80 text-sm">+351 911 564 243</span>
          </div>
          <div className="flex items-center gap-3 justify-center">
            <Mail className="h-4 w-4" style={{ color: theme.accent }} />
            <span className="text-white/80 text-sm">geral@vrcf.pt</span>
          </div>
          <div className="flex items-center gap-3 justify-center">
            <MapPin className="h-4 w-4" style={{ color: theme.accent }} />
            <span className="text-white/80 text-sm">Rua Luis Calado Nunes 15 LJB — 2870-350 Montijo</span>
          </div>
          <div className="flex items-center gap-3 justify-center">
            <Globe className="h-4 w-4" style={{ color: theme.accent }} />
            <a href="https://www.vrcf.pt" target="_blank" rel="noopener noreferrer" className="text-white/80 text-sm hover:text-white underline">www.vrcf.pt</a>
          </div>
        </div>

        {/* WhatsApp CTA */}
        <button
          onClick={() => window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Olá! Gostaria de mais informações.")}`, "_blank")}
          className="mt-8 flex items-center gap-2 px-6 py-3 rounded-full text-white font-semibold text-sm transition-transform hover:scale-105 shadow-lg"
          style={{ backgroundColor: "#25D366" }}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Fale connosco no WhatsApp
        </button>

        {/* Footer */}
        <p className="absolute bottom-6 text-white/20 text-[9px] tracking-wider">
          © {new Date().getFullYear()} VRCF — Todos os direitos reservados
        </p>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: `${theme.accent}60` }} />
    </div>
  );
}

/* ─── Family Section Header (inline on page) ─── */
function FamilyHeader({ familyName, accent, bgImage }: { familyName: string; accent: string; bgImage: string }) {
  return (
    <div className="rounded-lg overflow-hidden mb-2 relative" style={{ height: "60px" }}>
      {bgImage ? (
        <>
          <img src={bgImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/50" />
        </>
      ) : (
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${accent}20, ${accent}40)` }} />
      )}
      <div className="relative z-10 h-full flex items-center px-3 gap-2">
        <div className="w-1 h-6 rounded-full" style={{ backgroundColor: accent }} />
        <h3 className="font-heading text-sm font-bold text-white drop-shadow-md">{familyName}</h3>
      </div>
    </div>
  );
}

/* ─── Build pages grouped by family (max 2 families per page) ─── */
interface FamilyPageGroup {
  families: { name: string; products: CatalogProduct[] }[];
}

function buildFamilyPages(products: CatalogProduct[], familyMap: Record<string, string>): FamilyPageGroup[] {
  // Sort featured products first
  const sorted = [...products].sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return 0;
  });

  // Group products by family
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
  Object.entries(familyGroups).forEach(([name, prods]) => {
    allFamilies.push({ name, products: prods });
  });
  if (noFamily.length > 0) {
    allFamilies.push({ name: "Outros", products: noFamily });
  }

  // Now pack into pages: max 2 families per page, max 6 products per page
  const MAX_PRODUCTS = 6;
  const MAX_FAMILIES = 2;
  const pages: FamilyPageGroup[] = [];

  let currentPageFamilies: { name: string; products: CatalogProduct[] }[] = [];
  let currentPageProductCount = 0;

  allFamilies.forEach((family) => {
    let remaining = [...family.products];

    while (remaining.length > 0) {
      const spaceLeft = MAX_PRODUCTS - currentPageProductCount;
      const familySlotAvailable = currentPageFamilies.length < MAX_FAMILIES;

      if (spaceLeft <= 0 || !familySlotAvailable) {
        // Flush current page
        if (currentPageFamilies.length > 0) {
          pages.push({ families: currentPageFamilies });
        }
        currentPageFamilies = [];
        currentPageProductCount = 0;
        continue;
      }

      const take = remaining.splice(0, spaceLeft);
      currentPageFamilies.push({ name: family.name, products: take });
      currentPageProductCount += take.length;

      // If this family still has remaining, flush
      if (remaining.length > 0) {
        pages.push({ families: currentPageFamilies });
        currentPageFamilies = [];
        currentPageProductCount = 0;
      }
    }
  });

  // Flush last page
  if (currentPageFamilies.length > 0) {
    pages.push({ families: currentPageFamilies });
  }

  if (pages.length === 0) pages.push({ families: [] });
  return pages;
}

/* ─── Main Component ─── */
export function CatalogViewer({
  category,
  products,
  imagesByProduct,
  familyMap,
  onBack,
  brandLogo,
  brandTheme,
  customLogoUrl,
  customCoverUrl,
}: CatalogViewerProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [barsVisible, setBarsVisible] = useState(true);
  const [isTablet, setIsTablet] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bookRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect tablet-sized screens for single-page mode
  useEffect(() => {
    const check = () => setIsTablet(window.innerWidth >= 600 && window.innerWidth <= 1100);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const showBars = useCallback(() => {
    setBarsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setBarsVisible(false), 3000);
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  useEffect(() => {
    showBars();
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, [showBars]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.family_id && familyMap[p.family_id]?.toLowerCase().includes(q))
    );
  }, [products, searchQuery, familyMap]);

  const pages = useMemo(() => buildFamilyPages(filteredProducts, familyMap), [filteredProducts, familyMap]);

  // +2 for cover + contacts page
  const totalPages = pages.length + 2;

  const getProductImage = (product: CatalogProduct) => {
    const imgs = imagesByProduct[product.id];
    if (imgs && imgs.length > 0) return imgs.sort((a, b) => a.position - b.position)[0].image_url;
    return product.image_url;
  };

  const handleWhatsApp = (product: CatalogProduct) => {
    const msg = encodeURIComponent(
      `Olá! Gostaria de saber mais sobre o produto: ${product.name}${product.price != null ? ` (${product.price.toFixed(2).replace(".", ",")} €)` : ""}`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, "_blank");
  };

  const pageTheme = brandTheme ? { ...DEFAULT_THEME, ...brandTheme, bgImage: DEFAULT_THEME.bgImage } : (CATEGORY_THEMES[category] || DEFAULT_THEME);

  // For brands, use the first product image as cover background (custom override takes priority)
  const coverBgImage = useMemo(() => {
    if (customCoverUrl) return customCoverUrl;
    if (CATEGORY_THEMES[category]) return pageTheme.bgImage;
    // Find a featured product image, or first product image
    const featured = products.find(p => p.featured);
    const firstProduct = featured || products[0];
    if (firstProduct) {
      const imgs = imagesByProduct[firstProduct.id];
      if (imgs && imgs.length > 0) return imgs.sort((a, b) => a.position - b.position)[0].image_url;
      if (firstProduct.image_url) return firstProduct.image_url;
    }
    return pageTheme.bgImage;
  }, [category, products, imagesByProduct, pageTheme.bgImage, customCoverUrl]);

  // Use custom logo if available
  const effectiveBrandLogo = customLogoUrl || brandLogo;

  const onFlip = useCallback((e: any) => {
    setCurrentPage(e.data);
  }, []);

  const flipTo = (page: number) => {
    if (bookRef.current) bookRef.current.pageFlip().flip(page);
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement && containerRef.current) {
      await containerRef.current.requestFullscreen();
    } else if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  };

  return (
    <div
      ref={containerRef}
      className="h-screen flex flex-col relative overflow-hidden"
      style={{ backgroundColor: "#2a2a2a" }}
      onTouchStart={showBars}
    >
      {/* Top bar */}
      <div
        className={`absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-2 bg-black/50 backdrop-blur-md z-50 transition-all duration-500 ${
          barsVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        }`}
        onMouseEnter={() => { setBarsVisible(true); if (hideTimerRef.current) clearTimeout(hideTimerRef.current); }}
      >
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors">
          <ChevronLeft className="h-4 w-4" /> Voltar
        </button>
        <div className="flex items-center gap-2">
          <img src={vrcfLogo} alt="VRCF" className="h-10 w-10 object-contain" />
          <span className="font-heading font-bold text-white/90 text-sm">{category}</span>
        </div>
        <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10 gap-1.5" onClick={toggleFullscreen}>
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          <span className="hidden sm:inline text-xs">{isFullscreen ? "Sair" : "Ecrã inteiro"}</span>
        </Button>
      </div>

      {/* Top hover zone */}
      <div className="absolute top-0 left-0 right-0 h-12 z-40" onMouseEnter={showBars} />

      {/* Flipbook area */}
      <div
        className="absolute inset-0 flex items-center justify-center overflow-hidden p-4"
        style={{ transform: `scale(${zoom / 100})`, transformOrigin: "center center" }}
      >
        {/* Thumbnails panel */}
        {showThumbnails && (
          <div className="absolute left-0 top-0 bottom-0 w-48 bg-black/80 backdrop-blur-md z-40 overflow-y-auto p-3 space-y-2">
            <button
              onClick={() => { flipTo(0); setShowThumbnails(false); }}
              className={`w-full rounded-md overflow-hidden border-2 transition-all ${currentPage === 0 ? "border-primary" : "border-transparent hover:border-white/30"}`}
            >
              <div className="aspect-[3/4] bg-white flex items-center justify-center p-2">
                <span className="font-heading text-[8px] font-bold text-gray-800 text-center">{category}</span>
              </div>
              <div className="bg-black/60 text-white text-[10px] text-center py-0.5">Capa</div>
            </button>
            {pages.map((_, i) => (
              <button
                key={i}
                onClick={() => { flipTo(i + 1); setShowThumbnails(false); }}
                className={`w-full rounded-md overflow-hidden border-2 transition-all ${currentPage === i + 1 ? "border-primary" : "border-transparent hover:border-white/30"}`}
              >
                <div className="aspect-[3/4] bg-white flex items-center justify-center p-1">
                  <span className="text-[8px] text-gray-500">Pág. {i + 1}</span>
                </div>
                <div className="bg-black/60 text-white text-[10px] text-center py-0.5">{i + 1}</div>
              </button>
            ))}
            <button
              onClick={() => { flipTo(pages.length + 1); setShowThumbnails(false); }}
              className={`w-full rounded-md overflow-hidden border-2 transition-all ${currentPage === pages.length + 1 ? "border-primary" : "border-transparent hover:border-white/30"}`}
            >
              <div className="aspect-[3/4] bg-white flex items-center justify-center p-2">
                <span className="font-heading text-[8px] font-bold text-gray-800 text-center">Contactos</span>
              </div>
              <div className="bg-black/60 text-white text-[10px] text-center py-0.5">Contactos</div>
            </button>
          </div>
        )}

        {/* @ts-ignore */}
        <HTMLFlipBook
          ref={bookRef}
          width={isTablet ? 700 : 550}
          height={isTablet ? 950 : 750}
          size="stretch"
          minWidth={isTablet ? 500 : 300}
          maxWidth={isTablet ? 900 : 1400}
          minHeight={isTablet ? 650 : 400}
          maxHeight={isTablet ? 1200 : 1800}
          showCover={true}
          mobileScrollSupport={true}
          onFlip={onFlip}
          className=""
          style={{ margin: "0 auto" }}
          startPage={0}
          drawShadow={true}
          flippingTime={800}
          usePortrait={true}
          startZIndex={0}
          autoSize={true}
          maxShadowOpacity={0.4}
          showPageCorners={true}
          disableFlipByClick={false}
          useMouseEvents={true}
          swipeDistance={30}
          clickEventForward={true}
          renderOnlyPageLengthChange={false}
        >
          {/* Cover page */}
          <FlipPage>
            <CoverPage
              category={category}
              productCount={filteredProducts.length}
              bgImage={coverBgImage}
              brandLogo={effectiveBrandLogo}
              brandTheme={brandTheme}
            />
          </FlipPage>

          {/* Product pages grouped by family */}
          {pages.map((page, pageIndex) => (
            <FlipPage key={pageIndex}>
              <div className="h-full flex flex-col relative overflow-hidden">
                {/* Background */}
                {pageTheme.bgImage && (
                  <div className="absolute inset-0 z-0">
                    <img src={pageTheme.bgImage} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0" style={{ background: "rgba(255,255,255,0.90)" }} />
                  </div>
                )}
                <div className="relative z-10 h-full flex flex-col p-4 sm:p-5">
                  {/* Page header with logo */}
                  <div className="flex items-center justify-between mb-2 pb-2 border-b" style={{ borderColor: "#e5e5e5" }}>
                    <div className="flex items-center gap-2">
                      {brandLogo ? (
                        <img src={brandLogo} alt={category} className="h-5 object-contain" />
                      ) : (
                        <img src={vrcfLogo} alt="VRCF" className="h-8 w-8 object-contain" />
                      )}
                      <span className="font-heading text-xs font-bold" style={{ color: "#1a1a1a" }}>{category}</span>
                    </div>
                    <span className="text-[10px] font-medium" style={{ color: pageTheme.accent }}>
                      VRCF
                    </span>
                  </div>

                  {/* Family sections */}
                  <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                    {page.families.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center" style={{ color: "#999" }}>
                        <Search className="h-8 w-8 mb-2 opacity-40" />
                        <p className="text-xs">Nenhum produto encontrado</p>
                      </div>
                    ) : (
                      page.families.map((family, fi) => {
                        // Calculate grid based on how many families on page
                        const isSingleFamily = page.families.length === 1;
                        const gridCols = isSingleFamily ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2";
                        
                        return (
                          <div key={fi} className={`${isSingleFamily ? "flex-1" : ""} flex flex-col min-h-0`}>
                            {/* Family header with background */}
                            <FamilyHeader familyName={family.name} accent={pageTheme.accent} bgImage={pageTheme.bgImage} />
                            
                            {/* Products grid */}
                            <div className={`grid ${gridCols} gap-2 content-start ${isSingleFamily ? "flex-1" : ""}`}>
                              {family.products.map((product) => {
                                const imgUrl = getProductImage(product);
                                const descShort = product.description
                                  ? product.description.split("\n")[0].replace(/^•\s*/, "").slice(0, 50)
                                  : null;

                                return (
                                  <div key={product.id} className="group flex flex-col rounded-md overflow-hidden relative" style={{ border: product.featured ? `2px solid ${pageTheme.accent}` : "1px solid #eee", backgroundColor: product.featured ? "#fffbf0" : "#fff" }}>
                                    {product.featured && (
                                      <div className="absolute top-0 left-0 z-20 px-1.5 py-0.5 rounded-br-md text-[7px] font-bold uppercase tracking-wider text-white" style={{ backgroundColor: pageTheme.accent }}>
                                        ★ Destaque
                                      </div>
                                    )}
                                    <div className="aspect-square overflow-hidden relative" style={{ backgroundColor: "#f5f5f5" }}>
                                      {imgUrl ? (
                                        <>
                                          <img src={imgUrl} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                                          <button
                                            onClick={(e) => { e.stopPropagation(); setZoomedImage(imgUrl); }}
                                            className="absolute top-1 right-1 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                            style={{ backgroundColor: "rgba(255,255,255,0.8)" }}
                                          >
                                            <ZoomIn className="h-3 w-3" style={{ color: "#333" }} />
                                          </button>
                                        </>
                                      ) : (
                                        <div className="flex items-center justify-center h-full">
                                          <ImageOff className="h-5 w-5" style={{ color: "#ccc" }} />
                                        </div>
                                      )}
                                    </div>
                                    <div className="p-1.5 flex flex-col gap-0.5 flex-1">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          trackEvent(product.id, "catalog_view");
                                          setSelectedProduct({
                                            name: product.name, description: product.description,
                                            category: product.category, price: product.price,
                                            imageUrl: product.image_url, images: imagesByProduct[product.id] || [],
                                            familyName: family.name,
                                          });
                                        }}
                                        className="text-left"
                                      >
                                        <h4 className="font-heading text-[10px] font-bold leading-tight line-clamp-2" style={{ color: "#1a1a1a" }}>
                                          {product.name}
                                        </h4>
                                      </button>
                                      {descShort && (
                                        <p className="text-[8px] line-clamp-1 leading-snug" style={{ color: "#888" }}>{descShort}</p>
                                      )}
                                      <div className="mt-auto pt-1">
                                        {product.price != null ? (
                                          <span className="font-heading font-bold text-[11px]" style={{ color: "#1a1a1a" }}>
                                            {product.price.toFixed(2).replace(".", ",")} €
                                          </span>
                                        ) : (
                                          <span className="text-[8px]" style={{ color: "#aaa" }}>Consultar</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Page footer */}
                  <div className="mt-2 pt-2 flex items-center justify-between text-[9px]" style={{ borderTop: "1px solid #eee", color: "#bbb" }}>
                    <span>Catálogo {category}</span>
                    <span>{pageIndex + 1} / {pages.length}</span>
                  </div>
                </div>
              </div>
            </FlipPage>
          ))}

          {/* Contacts last page */}
          <FlipPage>
            <ContactsPage category={category} brandLogo={brandLogo} brandTheme={brandTheme} />
          </FlipPage>
        </HTMLFlipBook>

        {/* Navigation arrows */}
        <button
          onClick={() => bookRef.current?.pageFlip().flipPrev()}
          className={`absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center z-30 transition-opacity duration-500 ${barsVisible ? "opacity-100" : "opacity-0"}`}
          style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
          disabled={currentPage === 0}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => bookRef.current?.pageFlip().flipNext()}
          className={`absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center z-30 transition-opacity duration-500 ${barsVisible ? "opacity-100" : "opacity-0"}`}
          style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
          disabled={currentPage === totalPages - 1}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Bottom hover zone */}
      <div className="absolute bottom-0 left-0 right-0 h-12 z-40" onMouseEnter={showBars} />

      {/* Bottom toolbar */}
      <div
        className={`absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-2 z-50 transition-all duration-500 ${
          barsVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
        }`}
        style={{ backgroundColor: "rgba(26,26,26,0.9)", backdropFilter: "blur(8px)" }}
        onMouseEnter={() => { setBarsVisible(true); if (hideTimerRef.current) clearTimeout(hideTimerRef.current); }}
        onMouseLeave={() => { hideTimerRef.current = setTimeout(() => setBarsVisible(false), 1500); }}
      >
        <div className="flex items-center gap-3">
          <span className="text-white/70 text-xs font-medium">{currentPage + 1} / {totalPages}</span>
          <div className="hidden sm:block w-32 h-1 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.15)" }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${((currentPage + 1) / totalPages) * 100}%`, backgroundColor: "hsl(27 90% 50%)" }}
            />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10" onClick={() => setZoom(Math.max(50, zoom - 10))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-white/50 text-[10px] w-8 text-center">{zoom}%</span>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10" onClick={() => setZoom(Math.min(150, zoom + 10))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <div className="w-px h-5 mx-1" style={{ backgroundColor: "rgba(255,255,255,0.15)" }} />
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10" onClick={() => setShowThumbnails(!showThumbnails)}>
            <Grid3X3 className="h-4 w-4" />
          </Button>
          {showSearch ? (
            <div className="flex items-center gap-1 ml-1">
              <Input
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(0); if (bookRef.current) bookRef.current.pageFlip().flip(0); }}
                placeholder="Pesquisar..."
                className="h-7 w-28 sm:w-36 text-xs bg-white/10 border-white/20 text-white placeholder:text-white/40"
                autoFocus
              />
              <Button variant="ghost" size="icon" className="h-7 w-7 text-white/60 hover:text-white" onClick={() => { setShowSearch(false); setSearchQuery(""); }}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10" onClick={() => setShowSearch(true)}>
              <Search className="h-4 w-4" />
            </Button>
          )}
          <div className="w-px h-5 mx-1" style={{ backgroundColor: "rgba(255,255,255,0.15)" }} />
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
        </div>

        <div className="w-16" />
      </div>

      {/* Product detail */}
      {selectedProduct && (
        <ProductDetailDialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)} product={selectedProduct} />
      )}

      {/* Zoom dialog */}
      <Dialog open={!!zoomedImage} onOpenChange={(open) => !open && setZoomedImage(null)}>
        <DialogContent className="max-w-4xl w-full p-2 bg-background/95 backdrop-blur-lg">
          <DialogTitle className="sr-only">Zoom da imagem</DialogTitle>
          {zoomedImage && <img src={zoomedImage} alt="Zoom" className="w-full h-auto max-h-[85vh] object-contain rounded-lg" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
