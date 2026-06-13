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
import { FolderTree, Plus, Trash2, Loader2 } from "lucide-react";

interface Family {
  id: string;
  name: string;
  category: string;
  description: string | null;
  mundo?: string;
  visivel?: boolean;
}

interface ManageFamiliesDialogProps {
  families: Family[];
  categories: string[];
}

export function ManageFamiliesDialog({ families, categories }: ManageFamiliesDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [mundo, setMundo] = useState("todos");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleAdd = async () => {
    if (!name.trim() || !category) {
      toast.error("Nome e categoria são obrigatórios");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("product_families").insert({
        name: name.trim(),
        category,
        mundo,
        description: description.trim() || null,
      });
      if (error) throw error;
      toast.success("Família criada!");
      queryClient.invalidateQueries({ queryKey: ["families"] });
      setName("");
      setDescription("");
      setCategory("");
      setMundo("todos");
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar família");
    } finally {
      setLoading(false);
    }
  };

  const handleChangeMundo = async (id: string, novoMundo: string) => {
    try {
      const { error } = await supabase.from("product_families").update({ mundo: novoMundo }).eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["families"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar mundo");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("product_families").delete().eq("id", id);
      if (error) throw error;
      toast.success("Família excluída!");
      queryClient.invalidateQueries({ queryKey: ["families"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao excluir");
    }
  };

  const handleToggleVisible = async (id: string, v: boolean) => {
    try {
      const { error } = await supabase.from("product_families").update({ visivel: v } as any).eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["families"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const [mundoFilter, setMundoFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const s = search.trim().toLowerCase();
  const filteredFamilies = families.filter((f) => {
    if (mundoFilter !== "all" && (f.mundo ?? "todos") !== mundoFilter) return false;
    if (categoryFilter !== "all" && f.category !== categoryFilter) return false;
    if (!s) return true;
    return f.name.toLowerCase().includes(s) || f.category.toLowerCase().includes(s);
  });

  const grouped = categories.map((cat) => ({
    category: cat,
    items: filteredFamilies.filter((f) => f.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FolderTree className="h-4 w-4" />
          Famílias
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Gerenciar Famílias</DialogTitle>
        </DialogHeader>

        {/* Add new */}
        <div className="space-y-3 border-b border-border pb-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input placeholder="Ex: Samsung Galaxy" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
          <Input placeholder="Descrição (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Button onClick={handleAdd} disabled={loading} size="sm" className="gap-2">
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            Adicionar Família
          </Button>
        </div>

        {/* Search + filtros */}
        <div className="pt-1 space-y-2">
          <Input
            placeholder="Pesquisar família..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
          />
          <div className="grid grid-cols-2 gap-2">
            <Select value={mundoFilter} onValueChange={setMundoFilter}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os mundos</SelectItem>
                <SelectItem value="seguranca">Segurança</SelectItem>
                <SelectItem value="escritorio">Escritório</SelectItem>
                <SelectItem value="economato">Economato</SelectItem>
                <SelectItem value="todos">Genérico</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* List */}
        <div className="space-y-4 pt-1">
          {grouped.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma família encontrada.</p>
          )}
          {grouped.map((group) => (
            <div key={group.category}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {group.category}
              </h4>
              <div className="space-y-1">
                {group.items.map((f) => (
                  <div key={f.id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2 gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-foreground">{f.name}</span>
                      {f.description && (
                        <span className="ml-2 text-xs text-muted-foreground">{f.description}</span>
                      )}
                    </div>
                    <Select value={f.mundo ?? "todos"} onValueChange={(v) => handleChangeMundo(f.id, v)}>
                      <SelectTrigger className="h-8 w-[120px] text-xs shrink-0"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="seguranca">Segurança</SelectItem>
                        <SelectItem value="escritorio">Escritório</SelectItem>
                        <SelectItem value="economato">Economato</SelectItem>
                        <SelectItem value="todos">Todos</SelectItem>
                      </SelectContent>
                    </Select>
                    <Switch
                      checked={f.visivel ?? true}
                      onCheckedChange={(v) => handleToggleVisible(f.id, v)}
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleDelete(f.id)}>
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
