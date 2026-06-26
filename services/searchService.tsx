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
  is_custom_meal: boolean | null;
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

// Short-lived client cache for date-search RPC results. Repeated identical
// queries (date flips back/forth, sort toggles, re-entering the screen) are
// served from memory instead of re-hitting search_menu_items, cutting egress.
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const SEARCH_CACHE_MAX_ENTRIES = 50;

interface SearchCacheEntry {
  expiresAt: number;
  result: DateSearchResult;
}

const searchResultCache = new Map<string, SearchCacheEntry>();

function getCachedSearch(key: string): DateSearchResult | null {
  const entry = searchResultCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    searchResultCache.delete(key);
    return null;
  }
  // Refresh recency for simple LRU eviction.
  searchResultCache.delete(key);
  searchResultCache.set(key, entry);
  return entry.result;
}

function setCachedSearch(key: string, result: DateSearchResult): void {
  if (searchResultCache.size >= SEARCH_CACHE_MAX_ENTRIES) {
    const oldest = searchResultCache.keys().next().value;
    if (oldest !== undefined) {
      searchResultCache.delete(oldest);
    }
  }
  searchResultCache.set(key, {
    expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
    result,
  });
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
      // Get current user for custom food filtering (local session read, no network round-trip)
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      
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
      const rpcParams = {
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
        result_limit: options.limit || 30,
        result_offset: options.offset || 0,
        user_id: user?.id || null
      };

      // Serve identical recent queries from the client cache.
      const cacheKey = JSON.stringify(rpcParams);
      const cached = getCachedSearch(cacheKey);
      if (cached) {
        return cached;
      }

      const { data: responseData, error } = await supabase.rpc('search_menu_items', rpcParams);

      if (error) {
        console.error('Search error:', error);
        return { data: [], count: 0, error };
      }

      // Parse the JSON response
      const result = typeof responseData === 'string' 
        ? JSON.parse(responseData) 
        : responseData;
      
      if (!result || !result.data || result.data.length === 0) {
        const emptyResult: DateSearchResult = {
          data: [],
          count: result?.total_count || 0,
          error: null,
        };
        setCachedSearch(cacheKey, emptyResult);
        return emptyResult;
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
        is_collection: item.is_collection ?? null,
        is_custom_meal: item.is_custom_meal ?? null,
        // Context from the SQL function
        location_name: item.location_name,
        meal_name: item.meal_name,
        station_name: item.station_name,
        serve_date: formattedDate,
        meal_start_time: null, // Not available from SQL function
        meal_end_time: null, // Not available from SQL function
        meal_is_open: null // Not available from SQL function
      }));

      const finalResult: DateSearchResult = {
        data: items,
        count: result.total_count || 0, // Use total_count from SQL (unique count computed in SQL)
        error: null,
      };
      setCachedSearch(cacheKey, finalResult);
      return finalResult;
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

// FatSecret API Interfaces and Service
export interface FatSecretSearchFilters {
  searchQuery?: string;
  dietaryPreferences?: {
    vegetarian?: boolean;
    vegan?: boolean;
    glutenFree?: boolean;
  };
  excludeAllergens?: string[];
}

export interface FatSecretSearchOptions {
  limit?: number;
  offset?: number;
}

export interface FatSecretSearchResult {
  data: any[]; // MenuItem format
  count: number;
  error: any | null;
}

export interface FatSecretBarcodeResult {
  data: any | null; // MenuItem format (single item)
  error: any | null;
  notFound: boolean; // true if error code 211
}

// FatSecret API Interfaces and Service
interface FatSecretServing {
  serving_id: string;
  serving_description?: string;
  metric_serving_amount?: string;
  metric_serving_unit?: string;
  number_of_units?: string;
  measurement_description?: string;
  calories?: string;
  carbohydrate?: string;
  protein?: string;
  fat?: string;
  fiber?: string;
  sugar?: string;
  sodium?: string;
  cholesterol?: string;
}

interface FatSecretAllergen {
  id: string;
  name: string;
  value: string;
}

interface FatSecretPreference {
  id: string;
  name: string;
  value: string;
}

interface FatSecretFoodAttributes {
  allergens?: {
    allergen: FatSecretAllergen | FatSecretAllergen[];
  };
  preferences?: {
    preference: FatSecretPreference | FatSecretPreference[];
  };
}

interface FatSecretFood {
  food_id: string;
  food_name: string;
  food_type: string;
  brand_name?: string;
  food_attributes?: FatSecretFoodAttributes;
  servings?: {
    serving: FatSecretServing | FatSecretServing[];
  };
}

