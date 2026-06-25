interface CategoryTileProps {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  color: string;
  bg: string;
  label: string;
}

export function CategoryTile({ active, onClick, icon: Icon, color, bg, label }: CategoryTileProps) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 w-[88px] sm:w-[100px] h-[88px] sm:h-[100px] rounded-2xl border transition-all flex flex-col items-center justify-center gap-2 p-2 ${
        active
          ? "border-primary ring-2 ring-primary/30 bg-primary/5"
          : "border-border hover:border-primary/40 bg-card"
      }`}
    >
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${bg}`}>
        <Icon className={`h-6 w-6 ${color}`} />
      </div>
      <span className="text-[10px] sm:text-[11px] font-semibold text-foreground text-center leading-tight line-clamp-2">
        {label}
      </span>
    </button>
  );
}

export default CategoryTile;
