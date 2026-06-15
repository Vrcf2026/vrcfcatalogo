import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Image, ExternalLink } from "lucide-react";

export function BannersManager() {
  const [adding, setAdding] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [link, setLink] = useState("");
  const [titulo, setTitulo] = useState("");
  const [mundo, setMundo] = useState("todos");
  const [ordem, setOrdem] = useState("0");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ["banners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("banners").select("*").order("ordem");
      if (error) throw error;
      return data;
    },
  });

  const handleAdd = async () => {
    if (!imageUrl.trim()) { toast.error("URL da imagem obrigatório"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("banners").insert({
        image_url: imageUrl.trim(),
        link: link.trim() || null,
        titulo: titulo.trim() || null,
        mundo,
        ordem: parseInt(ordem) || 0,
        ativo: true,
      });
      if (error) throw error;
      toast.success("Banner adicionado");
      setImageUrl(""); setLink(""); setTitulo(""); setMundo("todos"); setOrdem("0");
      setAdding(false);
      queryClient.invalidateQueries({ queryKey: ["banners"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string, ativo: boolean) => {
    await supabase.from("banners").update({ ativo }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["banners"] });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminar este banner?")) return;
    await supabase.from("banners").delete().eq("id", id);
    toast.success("Banner eliminado");
    queryClient.invalidateQueries({ queryKey: ["banners"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Banners Rotativos</h3>
          <p className="text-sm text-muted-foreground">Carrossel no topo do catálogo — rotação automática de 5 em 5 segundos</p>
        </div>
        <Button size="sm" onClick={() => setAdding(!adding)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Novo Banner
        </Button>
      </div>

      {adding && (
        <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
          <h4 className="text-sm font-medium">Novo Banner</h4>
          <div className="space-y-2">
            <Label className="text-xs">URL da imagem *</Label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="h-8 text-sm" />
            {imageUrl && <img src={imageUrl} alt="" className="h-20 object-contain rounded border bg-muted" />}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Título (opcional)</Label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título do banner" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Link de destino</Label>
              <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="/escritorio/produto-x" className="h-8 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Mostrar em</Label>
              <Select value={mundo} onValueChange={setMundo}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos (homepage + todos os mundos)</SelectItem>
                  <SelectItem value="escritorio">Escritório & IT</SelectItem>
                  <SelectItem value="seguranca">Segurança & Redes</SelectItem>
                  <SelectItem value="economato">Economato</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ordem</Label>
              <Input type="number" value={ordem} onChange={(e) => setOrdem(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Adicionar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancelar</Button>
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