interface FatSecretFoodsSearchResponse {
  foods_search?: {
    total_results?: string;
    max_results?: string;
    page_number?: string;
    results?: {
      food: FatSecretFood | FatSecretFood[];
    };
  };
}

class FatSecretSearchService {
  private maxPageSize = 50;
  private proxyUrl: string;

  constructor() {
    // Use Supabase Edge Function proxy URL
    // This will be set via environment variable or use default Supabase function path
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
    this.proxyUrl = `${supabaseUrl}/functions/v1/fatsecret-proxy`;
  }

  /**
   * Normalizes barcode to GTIN-13 format (13 digits, zero-padded).
   * Handles UPC-A (12 digits), EAN-13 (13 digits), and EAN-8 (8 digits).
   */
  private normalizeBarcodeToGTIN13(barcode: string): string {
    // Remove all non-digit characters
    const cleaned = barcode.trim().replace(/\D/g, '');
    
    if (cleaned.length === 12) {
      // UPC-A: pad with leading zero
      return '0' + cleaned;
    } else if (cleaned.length === 13) {
      // EAN-13: use as-is
      return cleaned;
    } else if (cleaned.length === 8) {
      // EAN-8: pad with leading zeros
      return cleaned.padStart(13, '0');
    } else if (cleaned.length < 13) {
      // Pad shorter codes
      return cleaned.padStart(13, '0');
    } else {
      // Already 13+ digits, take first 13
      return cleaned.substring(0, 13);
    }
  }

  async searchFoods(
    filters: FatSecretSearchFilters = {},
    options: FatSecretSearchOptions = {}
  ): Promise<FatSecretSearchResult> {
    try {
      const query = filters.searchQuery?.trim();
      if (!query) {
        return { data: [], count: 0, error: null };
      }

      const limit = Math.min(options.limit || 20, this.maxPageSize);
      const offset = options.offset || 0;

      // Call Supabase Edge Function proxy instead of FatSecret directly
      const { data, error } = await supabase.functions.invoke('fatsecret-proxy', {
        body: {
          query: query,
          limit: limit,
          offset: offset,
        },
      });

      if (error) {
        console.error("[FatSecretSearch] Proxy error", error);
        return {
          data: [],
          count: 0,
          error: new Error(error.message || "FatSecret proxy request failed"),
        };
      }

      if (!data) {
        console.error("[FatSecretSearch] No data returned from proxy");
        return {
          data: [],
          count: 0,
          error: new Error("No data returned from FatSecret proxy"),
        };
      }

      // Handle error response from proxy
      if (data.error) {
        console.error("[FatSecretSearch] FatSecret API error", data.error);
        return {
          data: [],
          count: 0,
          error: new Error(data.error),
        };
      }

      const json = data as FatSecretFoodsSearchResponse;
      const foods = this.extractFoods(json);
      const mappedItems = foods.map(food => this.mapFoodToMenuItem(food));
      const totalResults = this.parseNumber(json.foods_search?.total_results) || mappedItems.length;

      return {
        data: mappedItems,
        count: totalResults,
        error: null,
      };
    } catch (err) {
      console.error("FatSecret search service error:", err);
      return {
        data: [],
        count: 0,
        error: err,
      };
    }
  }

  private extractFoods(response: FatSecretFoodsSearchResponse): FatSecretFood[] {
    const foodsNode = response.foods_search?.results?.food;
    if (!foodsNode) {
      return [];
    }
    return Array.isArray(foodsNode) ? foodsNode : [foodsNode];
  }

  private extractServings(food: FatSecretFood): FatSecretServing[] {
    const servingsNode = food.servings?.serving;
    if (!servingsNode) {
      return [];
    }
    return Array.isArray(servingsNode) ? servingsNode : [servingsNode];
  }

  private extractAllergens(attributes?: FatSecretFoodAttributes): string[] {
    const allergensNode = attributes?.allergens?.allergen;
    if (!allergensNode) {
      return [];
    }
    const allergens = Array.isArray(allergensNode) ? allergensNode : [allergensNode];
    return allergens
      .filter(allergen => allergen.value === "1")
      .map(allergen => allergen.name)
      .filter(Boolean);
  }

