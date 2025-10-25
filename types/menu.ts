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
  
  // View State Machine for menu display
  export type ViewState =
    | { status: 'initializing'; autoDetectMeal: boolean }
    | { status: 'loading'; date: string; mealType: string; autoDetectMeal: boolean }
    | { status: 'loaded'; date: string; mealType: string; data: Meal }
    | { status: 'empty'; date: string; mealType: string; mealName: string }
    | { status: 'error'; date: string; mealType: string; error: string };
  
  export type ViewAction =
    | { type: 'START_LOADING'; date: string; mealType: string }
    | { type: 'LOAD_SUCCESS'; date: string; mealType: string; data: Meal }
    | { type: 'LOAD_EMPTY'; date: string; mealType: string; mealName: string }
    | { type: 'LOAD_ERROR'; date: string; mealType: string; error: string }
    | { type: 'RESET'; autoDetectMeal?: boolean };