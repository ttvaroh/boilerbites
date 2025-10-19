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
      // Format date to YYYY-MM-DD
      const formattedDate = typeof date === 'string' 
        ? date 
        : date.toISOString().split('T')[0];

      // Start building the query
      let query = supabase
        .from('day_menu')
        .select(`
          id,
          serve_date,
          location_name,
          day_meal!inner (
            id,
            meal_name,
            meal_order,
            open,
            start_time,
            end_time,
            day_station!inner (
              id,
              name,
              display_order,
              day_station_item!inner (
                id,
                item!inner (
                  id,
                  name,
                  serving_size,
                  calories,
                  protein_g,
                  carbs_g,
                  fat_g,
                  fiber_g,
                  sugar_g,
                  sodium_mg,
                  vegetarian,
                  vegan,
                  gluten,
                  allergens,
                  ingredients,
                  protein_per_100cals,
                  is_collection
                )
              )
            )
          )
        `)
        .eq('serve_date', formattedDate)
        .eq('is_published', true);

      // Apply location filters
      if (filters.locations && filters.locations.length > 0) {
        query = query.in('location_name', filters.locations);
      }

      // Execute the query
      const { data, error } = await query;

      if (error) {
        console.error('Date search error:', error);
        return { data: [], count: 0, error };
      }

      if (!data || data.length === 0) {
        return { data: [], count: 0, error: null };
      }

      // Flatten the nested structure into an array of menu items
      const items: DayMenuItem[] = [];
      
      for (const dayMenu of data) {
        for (const dayMeal of dayMenu.day_meal) {
          // Apply meal filter
          if (filters.meals && filters.meals.length > 0) {
            if (!filters.meals.includes(dayMeal.meal_name)) {
              continue;
            }
          }

          for (const dayStation of dayMeal.day_station) {
            for (const stationItem of dayStation.day_station_item) {
              const item = stationItem.item as any;

              // Apply dietary preference filters
              if (filters.dietaryPreferences) {
                if (filters.dietaryPreferences.vegetarian && !item.vegetarian) {
                  continue;
                }
                if (filters.dietaryPreferences.vegan && !item.vegan) {
                  continue;
                }
                if (filters.dietaryPreferences.glutenFree && item.gluten) {
                  continue;
                }
              }

              // Apply allergen exclusions
              if (filters.excludeAllergens && filters.excludeAllergens.length > 0) {
                const hasExcludedAllergen = item.allergens?.some((allergen: string) =>
                  filters.excludeAllergens!.includes(allergen)
                );
                if (hasExcludedAllergen) {
                  continue;
                }
              }

              // Apply text search filter
              if (filters.searchQuery && filters.searchQuery.trim()) {
                const searchLower = filters.searchQuery.toLowerCase();
                if (!item.name.toLowerCase().includes(searchLower)) {
                  continue;
                }
              }

              // Add the flattened item
              items.push({
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
                ingredients: item.ingredients,
                protein_per_100cals: item.protein_per_100cals,
                is_collection: item.is_collection,
                location_name: dayMenu.location_name,
                meal_name: dayMeal.meal_name,
                station_name: dayStation.name,
                serve_date: dayMenu.serve_date,
                meal_start_time: dayMeal.start_time,
                meal_end_time: dayMeal.end_time,
                meal_is_open: dayMeal.open,
              });
            }
          }
        }
      }

      // Apply sorting
      const sortBy = options.sortBy || 'name';
      const sortOrder = options.sortOrder || 'asc';

      items.sort((a, b) => {
        let aVal: any = a[sortBy];
        let bVal: any = b[sortBy];

        // Handle null values
        if (aVal === null || aVal === undefined) aVal = sortOrder === 'asc' ? Infinity : -Infinity;
        if (bVal === null || bVal === undefined) bVal = sortOrder === 'asc' ? Infinity : -Infinity;

        // Handle string comparison
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortOrder === 'asc' 
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }

        // Handle numeric comparison
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      });

      // Apply pagination
      const totalCount = items.length;
      const limit = options.limit || totalCount;
      const offset = options.offset || 0;
      const paginatedItems = items.slice(offset, offset + limit);

      return {
        data: paginatedItems,
        count: totalCount,
        error: null,
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
      return [...new Set(data.map((item: any) => item.location_name))];
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