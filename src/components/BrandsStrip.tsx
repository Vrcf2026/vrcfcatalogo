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
        .eq("show_in_world_strip", true)
        .order("name", { ascending: true });
      if (mundo) {
        query = query.in("mundo", [mundo, "todos"]);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    retry: 2,
    staleTime: 10 * 60 * 1000,
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
      className="border-y border-border/40 bg-background py-4 overflow-hidden"
      aria-label="Marcas"
    >
      <div className="max-w-[1600px] mx-auto px-4">
        <div
          className="relative group"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Setas */}
          <button
            type="button"
            aria-label="Marcas anteriores"
            onClick={() => scrollByArrow("left")}
            className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full",
              "bg-background border border-border shadow-sm flex items-center justify-center",
              "opacity-0 group-hover:opacity-100 transition-opacity",
              "hover:bg-muted hover:scale-105",
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Marcas seguintes"
            onClick={() => scrollByArrow("right")}
            className={cn(
              "absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full",
              "bg-background border border-border shadow-sm flex items-center justify-center",
              "opacity-0 group-hover:opacity-100 transition-opacity",
              "hover:bg-muted hover:scale-105",
            )}
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <div ref={scrollerRef} className="overflow-x-auto scrollbar-hide">
            <div
              className="flex gap-3 w-max"
              style={{
                animation: "vrcf-scroll-x 40s linear infinite",
                animationPlayState: isPaused ? "paused" : "running",
              }}
            >
              {items.map((b, i) => (
                <Link
                  key={`${b.id}-${i}`}
                  to={`${basePath}?marca=${b.id}`}
                  title={b.name}
                  aria-label={`Ver produtos ${b.name}`}
                  className={cn(
                    "shrink-0 flex items-center justify-center",
                    "h-12 w-28 rounded-xl border border-border/60",
                    "bg-white dark:bg-card",
                    "hover:border-border hover:shadow-md transition-all duration-200",
                    "hover:scale-105 px-3",
                  )}
                >
                  {b.logo_url ? (
                    <img
                      src={b.logo_url}
                      alt={b.name}
                      className="h-7 w-auto max-w-full object-contain opacity-80 hover:opacity-100 transition-opacity"
                      loading="lazy"
                    />
                  ) : (
                    <span className="font-heading text-[11px] font-bold text-foreground/70 hover:text-foreground transition-colors whitespace-nowrap text-center">
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
