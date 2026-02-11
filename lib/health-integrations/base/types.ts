/**
 * Shared types for health app integrations
 */

export type HealthAppType = 'apple_health' | 'fitbit' | 'google_fit';

export type SyncDirection = 'export' | 'import' | 'bidirectional';

export type SyncStatus = 'success' | 'error' | 'partial';

export type SyncType = 'export' | 'import' | 'bidirectional';

export interface HealthAppConnection {
  id: string;
  user_id: string;
  app_type: HealthAppType;
  external_user_id?: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  healthkit_enabled?: boolean;
  auto_sync_enabled: boolean;
  sync_direction: SyncDirection;
  last_sync_at?: string;
  last_sync_status?: SyncStatus;
  last_sync_error?: string;
  scope?: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface SyncLog {
  id: string;
  connection_id: string;
  user_id: string;
  sync_type: SyncType;
  sync_date: string;
  entries_synced: number;
  status: SyncStatus;
  error_message?: string;
  created_at: string;
}

export interface FoodEntryForSync {
  id: string;
  user_id: string;
  item_id: string;
  quantity: number;
  created_at: string;
  meal_name: number; // 0=Uncategorized, 1=Breakfast, 2=Lunch, 3=Dinner, 4=Snack
  source: number;
  // Nutrition data from item
  item_name: string;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
}

export interface HealthAppFoodEntry {
  // Common fields that all health apps need
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  meal_type: HealthAppMealType;
  date: string; // YYYY-MM-DD
  quantity?: number;
}

export type HealthAppMealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other';

/**
 * Maps BoilerBites meal_name to health app meal types
 */
export function mapMealType(mealName: number): HealthAppMealType {
  switch (mealName) {
    case 1:
      return 'breakfast';
    case 2:
      return 'lunch';
    case 3:
      return 'dinner';
    case 4:
      return 'snack';
    default:
      return 'other';
  }
}

export interface SyncResult {
  success: boolean;
  entriesSynced: number;
  error?: string;
  /** External ID (e.g. Fitbit logId) for later delete/update */
  externalId?: string;
}

/** Payload for syncing a food entry removal to health apps */
export interface FoodEntryRemovedPayload {
  entryId: string;
  created_at: string;
  /** Optional: used by Fitbit to find and delete the log when DB row is missing */
  foodName?: string;
}

/** Payload for syncing a food entry update to health apps (delete old + sync new) */
export interface FoodEntryUpdatedPayload {
  entryId: string;
  previousCreatedAt: string;
  updatedEntry: FoodEntryForSync;
}
