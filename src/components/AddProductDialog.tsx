import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Sparkles, Loader2, Upload, Wand2 } from "lucide-react";

interface AddProductDialogProps {
  families: { id: string; name: string; category: string }[];
  categories: string[];
}

export function AddProductDialog({ families, categories }: AddProductDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [familyId, setFamilyId] = useState("none");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + uploadedFiles.length > 3) {
      toast.error("Máximo de 3 imagens");
      return;
    }
    setUploadedFiles(prev => [...prev, ...files].slice(0, 3));
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadManualImages = async (productId: string) => {
    const urls: string[] = [];
    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      const ext = file.name.split(".").pop() || "png";
      const fileName = `${productId}_manual_${i}.${ext}`;
      
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
        product_id: productId,
        image_url: publicUrlData.publicUrl,
        position: i,
      });
    }

    if (urls.length > 0) {
      await supabase.from("products").update({ image_url: urls[0] }).eq("id", productId);
    }
    return urls;
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Nome do produto é obrigatório");
      return;
    }

    setLoading(true);
    const productName = name.trim();

    try {
      const { data: product, error } = await supabase
        .from("products")
        .insert({
          name: productName,
          description: description.trim() || null,
          category: category || null,
          price: price ? parseFloat(price) : null,
          family_id: familyId === "none" ? null : familyId,
        })
        .select()
        .single();

      if (error) throw error;

      if (uploadedFiles.length > 0) {
        toast.info("Produto guardado. A carregar imagens...");
        await uploadManualImages(product.id);
        toast.success("Produto e imagens guardados!");
        queryClient.invalidateQueries({ queryKey: ["products"] });
        queryClient.invalidateQueries({ queryKey: ["product_images"] });
      } else {
        toast.success("Produto guardado!");
        toast.info("A gerar imagens em segundo plano. Pode continuar a usar o painel.");

        void supabase.functions
          .invoke("generate-product-image", {
            body: { productName, productId: product.id },
          })
          .then((response) => {
            if (response.error) {
              console.error("Image generation error:", response.error);
              toast.warning("Produto guardado, mas não foi possível gerar imagens.");
              return;
            }
            toast.success("Imagens geradas com sucesso!");
          })
          .catch((error) => {
            console.error("Image generation request failed:", error);
            toast.warning("Produto guardado, mas a geração de imagens falhou.");
          })
          .finally(() => {
            queryClient.invalidateQueries({ queryKey: ["products"] });
            queryClient.invalidateQueries({ queryKey: ["product_images"] });
          });
      }

      setOpen(false);
      resetForm();
    } catch (e: any) {
      toast.error(e.message || "Erro ao adicionar produto");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName(""); setDescription(""); setCategory(""); setPrice(""); setFamilyId("none"); setUploadedFiles([]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Produto
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
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
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description">Descrição</Label>
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
            <Textarea id="description" placeholder="Descreva o produto ou use a IA..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
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

          {/* Manual Image Upload */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Imagens próprias (opcional)</Label>
              <span className="text-xs text-muted-foreground">{uploadedFiles.length}/3</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadedFiles.length >= 3}
              className="w-full gap-2"
            >
              <Upload className="h-4 w-4" />
              Carregar imagens do PC
            </Button>
            {uploadedFiles.length > 0 && (
              <div className="flex gap-2 mt-2">
                {uploadedFiles.map((file, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-md overflow-hidden border border-border">
                    <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeFile(idx)}
                      className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl text-xs w-4 h-4 flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            {uploadedFiles.length === 0 && (
              <p className="text-xs text-muted-foreground">Se não carregar imagens, a IA gera 3 automaticamente</p>
            )}
          </div>

          <Button onClick={handleSubmit} disabled={loading} className="w-full gap-2">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {generatingImage ? "Gerando imagens..." : "Salvando..."}
              </>
            ) : (
              <>
                {uploadedFiles.length > 0 ? <Upload className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                {uploadedFiles.length > 0 ? "Adicionar com Imagens" : "Adicionar com Imagem IA"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
