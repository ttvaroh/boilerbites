// Shared menu-related types

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
  last_verified?: string;
}

export interface Station {
  id: string;
  name: string;
  items: MenuItem[];
}

export interface Meal {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  open: boolean;
  stations: Station[];
}

export interface MealsByDate {
  breakfast?: Meal;
  lunch?: Meal;
  lateLunch?: Meal;
  dinner?: Meal;
}

// Meal hours from database
export interface MealHours {
  meal_name: string;
  start_time: string;
  end_time: string;
  open: boolean;
}

// Processed location with status
export interface ProcessedLocation {
  id: number;
  name: string;
  type: number; // 0 = Dining Hall, 1 = Quick Bites, 2 = On-The-GO!
  hours: string;
  status: "open" | "closed";
  image: any;
  mealHours: MealHours[];
}

// View State Machine for menu display
export type ViewState =
  | { status: 'initializing'; autoDetectMeal: boolean }
  | { status: 'loading'; date: string; mealType: string; autoDetectMeal: boolean; mealName?: string }
  | { status: 'cached'; date: string; mealType: string; mealName: string }
  | { status: 'loaded'; date: string; mealType: string; data: Meal }
  | { status: 'empty'; date: string; mealType: string; mealName: string }
  | { status: 'error'; date: string; mealType: string; error: string };

export type ViewAction =
  | { type: 'START_LOADING'; date: string; mealType: string; mealName?: string }
  | { type: 'AUTO_DETECT_LOADING'; date: string; mealType: string; mealName?: string }
  | { type: 'SHOW_CACHED'; date: string; mealType: string; mealName: string }
  | { type: 'LOAD_SUCCESS'; date: string; mealType: string; data: Meal }
  | { type: 'LOAD_EMPTY'; date: string; mealType: string; mealName: string }
  | { type: 'LOAD_ERROR'; date: string; mealType: string; error: string }
  | { type: 'RESET'; autoDetectMeal?: boolean };