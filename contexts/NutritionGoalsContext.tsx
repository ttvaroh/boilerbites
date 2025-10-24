import React, { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { NutritionGoals, getOrCreateNutritionGoals, upsertNutritionGoals } from '../lib/nutritionGoalsService';

interface NutritionGoalsContextType {
  goals: NutritionGoals | null;
  loading: boolean;
  error: string | null;
  updateGoals: (goals: { 
    calories: number; 
    protein: number; 
    carbs: number; 
    fat: number;
    dairy_allergy?: boolean;
    gluten_allergy?: boolean;
    nuts_allergy?: boolean;
    soy_allergy?: boolean;
    eggs_allergy?: boolean;
    shellfish_allergy?: boolean;
    fish_allergy?: boolean;
    peanut_allergy?: boolean;
  }) => Promise<void>;
  refreshGoals: () => Promise<void>;
}

const NutritionGoalsContext = createContext<NutritionGoalsContextType | undefined>(undefined);

export const useNutritionGoals = () => {
  const context = useContext(NutritionGoalsContext);
  if (context === undefined) {
    throw new Error('useNutritionGoals must be used within a NutritionGoalsProvider');
  }
  return context;
};

interface NutritionGoalsProviderProps {
  children: ReactNode;
  userId: string | null;
}

export const NutritionGoalsProvider: React.FC<NutritionGoalsProviderProps> = ({ children, userId }) => {
  const [goals, setGoals] = useState<NutritionGoals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshGoals = async () => {
    if (!userId) {
      setGoals(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const userGoals = await getOrCreateNutritionGoals(userId);
      setGoals(userGoals);
    } catch (err) {
      console.error('Error fetching nutrition goals:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch nutrition goals');
    } finally {
      setLoading(false);
    }
  };

  const updateGoals = async (newGoals: { calories: number; protein: number; carbs: number; fat: number }) => {
    if (!userId) {
      throw new Error('User not authenticated');
    }

    try {
      setError(null);
      const updatedGoals = await upsertNutritionGoals(userId, newGoals);
      setGoals(updatedGoals);
    } catch (err) {
      console.error('Error updating nutrition goals:', err);
      setError(err instanceof Error ? err.message : 'Failed to update nutrition goals');
      throw err;
    }
  };

  useEffect(() => {
    refreshGoals();
  }, [userId]);

  const value: NutritionGoalsContextType = {
    goals,
    loading,
    error,
    updateGoals,
    refreshGoals,
  };

  return (
    <NutritionGoalsContext.Provider value={value}>
      {children}
    </NutritionGoalsContext.Provider>
  );
};
