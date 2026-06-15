import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

export default function ContaDados() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (data) {
      setForm({
        full_name: data.full_name ?? "",
        phone: data.phone ?? "",
        company: data.company ?? "",
        tax_id: data.tax_id ?? "",
        address_line1: data.address_line1 ?? "",
        address_line2: data.address_line2 ?? "",
        city: data.city ?? "",
        postal_code: data.postal_code ?? "",
        country: data.country ?? "Portugal",
        notes: data.notes ?? "",
      });
    }
  }, [data]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const payload = { user_id: user.id, ...form };
    const { error } = await supabase.from("customer_profiles").upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Dados guardados.");
    qc.invalidateQueries({ queryKey: ["profile", user.id] });
  };

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const upd = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-bold">Dados da Conta</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">{user?.email}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Nome completo</Label><Input value={form.full_name ?? ""} onChange={upd("full_name")} /></div>
              <div className="space-y-2"><Label>Telefone</Label><Input value={form.phone ?? ""} onChange={upd("phone")} /></div>
              <div className="space-y-2"><Label>Empresa</Label><Input value={form.company ?? ""} onChange={upd("company")} /></div>
              <div className="space-y-2"><Label>NIF</Label><Input value={form.tax_id ?? ""} onChange={upd("tax_id")} /></div>
            </div>
            <div className="space-y-2"><Label>Morada</Label><Input value={form.address_line1 ?? ""} onChange={upd("address_line1")} /></div>
            <div className="space-y-2"><Label>Morada (linha 2)</Label><Input value={form.address_line2 ?? ""} onChange={upd("address_line2")} /></div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Código Postal</Label><Input value={form.postal_code ?? ""} onChange={upd("postal_code")} /></div>
              <div className="space-y-2"><Label>Cidade</Label><Input value={form.city ?? ""} onChange={upd("city")} /></div>
              <div className="space-y-2"><Label>País</Label><Input value={form.country ?? ""} onChange={upd("country")} /></div>
            </div>
            <div className="space-y-2"><Label>Notas</Label><Textarea value={form.notes ?? ""} onChange={upd("notes")} rows={3} /></div>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
