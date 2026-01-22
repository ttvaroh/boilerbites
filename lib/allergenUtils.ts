/**
 * Maps user allergy preferences to allergen names found in items
 * Based on mapping found in app/search-by-date.tsx (lines 336-343)
 */
export function getUserAllergenNames(preferences: {
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
}): string[] {
  const allergenNames: string[] = [];
  
  // Map preferences to allergen names (case-insensitive matching)
  if (preferences.dairy_allergy) {
    allergenNames.push('Milk', 'Dairy'); // Items may have either
  }
  if (preferences.gluten_allergy) {
    allergenNames.push('Wheat', 'Gluten'); // Items may have either
  }
  if (preferences.nuts_allergy) {
    allergenNames.push('Tree Nuts', 'Nuts');
  }
  if (preferences.soy_allergy) {
    allergenNames.push('Soy');
  }
  if (preferences.eggs_allergy) {
    allergenNames.push('Eggs');
  }
  if (preferences.shellfish_allergy) {
    allergenNames.push('Shellfish');
  }
  if (preferences.fish_allergy) {
    allergenNames.push('Fish');
  }
  if (preferences.peanut_allergy) {
    allergenNames.push('Peanuts', 'Peanut');
  }
  
  return allergenNames;
}

/**
 * Checks if an item should be marked (greyed out) based on user preferences
 * For allergens: marks items that contain user's intolerances
 * For vegan/vegetarian: marks items that DON'T match user's preferences
 */
export function itemContainsIntolerance(
  itemAllergens: string[] | undefined,
  userAllergenNames: string[],
  item?: {
    vegan?: boolean;
    vegetarian?: boolean;
  },
  userPreferences?: {
    vegan_preference?: boolean;
    vegetarian_preference?: boolean;
  }
): boolean {
  // Check vegan/vegetarian preferences
  // If user prefers vegan, mark items that are NOT vegan
  // If user prefers vegetarian, mark items that are NOT vegetarian
  if (userPreferences && item) {
    if (userPreferences.vegan_preference && item.vegan !== true) {
      return true;
    }
    if (userPreferences.vegetarian_preference && item.vegetarian !== true) {
      return true;
    }
  }
  
  // Check allergen array
  if (!itemAllergens || itemAllergens.length === 0) {
    return false;
  }
  
  if (userAllergenNames.length === 0) {
    return false;
  }
  
  // Create lowercase sets for efficient lookup
  const itemAllergensLower = new Set(
    itemAllergens.map(a => a.toLowerCase().trim())
  );
  const userAllergensLower = new Set(
    userAllergenNames.map(a => a.toLowerCase().trim())
  );
  
  // Check for intersection
  for (const itemAllergen of itemAllergensLower) {
    if (userAllergensLower.has(itemAllergen)) {
      return true;
    }
  }
  
  return false;
}
