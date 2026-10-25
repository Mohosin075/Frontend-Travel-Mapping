"use client";

import { useState } from "react";
import { CategoryIcon } from "@/components/shared/categories/category-icon";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ChevronDown, SlidersHorizontal, Lock } from "lucide-react";
import { normalizePinType } from "@/lib/record-visit";
import { getUsableMediaUrl, getLocalized } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/LanguageContext";

/** Avoid mounting hundreds of sidebar rows per category on purchased maps */
const SIDEBAR_PLACES_CAP = 40;

const getSafeString = (val: any, lang: string = "es"): string => {
  return getLocalized(val, lang);
};

interface MapFiltersProps {
  isMobile: boolean;
  fetchedCategories: any[];
  enabledCategories: Record<string, boolean>;
  fetchedPlaces: any[];
  handleToggle: (id: string, value: boolean) => void;
  setSelectedLocation: (loc: any) => void;
  selectedLocation: any;
  selectedCountry: string;
  setSelectedCountry: (val: string) => void;
  setIsManualSelection: (val: boolean) => void;
  availableCountries: string[];
  availableMaps?: any[];
  isLoggedIn?: boolean;
  isMapPurchased?: boolean;
  isLoading?: boolean;
  hideDesktopMapFilter?: boolean;
}

export function MapFilters({
  isMobile,
  fetchedCategories,
  enabledCategories,
  fetchedPlaces,
  handleToggle,
  setSelectedLocation,
  selectedLocation,
  selectedCountry,
  setSelectedCountry,
  setIsManualSelection,
  availableCountries,
  availableMaps,
  isLoggedIn = true,
  isMapPurchased = true,
  isLoading = false,
  hideDesktopMapFilter = false,
}: MapFiltersProps) {
  const { t, language } = useLanguage();
  const hasCategories = fetchedCategories.length > 0;
  const showEmpty = !isLoading && fetchedCategories.length === 0;
  const mapLabel = getSafeString(selectedCountry, language) || "this map";
  const [mobileOpen, setMobileOpen] = useState(false);

  const panelWidth = isMobile ? "min(92vw, 320px)" : "350px";
  const listHeight = isMobile
    ? hasCategories
      ? "42vh"
      : "auto"
    : hasCategories
      ? "80vh"
      : "auto";

  return (
    <div className="flex flex-col md:flex-row items-start gap-2 w-full md:w-auto relative">
      {isMobile && (
        <div className="flex items-center gap-2 max-w-full">
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="flex-1 max-w-[145px] min-w-0 flex items-center justify-between gap-1 bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-gray-200 dark:border-zinc-800 px-3 py-2 text-xs font-bold text-gray-900 dark:text-zinc-100"
          >
            <span className="truncate">{t("common.categories")}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 shrink-0 transition-transform ${mobileOpen ? "rotate-180" : ""}`}
            />
          </button>

          <div className="flex-1 max-w-[155px] min-w-0 bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-gray-200 dark:border-zinc-800 overflow-hidden">
            <Select
              onValueChange={(val) => {
                setSelectedCountry(val);
                setIsManualSelection(true);
              }}
              value={selectedCountry}
            >
              <SelectTrigger className="w-full h-full border-0 py-2 px-2.5 focus:ring-0 font-bold text-gray-800 dark:text-zinc-200 bg-white dark:bg-zinc-900 shadow-none text-xs text-left truncate">
                <SelectValue placeholder={t("maps.select_map", t("filters.country"))} />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                align="end"
                className="rounded-xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 shadow-xl max-w-[min(90vw,320px)]"
              >
                {availableCountries.length === 0 ? (
                  <div className="px-3 py-6 text-center text-sm text-gray-500 dark:text-zinc-400">
                    {t("maps.no_maps_available", "No maps available.")}
                  </div>
                ) : (
                  availableCountries.map((country: any) => {
                    const countryLabel = getSafeString(country, language);
                    return (
                      <SelectItem
                        key={countryLabel}
                        value={countryLabel}
                        className="font-medium whitespace-normal break-words py-2.5"
                      >
                        {countryLabel}
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div
        className={`${
          isMobile 
            ? `absolute top-full left-0 z-50 mt-1.5 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden w-[340px] max-w-[92vw] transition-all duration-200 ease-out origin-top ${
                mobileOpen
                  ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                  : "opacity-0 scale-95 -translate-y-2 pointer-events-none invisible"
              }`
            : "bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-gray-200 dark:border-zinc-800"
        }`}
        style={!isMobile ? { width: panelWidth } : undefined}
      >
        <Accordion
          type="single"
          collapsible
          defaultValue="categories-main"
          className="w-full"
        >
          <AccordionItem value="categories-main" className="border-none">
            {!isMobile && (
              <AccordionTrigger className="px-4 py-3 hover:no-underline bg-gray-50/50 dark:bg-zinc-800/50 flex justify-between items-center w-full">
                <span className="text-sm font-black text-gray-900 dark:text-zinc-100 uppercase tracking-tighter">
                  {t("common.categories")}
                </span>
              </AccordionTrigger>
            )}
            <AccordionContent
              className={`pb-0 scroll-smooth ${!isMobile ? "border-t border-gray-100 dark:border-zinc-800" : ""}`}
              style={{
                overflowY: "auto",
                height: listHeight,
              }}
            >
              {hasCategories ? (
                <div className="transition-opacity duration-300">
                  {isLoading && (
                    <div className="flex items-center justify-center gap-2 py-1.5 px-3 bg-amber-50/90 border-b border-amber-100 text-xs font-medium text-amber-800 transition-all duration-300">
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                      <span>{t("maps.syncing_locations", "Syncing locations...")} ({mapLabel})</span>
                    </div>
                  )}
                  <Accordion type="single" collapsible className="w-full">
                    {fetchedCategories.map((cat: any) => {
                      const enabled = enabledCategories[String(cat._id)] ?? true;
                      const placesInCat = fetchedPlaces.filter((p: any) => {
                        const pCatId =
                          typeof p.category === "object" && p.category !== null
                            ? p.category._id || p.category.id
                            : p.category;
                        return String(pCatId) === String(cat._id);
                      });

                      return (
                        <AccordionItem
                          key={cat._id}
                          value={cat._id}
                          className=""
                        >
                          <div className="flex items-center justify-between group border-b border-gray-100 dark:border-slate-800/80 last:border-b-0 hover:bg-amber-50/30 dark:hover:bg-slate-800/50 transition-colors duration-150 w-full min-w-0">
                            <AccordionTrigger className="flex-1 min-w-0 py-2.5 pl-3 pr-2 transition-colors gap-2">
                              <div className="flex items-center gap-2.5 w-full min-w-0 flex-1">
                                {(() => {
                                 const isCustomImage =
                                   cat.icon?.startsWith("http") ||
                                   cat.icon?.startsWith("data:") ||
                                   cat.icon?.includes("/") ||
                                   cat.icon?.includes(".");
                                 return (
                                   <div
                                     className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm overflow-hidden border border-gray-100 dark:border-slate-700 transition-transform group-hover:scale-105 duration-150"
                                     style={{
                                       backgroundColor: isCustomImage
                                         ? "transparent"
                                         : cat.color || "#FA7B17",
                                     }}
                                   >
                                     <CategoryIcon
                                       icon={cat.icon}
                                       size={26}
                                       color="#FFFFFF"
                                     />
                                   </div>
                                 );
                                })()}
                                <span
                                  title={getSafeString(cat.name, language)}
                                  className="text-left text-sm font-semibold text-gray-700 dark:text-slate-200 capitalize flex-1 min-w-0 truncate"
                                >
                                  {getSafeString(cat.name, language)}
                                </span>
                                {placesInCat.length > 0 && (
                                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 tabular-nums shrink-0 transition-opacity duration-200">
                                    {placesInCat.length}
                                  </span>
                                )}
                              </div>
                            </AccordionTrigger>
                            <div className="pr-3 pl-1 py-2 shrink-0 flex items-center justify-center">
                              <Switch
                                checked={enabled}
                                onCheckedChange={(val: boolean) =>
                                  handleToggle(String(cat._id), val)
                                }
                                className={`${enabled ? "bg-primary" : "bg-gray-300"} data-[state=checked]:bg-amber-400 data-[state=unchecked]:bg-gray-300 scale-75 shrink-0`}
                              />
                            </div>
                          </div>
                          <AccordionContent className="bg-gray-50/30 dark:bg-[#0b0f19]/60 px-0 pb-0">
                            <div className="py-1">
                              {placesInCat.length > 0 ? (
                                <>
                                   {placesInCat
                                    .slice(0, SIDEBAR_PLACES_CAP)
                                    .map((place: any) => {
                                      const isBusiness =
                                        place?.type === "business" ||
                                        place?.type === "Business" ||
                                        place?.placeType === "Business";
                                      const isLocked = Boolean(
                                        place.isLocked ||
                                          (isMapPurchased === false && !isBusiness)
                                      );

                                      return (
                                        <button
                                          key={place._id}
                                          onClick={() => {
                                            const cover = getUsableMediaUrl(place.media?.photos || place.media);
                                            if (cover && typeof window !== "undefined") {
                                              const img = new Image();
                                              img.src = cover;
                                            }
                                            setSelectedLocation({
                                              id: place._id,
                                              type: normalizePinType(place),
                                              data: {
                                                ...place,
                                                isLocked,
                                              },
                                            });
                                          }}
                                          className={`w-full flex items-center gap-2.5 px-6 py-2 text-left transition-all ${
                                            selectedLocation?.id === place._id
                                              ? "bg-amber-500 text-black font-bold shadow-md"
                                              : isLocked
                                              ? "text-gray-500 dark:text-slate-400 hover:bg-amber-50/50 dark:hover:bg-slate-800/80 hover:text-amber-600 dark:hover:text-[#fabf13]"
                                              : "text-gray-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800/80 hover:text-amber-500 dark:hover:text-[#fabf13]"
                                          }`}
                                        >
                                          {isLocked ? (
                                            <Lock
                                              className={`w-3.5 h-3.5 shrink-0 ${
                                                selectedLocation?.id === place._id
                                                  ? "text-black"
                                                  : "text-amber-500 dark:text-[#fabf13]"
                                              }`}
                                              strokeWidth={2.4}
                                            />
                                          ) : (
                                            <div
                                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                                selectedLocation?.id === place._id
                                                  ? "bg-black"
                                                  : "bg-amber-400"
                                              }`}
                                            />
                                          )}
                                          <div className="flex flex-col min-w-0 flex-1">
                                            <span className="truncate flex items-center gap-1.5">
                                              {isLocked ? (
                                                <span className="font-medium text-gray-700 dark:text-slate-300">
                                                  {t("map.premium_location", "Premium Location")}
                                                </span>
                                              ) : (
                                                getSafeString(place.name, language)
                                              )}
                                            </span>
                                          </div>
                                        </button>
                                      );
                                    })}
                                  {placesInCat.length > SIDEBAR_PLACES_CAP && (
                                    <p className="px-6 py-2 text-xs text-gray-400">
                                      +{placesInCat.length - SIDEBAR_PLACES_CAP}{" "}
                                      {t("maps.more_on_map", "more on map — zoom or pan to explore")}
                                    </p>
                                  )}
                                </>
                              ) : isLoading ? (
                                <div className="px-10 py-3 text-gray-400 flex items-center gap-2 text-xs">
                                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                                  <span>{t("maps.loading_locations", "Loading locations...")}</span>
                                </div>
                              ) : (
                                <div className="px-10 py-3 text-gray-400 italic">
                                  {t("maps.no_places_in_category", "No places in this category yet.")}
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </div>
              ) : isLoading ? (
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-3 text-xs font-medium text-amber-700">
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                    <span>{t("maps.loading_categories", "Loading categories...")}</span>
                  </div>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-3 py-1.5 animate-pulse">
                      <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
                      <div className="h-4 bg-gray-200 rounded w-3/5" />
                    </div>
                  ))}
                </div>
              ) : showEmpty ? (
                <div className="px-5 py-8 text-center min-h-[140px] flex flex-col items-center justify-center">
                  <p className="text-sm font-semibold text-gray-800 dark:text-zinc-200">
                    {t("maps.no_locations_available", "No locations available")}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-gray-500 dark:text-zinc-400">
                    {isLoggedIn
                      ? t("maps.no_published_locations", `There are no published locations for ${mapLabel} yet. Try another map or check back later.`)
                      : t("maps.no_business_locations", `No business locations are available for ${mapLabel} right now. Sign in to explore more maps, or try another map.`)}
                  </p>
                </div>
              ) : null}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Selected Map Filter — Desktop */}
      {!hideDesktopMapFilter && (
        <SelectedMapFilter
          selectedCountry={selectedCountry}
          setSelectedCountry={setSelectedCountry}
          setIsManualSelection={setIsManualSelection}
          availableCountries={availableCountries}
          isMobile={isMobile}
        />
      )}
    </div>
  );
}

