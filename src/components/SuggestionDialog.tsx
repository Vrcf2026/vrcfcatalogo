import { useState, useEffect } from "react";
import { Send, MessageSquare, Lightbulb, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface SuggestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "contacto" | "sugestao";
}

const ASSUNTOS = [
  "Informação sobre um produto",
  "Estado de uma encomenda",
  "Orçamento específico",
  "Reclamação",
  "Parceria ou fornecimento",
  "Outro assunto",
];

export function SuggestionDialog({ open, onOpenChange, mode = "sugestao" }: SuggestionDialogProps) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", assunto: "", message: "" });
  const isContacto = mode === "contacto";

  useEffect(() => {
    if (open) {
      setForm(f => ({ ...f, email: user?.email ?? "" }));
    } else {
      setForm({ name: "", email: user?.email ?? "", assunto: "", message: "" });
    }
  }, [open, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    if (isContacto && !form.assunto) {
      toast.error("Selecione o assunto.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("send-suggestion", {
        body: {
          name: form.name.trim(),
          email: form.email.trim(),
          message: isContacto
            ? `[${form.assunto}]\n\n${form.message.trim()}`
            : form.message.trim(),
        },
      });
      if (error) throw error;
      toast.success(isContacto
        ? "Mensagem enviada. Responderemos brevemente."
        : "Sugestão enviada. Obrigado!");
      onOpenChange(false);
    } catch {
      toast.error("Erro ao enviar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isContacto
              ? <><MessageSquare className="h-5 w-5 text-blue-500" /> Contactar VRCF</>
              : <><Lightbulb className="h-5 w-5 text-primary" /> Enviar Sugestão</>}
          </DialogTitle>
          <DialogDescription>
            {isContacto
              ? "Envie-nos uma mensagem e responderemos o mais brevemente possível."
              : "A sua opinião é importante. Partilhe ideias ou sugestões de melhoria."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 mt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="O seu nome" maxLength={100} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email *</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="email@exemplo.com" maxLength={255} required />
            </div>
          </div>

          {isContacto && (
            <div className="space-y-1.5">
              <Label className="text-xs">Assunto *</Label>
              <Select value={form.assunto} onValueChange={v => setForm(f => ({ ...f, assunto: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o assunto" />
                </SelectTrigger>
                <SelectContent>
                  {ASSUNTOS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">{isContacto ? "Mensagem *" : "Sugestão *"}</Label>
            <Textarea
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder={isContacto
                ? "Descreva o seu pedido ou questão..."
                : "Escreva a sua sugestão..."}
              rows={4} maxLength={1000} required />
          </div>

          <Button type="submit" className="w-full gap-2" disabled={submitting}>
            {submitting
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Send className="h-4 w-4" />}
            {submitting ? "A enviar..." : isContacto ? "Enviar mensagem" : "Enviar sugestão"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
