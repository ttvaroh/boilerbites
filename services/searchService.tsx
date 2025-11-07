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

// FDC API Interfaces and Service
export interface FDCFoodNutrient {
  nutrientId: number;
  nutrientName: string;
  value: number;
  unitName: string;
}

export interface FDCFoodItem {
  fdcId: number;
  description: string;
  lowercaseDescription?: string;
  brandOwner?: string;
  foodNutrients?: FDCFoodNutrient[];
  dataType?: string;
  publishedDate?: string;
}

export interface FDCSearchFilters {
  dietaryPreferences?: {
    vegetarian?: boolean;
    vegan?: boolean;
    glutenFree?: boolean;
  };
  excludeAllergens?: string[];
  searchQuery?: string;
}

export interface FDCSearchOptions {
  sortBy?: 'name' | 'calories' | 'protein_g' | 'carbs_g' | 'fat_g' | 'protein_per_100cals';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface FDCSearchResult {
  data: any[]; // MenuItem format
  count: number;
  error: any | null;
}

// Nutrient ID mappings for FDC API
const FDC_NUTRIENT_IDS = {
  CALORIES: 1008, // Energy
  PROTEIN: 1003, // Protein
  CARBS: 1005, // Carbohydrate, by difference
  FAT: 1004, // Total lipid (fat)
  FIBER: 1079, // Fiber, total dietary
  SUGAR: 2000, // Sugars, total including NLEA
  SODIUM: 1093, // Sodium, Na
};

class FDCSearchService {
  private apiKey: string;
  private baseUrl = 'https://api.nal.usda.gov/fdc/v1/';

  constructor() {
    this.apiKey = process.env.EXPO_PUBLIC_FDC_API_KEY || '';
    if (!this.apiKey) {
      console.warn('FDC API key not found. FDC search will not work.');
    }
  }

  /**
   * Extract nutrient value from FDC food nutrients array
   */
  private getNutrientValue(nutrients: FDCFoodNutrient[] | undefined, nutrientId: number): number | null {
    if (!nutrients) return null;
    const nutrient = nutrients.find(n => n.nutrientId === nutrientId);
    return nutrient?.value ?? null;
  }

  /**
   * Map FDC food item to our MenuItem format
   */
  private mapFDCToMenuItem(fdcItem: FDCFoodItem): any {
    const nutrients = fdcItem.foodNutrients || [];
    
    const calories = this.getNutrientValue(nutrients, FDC_NUTRIENT_IDS.CALORIES);
    const protein_g = this.getNutrientValue(nutrients, FDC_NUTRIENT_IDS.PROTEIN);
    const carbs_g = this.getNutrientValue(nutrients, FDC_NUTRIENT_IDS.CARBS);
    const fat_g = this.getNutrientValue(nutrients, FDC_NUTRIENT_IDS.FAT);
    const fiber_g = this.getNutrientValue(nutrients, FDC_NUTRIENT_IDS.FIBER);
    const sugar_g = this.getNutrientValue(nutrients, FDC_NUTRIENT_IDS.SUGAR);
    const sodium_mg = this.getNutrientValue(nutrients, FDC_NUTRIENT_IDS.SODIUM);

    // Calculate protein per 100 calories
    const protein_per_100cals = calories && calories > 0 && protein_g
      ? (protein_g / calories) * 100
      : null;

    return {
      id: `fdc_${fdcItem.fdcId}`,
      name: fdcItem.description || fdcItem.lowercaseDescription || 'Unknown Food',
      serving_size: null, // FDC doesn't provide standard serving size in search results
      calories,
      protein_g,
      carbs_g,
      fat_g,
      fiber_g,
      sugar_g,
      sodium_mg,
      protein_per_100cals,
      vegetarian: null, // FDC doesn't provide this info
      vegan: null,
      gluten: null,
      allergens: [],
      ingredients: null,
      is_collection: false,
      // No location/meal context for FDC items
      location_name: undefined,
      meal_name: undefined,
      station_name: undefined,
      meals: undefined,
    };
  }

