"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface UnlockedAwardProps {
  title: string;
  description?: string;
  image: any;
  children?: React.ReactNode;
  onClick?: () => void;
}

export function UnlockedAwardCard({
  title,
  description,
  image,
  children,
  onClick,
}: UnlockedAwardProps) {
  const { t, language } = useLanguage();

  return (
    <Card
      onClick={onClick}
      className="w-full overflow-hidden rounded-2xl border-2 border-[#fabf13] shadow-md shadow-amber-500/10 hover:shadow-xl transition-all duration-300 py-0 flex flex-col justify-between h-full bg-white dark:bg-[#131b2e] group cursor-pointer"
    >
      {/* Image */}
      <div className="relative h-36 sm:h-44 md:h-48 overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-900">
        <img
          src={typeof image === "string" ? image : image?.src}
          alt={title}
          className="object-cover w-full h-full group-hover:scale-105 transition-all duration-300"
        />

        {/* Check icon */}
        <div className="absolute top-2.5 right-2.5 bg-[#fabf13] text-black p-1.5 rounded-full shadow-lg">
          <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black stroke-[3]" />
        </div>
      </div>

      {/* Footer */}
      <div className="p-3.5 sm:p-4 md:p-5 flex-1 flex flex-col justify-between font-public-sans gap-2">
        <div>
          <h3 className="font-extrabold text-xs sm:text-sm md:text-base text-slate-900 dark:text-slate-100 leading-snug group-hover:text-amber-600 dark:group-hover:text-[#fabf13] transition-colors line-clamp-2">
            {title}
          </h3>
        </div>

        <div className="pt-1.5 mt-auto space-y-2">
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] sm:text-[11px] text-amber-600 dark:text-[#fabf13] font-extrabold tracking-wider">
              <span>{(t("awards.unlocked") || (language === "es" ? "DESBLOQUEADO" : "UNLOCKED")).toUpperCase()}</span>
              <span>100%</span>
            </div>

            <div className="w-full h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full w-full bg-[#fabf13] rounded-full" />
            </div>
          </div>

          {children ? (
            <div className="space-y-1.5 pt-1">
              {children}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick?.();
                }}
                className="w-full text-center text-[10px] sm:text-[11px] font-bold text-amber-600 dark:text-[#fabf13] hover:text-amber-700 dark:hover:text-yellow-300 hover:underline cursor-pointer py-0.5"
              >
                {t("awards.view_details") || (language === "es" ? "Ver más detalles" : "View more details")}
              </button>
            </div>
          ) : (
            <div className="pt-1.5">
              <Button
                type="button"
                onClick={onClick}
                className="w-full bg-[#fabf13] hover:bg-[#e0ac10] text-black font-extrabold text-[11px] sm:text-xs uppercase tracking-wider h-10 sm:h-11 rounded-xl border-none shadow-sm shadow-amber-500/20 cursor-pointer"
              >
                {t("awards.view_details") || (language === "es" ? "Ver más detalles" : "View more details")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
