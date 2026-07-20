import { FileText, Clock, Send, CheckCircle2, CreditCard, Wrench, Truck } from "lucide-react";

export const URGENCIA: Record<string, number> = {
  pending: 0, sent: 1, in_review: 2, accepted: 3,
  paid: 4, in_preparation: 5, shipped: 6,
  rejected: 7, cancelled: 8, completed: 9,
};

export const STATUS_OPTIONS = [
  { value: "pending",         label: "Pendente — por analisar" },
  { value: "in_review",       label: "Em análise" },
  { value: "sent",            label: "Orçamento enviado" },
  { value: "accepted",        label: "Aceite pelo cliente" },
  { value: "paid",            label: "Pago" },
  { value: "in_preparation",  label: "Em preparação" },
  { value: "shipped",         label: "Enviado / Expedido" },
  { value: "completed",       label: "Concluído" },
  { value: "rejected",        label: "Rejeitado" },
  { value: "cancelled",       label: "Cancelado" },
];

export const PRAZO_OPCOES = ["24-48h", "3-5 dias úteis", "5-10 dias úteis", "Sob consulta"];

export const FORMAS_PAGAMENTO = [
  "Transferência bancária (IBAN: PT50 XXXX XXXX XXXX XXXX XXXX X)",
  "MB Way (+351 911 564 243)",
  "Multibanco (referência enviada por email)",
  "Numerário (pagamento em loja)",
];

export const IVA_RATE = 0.23;

export const TIMELINE_STEPS = [
  { key: "pending",        label: "Pedido",      icon: FileText     },
  { key: "in_review",      label: "Em análise",  icon: Clock        },
  { key: "sent",           label: "Enviado",     icon: Send         },
  { key: "accepted",       label: "Aceite",      icon: CheckCircle2 },
  { key: "paid",           label: "Pago",        icon: CreditCard   },
  { key: "in_preparation", label: "Preparação",  icon: Wrench       },
  { key: "shipped",        label: "Expedido",    icon: Truck        },
  { key: "completed",      label: "Concluído",   icon: CheckCircle2 },
];

export const TERMINAL_STEPS = ["rejected", "cancelled"];
