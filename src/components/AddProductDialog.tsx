import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plus, Wand2, Loader2, Sparkles, Save } from "lucide-react";
import { ImageSlotPicker, type ImageSlot } from "@/components/ImageSlotPicker";

interface AddProductDialogProps {
  families: { id: string; name: string; category: string; mundo?: string }[];
  types?: { id: string; name: string; family_id: string; mundo?: string }[];
  categories: string[];
  brands: { id: string; name: string }[];
}

const STOCK_OPTIONS = [
  { value: "high", label: "Em stock" },
  { value: "low", label: "Stock baixo" },
  { value: "out", label: "Sem stock" },
];

export function AddProductDialog({ families, types = [], categories, brands }: AddProductDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);

  // Geral
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [mundo, setMundo] = useState("escritorio");
  const [category, setCategory] = useState("");
  const [familyId, setFamilyId] = useState("none");
  const [typeId, setTypeId] = useState("none");
  const [brandId, setBrandId] = useState("none");
  const [stockStatus, setStockStatus] = useState("high");
  const [sobEncomenda, setSobEncomenda] = useState(false);
  const [includeInCatalog, setIncludeInCatalog] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageSlots, setImageSlots] = useState<ImageSlot[]>([]);

  // Preços
  const [price, setPrice] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchasePriceVat, setPurchasePriceVat] = useState("");
  const [weight, setWeight] = useState("");
  const [minSaleQty, setMinSaleQty] = useState("1");

  // Campos calculados
  const priceWithVat = price ? (parseFloat(price) * 1.23).toFixed(2) : null;
  const margem = purchasePrice && price
    ? ((parseFloat(price) - parseFloat(purchasePrice)) / parseFloat(purchasePrice) * 100).toFixed(1)
    : null;

  const handlePurchasePriceChange = (val: string) => {
    setPurchasePrice(val);
    if (val && !isNaN(parseFloat(val))) {
      setPurchasePriceVat((parseFloat(val) * 1.23).toFixed(2));
    } else {
      setPurchasePriceVat("");
    }
  };

  const queryClient = useQueryClient();

  const filteredFamilies = families.filter((f) => !category || f.category === category);
  const filteredTypes = types.filter(
    (t) => t.family_id === familyId && (!t.mundo || t.mundo === "todos" || t.mundo === mundo)
  );

  const handleGenerateDescription = async () => {
    if (!name.trim()) { toast.error("Preencha o nome do produto primeiro"); return; }
    setGeneratingDesc(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-description", {
        body: { productName: name.trim(), category: category || null },
      });
      if (error) throw error;
      if (data?.description) { setDescription(data.description); toast.success("Descrição gerada!"); }
    } catch { toast.error("Erro ao gerar descrição"); }
    finally { setGeneratingDesc(false); }
  };

  const saveSlotImage = async (productId: string, slot: ImageSlot, position: number): Promise<string | null> => {
    if (slot.source === "upload" && slot.file) {
      const ext = slot.file.name.split(".").pop() || "png";
      const fileName = `${productId}_upload_${position}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(fileName, slot.file, { contentType: slot.file.type, upsert: true });
      if (error) return null;
      const { data } = supabase.storage.from("product-images").getPublicUrl(fileName);
      await supabase.from("product_images").insert({ product_id: productId, image_url: data.publicUrl, position });
      return data.publicUrl;
    }
    if (slot.url?.startsWith("http")) {
      await supabase.from("product_images").insert({ product_id: productId, image_url: slot.url, position });
      return slot.url;
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Nome do produto é obrigatório"); return; }
    setLoading(true);
    try {
      const { data: product, error } = await supabase.from("products").insert({
        name: name.trim(),
        sku: sku.trim() || null,
        description: description.trim() || null,
        category: category || null,
        family_id: familyId === "none" ? null : familyId,
        type_id: typeId === "none" ? null : typeId,
        brand_id: brandId === "none" ? null : brandId,
        mundo,
        price: price ? parseFloat(price) : null,
        purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
        purchase_price_vat: purchasePriceVat ? parseFloat(purchasePriceVat) : null,
        weight: weight ? parseFloat(weight) : null,
        min_sale_qty: minSaleQty ? parseInt(minSaleQty) : 1,
        stock_status: stockStatus,
        sob_encomenda: sobEncomenda,
        include_in_catalog: includeInCatalog,
        featured,
        image_url: imageUrl.trim() || null,
        fornecedor: "manual",
      }).select().single();

      if (error) throw error;

      // Guardar imagens dos slots
      if (imageSlots.length > 0) {
        const savedUrls: string[] = [];
        for (let i = 0; i < imageSlots.length; i++) {
          const url = await saveSlotImage(product.id, imageSlots[i], i);
          if (url) savedUrls.push(url);
        }
        if (savedUrls.length > 0 && !imageUrl.trim()) {
          await supabase.from("products").update({ image_url: savedUrls[0] }).eq("id", product.id);
        }
      }

      toast.success("Produto criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setOpen(false);
      resetForm();
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar produto");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName(""); setSku(""); setDescription(""); setMundo("escritorio");
    setCategory(""); setFamilyId("none"); setTypeId("none"); setBrandId("none");
    setPrice(""); setPurchasePrice(""); setPurchasePriceVat(""); setWeight(""); setMinSaleQty("1");
    setStockStatus("high"); setSobEncomenda(false); setIncludeInCatalog(true); setFeatured(false);
    setImageUrl(""); setImageSlots([]);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Novo Produto</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl flex items-center gap-2">
            <Plus className="h-5 w-5" /> Novo Produto
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="geral" className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="precos">Preços</TabsTrigger>
            <TabsTrigger value="imagens">Imagens</TabsTrigger>
            <TabsTrigger value="visibilidade">Opções</TabsTrigger>
          </TabsList>

          {/* ── GERAL ── */}
          <TabsContent value="geral" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Nome *</Label>
                <Input placeholder="Nome do produto" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>SKU / Referência</Label>
                <Input placeholder="REF-001" value={sku} onChange={(e) => setSku(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Mundo</Label>
                <Select value={mundo} onValueChange={(v) => { setMundo(v); setTypeId("none"); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="escritorio">Escritório & IT</SelectItem>
                    <SelectItem value="seguranca">Segurança & Redes</SelectItem>
                    <SelectItem value="economato">Economato</SelectItem>
                    <SelectItem value="todos">Todos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Descrição</Label>
                <Button type="button" variant="ghost" size="sm" onClick={handleGenerateDescription}
                  disabled={generatingDesc || !name.trim()} className="h-7 gap-1 text-xs text-primary">
                  {generatingDesc ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                  Gerar com IA
                </Button>
              </div>
              <Textarea placeholder="Descrição do produto..." value={description}
                onChange={(e) => setDescription(e.target.value)} rows={4} />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={category} onValueChange={(v) => { setCategory(v); setFamilyId("none"); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Família</Label>
                <Select value={familyId} onValueChange={(v) => { setFamilyId(v); setTypeId("none"); }}>
                  <SelectTrigger><SelectValue placeholder="Sem família" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem família</SelectItem>
                    {filteredFamilies.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo (Nível 3)</Label>
                <Select value={typeId} onValueChange={setTypeId} disabled={filteredTypes.length === 0}>
                  <SelectTrigger><SelectValue placeholder={familyId === "none" ? "Escolha a família" : "Sem tipo"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem tipo</SelectItem>
                    {filteredTypes.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Marca</Label>
                <Select value={brandId} onValueChange={setBrandId}>
                  <SelectTrigger><SelectValue placeholder="Sem marca" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem marca</SelectItem>
                    {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Stock</Label>
              <Select value={stockStatus} onValueChange={setStockStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STOCK_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* ── PREÇOS ── */}
          <TabsContent value="precos" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Custo sem IVA (€)</Label>
                <Input type="number" step="0.01" value={purchasePrice}
                  onChange={(e) => handlePurchasePriceChange(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Custo com IVA (€) <span className="text-muted-foreground text-xs">auto</span></Label>
                <Input type="number" step="0.01" value={purchasePriceVat}
                  onChange={(e) => setPurchasePriceVat(e.target.value)}
                  className="bg-muted/30" placeholder="0.00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preço venda s/ IVA (€)</Label>
                <Input type="number" step="0.01" value={price}
                  onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Preço venda c/ IVA (€) <span className="text-muted-foreground text-xs">calc.</span></Label>
                <Input type="number" step="0.01" value={priceWithVat ?? ""}
                  readOnly className="bg-muted/30 cursor-default" placeholder="0.00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Peso (kg)</Label>
                <Input type="number" step="0.001" value={weight}
                  onChange={(e) => setWeight(e.target.value)} placeholder="0.000" />
              </div>
              <div className="space-y-2">
                <Label>Qtd. mínima de venda</Label>
                <Input type="number" step="1" min="1" value={minSaleQty}
                  onChange={(e) => setMinSaleQty(e.target.value)} />
              </div>
            </div>
            {margem && (
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <span className="text-muted-foreground">Margem: </span>
                <span className="font-semibold">{margem}%</span>
                {purchasePrice && price && (
                  <span className="text-muted-foreground ml-2">
                    ({(parseFloat(price) - parseFloat(purchasePrice)).toFixed(2)}€ por unidade)
                  </span>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── IMAGENS ── */}
          <TabsContent value="imagens" className="space-y-4">
            <div className="space-y-2">
              <Label>URL da imagem principal</Label>
              <Input placeholder="https://..." value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)} />
              {imageUrl && (
                <img src={imageUrl} alt="" className="h-24 w-24 object-contain rounded border bg-muted" />
              )}
            </div>
            <Separator />
            <ImageSlotPicker
              slots={imageSlots} onSlotsChange={setImageSlots}
              productName={name} disabled={loading}
            />
          </TabsContent>

          {/* ── OPÇÕES ── */}
          <TabsContent value="visibilidade" className="space-y-4">
            <div className="space-y-3">
              {[
                { label: "Visível no catálogo", val: includeInCatalog, set: setIncludeInCatalog },
                { label: "Destaque na família", val: featured, set: setFeatured },
                { label: "Sob encomenda", val: sobEncomenda, set: setSobEncomenda },
              ].map(({ label, val, set }) => (
                <div key={label} className="flex items-center justify-between py-1">
                  <Label className="text-sm">{label}</Label>
                  <Switch checked={val} onCheckedChange={set} />
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <div className="pt-2 border-t border-border">
          <Button onClick={handleSubmit} disabled={loading} className="w-full gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {loading ? "A guardar..." : "Criar Produto"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
