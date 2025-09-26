// services/searchService.ts
import { supabase } from '../lib/supabase'; // Your supabase client

export interface SearchFilters {
  timeOfDay: string;
  diningHalls: string[];
  dietaryPreferences: {
    vegetarian: boolean;
    vegan: boolean;
    glutenFree: boolean;
  };
  excludeAllergens: string[];
  mealAvailabilityOnly: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  vegetarian?: boolean;
  vegan?: boolean;
  gluten?: boolean;
  allergens?: string[];
  serving_size?: string;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
  protein_per_100cals?: number;
  ingredients?: string;
  last_verified?: string;
  // Additional fields from joins
  location_name?: string;
  meal_name?: string;
  station_name?: string;
  // Support for multiple meals
  meals?: string[];
}

export interface SearchOptions {
  sortBy?: 'calories' | 'protein_g' | 'protein/calorie' | 'carbs_g' | 'fat_g' | 'name';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

class SearchService {
  /**
   * Main search function that builds efficient PostgreSQL queries
   */
  async searchMenuItems(
    query: string = '',
    filters: SearchFilters,
    options: SearchOptions = {}
  ): Promise<{ data: MenuItem[]; count: number; error: any }> {
    const {
      sortBy = 'name',
      sortOrder = 'asc',
      limit = 50,
      offset = 0
    } = options;

    try {
      // Start with base query - join all necessary tables
      let queryBuilder = supabase
        .from('item')
        .select(`
          *,
          day_station_item!inner(
            day_station!inner(
              name,
              day_meal!inner(
                meal_name,
                open,
                start_time,
                end_time,
                day_menu!inner(
                  location_name,
                  serve_date,
                  is_published
                )
              )
            )
          )
        `, { count: 'exact' });

      // Apply text search on item name (case-insensitive, partial match)
      if (query.trim()) {
        queryBuilder = queryBuilder.ilike('name', `%${query.trim()}%`);
      }

      // Apply dietary preference filters
      if (filters.dietaryPreferences.vegetarian) {
        queryBuilder = queryBuilder.eq('vegetarian', true);
      }
      if (filters.dietaryPreferences.vegan) {
        queryBuilder = queryBuilder.eq('vegan', true);
      }
      if (filters.dietaryPreferences.glutenFree) {
        queryBuilder = queryBuilder.eq('gluten', false);
      }

      // Exclude allergens - PostgreSQL array operations
      if (filters.excludeAllergens.length > 0) {
        // Items that don't contain any of the excluded allergens
        const allergenConditions = filters.excludeAllergens.map(allergen => 
          `not allergens @> '["${allergen}"]'`
        ).join(' and ');
        queryBuilder = queryBuilder.or(allergenConditions);
      }

      // Filter by dining halls
      if (filters.diningHalls.length > 0) {
        queryBuilder = queryBuilder.in('day_station_item.day_station.day_meal.day_menu.location_name', filters.diningHalls);
      }

      // Filter by time of day (meal type)
      if (filters.timeOfDay !== 'All') {
        queryBuilder = queryBuilder.eq('day_station_item.day_station.day_meal.meal_name', filters.timeOfDay);
      }

      // Filter for meal availability only
      if (filters.mealAvailabilityOnly) {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        
        queryBuilder = queryBuilder
          .eq('day_station_item.day_station.day_meal.day_menu.serve_date', today)
          .eq('day_station_item.day_station.day_meal.day_menu.is_published', true)
          .eq('day_station_item.day_station.day_meal.open', true);
      }

      // Apply sorting
      const sortColumn = this.getSortColumn(sortBy);
      queryBuilder = queryBuilder.order(sortColumn, { 
        ascending: sortOrder === 'asc',
        nullsFirst: false 
      });

      // Apply pagination
      queryBuilder = queryBuilder.range(offset, offset + limit - 1);

      const { data, error, count } = await queryBuilder;

      if (error) {
        console.error('Search error:', error);
        return { data: [], count: 0, error };
      }

      // Transform the nested data structure
      const transformedData = this.transformSearchResults(data || []);

      return {
        data: transformedData,
        count: count || 0,
        error: null
      };

    } catch (error) {
      console.error('Search service error:', error);
      return { data: [], count: 0, error };
    }
  }

