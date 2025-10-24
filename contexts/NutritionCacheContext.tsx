import React, { createContext, ReactNode, useContext, useState } from 'react';

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

interface NutritionCacheContextType {
  // Nutrition data methods
  getNutritionData: (date: string) => NutritionData | null;
  setNutritionData: (date: string, data: NutritionData) => void;
  clearNutritionData: (date?: string) => void;
  
  // Food entries methods
  getFoodEntries: (date: string) => FoodEntry[] | null;
  setFoodEntries: (date: string, entries: FoodEntry[]) => void;
  clearFoodEntries: (date?: string) => void;
  removeFoodEntry: (date: string, entryId: string) => void;
}

const NutritionCacheContext = createContext<NutritionCacheContextType | undefined>(undefined);

export const useNutritionCache = () => {
  const context = useContext(NutritionCacheContext);
  if (context === undefined) {
    throw new Error('useNutritionCache must be used within a NutritionCacheProvider');
  }
  return context;
};

interface NutritionCacheProviderProps {
  children: ReactNode;
}

export const NutritionCacheProvider: React.FC<NutritionCacheProviderProps> = ({ children }) => {
  const [nutritionCache, setNutritionCache] = useState<Record<string, NutritionData>>({});
  const [foodEntriesCache, setFoodEntriesCache] = useState<Record<string, FoodEntry[]>>({});

  // Nutrition data methods
  const getNutritionData = (date: string): NutritionData | null => {
    return nutritionCache[date] || null;
  };

  const setNutritionData = (date: string, data: NutritionData) => {
    setNutritionCache(prev => ({
      ...prev,
      [date]: data
    }));
  };

  const clearNutritionData = (date?: string) => {
    if (date) {
      setNutritionCache(prev => {
        const newCache = { ...prev };
        delete newCache[date];
        return newCache;
      });
    } else {
      setNutritionCache({});
    }
  };

  // Food entries methods
  const getFoodEntries = (date: string): FoodEntry[] | null => {
    return foodEntriesCache[date] || null;
  };

  const setFoodEntries = (date: string, entries: FoodEntry[]) => {
    setFoodEntriesCache(prev => ({
      ...prev,
      [date]: entries
    }));
  };

  const clearFoodEntries = (date?: string) => {
    if (date) {
      setFoodEntriesCache(prev => {
        const newCache = { ...prev };
        delete newCache[date];
        return newCache;
      });
    } else {
      setFoodEntriesCache({});
    }
  };

  const removeFoodEntry = (date: string, entryId: string) => {
    setFoodEntriesCache(prev => {
      const currentEntries = prev[date] || [];
      const updatedEntries = currentEntries.filter(entry => entry.id !== entryId);
      return {
        ...prev,
        [date]: updatedEntries
      };
    });
  };

  const value: NutritionCacheContextType = {
    // Nutrition data methods
    getNutritionData,
    setNutritionData,
    clearNutritionData,
    
    // Food entries methods
    getFoodEntries,
    setFoodEntries,
    clearFoodEntries,
    removeFoodEntry,
  };

  return (
    <NutritionCacheContext.Provider value={value}>
      {children}
    </NutritionCacheContext.Provider>
  );
};
