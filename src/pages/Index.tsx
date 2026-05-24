import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ShieldCheck, Monitor, ArrowRight, ShoppingCart, Phone, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import BrandsStrip from "@/components/BrandsStrip";
import ContactFloatingBubble from "@/components/ContactFloatingBubble";
import { CartDrawer } from "@/components/CartDrawer";
import { useCart } from "@/contexts/CartContext";
import { useState } from "react";
import { SuggestionDialog } from "@/components/SuggestionDialog";
import vrcfLogo from "@/assets/vrcf-logo.png";
import vrcfShield from "@/assets/vrcf-shield.png";

const Index = () => {
  const { totalItems, setIsOpen } = useCart();
  const [suggestionOpen, setSuggestionOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>VRCF Showroom — Segurança, Redes, Escritório & IT</title>
        <meta name="description" content="Catálogo profissional VRCF: videovigilância, redes, equipamento informático e escritório. Mais de 20.000 produtos." />
        <link rel="canonical" href="https://showroom.vrcf.info/" />
      </Helmet>

      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3">
          <img src={vrcfLogo} alt="VRCF" className="h-10 sm:h-14 w-auto" />
          <div className="flex items-center gap-2">
            <DarkModeToggle />
            <Button variant="outline" size="sm" className="relative gap-1.5 h-9" onClick={() => setIsOpen(true)}>
              <ShoppingCart className="h-4 w-4" /> Orçamento
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center">{totalItems}</span>
              )}
            </Button>
            <Link to="/login" className="text-xs text-muted-foreground hover:text-foreground">Admin</Link>
          </div>
        </div>
      </header>

      <section className="container mx-auto px-4 py-12 sm:py-16 text-center">
        <h1 className="font-heading text-4xl sm:text-6xl font-bold tracking-tight">VRCF Showroom</h1>
        <p className="mt-4 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
          Tecnologia e Segurança ao seu alcance. Escolha o seu mundo.
        </p>
      </section>

      <section className="container mx-auto px-4 pb-16 grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 flex-1">
        <Link
          to="/seguranca"
          className="group relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/15 via-card to-card p-8 sm:p-12 min-h-[320px] flex flex-col justify-between transition-all hover:scale-[1.02] hover:shadow-2xl hover:border-primary/40"
        >
          <div>
            <ShieldCheck className="h-12 w-12 text-primary mb-4" />
            <h2 className="font-heading text-3xl sm:text-4xl font-bold">Segurança & Redes</h2>
            <p className="mt-3 text-muted-foreground max-w-md">
              Videovigilância, controlo de acessos, alarmes, redes profissionais e infraestrutura.
            </p>
          </div>
          <div className="flex items-center gap-2 text-primary font-medium mt-6">
            Explorar catálogo <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
          <div className="absolute -right-12 -bottom-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        </Link>

        <Link
          to="/escritorio"
          className="group relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-accent/20 via-card to-card p-8 sm:p-12 min-h-[320px] flex flex-col justify-between transition-all hover:scale-[1.02] hover:shadow-2xl hover:border-accent/40"
        >
          <div>
            <Monitor className="h-12 w-12 text-accent-foreground mb-4" />
            <h2 className="font-heading text-3xl sm:text-4xl font-bold">Escritório & IT</h2>
            <p className="mt-3 text-muted-foreground max-w-md">
              Computadores, periféricos, impressão, consumíveis e mobiliário para o escritório.
            </p>
          </div>
          <div className="flex items-center gap-2 text-accent-foreground font-medium mt-6">
            Explorar catálogo <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
          <div className="absolute -right-12 -bottom-12 h-48 w-48 rounded-full bg-accent/15 blur-3xl pointer-events-none" />
        </Link>
      </section>

      <BrandsStrip />

      <footer className="border-t border-border bg-accent text-accent-foreground py-8 mt-auto">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src={vrcfShield} alt="VRCF" className="h-12 w-auto" />
            <div>
              <p className="font-heading font-bold text-sm">VRCF - Informática & Segurança</p>
              <p className="text-xs text-accent-foreground/70">Tecnologia e Segurança ao Seu Alcance</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <a href="tel:+351911564243" className="flex items-center gap-1.5 hover:text-primary"><Phone className="h-3.5 w-3.5" /> +351 911 564 243</a>
            <a href="mailto:geral@vrcf.pt" className="flex items-center gap-1.5 hover:text-primary"><Mail className="h-3.5 w-3.5" /> geral@vrcf.pt</a>
            <a href="https://maps.google.com/?q=Montijo" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-primary"><MapPin className="h-3.5 w-3.5" /> Montijo</a>
          </div>
          <div className="text-xs space-x-3">
            <Link to="/termos-e-condicoes" className="text-primary hover:underline">Termos</Link>
            <Link to="/politica-de-cookies" className="text-primary hover:underline">Cookies</Link>
            <button onClick={() => setSuggestionOpen(true)} className="text-primary hover:underline">Sugestão</button>
          </div>
        </div>
      </footer>

      <CartDrawer />
      <ContactFloatingBubble />
      <SuggestionDialog open={suggestionOpen} onOpenChange={setSuggestionOpen} />
    </div>
  );
};

export default Index;
