"use client";

import { FavouriteButton } from "@/components/shared/favourite-button";
import { Button } from "@/components/ui/button";
import { getImageUrl, getLocalized } from "@/lib/utils";
import { useGetMapsQuery } from "@/redux/features/map/mapApi";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppSelector } from "@/redux/hook";
import { MapLocation } from "@/lib/types/place/map";
import { Suspense } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

function FeaturedMapsInner() {
  const { language } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const redeemFreeMap = accessToken
    ? searchParams.get("redeemFreeMap") === "1"
    : false;
  const mapHref = (mapId: string) =>
    redeemFreeMap ? `/catalog/${mapId}?redeemFreeMap=1` : `/catalog/${mapId}`;

  const { data: mapsRes, isLoading } = useGetMapsQuery({});
  const maps: MapLocation[] = mapsRes?.data || [];

  const featuredMaps = maps.filter((map) => map.isActive);

  return (
    <div className="bg-gray-50 dark:bg-[#0b0f19] pt-4 pb-12 sm:pt-6 sm:pb-14 md:py-10 font-inter min-h-screen transition-colors">
      <div className="mx-auto px-4 md:px-6" style={{ maxWidth: "1300px" }}>
        <div>
          <div className="flex justify-between items-center mb-3 sm:mb-4 md:mb-5">
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight leading-tight text-gray-900 dark:text-slate-100">
                {language === "es" ? "Mapas Destacados" : "Featured Maps"}
              </h2>
              <p className="text-sm sm:text-base text-gray-500/80 dark:text-slate-400 mt-1">
                {language === "es"
                  ? "Explora los mejores recorridos guiados por profesionales."
                  : "Explore the best walking tours curated by professionals."}
              </p>
            </div>
          </div>

          <div
            className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-7 mt-4 sm:mt-6 md:mt-8"
          >
            {isLoading ? (
              [1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-96 bg-gray-200 dark:bg-slate-800 animate-pulse rounded-2xl"
                />
              ))
            ) : featuredMaps.length === 0 ? (
              <p className="col-span-full text-center text-gray-500 dark:text-slate-400 py-10">
                {language === "es" ? "No se encontraron mapas destacados." : "No featured maps found."}
              </p>
            ) : (
              featuredMaps.map((map) => {
                return (
                  <motion.div
                    key={map._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    onClick={() => router.push(mapHref(map._id))}
                    className="h-full bg-white dark:bg-[#131b2e]/90 backdrop-blur-md rounded-xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-none border border-gray-100 dark:border-slate-800/80 hover:dark:border-amber-400/40 transition-colors flex flex-col justify-between cursor-pointer pb-2"
                  >
                    {/* Image Container */}
                    <div className="relative aspect-square mb-2 overflow-hidden shrink-0">
                      <Image
                        src={getImageUrl(map.images?.[0])}
                        alt={map.name}
                        unoptimized
                        width={500}
                        height={500}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />

                      <div className="absolute top-2 right-2">
                        <FavouriteButton
                          placeId={map._id}
                          type="Map"
                          Style="w-8 h-8 p-0 bg-white/90 dark:bg-[#0b0f19]/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm transition-transform hover:scale-110 border border-transparent dark:border-slate-700"
                        />
                      </div>
                    </div>

                    {/* Card Details */}
                    <div className="p-2 sm:p-3 flex flex-col flex-1 justify-between">
                      <div>
                        <h3 className="text-sm sm:text-base md:text-lg font-bold text-[#1A1A1A] dark:text-slate-100 leading-tight mb-1 line-clamp-2 min-h-[2.5rem] sm:min-h-[2.75rem]">
                          {getLocalized(map.name, language)}
                        </h3>
                        <p className="text-xs sm:text-sm text-[#9E9E9E] dark:text-slate-400 mb-2 line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem]">
                          {getLocalized(map.description, language) ||
                            (language === "es"
                              ? "Explora lo mejor de la ciudad con esta guía seleccionada."
                              : "Explore the best of the city with this curated guide.")}
                        </p>
                      </div>
                      <div className="mt-auto">
                        <span className="text-base sm:text-lg md:text-xl font-bold text-[#1A1A1A] dark:text-slate-100 block mb-2">
                          ${map.price || "0.00"}
                        </span>
                        <Link href={mapHref(map._id)} onClick={(e) => e.stopPropagation()}>
                          <Button className="w-full text-black py-2.5 md:py-4 text-xs md:text-base bg-primary hover:bg-[#fabf13]/90 font-bold rounded-lg transition-colors shadow-sm cursor-pointer border-none">
                            {redeemFreeMap
                              ? (language === "es" ? "Reclamar este mapa" : "Claim this map")
                              : (language === "es" ? "Ver detalles" : "View details")}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FeaturedMaps() {
  return (
    <Suspense
      fallback={
        <div className="bg-gray-50 dark:bg-[#0b0f19] py-20 flex justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" />
        </div>
      }
    >
      <FeaturedMapsInner />
    </Suspense>
  );
}

