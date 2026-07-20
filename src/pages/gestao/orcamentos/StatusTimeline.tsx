import { CheckCircle2 } from "lucide-react";
import { TIMELINE_STEPS, TERMINAL_STEPS } from "./constants";

export function StatusTimeline({ currentStatus, onChangeStatus }: {
  currentStatus: string;
  onChangeStatus: (s: string) => void;
}) {
  const isTerminal = TERMINAL_STEPS.includes(currentStatus);
  const currentIdx = TIMELINE_STEPS.findIndex(s => s.key === currentStatus);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-0 overflow-x-auto pb-1">
        {TIMELINE_STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isDone    = idx < currentIdx;
          const isCurrent = step.key === currentStatus;
          const isFuture  = idx > currentIdx;
          return (
            <div key={step.key} className="flex items-center shrink-0">
              <button
                onClick={() => !isTerminal && onChangeStatus(step.key)}
                title={step.label}
                className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition-all ${
                  isCurrent
                    ? "ring-1 ring-primary/20"
                    : isDone
                    ? "opacity-70 hover:opacity-100"
                    : isFuture
                    ? "opacity-30 hover:opacity-60"
                    : ""
                } ${!isTerminal ? "cursor-pointer" : "cursor-default"}`}
              >
                <div
                  className={
                    isDone
                      ? "status-step status-step-done"
                      : isCurrent
                      ? "status-step status-step-current"
                      : "status-step status-step-future"
                  }
                >
                  {isDone
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    : <Icon className={`h-4 w-4 ${isCurrent ? "text-primary" : "text-muted-foreground"}`} />
                  }
                </div>
                <span className={`text-[9px] font-medium whitespace-nowrap ${isCurrent ? "text-foreground" : "text-muted-foreground"}`}>
                  {step.label}
                </span>
              </button>
              {idx < TIMELINE_STEPS.length - 1 && (
                <div className={`h-px w-3 shrink-0 mx-0.5 ${idx < currentIdx ? "bg-emerald-400" : "bg-border"}`} />
              )}
            </div>
          );
        })}
      </div>

      {isTerminal && (
        <div className={`status-badge w-full justify-center py-2 ${currentStatus === "rejected" ? "status-badge-rejected" : "status-badge-cancelled"}`}>
          {currentStatus === "rejected" ? "✗ Rejeitado pelo cliente" : "✗ Cancelado"}
          <button className="ml-2 underline text-[11px]" onClick={() => onChangeStatus("in_review")}>
            Reabrir
          </button>
        </div>
      )}

      {!isTerminal && currentIdx >= 0 && currentIdx < TIMELINE_STEPS.length - 1 && (
        <button
          onClick={() => onChangeStatus(TIMELINE_STEPS[currentIdx + 1].key)}
          className="w-full text-xs text-center py-1.5 px-3 rounded-lg border border-dashed border-primary/40 text-primary hover:bg-primary/5 transition-colors"
        >
          Avançar → {TIMELINE_STEPS[currentIdx + 1].label}
        </button>
      )}
    </div>
  );
}
