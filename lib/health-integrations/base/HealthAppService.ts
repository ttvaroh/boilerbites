/**
 * Abstract base class for health app services
 * All health app integrations should extend this class
 */

import {
  FoodEntryForSync,
  FoodEntryRemovedPayload,
  FoodEntryUpdatedPayload,
  HealthAppConnection,
  HealthAppFoodEntry,
  HealthAppType,
  SyncResult,
} from './types';

export abstract class HealthAppService {
  protected appType: HealthAppType;

  constructor(appType: HealthAppType) {
    this.appType = appType;
  }

  /**
   * Get the app type
   */
  getAppType(): HealthAppType {
    return this.appType;
  }

  /**
   * Check if the service is available on this platform
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * Request authorization/permission from the health app
   */
  abstract requestAuthorization(): Promise<boolean>;

  /**
   * Check if the user has authorized the app
   */
  abstract isAuthorized(): Promise<boolean>;

  /**
   * Connect/link the health app account
   * For OAuth-based apps (Fitbit), this initiates OAuth flow
   * For native apps (Apple Health), this requests permissions
   */
  abstract connect(userId: string): Promise<{ success: boolean; error?: string; data?: any }>;

  /**
   * Disconnect/unlink the health app account
   */
  abstract disconnect(userId: string): Promise<{ success: boolean; error?: string }>;

  /**
   * Sync a single food entry to the health app
   */
  abstract syncFoodEntry(
    userId: string,
    foodEntry: FoodEntryForSync
  ): Promise<SyncResult>;

  /**
   * Sync multiple food entries to the health app
   */
  abstract syncFoodEntries(
    userId: string,
    foodEntries: FoodEntryForSync[]
  ): Promise<SyncResult>;

  /**
   * Convert BoilerBites food entry to health app format
   */
  protected abstract convertToHealthAppFormat(
    foodEntry: FoodEntryForSync
  ): HealthAppFoodEntry;

  /**
   * Get connection status for a user
   */
  abstract getConnectionStatus(userId: string): Promise<{
    connected: boolean;
    enabled?: boolean;
    lastSyncAt?: string;
    error?: string;
  }>;

  /**
   * Refresh OAuth token if needed (for OAuth-based apps)
   */
  async refreshToken(userId: string): Promise<{ success: boolean; error?: string }> {
    // Default implementation: no-op for apps that don't need token refresh
    return { success: true };
  }

  /**
   * Remove a food entry from the health app (optional; override to support delete sync).
   */
  async removeFoodEntry(
    _userId: string,
    _connection: HealthAppConnection,
    _payload: FoodEntryRemovedPayload
  ): Promise<SyncResult> {
    return { success: true, entriesSynced: 0 };
  }

  /**
   * Update a food entry in the health app (optional; override to support edit sync).
   * Typically implemented as remove old + sync new.
   */
  async updateFoodEntry(
    _userId: string,
    _connection: HealthAppConnection,
    _payload: FoodEntryUpdatedPayload
  ): Promise<SyncResult> {
    return { success: true, entriesSynced: 0 };
  }
}
