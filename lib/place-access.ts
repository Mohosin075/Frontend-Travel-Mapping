import { editorCanAccessMap } from "./editor-access";

/** Missing access information must never reveal a premium place. */
export function canRevealPlace(place: any, user: any): boolean {
  if (["super_admin", "admin"].includes(user?.role)) return true;
  if ([place?.type, place?.placeType].some(type => String(type || "").toLowerCase() === "business")) return true;
  if (place?.isLocked) return false;
  const map = place?.map || place?.mapId;
  const mapId = typeof map === "object" ? map?._id || map?.id : map;
  if (user?.role === "map_editor") return editorCanAccessMap(user, mapId, map?.country || place?.country);
  if (map && typeof map === "object" && map.isPaid === false) return true;
  if (!mapId || !Array.isArray(user?.purchasedMaps)) return false;
  return user.purchasedMaps.some((item: any) => {
    const id = typeof item === "object" ? item?._id || item?.id : item;
    return id && String(id) === String(mapId);
  });
}
