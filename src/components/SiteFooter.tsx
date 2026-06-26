import { useState } from "react";
import { Link } from "react-router-dom";
import { Phone, Mail, MapPin } from "lucide-react";
import { SuggestionDialog } from "@/components/SuggestionDialog";
import { openCookiePreferences } from "@/components/CookieConsentBanner";
import vrcfShield from "@/assets/vrcf-shield.png";

export function SiteFooter() {
  const [suggestionOpen, setSuggestionOpen] = useState(false);

  return (
    <>
      <footer className="border-t border-border bg-muted/50">

        {/* ── Corpo principal ── */}
        <div className="max-w-[1600px] mx-auto px-4 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">

            {/* Coluna 1 — Identidade */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <img src={vrcfShield} alt="VRCF" className="h-9 w-auto" />
                <div>
                  <p className="font-bold text-sm leading-tight">VRCF</p>
                  <p className="text-[11px] text-muted-foreground">Informática & Segurança</p>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Soluções de tecnologia, segurança e economato para empresas e particulares. Montijo, desde 2019.
              </p>
              <p className="text-[11px] text-muted-foreground">NIF 515237205</p>
            </div>

            {/* Coluna 2 — Contactos */}
            <div className="flex flex-col gap-2.5">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1">Contacto</p>
              <a href="tel:+351911564243"
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors">
                <Phone className="h-3.5 w-3.5 shrink-0" /> +351 911 564 243
              </a>
              <a href="mailto:geral@vrcf.pt"
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors">
                <Mail className="h-3.5 w-3.5 shrink-0" /> geral@vrcf.pt
              </a>
              <a href="https://maps.google.com/?q=Rua+Luis+Calado+Nunes+15+Montijo"
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors">
                <MapPin className="h-3.5 w-3.5 shrink-0" /> R. Luís Calado Nunes 15 LJ B, Montijo
              </a>
            </div>

            {/* Coluna 3 — Links legais */}
            <div className="flex flex-col gap-2.5">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1">Informações</p>
              <Link to="/termos-e-condicoes" className="text-xs text-muted-foreground hover:text-primary transition-colors">Termos e Condições</Link>
              <Link to="/condicoes-de-venda" className="text-xs text-muted-foreground hover:text-primary transition-colors">Condições de Venda</Link>
              <Link to="/politica-de-privacidade" className="text-xs text-muted-foreground hover:text-primary transition-colors">Política de Privacidade</Link>
              <Link to="/politica-de-cookies" className="text-xs text-muted-foreground hover:text-primary transition-colors">Política de Cookies</Link>
              <button type="button" onClick={openCookiePreferences}
                className="text-xs text-muted-foreground hover:text-primary transition-colors text-left">
                Gerir Cookies
              </button>
              <button onClick={() => setSuggestionOpen(true)}
                className="text-xs text-muted-foreground hover:text-primary transition-colors text-left">
                Enviar Sugestão
              </button>
            </div>
          </div>
        </div>

        {/* ── Barra inferior ── */}
        <div className="border-t border-border/60">
          <div className="max-w-[1600px] mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-[10px] text-muted-foreground/70 text-center sm:text-left">
              Os preços incluem IVA à taxa legal em vigor e são meramente indicativos. As imagens são meramente ilustrativas.
            </p>
            <div className="flex items-center gap-3">
              <a href="https://www.livroreclamacoes.pt" target="_blank" rel="noopener noreferrer"
                className="text-[11px] font-semibold text-primary hover:underline transition-colors whitespace-nowrap">
                Livro de Reclamações
              </a>
              <Link to="/conta" className="text-[11px] text-muted-foreground hover:text-primary transition-colors">
                A Minha Conta
              </Link>
            </div>
          </div>
        </div>

      </footer>

      <SuggestionDialog open={suggestionOpen} onOpenChange={setSuggestionOpen} />
    </>
  );
}
