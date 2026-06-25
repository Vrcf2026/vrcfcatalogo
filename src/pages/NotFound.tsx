import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import vrcfLogo from "@/assets/vrcf-logo.png";

const NotFound = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigate(`/pesquisa?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center">
      <Link to="/" className="mb-8">
        <img src={vrcfLogo} alt="VRCF" className="h-12 w-auto mx-auto" />
      </Link>

      <p className="text-8xl font-bold text-primary/20 leading-none select-none">404</p>
      <h1 className="mt-2 font-heading text-2xl font-bold">Página não encontrada</h1>
      <p className="mt-2 text-muted-foreground text-sm max-w-xs">
        A página que procuras não existe ou foi removida. Experimenta pesquisar no catálogo:
      </p>

      <form onSubmit={handleSearch} className="mt-6 flex gap-2 w-full max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Pesquisar produtos..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={!query.trim()}>Pesquisar</Button>
      </form>

      <div className="mt-6 flex gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <Button variant="outline" size="sm" asChild className="gap-1.5">
          <Link to="/"><Home className="h-4 w-4" /> Início</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