  private extractPreferences(attributes?: FatSecretFoodAttributes): {
    vegetarian: boolean | null;
    vegan: boolean | null;
  } {
    const prefsNode = attributes?.preferences?.preference;
    if (!prefsNode) {
      return { vegetarian: null, vegan: null };
    }
    const preferences = Array.isArray(prefsNode) ? prefsNode : [prefsNode];

    const vegetarianPref = preferences.find(pref => pref.name?.toLowerCase() === "vegetarian");
    const veganPref = preferences.find(pref => pref.name?.toLowerCase() === "vegan");

    const parseValue = (value?: string): boolean | null => {
      if (value === "1") return true;
      if (value === "0") return false;
      return null;
    };

    return {
      vegetarian: parseValue(vegetarianPref?.value),
      vegan: parseValue(veganPref?.value),
    };
  }

  private toNumber(value?: string): number | null {
    if (value === undefined || value === null) return null;
    const num = parseFloat(value);
    return Number.isFinite(num) ? num : null;
  }

  private parseNumber(value?: string): number | null {
    if (!value) return null;
    const num = parseInt(value, 10);
    return Number.isFinite(num) ? num : null;
  }

  private computeProteinPer100Calories(calories: number | null, protein: number | null): number | null {
    if (!calories || !protein || calories <= 0) {
      return null;
    }
    return (protein / calories) * 100;
  }

  private mapFoodToMenuItem(food: FatSecretFood): any {
    const servings = this.extractServings(food);
    const serving = servings[0];

    const calories = this.toNumber(serving?.calories);
    const protein = this.toNumber(serving?.protein);
    const carbs = this.toNumber(serving?.carbohydrate);
    const fat = this.toNumber(serving?.fat);
    const fiber = this.toNumber(serving?.fiber);
    const sugar = this.toNumber(serving?.sugar);
    const sodium = this.toNumber(serving?.sodium);

    const { vegetarian, vegan } = this.extractPreferences(food.food_attributes);

    const name =
      food.food_type === "Brand" && food.brand_name
        ? `${food.brand_name} ${food.food_name}`
        : food.food_name;

    return {
      id: `fatsecret_${food.food_id}`,
      name,
      serving_size: serving?.serving_description || null,
      calories,
      protein_g: protein,
      carbs_g: carbs,
      fat_g: fat,
      fiber_g: fiber,
      sugar_g: sugar,
      sodium_mg: sodium,
      protein_per_100cals: this.computeProteinPer100Calories(calories, protein),
      vegetarian,
      vegan,
      gluten: null,
      allergens: this.extractAllergens(food.food_attributes),
      ingredients: null,
      is_collection: false,
      is_custom_meal: false,
    };
  }

  /**
   * Looks up a food item by barcode using the FatSecret Barcode API V2.
   * Returns full food details in a single API call.
   */
  async lookupFoodByBarcode(barcode: string): Promise<FatSecretBarcodeResult> {
    try {
      // Normalize barcode to GTIN-13 format
      const normalizedBarcode = this.normalizeBarcodeToGTIN13(barcode);
      
      // Validate format (should be 13 digits after normalization)
      if (!/^\d{13}$/.test(normalizedBarcode)) {
        return {
          data: null,
          error: new Error(`Invalid barcode format. Expected numeric barcode, got: ${barcode}`),
          notFound: false,
        };
      }

      // Call Supabase Edge Function barcode endpoint
      const { data, error } = await supabase.functions.invoke('fatsecret-proxy', {
        body: {
          barcode: normalizedBarcode,
        },
      });

      if (error) {
        console.error("[FatSecretBarcode] Proxy error", error);
        return {
          data: null,
          error: new Error(error.message || "FatSecret barcode proxy request failed"),
          notFound: false,
        };
      }

      if (!data) {
        console.error("[FatSecretBarcode] No data returned from proxy");
        return {
          data: null,
          error: new Error("No data returned from FatSecret barcode proxy"),
          notFound: false,
        };
      }

      // Handle error response from proxy
      if (data.error) {
        console.error("[FatSecretBarcode] FatSecret API error", data.error);
        return {
          data: null,
          error: new Error(data.error),
          notFound: false,
        };
      }

      if (data.not_found || !data.food) {
        return {
          data: null,
          error: null,
          notFound: true,
        };
      }

      const food = data.food as FatSecretFood;
      const menuItem = this.mapFoodToMenuItem(food);

      return {
        data: menuItem,
        error: null,
        notFound: false,
      };
    } catch (err) {
      console.error("FatSecret barcode lookup error:", err);
      return {
        data: null,
        error: err,
        notFound: false,
      };
    }
  }
}

export const fatSecretSearchService = new FatSecretSearchService();
