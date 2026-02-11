/**
 * Apple Health (HealthKit) specific types
 */

export interface AppleHealthPermissions {
  read: string[];
  write: string[];
}

export interface AppleHealthFoodEntry {
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other';
  date: string; // ISO date string
}
