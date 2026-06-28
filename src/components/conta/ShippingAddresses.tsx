import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Plus, Pencil, Trash2, Star, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Address {
  id: string;
  label: string;
  recipient: string | null;
  address_line1: string;
  address_line2: string | null;
  city: string;
  postal_code: string;
  country: string;
  phone: string | null;
  is_default: boolean;
}

const EMPTY: Omit<Address, "id" | "is_default"> = {
  label: "", recipient: "", address_line1: "", address_line2: "",
  city: "", postal_code: "", country: "Portugal", phone: "",
};

export function ShippingAddresses() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ["shipping-addresses", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipping_addresses" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("is_default", { ascending: false })
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as Address[];
    },
  });

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY, label: addresses.length === 0 ? "Principal" : "" });
    setOpen(true);
  };

  const openEdit = (a: Address) => {
    setEditing(a);
    setForm({ label: a.label, recipient: a.recipient ?? "", address_line1: a.address_line1,
      address_line2: a.address_line2 ?? "", city: a.city, postal_code: a.postal_code,
      country: a.country, phone: a.phone ?? "" });
    setOpen(true);
  };

  const upd = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.label.trim() || !form.address_line1.trim() || !form.city.trim() || !form.postal_code.trim()) {
      toast.error("Preencha a etiqueta, morada, cidade e código postal.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        label: form.label.trim(),
        recipient: form.recipient?.trim() || null,
        address_line1: form.address_line1.trim(),
        address_line2: form.address_line2?.trim() || null,
        city: form.city.trim(),
        postal_code: form.postal_code.trim(),
        country: form.country.trim() || "Portugal",
        phone: form.phone?.trim() || null,
        is_default: addresses.length === 0,
      };
      if (editing) {
        const { error } = await supabase.from("shipping_addresses" as any).update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("shipping_addresses" as any)
          .insert({ ...payload, user_id: user!.id });
        if (error) throw error;
      }
      qc.invalidateQueries({ queryKey: ["shipping-addresses", user?.id] });
      toast.success(editing ? "Morada actualizada." : "Morada adicionada.");
      setOpen(false);
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from("shipping_addresses" as any).delete().eq("id", id);
    setDeletingId(null);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["shipping-addresses", user?.id] });
    toast.success("Morada removida.");
  };

  const handleSetDefault = async (id: string) => {
    await supabase.from("shipping_addresses" as any)
      .update({ is_default: false }).eq("user_id", user!.id);
    await supabase.from("shipping_addresses" as any)
      .update({ is_default: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["shipping-addresses", user?.id] });
    toast.success("Morada principal definida.");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-bold">Moradas de Entrega</h2>
        <Button size="sm" onClick={openNew} className="gap-1.5">
          <Plus className="h-4 w-4" /> Nova morada
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : addresses.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <MapPin className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Sem moradas guardadas.</p>
            <Button size="sm" onClick={openNew} className="mt-3 gap-1.5">
              <Plus className="h-4 w-4" /> Adicionar morada
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {addresses.map((a) => (
            <Card key={a.id} className={a.is_default ? "border-primary/40" : ""}>
              <CardContent className="py-3 flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">{a.label}</span>
                    {a.is_default && (
                      <span className="text-[10px] text-primary font-semibold bg-primary/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Star className="h-2.5 w-2.5" /> Principal
                      </span>
                    )}
                  </div>
                  {a.recipient && <p className="text-xs text-muted-foreground">{a.recipient}</p>}
                  <p className="text-xs text-muted-foreground">{a.address_line1}{a.address_line2 ? `, ${a.address_line2}` : ""}</p>
                  <p className="text-xs text-muted-foreground">{a.postal_code} {a.city} · {a.country}</p>
                  {a.phone && <p className="text-xs text-muted-foreground">{a.phone}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  {!a.is_default && (
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Definir como principal"
                      onClick={() => handleSetDefault(a.id)}>
                      <Star className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(a)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    disabled={deletingId === a.id} onClick={() => handleDelete(a.id)}>
                    {deletingId === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar morada" : "Nova morada de entrega"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Etiqueta *</Label>
                <Input value={form.label} onChange={upd("label")} placeholder="Ex: Casa, Empresa..." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Destinatário</Label>
                <Input value={form.recipient ?? ""} onChange={upd("recipient")} placeholder="Nome" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Morada *</Label>
              <Input value={form.address_line1} onChange={upd("address_line1")} placeholder="Rua, nº, andar..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Complemento</Label>
              <Input value={form.address_line2 ?? ""} onChange={upd("address_line2")} placeholder="Opcional" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Código Postal *</Label>
                <Input value={form.postal_code} onChange={upd("postal_code")} placeholder="0000-000" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cidade *</Label>
                <Input value={form.city} onChange={upd("city")} placeholder="Lisboa" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">País</Label>
                <Input value={form.country} onChange={upd("country")} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Telefone</Label>
                <Input value={form.phone ?? ""} onChange={upd("phone")} placeholder="+351 912..." />
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Guardar alterações" : "Adicionar morada"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
