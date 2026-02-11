/**
 * Apple Health (HealthKit) service implementation
 * Uses @kingstinct/react-native-healthkit for Expo-compatible HealthKit access.
 * Requires a physical iOS device; does not work in simulator or Expo Go.
 */

import {
  authorizationStatusFor,
  deleteObjects,
  isHealthDataAvailable,
  requestAuthorization,
  saveQuantitySample,
} from '@kingstinct/react-native-healthkit';
import type { QuantityTypeIdentifier } from '@kingstinct/react-native-healthkit/types';
import { ComparisonPredicateOperator } from '@kingstinct/react-native-healthkit/types';
import { Platform } from 'react-native';
import { supabase } from '../../supabase';
import {
  FoodEntryForSync,
  FoodEntryRemovedPayload,
  FoodEntryUpdatedPayload,
  HealthAppFoodEntry,
  HealthAppConnection,
  mapMealType,
  SyncResult,
} from '../base/types';
import { HealthAppService as BaseHealthAppService } from '../base/HealthAppService';
import { AuthorizationStatus } from '@kingstinct/react-native-healthkit';

/** Metadata key we use to link HealthKit samples to our food_entry id for delete/update */
const METADATA_ENTRY_ID_KEY = 'BoilerBitesEntryId';

// HealthKit type identifiers we request write access for (nutrition)
const NUTRITION_TYPE_IDS = [
  'HKQuantityTypeIdentifierDietaryEnergyConsumed',
  'HKQuantityTypeIdentifierDietaryProtein',
  'HKQuantityTypeIdentifierDietaryCarbohydrates',
  'HKQuantityTypeIdentifierDietaryFatTotal',
  'HKQuantityTypeIdentifierDietaryFiber',
  'HKQuantityTypeIdentifierDietarySugar',
  'HKQuantityTypeIdentifierDietarySodium',
] as const;

export class AppleHealthService extends BaseHealthAppService {
  constructor() {
    super('apple_health');
  }

