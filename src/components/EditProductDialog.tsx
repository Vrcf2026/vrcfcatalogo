import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Save, Trash2, RefreshCw, Upload, Wand2 } from "lucide-react";

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
  categories: string[];
}

export function EditProductDialog({ open, onOpenChange, product, families, categories }: EditProductDialogProps) {
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description || "");
  const [category, setCategory] = useState(product.category || "");
  const [familyId, setFamilyId] = useState(product.family_id || "none");
  const [price, setPrice] = useState(product.price?.toString() || "");
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const filteredFamilies = families.filter((f) => !category || f.category === category);

  const handleGenerateDescription = async () => {
    if (!name.trim()) {
      toast.error("Preencha o nome do produto primeiro");
      return;
    }
    setGeneratingDesc(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-description", {
        body: { productName: name.trim(), category: category || null },
      });
      if (error) throw error;
      if (data?.description) {
        setDescription(data.description);
        toast.success("Descrição gerada!");
      }
    } catch (e: any) {
      toast.error("Erro ao gerar descrição");
    } finally {
      setGeneratingDesc(false);
    }
  };

  const handleUploadImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (files.length > 3) {
      toast.error("Máximo de 3 imagens");
      return;
    }

    setUploading(true);
    try {
      // Delete existing images
      await supabase.from("product_images").delete().eq("product_id", product.id);

      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split(".").pop() || "png";
        const fileName = `${product.id}_manual_${i}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(fileName, file, { contentType: file.type, upsert: true });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }

        const { data: publicUrlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(fileName);

        urls.push(publicUrlData.publicUrl);

        await supabase.from("product_images").insert({
          product_id: product.id,
          image_url: publicUrlData.publicUrl,
          position: i,
        });
      }

      if (urls.length > 0) {
        await supabase.from("products").update({ image_url: urls[0] }).eq("id", product.id);
      }

      toast.success(`${urls.length} imagem(ns) carregada(s)!`);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product_images"] });
    } catch (e: any) {
      toast.error("Erro ao carregar imagens");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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
      queryClient.invalidateQueries({ queryKey: ["product_images"] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Erro ao excluir");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateImage = async () => {
    if (!name.trim()) {
      toast.error("Preencha o nome do produto primeiro");
      return;
    }

    setRegenerating(true);
    toast.info("Geração iniciada em segundo plano. Pode continuar a editar.");

    void supabase.functions
      .invoke("generate-product-image", {
        body: { productName: name.trim(), productId: product.id },
      })
      .then((response) => {
        if (response.error) {
          throw response.error;
        }
        toast.success("Imagens regeneradas!");
        queryClient.invalidateQueries({ queryKey: ["products"] });
        queryClient.invalidateQueries({ queryKey: ["product_images"] });
      })
      .catch((e: any) => {
        console.error("Erro ao regenerar imagens:", e);
        toast.error("Erro ao regenerar imagens");
      })
      .finally(() => {
        setRegenerating(false);
      });
  };

  const isDisabled = loading || uploading || generatingDesc;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Editar Produto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nome *</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-desc">Descrição</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleGenerateDescription}
                disabled={generatingDesc || !name.trim()}
                className="h-7 gap-1 text-xs text-primary"
              >
                {generatingDesc ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                Gerar com IA
              </Button>
            </div>
            <Textarea id="edit-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={(v) => { setCategory(v); setFamilyId("none"); }}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
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

          {/* Image actions */}
          <div className="space-y-2">
            <Label>Imagens</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleUploadImages}
              className="hidden"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isDisabled}
                className="flex-1 gap-2"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Carregar do PC
              </Button>
              <Button variant="outline" onClick={handleRegenerateImage} disabled={isDisabled || regenerating} className="flex-1 gap-2">
                {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Gerar com IA
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={isDisabled} className="flex-1 gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDisabled} size="icon">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
