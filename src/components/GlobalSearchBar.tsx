import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface GlobalSearchBarProps {
  className?: string;
  placeholder?: string;
}

/**
 * Barra de pesquisa global — redireciona para /pesquisa?q=...
 * Reutilizável em qualquer header (Produto, Index, WorldCatalog, Pesquisa).
 */
export function GlobalSearchBar({ className = "", placeholder = "Pesquisar em todo o catálogo..." }: GlobalSearchBarProps) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) navigate(`/pesquisa?q=${encodeURIComponent(q)}`);
  };

  return (
    <form onSubmit={handleSubmit} className={`relative flex-1 max-w-xl mx-auto ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="pl-10 bg-muted/60 border-transparent h-9 text-sm rounded-xl"
      />
    </form>
  );
}
