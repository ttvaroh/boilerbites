import { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface FoodEntry {
  item_id: string;
  quantity: number;
  created_at?: string;
  location_name?: string;
  meal_name?: number; // 0=uncategorized, 1=breakfast, 2=lunch, 3=dinner, 4=snack
}

interface DailyNutrition {
  id: string;
  user_id: string;
  date: string;
  goal_calories: number;
  goal_protein_g: number;
  goal_carbs_g: number;
  goal_fat_g: number;
  consumed_calories: number;
  consumed_protein_g: number;
  consumed_carbs_g: number;
  consumed_fat_g: number;
  remaining_calories: number;
  remaining_protein_g: number;
  remaining_carbs_g: number;
  remaining_fat_g: number;
  percent_calories: number;
  percent_protein: number;
  percent_carbs: number;
  percent_fat: number;
}

interface FavoriteItem {
  id: string;
  user_id: string;
  item_id: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>;
  signInWithAzure: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  addFoodEntry: (foodEntry: FoodEntry) => Promise<{ error: any }>;
  removeFoodEntry: (entryId: string) => Promise<{ error: any }>;
  toggleFavorite: (itemId: string) => Promise<{ error: any; isFavorited: boolean }>;
  getFavorites: () => Promise<{ data: FavoriteItem[] | null; error: any }>;
  getDailyNutrition: (date?: string) => Promise<{ data: DailyNutrition | null; error: any }>;
  updateDailyGoals: (date: string, goals: { calories?: number; protein?: number; carbs?: number; fat?: number; }) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signInWithAzure: async () => ({ error: null }),
  signOut: async () => {},
  addFoodEntry: async () => ({ error: null }),
  removeFoodEntry: async () => ({ error: null }),
  toggleFavorite: async () => ({ error: null, isFavorited: false }),
  getFavorites: async () => ({ data: null, error: null }),
  getDailyNutrition: async () => ({ data: null, error: null }),
  updateDailyGoals: async () => ({ error: null }),
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });
    return { error };
  };

  const signInWithAzure = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: 'boilerbites://auth/callback',
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const addFoodEntry = async (foodEntry: FoodEntry) => {
    if (!user) {
      return { error: new Error('User not authenticated') };
    }

    const { error } = await supabase
      .from('food_entry')
      .insert({
        user_id: user.id,
        item_id: foodEntry.item_id,
        quantity: foodEntry.quantity,
        created_at: foodEntry.created_at || new Date().toISOString(),
        location_name: foodEntry.location_name,
        meal_name: foodEntry.meal_name || 0, // Default to uncategorized
      });

    return { error };
  };

  const removeFoodEntry = async (entryId: string) => {
    if (!user) {
      return { error: new Error('User not authenticated') };
    }

    const { error } = await supabase
      .from('food_entry')
      .delete()
      .eq('id', entryId)
      .eq('user_id', user.id); // Ensure user can only delete their own entries

    return { error };
  };

  const getDailyNutrition = async (date?: string) => {
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    const targetDate = date || new Date().toISOString().split('T')[0];

    try {
      // First, try to get existing record
      const { data: existingData, error: fetchError } = await supabase
        .from('user_daily_nutrition')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', targetDate)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching daily nutrition:', fetchError);
        return { data: null, error: fetchError };
      }

      // If record exists, return it with calculated fields
      if (existingData) {
        const goal_calories = existingData.goal_calories || 2300;
        const goal_protein_g = existingData.goal_protein_g || 115;
        const goal_carbs_g = existingData.goal_carbs_g || 288;
        const goal_fat_g = existingData.goal_fat_g || 77;
        
        const consumed_calories = existingData.consumed_calories || 0;
        const consumed_protein_g = existingData.consumed_protein_g || 0;
        const consumed_carbs_g = existingData.consumed_carbs_g || 0;
        const consumed_fat_g = existingData.consumed_fat_g || 0;

        const result: DailyNutrition = {
          id: existingData.id,
          user_id: existingData.user_id,
          date: existingData.date,
          goal_calories,
          goal_protein_g,
          goal_carbs_g,
          goal_fat_g,
          consumed_calories,
          consumed_protein_g,
          consumed_carbs_g,
          consumed_fat_g,
          remaining_calories: goal_calories - consumed_calories,
          remaining_protein_g: goal_protein_g - consumed_protein_g,
          remaining_carbs_g: goal_carbs_g - consumed_carbs_g,
          remaining_fat_g: goal_fat_g - consumed_fat_g,
          percent_calories: goal_calories > 0 ? (consumed_calories / goal_calories * 100) : 0,
          percent_protein: goal_protein_g > 0 ? (consumed_protein_g / goal_protein_g * 100) : 0,
          percent_carbs: goal_carbs_g > 0 ? (consumed_carbs_g / goal_carbs_g * 100) : 0,
          percent_fat: goal_fat_g > 0 ? (consumed_fat_g / goal_fat_g * 100) : 0,
        };

        return { data: result, error: null };
      }

      // If no record exists, return baseline values without creating database record
      const baselineGoals = {
        goal_calories: 2300,
        goal_protein_g: 115,
        goal_carbs_g: 288,
        goal_fat_g: 77,
      };

      const baselineConsumed = {
        consumed_calories: 0,
        consumed_protein_g: 0,
        consumed_carbs_g: 0,
        consumed_fat_g: 0,
      };

      const result: DailyNutrition = {
        id: '', // No database record, so no ID
        user_id: user.id,
        date: targetDate,
        goal_calories: baselineGoals.goal_calories,
        goal_protein_g: baselineGoals.goal_protein_g,
        goal_carbs_g: baselineGoals.goal_carbs_g,
        goal_fat_g: baselineGoals.goal_fat_g,
        consumed_calories: baselineConsumed.consumed_calories,
        consumed_protein_g: baselineConsumed.consumed_protein_g,
        consumed_carbs_g: baselineConsumed.consumed_carbs_g,
        consumed_fat_g: baselineConsumed.consumed_fat_g,
        remaining_calories: baselineGoals.goal_calories - baselineConsumed.consumed_calories,
        remaining_protein_g: baselineGoals.goal_protein_g - baselineConsumed.consumed_protein_g,
        remaining_carbs_g: baselineGoals.goal_carbs_g - baselineConsumed.consumed_carbs_g,
        remaining_fat_g: baselineGoals.goal_fat_g - baselineConsumed.consumed_fat_g,
        percent_calories: baselineGoals.goal_calories > 0 ? (baselineConsumed.consumed_calories / baselineGoals.goal_calories * 100) : 0,
        percent_protein: baselineGoals.goal_protein_g > 0 ? (baselineConsumed.consumed_protein_g / baselineGoals.goal_protein_g * 100) : 0,
        percent_carbs: baselineGoals.goal_carbs_g > 0 ? (baselineConsumed.consumed_carbs_g / baselineGoals.goal_carbs_g * 100) : 0,
        percent_fat: baselineGoals.goal_fat_g > 0 ? (baselineConsumed.consumed_fat_g / baselineGoals.goal_fat_g * 100) : 0,
      };

      return { data: result, error: null };
    } catch (error) {
      console.error('Error in getDailyNutrition:', error);
      return { data: null, error: error as Error };
    }
  };

  const updateDailyGoals = async (
    date: string,
    goals: {
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
    }
  ) => {
    if (!user) {
      return { error: new Error('User not authenticated') };
    }

    // First, try to update existing record
    const { error: updateError } = await supabase
      .from('user_daily_nutrition')
      .update({
        goal_calories: goals.calories,
        goal_protein_g: goals.protein,
        goal_carbs_g: goals.carbs,
        goal_fat_g: goals.fat,
      })
      .eq('user_id', user.id)
      .eq('date', date);

    // If update failed (likely because no record exists), create a new one
    if (updateError) {
      const { error: insertError } = await supabase
        .from('user_daily_nutrition')
        .insert({
          user_id: user.id,
          date: date,
          goal_calories: goals.calories || 2300,
          goal_protein_g: goals.protein || 115,
          goal_carbs_g: goals.carbs || 288,
          goal_fat_g: goals.fat || 77,
          consumed_calories: 0,
          consumed_protein_g: 0,
          consumed_carbs_g: 0,
          consumed_fat_g: 0,
        });

      if (insertError) {
        console.error('Error creating daily nutrition record:', insertError);
        return { error: insertError };
      }
    }

    return { error: null };
  };

  const toggleFavorite = async (itemId: string) => {
    if (!user) {
      return { error: new Error('User not authenticated'), isFavorited: false };
    }

    // Check if item is already favorited
    const { data: existingFavorite, error: checkError } = await supabase
      .from('favorite_item')
      .select('id')
      .eq('user_id', user.id)
      .eq('item_id', itemId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      return { error: checkError, isFavorited: false };
    }

    if (existingFavorite) {
      // Remove from favorites
      const { error } = await supabase
        .from('favorite_item')
        .delete()
        .eq('user_id', user.id)
        .eq('item_id', itemId);

      return { error, isFavorited: false };
    } else {
      // Add to favorites
      const { error } = await supabase
        .from('favorite_item')
        .insert({
          user_id: user.id,
          item_id: itemId,
        });

      return { error, isFavorited: true };
    }
  };

  const getFavorites = async () => {
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    const { data, error } = await supabase
      .from('favorite_item')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    return { data, error };
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signInWithAzure,
    signOut,
    addFoodEntry,
    removeFoodEntry,
    toggleFavorite,
    getFavorites,
    getDailyNutrition,
    updateDailyGoals,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
