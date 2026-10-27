import { ImageOff } from "lucide-react";

export const NoImage = () => {
  return (
    <div className="w-full h-full min-h-[200px] bg-gradient-to-br from-gray-100 via-gray-200/60 to-gray-100 dark:from-slate-900 dark:via-[#131b2e] dark:to-slate-900 flex flex-col items-center justify-center gap-2.5 p-4 text-center select-none">
      <div className="w-12 h-12 rounded-2xl bg-white/70 dark:bg-slate-800/80 shadow-xs flex items-center justify-center text-gray-400 dark:text-slate-500 border border-black/5 dark:border-white/5">
        <ImageOff size={22} />
      </div>
      <span className="text-gray-400 dark:text-slate-500 text-xs font-bold tracking-wider uppercase">
        No image available
      </span>
    </div>
  );
};
