import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link, useLocation } from "react-router-dom";

interface BrandsStripProps {
  mundo?: "seguranca" | "escritorio";
}

const BrandsStrip = ({ mundo }: BrandsStripProps) => {
  const { data: brands = [], isLoading } = useQuery({
    queryKey: ["brands-strip", mundo ?? "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select("id, name, logo_url")
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const location = useLocation();

  if (isLoading || brands.length === 0) return null;

  const basePath = mundo
    ? `/${mundo}`
    : location.pathname === "/seguranca" || location.pathname === "/escritorio"
      ? location.pathname
      : "/";

  const items = [...brands, ...brands];

  return (
    <section
      className="border-y border-border/50 bg-muted/30 py-6 overflow-hidden"
      aria-label="Marcas que trabalhamos"
    >
      <div className="container mx-auto px-4">
        <p className="text-center text-xs uppercase tracking-widest text-muted-foreground mb-4">
          Marcas que trabalhamos — clique para filtrar
        </p>
        <div className="relative overflow-hidden">
          <div
            className="flex gap-8 sm:gap-12 w-max"
            style={{ animation: "vrcf-scroll-x 40s linear infinite" }}
          >
            {items.map((b, i) => (
              <Link
                key={`${b.id}-${i}`}
                to={`${basePath}?brand=${b.id}`}
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
    </section>
  );
};

export default BrandsStrip;
