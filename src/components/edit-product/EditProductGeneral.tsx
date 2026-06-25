import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

interface Props {
  name: string; setName: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  shortDescription: string; setShortDescription: (v: string) => void;
  imageUrl: string; setImageUrl: (v: string) => void;
  mundo: string; setMundo: (v: string) => void;
  stockStatus: string; setStockStatus: (v: string) => void;
  category: string; setCategory: (v: string) => void;
  categories: string[];
  familyId: string; setFamilyId: (v: string) => void;
  filteredFamilies: { id: string; name: string }[];
  familyText: string;
  typeId: string; setTypeId: (v: string) => void;
  filteredTypes: { id: string; name: string }[];
  brandId: string; setBrandId: (v: string) => void;
  brands: { id: string; name: string }[];
  brandText: string;
  includeInCatalog: boolean; setIncludeInCatalog: (v: boolean) => void;
  featured: boolean; setFeatured: (v: boolean) => void;
  showOnHomepage: boolean; setShowOnHomepage: (v: boolean) => void;
  sobEncomenda: boolean; setSobEncomenda: (v: boolean) => void;
}

export function EditProductGeneral(p: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Nome *</Label>
        <Input value={p.name} onChange={(e) => p.setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Descrição curta <span className="text-muted-foreground text-xs">(bullets, resumo — aparece nos cards)</span></Label>
        <Textarea value={p.shortDescription} onChange={(e) => p.setShortDescription(e.target.value)} rows={2} placeholder="Resumo breve do produto..." />
      </div>
      <div className="space-y-2">
        <Label>Descrição completa <span className="text-muted-foreground text-xs">(aparece na página do produto)</span></Label>
        <Textarea value={p.description} onChange={(e) => p.setDescription(e.target.value)} rows={5} />
      </div>
      <div className="space-y-2">
        <Label>URL da Imagem</Label>
        <Input value={p.imageUrl} onChange={(e) => p.setImageUrl(e.target.value)} placeholder="https://..." />
        {p.imageUrl && <img src={p.imageUrl} alt="" className="h-24 w-24 object-contain rounded border bg-muted" />}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Mundo</Label>
          <Select value={p.mundo} onValueChange={(v) => { p.setMundo(v); p.setTypeId("none"); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="escritorio">Escritório & IT</SelectItem>
              <SelectItem value="seguranca">Segurança & Redes</SelectItem>
              <SelectItem value="economato">Economato</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Stock</Label>
          <Select value={p.stockStatus} onValueChange={p.setStockStatus}>
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
          <Select value={p.category} onValueChange={(v) => { p.setCategory(v); p.setFamilyId("none"); }}>
            <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
            <SelectContent>
              {p.categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Família</Label>
          <Select value={p.familyId} onValueChange={(v) => { p.setFamilyId(v); p.setTypeId("none"); }}>
            <SelectTrigger><SelectValue placeholder="Sem família" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem família</SelectItem>
              {p.filteredFamilies.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {p.familyText && <p className="text-xs text-muted-foreground">Importado: {p.familyText}</p>}
        </div>
      </div>
      <div className="space-y-2">
        <Label>Tipo (Nível 3)</Label>
        <Select value={p.typeId} onValueChange={p.setTypeId} disabled={p.filteredTypes.length === 0}>
          <SelectTrigger><SelectValue placeholder={p.filteredFamilies.length === 0 || p.familyId === "none" ? "Escolha primeiro a família" : "Sem tipo"} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sem tipo</SelectItem>
            {p.filteredTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {p.familyId !== "none" && p.filteredTypes.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Esta família ainda não tem tipos criados — usa o botão "Tipos" no Admin.
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label>Marca</Label>
        <Select value={p.brandId} onValueChange={p.setBrandId}>
          <SelectTrigger><SelectValue placeholder="Sem marca" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sem marca</SelectItem>
            {p.brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {p.brandText && <p className="text-xs text-muted-foreground">Importado: {p.brandText}</p>}
      </div>
      <Separator />
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Visível no catálogo", val: p.includeInCatalog, set: p.setIncludeInCatalog },
          { label: "Destaque na família", val: p.featured, set: p.setFeatured },
          { label: "Destaque na homepage", val: p.showOnHomepage, set: p.setShowOnHomepage },
          { label: "Sob encomenda", val: p.sobEncomenda, set: p.setSobEncomenda },
        ].map(({ label, val, set }) => (
          <div key={label} className="flex items-center justify-between">
            <Label className="text-sm">{label}</Label>
            <Switch checked={val} onCheckedChange={set} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default EditProductGeneral;
