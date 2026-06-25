import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QueryErrorProps {
  /** Mensagem a mostrar. Por omissão: mensagem genérica. */
  message?: string;
  /** Callback para tentar novamente — mostra botão se fornecido. */
  onRetry?: () => void;
  /** Tamanho: "sm" para erros inline, "md" (default) para secções. */
  size?: "sm" | "md";
}

/**
 * Componente de erro reutilizável para queries TanStack Query.
 * Uso:
 *   {query.isError && <QueryError onRetry={() => query.refetch()} />}
 */
export function QueryError({ message, onRetry, size = "md" }: QueryErrorProps) {
  if (size === "sm") {
    return (
      <div className="flex items-center gap-2 text-xs text-destructive py-2 px-3 rounded-lg bg-destructive/8 border border-destructive/20">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span>{message ?? "Erro ao carregar. Tente novamente."}</span>
        {onRetry && (
          <button onClick={onRetry} className="ml-auto underline hover:no-underline font-medium shrink-0">
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 px-4 rounded-2xl border border-destructive/20 bg-destructive/5 text-center">
      <AlertTriangle className="h-8 w-8 text-destructive/60" />
      <div>
        <p className="text-sm font-semibold text-foreground">
          {message ?? "Não foi possível carregar o conteúdo"}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Verifique a sua ligação e tente novamente.
        </p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Tentar novamente
        </Button>
      )}
    </div>
  );
}
