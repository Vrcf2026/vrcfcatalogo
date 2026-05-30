import { Shield, Wifi, Camera, Lock, Bell, Server, Monitor, Printer, Mouse, HardDrive, Cpu, Network, Radio, Zap, Package, Headphones, Phone, Tablet, Battery, Cable, Settings } from "lucide-react";

export interface CategoryMeta {
  icon: React.ElementType;
  color: string;
  bg: string;
}

export const categoryMetaMap: Record<string, CategoryMeta> = {
  "Videovigilância":        { icon: Camera,     color: "text-blue-500",    bg: "bg-blue-50 dark:bg-blue-950/30" },
  "Controlo de Acessos":    { icon: Lock,        color: "text-red-500",     bg: "bg-red-50 dark:bg-red-950/30" },
  "Alarmes":                { icon: Bell,        color: "text-amber-500",   bg: "bg-amber-50 dark:bg-amber-950/30" },
  "Redes":                  { icon: Network,     color: "text-green-500",   bg: "bg-green-50 dark:bg-green-950/30" },
  "Wireless":               { icon: Wifi,        color: "text-sky-500",     bg: "bg-sky-50 dark:bg-sky-950/30" },
  "Servidores":             { icon: Server,      color: "text-purple-500",  bg: "bg-purple-50 dark:bg-purple-950/30" },
  "Computadores":           { icon: Monitor,     color: "text-indigo-500",  bg: "bg-indigo-50 dark:bg-indigo-950/30" },
  "Impressoras":            { icon: Printer,     color: "text-orange-500",  bg: "bg-orange-50 dark:bg-orange-950/30" },
  "Periféricos":            { icon: Mouse,       color: "text-teal-500",    bg: "bg-teal-50 dark:bg-teal-950/30" },
  "Armazenamento":          { icon: HardDrive,   color: "text-yellow-600",  bg: "bg-yellow-50 dark:bg-yellow-950/30" },
  "Processadores":          { icon: Cpu,         color: "text-rose-500",    bg: "bg-rose-50 dark:bg-rose-950/30" },
  "Telecomunicações":       { icon: Phone,       color: "text-cyan-500",    bg: "bg-cyan-50 dark:bg-cyan-950/30" },
  "Tablets":                { icon: Tablet,      color: "text-violet-500",  bg: "bg-violet-50 dark:bg-violet-950/30" },
  "Áudio e Vídeo":          { icon: Headphones,  color: "text-pink-500",    bg: "bg-pink-50 dark:bg-pink-950/30" },
  "Energia e UPS":          { icon: Battery,     color: "text-lime-600",    bg: "bg-lime-50 dark:bg-lime-950/30" },
  "Cabos e Conectores":     { icon: Cable,       color: "text-zinc-500",    bg: "bg-zinc-100 dark:bg-zinc-950/30" },
  "Software":               { icon: Settings,    color: "text-slate-500",   bg: "bg-slate-100 dark:bg-slate-950/30" },
  "Segurança Electrónica":  { icon: Shield,      color: "text-red-600",     bg: "bg-red-50 dark:bg-red-950/30" },
  "Transmissores":          { icon: Radio,       color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  "Energia Solar":          { icon: Zap,         color: "text-amber-600",   bg: "bg-amber-50 dark:bg-amber-950/30" },
};

export const defaultCategoryMeta: CategoryMeta = {
  icon: Package,
  color: "text-muted-foreground",
  bg: "bg-muted"
};

export function getCategoryMeta(name: string): CategoryMeta {
  return categoryMetaMap[name] ?? defaultCategoryMeta;
}