  /**
   * Apply dietary filters to FDC search results
   */
  private applyDietaryFilters(items: any[], filters: FDCSearchFilters): any[] {
    return items.filter(item => {
      // Note: FDC API doesn't provide dietary flags, so we can't filter by vegetarian/vegan/gluten
      // These filters would need to be applied client-side based on item name/keywords if needed
      // For now, we'll skip dietary filtering for FDC items
      return true;
    });
  }

  /**
   * Sort FDC search results
   */
  private sortResults(items: any[], options: FDCSearchOptions): any[] {
    const sortBy = options.sortBy || 'name';
    const sortOrder = options.sortOrder || 'asc';

    return [...items].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortBy) {
        case 'name':
          aVal = a.name?.toLowerCase() || '';
          bVal = b.name?.toLowerCase() || '';
          break;
        case 'calories':
          aVal = a.calories ?? 0;
          bVal = b.calories ?? 0;
          break;
        case 'protein_g':
          aVal = a.protein_g ?? 0;
          bVal = b.protein_g ?? 0;
          break;
        case 'carbs_g':
          aVal = a.carbs_g ?? 0;
          bVal = b.carbs_g ?? 0;
          break;
        case 'fat_g':
          aVal = a.fat_g ?? 0;
          bVal = b.fat_g ?? 0;
          break;
        case 'protein_per_100cals':
          aVal = a.protein_per_100cals ?? 0;
          bVal = b.protein_per_100cals ?? 0;
          break;
        default:
          aVal = a.name?.toLowerCase() || '';
          bVal = b.name?.toLowerCase() || '';
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }

  /**
   * Search foods using FDC API
   */
  async searchFoods(
    filters: FDCSearchFilters = {},
    options: FDCSearchOptions = {}
  ): Promise<FDCSearchResult> {
    if (!this.apiKey) {
      return { data: [], count: 0, error: new Error('FDC API key not configured') };
    }

    try {
      const rawQuery = filters.searchQuery || '';
      // Format query to require exact word matches (all words must be present)
      // Split by spaces and join with AND operator for exact word matching
      const query = rawQuery.trim()
        .split(/\s+/)
        .filter(word => word.length > 0)
        .map(word => `"${word}"`)
        .join(' AND ') || '';
      
      const pageSize = options.limit || 50;
      const pageNumber = Math.floor((options.offset || 0) / pageSize) + 1;

      // Build search request
      const searchParams = new URLSearchParams({
        api_key: this.apiKey,
        query: query,
        pageSize: pageSize.toString(),
        pageNumber: pageNumber.toString(),
        dataType: 'Foundation,SR Legacy', // Get both Foundation and SR Legacy foods
      });

      const url = `${this.baseUrl}foods/search?${searchParams.toString()}`;

      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 429) {
          return { data: [], count: 0, error: new Error('Rate limit exceeded. Please try again later.') };
        }
        return { data: [], count: 0, error: new Error(`FDC API error: ${response.statusText}`) };
      }

      const result = await response.json();
      const foods: FDCFoodItem[] = result.foods || [];
      const totalHits = result.totalHits || 0;

      // Map FDC items to our format
      let mappedItems = foods.map(food => this.mapFDCToMenuItem(food));

      // Apply dietary filters (though FDC doesn't provide this data)
      mappedItems = this.applyDietaryFilters(mappedItems, filters);

      // Sort results
      mappedItems = this.sortResults(mappedItems, options);

