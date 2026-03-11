import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Save, Trash2, RefreshCw } from "lucide-react";

const CATEGORIES = [
  "Smartphones", "Laptops", "Tablets", "Acessórios",
  "Áudio", "Gaming", "Câmeras", "Wearables", "Outros",
];

interface EditProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    price: number | null;
    image_url: string | null;
    family_id: string | null;
  };
  families: { id: string; name: string; category: string }[];
}

export function EditProductDialog({ open, onOpenChange, product, families }: EditProductDialogProps) {
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description || "");
  const [category, setCategory] = useState(product.category || "");
  const [familyId, setFamilyId] = useState(product.family_id || "none");
  const [price, setPrice] = useState(product.price?.toString() || "");
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const queryClient = useQueryClient();

  const filteredFamilies = families.filter((f) => !category || f.category === category);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from("products")
        .update({
          name: name.trim(),
          description: description.trim() || null,
          category: category || null,
          price: price ? parseFloat(price) : null,
          family_id: familyId === "none" ? null : familyId,
        })
        .eq("id", product.id);
      if (error) throw error;
      toast.success("Produto atualizado!");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("products").delete().eq("id", product.id);
      if (error) throw error;
      toast.success("Produto excluído!");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Erro ao excluir");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateImage = async () => {
    setRegenerating(true);
    try {
      toast.info("Regenerando imagem com IA...");
      const response = await supabase.functions.invoke("generate-product-image", {
        body: { productName: name.trim(), productId: product.id },
      });
      if (response.error) throw response.error;
      toast.success("Imagem regenerada!");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (e: any) {
      toast.error("Erro ao regenerar imagem");
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Editar Produto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nome *</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-desc">Descrição</Label>
            <Textarea id="edit-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={(v) => { setCategory(v); setFamilyId("none"); }}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-price">Preço (€)</Label>
              <Input id="edit-price" type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Família</Label>
            <Select value={familyId} onValueChange={setFamilyId}>
              <SelectTrigger><SelectValue placeholder="Sem família" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem família</SelectItem>
                {filteredFamilies.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={loading || regenerating} className="flex-1 gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </Button>
            <Button variant="outline" onClick={handleRegenerateImage} disabled={loading || regenerating} className="gap-2">
              {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Imagem IA
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading || regenerating} size="icon">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
