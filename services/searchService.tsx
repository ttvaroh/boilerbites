// dateSearchService.ts
import { supabase } from '../lib/supabase';

export interface DayMenuItem {
  id: string;
  name: string;
  serving_size: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  sugar_g: number | null;
  sodium_mg: number | null;
  vegetarian: boolean | null;
  vegan: boolean | null;
  gluten: boolean | null;
  allergens: string[];
  ingredients: string | null;
  protein_per_100cals: number | null;
  is_collection: boolean | null;
  // Additional context from the day menu
  location_name: string;
  meal_name: string;
  station_name: string;
  serve_date: string;
  meal_start_time: string | null;
  meal_end_time: string | null;
  meal_is_open: boolean;
}

export interface DateSearchFilters {
  locations?: string[]; // Filter by dining halls
  meals?: string[]; // Filter by meal names (e.g., "Breakfast", "Lunch", "Dinner")
  dietaryPreferences?: {
    vegetarian?: boolean;
    vegan?: boolean;
    glutenFree?: boolean;
  };
  excludeAllergens?: string[];
  searchQuery?: string; // Text search within item names
}

export interface DateSearchOptions {
  sortBy?: 'name' | 'calories' | 'protein_g' | 'carbs_g' | 'fat_g' | 'protein_per_100cals';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface DateSearchResult {
  data: DayMenuItem[];
  count: number;
  error: any | null;
}

class DateSearchService {
  /**
   * Search menu items for a specific date
   */
  async searchMenuItemsByDate(
    date: Date | string,
    filters: DateSearchFilters = {},
    options: DateSearchOptions = {}
  ): Promise<DateSearchResult> {
    try {
      // Get current user for custom food filtering
      const { data: { user } } = await supabase.auth.getUser();
      
      // Format date to YYYY-MM-DD
      const formattedDate = typeof date === 'string' 
        ? date 
        : date.toISOString().split('T')[0];
      
      // Map UI allergen names to database allergen names
      const mapAllergensForDatabase = (allergens: string[]): string[] => {
        return allergens.map(allergen => {
          switch (allergen) {
            case 'Dairy':
              return 'Milk';
            default:
              return allergen;
          }
        });
      };

      // Use the optimized SQL function with date parameter
      // The function now returns JSON with { data: [...], total_count: number }
      const { data: responseData, error } = await supabase.rpc('search_menu_items', {
        search_date: formattedDate,
        search_query: filters.searchQuery || '',
        filter_vegetarian: filters.dietaryPreferences?.vegetarian || null,
        filter_vegan: filters.dietaryPreferences?.vegan || null,
        filter_gluten_free: filters.dietaryPreferences?.glutenFree || null,
        exclude_allergens: mapAllergensForDatabase(filters.excludeAllergens || []),
        dining_halls: filters.locations || [],
        meal_types: filters.meals || [],
        available_only: false, // Set to true if you want only currently open meals
        sort_column: options.sortBy || 'name',
        sort_direction: options.sortOrder || 'asc',
        result_limit: options.limit || 50,
        result_offset: options.offset || 0,
        user_id: user?.id || null
      });

      if (error) {
        console.error('Search error:', error);
        return { data: [], count: 0, error };
      }

      // Parse the JSON response
      const result = typeof responseData === 'string' 
        ? JSON.parse(responseData) 
        : responseData;
      
      if (!result || !result.data || result.data.length === 0) {
        return { data: [], count: result?.total_count || 0, error: null };
      }

      // Convert the SQL function results to DayMenuItem format
      const items: DayMenuItem[] = result.data.map((item: any) => ({
        id: item.id,
        name: item.name,
        serving_size: item.serving_size,
        calories: item.calories,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fat_g: item.fat_g,
        fiber_g: item.fiber_g,
        sugar_g: item.sugar_g,
        sodium_mg: item.sodium_mg,
        vegetarian: item.vegetarian,
        vegan: item.vegan,
        gluten: item.gluten,
        allergens: item.allergens || [],
        ingredients: null, // Not returned by SQL function
        protein_per_100cals: item.protein_per_100cals,
        is_collection: null, // Not returned by SQL function
        // Context from the SQL function
        location_name: item.location_name,
        meal_name: item.meal_name,
        station_name: item.station_name,
        serve_date: formattedDate,
        meal_start_time: null, // Not available from SQL function
        meal_end_time: null, // Not available from SQL function
        meal_is_open: null // Not available from SQL function
      }));

      return {
        data: items,
        count: result.total_count || 0, // Use total_count from SQL (unique count computed in SQL)
        error: null
      };
    } catch (err) {
      console.error('Date search service error:', err);
      return {
        data: [],
        count: 0,
        error: err,
      };
    }
  }

  /**
   * Get available locations for a specific date
   */
  async getAvailableLocations(date: Date | string): Promise<string[]> {
    try {
      const formattedDate = typeof date === 'string' 
        ? date 
        : date.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('day_menu')
        .select('location_name')
        .eq('serve_date', formattedDate)
        .eq('is_published', true);

      if (error || !data) {
        console.error('Error fetching locations:', error);
        return [];
      }

      // Return unique location names
      return [...new Set(data.map((item: any) => item.location_name as string))] as string[];
    } catch (err) {
      console.error('Error in getAvailableLocations:', err);
      return [];
    }
  }

  /**
   * Get available meals for a specific date (and optionally location)
   */
  async getAvailableMeals(
    date: Date | string, 
    location?: string
  ): Promise<string[]> {
    try {
      const formattedDate = typeof date === 'string' 
        ? date 
        : date.toISOString().split('T')[0];

      let query = supabase
        .from('day_menu')
        .select('day_meal(meal_name)')
        .eq('serve_date', formattedDate)
        .eq('is_published', true);

      if (location) {
        query = query.eq('location_name', location);
      }

      const { data, error } = await query;

      if (error || !data) {
        console.error('Error fetching meals:', error);
        return [];
      }

      // Extract unique meal names
      const mealNames = new Set<string>();
      for (const menu of data) {
        if (menu.day_meal) {
          for (const meal of menu.day_meal) {
            mealNames.add(meal.meal_name);
          }
        }
      }

      return Array.from(mealNames);
    } catch (err) {
      console.error('Error in getAvailableMeals:', err);
      return [];
    }
  }

  /**
   * Check if a specific date has published menus
   */
  async hasPublishedMenus(date: Date | string): Promise<boolean> {
    try {
      const formattedDate = typeof date === 'string' 
        ? date 
        : date.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('day_menu')
        .select('id')
        .eq('serve_date', formattedDate)
        .eq('is_published', true)
        .limit(1);

      return !error && data && data.length > 0;
    } catch (err) {
      console.error('Error in hasPublishedMenus:', err);
      return false;
    }
  }
}

export const dateSearchService = new DateSearchService();