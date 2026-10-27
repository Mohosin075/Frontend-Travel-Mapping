type InfoProps = {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
  empty?: boolean;
};

export default function InfoCard({
  icon,
  label,
  value,
  highlight,
  empty,
}: InfoProps) {
  return (
    <div className="border border-gray-200/80 dark:border-slate-800 rounded-xl p-2 sm:p-2.5 md:p-3 bg-white dark:bg-[#131b2e] shadow-xs min-w-0 overflow-hidden">
      <div className="flex flex-nowrap items-center gap-1.5 text-orange-500 mb-1">
        <span className="shrink-0">{icon}</span>
        <p className="min-w-0 text-[10px] sm:text-[11px] md:text-xs text-muted-foreground font-bold font-public-sans tracking-wide leading-none uppercase truncate">
          {label}
        </p>
      </div>

      <div
        className={`font-public-sans mt-0.5 text-xs sm:text-sm leading-snug break-words ${
          empty
            ? "text-gray-400 dark:text-slate-500 font-medium italic"
            : highlight
              ? "text-orange-500 font-bold"
              : "text-gray-900 dark:text-slate-100 font-bold"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
