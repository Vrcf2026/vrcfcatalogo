import {
  Shield, Wifi, Camera, Lock, Bell, Server, Monitor, Printer, Mouse, HardDrive,
  Cpu, Network, Radio, Zap, Package, Headphones, Phone, Tablet, Battery, Cable,
  Settings, Laptop, Apple, ShoppingCart, Wrench, Sparkles,
  UtensilsCrossed, Coffee, Box, Cpu as Chip, FileText,
  Eye, Truck, KeyRound, DoorOpen, Flame, Bot, Sun, Receipt, Sofa,
} from "lucide-react";

export interface CategoryMeta {
  icon: React.ElementType;
  color: string;
  bg: string;
}

// Paletas por mundo — bg-100 + text-700 (mais vivas que bg-50, sem ser agressivas)
// O ícone diferencia a categoria; a cor identifica o mundo.
const W = {
  orange: { color: "text-orange-700", bg: "bg-orange-100 dark:bg-orange-900/40" },
  blue:   { color: "text-blue-700",   bg: "bg-blue-100 dark:bg-blue-900/40"   },
  green:  { color: "text-green-700",  bg: "bg-green-100 dark:bg-green-900/40" },
  slate:  { color: "text-slate-600",  bg: "bg-slate-100 dark:bg-slate-800/40" },
};

export const categoryMetaMap: Record<string, CategoryMeta> = {
  // ── Escritório / Diginova — azul ──
  "Portáteis":              { icon: Laptop,          ...W.blue   },
  "Desktops":               { icon: Monitor,         ...W.blue   },
  "Tudo-em-Um":             { icon: Monitor,         ...W.blue   },
  "Servidores":             { icon: Server,          ...W.blue   },
  "Monitores":              { icon: Monitor,         ...W.blue   },
  "Apple":                  { icon: Apple,           ...W.slate  },
  "Impressoras":            { icon: Printer,         ...W.blue   },
  "Tablets":                { icon: Tablet,          ...W.blue   },
  "TPV":                    { icon: Receipt,         ...W.blue   },
  "Informática Premium":    { icon: Cpu,             ...W.blue   },
  "Outros":                 { icon: Package,         ...W.slate  },

  // ── Segurança / Visiotech — laranja ──
  "Acessórios IT e Segurança": { icon: Cable,        ...W.orange },
  "CCTV IP":                { icon: Camera,          ...W.orange },
  "CCTV Analógico":         { icon: Camera,          ...W.orange },
  "Networking":             { icon: Network,         ...W.orange },
  "Controlo de Presença/Acessos": { icon: KeyRound,  ...W.orange },
  "Intrusão":               { icon: Bell,            ...W.orange },
  "Videoporteiros":         { icon: DoorOpen,        ...W.orange },
  "Energia":                { icon: Battery,         ...W.orange },
  "Smart Home":             { icon: Wifi,            ...W.orange },
  "Audiovisuais":           { icon: Headphones,      ...W.orange },
  "Smartphone e Escritório": { icon: Phone,          ...W.orange },
  "Sonorização e Áudio":    { icon: Headphones,      ...W.orange },
  "Mobilidade":             { icon: Truck,           ...W.orange },
  "Merchandising":          { icon: ShoppingCart,    ...W.orange },
  "Analítica de Vídeo":     { icon: Eye,             ...W.orange },
  "Outlet":                 { icon: Box,             ...W.slate  },
  "Incêndio e Evacuação":   { icon: Flame,           ...W.orange },
  "Promoções":              { icon: Sparkles,        ...W.orange },
  "Robótica":               { icon: Bot,             ...W.orange },
  "Outdoor":                { icon: Sun,             ...W.orange },

  // ── Economato / ALL.TO — verde ──
  "Impressão":              { icon: Printer,         ...W.green  },
  "Papelaria":              { icon: FileText,        ...W.green  },
  "Alimentar":              { icon: UtensilsCrossed, ...W.green  },
  "Manutenção":             { icon: Wrench,          ...W.slate  },
  "Limpeza":                { icon: Sparkles,        ...W.green  },
  "Informática":            { icon: Chip,            ...W.green  },
  "Higiene e Beleza":       { icon: Sparkles,        ...W.green  },
  "Mobiliário":             { icon: Sofa,            ...W.green  },
  "Embalagem":              { icon: Box,             ...W.green  },
  "Eletrónica":             { icon: Cpu,             ...W.green  },
  "Café e Chá":             { icon: Coffee,          ...W.green  },

  // ── Transversais ──
  "Videovigilância":        { icon: Camera,          ...W.orange },
  "Controlo de Acessos":    { icon: Lock,            ...W.orange },
  "Alarmes":                { icon: Bell,            ...W.orange },
  "Redes":                  { icon: Network,         ...W.orange },
  "Wireless":               { icon: Wifi,            ...W.blue   },
  "Computadores":           { icon: Monitor,         ...W.blue   },
  "Periféricos":            { icon: Mouse,           ...W.blue   },
  "Armazenamento":          { icon: HardDrive,       ...W.blue   },
  "Processadores":          { icon: Cpu,             ...W.blue   },
  "Telecomunicações":       { icon: Phone,           ...W.blue   },
  "Áudio e Vídeo":          { icon: Headphones,      ...W.blue   },
  "Energia e UPS":          { icon: Battery,         ...W.orange },
  "Cabos e Conectores":     { icon: Cable,           ...W.slate  },
  "Software":               { icon: Settings,        ...W.blue   },
  "Segurança Electrónica":  { icon: Shield,          ...W.orange },
  "Transmissores":          { icon: Radio,           ...W.orange },
  "Energia Solar":          { icon: Zap,             ...W.orange },
};

export const defaultCategoryMeta: CategoryMeta = {
  icon: Package,
  color: "text-muted-foreground",
  bg: "bg-muted"
};

export function getCategoryMeta(name: string): CategoryMeta {
  return categoryMetaMap[name] ?? defaultCategoryMeta;
}
