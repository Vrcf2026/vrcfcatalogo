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

// Fundos sólidos + ícone branco — abordagem PC Componentes/Mauser
// Cor do mundo como base, variações de shade por categoria
const W = {
  orange: { color: "text-white", bg: "bg-orange-500" },
  orangeD:{ color: "text-white", bg: "bg-orange-600" },
  blue:   { color: "text-white", bg: "bg-blue-500"   },
  blueD:  { color: "text-white", bg: "bg-blue-600"   },
  green:  { color: "text-white", bg: "bg-green-600"  },
  greenD: { color: "text-white", bg: "bg-green-700"  },
  slate:  { color: "text-white", bg: "bg-slate-500"  },
};

export const categoryMetaMap: Record<string, CategoryMeta> = {
  // ── Escritório / Diginova — azul ──
  "Portáteis":              { icon: Laptop,          ...W.blue   },
  "Desktops":               { icon: Monitor,         ...W.blueD  },
  "Tudo-em-Um":             { icon: Monitor,         ...W.blue   },
  "Servidores":             { icon: Server,          ...W.blueD  },
  "Monitores":              { icon: Monitor,         ...W.blue   },
  "Apple":                  { icon: Apple,           ...W.slate  },
  "Impressoras":            { icon: Printer,         ...W.blue   },
  "Tablets":                { icon: Tablet,          ...W.blueD  },
  "TPV":                    { icon: Receipt,         ...W.blue   },
  "Informática Premium":    { icon: Cpu,             ...W.blueD  },
  "Outros":                 { icon: Package,         ...W.slate  },

  // ── Segurança / Visiotech — laranja ──
  "Acessórios IT e Segurança": { icon: Cable,        ...W.orange },
  "CCTV IP":                { icon: Camera,          ...W.orangeD},
  "CCTV Analógico":         { icon: Camera,          ...W.orange },
  "Networking":             { icon: Network,         ...W.orangeD},
  "Controlo de Presença/Acessos": { icon: KeyRound,  ...W.orange },
  "Intrusão":               { icon: Bell,            ...W.orangeD},
  "Videoporteiros":         { icon: DoorOpen,        ...W.orange },
  "Energia":                { icon: Battery,         ...W.orangeD},
  "Smart Home":             { icon: Wifi,            ...W.orange },
  "Audiovisuais":           { icon: Headphones,      ...W.orangeD},
  "Smartphone e Escritório": { icon: Phone,          ...W.orange },
  "Sonorização e Áudio":    { icon: Headphones,      ...W.orangeD},
  "Mobilidade":             { icon: Truck,           ...W.orange },
  "Merchandising":          { icon: ShoppingCart,    ...W.orangeD},
  "Analítica de Vídeo":     { icon: Eye,             ...W.orange },
  "Outlet":                 { icon: Box,             ...W.slate  },
  "Incêndio e Evacuação":   { icon: Flame,           ...W.orangeD},
  "Promoções":              { icon: Sparkles,        ...W.orange },
  "Robótica":               { icon: Bot,             ...W.orangeD},
  "Outdoor":                { icon: Sun,             ...W.orange },

  // ── Economato / ALL.TO — verde ──
  "Impressão":              { icon: Printer,         ...W.green  },
  "Papelaria":              { icon: FileText,        ...W.greenD },
  "Alimentar":              { icon: UtensilsCrossed, ...W.green  },
  "Manutenção":             { icon: Wrench,          ...W.slate  },
  "Limpeza":                { icon: Sparkles,        ...W.green  },
  "Informática":            { icon: Chip,            ...W.greenD },
  "Higiene e Beleza":       { icon: Sparkles,        ...W.green  },
  "Mobiliário":             { icon: Sofa,            ...W.greenD },
  "Embalagem":              { icon: Box,             ...W.green  },
  "Eletrónica":             { icon: Cpu,             ...W.greenD },
  "Café e Chá":             { icon: Coffee,          ...W.green  },

  // ── Transversais ──
  "Videovigilância":        { icon: Camera,          ...W.orangeD},
  "Controlo de Acessos":    { icon: Lock,            ...W.orange },
  "Alarmes":                { icon: Bell,            ...W.orangeD},
  "Redes":                  { icon: Network,         ...W.orange },
  "Wireless":               { icon: Wifi,            ...W.blue   },
  "Computadores":           { icon: Monitor,         ...W.blue   },
  "Periféricos":            { icon: Mouse,           ...W.blueD  },
  "Armazenamento":          { icon: HardDrive,       ...W.blue   },
  "Processadores":          { icon: Cpu,             ...W.blueD  },
  "Telecomunicações":       { icon: Phone,           ...W.blue   },
  "Áudio e Vídeo":          { icon: Headphones,      ...W.blueD  },
  "Energia e UPS":          { icon: Battery,         ...W.orange },
  "Cabos e Conectores":     { icon: Cable,           ...W.slate  },
  "Software":               { icon: Settings,        ...W.blue   },
  "Segurança Electrónica":  { icon: Shield,          ...W.orangeD},
  "Transmissores":          { icon: Radio,           ...W.orange },
  "Energia Solar":          { icon: Zap,             ...W.orangeD},
};

export const defaultCategoryMeta: CategoryMeta = {
  icon: Package,
  color: "text-white",
  bg: "bg-slate-400"
};

export function getCategoryMeta(name: string): CategoryMeta {
  return categoryMetaMap[name] ?? defaultCategoryMeta;
}
