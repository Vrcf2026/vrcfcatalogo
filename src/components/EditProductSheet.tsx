import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Save, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { EditProductGeneral } from "@/components/edit-product/EditProductGeneral";
import { EditProductPricing } from "@/components/edit-product/EditProductPricing";
import { EditProductSpecs } from "@/components/edit-product/EditProductSpecs";
import { EditProductUpgrades, type Upgrade } from "@/components/edit-product/EditProductUpgrades";
import { EditProductInfo } from "@/components/edit-product/EditProductInfo";

interface EditProductSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: any;
  families: { id: string; name: string; category: string; mundo?: string }[];
  types?: { id: string; name: string; family_id: string; mundo?: string }[];
  categories: string[];
  brands: { id: string; name: string }[];
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export function EditProductSheet({ open, onOpenChange, product, families, types = [], categories, brands, onPrev, onNext, hasPrev, hasNext }: EditProductSheetProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [category, setCategory] = useState("");
  const [familyId, setFamilyId] = useState("none");
  const [typeId, setTypeId] = useState("none");
  const [brandId, setBrandId] = useState("none");
  const [familyText, setFamilyText] = useState("");
  const [brandText, setBrandText] = useState("");
  const [price, setPrice] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchasePriceVat, setPurchasePriceVat] = useState("");
  const [storePrice, setStorePrice]             = useState("");
  const [storePriceVat, setStorePriceVat]       = useState("");
  const [taxaIva, setTaxaIva]                   = useState("23");
  const [weight, setWeight] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [mundo, setMundo] = useState("escritorio");
  const [stockStatus, setStockStatus] = useState("high");
  const [sobEncomenda, setSobEncomenda] = useState(false);
  const [includeInCatalog, setIncludeInCatalog] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [showOnHomepage, setShowOnHomepage] = useState(false);
  const [specs, setSpecs] = useState<Record<string, string>>({});
  const [specsLocked, setSpecsLocked]           = useState<string[]>([]);
  const [priceLocked, setPriceLocked]           = useState(false);
  const [newSpecKey, setNewSpecKey] = useState("");
  const [newSpecValue, setNewSpecValue] = useState("");
  const [upgrades, setUpgrades] = useState<Upgrade[]>([]);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: priceHistory = [], isLoading: loadingHistory } = useQuery({
    queryKey: ["price_history", product?.sku],
    queryFn: async () => {
      if (!product?.sku) return [];
      const { data, error } = await supabase
        .from("price_history")
        .select("*")
        .eq("sku", product.sku)
        .order("changed_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    enabled: open && !!product?.sku,
  });

  const filteredFamilies = families.filter((f) => !category || f.category === category);
  const filteredTypes = types.filter(
    (t) => t.family_id === familyId && (!t.mundo || t.mundo === "todos" || t.mundo === mundo)
  );

  const ivaRate = (parseFloat(taxaIva) || 23) / 100;
  const margem = purchasePrice && price
    ? ((parseFloat(price) - parseFloat(purchasePrice)) / parseFloat(purchasePrice) * 100).toFixed(1)
    : null;
  const priceWithVat = price ? (parseFloat(price) * (1 + ivaRate)).toFixed(2) : null;

  const handlePurchasePriceChange = (val: string) => {
    setPurchasePrice(val);
    if (val && !isNaN(parseFloat(val))) {
      setPurchasePriceVat((parseFloat(val) * (1 + ivaRate)).toFixed(2));
    } else {
      setPurchasePriceVat("");
    }
  };

  const handleStorePriceChange = (val: string) => {
    setStorePrice(val);
    if (val && !isNaN(parseFloat(val))) {
      setStorePriceVat((parseFloat(val) * (1 + ivaRate)).toFixed(2));
    } else {
      setStorePriceVat("");
    }
  };

  useEffect(() => {
    if (!open || !product) return;
    setName(product.name || "");
    setDescription(product.description || "");
    setShortDescription(product.short_description || "");
    setCategory(product.category || "");
    setFamilyId(product.family_id || "none");
    setTypeId(product.type_id || "none");
    setBrandId(product.brand_id || "none");
    setFamilyText(product.family || "");
    setBrandText(product.brand || "");
    setPrice(product.price?.toString() || "");
    setPurchasePrice(product.purchase_price?.toString() || "");
    setPurchasePriceVat(product.purchase_price_vat?.toString() || "");
    setTaxaIva((product as any).taxa_iva?.toString() || "23");
    setStorePrice((product as any).store_price?.toString() || "");
    setStorePriceVat((product as any).store_price_vat?.toString() || "");
    setPriceLocked(!!(product as any).price_locked);

    // Se os campos de custo/fornecedor não vieram do parent (foram removidos
    // do SELECT público), buscar via RPC de gestão.
    if (product.id && product.purchase_price == null && product.purchase_price_vat == null) {
      (supabase as any).rpc("get_products_internal_pricing", { p_ids: [product.id] })
        .then(({ data }: any) => {
          const row = Array.isArray(data) ? data[0] : null;
          if (!row) return;
          if (row.purchase_price != null) setPurchasePrice(String(row.purchase_price));
          if (row.purchase_price_vat != null) setPurchasePriceVat(String(row.purchase_price_vat));
        });
    }
    setWeight(product.weight?.toString() || "");
    setImageUrl(product.image_url || "");
    setMundo(product.mundo || "escritorio");
    setStockStatus(product.stock_status || "high");
    setSobEncomenda(!!product.sob_encomenda);
    setIncludeInCatalog(product.include_in_catalog !== false);
    setFeatured(!!product.featured);
    setShowOnHomepage(!!product.show_on_homepage);

    const rawSpecs = typeof product.especificacoes === "string"
      ? JSON.parse(product.especificacoes || "{}")
      : (product.especificacoes || {});
    setSpecs(rawSpecs);
    setSpecsLocked(Array.isArray(product.specs_locked) ? product.specs_locked : []);

    const rawUpgrades = Array.isArray(product.upgrades) ? product.upgrades : [];
    setUpgrades(rawUpgrades.length > 0 ? rawUpgrades : []);
  }, [open, product]);

  const handleSave = async (afterSave?: () => void) => {
    if (!name.trim()) { toast.error("Nome obrigatório"); return false; }
    setLoading(true);
    try {
      const { error } = await supabase.from("products").update({
        name: name.trim(),
        description: description.trim() || null,
        short_description: shortDescription.trim() || null,
        category: category || null,
        family_id: familyId === "none" ? null : familyId,
        type_id: typeId === "none" ? null : typeId,
        brand_id: brandId === "none" ? null : brandId,
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
        price_locked: priceLocked,
        taxa_iva: taxaIva ? parseFloat(taxaIva) : 23,
        store_price: storePrice ? parseFloat(storePrice) : null,
        store_price_vat: storePriceVat ? parseFloat(storePriceVat) : null,
        upgrades: upgrades.filter(u => u.tipo || u.descricao) as any,
      }).eq("id", product.id);
      if (error) throw error;
      toast.success("Produto guardado");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      if (afterSave) {
        afterSave();
      } else {
        onOpenChange(false);
      }
      return true;
    } catch (e: any) {
      toast.error(e.message || "Erro ao guardar");
      return false;
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

  const slugifyKey = (label: string) =>
    label.trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

  const addCustomSpec = () => {
    const key = slugifyKey(newSpecKey);
    if (!key) { toast.error("Indica o nome da especificação"); return; }
    if (!newSpecValue.trim()) { toast.error("Indica o valor da especificação"); return; }
    if (specs[key] !== undefined) { toast.error("Já existe uma especificação com esse nome"); return; }
    updateSpec(key, newSpecValue.trim());
    setNewSpecKey("");
    setNewSpecValue("");
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
          <SheetTitle className="font-heading text-xl flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              Editar Produto
              {product?.fornecedor && <Badge variant="outline" className="text-xs capitalize">{product.fornecedor}</Badge>}
            </span>
            {(onPrev || onNext) && (
              <div className="flex items-center gap-1 mr-6">
                <Button
                  type="button" variant="outline" size="sm" className="h-8 px-2"
                  disabled={!hasPrev || loading}
                  onClick={() => handleSave(onPrev)}
                  title="Guardar e ir para o anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button" variant="outline" size="sm" className="h-8 px-2"
                  disabled={!hasNext || loading}
                  onClick={() => handleSave(onNext)}
                  title="Guardar e ir para o próximo"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
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

          <TabsContent value="geral">
            <EditProductGeneral
              name={name} setName={setName}
              description={description} setDescription={setDescription}
              shortDescription={shortDescription} setShortDescription={setShortDescription}
              imageUrl={imageUrl} setImageUrl={setImageUrl}
              mundo={mundo} setMundo={setMundo}
              stockStatus={stockStatus} setStockStatus={setStockStatus}
              category={category} setCategory={setCategory}
              categories={categories}
              familyId={familyId} setFamilyId={setFamilyId}
              filteredFamilies={filteredFamilies}
              familyText={familyText}
              typeId={typeId} setTypeId={setTypeId}
              filteredTypes={filteredTypes}
              brandId={brandId} setBrandId={setBrandId}
              brands={brands}
              brandText={brandText}
              includeInCatalog={includeInCatalog} setIncludeInCatalog={setIncludeInCatalog}
              featured={featured} setFeatured={setFeatured}
              showOnHomepage={showOnHomepage} setShowOnHomepage={setShowOnHomepage}
              sobEncomenda={sobEncomenda} setSobEncomenda={setSobEncomenda}
            />
          </TabsContent>

          <TabsContent value="precos">
            <EditProductPricing
              purchasePrice={purchasePrice} setPurchasePrice={handlePurchasePriceChange}
              purchasePriceVat={purchasePriceVat} setPurchasePriceVat={setPurchasePriceVat}
              price={price} setPrice={setPrice}
              priceWithVat={priceWithVat}
              storePrice={storePrice} setStorePrice={handleStorePriceChange}
              storePriceVat={storePriceVat} setStorePriceVat={setStorePriceVat}
              taxaIva={taxaIva} setTaxaIva={setTaxaIva}
              priceLocked={priceLocked} setPriceLocked={setPriceLocked}
              weight={weight} setWeight={setWeight}
              margem={margem}
              fornecedor={product?.fornecedor}
            />
          </TabsContent>

          <TabsContent value="specs">
            <EditProductSpecs
              specs={specs}
              specsLocked={specsLocked}
              updateSpec={updateSpec}
              toggleLock={toggleLock}
              newSpecKey={newSpecKey} setNewSpecKey={setNewSpecKey}
              newSpecValue={newSpecValue} setNewSpecValue={setNewSpecValue}
              addCustomSpec={addCustomSpec}
            />
          </TabsContent>

          <TabsContent value="upgrades">
            <EditProductUpgrades
              upgrades={upgrades}
              addUpgrade={addUpgrade}
              removeUpgrade={removeUpgrade}
              updateUpgrade={updateUpgrade}
            />
          </TabsContent>

          <TabsContent value="info">
            <EditProductInfo product={product} priceHistory={priceHistory} loadingHistory={loadingHistory} />
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 pt-4 mt-4 border-t border-border">
          <Button onClick={() => handleSave()} disabled={loading} className="flex-1 gap-2">
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
