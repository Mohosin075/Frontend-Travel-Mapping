import { getLocalized } from "./utils";

export interface ILevelItem {
  _id?: string;
  level: number;
  name: string | { en?: string; es?: string };
  title?: string;
  points: number;
  xp?: number;
  reviews?: number;
  reward?: string;
  badgeUrl?: string;
  description?: string | { en?: string; es?: string };
}

export const DEFAULT_LEVEL_THRESHOLDS: ILevelItem[] = [
  { level: 0, name: "Explorador", points: 0, reviews: 0, reward: "10% OFF 1 Map" },
  { level: 1, name: "Aventurero", points: 100, reviews: 6, reward: "Itinerary in PDF" },
  { level: 2, name: "Tlacuilo", points: 250, reviews: 13, reward: "Itinerary in PDF" },
  { level: 3, name: "Expedicionario", points: 400, reviews: 26, reward: "25% OFF 1 Map" },
  { level: 4, name: "Viajero", points: 700, reviews: 46, reward: "Itinerary in PDF" },
  { level: 5, name: "Chasqui", points: 1300, reviews: 86, reward: "1 Free Map" },
  { level: 6, name: "Cronista", points: 2200, reviews: 146, reward: "50% OFF 1 Map" },
  { level: 7, name: "Baquiano", points: 3500, reviews: 233, reward: "Itinerary in PDF" },
  { level: 8, name: "Cartógrafo", points: 5500, reviews: 366, reward: "75% OFF 1 Map" },
  { level: 9, name: "Maestro Ruta", points: 8500, reviews: 566, reward: "Itinerary in PDF" },
  { level: 10, name: "Leyenda", points: 13000, reviews: 866, reward: "1 Free Map" },
  { level: 11, name: "Gran Leyenda", points: 20000, reviews: 1333, reward: "1 Free Map" },
  { level: 12, name: "Mítico", points: 30000, reviews: 2000, reward: "1 Free Map" },
  { level: 13, name: "Inmortal", points: 45000, reviews: 3000, reward: "1 Free Map" },
  { level: 14, name: "Supremo", points: 65000, reviews: 4333, reward: "2 Free Maps" },
];

/**
 * Normalizes API response or raw levels array into a clean sorted list of levels.
 */
export function getEffectiveLevels(apiLevelsData: any, language: string = "es"): ILevelItem[] {
  const rawList = Array.isArray(apiLevelsData?.data)
    ? apiLevelsData.data
    : Array.isArray(apiLevelsData)
    ? apiLevelsData
    : null;

  if (!rawList || rawList.length === 0) {
    return DEFAULT_LEVEL_THRESHOLDS;
  }

  const sorted = [...rawList].sort((a, b) => (Number(a.level) || 0) - (Number(b.level) || 0));

  return sorted.map((item) => {
    const rawName = item.name ?? item.title;
    const nameStr =
      typeof rawName === "string"
        ? rawName
        : getLocalized(rawName, language) || String(rawName?.es || rawName?.en || "Level " + item.level);

    return {
      _id: item._id,
      level: Number(item.level) || 0,
      name: nameStr,
      title: nameStr,
      points: Number(item.points ?? item.xp) || 0,
      xp: Number(item.points ?? item.xp) || 0,
      reviews: Number(item.reviews) || 0,
      reward: typeof item.reward === "string" ? item.reward : getLocalized(item.description, language) || "",
      badgeUrl: item.badgeUrl || item.icon,
      description: item.description,
    };
  });
}

export interface IUserLevelCalculation {
  currentLevelNumber: number;
  currentLevelName: string;
  currentLevelMinPoints: number;
  currentLevelMinReviews: number;
  currentLevelData: ILevelItem;
  nextLevelNumber: number;
  nextLevelName: string;
  nextLevelMinPoints: number;
  nextLevelMinReviews: number;
  nextLevelData: ILevelItem;
  pointsNeededForNext: number;
  reviewsNeededForNext: number;
  percent: number;
  strokeDashoffset: number;
  isMaxLevel: boolean;
}

/**
 * Calculates user's dynamic level progression according to database-configured thresholds.
 */
export function calculateUserLevel(
  points: number = 0,
  reviews: number = 0,
  levels: ILevelItem[] = DEFAULT_LEVEL_THRESHOLDS
): IUserLevelCalculation {
  const sorted =
    levels && levels.length > 0
      ? [...levels].sort((a, b) => a.level - b.level)
      : DEFAULT_LEVEL_THRESHOLDS;

  let currentIndex = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (points >= (sorted[i].points || 0)) {
      currentIndex = i;
      break;
    }
  }

  const currentLevelData = sorted[currentIndex] || sorted[0];
  const isMaxLevel = currentIndex >= sorted.length - 1;
  const nextIndex = isMaxLevel ? currentIndex : currentIndex + 1;
  const nextLevelData = sorted[nextIndex] || currentLevelData;

  const currentLevelMinPoints = currentLevelData.points || 0;
  const nextLevelMinPoints = nextLevelData.points || 0;
  const pointsSpan = Math.max(1, nextLevelMinPoints - currentLevelMinPoints);
  const earnedInSpan = Math.max(0, points - currentLevelMinPoints);

  const percent = isMaxLevel
    ? 100
    : Math.min(100, Math.max(0, (earnedInSpan / pointsSpan) * 100));

  const strokeDashoffset = 440 - (440 * percent) / 100;
  const pointsNeededForNext = Math.max(0, nextLevelMinPoints - points);
  const reviewsNeededForNext = Math.max(0, (nextLevelData.reviews || 0) - reviews);

  const getCleanName = (lvl: ILevelItem) => {
    if (typeof lvl.name === "string") return lvl.name;
    return lvl.name?.es || lvl.name?.en || lvl.title || "Level " + lvl.level;
  };

  return {
    currentLevelNumber: currentLevelData.level,
    currentLevelName: getCleanName(currentLevelData),
    currentLevelMinPoints,
    currentLevelMinReviews: currentLevelData.reviews || 0,
    currentLevelData,
    nextLevelNumber: nextLevelData.level,
    nextLevelName: getCleanName(nextLevelData),
    nextLevelMinPoints,
    nextLevelMinReviews: nextLevelData.reviews || 0,
    nextLevelData,
    pointsNeededForNext,
    reviewsNeededForNext,
    percent,
    strokeDashoffset,
    isMaxLevel,
  };
}
