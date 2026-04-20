import { useState, useEffect } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SuggestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SuggestionDialog({ open, onOpenChange }: SuggestionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  useEffect(() => {
    if (!open) {
      setForm({ name: "", email: "", message: "" });
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error("Por favor preencha todos os campos.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("send-suggestion", {
        body: {
          name: form.name.trim(),
          email: form.email.trim(),
          message: form.message.trim(),
        },
      });

      if (error) throw error;

      toast.success("Sugestão enviada com sucesso! Obrigado pelo seu contributo.");
      setForm({ name: "", email: "", message: "" });
      onOpenChange(false);
    } catch {
      toast.error("Erro ao enviar a sugestão. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Sugestão
          </DialogTitle>
          <DialogDescription>
            A sua opinião é importante para nós. Partilhe as suas ideias ou sugestões.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-4">
          <div>
            <Label htmlFor="suggestion-name" className="text-xs">Nome</Label>
            <Input
              id="suggestion-name"
              placeholder="O seu nome"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              maxLength={100}
              required
            />
          </div>
          <div>
            <Label htmlFor="suggestion-email" className="text-xs">Email</Label>
            <Input
              id="suggestion-email"
              type="email"
              placeholder="O seu email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              maxLength={255}
              required
            />
          </div>
          <div>
            <Label htmlFor="suggestion-message" className="text-xs">Mensagem</Label>
            <Textarea
              id="suggestion-message"
              placeholder="Escreva aqui a sua sugestão..."
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              maxLength={1000}
              rows={4}
              required
            />
          </div>
          <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
            <Send className="h-4 w-4" />
            {isSubmitting ? "A enviar..." : "Enviar Sugestão"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
