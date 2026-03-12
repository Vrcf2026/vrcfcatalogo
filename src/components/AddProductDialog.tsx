import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Sparkles, Loader2 } from "lucide-react";

const CATEGORIES = [
  "Smartphones", "Laptops", "Tablets", "Acessórios",
  "Áudio", "Gaming", "Câmeras", "Wearables", "Outros",
];

interface AddProductDialogProps {
  families: { id: string; name: string; category: string }[];
}

export function AddProductDialog({ families }: AddProductDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [familyId, setFamilyId] = useState("none");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const queryClient = useQueryClient();

  const filteredFamilies = families.filter((f) => !category || f.category === category);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Nome do produto é obrigatório");
      return;
    }

    setLoading(true);
    try {
      const { data: product, error } = await supabase
        .from("products")
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          category: category || null,
          price: price ? parseFloat(price) : null,
          family_id: familyId === "none" ? null : familyId,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success("Produto adicionado!");

      setGeneratingImage(true);
      toast.info("Gerando 3 imagens com IA...");

      const response = await supabase.functions.invoke("generate-product-image", {
        body: { productName: name.trim(), productId: product.id },
      });

      if (response.error) {
        console.error("Image generation error:", response.error);
        toast.warning("Produto salvo, mas as imagens não puderam ser geradas.");
      } else {
        toast.success("Imagens geradas com sucesso!");
      }

      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product_images"] });
      setOpen(false);
      resetForm();
    } catch (e: any) {
      toast.error(e.message || "Erro ao adicionar produto");
    } finally {
      setLoading(false);
      setGeneratingImage(false);
    }
  };

  const resetForm = () => {
    setName(""); setDescription(""); setCategory(""); setPrice(""); setFamilyId("none");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Produto
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Adicionar Produto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Produto *</Label>
            <div className="relative">
              <Input id="name" placeholder="Ex: iPhone 15 Pro Max" value={name} onChange={(e) => setName(e.target.value)} />
              <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">A IA vai gerar uma imagem automaticamente com base no nome</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" placeholder="Descreva o produto..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
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
              <Label htmlFor="price">Preço (€)</Label>
              <Input id="price" type="number" step="0.01" min="0" placeholder="0,00" value={price} onChange={(e) => setPrice(e.target.value)} />
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

          <Button onClick={handleSubmit} disabled={loading} className="w-full gap-2">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {generatingImage ? "Gerando imagem..." : "Salvando..."}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Adicionar com Imagem IA
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
