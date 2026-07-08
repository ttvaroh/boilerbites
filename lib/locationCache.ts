import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_KEY = "locationListCache:v1";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface CachedLocationRow {
  name: string;
  type: number;
}

interface LocationCacheEntry {
  fetchedAt: number;
  data: CachedLocationRow[];
}

export const locationCache = {
  async get(): Promise<CachedLocationRow[] | null> {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as LocationCacheEntry;
      if (!parsed?.data || Date.now() - parsed.fetchedAt > TTL_MS) {
        return null;
      }
      return parsed.data;
    } catch {
      return null;
    }
  },

  async set(data: CachedLocationRow[]): Promise<void> {
    try {
      const entry: LocationCacheEntry = {
        fetchedAt: Date.now(),
        data,
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entry));
    } catch {
      // Best-effort cache.
    }
  },
};
