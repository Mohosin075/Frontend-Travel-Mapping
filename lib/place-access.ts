import { editorCanAccessMap } from "./editor-access";

/** Missing access information must never reveal a premium place. */
export function canRevealPlace(place: any, user: any): boolean {
  if (["super_admin", "admin"].includes(user?.role)) return true;
  if (String(place?.type || place?.placeType || "").toLowerCase() === "business") return true;
  if (place?.isLocked) return false;
  const map = place?.map || place?.mapId;
  if (map && typeof map === "object" && map.isPaid === false) return true;
  const mapId = typeof map === "object" ? map?._id || map?.id : map;
  if (user?.role === "map_editor" && editorCanAccessMap(user, mapId, map?.country || place?.country)) return true;
  if (!mapId || !Array.isArray(user?.purchasedMaps)) return false;
  return user.purchasedMaps.some((item: any) => {
    const id = typeof item === "object" ? item?._id || item?.id : item;
    return id && String(id) === String(mapId);
  });
}
