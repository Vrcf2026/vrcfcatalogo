import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Save, Trash2, Plus, X, Lock, Unlock } from "lucide-react";

interface EditProductSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: any;
  families: { id: string; name: string; category: string }[];
  categories: string[];
  brands: { id: string; name: string }[];
  types?: { id: string; name: string; family_id: string }[];
}

const TECLADO_OPTIONS = ["PT", "ES", "Internacional", "Personalizável"];
const GRAU_OPTIONS = ["A", "B", "C"];
const STOCK_OPTIONS = ["high", "low", "out"];

export function EditProductSheet({ open, onOpenChange, product, families, categories, brands, types = [] }: EditProductSheetProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [familyId, setFamilyId] = useState("none");
  const [brandId, setBrandId] = useState("none");
  const [typeId, setTypeId] = useState("none");
  const [familyText, setFamilyText] = useState("");
  const [brandText, setBrandText] = useState("");
  const [price, setPrice] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchasePriceVat, setPurchasePriceVat] = useState("");
  const [weight, setWeight] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [mundo, setMundo] = useState("escritorio");
  const [stockStatus, setStockStatus] = useState("high");
  const [sobEncomenda, setSobEncomenda] = useState(false);
  const [includeInCatalog, setIncludeInCatalog] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [showOnHomepage, setShowOnHomepage] = useState(false);
  const [specs, setSpecs] = useState<Record<string, string>>({});
  const [specsLocked, setSpecsLocked] = useState<string[]>([]);
  const [upgrades, setUpgrades] = useState<{ tipo: string; descricao: string; preco: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const filteredFamilies = families.filter((f) => !category || f.category === category);
  const filteredTypes = types.filter((t) => familyId !== "none" && t.family_id === familyId);

  // Margem calculada
  const margem = purchasePrice && price
    ? ((parseFloat(price) - parseFloat(purchasePrice)) / parseFloat(purchasePrice) * 100).toFixed(1)
    : null;

  useEffect(() => {
    if (!open || !product) return;
    setName(product.name || "");
    setDescription(product.description || "");
    setCategory(product.category || "");
    setFamilyId(product.family_id || "none");
    setBrandId(product.brand_id || "none");
    setTypeId(product.type_id || "none");
    setFamilyText(product.family || "");
    setBrandText(product.brand || "");
    setPrice(product.price?.toString() || "");
    setPurchasePrice(product.purchase_price?.toString() || "");
    setPurchasePriceVat(product.purchase_price_vat?.toString() || "");
    setWeight(product.weight?.toString() || "");
    setImageUrl(product.image_url || "");
    setMundo(product.mundo || "escritorio");
    setStockStatus(product.stock_status || "high");
    setSobEncomenda(!!product.sob_encomenda);
    setIncludeInCatalog(product.include_in_catalog !== false);
    setFeatured(!!product.featured);
    setShowOnHomepage(!!product.show_on_homepage);

    // Specs
    const rawSpecs = typeof product.especificacoes === "string"
      ? JSON.parse(product.especificacoes || "{}")
      : (product.especificacoes || {});
    setSpecs(rawSpecs);
    setSpecsLocked(Array.isArray(product.specs_locked) ? product.specs_locked : []);

    // Upgrades
    const rawUpgrades = Array.isArray(product.upgrades) ? product.upgrades : [];
    setUpgrades(rawUpgrades.length > 0 ? rawUpgrades : []);
  }, [open, product]);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Nome obrigatório"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.from("products").update({
        name: name.trim(),
        description: description.trim() || null,
        category: category || null,
        family_id: familyId === "none" ? null : familyId,
        brand_id: brandId === "none" ? null : brandId,
        type_id: typeId === "none" ? null : typeId,
        type: typeId === "none" ? null : (types.find((t) => t.id === typeId)?.name ?? null),
        family: familyText || null,
        brand: brandText || null,
        price: price ? parseFloat(price) : null,
        purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
        purchase_price_vat: purchasePriceVat ? parseFloat(purchasePriceVat) : null,
        weight: weight ? parseFloat(weight) : null,
        image_url: imageUrl || null,
        mundo,
        stock_status: stockStatus,
        sob_encomenda: sobEncomenda,
        include_in_catalog: includeInCatalog,
        featured,
        show_on_homepage: showOnHomepage,
        especificacoes: specs,
        specs_locked: specsLocked,
        upgrades: upgrades.filter(u => u.tipo || u.descricao),
      }).eq("id", product.id);
      if (error) throw error;
      toast.success("Produto guardado");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Erro ao guardar");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Eliminar este produto? Esta acção não pode ser revertida.")) return;
    setLoading(true);
    try {
      await supabase.from("product_images").delete().eq("product_id", product.id);
      const { error } = await supabase.from("products").delete().eq("id", product.id);
      if (error) throw error;
      toast.success("Produto eliminado");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Erro ao eliminar");
    } finally {
      setLoading(false);
    }
  };

  const updateSpec = (key: string, val: string) => {
    setSpecs(prev => val ? { ...prev, [key]: val } : Object.fromEntries(Object.entries(prev).filter(([k]) => k !== key)));
  };

  const toggleLock = (key: string) => {
    setSpecsLocked(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const addUpgrade = () => setUpgrades(prev => [...prev, { tipo: "", descricao: "", preco: "" }]);
  const removeUpgrade = (i: number) => setUpgrades(prev => prev.filter((_, idx) => idx !== i));
  const updateUpgrade = (i: number, field: string, val: string) => {
    setUpgrades(prev => prev.map((u, idx) => idx === i ? { ...u, [field]: val } : u));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="font-heading text-xl flex items-center gap-2">
            Editar Produto
            {product?.fornecedor && <Badge variant="outline" className="text-xs capitalize">{product.fornecedor}</Badge>}
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="geral" className="space-y-4">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="precos">Preços</TabsTrigger>
            <TabsTrigger value="specs">Specs</TabsTrigger>
            <TabsTrigger value="upgrades">Upgrades</TabsTrigger>
            <TabsTrigger value="info">Info</TabsTrigger>
          </TabsList>

          {/* ── GERAL ── */}
          <TabsContent value="geral" className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
            </div>
            <div className="space-y-2">
              <Label>URL da Imagem</Label>
              <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
              {imageUrl && <img src={imageUrl} alt="" className="h-24 w-24 object-contain rounded border bg-muted" />}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mundo</Label>
                <Select value={mundo} onValueChange={setMundo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="escritorio">Escritório & IT</SelectItem>
                    <SelectItem value="seguranca">Segurança & Redes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Stock</Label>
                <Select value={stockStatus} onValueChange={setStockStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">Disponível</SelectItem>
                    <SelectItem value="low">Stock baixo</SelectItem>
                    <SelectItem value="out">Esgotado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={category} onValueChange={(v) => { setCategory(v); setFamilyId("none"); }}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Família</Label>
                <Select value={familyId} onValueChange={setFamilyId}>
                  <SelectTrigger><SelectValue placeholder="Sem família" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem família</SelectItem>
                    {filteredFamilies.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {familyText && <p className="text-xs text-muted-foreground">Importado: {familyText}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Marca</Label>
              <Select value={brandId} onValueChange={setBrandId}>
                <SelectTrigger><SelectValue placeholder="Sem marca" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem marca</SelectItem>
                  {brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {brandText && <p className="text-xs text-muted-foreground">Importado: {brandText}</p>}
            </div>
            <div className="space-y-2">
              <Label>Tipo (nível 3)</Label>
              <Select value={typeId} onValueChange={setTypeId} disabled={familyId === "none"}>
                <SelectTrigger>
                  <SelectValue placeholder={familyId === "none" ? "Escolhe família primeiro" : "Sem tipo"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem tipo</SelectItem>
                  {filteredTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {product?.type && typeId === "none" && (
                <p className="text-xs text-muted-foreground">Importado: {product.type}</p>
              )}
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Visível no catálogo", val: includeInCatalog, set: setIncludeInCatalog },
                { label: "Destaque na família", val: featured, set: setFeatured },
                { label: "Destaque na homepage", val: showOnHomepage, set: setShowOnHomepage },
                { label: "Sob encomenda", val: sobEncomenda, set: setSobEncomenda },
              ].map(({ label, val, set }) => (
                <div key={label} className="flex items-center justify-between">
                  <Label className="text-sm">{label}</Label>
                  <Switch checked={val} onCheckedChange={set} />
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ── PREÇOS ── */}
          <TabsContent value="precos" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Custo sem IVA (€)</Label>
                <Input type="number" step="0.01" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Custo com IVA (€)</Label>
                <Input type="number" step="0.01" value={purchasePriceVat} onChange={(e) => setPurchasePriceVat(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preço de venda s/ IVA (€)</Label>
                <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Peso (kg)</Label>
                <Input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} />
              </div>
            </div>
            {margem && (
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <span className="text-muted-foreground">Margem calculada: </span>
                <span className="font-semibold text-foreground">{margem}%</span>
                {purchasePrice && price && (
                  <span className="text-muted-foreground ml-2">
                    ({(parseFloat(price) - parseFloat(purchasePrice)).toFixed(2)}€ de lucro por unidade)
                  </span>
                )}
              </div>
            )}
            <Separator />
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Fornecedor: <span className="font-medium capitalize">{product?.fornecedor || "—"}</span></p>
              <p>• Portes: ver separador <strong>Portes</strong> no Admin</p>
            </div>
          </TabsContent>

          {/* ── SPECS ── */}
          <TabsContent value="specs" className="space-y-3">
            <p className="text-xs text-muted-foreground -mt-1 mb-2">
              <Lock className="inline h-3 w-3 mr-1" />
              Trancar um campo impede que a próxima importação o sobrescreva.
            </p>
            {[
              { key: "tipo", label: "Tipo", options: ["Portátil", "Desktop", "Tudo-em-Um", "Servidor", "Monitor", "Tablet"] },
              { key: "grau", label: "Grau", options: ["A", "B", "C"] },
              { key: "teclado", label: "Teclado", options: TECLADO_OPTIONS },
              { key: "processador", label: "Processador" },
              { key: "geracao", label: "Geração" },
              { key: "grafica", label: "Placa Gráfica" },
              { key: "ram_gb", label: "RAM (GB)" },
              { key: "ram_tipo", label: "Tipo RAM" },
              { key: "ram_slots", label: "Slots RAM" },
              { key: "ram_ampliavel", label: "RAM Ampliável", options: ["Sim", "Não"] },
              { key: "armazenamento_gb", label: "Armazenamento (GB)" },
              { key: "armazenamento_tipo", label: "Tipo Armazenamento" },
              { key: "ecra_polegadas", label: "Ecrã (polegadas)" },
              { key: "resolucao", label: "Resolução", options: ["HD", "HD+", "Full HD", "4K"] },
              { key: "tactil", label: "Táctil", options: ["Sim", "Não"] },
              { key: "sistema_operativo", label: "Sistema Operativo" },
              { key: "leitor_gravador", label: "Leitor/Gravador", options: ["DVD", "Não"] },
              { key: "webcam", label: "Webcam", options: ["Sim", "Não"] },
              { key: "wifi", label: "Wi-Fi", options: ["Sim", "Não"] },
              { key: "bluetooth", label: "Bluetooth", options: ["Sim", "Não"] },
              { key: "portas", label: "Portas" },
              { key: "cor", label: "Cor" },
            ].map(({ key, label, options }) => {
              const locked = specsLocked.includes(key);
              return (
                <div key={key} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-center">
                  <Label className="text-sm">{label}</Label>
                  {options ? (
                    <Select value={specs[key] || ""} onValueChange={(v) => updateSpec(key, v === "_none" ? "" : v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">—</SelectItem>
                        {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input className="h-8 text-sm" value={specs[key] || ""} onChange={(e) => updateSpec(key, e.target.value)} placeholder="—" />
                  )}
                  <Button
                    type="button" variant="ghost" size="icon" className="h-8 w-8"
                    title={locked ? "Trancado — a importação não vai alterar este campo" : "Trancar este campo"}
                    onClick={() => toggleLock(key)}
                  >
                    {locked ? <Lock className="h-3.5 w-3.5 text-primary" /> : <Unlock className="h-3.5 w-3.5 text-muted-foreground" />}
                  </Button>
                </div>
              );
            })}
            {specs.teclado && specs.teclado !== "PT" && (
              <div className="space-y-2">
                <Label className="text-sm">Nota de teclado</Label>
                <Textarea
                  rows={2}
                  className="text-sm"
                  value={specs.teclado_nota || ""}
                  onChange={(e) => updateSpec("teclado_nota", e.target.value)}
                  placeholder="Nota a mostrar ao cliente sobre o teclado..."
                />
              </div>
            )}
          </TabsContent>

          {/* ── UPGRADES ── */}
          <TabsContent value="upgrades" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Upgrades disponíveis para este produto</p>
              <Button size="sm" variant="outline" onClick={addUpgrade} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Adicionar
              </Button>
            </div>
            {upgrades.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">
                Nenhum upgrade definido.<br />
                <span className="text-xs">Ex: +8GB RAM, Teclado PT, SSD adicional</span>
              </div>
            ) : upgrades.map((u, i) => (
              <div key={i} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Upgrade {i + 1}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeUpgrade(i)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo</Label>
                    <Select value={u.tipo} onValueChange={(v) => updateUpgrade(i, "tipo", v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Tipo..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="memoria">Memória</SelectItem>
                        <SelectItem value="disco">Disco</SelectItem>
                        <SelectItem value="teclado">Teclado</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Descrição</Label>
                    <Input className="h-8 text-xs" value={u.descricao} onChange={(e) => updateUpgrade(i, "descricao", e.target.value)} placeholder="Ex: +8GB RAM" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Preço (+€)</Label>
                    <Input className="h-8 text-xs" type="number" step="0.01" value={u.preco} onChange={(e) => updateUpgrade(i, "preco", e.target.value)} placeholder="0.00" />
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          {/* ── INFO ── */}
          <TabsContent value="info" className="space-y-3">
            {[
              { label: "SKU", value: product?.sku },
              { label: "Fornecedor", value: product?.fornecedor },
              { label: "Mundo", value: product?.mundo },
              { label: "ID", value: product?.id },
              { label: "Criado em", value: product?.created_at ? new Date(product.created_at).toLocaleString("pt-PT") : null },
              { label: "Actualizado em", value: product?.updated_at ? new Date(product.updated_at).toLocaleString("pt-PT") : null },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-sm font-medium font-mono">{value || "—"}</span>
              </div>
            ))}
          </TabsContent>
        </Tabs>

        {/* Acções */}
        <div className="flex gap-2 pt-4 mt-4 border-t border-border">
          <Button onClick={handleSave} disabled={loading} className="flex-1 gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar alterações
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading} size="icon">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
