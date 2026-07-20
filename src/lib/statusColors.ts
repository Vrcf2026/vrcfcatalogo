// Status color tokens — centralizes badge/timeline colors for quotes and RMAs.
// Uses semantic CSS classes defined in src/index.css (`.status-badge-*`).
// Never hardcode colors in components — always call these helpers.

export type QuoteStatus =
  | "pending" | "in_review" | "sent" | "accepted" | "paid"
  | "in_preparation" | "shipped" | "completed" | "rejected" | "cancelled";

export type RmaStatus =
  | "submitted" | "in_review" | "approved" | "rejected"
  | "in_repair" | "shipped_back" | "completed" | "cancelled";

/** Returns the semantic badge class for a quote status. */
export function quoteStatusClass(status: string): string {
  return `status-badge status-badge-${status}`;
}

/** Returns the semantic badge class for an RMA status. */
export function rmaStatusClass(status: string): string {
  // RMA statuses map onto the shared token set
  const map: Record<string, string> = {
    submitted:    "pending",
    in_review:    "in_review",
    approved:     "accepted",
    rejected:     "rejected",
    in_repair:    "in_preparation",
    shipped_back: "shipped",
    completed:    "completed",
    cancelled:    "cancelled",
  };
  const key = map[status] ?? "cancelled";
  return `status-badge status-badge-${key}`;
}

/** Class for a filled circle indicator (timeline dot background). */
export function timelineStepClass(status: string): string {
  return `status-step status-step-${status}`;
}
