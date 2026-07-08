/**
 * Health Sync Manager
 * Orchestrates sync across all health app integrations
 */

import { HEALTH_CONNECTION_SELECT_COLUMNS } from "../itemSelectColumns";
import { supabase } from "../supabase";
import { AppleHealthService } from './apple-health/AppleHealthService';
import { FitbitService } from './fitbit/FitbitService';
import {
  FoodEntryForSync,
  FoodEntryRemovedPayload,
  FoodEntryUpdatedPayload,
  HealthAppConnection,
  SyncResult,
  SyncStatus,
} from './base/types';

export class HealthSyncManager {
  private appleHealthService: AppleHealthService;
  private fitbitService: FitbitService;

  constructor() {
    this.appleHealthService = new AppleHealthService();
    this.fitbitService = new FitbitService();
  }

  /**
   * Handle food entry removed - notify connected health apps to delete
   */
  async onFoodEntryRemoved(
    userId: string,
    payload: FoodEntryRemovedPayload
  ): Promise<void> {
    try {
      const { data: connections, error } = await supabase
        .from('health_app_connections')
        .select(HEALTH_CONNECTION_SELECT_COLUMNS)
        .eq('user_id', userId)
        .eq('enabled', true)
        .eq('auto_sync_enabled', true);

      if (error || !connections || connections.length === 0) return;

      const promises = connections.map((connection: HealthAppConnection) =>
        this.syncRemoveToApp(userId, connection, payload)
      );
      Promise.all(promises).catch(() => {});
    } catch (_) {}
  }

  /**
   * Handle food entry updated - notify connected health apps (delete old + sync new)
   */
  async onFoodEntryUpdated(
    userId: string,
    payload: FoodEntryUpdatedPayload
  ): Promise<void> {
    try {
      const { data: connections, error } = await supabase
        .from('health_app_connections')
        .select(HEALTH_CONNECTION_SELECT_COLUMNS)
        .eq('user_id', userId)
        .eq('enabled', true)
        .eq('auto_sync_enabled', true);

      if (error || !connections || connections.length === 0) return;

      const promises = connections.map((connection: HealthAppConnection) =>
        this.syncUpdateToApp(userId, connection, payload)
      );
      Promise.all(promises).catch(() => {});
    } catch (_) {}
  }

  /**
   * Handle new food entry - sync to all connected health apps
   */
  async onFoodEntryAdded(
    userId: string,
    foodEntry: FoodEntryForSync
  ): Promise<void> {
    try {
      const { data: connections, error } = await supabase
        .from('health_app_connections')
        .select(HEALTH_CONNECTION_SELECT_COLUMNS)
        .eq('user_id', userId)
        .eq('enabled', true)
        .eq('auto_sync_enabled', true);

      if (error || !connections || connections.length === 0) return;

      const syncPromises = connections.map((connection: HealthAppConnection) =>
        this.syncToApp(userId, connection, foodEntry)
      );
      Promise.all(syncPromises).catch(() => {});
    } catch (_) {}
  }

  /**
   * Sync food entry to a specific health app
   */
  private async syncToApp(
    userId: string,
    connection: HealthAppConnection,
    foodEntry: FoodEntryForSync
  ): Promise<void> {
    const service = this.getServiceForConnection(connection);
    if (!service) return;
    try {
      const available = await service.isAvailable();
      if (!available) {
        await this.logSync(connection.id, userId, 'export', {
          success: false,
          entriesSynced: 0,
          error: 'Service not available',
        });
        return;
      }
      const syncResult = await service.syncFoodEntry(userId, foodEntry);
      if (
        syncResult.success &&
        syncResult.externalId &&
        connection.app_type === 'fitbit'
      ) {
        await this.recordSyncedEntry(
          connection.id,
          foodEntry.id,
          syncResult.externalId
        );
      }
      await this.updateConnectionAfterSync(connection, syncResult);
      await this.logSync(connection.id, userId, 'export', syncResult);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.updateConnectionAfterSync(connection, {
        success: false,
        entriesSynced: 0,
        error: message,
      });
      await this.logSync(connection.id, userId, 'export', {
        success: false,
        entriesSynced: 0,
        error: message,
      });
    }
  }

