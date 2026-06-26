import AsyncStorage from "@react-native-async-storage/async-storage";
import { getTodayDateString } from "./timezone-utils";

// Persistent (L2) menu cache backed by AsyncStorage.
//
// Menus can change mid-day (scheduled ~7am/11am/5pm EST and occasionally at
// random times). Each cached payload is stamped with the server-side
// day_menu.last_updated value ("version"). The MenuDataContext only serves a
// cached payload when the version it holds for that location/date matches the
// stored version; on mismatch it refetches and overwrites the entry. This lets
// cold app launches avoid re-downloading menu data while still reflecting
// upstream changes within minutes.

const KEY_PREFIX = "menuCache:";
const DETAILED_PREFIX = `${KEY_PREFIX}detailed:`;
const BASIC_PREFIX = `${KEY_PREFIX}basic:`;

// Entries for dates older than this many days are removed on startup.
const MAX_AGE_DAYS = 2;

interface CacheEntry<T> {
  version: string;
  date: string;
  data: T;
}

const detailedKey = (
  locationName: string,
  date: string,
  mealType: string,
): string => `${DETAILED_PREFIX}${locationName}:${date}:${mealType}`;

const basicKey = (locationName: string, date: string): string =>
  `${BASIC_PREFIX}${locationName}:${date}`;

async function readEntry<T>(key: string): Promise<CacheEntry<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed || typeof parsed.version !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeEntry<T>(
  key: string,
  version: string,
  date: string,
  data: T,
): Promise<void> {
  try {
    const entry: CacheEntry<T> = { version, date, data };
    await AsyncStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Best-effort cache; ignore write failures (e.g. storage full).
  }
}

export const menuCache = {
  async getDetailedMeal<T>(
    locationName: string,
    date: string,
    mealType: string,
  ): Promise<CacheEntry<T> | null> {
    return readEntry<T>(detailedKey(locationName, date, mealType));
  },

  async setDetailedMeal<T>(
    locationName: string,
    date: string,
    mealType: string,
    version: string,
    data: T,
  ): Promise<void> {
    await writeEntry(detailedKey(locationName, date, mealType), version, date, data);
  },

  async getBasicDay<T>(
    locationName: string,
    date: string,
  ): Promise<CacheEntry<T> | null> {
    return readEntry<T>(basicKey(locationName, date));
  },

  async setBasicDay<T>(
    locationName: string,
    date: string,
    version: string,
    data: T,
  ): Promise<void> {
    await writeEntry(basicKey(locationName, date), version, date, data);
  },

  // Remove entries for dates older than MAX_AGE_DAYS. Past-date menus are
  // immutable, so a small retention window keeps storage bounded without
  // sacrificing useful cache hits.
  async prune(): Promise<void> {
    try {
      const today = getTodayDateString();
      const cutoff = new Date(`${today}T00:00:00`);
      cutoff.setDate(cutoff.getDate() - MAX_AGE_DAYS);

      const allKeys = await AsyncStorage.getAllKeys();
      const ourKeys = allKeys.filter((k) => k.startsWith(KEY_PREFIX));
      const staleKeys: string[] = [];

      for (const key of ourKeys) {
        const entry = await readEntry<unknown>(key);
        const entryDate = entry?.date;
        if (!entryDate) {
          // Unparseable/legacy entry: drop it.
          staleKeys.push(key);
          continue;
        }
        const parsed = new Date(`${entryDate}T00:00:00`);
        if (isNaN(parsed.getTime()) || parsed < cutoff) {
          staleKeys.push(key);
        }
      }

      if (staleKeys.length > 0) {
        await AsyncStorage.multiRemove(staleKeys);
      }
    } catch {
      // Pruning is best-effort.
    }
  },
};

export type { CacheEntry };
