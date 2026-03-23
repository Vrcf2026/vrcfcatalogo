import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Tag, Plus, Trash2, Loader2 } from "lucide-react";

interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
}

interface ManageBrandsDialogProps {
  brands: Brand[];
}

export function ManageBrandsDialog({ brands }: ManageBrandsDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleAdd = async () => {
    if (!name.trim()) {
      toast.error("Nome da marca é obrigatório");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("brands").insert({ name: name.trim() });
      if (error) throw error;
      toast.success("Marca criada!");
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      setName("");
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar marca");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("brands").delete().eq("id", id);
      if (error) throw error;
      toast.success("Marca excluída!");
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao excluir");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Tag className="h-4 w-4" />
          Marcas
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Gerir Marcas</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 border-b border-border pb-4">
          <div className="space-y-1">
            <Label>Nome da Marca</Label>
            <Input placeholder="Ex: Samsung, Hikvision..." value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <Button onClick={handleAdd} disabled={loading} size="sm" className="gap-2">
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            Adicionar Marca
          </Button>
        </div>

        <div className="space-y-1 pt-2">
          {brands.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma marca criada ainda.</p>
          )}
          {brands.map((b) => (
            <div key={b.id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
              <span className="text-sm font-medium text-foreground">{b.name}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(b.id)}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
