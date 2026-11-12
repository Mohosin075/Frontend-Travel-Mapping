export const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export type OperatingHours = Record<string, { open: string; close: string; closed: boolean }>;

export function defaultOperatingHours(): OperatingHours {
  return Object.fromEntries(WEEK_DAYS.map(day => [day, {
    open: day === "Saturday" || day === "Sunday" ? "10:00" : "09:00",
    close: day === "Saturday" || day === "Sunday" ? "16:00" : "18:00",
    closed: day === "Sunday",
  }]));
}

const aliases = [
  ["monday", "mon", "lunes"], ["tuesday", "tue", "martes"],
  ["wednesday", "wed", "miercoles"], ["thursday", "thu", "jueves"],
  ["friday", "fri", "viernes"], ["saturday", "sat", "sabado"],
  ["sunday", "sun", "domingo"],
];
const dayIndex = (day: string) => aliases.findIndex(names => names.includes(day.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()));
const time = (value: unknown): string => {
  if (typeof value !== "string") return "";
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(am|pm))?$/i);
  if (!match) return "";
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (minute > 59 || (match[3] ? hour < 1 || hour > 12 : hour > 23)) return "";
  if (match[3]) hour = hour % 12 + (match[3].toLowerCase() === "pm" ? 12 : 0);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

// Accept the weekly editor format and both previously stored business formats.
export function normalizeOperatingHours(value: unknown): OperatingHours | null {
  if (!value || typeof value !== "object") return null;
  const result: OperatingHours = Object.fromEntries(WEEK_DAYS.map(day => [day, { open: "", close: "", closed: true }]));
  let found = false;
  const put = (day: string, row: any) => {
    const index = dayIndex(day);
    if (index < 0 || !row || typeof row !== "object") return;
    result[WEEK_DAYS[index]] = { open: time(row.open ?? row.openTime), close: time(row.close ?? row.closeTime), closed: row.closed === true };
    found = true;
  };
  if (Array.isArray(value)) {
    for (const row of value) {
      if (typeof row?.days !== "string") continue;
      if (/^(always open|siempre abierto|24\/7)$/i.test(row.days.trim())) {
        WEEK_DAYS.forEach(day => put(day, { open: "00:00", close: "00:00", closed: false }));
        continue;
      }
      const range = row.days.split(/\s*(?:-|–|—| to | a )\s*/);
      if (range.length === 2 && range.every((day: string) => dayIndex(day) >= 0)) {
        const start = dayIndex(range[0]), end = dayIndex(range[1]);
        for (let i = start; ; i = (i + 1) % 7) {
          put(WEEK_DAYS[i], row);
          if (i === end) break;
        }
      } else row.days.split(/[,;]/).forEach((day: string) => put(day, row));
    }
  } else {
    const record = value as Record<string, any>;
    if ("openTime" in record || "closeTime" in record) {
      WEEK_DAYS.forEach(day => put(day, { ...record, closed: Array.isArray(record.offDays) && record.offDays.some((off: string) => typeof off === "string" && dayIndex(off) === dayIndex(day)) }));
    } else Object.entries(record).forEach(([day, row]) => put(day, row));
  }
  return found || (Array.isArray(value) && value.length === 0) ? result : null;
}
