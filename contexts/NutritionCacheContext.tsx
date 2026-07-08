import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

const NUTRITION_CACHE_TTL_MS = 5 * 60 * 1000;

interface NutritionData {
  consumed_protein_g: number;
  consumed_carbs_g: number;
  consumed_fat_g: number;
  consumed_calories: number;
  goal_protein_g: number;
  goal_carbs_g: number;
  goal_fat_g: number;
  goal_calories: number;
}

interface FoodEntry {
  id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meal_name: number;
  created_at: string;
}

type InvalidationListener = (date: string) => void;

interface NutritionCacheContextType {
  getNutritionData: (date: string) => NutritionData | null;
  setNutritionData: (date: string, data: NutritionData) => void;
  clearNutritionData: (date?: string) => void;
  isNutritionFresh: (date: string) => boolean;
  subscribeToInvalidation: (listener: InvalidationListener) => () => void;

  getFoodEntries: (date: string) => FoodEntry[] | null;
  setFoodEntries: (date: string, entries: FoodEntry[]) => void;
  clearFoodEntries: (date?: string) => void;
  isFoodEntriesFresh: (date: string) => boolean;
  removeFoodEntry: (date: string, entryId: string) => void;
}

const NutritionCacheContext = createContext<NutritionCacheContextType | undefined>(
  undefined,
);

export const useNutritionCache = () => {
  const context = useContext(NutritionCacheContext);
  if (context === undefined) {
    throw new Error("useNutritionCache must be used within a NutritionCacheProvider");
  }
  return context;
};

interface NutritionCacheProviderProps {
  children: ReactNode;
}

export const NutritionCacheProvider: React.FC<NutritionCacheProviderProps> = ({
  children,
}) => {
  const [nutritionCache, setNutritionCache] = useState<Record<string, NutritionData>>(
    {},
  );
  const [foodEntriesCache, setFoodEntriesCache] = useState<
    Record<string, FoodEntry[]>
  >({});
  const [nutritionFetchedAt, setNutritionFetchedAt] = useState<
    Record<string, number>
  >({});
  const [foodEntriesFetchedAt, setFoodEntriesFetchedAt] = useState<
    Record<string, number>
  >({});
  const invalidationListenersRef = useRef(new Set<InvalidationListener>());

  const notifyInvalidation = useCallback((date: string) => {
    for (const listener of invalidationListenersRef.current) {
      listener(date);
    }
  }, []);

  const isFresh = useCallback(
    (date: string, fetchedAtMap: Record<string, number>) => {
      const fetchedAt = fetchedAtMap[date];
      if (!fetchedAt) return false;
      return Date.now() - fetchedAt < NUTRITION_CACHE_TTL_MS;
    },
    [],
  );

  const getNutritionData = (date: string): NutritionData | null => {
    return nutritionCache[date] || null;
  };

  const setNutritionData = (date: string, data: NutritionData) => {
    setNutritionCache((prev) => ({
      ...prev,
      [date]: data,
    }));
    setNutritionFetchedAt((prev) => ({
      ...prev,
      [date]: Date.now(),
    }));
  };

  const clearNutritionData = (date?: string) => {
    if (date) {
      setNutritionCache((prev) => {
        const newCache = { ...prev };
        delete newCache[date];
        return newCache;
      });
      setNutritionFetchedAt((prev) => {
        const next = { ...prev };
        delete next[date];
        return next;
      });
      notifyInvalidation(date);
    } else {
      setNutritionCache({});
      setNutritionFetchedAt({});
    }
  };

  const isNutritionFresh = (date: string): boolean => {
    return isFresh(date, nutritionFetchedAt);
  };

  const subscribeToInvalidation = useCallback((listener: InvalidationListener) => {
    invalidationListenersRef.current.add(listener);
    return () => {
      invalidationListenersRef.current.delete(listener);
    };
  }, []);

  const getFoodEntries = (date: string): FoodEntry[] | null => {
    return foodEntriesCache[date] || null;
  };

  const setFoodEntries = (date: string, entries: FoodEntry[]) => {
    setFoodEntriesCache((prev) => ({
      ...prev,
      [date]: entries,
    }));
    setFoodEntriesFetchedAt((prev) => ({
      ...prev,
      [date]: Date.now(),
    }));
  };

  const clearFoodEntries = (date?: string) => {
    if (date) {
      setFoodEntriesCache((prev) => {
        const newCache = { ...prev };
        delete newCache[date];
        return newCache;
      });
      setFoodEntriesFetchedAt((prev) => {
        const next = { ...prev };
        delete next[date];
        return next;
      });
      notifyInvalidation(date);
    } else {
      setFoodEntriesCache({});
      setFoodEntriesFetchedAt({});
    }
  };

  const isFoodEntriesFresh = (date: string): boolean => {
    return isFresh(date, foodEntriesFetchedAt);
  };

  const removeFoodEntry = (date: string, entryId: string) => {
    setFoodEntriesCache((prev) => {
      const currentEntries = prev[date] || [];
      const updatedEntries = currentEntries.filter((entry) => entry.id !== entryId);
      return {
        ...prev,
        [date]: updatedEntries,
      };
    });
    setFoodEntriesFetchedAt((prev) => ({
      ...prev,
      [date]: Date.now(),
    }));
    notifyInvalidation(date);
  };

  const value: NutritionCacheContextType = {
    getNutritionData,
    setNutritionData,
    clearNutritionData,
    isNutritionFresh,
    subscribeToInvalidation,
    getFoodEntries,
    setFoodEntries,
    clearFoodEntries,
    isFoodEntriesFresh,
    removeFoodEntry,
  };

  return (
    <NutritionCacheContext.Provider value={value}>
      {children}
    </NutritionCacheContext.Provider>
  );
};
