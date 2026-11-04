export function asId(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value._id || value.id || "");
}

export type PlaceKind = "Business" | "Regular";

export function isPlaceKind(value: unknown): value is PlaceKind {
  return value === "Business" || value === "Regular";
}

/**
 * Map/discovery responses overwrite Place.type with "place" | "business"
 * (collection kind). The real Business|Regular value is in placeType.
 */
export function normalizePlaceType(source: unknown): PlaceKind {
  const record =
    source && typeof source === "object" ? (source as Record<string, unknown>) : null;
  const type = record ? record.type : source;
  const placeType = record ? record.placeType : undefined;

  // Prefer an explicit Business|Regular `type`. Fall back to `placeType` only
  // when `type` is the discovery discriminator ("place" / "business").
  if (isPlaceKind(type)) return type;
  if (isPlaceKind(placeType)) return placeType;

  for (const raw of [type, placeType]) {
    if (typeof raw !== "string") continue;
    const value = raw.trim().toLowerCase();
    if (value === "regular place" || value === "regular location") {
      return "Regular";
    }
  }

  return "Regular";
}

export function editablePlaceText(value: unknown): string {
  if (value && typeof value === "object") {
    const translated = value as { en?: unknown; es?: unknown };
    return editablePlaceText(translated.en ?? translated.es);
  }
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

export function normalizeDifficulty(val?: unknown): string {
  if (val && typeof val === "object") {
    const translated = val as { en?: unknown; es?: unknown };
    return normalizeDifficulty(translated.en || translated.es);
  }
  if (!val || typeof val !== "string") return "";
  const lower = val.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  if (lower === "easy" || lower === "fácil" || lower === "facil") return "Easy";
  if (["moderate", "moderado", "moderada", "medium", "medio", "media", "intermediate", "intermedio"].includes(lower)) return "Moderate";
  if (lower === "hard" || lower === "difícil" || lower === "dificil") return "Hard";
  return val;
}

const SERVICE_MAP: Record<string, string> = {
  parking: "Parking",
  estacionamiento: "Parking",
  restrooms: "Restrooms",
  baños: "Restrooms",
  banos: "Restrooms",
  "food nearby": "Food Nearby",
  "comida cercana": "Food Nearby",
  "comida cerca": "Food Nearby",
  "guided tour": "Guided Tour",
  "visitas guiadas": "Guided Tour",
  "tour guiado": "Guided Tour",
  "family friendly": "Family Friendly",
  familiar: "Family Friendly",
  wifi: "Wifi",
  "pet friendly": "Pet Friendly",
  "se admiten mascotas": "Pet Friendly",
};

export function normalizeService(service?: unknown): string {
  if (!service || typeof service !== "string") return "";
  const lower = service.toLowerCase().trim();
  return SERVICE_MAP[lower] || service;
}


export function asMediaUrls(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      let urlStr = "";
      if (typeof item === "string") {
        urlStr = item;
      } else if (item && typeof item === "object") {
        const rec = item as Record<string, unknown>;
        const url = rec.url || rec.path || rec.src;
        if (typeof url === "string") urlStr = url;
      }
      if (!urlStr) return "";
      const idx = urlStr.indexOf("/uploads/");
      if (idx !== -1) {
        return urlStr.substring(idx);
      }
      return urlStr;
    })
    .filter(Boolean);
}

const COORD_EPSILON = 1e-6;

export function coordsChanged(
  next?: [number, number] | number[] | null,
  prev?: [number, number] | number[] | null,
): boolean {
  if (!next || next.length < 2) return false;
  if (!prev || prev.length < 2) return true;
  return (
    Math.abs(Number(next[0]) - Number(prev[0])) > COORD_EPSILON ||
    Math.abs(Number(next[1]) - Number(prev[1])) > COORD_EPSILON
  );
}

function omitEmpty(placeData: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(placeData).filter(([key, value]) => {
      if (value === undefined || value === null) return false;
      // Empty media arrays wipe photos on save — skip unless there are files
      if ((key === "media" || key === "menuImages") && Array.isArray(value) && value.length === 0) {
        return false;
      }
      return true;
    }),
  );
}

function isVideoFile(file: File): boolean {
  if (file.type && file.type.startsWith("video/")) {
    return true;
  }
  const ext = file.name.split(".").pop()?.toLowerCase();
  return !!ext && ["mp4", "webm", "ogv", "mov", "mkv", "3gp", "3gpp", "avi", "wmv", "flv", "m4v", "mpeg", "mpg"].includes(ext);
}

export function buildPlaceRequestBody(
  placeData: Record<string, unknown>,
  mediaFiles: File[] = [],
  menuFiles: File[] = [],
): FormData | Record<string, unknown> {
  const compactData = omitEmpty(placeData);
  if (mediaFiles.length === 0 && menuFiles.length === 0) {
    return compactData;
  }

  const formDataPayload = new FormData();
  formDataPayload.append("data", JSON.stringify(compactData));
  mediaFiles.forEach((file) => {
    formDataPayload.append("images", file);
  });
  menuFiles.forEach((file) => {
    formDataPayload.append("documents", file);
  });
  return formDataPayload;
}
