"use client";

import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { geocodeInFlight } from "@/lib/maps/geocode";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Suggestion = {
  label: string;
  placeId?: string;
  lat?: number;
  lng?: number;
};

export function LocationSearch({
  onPick,
  countryName,
  disabled,
}: {
  onPick: (lat: number, lng: number, label: string) => void;
  countryName?: string;
  disabled?: boolean;
}) {
  const places = useMapsLibrary("places");
  const geocoding = useMapsLibrary("geocoding");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const revision = useRef(0);
  const selectionPending = useRef(false);
  const selectedQuery = useRef<{ label: string; country?: string } | null>(null);

  useEffect(() => () => { revision.current += 1; }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    const requestRevision = ++revision.current;
    selectionPending.current = false;
    setLoading(false);
    let cancelled = false;
    const isCurrent = () => !cancelled && revision.current === requestRevision;
    const q = query.trim();
    if (disabled || q.length < 2 || (
      selectedQuery.current?.label === query &&
      selectedQuery.current.country === countryName
    )) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const timer = window.setTimeout(() => {
      const biased = countryName ? `${q}, ${countryName}` : q;

      if (places) {
        const service = new places.AutocompleteService();
        service.getPlacePredictions(
          { input: biased },
          (results, status) => {
            if (!isCurrent()) return;
            if (String(status) === "OK" && results?.length) {
              setSuggestions(
                results.slice(0, 6).map((item) => ({
                  label: item.description,
                  placeId: item.place_id,
                })),
              );
              setOpen(true);
              return;
            }
            if (!geocoding) {
              setSuggestions([]);
              return;
            }
            const geocoder = new geocoding.Geocoder();
            void geocodeInFlight(geocoder, { address: biased }).then(({ results: geoResults, status: geoStatus }) => {
              if (!isCurrent()) return;
              if (String(geoStatus) !== "OK" || !geoResults?.[0]?.geometry?.location) {
                setSuggestions([]);
                return;
              }
              const loc = geoResults[0].geometry.location;
              setSuggestions([
                {
                  label: geoResults[0].formatted_address || q,
                  lat: loc.lat(),
                  lng: loc.lng(),
                },
              ]);
              setOpen(true);
            }).catch(() => { if (isCurrent()) setSuggestions([]); });
          },
        );
        return;
      }

      if (!geocoding) return;
      const geocoder = new geocoding.Geocoder();
      void geocodeInFlight(geocoder, { address: biased }).then(({ results, status }) => {
        if (!isCurrent()) return;
        if (status !== "OK" || !results?.[0]?.geometry?.location) {
          setSuggestions([]);
          return;
        }
        const loc = results[0].geometry.location;
        setSuggestions([
          {
            label: results[0].formatted_address || q,
            lat: loc.lat(),
            lng: loc.lng(),
          },
        ]);
        setOpen(true);
      }).catch(() => { if (isCurrent()) setSuggestions([]); });
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, countryName, places, geocoding, disabled]);

  const selectSuggestion = async (item: Suggestion) => {
    if (disabled || selectionPending.current) return;
    const selectionRevision = ++revision.current;
    selectionPending.current = true;
    setOpen(false);
    setLoading(true);
    const commit = (lat: number, lng: number) => {
      if (revision.current !== selectionRevision) return;
      selectedQuery.current = { label: item.label, country: countryName };
      setQuery(item.label);
      setSuggestions([]);
      setOpen(false);
      onPick(lat, lng, item.label);
    };
    try {
      if (item.lat != null && item.lng != null) {
        commit(item.lat, item.lng);
        return;
      }
      if (!item.placeId || !geocoding) return;
      const geocoder = new geocoding.Geocoder();
      const { results, status } = await geocodeInFlight(geocoder, { placeId: item.placeId });
      const loc = results?.[0]?.geometry?.location;
      if (status === "OK" && loc) commit(loc.lat(), loc.lng());
    } catch {
      // Leave the query editable so a failed lookup can be retried.
    } finally {
      if (revision.current === selectionRevision) {
        selectionPending.current = false;
        setLoading(false);
      }
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        value={query}
        disabled={disabled}
        onChange={(e) => {
          revision.current += 1;
          selectionPending.current = false;
          setLoading(false);
          selectedQuery.current = null;
          setSuggestions([]);
          setOpen(false);
          setQuery(e.target.value);
        }}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={
          countryName
            ? `Search a place in ${countryName}`
            : "Search a place or address"
        }
        className="h-11 w-full rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/60 pl-10 pr-4 text-sm text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 outline-none transition focus:border-yellow-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-yellow-200 dark:focus:ring-yellow-500/20 disabled:opacity-60"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-[#131b2e] py-1 shadow-xl text-gray-900 dark:text-slate-100">
          {suggestions.map((item) => (
            <button
              key={`${item.placeId || item.label}`}
              type="button"
              disabled={loading}
              onClick={() => void selectSuggestion(item)}
              className="block w-full px-3 py-2.5 text-left text-sm text-gray-700 dark:text-slate-200 hover:bg-yellow-50 dark:hover:bg-slate-800/80 transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
