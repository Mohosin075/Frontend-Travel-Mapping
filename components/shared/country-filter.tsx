"use client";

import { useEffect, useState } from "react";
import { useGetMapsQuery } from "@/redux/features/map/mapApi";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { getLocalized } from "@/lib/utils";
import { resolveOfferMap } from "@/lib/offer-country";

export function useCountryFilter({ allowAll = true }: { allowAll?: boolean } = {}) {
  const { data, isLoading } = useGetMapsQuery({ limit: 100 });
  const [restored, setRestored] = useState(false);
  const [mapId, setMapId] = useState("");
  const [savedCountry, setSavedCountry] = useState("");
  const [all, setAll] = useState(false);
  useEffect(() => {
    try {
      setMapId(localStorage.getItem("selectedMapId") || "");
      setSavedCountry(localStorage.getItem("selectedCountryFilter") || "");
    } catch { /* Storage is optional. */ }
    setRestored(true);
  }, []);
  const maps: any[] = data?.data || [];
  const selected = all && allowAll ? null : resolveOfferMap(maps, mapId, savedCountry)
    // A saved country can be outside this page of maps. Keep its selection
    // instead of replacing it with the first country's results.
    || (!allowAll ? resolveOfferMap(maps, '', savedCountry) : null);
  const country = all && allowAll ? "" : selected?.country || getLocalized(selected?.name, "en") || savedCountry;
  const value = all && allowAll ? "" : String(selected?._id || selected?.id || mapId || country);
  const options = [...maps].sort((a, b) => Number(String(b._id || b.id) === value) - Number(String(a._id || a.id) === value));
  const change = (id: string) => {
    if (!allowAll && (!id || !maps.some(map => String(map._id || map.id) === id))) return;
    const map = maps.find(item => String(item._id || item.id) === id);
    const nextCountry = map?.country || getLocalized(map?.name, "en") || "";
    setMapId(id); setSavedCountry(nextCountry); setAll(!id);
    try {
      if (id) {
        localStorage.setItem("selectedMapId", id);
        localStorage.setItem("selectedCountryFilter", nextCountry);
      } else {
        localStorage.removeItem("selectedMapId");
        localStorage.removeItem("selectedCountryFilter");
      }
    } catch { /* Filtering still works without storage. */ }
  };
  return { allowAll, ready: restored && !isLoading, country, value, options, change };
}

export function CountryFilter({ filter, onChange }: { filter: ReturnType<typeof useCountryFilter>; onChange?: () => void }) {
  const { language } = useLanguage();
  const selectedMissing = filter.value && !filter.options.some(map => String(map._id || map.id) === filter.value);
  return (
    <select
      aria-label={language === "es" ? "Filtrar por país" : "Filter by country"}
      value={filter.value}
      disabled={!filter.ready || (!filter.allowAll && filter.options.length === 0)}
      onChange={event => { filter.change(event.target.value); onChange?.(); }}
      className="h-10 max-w-full px-4 rounded-full border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] text-gray-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-[#fabf13]"
    >
      {selectedMissing && <option value={filter.value}>{filter.country || filter.value}</option>}
      {filter.options.map(map => <option key={String(map._id || map.id)} value={String(map._id || map.id)}>{getLocalized(map.name, language) || map.country}</option>)}
      {filter.allowAll && <option value="">{language === "es" ? "Todos los países" : "All countries"}</option>}
      {!filter.allowAll && !filter.options.length && !filter.value && <option value="" disabled>{language === 'es' ? 'No hay países disponibles' : 'No countries available'}</option>}
    </select>
  );
}
