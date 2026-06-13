import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Tag, Plus, Trash2, Loader2, Link2, ChevronDown, ImagePlus, X } from "lucide-react";

interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
  mundo?: string;
  visivel?: boolean;
}

interface ManageBrandsDialogProps {
  brands: Brand[];
}

interface Family {
  id: string;
  name: string;
  category: string;
}

interface BrandFamilyLink {
  id: string;
  brand_id: string;
  family_id: string;
}

export function ManageBrandsDialog({ brands }: ManageBrandsDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [mundo, setMundo] = useState("todos");
  const [search, setSearch] = useState("");
  const [mundoFilter, setMundoFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const filteredBrands = brands.filter((b) => {
    if (mundoFilter !== "all" && (b.mundo ?? "todos") !== mundoFilter) return false;
    return b.name.toLowerCase().includes(search.toLowerCase());
  });

  const { data: families = [] } = useQuery({
    queryKey: ["families"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_families")
        .select("id, name, category")
        .order("category", { ascending: true });
      if (error) throw error;
      return data as Family[];
    },
    enabled: open,
  });

  const { data: brandFamilies = [] } = useQuery({
    queryKey: ["brand_families"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brand_families").select("*");
      if (error) throw error;
      return data as BrandFamilyLink[];
    },
    enabled: open,
  });

  const familiesByBrand = brandFamilies.reduce<Record<string, Set<string>>>((acc, l) => {
    if (!acc[l.brand_id]) acc[l.brand_id] = new Set();
    acc[l.brand_id].add(l.family_id);
    return acc;
  }, {});

  const handleAdd = async () => {
    if (!name.trim()) {
      toast.error("Nome da marca é obrigatório");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("brands").insert({ name: name.trim(), mundo });
      if (error) throw error;
      toast.success("Marca criada!");
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      setName("");
      setMundo("todos");
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar marca");
    } finally {
      setLoading(false);
    }
  };

  const handleChangeMundo = async (id: string, novoMundo: string) => {
    try {
      const { error } = await supabase.from("brands").update({ mundo: novoMundo }).eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["brands"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar mundo");
    }
  };

  const handleToggleVisible = async (id: string, v: boolean) => {
    try {
      const { error } = await supabase.from("brands").update({ visivel: v } as any).eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["brands"] });
    } catch (e: any) {
      toast.error(e.message || "Erro");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("brands").delete().eq("id", id);
      if (error) throw error;
      toast.success("Marca excluída!");
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      queryClient.invalidateQueries({ queryKey: ["brand_families"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao excluir");
    }
  };

  const handleLogoUpload = async (brand: Brand, file: File) => {
    setUploadingLogo(brand.id);
    try {
      const ext = file.name.split(".").pop() || "png";
      const fileName = `brands/${brand.id}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, file, { contentType: file.type, upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from("product-images").getPublicUrl(fileName);
      // cache-bust so the new logo shows immediately even with same filename
      const logoUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("brands")
        .update({ logo_url: logoUrl })
        .eq("id", brand.id);
      if (updateError) throw updateError;

      toast.success("Logo atualizado!");
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      queryClient.invalidateQueries({ queryKey: ["brands-strip"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar logo");
    } finally {
      setUploadingLogo(null);
    }
  };

  const handleLogoRemove = async (brand: Brand) => {
    try {
      const { error } = await supabase.from("brands").update({ logo_url: null }).eq("id", brand.id);
      if (error) throw error;
      toast.success("Logo removido!");
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      queryClient.invalidateQueries({ queryKey: ["brands-strip"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao remover logo");
    }
  };

  const toggleFamily = async (brandId: string, familyId: string, checked: boolean) => {
    try {
      if (checked) {
        const { error } = await supabase
          .from("brand_families")
          .insert({ brand_id: brandId, family_id: familyId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("brand_families")
          .delete()
          .eq("brand_id", brandId)
          .eq("family_id", familyId);
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["brand_families"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar associação");
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
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Gerir Marcas</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 border-b border-border pb-4">
          <div className="space-y-1">
            <Label>Nome da Marca</Label>
            <Input placeholder="Ex: Samsung, Hikvision..." value={name} onChange={(e) => setName(e.target.value)} />
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
          <Button onClick={handleAdd} disabled={loading} size="sm" className="gap-2">
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            Adicionar Marca
          </Button>
        </div>

        <div className="pt-2 flex gap-2">
          <Input
            placeholder="Pesquisar marca..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 flex-1"
          />
          <Select value={mundoFilter} onValueChange={setMundoFilter}>
            <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os mundos</SelectItem>
              <SelectItem value="seguranca">Segurança</SelectItem>
              <SelectItem value="escritorio">Escritório</SelectItem>
              <SelectItem value="economato">Economato</SelectItem>
              <SelectItem value="todos">Genérico</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          {filteredBrands.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma marca encontrada.</p>
          )}
          {filteredBrands.map((b) => {
            const linked = familiesByBrand[b.id] || new Set<string>();
            return (
              <div key={b.id} className="flex items-center justify-between gap-2 rounded-lg bg-secondary/50 px-3 py-2">
                {/* Logo preview / upload */}
                <label className="relative shrink-0 h-8 w-8 rounded border border-border bg-background flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary transition-colors">
                  {uploadingLogo === b.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  ) : b.logo_url ? (
                    <img src={b.logo_url} alt={b.name} className="h-full w-full object-contain p-0.5" />
                  ) : (
                    <ImagePlus className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingLogo === b.id}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLogoUpload(b, file);
                      e.target.value = "";
                    }}
                  />
                </label>

                <span className="text-sm font-medium text-foreground flex-1 truncate">{b.name}</span>

                <Select value={b.mundo ?? "todos"} onValueChange={(v) => handleChangeMundo(b.id, v)}>
                  <SelectTrigger className="h-8 w-[110px] text-xs shrink-0"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seguranca">Segurança</SelectItem>
                    <SelectItem value="escritorio">Escritório</SelectItem>
                    <SelectItem value="economato">Economato</SelectItem>
                    <SelectItem value="todos">Todos</SelectItem>
                  </SelectContent>
                </Select>

                {b.logo_url && (
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7"
                    title="Remover logo"
                    onClick={() => handleLogoRemove(b)}
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </Button>
                )}

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                      <Link2 className="h-3 w-3" />
                      {linked.size} família{linked.size === 1 ? "" : "s"}
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-0" align="end">
                    <div className="p-3 border-b border-border">
                      <p className="text-xs font-semibold text-foreground">Famílias associadas</p>
                      <p className="text-[11px] text-muted-foreground">Marca: {b.name}</p>
                    </div>
                    <ScrollArea className="max-h-64">
                      <div className="p-2 space-y-1">
                        {families.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-3">Sem famílias.</p>
                        )}
                        {families.map((f) => (
                          <label
                            key={f.id}
                            className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-secondary/60 cursor-pointer"
                          >
                            <Checkbox
                              checked={linked.has(f.id)}
                              onCheckedChange={(c) => toggleFamily(b.id, f.id, !!c)}
                            />
                            <span className="text-xs flex-1 truncate">{f.name}</span>
                            <span className="text-[10px] text-muted-foreground">{f.category}</span>
                          </label>
                        ))}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Switch checked={b.visivel ?? true} onCheckedChange={(v) => handleToggleVisible(b.id, v)} />
                </div>

                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(b.id)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