export function SelectedMapFilter({
  selectedCountry,
  setSelectedCountry,
  setIsManualSelection,
  availableCountries,
  availableMaps,
  isMobile,
}: {
  selectedCountry: string;
  setSelectedCountry: (val: string) => void;
  setIsManualSelection: (val: boolean) => void;
  availableCountries: string[];
  availableMaps?: any[];
  isMobile?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div className={`min-w-[200px] max-w-[280px] w-full md:w-max bg-white dark:bg-[#131b2e] rounded-xl shadow-xl border border-gray-200 dark:border-slate-800 overflow-hidden flex-col gap-0 pointer-events-auto ${isMobile ? "hidden" : "flex"}`}>
      <div className="px-4 py-2.5 bg-gray-50/50 dark:bg-slate-800/50 border-b border-transparent dark:border-slate-800/50">
        <span className="text-sm font-black text-gray-900 dark:text-slate-100 uppercase tracking-tighter">
          {t("filters.country")}
        </span>
      </div>
      <Select
        onValueChange={(val) => {
          setSelectedCountry(val);
          setIsManualSelection(true);
        }}
        value={selectedCountry}
      >
        <SelectTrigger className="w-full !h-auto !min-h-0 rounded-none border-0 shadow-none py-2.5 px-3 focus:ring-0 font-semibold text-gray-800 dark:text-slate-200 bg-white dark:bg-[#131b2e] whitespace-normal *:data-[slot=select-value]:line-clamp-none *:data-[slot=select-value]:whitespace-normal *:data-[slot=select-value]:text-left">
          <SelectValue placeholder={t("maps.select_map", "Select map")} />
        </SelectTrigger>
        <SelectContent
          position="popper"
          side="bottom"
          align="start"
          sideOffset={4}
          avoidCollisions={false}
          className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-[#131b2e]/95 backdrop-blur-xl text-gray-900 dark:text-slate-100 shadow-2xl min-w-[var(--radix-select-trigger-width)] max-w-[min(90vw,320px)]"
        >
          {availableCountries.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-gray-500 dark:text-slate-400">
              {t("maps.no_maps_available", "No maps available.")}
            </div>
          ) : (
            availableCountries.map((country: string) => (
              <SelectItem
                key={country}
                value={country}
                className="font-medium whitespace-normal break-words py-2.5"
                title={country}
              >
                {country}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
