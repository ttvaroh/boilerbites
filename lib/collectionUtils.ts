import { COLLECTION_DERIVED_USER_ID } from './constants';
import { supabase } from './supabase';

export interface CollectionItem {
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
  ingredients?: string;
}

export interface Collection {
  id: string;
  name: string;
  items: CollectionItem[];
}

/**
 * Find an existing item created from a collection
 * @param collectionId - The ID of the collection
 * @param collectionName - The name of the collection
 * @returns The item ID if found, null otherwise
 */
export async function findCollectionDerivedItem(
  collectionId: string,
  collectionName: string
): Promise<string | null> {
  try {
    // Search for items with matching name, preset user_id, and is_collection=false
    // Also check if the collection_id is stored in the ingredients field
    // IMPORTANT: Exclude collection items (is_collection: true) - we only want derived items
    const collectionIdMarker = `[COLLECTION_ID:${collectionId}]`;
    
    const { data, error } = await supabase
      .from('item')
      .select('id, ingredients, is_collection, user_id')
      .eq('name', collectionName)
      .eq('user_id', COLLECTION_DERIVED_USER_ID) // Preset global user_id
      .eq('is_collection', false) // Exclude actual collections - only find derived items
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    // Double-check: make sure this is not a collection item
    if (data.is_collection) {
      return null;
    }

    // Check if ingredients field contains the collection_id marker
    if (data.ingredients && data.ingredients.includes(collectionIdMarker)) {
      return data.id;
    }

    // If no marker found but name matches, user_id matches, and is_collection is false,
    // it might be the same collection-derived item (in case the marker wasn't added in an earlier version)
    return data.id;
  } catch (error) {
    console.error('Error finding collection-derived item:', error);
    return null;
  }
}

/**
 * Calculate aggregated nutrition from collection items
 * @param collectionItems - Array of items in the collection
 * @returns Aggregated nutrition data
 */
export function calculateCollectionNutrition(
  collectionItems: CollectionItem[]
): {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
  vegetarian: boolean;
  vegan: boolean;
  gluten: boolean;
  allergens: string[];
  ingredients: string[];
} {
  const nutrition = {
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: 0,
    sugar_g: 0,
    sodium_mg: 0,
    vegetarian: true, // Only true if ALL items are vegetarian
    vegan: true, // Only true if ALL items are vegan
    gluten: false, // True if ANY item has gluten
    allergens: [] as string[],
    ingredients: [] as string[],
  };

  const allergenSet = new Set<string>();
  const ingredientSet = new Set<string>();

  for (const item of collectionItems) {
    // Sum numeric nutrition values
    nutrition.calories += item.calories || 0;
    nutrition.protein_g += item.protein_g || 0;
    nutrition.carbs_g += item.carbs_g || 0;
    nutrition.fat_g += item.fat_g || 0;
    nutrition.fiber_g += item.fiber_g || 0;
    nutrition.sugar_g += item.sugar_g || 0;
    nutrition.sodium_mg += item.sodium_mg || 0;

    // Dietary flags: all must be true for vegetarian/vegan, any for gluten
    if (item.vegetarian !== true) {
      nutrition.vegetarian = false;
    }
    if (item.vegan !== true) {
      nutrition.vegan = false;
    }
    if (item.gluten === true) {
      nutrition.gluten = true;
    }

    // Combine allergens
    if (item.allergens && Array.isArray(item.allergens)) {
      item.allergens.forEach((allergen) => allergenSet.add(allergen));
    }

    // Combine ingredients
    if (item.ingredients) {
      // Split by common delimiters and add to set
      const ingredientParts = item.ingredients
        .split(/[,;]/)
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
      ingredientParts.forEach((ingredient) => ingredientSet.add(ingredient));
    }
  }

  nutrition.allergens = Array.from(allergenSet);
  nutrition.ingredients = Array.from(ingredientSet);

  return nutrition;
}

/**
 * Create a custom item from a collection
 * @param collection - The collection to convert to an item
 * @returns The created item ID, or null if creation failed
 */
export async function createItemFromCollection(
  collection: Collection
): Promise<string | null> {
  try {
    // Calculate aggregated nutrition
    const nutrition = calculateCollectionNutrition(collection.items);

    // Prepare ingredients string with collection_id marker
    const ingredientsList = nutrition.ingredients.join(', ');
    const ingredientsWithMarker = `[COLLECTION_ID:${collection.id}]${ingredientsList}`;

    // Calculate protein_per_100cals if we have calories and protein
    const protein_per_100cals = 
      nutrition.calories > 0 && nutrition.protein_g > 0
        ? (nutrition.protein_g / nutrition.calories) * 100
        : null;
    
    // Generate a unique ID for the new item (database will generate UUID, but create_item requires it)
    // Using same pattern as create_custom_meal which uses gen_random_uuid()::TEXT
    const newItemId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });

    // Use create_item RPC directly with preset global user_id (not current user)
    // This is similar to how FatSecret items are created in create-meal.tsx
    const { data: rpcResult, error: rpcError } = await supabase.rpc('create_item', {
      p_id: newItemId,
      p_name: collection.name,
      p_serving_size: '1 serving',
      p_calories: nutrition.calories > 0 ? Math.round(nutrition.calories) : null,
      p_protein_g: nutrition.protein_g > 0 ? Math.round(nutrition.protein_g * 10) / 10 : null,
      p_carbs_g: nutrition.carbs_g > 0 ? Math.round(nutrition.carbs_g * 10) / 10 : null,
      p_fat_g: nutrition.fat_g > 0 ? Math.round(nutrition.fat_g * 10) / 10 : null,
      p_fiber_g: nutrition.fiber_g > 0 ? Math.round(nutrition.fiber_g * 10) / 10 : null,
      p_sugar_g: nutrition.sugar_g > 0 ? Math.round(nutrition.sugar_g * 10) / 10 : null,
      p_sodium_mg: nutrition.sodium_mg > 0 ? Math.round(nutrition.sodium_mg) : null,
      p_protein_per_100cals: protein_per_100cals,
      p_vegetarian: nutrition.vegetarian || null,
      p_vegan: nutrition.vegan || null,
      p_gluten: nutrition.gluten || null,
      p_allergens: nutrition.allergens.length > 0 ? nutrition.allergens : null,
      p_ingredients: ingredientsWithMarker,
      p_is_collection: false, // This is a single item, not a collection
      p_is_available: true,
      p_user_id: COLLECTION_DERIVED_USER_ID, // Preset global user_id for all collection-derived items
      p_source: 0 // Custom source
    });

    if (rpcError) {
      return null;
    }

    // The create_item function returns JSON with success and item_id
    if (rpcResult && typeof rpcResult === 'object') {
      if (rpcResult.success === false) {
        return null;
      }
      if (rpcResult.item_id) {
        return rpcResult.item_id;
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

