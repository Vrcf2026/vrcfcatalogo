import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Image, ExternalLink, Pencil, Upload } from "lucide-react";

// Proporção/dimensões alvo do carrossel (ver Index.tsx / WorldCatalog.tsx:
// style={{ maxHeight: 240 }}, w-full object-cover).
const BANNER_WIDTH = 1200;
const BANNER_HEIGHT = 300;
const BANNER_QUALITY = 0.82; // qualidade WebP — boa relação tamanho/nitidez

/**
 * Redimensiona/recorta uma imagem para exactamente BANNER_WIDTH x
 * BANNER_HEIGHT (cobrindo todo o quadro, tipo "object-cover") e converte
 * para WebP com a qualidade definida — produz ficheiros muito mais
 * pequenos que o JPG original sem perda visível para banners.
 */
function compressBannerImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = BANNER_WIDTH;
      canvas.height = BANNER_HEIGHT;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas não suportado")); return; }

      // Cobrir o quadro mantendo a proporção (crop central), como
      // "object-cover" em CSS.
      const targetRatio = BANNER_WIDTH / BANNER_HEIGHT;
      const srcRatio = img.width / img.height;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (srcRatio > targetRatio) {
        sw = img.height * targetRatio;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / targetRatio;
        sy = (img.height - sh) / 2;
      }

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, BANNER_WIDTH, BANNER_HEIGHT);
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("Falha ao gerar imagem")),
        "image/webp",
        BANNER_QUALITY,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Não foi possível ler a imagem")); };
    img.src = url;
  });
}

interface BannerForm {
  id: string | null;
  imageUrl: string;
  link: string;
  titulo: string;
  mundo: string;
  ordem: string;
}

const EMPTY_FORM: BannerForm = { id: null, imageUrl: "", link: "", titulo: "", mundo: "todos", ordem: "0" };

