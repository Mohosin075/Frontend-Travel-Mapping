"use client";

import { SafeImage } from "@/components/shared/safe-image";
import { NoImage } from "@/lib/others/others";
import { TPlace } from "@/lib/types/place/place";
import { getUsableMediaUrl, getLocalized } from "@/lib/utils";
import { MapPin, Star, Lock, Check } from "lucide-react";
import Link from "next/link";
import { appAlert } from "@/lib/app-alert";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export function PlaceCard({ data, priority = false }: { data: TPlace; priority?: boolean }) {
  const coverImage = getUsableMediaUrl(data?.media);
  const { t, language } = useLanguage();
  const isVisited = Boolean((data as any)?.isVisited);

  const handleClick = (e: React.MouseEvent) => {
    if (data?.isLocked) {
      e.preventDefault();
      const mapId = data?.map 
        ? (typeof data.map === 'object' ? (data.map._id || data.map.id) : data.map)
        : null;
      
      appAlert.fire({
        title: t("map.unlock_full_map"),
        text: t("place.locked_alert_desc"),
        icon: "info",
        showCancelButton: true,
        confirmButtonText: t("map.buy_map"),
        cancelButtonText: t("common.cancel"),
      }).then((result) => {
        if (result.isConfirmed) {
          if (mapId) {
            window.location.href = `/catalog/${mapId}`;
          } else {
            window.location.href = "/catalog";
          }
        }
      });
    }
  };

  return (
    <Link href={`/places/${data?._id || data?.id}`} onClick={handleClick} className="group block">
      <div
        className={`rounded-2xl overflow-hidden bg-white dark:bg-[#131b2e]/90 transition-all duration-300 backdrop-blur-md ${
          isVisited
            ? "border-2 border-[#FFC107] ring-1 ring-[#FFC107]/40 shadow-md shadow-amber-500/10 hover:border-[#FFC107] hover:shadow-xl"
            : "border border-gray-100 dark:border-slate-800/80 hover:dark:border-amber-400/40 hover:shadow-2xl dark:shadow-xl"
        }`}
      >
        {/* Image Section */}
        <div className="relative h-36 sm:h-48 md:h-64 w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
          {coverImage ? (
            <div
              className={`w-full h-full relative transition-all duration-500 overflow-hidden ${
                data?.isLocked
                  ? "select-none pointer-events-none"
                  : "group-hover:scale-105"
              }`}
              style={
                data?.isLocked
                  ? {
                      filter: "blur(16px)",
                      WebkitFilter: "blur(16px)",
                      transform: "scale(1.15)",
                    }
                  : undefined
              }
            >
              <SafeImage
                src={coverImage}
                alt={data?.isLocked ? t("map.premium_location", "Premium Location") : getLocalized(data?.name, language)}
                fill
                priority={priority}
              />
            </div>
          ) : (
            <NoImage />
          )}

          {/* Locked Subtle Ambient Shade */}
          {data?.isLocked && (
            <div className="absolute inset-0 bg-black/10 pointer-events-none" />
          )}

          {/* Rating Badge */}
          <div className="absolute top-3 right-3 bg-white/95 dark:bg-[#0b0f19]/90 text-gray-900 dark:text-slate-100 border border-gray-100/50 dark:border-slate-800/80 px-2.5 py-1 rounded-full flex items-center gap-1.5 text-xs font-bold shadow-md backdrop-blur-md">
            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
            {data?.isLocked ? "—" : parseFloat(data?.rating?.toFixed(1))}
          </div>

          {/* Visited Badge */}
          {isVisited && (
            <div className={`absolute ${data?.isLocked ? "bottom-3 left-3" : "top-3 left-3"} bg-[#FFC107] text-gray-950 px-2.5 py-1 rounded-full flex items-center gap-1 text-[11px] font-black shadow-md border border-amber-300/80 z-10`}>
              <Check className="w-3 h-3 stroke-[3]" />
              <span>{t("common.visited") || "Visited"}</span>
            </div>
          )}

          {/* Lock Badge on top of image */}
          {data?.isLocked && (
            <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md text-white border border-white/20 px-2 sm:px-2.5 py-1 rounded-full flex items-center gap-1.5 text-[11px] sm:text-xs font-bold shadow-lg max-w-[calc(100%-65px)]">
              <Lock className="w-3.5 h-3.5 text-[#fabf13] shrink-0" />
              <span className="truncate">{t("map.unlock_full_map")}</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3 md:p-4 font-inter">
          <h3 className="font-bold text-sm md:text-lg text-gray-900 dark:text-slate-100 group-hover:text-[#fabf13] transition-colors line-clamp-2">
            {data?.isLocked ? (
              <span className="flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-[#fabf13] shrink-0" />
                <span>{t("map.premium_location", "Premium Location")}</span>
              </span>
            ) : (
              getLocalized(data?.name, language)
            )}
          </h3>

          <div className="flex items-start text-gray-500 dark:text-slate-400 text-xs md:text-sm mt-1.5 gap-1.5">
            <MapPin size={14} className="shrink-0 mt-0.5 text-amber-500" />
            <span className="line-clamp-2">
              {data?.isLocked
                ? (typeof data?.map === "object" ? getLocalized(data?.map?.name, language) : "") || (data as any)?.country || getLocalized(data?.address, language)
                : getLocalized(data?.address, language)}
            </span>
          </div>

          <p className="text-gray-400 dark:text-slate-500 text-xs md:text-sm mt-1.5 line-clamp-1">
            {data?.isLocked ? (
              <span className="font-semibold text-amber-500/90 dark:text-[#fabf13]">
                {getLocalized(data?.category?.name, language)}
              </span>
            ) : (
              `${data?.totalReview} ${t("place.reviews")} • ${getLocalized(data?.category?.name, language)}`
            )}
          </p>
        </div>
      </div>
    </Link>
  );
}
