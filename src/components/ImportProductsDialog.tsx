import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { FileSpreadsheet, Loader2, CheckCircle2, XCircle, Clock, Upload } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import * as XLSX from "xlsx";

interface ImportRow {
  nome: string;
  categoria?: string;
  familia?: string;
  preco?: number;
}

interface ImportStatus {
  row: ImportRow;
  status: "pending" | "creating" | "description" | "images" | "done" | "error";
  error?: string;
}

interface ImportProductsDialogProps {
  families: { id: string; name: string; category: string }[];
  categories: string[];
}

export function ImportProductsDialog({ families, categories }: ImportProductsDialogProps) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ImportStatus[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

        if (jsonData.length === 0) {
          toast.error("Ficheiro vazio ou sem dados válidos");
          return;
        }

        const parsed: ImportRow[] = jsonData.map((row) => {
          // Flexible column matching (case-insensitive)
          const keys = Object.keys(row);
          const find = (terms: string[]) => {
            const key = keys.find((k) => terms.some((t) => k.toLowerCase().includes(t)));
            return key ? row[key] : undefined;
          };

          return {
            nome: String(find(["nome", "name", "produto", "product"]) || "").trim(),
            categoria: String(find(["categ", "category"]) || "").trim() || undefined,
            familia: String(find(["famil", "family"]) || "").trim() || undefined,
            preco: (() => {
              const v = find(["prec", "preco", "preço", "price", "valor"]);
              if (v == null) return undefined;
              const n = parseFloat(String(v).replace(",", "."));
              return isNaN(n) ? undefined : n;
            })(),
          };
        }).filter((r) => r.nome.length > 0);

        if (parsed.length === 0) {
          toast.error("Nenhum produto válido encontrado. Verifique que tem uma coluna 'Nome'.");
          return;
        }

        setRows(parsed.map((row) => ({ row, status: "pending" })));
        setDone(false);
        toast.success(`${parsed.length} produto(s) encontrado(s) no ficheiro`);
      } catch {
        toast.error("Erro ao ler o ficheiro Excel");
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const findFamilyId = (familyName?: string, categoryName?: string): string | null => {
    if (!familyName) return null;
    const match = families.find(
      (f) =>
        f.name.toLowerCase() === familyName.toLowerCase() &&
        (!categoryName || f.category.toLowerCase() === categoryName.toLowerCase())
    );
    return match?.id || null;
  };

  const handleImport = async () => {
    setImporting(true);

    for (let i = 0; i < rows.length; i++) {
      const { row } = rows[i];

      // Update status: creating product
      setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: "creating" } : r)));

      try {
        // 1. Insert product
        const familyId = findFamilyId(row.familia, row.categoria);
        const { data: product, error } = await supabase
          .from("products")
          .insert({
            name: row.nome,
            category: row.categoria || null,
            price: row.preco ?? null,
            family_id: familyId,
          })
          .select()
          .single();

        if (error) throw error;

        // 2. Generate description
        setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: "description" } : r)));

        try {
          const { data: descData } = await supabase.functions.invoke("generate-description", {
            body: { productName: row.nome, category: row.categoria || null },
          });

          if (descData?.description) {
            await supabase.from("products").update({ description: descData.description }).eq("id", product.id);
          }
        } catch (e) {
          console.error("Description generation failed for:", row.nome, e);
        }

        // 3. Generate images in background
        setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: "images" } : r)));

        try {
          await supabase.functions.invoke("generate-product-image", {
            body: { productName: row.nome, productId: product.id },
          });
        } catch (e) {
          console.error("Image generation failed for:", row.nome, e);
        }

        setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: "done" } : r)));
      } catch (e: any) {
        console.error("Import error for:", row.nome, e);
        setRows((prev) =>
          prev.map((r, idx) =>
            idx === i ? { ...r, status: "error", error: e.message || "Erro desconhecido" } : r
          )
        );
      }
    }

    setImporting(false);
    setDone(true);
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["product_images"] });
    toast.success("Importação concluída!");
  };

  const completedCount = rows.filter((r) => r.status === "done").length;
  const errorCount = rows.filter((r) => r.status === "error").length;
  const progress = rows.length > 0 ? ((completedCount + errorCount) / rows.length) * 100 : 0;

  const statusIcon = (status: ImportStatus["status"]) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4 text-muted-foreground" />;
      case "creating": return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case "description": return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "images": return <Loader2 className="h-4 w-4 animate-spin text-amber-500" />;
      case "done": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "error": return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const statusLabel = (status: ImportStatus["status"]) => {
    switch (status) {
      case "pending": return "Em espera";
      case "creating": return "A criar...";
      case "description": return "A gerar descrição...";
      case "images": return "A gerar imagens...";
      case "done": return "Concluído";
      case "error": return "Erro";
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!importing) {
      setOpen(isOpen);
      if (!isOpen) {
        setRows([]);
        setDone(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Importar Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Importar Produtos via Excel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Instructions */}
          {rows.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Carregue um ficheiro Excel (.xlsx, .xls) com as seguintes colunas:
              </p>
              <div className="bg-secondary rounded-lg p-3 text-sm space-y-1">
                <p><strong>Nome</strong> — nome do produto (obrigatório)</p>
                <p><strong>Categoria</strong> — categoria do produto</p>
                <p><strong>Família</strong> — família do produto</p>
                <p><strong>Preço</strong> — preço em euros</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Para cada produto, a descrição e as imagens serão geradas automaticamente por IA.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full gap-2"
              >
                <Upload className="h-4 w-4" />
                Selecionar ficheiro Excel
              </Button>
            </div>
          )}

          {/* Preview / Progress */}
          {rows.length > 0 && (
            <>
              {importing && (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="font-medium">{completedCount + errorCount}/{rows.length}</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              <div className="flex-1 overflow-y-auto border rounded-lg divide-y divide-border">
                {rows.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 px-3 py-2 text-sm">
                    {statusIcon(item.status)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.row.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[item.row.categoria, item.row.familia, item.row.preco != null ? `${item.row.preco}€` : null]
                          .filter(Boolean)
                          .join(" · ") || "Sem detalhes adicionais"}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {statusLabel(item.status)}
                    </span>
                  </div>
                ))}
              </div>

              {!importing && !done && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setRows([])} className="flex-1">
                    Cancelar
                  </Button>
                  <Button onClick={handleImport} className="flex-1 gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Importar {rows.length} produto(s)
                  </Button>
                </div>
              )}

              {done && (
                <div className="text-center space-y-2">
                  <p className="text-sm font-medium text-green-600">
                    ✅ {completedCount} importado(s){errorCount > 0 ? `, ${errorCount} com erro` : ""}
                  </p>
                  <Button variant="outline" onClick={() => handleClose(false)}>
                    Fechar
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}