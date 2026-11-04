type CountryMap = { _id?: unknown; id?: unknown; name?: any; country?: string };
const normalize = (value: unknown) => typeof value === "string"
  ? value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase() : "";
const names = (map?: CountryMap | null): string[] => [
  map?.country, typeof map?.name === "string" ? map.name : "",
  map?.name?.en, map?.name?.es,
].map(normalize).filter(Boolean);

export function resolveOfferMap(maps: CountryMap[], mapId: string, country: string): CountryMap | null {
  if (mapId) {
    const selected = maps.find(map => String(map._id || map.id) === mapId);
    // A paginated or stale map list must never change the saved selection.
    return selected || null;
  }
  if (country) return maps.find(map => names(map).includes(normalize(country))) || null;
  return maps[0] || null;
}

export function offerMatchesCountry(offer: any, selectedMap: CountryMap | null, country: string): boolean {
  if (!selectedMap && !country) return true;
  const targets = new Set([...names(selectedMap), normalize(country)].filter(Boolean));
  const selectedId = selectedMap?._id || selectedMap?.id;
  return [offer?.place, offer?.business].some(entity => {
    if (!entity || typeof entity !== "object") return false;
    const mapId = entity.map?._id || entity.map?.id || (typeof entity.map === "string" ? entity.map : undefined);
    if (selectedId && mapId && String(mapId) === String(selectedId)) return true;
    return [...names(entity.map), normalize(entity.country), normalize(entity.location?.country)]
      .some(value => value && targets.has(value));
  });
}