  /**
   * Check if HealthKit is available (iOS only, and only on real devices)
   */
  async isAvailable(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      return false;
    }
    try {
      return isHealthDataAvailable();
    } catch {
      return false;
    }
  }

  /**
   * Request HealthKit authorization for writing nutrition data
   */
  async requestAuthorization(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      return false;
    }
    try {
      return await requestAuthorization({
        toShare: [...NUTRITION_TYPE_IDS],
        toRead: [],
      });
    } catch (_) {
      return false;
    }
  }

  /**
   * Check if we have write authorization for at least one nutrition type
   */
  async isAuthorized(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      return false;
    }
    try {
      const status = authorizationStatusFor(
        'HKQuantityTypeIdentifierDietaryEnergyConsumed'
      );
      return status === AuthorizationStatus.sharingAuthorized;
    } catch {
      return false;
    }
  }

  /**
   * Connect Apple Health (request permissions and save connection)
   */
  async connect(userId: string): Promise<{ success: boolean; error?: string; data?: unknown }> {
    try {
      const available = await this.isAvailable();
      if (!available) {
        return { success: false, error: 'HealthKit is not available on this device' };
      }

      const authorized = await this.requestAuthorization();
      if (!authorized) {
        return { success: false, error: 'HealthKit authorization was denied' };
      }

      const { data, error } = await supabase
        .from('health_app_connections')
        .upsert(
          {
            user_id: userId,
            app_type: 'apple_health',
            healthkit_enabled: true,
            enabled: true,
            auto_sync_enabled: true,
            sync_direction: 'export',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,app_type' }
        )
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, data };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * Disconnect Apple Health (remove stored connection only; we cannot revoke HealthKit permission)
   */
  async disconnect(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('health_app_connections')
        .delete()
        .eq('user_id', userId)
        .eq('app_type', 'apple_health');

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * Sync a single food entry to Apple Health by saving dietary quantity samples.
   * Uses the same start/end time for all nutrients so they appear as one entry in Health.
   */
  async syncFoodEntry(
    _userId: string,
    foodEntry: FoodEntryForSync
  ): Promise<SyncResult> {
    if (Platform.OS !== 'ios') {
      return { success: false, entriesSynced: 0, error: 'HealthKit is only available on iOS' };
    }

    const entry = this.convertToHealthAppFormat(foodEntry);
    const dateStr = foodEntry.created_at;
    const start = new Date(dateStr);
    const end = new Date(start.getTime() + 60 * 1000);

    try {
      const samples: Array<{ id: QuantityTypeIdentifier; unit: string; value: number }> = [];

      if (entry.calories > 0) {
        samples.push({
          id: 'HKQuantityTypeIdentifierDietaryEnergyConsumed',
          unit: 'kcal',
          value: Math.round(entry.calories * 10) / 10,
        });
      }
      if (entry.protein != null && entry.protein > 0) {
        samples.push({
          id: 'HKQuantityTypeIdentifierDietaryProtein',
          unit: 'g',
          value: Math.round(entry.protein * 10) / 10,
        });
      }
      if (entry.carbs != null && entry.carbs > 0) {
        samples.push({
          id: 'HKQuantityTypeIdentifierDietaryCarbohydrates',
          unit: 'g',
          value: Math.round(entry.carbs * 10) / 10,
        });
      }
      if (entry.fat != null && entry.fat > 0) {
        samples.push({
          id: 'HKQuantityTypeIdentifierDietaryFatTotal',
          unit: 'g',
          value: Math.round(entry.fat * 10) / 10,
        });
      }
      if (entry.fiber != null && entry.fiber > 0) {
        samples.push({
          id: 'HKQuantityTypeIdentifierDietaryFiber',
          unit: 'g',
          value: Math.round(entry.fiber * 10) / 10,
        });
      }
      if (entry.sugar != null && entry.sugar > 0) {
        samples.push({
          id: 'HKQuantityTypeIdentifierDietarySugar',
          unit: 'g',
          value: Math.round(entry.sugar * 10) / 10,
        });
      }
      if (entry.sodium != null && entry.sodium > 0) {
        samples.push({
          id: 'HKQuantityTypeIdentifierDietarySodium',
          unit: 'g',
          value: Math.round((entry.sodium / 1000) * 10) / 10,
        });
      }

      if (samples.length === 0) {
        return {
          success: false,
          entriesSynced: 0,
          error: 'No nutrition data to sync',
        };
      }

      const metadata = {
        HKFoodType: entry.name,
        [METADATA_ENTRY_ID_KEY]: foodEntry.id,
      };

      for (const { id, unit, value } of samples) {
        await saveQuantitySample(id, unit, value, start, end, metadata);
      }

      return { success: true, entriesSynced: 1 };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to sync to Apple Health';
      return { success: false, entriesSynced: 0, error: message };
    }
  }

  /**
   * Remove a food entry from HealthKit by deleting samples that have our entry id in metadata.
   */
  async removeFoodEntry(
    _userId: string,
    _connection: HealthAppConnection,
    payload: FoodEntryRemovedPayload
  ): Promise<SyncResult> {
    if (Platform.OS !== 'ios') {
      return { success: true, entriesSynced: 0 };
    }
    try {
      const filter = {
        metadata: {
          withMetadataKey: METADATA_ENTRY_ID_KEY,
          operatorType: ComparisonPredicateOperator.equalTo,
          value: payload.entryId,
        },
      };
      let deleted = 0;
      for (const typeId of NUTRITION_TYPE_IDS) {
        const n = await deleteObjects(typeId, filter);
        deleted += n;
      }
      return { success: true, entriesSynced: deleted > 0 ? 1 : 0 };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to remove from Apple Health';
      return { success: false, entriesSynced: 0, error: message };
    }
  }

  /**
   * Update: remove old HealthKit samples for this entry, then save new ones.
   */
  async updateFoodEntry(
    userId: string,
    connection: HealthAppConnection,
    payload: FoodEntryUpdatedPayload
  ): Promise<SyncResult> {
    const removeResult = await this.removeFoodEntry(userId, connection, {
      entryId: payload.entryId,
      created_at: payload.previousCreatedAt,
    });
    if (!removeResult.success) return removeResult;
    return this.syncFoodEntry(userId, payload.updatedEntry);
  }

  /**
   * Sync multiple food entries
   */
  async syncFoodEntries(
    userId: string,
    foodEntries: FoodEntryForSync[]
  ): Promise<SyncResult> {
    let synced = 0;
    let lastError: string | undefined;

    for (const entry of foodEntries) {
      const result = await this.syncFoodEntry(userId, entry);
      if (result.success) synced++;
      else lastError = result.error;
    }

    return {
      success: synced === foodEntries.length,
      entriesSynced: synced,
      error: synced < foodEntries.length ? lastError : undefined,
    };
  }

  /**
   * Convert BoilerBites food entry to health-app format (for sync)
   */
  protected convertToHealthAppFormat(foodEntry: FoodEntryForSync): HealthAppFoodEntry {
    const multiplier = foodEntry.quantity ?? 1;
    return {
      name: foodEntry.item_name,
      calories: (foodEntry.calories ?? 0) * multiplier,
      protein: foodEntry.protein_g != null ? foodEntry.protein_g * multiplier : undefined,
      carbs: foodEntry.carbs_g != null ? foodEntry.carbs_g * multiplier : undefined,
      fat: foodEntry.fat_g != null ? foodEntry.fat_g * multiplier : undefined,
      fiber: foodEntry.fiber_g != null ? foodEntry.fiber_g * multiplier : undefined,
      sugar: foodEntry.sugar_g != null ? foodEntry.sugar_g * multiplier : undefined,
      sodium: foodEntry.sodium_mg != null ? foodEntry.sodium_mg * multiplier : undefined,
      meal_type: mapMealType(foodEntry.meal_name),
      date: foodEntry.created_at.split('T')[0],
      quantity: foodEntry.quantity,
    };
  }

  /**
   * Get connection status from DB and HealthKit authorization
   */
  async getConnectionStatus(userId: string): Promise<{
    connected: boolean;
    enabled?: boolean;
    lastSyncAt?: string;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('health_app_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('app_type', 'apple_health')
        .maybeSingle();

      if (error) return { connected: false, error: error.message };
      if (!data) return { connected: false };

      const authorized = await this.isAuthorized();
      return {
        connected: authorized && !!data.enabled,
        enabled: data.enabled ?? undefined,
        lastSyncAt: data.last_sync_at ?? undefined,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { connected: false, error: message };
    }
  }
}
