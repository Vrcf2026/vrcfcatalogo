import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/contexts/CartContext";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Send, CheckCircle } from "lucide-react";

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CheckoutDialog({ open, onOpenChange }: CheckoutDialogProps) {
  const { items, clearCart } = useCart();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim()) {
      toast.error("Por favor preencha todos os campos obrigatórios.");
      return;
    }

    setLoading(true);
    try {
      const quoteItems = items.map((i) => ({
        id: i.id,
        name: i.name,
        price: i.price,
        category: i.category,
        quantity: i.quantity,
      }));

      // Store in DB
      const { error: dbError } = await supabase.from("quote_requests").insert({
        customer_name: name.trim(),
        customer_email: email.trim(),
        customer_phone: phone.trim(),
        items: quoteItems,
      });
      if (dbError) throw dbError;

      // Send email notification
      const { error: fnError } = await supabase.functions.invoke("send-quote-request", {
        body: {
          customerName: name.trim(),
          customerEmail: email.trim(),
          customerPhone: phone.trim(),
          notes: notes.trim(),
          items: quoteItems,
        },
      });
      if (fnError) console.warn("Email notification failed:", fnError);

      setSuccess(true);
      clearCart();
      setTimeout(() => {
        setSuccess(false);
        onOpenChange(false);
        setName("");
        setEmail("");
        setPhone("");
        setNotes("");
      }, 3000);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao enviar pedido. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <h3 className="font-heading text-xl font-bold">Pedido Enviado!</h3>
            <p className="text-muted-foreground text-sm">
              O seu pedido de orçamento foi enviado com sucesso. Entraremos em contacto brevemente.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pedir Orçamento</DialogTitle>
          <DialogDescription>
            Preencha os seus dados para receber um orçamento personalizado.
          </DialogDescription>
        </DialogHeader>

        {/* Items summary */}
        <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2 max-h-40 overflow-y-auto">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-foreground">{item.quantity}x {item.name}</span>
              {item.price != null && (
                <span className="text-muted-foreground">{(item.price * item.quantity).toFixed(2).replace(".", ",")} €</span>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="O seu nome" required maxLength={100} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" required maxLength={255} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Contacto Telefónico *</Label>
            <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+351 912 345 678" required maxLength={20} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Informações adicionais..." maxLength={1000} rows={3} />
          </div>
          <Button type="submit" className="w-full gap-2" size="lg" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar Pedido de Orçamento
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
