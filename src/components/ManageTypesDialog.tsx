import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Layers, Plus, Trash2, Loader2 } from "lucide-react";

interface ProductType {
  id: string;
  name: string;
  family_id: string;
  mundo?: string;
  visivel?: boolean;
}

interface Family {
  id: string;
  name: string;
  category: string;
  mundo?: string;
}

interface ManageTypesDialogProps {
  types: ProductType[];
  families: Family[];
}

export function ManageTypesDialog({ types, families }: ManageTypesDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [familyId, setFamilyId] = useState("");
  const [mundo, setMundo] = useState("todos");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const familyMap = Object.fromEntries(families.map((f) => [f.id, f]));

  // Quando se escolhe uma família, sugerir automaticamente o mundo dessa família
  const onChangeFamily = (id: string) => {
    setFamilyId(id);
    const fam = familyMap[id];
    if (fam?.mundo) setMundo(fam.mundo);
  };

  const handleAdd = async () => {
    if (!name.trim() || !familyId) {
      toast.error("Nome e família são obrigatórios");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("product_types").insert({
        name: name.trim(),
        family_id: familyId,
        mundo,
      });
      if (error) throw error;
      toast.success("Tipo criado!");
      queryClient.invalidateQueries({ queryKey: ["types"] });
      setName("");
      setFamilyId("");
      setMundo("todos");
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar tipo");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("product_types").delete().eq("id", id);
      if (error) throw error;
      toast.success("Tipo excluído!");
      queryClient.invalidateQueries({ queryKey: ["types"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao excluir");
    }
  };

  const handleChangeMundo = async (id: string, novoMundo: string) => {
    try {
      const { error } = await supabase.from("product_types").update({ mundo: novoMundo }).eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["types"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar mundo");
    }
  };

  const handleToggleVisible = async (id: string, v: boolean) => {
    try {
      const { error } = await supabase.from("product_types").update({ visivel: v } as any).eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["types"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const [mundoFilter, setMundoFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [familyFilter, setFamilyFilter] = useState("all");
  const s = search.trim().toLowerCase();
  const filteredTypes = types.filter((t) => {
    const fam = familyMap[t.family_id];
    if (mundoFilter !== "all" && (t.mundo ?? "todos") !== mundoFilter) return false;
    if (categoryFilter !== "all" && fam?.category !== categoryFilter) return false;
    if (familyFilter !== "all" && t.family_id !== familyFilter) return false;
    if (!s) return true;
    return (
      t.name.toLowerCase().includes(s) ||
      (fam?.name?.toLowerCase().includes(s) ?? false) ||
      (fam?.category?.toLowerCase().includes(s) ?? false)
    );
  });

  const categoryOptions = Array.from(new Set(families.map((f) => f.category))).sort();
  const familyOptions = categoryFilter === "all"
    ? families
    : families.filter((f) => f.category === categoryFilter);

  // Agrupar por família (e mostrar categoria da família)
  const grouped = families
    .map((fam) => ({
      family: fam,
      items: filteredTypes.filter((t) => t.family_id === fam.id),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Layers className="h-4 w-4" />
          Tipos
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Gerir Tipos (Nível 3)</DialogTitle>
        </DialogHeader>

        {/* Add new */}
        <div className="space-y-3 border-b border-border pb-4">
          <div className="space-y-1">
            <Label>Família</Label>
            <Select value={familyId} onValueChange={onChangeFamily}>
              <SelectTrigger><SelectValue placeholder="Selecione uma família" /></SelectTrigger>
              <SelectContent>
                {families.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.category} → {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {families.length === 0 && (
              <p className="text-xs text-muted-foreground">Cria primeiro uma família em "Famílias".</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Nome do Tipo</Label>
              <Input placeholder="Ex: PRO, 4MP, Grau A..." value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Mundo</Label>
              <Select value={mundo} onValueChange={setMundo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="seguranca">Segurança</SelectItem>
                  <SelectItem value="escritorio">Escritório</SelectItem>
                  <SelectItem value="economato">Economato</SelectItem>
                  <SelectItem value="todos">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleAdd} disabled={loading} size="sm" className="gap-2">
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            Adicionar Tipo
          </Button>
        </div>

        {/* Search */}
        <div className="pt-1">
          <Input
            placeholder="Pesquisar tipo, família ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
          />
        </div>

        {/* List */}
        <div className="space-y-4 pt-1">
          {grouped.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum tipo encontrado.</p>
          )}
          {grouped.map((group) => (
            <div key={group.family.id}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {group.family.category} → {group.family.name}
              </h4>
              <div className="space-y-1">
                {group.items.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2 gap-2">
                    <span className="text-sm font-medium text-foreground flex-1 truncate">{t.name}</span>
                    <Select value={t.mundo ?? "todos"} onValueChange={(v) => handleChangeMundo(t.id, v)}>
                      <SelectTrigger className="h-8 w-[120px] text-xs shrink-0"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="seguranca">Segurança</SelectItem>
                        <SelectItem value="escritorio">Escritório</SelectItem>
                        <SelectItem value="economato">Economato</SelectItem>
                        <SelectItem value="todos">Todos</SelectItem>
                      </SelectContent>
                    </Select>
                    <Switch
                      checked={t.visivel ?? true}
                      onCheckedChange={(v) => handleToggleVisible(t.id, v)}
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleDelete(t.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
