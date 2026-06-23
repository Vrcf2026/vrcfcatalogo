import { useState } from "react";
import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, Star } from "lucide-react";
import { SuggestionDialog } from "@/components/SuggestionDialog";
import { openCookiePreferences } from "@/components/CookieConsentBanner";
import vrcfShield from "@/assets/vrcf-shield.png";

/**
 * Rodapé partilhado por todas as páginas do catálogo (homepage e
 * mundos/produto). Inclui identificação da empresa, contactos, avisos
 * legais (preços/imagens) e links para Termos, Privacidade, Cookies,
 * Livro de Reclamações e Sugestão.
 */
export function SiteFooter() {
  const [suggestionOpen, setSuggestionOpen] = useState(false);

  return (
    <>
      <footer className="border-t border-border py-7 px-4 bg-muted">
        <div className="max-w-[1600px] mx-auto space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="flex items-center gap-3">
              <img src={vrcfShield} alt="VRCF" className="h-9 w-auto" />
              <div>
                <p className="font-bold text-sm">VRCF — Informática & Segurança</p>
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  NIF 515237205 · Montijo
                  <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                    <Star className="h-3 w-3 fill-primary text-primary" />
                    Desde 2019
                  </span>
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-5 text-sm">
              <a href="tel:+351911564243" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors text-xs">
                <Phone className="h-3.5 w-3.5" /> +351 911 564 243
              </a>
              <a href="mailto:geral@vrcf.pt" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors text-xs">
                <Mail className="h-3.5 w-3.5" /> geral@vrcf.pt
              </a>
              <a href="https://maps.google.com/?q=Rua+Luis+Calado+Nunes+15+Montijo" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors text-xs">
                <MapPin className="h-3.5 w-3.5" /> R. Luis Calado Nunes 15 LJ B
              </a>
            </div>
          </div>

          <div className="border-t border-border pt-4 space-y-1.5 text-center sm:text-right">
            <p className="text-xs text-muted-foreground">
              Os preços apresentados incluem IVA à taxa legal em vigor e são meramente indicativos, podendo sofrer alterações sem aviso prévio.
            </p>
            <p className="text-xs text-muted-foreground">
              As imagens apresentadas são meramente ilustrativas.
            </p>
            <p className="flex flex-wrap items-center justify-center sm:justify-end gap-x-3 gap-y-1 text-xs pt-1">
              <Link to="/termos-e-condicoes" className="text-primary hover:underline transition-colors">Termos e Condições</Link>
              <Link to="/politica-de-privacidade" className="text-primary hover:underline transition-colors">Privacidade</Link>
              <Link to="/politica-de-cookies" className="text-primary hover:underline transition-colors">Cookies</Link>
              <Link to="/conta" className="text-primary hover:underline transition-colors">A Minha Conta</Link>
              <button type="button" onClick={openCookiePreferences} className="text-primary hover:underline transition-colors">Gerir Cookies</button>
              <a href="https://www.livroreclamacoes.pt" target="_blank" rel="noopener noreferrer"
                className="text-primary hover:underline transition-colors">
                Livro de Reclamações
              </a>
              <button onClick={() => setSuggestionOpen(true)} className="text-primary hover:underline transition-colors">Sugestão</button>
            </p>
          </div>
        </div>
      </footer>

      <SuggestionDialog open={suggestionOpen} onOpenChange={setSuggestionOpen} />
    </>
  );
}