  /**
   * Get currently available items (faster query for "what's open now")
   */
  async getCurrentlyAvailableItems(
    query: string = '',
    sortBy: string = 'name',
    sortOrder: 'asc' | 'desc' = 'asc'
  ): Promise<{ data: MenuItem[]; error: any }> {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS format

    try {
      let queryBuilder = supabase
        .from('item')
        .select(`
          *,
          day_station_item!inner(
            day_station!inner(
              name,
              day_meal!inner(
                meal_name,
                open,
                start_time,
                end_time,
                day_menu!inner(
                  location_name,
                  serve_date,
                  is_published
                )
              )
            )
          )
        `)
        .eq('day_station_item.day_station.day_meal.day_menu.serve_date', today)
        .eq('day_station_item.day_station.day_meal.day_menu.is_published', true)
        .eq('day_station_item.day_station.day_meal.open', true)
        .lte('day_station_item.day_station.day_meal.start_time', currentTime)
        .gte('day_station_item.day_station.day_meal.end_time', currentTime);

      if (query.trim()) {
        queryBuilder = queryBuilder.ilike('name', `%${query.trim()}%`);
      }

      const sortColumn = this.getSortColumn(sortBy);
      queryBuilder = queryBuilder.order(sortColumn, { 
        ascending: sortOrder === 'asc',
        nullsFirst: false 
      });

      const { data, error } = await queryBuilder;

      return {
        data: this.transformSearchResults(data || []),
        error
      };

    } catch (error) {
      console.error('Currently available items error:', error);
      return { data: [], error };
    }
  }

  /**
   * Get popular/trending items (based on frequency in menus)
   */
  async getPopularItems(limit: number = 20): Promise<{ data: MenuItem[]; error: any }> {
    try {
      // This query gets items that appear most frequently across different meals
      const { data, error } = await supabase
        .from('item')
        .select(`
          *,
          day_station_item(count)
        `)
        .order('day_station_item.count', { ascending: false })
        .limit(limit);

      return {
        data: data || [],
        error
      };

    } catch (error) {
      console.error('Popular items error:', error);
      return { data: [], error };
    }
  }

  /**
   * Search suggestions/autocomplete
   */
  async getSearchSuggestions(query: string, limit: number = 10): Promise<string[]> {
    if (!query.trim() || query.length < 2) return [];

    try {
      const { data, error } = await supabase
        .from('item')
        .select('name')
        .ilike('name', `%${query.trim()}%`)
        .limit(limit);

      if (error) {
        console.error('Search suggestions error:', error);
        return [];
      }

      return (data || []).map(item => item.name);

    } catch (error) {
      console.error('Search suggestions error:', error);
      return [];
    }
  }

  /**
   * Helper method to map sort options to database columns
   */
  private getSortColumn(sortBy: string): string {
    const sortMapping: Record<string, string> = {
      'calories': 'calories',
      'protein': 'protein_g',
      'protein_g': 'protein_g',
      'protein/calorie': 'protein_per_100cals',
      'carbs': 'carbs_g',
      'carbs_g': 'carbs_g',
      'fat': 'fat_g',
      'fat_g': 'fat_g',
      'name': 'name'
    };

    return sortMapping[sortBy.toLowerCase()] || 'name';
  }

  /**
   * Transform nested query results into flat MenuItem objects
   */
  private transformSearchResults(data: any[]): MenuItem[] {
    return data.map(item => {
      // Extract nested data from joins
      const stationItem = item.day_station_item?.[0];
      const station = stationItem?.day_station;
      const meal = station?.day_meal;
      const menu = meal?.day_menu;

      // Collect all unique meals for this item
      const allMeals = new Set<string>();
      if (item.day_station_item) {
        item.day_station_item.forEach((stationItem: any) => {
          const mealName = stationItem?.day_station?.day_meal?.meal_name;
          if (mealName) {
            allMeals.add(mealName);
          }
        });
      }

      // Sort meals in the correct order: Breakfast, Lunch, Late Lunch, Dinner
      const mealOrder = ['Breakfast', 'Lunch', 'Late Lunch', 'Dinner'];
      const sortedMeals = Array.from(allMeals).sort((a, b) => {
        const aIndex = mealOrder.indexOf(a);
        const bIndex = mealOrder.indexOf(b);
        
        // If both meals are in the predefined order, sort by that order
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        }
        
        // If only one meal is in the predefined order, prioritize it
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        
        // If neither meal is in the predefined order, sort alphabetically
        return a.localeCompare(b);
      });

      return {
        id: item.id,
        name: item.name,
        vegetarian: item.vegetarian,
        vegan: item.vegan,
        gluten: item.gluten,
        allergens: item.allergens || [],
        serving_size: item.serving_size,
        calories: item.calories,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fat_g: item.fat_g,
        fiber_g: item.fiber_g,
        sugar_g: item.sugar_g,
        sodium_mg: item.sodium_mg,
        protein_per_100cals: item.protein_per_100cals,
        last_verified: item.last_verified,
        // Additional context from joins
        location_name: menu?.location_name,
        meal_name: meal?.meal_name,
        station_name: station?.name,
        // All meals this item is available for (sorted in correct order)
        meals: sortedMeals,
      };
    });
  }
}

export const searchService = new SearchService();