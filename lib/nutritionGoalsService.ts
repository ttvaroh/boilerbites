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
  const { data, error } = await supabase
    .from('nutrition_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();
  
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
}): Promise<NutritionGoals> => {
  // Try to update first
  const { data: existing } = await supabase
    .from('nutrition_preferences')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (existing) {
    // Update existing
    const { data, error } = await supabase
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
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } else {
    // Insert new
    const { data, error } = await supabase
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
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
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
}): Promise<NutritionGoals> => {
  const { data, error } = await supabase
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
    return await upsertNutritionGoals(userId, DEFAULT_GOALS);
  } catch (error) {
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