  /**
   * Sync a removal to a specific health app
   */
  private async syncRemoveToApp(
    userId: string,
    connection: HealthAppConnection,
    payload: FoodEntryRemovedPayload
  ): Promise<void> {
    const service = this.getServiceForConnection(connection);
    if (!service) return;
    try {
      const available = await service.isAvailable();
      if (!available) return;
      const result = await service.removeFoodEntry(userId, connection, payload);
      await this.updateConnectionAfterSync(connection, result);
      await this.logSync(connection.id, userId, 'export', result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.updateConnectionAfterSync(connection, {
        success: false,
        entriesSynced: 0,
        error: message,
      });
      await this.logSync(connection.id, userId, 'export', {
        success: false,
        entriesSynced: 0,
        error: message,
      });
    }
  }

  /**
   * Sync an update to a specific health app (delete old + add new)
   */
  private async syncUpdateToApp(
    userId: string,
    connection: HealthAppConnection,
    payload: FoodEntryUpdatedPayload
  ): Promise<void> {
    const service = this.getServiceForConnection(connection);
    if (!service) return;
    try {
      const available = await service.isAvailable();
      if (!available) return;
      const result = await service.updateFoodEntry(userId, connection, payload);
      await this.updateConnectionAfterSync(connection, result);
      await this.logSync(connection.id, userId, 'export', result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.updateConnectionAfterSync(connection, {
        success: false,
        entriesSynced: 0,
        error: message,
      });
      await this.logSync(connection.id, userId, 'export', {
        success: false,
        entriesSynced: 0,
        error: message,
      });
    }
  }

  private getServiceForConnection(
    connection: HealthAppConnection
  ): AppleHealthService | FitbitService | null {
    switch (connection.app_type) {
      case 'apple_health':
        return this.appleHealthService;
      case 'fitbit':
        return this.fitbitService;
      default:
        return null;
    }
  }

  private async updateConnectionAfterSync(
    connection: HealthAppConnection,
    result: SyncResult
  ): Promise<void> {
    const status: SyncStatus = result.success ? 'success' : 'error';
    await supabase
      .from('health_app_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: status,
        last_sync_error: result.error || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id);
  }

  /**
   * Record that a food entry was synced to an external app (e.g. Fitbit logId).
   */
  private async recordSyncedEntry(
    connectionId: string,
    foodEntryId: string,
    externalId: string
  ): Promise<void> {
    try {
      const { error } = await supabase.from('health_app_synced_entries').upsert(
        {
          connection_id: connectionId,
          food_entry_id: foodEntryId,
          external_id: externalId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'connection_id,food_entry_id' }
      );
      if (error) return;
    } catch (_) {}
  }

  /**
   * Log sync operation
   */
  private async logSync(
    connectionId: string,
    userId: string,
    syncType: 'export' | 'import' | 'bidirectional',
    result: SyncResult
  ): Promise<void> {
    try {
      const status: SyncStatus = result.success ? 'success' : 'error';
      const today = new Date().toISOString().split('T')[0];

      await supabase
        .from('health_app_sync_log')
        .insert({
          connection_id: connectionId,
          user_id: userId,
          sync_type: syncType,
          sync_date: today,
          entries_synced: result.entriesSynced,
          status: status,
          error_message: result.error || null,
        });
    } catch (_) {
      // Don't throw - logging errors shouldn't break the app
    }
  }

  /**
   * Get sync manager instance (singleton pattern)
   */
  private static instance: HealthSyncManager | null = null;

  static getInstance(): HealthSyncManager {
    if (!HealthSyncManager.instance) {
      HealthSyncManager.instance = new HealthSyncManager();
    }
    return HealthSyncManager.instance;
  }
}
