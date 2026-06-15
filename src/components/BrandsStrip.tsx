import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface BrandsStripProps {
  mundo?: "seguranca" | "escritorio" | "economato";
}

const BrandsStrip = ({ mundo }: BrandsStripProps) => {
  const { data: brands = [], isLoading } = useQuery({
    queryKey: ["brands-strip", mundo ?? "all"],
    queryFn: async () => {
      let query = supabase
        .from("brands")
        .select("id, name, logo_url")
        .eq("show_in_strip", true)
        .order("name", { ascending: true });
      if (mundo) {
        // Marcas do próprio mundo, ou marcadas como "todos" (transversais)
        query = query.in("mundo", [mundo, "todos"]);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const location = useLocation();
  const [isPaused, setIsPaused] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  if (isLoading || brands.length === 0) return null;

  const basePath = mundo
    ? `/${mundo}`
    : location.pathname === "/seguranca" || location.pathname === "/escritorio" || location.pathname === "/economato"
      ? location.pathname
      : "/";

  const items = [...brands, ...brands];

  const scrollByArrow = (direction: "left" | "right") => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.6;
    el.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <section
      className="border-y border-border/50 bg-muted/30 py-6 overflow-hidden"
      aria-label="Marcas que trabalhamos"
    >
      <div className="container mx-auto px-4">
        <p className="text-center text-xs uppercase tracking-widest text-muted-foreground mb-4">
          Marcas que trabalhamos — clique para filtrar
        </p>
        <div
          className="relative group"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Setas de navegação — aparecem ao passar o rato */}
          <button
            type="button"
            aria-label="Marcas anteriores"
            onClick={() => scrollByArrow("left")}
            className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full",
              "bg-background/90 border border-border shadow-sm flex items-center justify-center",
              "opacity-0 group-hover:opacity-100 transition-opacity",
              "hover:bg-background hover:scale-105",
            )}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Marcas seguintes"
            onClick={() => scrollByArrow("right")}
            className={cn(
              "absolute right-0 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full",
              "bg-background/90 border border-border shadow-sm flex items-center justify-center",
              "opacity-0 group-hover:opacity-100 transition-opacity",
              "hover:bg-background hover:scale-105",
            )}
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div ref={scrollerRef} className="overflow-x-auto scrollbar-hide">
            <div
              className="flex gap-8 sm:gap-12 w-max"
              style={{
                animation: "vrcf-scroll-x 40s linear infinite",
                animationPlayState: isPaused ? "paused" : "running",
              }}
            >
              {items.map((b, i) => (
                <Link
                  key={`${b.id}-${i}`}
                  to={`${basePath}?marca=${b.id}`}
                  className="shrink-0 flex items-center justify-center h-10 sm:h-12 px-3 hover:scale-105 transition-transform cursor-pointer"
                  title={b.name}
                  aria-label={`Ver produtos ${b.name}`}
                >
                  {b.logo_url ? (
                    <img
                      src={b.logo_url}
                      alt={b.name}
                      className="h-full w-auto object-contain opacity-90 hover:opacity-100 transition-opacity"
                      loading="lazy"
                    />
                  ) : (
                    <span className="font-heading text-sm sm:text-base font-semibold text-foreground hover:text-primary transition-colors whitespace-nowrap">
                      {b.name}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BrandsStrip;