      return {
        data: mappedItems,
        count: totalHits,
        error: null,
      };
    } catch (err) {
      console.error('FDC search service error:', err);
      return {
        data: [],
        count: 0,
        error: err,
      };
    }
  }

  /**
   * Get detailed food information by FDC ID
   */
  async getFoodById(fdcId: number): Promise<FDCFoodItem | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      const url = `${this.baseUrl}food/${fdcId}?api_key=${this.apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        throw new Error(`FDC API error: ${response.statusText}`);
      }

      const food: FDCFoodItem = await response.json();
      return food;
    } catch (err) {
      console.error('Error fetching FDC food by ID:', err);
      return null;
    }
  }
}

export const fdcSearchService = new FDCSearchService();

// Open Food Facts API Interfaces and Service
export interface OFFFoodItem {
  code: string;
  status: number;
  status_verbose: string;
  product?: {
    product_name: string;
    generic_name?: string;
    brands?: string;
    nutriments: {
      'energy-kcal_100g'?: number;
      'energy-kcal'?: number;
      'proteins_100g'?: number;
      'proteins'?: number;
      'carbohydrates_100g'?: number;
      'carbohydrates'?: number;
      'fat_100g'?: number;
      'fat'?: number;
      'fiber_100g'?: number;
      'fiber'?: number;
      'sugars_100g'?: number;
      'sugars'?: number;
      'sodium_100g'?: number;
      'sodium'?: number;
    };
    ingredients_text?: string;
    ingredients_text_en?: string; // English ingredients
    serving_size?: string; // e.g., "1 cookie", "1 slice"
    serving_quantity?: number; // Numeric serving quantity
    allergens_tags?: string[];
    nutriscore_grade?: string;
    nova_group?: number;
    image_url?: string;
    image_front_url?: string;
    image_nutrition_url?: string;
    image_ingredients_url?: string;
  };
}

export interface OFFSearchFilters {
  searchQuery: string;
  dietaryPreferences?: {
    vegetarian?: boolean;
    vegan?: boolean;
    glutenFree?: boolean;
  };
  excludeAllergens?: string[];
}

export interface OFFSearchResult {
  data: any[]; // MenuItem format
  count: number;
  error: any | null;
}

class OFFSearchService {
  private baseUrl = 'https://world.openfoodfacts.org';
  private userAgent = 'BoilerBites/1.0 (contact@boilerbites.app)';

  /**
   * Search foods using Open Food Facts API
   * Rate limit: 10 requests/minute
   */
  async searchFoods(
    filters: OFFSearchFilters,
    options?: { limit?: number; offset?: number }
  ): Promise<OFFSearchResult> {
    try {
      const query = filters.searchQuery?.trim() || '';
      
      if (!query) {
        return { data: [], count: 0, error: null };
      }

      const limit = options?.limit || 50;
      const page = Math.floor((options?.offset || 0) / limit) + 1;

      // Use /cgi/search.pl endpoint for better compatibility
      // Request English language data and serving size fields
      const searchParams = new URLSearchParams({
        action: 'process',
        search_terms: query,
        page_size: limit.toString(),
        page: page.toString(),
        json: 'true',
        lc: 'en', // Request English language
        fields: 'code,product_name,generic_name,brands,nutriments,ingredients_text,ingredients_text_en,serving_size,serving_quantity,allergens_tags,nutriscore_grade,nova_group,image_url,image_front_url'
      });

      const url = `${this.baseUrl}/cgi/search.pl?${searchParams.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent,
        },
      });

      if (!response.ok) {
        if (response.status === 429) {
          return { 
            data: [], 
            count: 0, 
            error: new Error('Rate limit exceeded. Please wait before searching again.') 
          };
        }
        return { 
          data: [], 
          count: 0, 
          error: new Error(`Open Food Facts API error: ${response.statusText}`) 
        };
      }

      const result = await response.json();
      const products = result.products || [];
      const count = result.count || 0;

      // Map OFF products to MenuItem format
      const mappedItems = products
        .filter((product: any) => product.code && product.product_name)
        .map((product: any) => this.mapOFFToMenuItem(product));

      return {
        data: mappedItems,
        count: count,
        error: null,
      };
    } catch (err) {
      console.error('OFF search service error:', err);
      return {
        data: [],
        count: 0,
        error: err,
      };
    }
  }

  /**
   * Map OFF product to MenuItem format
   */
  private mapOFFToMenuItem(offProduct: any): any {
    const barcode = offProduct.code || '';
    const product = offProduct.product || offProduct;
    const nutriments = product.nutriments || {};

    // Extract nutrition values (prefer per 100g, fallback to absolute)
    const calories = nutriments['energy-kcal_100g'] ?? nutriments['energy-kcal'] ?? null;
    const protein_g = nutriments['proteins_100g'] ?? nutriments['proteins'] ?? null;
    const carbs_g = nutriments['carbohydrates_100g'] ?? nutriments['carbohydrates'] ?? null;
    const fat_g = nutriments['fat_100g'] ?? nutriments['fat'] ?? null;
    const fiber_g = nutriments['fiber_100g'] ?? nutriments['fiber'] ?? null;
    const sugar_g = nutriments['sugars_100g'] ?? nutriments['sugars'] ?? null;
    const sodium_mg = nutriments['sodium_100g'] ?? nutriments['sodium'] ?? null;

    // Calculate protein per 100 calories
    const protein_per_100cals = calories && calories > 0 && protein_g
      ? (protein_g / calories) * 100
      : null;

    // Map allergens from allergens_tags
    const allergens: string[] = [];
    if (product.allergens_tags && Array.isArray(product.allergens_tags)) {
      product.allergens_tags.forEach((tag: string) => {
        // Format: "en:milk" -> "Milk"
        const allergen = tag.replace(/^en:/, '').replace(/-/g, ' ');
        // Capitalize first letter
        const formatted = allergen.charAt(0).toUpperCase() + allergen.slice(1);
        if (!allergens.includes(formatted)) {
          allergens.push(formatted);
        }
      });
    }

    // Determine dietary flags from ingredients analysis (if available)
    // Note: OFF doesn't always provide these, so we'll set to null
    const vegetarian = null;
    const vegan = null;
    const gluten = null;

    // Get ingredients in English if available, fallback to default
    const ingredients = product.ingredients_text_en || product.ingredients_text || null;
    
    // Get serving size - OFF provides serving_size (e.g., "1 cookie") or serving_quantity (numeric)
    // Format: "serving_quantity serving_size" if both exist, or just serving_size
    let serving_size: string | null = null;
    if (product.serving_size) {
      serving_size = product.serving_size;
      // If serving_quantity exists, prepend it (e.g., "2 cookies" instead of just "cookies")
      if (product.serving_quantity) {
        serving_size = `${product.serving_quantity} ${product.serving_size}`.trim();
      }
    } else if (product.serving_quantity) {
      // If only serving_quantity exists, use it as serving size
      serving_size = product.serving_quantity.toString();
    }

    return {
      id: `off_${barcode}`,
      name: product.product_name || product.generic_name || 'Unknown Food',
      serving_size: serving_size,
      calories,
      protein_g,
      carbs_g,
      fat_g,
      fiber_g,
      sugar_g,
      sodium_mg,
      protein_per_100cals,
      vegetarian,
      vegan,
      gluten,
      allergens,
      ingredients: ingredients,
      is_collection: false,
      // OFF-specific fields (can be used later)
      nutriscore_grade: product.nutriscore_grade || null,
      nova_group: product.nova_group || null,
      image_url: product.image_url || product.image_front_url || null,
    };
  }

  /**
   * Get product by barcode from Open Food Facts
   * Rate limit: 100 requests/minute
   */
  async getProductByBarcode(barcode: string): Promise<OFFFoodItem | null> {
    try {
      // Clean barcode - remove any whitespace or special characters
      const cleanBarcode = barcode.trim();
      
      if (!cleanBarcode || cleanBarcode.length === 0) {
        console.error('Invalid barcode provided:', barcode);
        return null;
      }

      // Request English language data and serving size
      const url = `${this.baseUrl}/api/v2/product/${cleanBarcode}.json?lc=en`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent,
        },
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (response.status === 404) {
          console.log('OFF product not found (404) - barcode:', cleanBarcode);
          return null; // Product not found
        }
        console.error('OFF API error:', response.status, response.statusText, 'barcode:', cleanBarcode);
        throw new Error(`Open Food Facts API error: ${response.statusText}`);
      }

      const result: OFFFoodItem = await response.json();
      
      // Log for debugging
      if (result.status !== 0) {
        console.log('OFF product status indicates not found - status:', result.status, 'barcode:', cleanBarcode, 'status_verbose:', result.status_verbose);
      }
      
      if (result.status === 0) {
        return result; // Product found
      } else {
        return null; // Product not found (status = 1)
      }
    } catch (err) {
      console.error('Error fetching OFF product by barcode:', err, 'barcode:', barcode);
      return null;
    }
  }
}

export const offSearchService = new OFFSearchService();