export function BannersManager() {
  const [form, setForm] = useState<BannerForm | null>(null); // null = formulário fechado
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ["banners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("banners").select("*").order("ordem");
      if (error) throw error;
      return data;
    },
  });

  const openNew = () => setForm({ ...EMPTY_FORM });

  const openEdit = (b: any) => setForm({
    id: b.id,
    imageUrl: b.image_url || "",
    link: b.link || "",
    titulo: b.titulo || "",
    mundo: b.mundo || "todos",
    ordem: String(b.ordem ?? 0),
  });

  const handleSave = async () => {
    if (!form) return;
    if (!form.imageUrl.trim()) { toast.error("Imagem obrigatória — carrega um ficheiro ou cola um URL"); return; }
    setSaving(true);
    try {
      const payload = {
        image_url: form.imageUrl.trim(),
        link: form.link.trim() || null,
        titulo: form.titulo.trim() || null,
        mundo: form.mundo,
        ordem: parseInt(form.ordem) || 0,
      };
      if (form.id) {
        const { error } = await supabase.from("banners").update(payload).eq("id", form.id);
        if (error) throw error;
        toast.success("Banner atualizado");
      } else {
        const { error } = await supabase.from("banners").insert({ ...payload, ativo: true });
        if (error) throw error;
        toast.success("Banner adicionado");
      }
      setForm(null);
      queryClient.invalidateQueries({ queryKey: ["banners"] });
      queryClient.invalidateQueries({ queryKey: ["hp-banners"] });
      queryClient.invalidateQueries({ queryKey: ["world-banners"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string, ativo: boolean) => {
    await supabase.from("banners").update({ ativo }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["banners"] });
    queryClient.invalidateQueries({ queryKey: ["hp-banners"] });
    queryClient.invalidateQueries({ queryKey: ["world-banners"] });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminar este banner?")) return;
    await supabase.from("banners").delete().eq("id", id);
    toast.success("Banner eliminado");
    queryClient.invalidateQueries({ queryKey: ["banners"] });
    queryClient.invalidateQueries({ queryKey: ["hp-banners"] });
    queryClient.invalidateQueries({ queryKey: ["world-banners"] });
  };

  // Upload com compressão automática: redimensiona/recorta para 1200x300 e
  // converte para WebP antes de enviar para o Storage — fica muito mais
  // pequeno que o JPG/PNG original, sem perder qualidade visível.
  const handleFileUpload = async (file: File) => {
    if (!form) return;
    setUploading(true);
    try {
      const compressed = await compressBannerImage(file);
      const fileName = `banners/${Date.now()}.webp`;
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, compressed, { contentType: "image/webp", upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from("product-images").getPublicUrl(fileName);
      setForm(prev => prev ? { ...prev, imageUrl: publicUrlData.publicUrl } : prev);
      toast.success(`Imagem comprimida e enviada (${(compressed.size / 1024).toFixed(0)} KB)`);
    } catch (e: any) {
      toast.error(e.message || "Erro ao processar/enviar imagem");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Banners Rotativos</h3>
          <p className="text-sm text-muted-foreground">Carrossel no topo do catálogo — rotação automática de 5 em 5 segundos</p>
        </div>
        <Button size="sm" onClick={() => form ? setForm(null) : openNew()} className="gap-1.5">
          <Plus className="h-4 w-4" /> Novo Banner
        </Button>
      </div>

      {form && (
        <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
          <h4 className="text-sm font-medium">{form.id ? "Editar Banner" : "Novo Banner"}</h4>

          <div className="space-y-2">
            <Label className="text-xs">Imagem *</Label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
              />
              <Button
                type="button" size="sm" variant="outline" className="gap-1.5 h-8 text-xs"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                Importar imagem (JPG/PNG)
              </Button>
              <span className="text-xs text-muted-foreground">
                Convertida automaticamente para WebP {BANNER_WIDTH}×{BANNER_HEIGHT}
              </span>
            </div>
            <Input
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              placeholder="ou cola aqui um URL de imagem (https://...)"
              className="h-8 text-sm"
            />
            {form.imageUrl && (
              <img src={form.imageUrl} alt="" className="w-full max-w-md object-cover rounded border bg-muted" style={{ aspectRatio: `${BANNER_WIDTH}/${BANNER_HEIGHT}` }} />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Título (opcional)</Label>
              <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Título do banner" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Link de destino</Label>
              <Input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="/escritorio/produto-x" className="h-8 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Mostrar em</Label>
              <Select value={form.mundo} onValueChange={(v) => setForm({ ...form, mundo: v })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos (homepage + todos os mundos)</SelectItem>
                  <SelectItem value="homepage">Apenas homepage</SelectItem>
                  <SelectItem value="escritorio">Escritório & IT</SelectItem>
                  <SelectItem value="seguranca">Segurança & Redes</SelectItem>
                  <SelectItem value="economato">Economato</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ordem</Label>
              <Input type="number" value={form.ordem} onChange={(e) => setForm({ ...form, ordem: e.target.value })} className="h-8 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving || uploading} className="gap-1.5">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              {form.id ? "Guardar alterações" : "Adicionar"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setForm(null)}>Cancelar</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : banners.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
          <Image className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum banner criado ainda.</p>
          <p className="text-xs mt-1">Cria o teu primeiro banner com uma imagem promocional.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map((b: any) => (
            <div key={b.id} className="flex items-center gap-3 border rounded-lg p-3">
              {b.image_url && (
                <img src={b.image_url} alt={b.titulo || ""} className="h-14 w-24 object-cover rounded border bg-muted flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium truncate">{b.titulo || "Sem título"}</span>
                  <Badge variant="outline" className="text-[10px] capitalize flex-shrink-0">{b.mundo}</Badge>
                  <span className="text-xs text-muted-foreground">#{b.ordem}</span>
                </div>
                {b.link && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ExternalLink className="h-3 w-3" />
                    <span className="truncate">{b.link}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Switch checked={!!b.ativo} onCheckedChange={(v) => handleToggle(b.id, v)} />
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => openEdit(b)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(b.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
