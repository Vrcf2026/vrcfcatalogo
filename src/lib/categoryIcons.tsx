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

// ────────────────────────────────────────────────────────────────────────
// Mapa de categorias → ícone + cor, cobrindo os 3 mundos do catálogo:
//
//  • Escritório (Diginova — equipamento recondicionado): Portáteis,
//    Desktops, Tudo-em-Um, Servidores, Monitores, Apple, Impressoras,
//    Tablets, TPV, Informática Premium, Outros.
//  • Segurança (Visiotech): Acessórios IT e Segurança, CCTV IP/Analógico,
//    Networking, Controlo de Presença/Acessos, Intrusão, Videoporteiros,
//    Energia, Smart Home, Audiovisuais, Smartphone e Escritório,
//    Sonorização e Áudio, Mobilidade, Merchandising, Analítica de Vídeo,
//    Outlet, Incêndio e Evacuação, Promoções, Robótica, Outdoor.
//  • Economato (ALL.TO): Impressão, Papelaria, Alimentar, Manutenção,
//    Limpeza, Informática, Higiene e Beleza, Mobiliário, Embalagem,
//    Eletrónica, Café e Chá.
// ────────────────────────────────────────────────────────────────────────
export const categoryMetaMap: Record<string, CategoryMeta> = {
  // ── Escritório / Diginova ──
  "Portáteis":              { icon: Laptop,          color: "text-indigo-500",  bg: "bg-indigo-50 dark:bg-indigo-950/30" },
  "Desktops":               { icon: Monitor,         color: "text-blue-500",    bg: "bg-blue-50 dark:bg-blue-950/30" },
  "Tudo-em-Um":             { icon: Monitor,         color: "text-sky-500",     bg: "bg-sky-50 dark:bg-sky-950/30" },
  "Servidores":             { icon: Server,          color: "text-purple-500",  bg: "bg-purple-50 dark:bg-purple-950/30" },
  "Monitores":              { icon: Monitor,         color: "text-cyan-500",    bg: "bg-cyan-50 dark:bg-cyan-950/30" },
  "Apple":                  { icon: Apple,           color: "text-zinc-600",    bg: "bg-zinc-100 dark:bg-zinc-900/40" },
  "Impressoras":            { icon: Printer,         color: "text-orange-500",  bg: "bg-orange-50 dark:bg-orange-950/30" },
  "Tablets":                { icon: Tablet,          color: "text-violet-500",  bg: "bg-violet-50 dark:bg-violet-950/30" },
  "TPV":                    { icon: Receipt,         color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  "Informática Premium":    { icon: Cpu,             color: "text-rose-500",    bg: "bg-rose-50 dark:bg-rose-950/30" },
  "Outros":                 { icon: Package,         color: "text-slate-500",   bg: "bg-slate-100 dark:bg-slate-950/30" },

  // ── Segurança / Visiotech ──
  "Acessórios IT e Segurança": { icon: Cable,         color: "text-zinc-500",    bg: "bg-zinc-100 dark:bg-zinc-950/30" },
  "CCTV IP":                { icon: Camera,          color: "text-blue-600",    bg: "bg-blue-50 dark:bg-blue-950/30" },
  "CCTV Analógico":         { icon: Camera,          color: "text-blue-400",    bg: "bg-blue-50 dark:bg-blue-950/30" },
  "Networking":             { icon: Network,         color: "text-green-500",   bg: "bg-green-50 dark:bg-green-950/30" },
  "Controlo de Presença/Acessos": { icon: KeyRound,   color: "text-red-500",     bg: "bg-red-50 dark:bg-red-950/30" },
  "Intrusão":               { icon: Bell,            color: "text-amber-500",   bg: "bg-amber-50 dark:bg-amber-950/30" },
  "Videoporteiros":         { icon: DoorOpen,        color: "text-teal-500",    bg: "bg-teal-50 dark:bg-teal-950/30" },
  "Energia":                { icon: Battery,         color: "text-lime-600",    bg: "bg-lime-50 dark:bg-lime-950/30" },
  "Smart Home":             { icon: Wifi,            color: "text-sky-500",     bg: "bg-sky-50 dark:bg-sky-950/30" },
  "Audiovisuais":           { icon: Headphones,      color: "text-pink-500",    bg: "bg-pink-50 dark:bg-pink-950/30" },
  "Smartphone e Escritório": { icon: Phone,          color: "text-cyan-500",    bg: "bg-cyan-50 dark:bg-cyan-950/30" },
  "Sonorização e Áudio":    { icon: Headphones,      color: "text-fuchsia-500", bg: "bg-fuchsia-50 dark:bg-fuchsia-950/30" },
  "Mobilidade":             { icon: Truck,           color: "text-orange-600",  bg: "bg-orange-50 dark:bg-orange-950/30" },
  "Merchandising":          { icon: ShoppingCart,    color: "text-violet-400",  bg: "bg-violet-50 dark:bg-violet-950/30" },
  "Analítica de Vídeo":     { icon: Eye,             color: "text-indigo-400",  bg: "bg-indigo-50 dark:bg-indigo-950/30" },
  "Outlet":                 { icon: Box,             color: "text-yellow-600",  bg: "bg-yellow-50 dark:bg-yellow-950/30" },
  "Incêndio e Evacuação":   { icon: Flame,           color: "text-red-600",     bg: "bg-red-50 dark:bg-red-950/30" },
  "Promoções":              { icon: Sparkles,        color: "text-amber-400",   bg: "bg-amber-50 dark:bg-amber-950/30" },
  "Robótica":               { icon: Bot,             color: "text-purple-400",  bg: "bg-purple-50 dark:bg-purple-950/30" },
  "Outdoor":                { icon: Sun,             color: "text-amber-600",   bg: "bg-amber-50 dark:bg-amber-950/30" },

  // ── Economato / ALL.TO ──
  "Impressão":              { icon: Printer,         color: "text-orange-500",  bg: "bg-orange-50 dark:bg-orange-950/30" },
  "Papelaria":              { icon: FileText,        color: "text-blue-500",    bg: "bg-blue-50 dark:bg-blue-950/30" },
  "Alimentar":              { icon: UtensilsCrossed, color: "text-green-600",   bg: "bg-green-50 dark:bg-green-950/30" },
  "Manutenção":             { icon: Wrench,          color: "text-slate-600",   bg: "bg-slate-100 dark:bg-slate-950/30" },
  "Limpeza":                { icon: Sparkles,        color: "text-sky-500",     bg: "bg-sky-50 dark:bg-sky-950/30" },
  "Informática":            { icon: Chip,            color: "text-indigo-500",  bg: "bg-indigo-50 dark:bg-indigo-950/30" },
  "Higiene e Beleza":       { icon: Sparkles,        color: "text-pink-500",    bg: "bg-pink-50 dark:bg-pink-950/30" },
  "Mobiliário":             { icon: Sofa,            color: "text-amber-700",   bg: "bg-amber-50 dark:bg-amber-950/30" },
  "Embalagem":              { icon: Box,             color: "text-yellow-700",  bg: "bg-yellow-50 dark:bg-yellow-950/30" },
  "Eletrónica":             { icon: Cpu,             color: "text-violet-500",  bg: "bg-violet-50 dark:bg-violet-950/30" },
  "Café e Chá":             { icon: Coffee,          color: "text-amber-800",   bg: "bg-amber-50 dark:bg-amber-950/30" },

  // ── Outras categorias antigas/transversais (mantidas para compatibilidade) ──
  "Videovigilância":        { icon: Camera,          color: "text-blue-500",    bg: "bg-blue-50 dark:bg-blue-950/30" },
  "Controlo de Acessos":    { icon: Lock,            color: "text-red-500",     bg: "bg-red-50 dark:bg-red-950/30" },
  "Alarmes":                { icon: Bell,            color: "text-amber-500",   bg: "bg-amber-50 dark:bg-amber-950/30" },
  "Redes":                  { icon: Network,         color: "text-green-500",   bg: "bg-green-50 dark:bg-green-950/30" },
  "Wireless":               { icon: Wifi,            color: "text-sky-500",     bg: "bg-sky-50 dark:bg-sky-950/30" },
  "Computadores":           { icon: Monitor,         color: "text-indigo-500",  bg: "bg-indigo-50 dark:bg-indigo-950/30" },
  "Periféricos":            { icon: Mouse,           color: "text-teal-500",    bg: "bg-teal-50 dark:bg-teal-950/30" },
  "Armazenamento":          { icon: HardDrive,       color: "text-yellow-600",  bg: "bg-yellow-50 dark:bg-yellow-950/30" },
  "Processadores":          { icon: Cpu,             color: "text-rose-500",    bg: "bg-rose-50 dark:bg-rose-950/30" },
  "Telecomunicações":       { icon: Phone,           color: "text-cyan-500",    bg: "bg-cyan-50 dark:bg-cyan-950/30" },
  "Áudio e Vídeo":          { icon: Headphones,      color: "text-pink-500",    bg: "bg-pink-50 dark:bg-pink-950/30" },
  "Energia e UPS":          { icon: Battery,         color: "text-lime-600",    bg: "bg-lime-50 dark:bg-lime-950/30" },
  "Cabos e Conectores":     { icon: Cable,           color: "text-zinc-500",    bg: "bg-zinc-100 dark:bg-zinc-950/30" },
  "Software":               { icon: Settings,        color: "text-slate-500",   bg: "bg-slate-100 dark:bg-slate-950/30" },
  "Segurança Electrónica":  { icon: Shield,          color: "text-red-600",     bg: "bg-red-50 dark:bg-red-950/30" },
  "Transmissores":          { icon: Radio,           color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  "Energia Solar":          { icon: Zap,             color: "text-amber-600",   bg: "bg-amber-50 dark:bg-amber-950/30" },
};

export const defaultCategoryMeta: CategoryMeta = {
  icon: Package,
  color: "text-muted-foreground",
  bg: "bg-muted"
};

export function getCategoryMeta(name: string): CategoryMeta {
  return categoryMetaMap[name] ?? defaultCategoryMeta;
}
