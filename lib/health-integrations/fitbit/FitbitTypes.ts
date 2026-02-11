/**
 * Fitbit API specific types
 */

export interface FitbitTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
  scope: string;
  token_type: string;
  user_id: string;
}

export interface FitbitFoodEntry {
  foodId?: string; // For existing foods in Fitbit database
  foodName: string;
  brandName?: string;
  mealTypeId: number; // 1=Breakfast, 2=Lunch, 3=Dinner, 4=Snack
  unitId: number; // Usually 1 for servings
  amount: number; // Quantity
  date: string; // YYYY-MM-DD
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sodium?: number;
}

export interface FitbitFoodLogResponse {
  foods: Array<{
    isFavorite: boolean;
    logDate: string;
    logId: number;
    loggedFood: {
      accessLevel: string;
      amount: number;
      brand: string;
      calories: number;
      foodId: number;
      mealTypeId: number;
      name: string;
      unit: {
        id: number;
        name: string;
        plural: string;
      };
      unitId: number;
    };
    nutritionalValues: {
      calories: number;
      carbs: number;
      fat: number;
      fiber: number;
      protein: number;
      sodium: number;
    };
  }>;
  goals: {
    calories: number;
  };
  summary: {
    calories: number;
    carbs: number;
    fat: number;
    fiber: number;
    protein: number;
    sodium: number;
    water: number;
  };
}
