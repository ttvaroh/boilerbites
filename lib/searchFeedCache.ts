import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_PREFIX = "searchFeedCache:v1:";

export interface SearchFeedPayload<T> {
  results: T[];
  totalCount: number;
}

interface SearchFeedEntry<T> {
  menuVersion: string;
  date: string;
  payload: SearchFeedPayload<T>;
}

const cacheKey = (date: string) => `${CACHE_PREFIX}${date}`;

export const searchFeedCache = {
  async get<T>(
    date: string,
    menuVersion: string | null,
  ): Promise<SearchFeedPayload<T> | null> {
    if (!menuVersion) return null;

    try {
      const raw = await AsyncStorage.getItem(cacheKey(date));
      if (!raw) return null;

      const parsed = JSON.parse(raw) as SearchFeedEntry<T>;
      if (parsed.menuVersion !== menuVersion || parsed.date !== date) {
        return null;
      }

      return parsed.payload;
    } catch {
      return null;
    }
  },

  async set<T>(
    date: string,
    menuVersion: string | null,
    payload: SearchFeedPayload<T>,
  ): Promise<void> {
    if (!menuVersion) return;

    try {
      const entry: SearchFeedEntry<T> = {
        menuVersion,
        date,
        payload,
      };
      await AsyncStorage.setItem(cacheKey(date), JSON.stringify(entry));
    } catch {
      // Best-effort cache.
    }
  },
};
