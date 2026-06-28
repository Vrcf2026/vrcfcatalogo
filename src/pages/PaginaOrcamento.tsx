import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { trackEvent } from "@/lib/trackEvent";
import { calcularPortesPorFornecedor, totalPortesComIva } from "@/lib/calcularPortes";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { UserMenuButton } from "@/components/UserMenuButton";
import { SiteFooter } from "@/components/SiteFooter";
import vrcfLogo from "@/assets/vrcf-logo.png";
import {
  Minus, Plus, Trash2, ShoppingCart, Send, Loader2,
  CheckCircle, Truck, ArrowLeft, Package, Info, Clock, MessageCircle,
} from "lucide-react";

export default function PaginaOrcamento() {
  const { items, updateQuantity, removeItem, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [name, setName]   = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [sendCopy, setSendCopy]           = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading]             = useState(false);
  const [success, setSuccess]             = useState(false);
  const submitTimestamps = useRef<number[]>([]);

  // Moradas guardadas do cliente (só se tiver conta)
  const { data: savedAddresses = [] } = useQuery({
    queryKey: ["shipping-addresses", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("shipping_addresses" as any)
        .select("*").eq("user_id", user!.id)
        .order("is_default", { ascending: false }).order("created_at");
      return (data ?? []) as any[];
    },
    staleTime: 60 * 1000,
  });

  // Auto-selecionar morada default
  const defaultAddr = savedAddresses.find((a: any) => a.is_default) ?? savedAddresses[0];

  const { data: shippingConfigs = [] } = useQuery({
    queryKey: ["shipping_config"],
    queryFn: async () => {
      const { data } = await supabase.from("shipping_config").select("*").eq("ativo", true);
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Buscar stock actual + slug para cada produto do carrinho.
  // Feito aqui (não no CartContext) para garantir dados frescos — o stock
  // pode ter mudado desde que o item foi adicionado.
  const itemIds = items.map(i => i.id);
  const { data: produtosInfo = [] } = useQuery({
    queryKey: ["orcamento-produtos-info", itemIds.join(",")],
    queryFn: async () => {
      if (!itemIds.length) return [];
      const { data } = await supabase
        .from("products")
        .select("id, slug, stock_status")
        .in("id", itemIds);
      return data ?? [];
    },
    enabled: itemIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  const produtoMap = Object.fromEntries(produtosInfo.map((p: any) => [p.id, p]));

  // Pré-preencher dados do perfil se autenticado
  useEffect(() => {
    if (!user) return;
    setEmail(prev => prev || user.email || "");
    (async () => {
      const { data } = await supabase
        .from("customer_profiles")
        .select("full_name,phone")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setName(prev => prev || data.full_name || "");
        setPhone(prev => prev || data.phone || "");
      }
    })();
  }, [user]);

  const portes = calcularPortesPorFornecedor(
    items.map(i => ({ fornecedor: (i as any).fornecedor, quantity: i.quantity, weight: (i as any).weight })),
    shippingConfigs as any,
  );
  const totalPortes    = totalPortesComIva(portes);
  const subtotalSemIva = items.reduce((s, i) => s + (i.price ?? 0) * i.quantity, 0);
  const subtotalComIva = subtotalSemIva * 1.23;
  const totalGeral     = subtotalComIva + totalPortes;
  const pesoTotal      = items.reduce((s, i) => s + ((i as any).weight ?? 0) * i.quantity, 0);
  const temEnvioEspecial = items.some(i => (i as any).envio_especial);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !phone.trim()) {
      toast.error("Por favor preencha todos os campos obrigatórios.");
      return;
    }
    if (!acceptedTerms) {
      toast.error("Deve aceitar os Termos e Condições para continuar.");
      return;
    }
    const now = Date.now();
    submitTimestamps.current = submitTimestamps.current.filter(t => now - t < 60_000);
    if (submitTimestamps.current.length >= 3) {
      toast.error("Demasiados pedidos. Aguarde um momento.");
      return;
    }
    submitTimestamps.current.push(now);

    setLoading(true);
    try {
      const quoteItems = items.map(i => ({
        id: i.id, name: i.name, price: i.price,
        category: i.category, quantity: i.quantity,
      }));
      const portesEstimados = totalPortes;

      const { error: fnError } = await supabase.functions.invoke("send-quote-request", {
        body: {
          customerName: name.trim(),
          customerEmail: email.trim(),
          customerPhone: phone.trim(),
          notes: notes.trim(),
          items: quoteItems,
          sendCopyToCustomer: sendCopy,
          shippingEstimate: portesEstimados,
        },
      });
      if (fnError) throw fnError;

      try {
        const shippingTotal = totalPortes;
        const { data: quote, error: qErr } = await supabase
          .from("quotes")
          .insert({
            ...(user ? { user_id: user.id } : {}),
            status: "sent",
            subtotal: subtotalSemIva,
            total: totalGeral,
            shipping_total: shippingTotal,
            notes: notes.trim() || null,
            customer_name: name.trim(),
            customer_email: email.trim(),
            customer_phone: phone.trim(),
            shipping_address: (() => {
              if (shippingOption === "pickup") return "Levantamento em loja";
              if (shippingOption === "saved" && selectedAddressId) {
                const a = savedAddresses.find((x: any) => x.id === selectedAddressId);
                if (a) return `${a.address_line1}${a.address_line2 ? ", " + a.address_line2 : ""}, ${a.postal_code} ${a.city}, ${a.country}`;
              }
              if (newAddress.line1.trim()) {
                return `${newAddress.line1.trim()}${newAddress.line2 ? ", " + newAddress.line2 : ""}, ${newAddress.postal_code} ${newAddress.city}, ${newAddress.country}`;
              }
              return null;
            })(),
          } as any)
          .select("id")
          .single();
        if (!qErr && quote) {
          const rows = items.map(i => ({
            quote_id: quote.id,
            product_id: i.id,
            product_name_snapshot: i.name,
            product_image_snapshot: i.imageUrl,
            unit_price: i.price ?? 0,
            quantity: i.quantity,
            line_total: (i.price ?? 0) * i.quantity,
          }));
          if (rows.length) await supabase.from("quote_items").insert(rows);
        }
      } catch (e) {
        console.warn("Could not save quote history", e);
      }

      items.forEach(i => trackEvent(i.id, "quote"));
      clearCart();
      setSuccess(true);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao enviar pedido. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // Ecrã de sucesso
  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 text-center">
        <CheckCircle className="h-20 w-20 text-green-500" />
        <h1 className="text-2xl font-bold">Pedido Enviado!</h1>
        <p className="text-muted-foreground max-w-sm">
          Vai receber por email o orçamento completo, com produtos, portes e prazo de entrega confirmados.
        </p>
        <Button onClick={() => navigate("/")}>Voltar ao início</Button>
      </div>
    );
  }

  // Carrinho vazio
  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
        <ShoppingCart className="h-16 w-16 text-muted-foreground/30" />
        <h1 className="text-xl font-bold">O seu orçamento está vazio</h1>
        <p className="text-muted-foreground text-sm">Adicione produtos do catálogo para pedir orçamento.</p>
        <Button onClick={() => navigate("/")}>Ir ao catálogo</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header do projecto */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-lg">
        <div className="container mx-auto flex items-center gap-3 px-3 py-2 sm:px-4">
          <Link to="/" className="shrink-0 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Início</span>
          </Link>
          <Link to="/" className="shrink-0">
            <img src={vrcfLogo} alt="VRCF" className="h-9 sm:h-11 w-auto" />
          </Link>
          <h1 className="flex-1 text-sm font-bold text-foreground flex items-center gap-2 truncate">
            <ShoppingCart className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate">Pedido de Orçamento</span>
          </h1>
          <div className="flex items-center gap-2 shrink-0">
            <DarkModeToggle />
            <UserMenuButton />
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 grid grid-cols-1 md:grid-cols-[1fr_360px] gap-6">

        {/* ── COLUNA ESQUERDA: produtos + formulário ── */}
        <div className="space-y-6">

          {/* Lista de produtos */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="font-semibold text-sm">Produtos</h2>
              <button
                onClick={clearCart}
                className="text-xs text-destructive hover:underline"
              >
                Limpar tudo
              </button>
            </div>
            <div className="divide-y divide-border">
              {items.map(item => {
                const info = produtoMap[item.id];
                const slug = info?.slug;
                const stockStatus = info?.stock_status;
                const stockBadge = stockStatus === "on_request"
                  ? { label: "Por encomenda", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" }
                  : stockStatus === "low"
                  ? { label: "Últimas unidades", cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" }
                  : (stockStatus === "unknown" || !stockStatus)
                  ? { label: "Disponibilidade a confirmar", cls: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" }
                  : null;
                return (
                <div key={item.id} className="flex gap-3 p-4">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl} alt={item.name}
                      className="w-16 h-16 object-contain rounded-xl bg-muted flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center flex-shrink-0">
                      <Package className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    {slug ? (
                      <Link
                        to={`/produto/${slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-sm leading-snug line-clamp-2 hover:text-primary hover:underline transition-colors"
                      >
                        {item.name}
                      </Link>
                    ) : (
                      <p className="font-medium text-sm leading-snug line-clamp-2">{item.name}</p>
                    )}
                    {item.category && (
                      <span className="text-[10px] uppercase tracking-wider text-primary font-bold">{item.category}</span>
                    )}
                    {stockBadge && (
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 mr-1 ${stockBadge.cls}`}>
                        {stockStatus === "on_request" && <Clock className="h-2.5 w-2.5" />}
                        {stockBadge.label}
                      </span>
                    )}
                    {item.price != null && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {(item.price * 1.23).toFixed(2).replace(".", ",")} € c/IVA/un.
                      </p>
                    )}
                    {(item as any).minSaleQty > 1 && (
                      <p className="text-[10px] text-muted-foreground">Embalagem de {(item as any).minSaleQty} un.</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        variant="outline" size="icon" className="h-7 w-7 rounded-lg"
                        onClick={() => updateQuantity(item.id, item.quantity - ((item as any).minSaleQty > 1 ? (item as any).minSaleQty : 1))}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                      <Button
                        variant="outline" size="icon" className="h-7 w-7 rounded-lg"
                        onClick={() => updateQuantity(item.id, item.quantity + ((item as any).minSaleQty > 1 ? (item as any).minSaleQty : 1))}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 ml-auto text-destructive hover:text-destructive"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {item.price != null && (
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-sm">
                        {(item.price * item.quantity * 1.23).toFixed(2).replace(".", ",")} €
                      </p>
                      <p className="text-[10px] text-muted-foreground">c/IVA</p>
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          </div>

          {/* Dados de contacto */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h2 className="font-semibold text-sm">Os seus dados</h2>
            {!user && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                <Link to="/login" className="text-primary font-medium hover:underline">Inicie sessão</Link>
                {" ou "}
                <Link to="/registo" className="text-primary font-medium hover:underline">crie conta</Link>
                {" para guardar este orçamento no seu histórico."}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs">Nome *</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="O seu nome" maxLength={100} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs">Contacto telefónico *</Label>
                <Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+351 912 345 678" maxLength={20} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs">Email *</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" maxLength={255} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs">Observações</Label>
              <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Informações adicionais, referências, condições especiais..." maxLength={1000} rows={3} />
            </div>

            {/* Morada de entrega */}
            <div className="space-y-2.5">
              <Label className="text-xs font-semibold">Morada de entrega</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {user && savedAddresses.length > 0 && (
                  <button type="button"
                    onClick={() => { setShippingOption("saved"); setSelectedAddressId(defaultAddr?.id ?? savedAddresses[0]?.id ?? null); }}
                    className={`text-left rounded-xl border px-3 py-2.5 text-xs transition-all ${shippingOption === "saved" ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border hover:border-primary/30"}`}>
                    <p className="font-semibold mb-0.5">Morada guardada</p>
                    <p className="text-muted-foreground">Selecionar da minha conta</p>
                  </button>
                )}
                <button type="button"
                  onClick={() => setShippingOption("new")}
                  className={`text-left rounded-xl border px-3 py-2.5 text-xs transition-all ${shippingOption === "new" ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border hover:border-primary/30"}`}>
                  <p className="font-semibold mb-0.5">Nova morada</p>
                  <p className="text-muted-foreground">Indicar endereço de entrega</p>
                </button>
                <button type="button"
                  onClick={() => setShippingOption("pickup")}
                  className={`text-left rounded-xl border px-3 py-2.5 text-xs transition-all ${shippingOption === "pickup" ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border hover:border-primary/30"}`}>
                  <p className="font-semibold mb-0.5">Levantamento em loja</p>
                  <p className="text-muted-foreground">Sem portes de envio</p>
                </button>
              </div>

              {/* Seletor de morada guardada */}
              {shippingOption === "saved" && user && savedAddresses.length > 0 && (
                <div className="space-y-2">
                  {savedAddresses.map((a: any) => (
                    <button key={a.id} type="button"
                      onClick={() => setSelectedAddressId(a.id)}
                      className={`w-full text-left rounded-lg border px-3 py-2 text-xs transition-all ${selectedAddressId === a.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                      <span className="font-semibold">{a.label}</span>
                      {a.is_default && <span className="ml-1.5 text-[10px] text-primary">● Principal</span>}
                      <p className="text-muted-foreground mt-0.5">{a.address_line1}, {a.postal_code} {a.city}</p>
                    </button>
                  ))}
                </div>
              )}

              {/* Nova morada */}
              {shippingOption === "new" && (
                <div className="space-y-2.5 p-3 rounded-xl border border-border bg-muted/20">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Morada</Label>
                    <Input value={newAddress.line1} onChange={e => setNewAddress(p => ({...p, line1: e.target.value}))} placeholder="Rua, nº, andar..." />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Cód. Postal</Label>
                      <Input value={newAddress.postal_code} onChange={e => setNewAddress(p => ({...p, postal_code: e.target.value}))} placeholder="0000-000" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Cidade</Label>
                      <Input value={newAddress.city} onChange={e => setNewAddress(p => ({...p, city: e.target.value}))} placeholder="Lisboa" />
                    </div>
                  </div>
                </div>
              )}

              {shippingOption === "pickup" && (
                <p className="text-xs text-muted-foreground px-1">
                  Rua Luís Calado Nunes 15 LJ B, 2870-350 Montijo · Seg-Sex 9h-18h
                </p>
              )}
            </div>

            <div className="space-y-2.5 pt-1">
              <div className="flex items-start gap-2">
                <Checkbox id="sendCopy" checked={sendCopy} onCheckedChange={c => setSendCopy(c === true)} />
                <label htmlFor="sendCopy" className="text-xs text-muted-foreground leading-tight cursor-pointer">
                  Enviar cópia do pedido para o meu email
                </label>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox id="terms" checked={acceptedTerms} onCheckedChange={c => setAcceptedTerms(c === true)} />
                <label htmlFor="terms" className="text-xs text-muted-foreground leading-tight cursor-pointer">
                  Li e aceito os{" "}
                  <a href="/termos-e-condicoes" target="_blank" className="text-primary hover:underline">Termos e Condições</a>
                  {" "}, as{" "}
                  <a href="/condicoes-de-venda" target="_blank" className="text-primary hover:underline">Condições de Venda</a>
                  {" "}e a{" "}
                  <a href="/politica-de-privacidade" target="_blank" className="text-primary hover:underline">Política de Privacidade</a>.
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* ── COLUNA DIREITA: resumo + enviar (sticky em desktop) ── */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h2 className="font-semibold text-sm">Resumo</h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal s/ IVA</span>
                <span>{subtotalSemIva.toFixed(2).replace(".", ",")} €</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">IVA (23%)</span>
                <span>{(subtotalComIva - subtotalSemIva).toFixed(2).replace(".", ",")} €</span>
              </div>
              {pesoTotal > 0 && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Package className="h-3 w-3" /> Peso total</span>
                  <span>{pesoTotal.toFixed(2)} kg</span>
                </div>
              )}
            </div>

            {/* Portes */}
            {temEnvioEspecial ? (
              <div className="rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-400">
                  <Truck className="h-3.5 w-3.5 shrink-0" /> Portes
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  Um ou mais produtos têm condições especiais de envio. O valor dos portes será calculado e incluído no orçamento final.
                </p>
              </div>
            ) : portes.length > 0 ? (
              <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 space-y-1.5">
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Truck className="h-3.5 w-3.5 text-primary" /> Portes estimados
                  </span>
                  <span className="font-bold text-primary">
                    {totalPortes > 0 ? `${totalPortes.toFixed(2).replace(".", ",")} €` : "ver orçamento"}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">Portugal Continental · confirmados no orçamento final</p>
              </div>
            ) : null}

            <div className="border-t border-border pt-3 flex justify-between font-bold text-base">
              <span>Total estimado</span>
              <span className="text-primary">
                {temEnvioEspecial
                  ? `${subtotalComIva.toFixed(2).replace(".", ",")} € + portes`
                  : totalGeral.toFixed(2).replace(".", ",")} €
              </span>
            </div>

            {/* Notas */}
            <div className="space-y-1.5 text-[11px] text-muted-foreground">
              <div className="flex items-start gap-1.5">
                <Clock className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
                <span>Receberá por email o orçamento completo com portes e prazo de entrega confirmados.</span>
              </div>
              <div className="flex items-start gap-1.5">
                <Info className="h-3 w-3 mt-0.5 shrink-0" />
                <span>Stock sujeito a disponibilidade.</span>
              </div>
            </div>

            <Button
              className="w-full gap-2 h-12 rounded-xl font-bold text-base"
              size="lg"
              disabled={loading || !acceptedTerms || !name.trim() || !email.trim() || !phone.trim()}
              onClick={handleSubmit}
            >
              {loading
                ? <Loader2 className="h-5 w-5 animate-spin" />
                : <Send className="h-5 w-5" />
              }
              Enviar Pedido de Orçamento
            </Button>

            <a
              href="https://wa.me/351911564243?text=Ol%C3%A1%20VRCF%2C%20gostaria%20de%20obter%20informa%C3%A7%C3%A3o%20sobre%3A"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full h-10 rounded-xl border border-green-500 text-green-600 text-sm font-medium hover:bg-green-50 dark:hover:bg-green-950 transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              Prefere falar primeiro? WhatsApp
            </a>
          </div>
        </div>

      </div>

      <SiteFooter />
    </div>
  );
}
