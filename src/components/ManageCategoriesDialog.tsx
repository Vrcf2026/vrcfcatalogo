import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Tags, Plus, Trash2, Loader2, GripVertical, Save } from "lucide-react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Category {
  id: string;
  name: string;
  ordem?: number;
  visivel?: boolean;
  mundo?: string;
}

interface ManageCategoriesDialogProps {
  categories: Category[];
}

export function ManageCategoriesDialog({ categories }: ManageCategoriesDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const filteredItems = items.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  const queryClient = useQueryClient();

  useEffect(() => {
    const sorted = [...categories].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
    setItems(sorted);
  }, [categories]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleAdd = async () => {
    if (!name.trim()) { toast.error("Nome obrigatório"); return; }
    setLoading(true);
    try {
      const maxOrdem = Math.max(0, ...items.map((c) => c.ordem ?? 0));
      const { error } = await supabase.from("categories").insert({ name: name.trim(), ordem: maxOrdem + 1, visivel: true, mundo: "todos" });
      if (error) throw error;
      toast.success("Categoria criada!");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["world-categories"] });
      setName("");
    } catch (e: any) {
      toast.error(e.message || "Erro");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
      toast.success("Excluída");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["world-categories"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((arr) => {
      const oldIndex = arr.findIndex((i) => i.id === active.id);
      const newIndex = arr.findIndex((i) => i.id === over.id);
      return arrayMove(arr, oldIndex, newIndex);
    });
  };

  const updateItemLocal = (id: string, patch: Partial<Category>) => {
    setItems((arr) => arr.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const persistField = async (id: string, patch: Partial<Category>) => {
    try {
      const { error } = await supabase.from("categories").update(patch).eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["world-categories"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const saveOrder = async () => {
    setSaving(true);
    try {
      await Promise.all(
        items.map((c, idx) => supabase.from("categories").update({ ordem: idx + 1 }).eq("id", c.id))
      );
      toast.success("Ordem guardada");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["world-categories"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2"><Tags className="h-4 w-4" />Categorias</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Gerir Categorias</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 border-b border-border pb-4">
          <Input placeholder="Nova categoria..." value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
          <Button onClick={handleAdd} disabled={loading} size="sm" className="gap-2 shrink-0">
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            Adicionar
          </Button>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          <Input
            placeholder="Pesquisar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 max-w-[220px]"
          />
          <Button size="sm" variant="default" onClick={saveOrder} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Guardar ordem
          </Button>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={filteredItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1.5">
              {filteredItems.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma categoria.</p>
              )}
              {filteredItems.map((cat) => (
                <SortableRow
                  key={cat.id}
                  cat={cat}
                  onToggleVisible={(v) => { updateItemLocal(cat.id, { visivel: v }); persistField(cat.id, { visivel: v }); }}
                  onChangeMundo={(m) => { updateItemLocal(cat.id, { mundo: m }); persistField(cat.id, { mundo: m }); }}
                  onDelete={() => handleDelete(cat.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </DialogContent>
    </Dialog>
  );
}

function SortableRow({
  cat, onToggleVisible, onChangeMundo, onDelete,
}: {
  cat: Category;
  onToggleVisible: (v: boolean) => void;
  onChangeMundo: (m: string) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 rounded-lg bg-secondary/40 px-2 py-2">
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground">
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="text-sm font-medium flex-1 truncate">{cat.name}</span>
      <Select value={cat.mundo ?? "todos"} onValueChange={onChangeMundo}>
        <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="seguranca">Segurança</SelectItem>
          <SelectItem value="escritorio">Escritório</SelectItem>
          <SelectItem value="economato">Economato</SelectItem>
          <SelectItem value="todos">Todos</SelectItem>
        </SelectContent>
      </Select>
      <div className="flex items-center gap-1.5">
        <Switch checked={cat.visivel ?? true} onCheckedChange={onToggleVisible} />
        <span className="text-[10px] text-muted-foreground w-8">{cat.visivel ?? true ? "visível" : "oculta"}</span>
      </div>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}>
        <Trash2 className="h-3 w-3 text-destructive" />
      </Button>
    </div>
  );
}
