import { isJWTExpiredError } from './authUtils';
import { supabase } from './supabase';

export interface NutritionGoals {
  id?: string;
  user_id: string;
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
  vegan_preference?: boolean;
  vegetarian_preference?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Default nutrition goals based on average adult needs
const DEFAULT_GOALS = {
  calories: 2300,
  protein: 144,
  carbs: 288,
  fat: 64,
};

// Fetch user's nutrition goals
export const fetchNutritionGoals = async (userId: string): Promise<NutritionGoals | null> => {
  let { data, error } = await supabase
    .from('nutrition_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  
  // If JWT expired, try to refresh and retry once
  if (error && isJWTExpiredError(error)) {
    try {
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (!refreshError) {
        // Retry the query after refresh
        const retryResult = await supabase
          .from('nutrition_preferences')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        data = retryResult.data;
        error = retryResult.error;
      }
    } catch (refreshErr) {
      console.warn('Error refreshing session:', refreshErr);
    }
  }
  
  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
    console.error('Error fetching goals:', error);
    return null;
  }
  
  return data;
};

// Save or update nutrition goals
export const saveNutritionGoals = async (userId: string, goals: {
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
  vegan_preference?: boolean;
  vegetarian_preference?: boolean;
}): Promise<NutritionGoals> => {
  // Try to update first
  let { data: existing, error: checkError } = await supabase
    .from('nutrition_preferences')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  // If JWT expired, try to refresh and retry once
  if (checkError && isJWTExpiredError(checkError)) {
    try {
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (!refreshError) {
        const retryResult = await supabase
          .from('nutrition_preferences')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();
        existing = retryResult.data;
        checkError = retryResult.error;
      }
    } catch (refreshErr) {
      console.warn('Error refreshing session:', refreshErr);
    }
  }

  if (existing) {
    // Update existing
    let { data, error } = await supabase
      .from('nutrition_preferences')
      .update({
        calories: goals.calories,
        protein: goals.protein,
        carbs: goals.carbs,
        fat: goals.fat,
        dairy_allergy: goals.dairy_allergy,
        gluten_allergy: goals.gluten_allergy,
        nuts_allergy: goals.nuts_allergy,
        soy_allergy: goals.soy_allergy,
        eggs_allergy: goals.eggs_allergy,
        shellfish_allergy: goals.shellfish_allergy,
        fish_allergy: goals.fish_allergy,
        peanut_allergy: goals.peanut_allergy,
        vegan_preference: goals.vegan_preference,
        vegetarian_preference: goals.vegetarian_preference,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();
    
    // If JWT expired, try to refresh and retry once
    if (error && isJWTExpiredError(error)) {
      try {
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (!refreshError) {
          const retryResult = await supabase
            .from('nutrition_preferences')
            .update({
              calories: goals.calories,
              protein: goals.protein,
              carbs: goals.carbs,
              fat: goals.fat,
              dairy_allergy: goals.dairy_allergy,
              gluten_allergy: goals.gluten_allergy,
              nuts_allergy: goals.nuts_allergy,
              soy_allergy: goals.soy_allergy,
              eggs_allergy: goals.eggs_allergy,
              shellfish_allergy: goals.shellfish_allergy,
              fish_allergy: goals.fish_allergy,
              peanut_allergy: goals.peanut_allergy,
              vegan_preference: goals.vegan_preference,
              vegetarian_preference: goals.vegetarian_preference,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId)
            .select()
            .single();
          data = retryResult.data;
          error = retryResult.error;
        }
      } catch (refreshErr) {
        console.warn('Error refreshing session:', refreshErr);
      }
    }
    
    if (error) throw error;
    return data!;
  } else {
    // Insert new
    let { data, error } = await supabase
      .from('nutrition_preferences')
      .insert({ 
        user_id: userId,
        calories: goals.calories,
        protein: goals.protein,
        carbs: goals.carbs,
        fat: goals.fat,
        dairy_allergy: goals.dairy_allergy,
        gluten_allergy: goals.gluten_allergy,
        nuts_allergy: goals.nuts_allergy,
        soy_allergy: goals.soy_allergy,
        eggs_allergy: goals.eggs_allergy,
        shellfish_allergy: goals.shellfish_allergy,
        fish_allergy: goals.fish_allergy,
        peanut_allergy: goals.peanut_allergy,
        vegan_preference: goals.vegan_preference,
        vegetarian_preference: goals.vegetarian_preference,
      })
      .select()
      .single();
    
    // If JWT expired, try to refresh and retry once
    if (error && isJWTExpiredError(error)) {
      try {
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (!refreshError) {
          const retryResult = await supabase
            .from('nutrition_preferences')
            .insert({ 
              user_id: userId,
              calories: goals.calories,
              protein: goals.protein,
              carbs: goals.carbs,
              fat: goals.fat,
              dairy_allergy: goals.dairy_allergy,
              gluten_allergy: goals.gluten_allergy,
              nuts_allergy: goals.nuts_allergy,
              soy_allergy: goals.soy_allergy,
              eggs_allergy: goals.eggs_allergy,
              shellfish_allergy: goals.shellfish_allergy,
              fish_allergy: goals.fish_allergy,
              peanut_allergy: goals.peanut_allergy,
              vegan_preference: goals.vegan_preference,
              vegetarian_preference: goals.vegetarian_preference,
            })
            .select()
            .single();
          data = retryResult.data;
          error = retryResult.error;
        }
      } catch (refreshErr) {
        console.warn('Error refreshing session:', refreshErr);
      }
    }
    
    if (error) throw error;
    return data!;
  }
};

// Upsert nutrition goals (simpler approach)
export const upsertNutritionGoals = async (userId: string, goals: {
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
  vegan_preference?: boolean;
  vegetarian_preference?: boolean;
}): Promise<NutritionGoals | null> => {
  let { data, error } = await supabase
    .from('nutrition_preferences')
    .upsert(
      { 
        user_id: userId, 
        calories: goals.calories,
        protein: goals.protein,
        carbs: goals.carbs,
        fat: goals.fat,
        dairy_allergy: goals.dairy_allergy,
        gluten_allergy: goals.gluten_allergy,
        nuts_allergy: goals.nuts_allergy,
        soy_allergy: goals.soy_allergy,
        eggs_allergy: goals.eggs_allergy,
        shellfish_allergy: goals.shellfish_allergy,
        fish_allergy: goals.fish_allergy,
        peanut_allergy: goals.peanut_allergy,
        vegan_preference: goals.vegan_preference,
        vegetarian_preference: goals.vegetarian_preference,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single();
  
  // If JWT expired, try to refresh and retry once
  if (error && isJWTExpiredError(error)) {
    try {
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (!refreshError) {
        const retryResult = await supabase
          .from('nutrition_preferences')
          .upsert(
            { 
              user_id: userId, 
              calories: goals.calories,
              protein: goals.protein,
              carbs: goals.carbs,
              fat: goals.fat,
              dairy_allergy: goals.dairy_allergy,
              gluten_allergy: goals.gluten_allergy,
              nuts_allergy: goals.nuts_allergy,
              soy_allergy: goals.soy_allergy,
              eggs_allergy: goals.eggs_allergy,
              shellfish_allergy: goals.shellfish_allergy,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          )
          .select()
          .single();
        data = retryResult.data;
        error = retryResult.error;
      }
    } catch (refreshErr) {
      console.warn('Error refreshing session:', refreshErr);
    }
  }
  
  if (error) throw error;
  return data;
};

// Get or create default nutrition goals for a user
export const getOrCreateNutritionGoals = async (userId: string): Promise<NutritionGoals> => {
  try {
    // Try to fetch existing goals
    const existingGoals = await fetchNutritionGoals(userId);
    
    if (existingGoals) {
      return existingGoals;
    }
    
    // If no goals exist, create default ones
    console.log('No nutrition goals found, creating default goals for user:', userId);
    let result = await upsertNutritionGoals(userId, DEFAULT_GOALS);
    
    // If JWT expired during upsert, try to refresh and retry once
    if (!result && typeof result !== 'object') {
      // Check if there was an error (result would be null/undefined on error)
      // Try refresh and retry
      try {
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (!refreshError) {
          result = await upsertNutritionGoals(userId, DEFAULT_GOALS);
        }
      } catch (refreshErr) {
        console.warn('Error refreshing session during upsert:', refreshErr);
      }
    }
    
    if (result) {
      return result;
    }
    
    // Fallback to default goals if upsert failed
    return {
      user_id: userId,
      ...DEFAULT_GOALS,
    };
  } catch (error: any) {
    // If JWT expired, try to refresh and retry once
    if (isJWTExpiredError(error)) {
      try {
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (!refreshError) {
          // Retry the entire operation
          const existingGoals = await fetchNutritionGoals(userId);
          if (existingGoals) {
            return existingGoals;
          }
          const result = await upsertNutritionGoals(userId, DEFAULT_GOALS);
          if (result) {
            return result;
          }
        }
      } catch (refreshErr) {
        console.warn('Error refreshing session:', refreshErr);
      }
    }
    
    console.error('Error getting or creating nutrition goals:', error);
    // Return default goals as fallback
    return {
      user_id: userId,
      ...DEFAULT_GOALS,
    };
  }
};

// Calculate suggested macros based on calorie goal
export const calculateSuggestedMacros = (calories: number) => {
  // Standard macro split: 30% protein, 40% carbs, 30% fat
  const proteinCalories = calories * 0.30;
  const carbsCalories = calories * 0.40;
  const fatCalories = calories * 0.30;

  return {
    protein: Math.round(proteinCalories / 4), // 4 cal per gram of protein
    carbs: Math.round(carbsCalories / 4),     // 4 cal per gram of carbs
    fat: Math.round(fatCalories / 9),         // 9 cal per gram of fat
  };
};
