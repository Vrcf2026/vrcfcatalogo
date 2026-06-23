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
      className={`shrink-0 w-[80px] sm:w-[90px] h-[80px] sm:h-[90px] rounded-2xl border transition-all flex flex-col items-center justify-center gap-1.5 p-2 ${
        active
          ? "border-primary ring-2 ring-primary/30 bg-primary/5"
          : "border-border hover:border-primary/40 bg-card"
      }`}
    >
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${bg}`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <span className="text-[10px] sm:text-[11px] font-semibold text-foreground text-center leading-tight line-clamp-2">
        {label}
      </span>
    </button>
  );
}

export default CategoryTile;
