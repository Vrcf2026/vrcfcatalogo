import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Shared lookup lists used across the admin area.
 *
 * The queries use stable, top-level query keys (`families`, `categories`,
 * `brands`, `types`) so React Query automatically dedupes them with any
 * child component that queries the same keys — no duplicate network calls.
 *
 * Centralizing them here keeps `Admin.tsx` slim and lets any admin
 * sub-component pull the same data without prop-drilling.
 */
export function useAdminLookups() {
  const families = useQuery({
    queryKey: ["families"],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_families").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const dbCategories = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const brands = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brands").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const types = useQuery({
    queryKey: ["types"],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_types").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const totalAll = useQuery({
    queryKey: ["products", "count-all"],
    queryFn: async () => {
      const { count, error } = await supabase.from("products").select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 5 * 60 * 1000,
  });

  const familiesList = (families.data ?? []) as any[];
  const categoriesList = (dbCategories.data ?? []) as any[];
  const brandsList = (brands.data ?? []) as any[];
  const typesList = (types.data ?? []) as any[];

  return {
    families: familiesList,
    dbCategories: categoriesList,
    brands: brandsList,
    types: typesList,
    categoryNames: categoriesList.map((c: any) => c.name),
    totalAll: totalAll.data ?? 0,
    isLoading:
      families.isLoading || dbCategories.isLoading || brands.isLoading ||
      types.isLoading || totalAll.isLoading,
  };
}
