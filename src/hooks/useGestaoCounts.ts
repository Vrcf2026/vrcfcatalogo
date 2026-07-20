import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Counts of items needing manager attention:
 * - Quotes with status 'pending' (waiting for triage)
 * - RMAs with status 'submitted' (waiting for triage)
 *
 * Cached 30s. Refetches on window focus so the badge updates
 * when the manager returns to the tab.
 */
export function useGestaoCounts(enabled = true) {
  return useQuery({
    queryKey: ["gestao-menu-counts"],
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const [quotesRes, rmaRes] = await Promise.all([
        supabase
          .from("quotes")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending" as any),
        supabase
          .from("rma_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "submitted" as any),
      ]);
      return {
        pendingQuotes: quotesRes.count ?? 0,
        pendingRmas:   rmaRes.count ?? 0,
      };
    },
  });
}
