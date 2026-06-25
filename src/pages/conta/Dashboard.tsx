import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Wrench, UserCog, ArrowRight } from "lucide-react";

export default function ContaDashboard() {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["conta-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [q, r] = await Promise.all([
        supabase.from("quotes").select("*", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("rma_requests").select("*", { count: "exact", head: true }).eq("user_id", user!.id),
      ]);
      return { quotes: q.count ?? 0, rmas: r.count ?? 0 };
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Bem-vindo</h1>
        <p className="text-muted-foreground text-sm">{user?.email}</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Orçamentos</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.quotes ?? "-"}</div>
            <Button variant="link" size="sm" asChild className="px-0 h-auto">
              <Link to="/conta/orcamentos">Ver todos <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">RMAs</CardTitle>
            <Wrench className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.rmas ?? "-"}</div>
            <Button variant="link" size="sm" asChild className="px-0 h-auto">
              <Link to="/conta/rma">Ver todos <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Dados</CardTitle>
            <UserCog className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <Button variant="link" size="sm" asChild className="px-0 h-auto">
              <Link to="/conta/dados">Editar perfil <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como funciona</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Os seus orçamentos ficam guardados aqui e podem ser repetidos com um clique.</p>
          <p>• Pode abrir pedidos de RMA para artigos com avaria e acompanhar o estado.</p>
          <p>• Atualize os seus dados em "Dados" para preencher pedidos mais rapidamente.</p>
        </CardContent>
      </Card>
    </div>
  );
}
