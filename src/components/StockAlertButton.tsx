import { useState, useEffect } from "react";
import { Bell, BellRing, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Props {
  productId: string;
  productName: string;
}

export const StockAlertButton = ({ productId, productName }: Props) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [alreadyActive, setAlreadyActive] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from("stock_alerts")
      .select("id")
      .eq("product_id", productId)
      .eq("user_id", user.id)
      .eq("status", "pending")
      .maybeSingle()
      .then(({ data }) => { if (!cancelled) setAlreadyActive(!!data); });
    return () => { cancelled = true; };
  }, [user, productId]);

  useEffect(() => {
    if (user?.email && !email) setEmail(user.email);
  }, [user, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Indica um email válido.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("stock_alerts").insert({
      product_id: productId,
      user_id: user?.id ?? null,
      email: trimmed,
    });
    setSubmitting(false);
    if (error) {
      if (error.code === "23505") {
        toast.info("Já tens um alerta ativo para este produto.");
        setAlreadyActive(true);
        setOpen(false);
        return;
      }
      toast.error("Não foi possível criar o alerta. Tenta novamente.");
      return;
    }
    toast.success("Alerta criado. Avisamos-te assim que houver stock.");
    setAlreadyActive(true);
    setOpen(false);
  };

  if (alreadyActive) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-1.5">
        <Check className="h-3.5 w-3.5" /> Alerta ativo
      </Button>
    );
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Bell className="h-3.5 w-3.5" /> Avisar-me
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BellRing className="h-5 w-5 text-primary" /> Avisar quando houver stock
            </DialogTitle>
            <DialogDescription>
              Recebes um email assim que <strong>{productName}</strong> voltar a estar disponível. Sem spam.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              type="email"
              placeholder="o-teu-email@exemplo.pt"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus={!user}
            />
            <Button type="submit" disabled={submitting} className="w-full gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar alerta
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">
              Usado exclusivamente para esta notificação. Podes cancelar a qualquer momento.
            </p>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
