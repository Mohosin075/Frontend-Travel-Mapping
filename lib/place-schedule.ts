const text = (value: unknown): string => typeof value === "string" ? value.trim() : "";
export function isAlwaysOpenSchedule(value: unknown): boolean {
  if (value && typeof value === "object") {
    const translated = value as { en?: unknown; es?: unknown };
    return isAlwaysOpenSchedule(translated.en) || isAlwaysOpenSchedule(translated.es);
  }
  const normalized = text(value).toLowerCase().replace(/[-_]/g, " ").replace(/\s+/g, " ");
  return /^(always open|siempre abierto|abierto siempre)(\s*\(24\/7\))?$/.test(normalized) ||
    /^(open |abierto )?24\/7$/.test(normalized) ||
    /^(open |abierto |abierto las )?24 (hours|horas)$/.test(normalized);
}
export function normalizePlaceSchedule(value: unknown): string {
  if (isAlwaysOpenSchedule(value)) return "Always open";
  if (value && typeof value === "object") {
    const translated = value as { en?: unknown; es?: unknown };
    return text(translated.en) || text(translated.es);
  }
  return text(value);
}
