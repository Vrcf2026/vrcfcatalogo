import { useEffect, useState } from "react";
import { X, Search, ShoppingCart, Send } from "lucide-react";
import vrcfLogo from "@/assets/vrcf-logo.png";

const KEY = "vrcf_welcome";

export function WelcomeBanner() {
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(KEY)) {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const start = Date.now();
    const id = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - start) / 10000) * 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(id);
        close();
      }
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = () => {
    try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ }
    setOpen(false);
  };

  if (!open) return null;

  const steps = [
    { icon: Search, label: "Pesquisar produtos" },
    { icon: ShoppingCart, label: "Adicionar ao orçamento" },
    { icon: Send, label: "Pedir e receber resposta" },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-zinc-900 text-white rounded-2xl shadow-2xl overflow-hidden">
        <button
          onClick={close}
          aria-label="Fechar"
          className="absolute top-3 right-3 p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-8 text-center">
          <img src={vrcfLogo} alt="VRCF" className="h-16 mx-auto mb-5 brightness-110" />
          <h2 className="font-heading text-3xl font-bold text-orange-500">VRCF Showroom</h2>
          <p className="mt-2 text-sm text-zinc-300">Segurança · Redes · Escritório &amp; IT</p>

          <div className="mt-7 grid grid-cols-3 gap-3">
            {steps.map((s, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="h-12 w-12 rounded-full bg-orange-500/15 border border-orange-500/40 flex items-center justify-center">
                  <s.icon className="h-5 w-5 text-orange-400" />
                </div>
                <span className="text-[11px] text-zinc-400 leading-tight">{s.label}</span>
              </div>
            ))}
          </div>

          <button
            onClick={close}
            className="mt-7 w-full rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 transition"
          >
            Entrar no catálogo →
          </button>
        </div>

        <div className="h-1 bg-zinc-800">
          <div
            className="h-full bg-orange-500 transition-[width] duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
