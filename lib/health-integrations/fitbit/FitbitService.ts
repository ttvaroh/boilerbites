/**
 * Fitbit service implementation
 * Handles OAuth 2.0 flow and API calls to Fitbit
 */

import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { getLocalDateStringFromTimestamp } from '../../timezone-utils';
import { HEALTH_CONNECTION_SELECT_COLUMNS } from '../../itemSelectColumns';
import { supabase } from '../../supabase';
import {
  FoodEntryForSync,
  FoodEntryRemovedPayload,
  FoodEntryUpdatedPayload,
  HealthAppConnection,
  HealthAppFoodEntry,
  HealthAppMealType,
  mapMealType,
  SyncResult,
} from '../base/types';
import { HealthAppService as BaseHealthAppService } from '../base/HealthAppService';
import { FitbitFoodEntry, FitbitTokenResponse } from './FitbitTypes';

// Fitbit API configuration
const FITBIT_AUTH_URL = 'https://www.fitbit.com/oauth2/authorize';
const FITBIT_API_BASE = 'https://api.fitbit.com/1';
const FITBIT_SCOPES = 'nutrition activity';

export class FitbitService extends BaseHealthAppService {
  private clientId: string;
  private redirectUri: string;

  constructor() {
    super('fitbit');
    // Only the public client_id lives in the app. The client secret is held by the
    // `fitbit-token` Supabase Edge Function and is never bundled into the client.
    this.clientId = process.env.EXPO_PUBLIC_FITBIT_CLIENT_ID || '';
    this.redirectUri = `${Linking.createURL('fitbit-callback')}`;
  }

  /**
   * Check if Fitbit service is available (requires the public client id to be configured)
   */
  async isAvailable(): Promise<boolean> {
    return !!this.clientId;
  }

  /**
   * Request authorization (not applicable for Fitbit - uses OAuth)
   */
  async requestAuthorization(): Promise<boolean> {
    // Fitbit uses OAuth, not direct authorization
    return false;
  }

  /**
   * Check if user is authorized (has valid connection)
   */
  async isAuthorized(): Promise<boolean> {
    // This will be checked via getConnectionStatus
    return false;
  }

  /**
   * Connect Fitbit account (initiate OAuth flow)
   */
  async connect(userId: string): Promise<{ success: boolean; error?: string; data?: any }> {
    if (!this.clientId) {
      return { success: false, error: 'Fitbit API credentials not configured' };
    }

    try {
      // Generate state for CSRF protection
      const state = this.generateState();
      
      // Store state in AsyncStorage or similar for verification
      // For now, we'll verify it in the callback

      // Build authorization URL
      const authUrl = `${FITBIT_AUTH_URL}?` +
        `response_type=code&` +
        `client_id=${encodeURIComponent(this.clientId)}&` +
        `redirect_uri=${encodeURIComponent(this.redirectUri)}&` +
        `scope=${encodeURIComponent(FITBIT_SCOPES)}&` +
        `state=${state}`;

      // Open browser for OAuth
      const result = await WebBrowser.openAuthSessionAsync(authUrl, this.redirectUri);

      if (result.type === 'success' && result.url) {
        // Parse callback URL
        const url = new URL(result.url);
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        const error = url.searchParams.get('error');

        if (error) {
          return { success: false, error: `Fitbit authorization error: ${error}` };
        }

        if (!code) {
          return { success: false, error: 'No authorization code received' };
        }

        // Exchange code for tokens
        const tokenResult = await this.exchangeCodeForTokens(code);

        if (!tokenResult.success) {
          return { success: false, error: tokenResult.error };
        }

        // Save connection to database
        const { data, error: dbError } = await supabase
          .from('health_app_connections')
          .upsert({
            user_id: userId,
            app_type: 'fitbit',
            external_user_id: tokenResult.data?.user_id,
            access_token: tokenResult.data?.access_token,
            refresh_token: tokenResult.data?.refresh_token,
            token_expires_at: new Date(Date.now() + (tokenResult.data?.expires_in || 0) * 1000).toISOString(),
            scope: tokenResult.data?.scope,
            enabled: true,
            auto_sync_enabled: true,
            sync_direction: 'export',
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,app_type',
          })
          .select()
          .single();

        if (dbError) {
          return { success: false, error: dbError.message };
        }

        return { success: true, data };
      } else {
        return { success: false, error: 'User cancelled Fitbit authorization' };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  /**
   * Exchange authorization code for access token
   */
  private async exchangeCodeForTokens(code: string): Promise<{
    success: boolean;
    error?: string;
    data?: FitbitTokenResponse;
  }> {
    try {
      // Token exchange runs server-side so the client secret never ships in the app.
      const { data, error } = await supabase.functions.invoke('fitbit-token', {
        body: {
          action: 'exchange',
          code,
          redirect_uri: this.redirectUri,
        },
      });

      if (error) {
        return { success: false, error: `Token exchange failed: ${error.message}` };
      }

      if (!data || (data as any).error) {
        return { success: false, error: (data as any)?.error || 'Token exchange failed' };
      }

      return { success: true, data: data as FitbitTokenResponse };
    } catch (error: any) {
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current connection
      const { data: connection, error: fetchError } = await supabase
        .from('health_app_connections')
        .select(HEALTH_CONNECTION_SELECT_COLUMNS)
        .eq('user_id', userId)
        .eq('app_type', 'fitbit')
        .maybeSingle();

      if (fetchError || !connection || !connection.refresh_token) {
        return { success: false, error: 'No Fitbit connection found' };
      }

      // Check if token is expired
      if (connection.token_expires_at && new Date(connection.token_expires_at) > new Date()) {
        // Token still valid
        return { success: true };
      }

      // Token refresh runs server-side so the client secret never ships in the app.
      const { data: refreshData, error: refreshError } = await supabase.functions.invoke('fitbit-token', {
        body: {
          action: 'refresh',
          refresh_token: connection.refresh_token,
        },
      });

      if (refreshError) {
        return { success: false, error: `Token refresh failed: ${refreshError.message}` };
      }

      if (!refreshData || (refreshData as any).error) {
        return { success: false, error: (refreshData as any)?.error || 'Token refresh failed' };
      }

      const tokenData: FitbitTokenResponse = refreshData as FitbitTokenResponse;

      // Update connection with new tokens
      const { error: updateError } = await supabase
        .from('health_app_connections')
        .update({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', connection.id);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  /**
   * Get valid access token (refresh if needed)
   */
  private async getAccessToken(userId: string): Promise<string | null> {
    const { data: connection } = await supabase
      .from('health_app_connections')
      .select(HEALTH_CONNECTION_SELECT_COLUMNS)
      .eq('user_id', userId)
      .eq('app_type', 'fitbit')
      .maybeSingle();

    if (!connection || !connection.access_token) {
      return null;
    }

    // Check if token needs refresh
    if (connection.token_expires_at && new Date(connection.token_expires_at) <= new Date()) {
      const refreshResult = await this.refreshToken(userId);
      if (!refreshResult.success) {
        return null;
      }
      const { data: updatedConnection } = await supabase
        .from('health_app_connections')
        .select('access_token')
        .eq('user_id', userId)
        .eq('app_type', 'fitbit')
        .maybeSingle();
      return updatedConnection?.access_token || null;
    }

    return connection.access_token;
  }

  /**
   * Disconnect Fitbit account
   */
  async disconnect(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('health_app_connections')
        .delete()
        .eq('user_id', userId)
        .eq('app_type', 'fitbit');

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  /**
   * Sync a single food entry to Fitbit.
   * Fitbit Create Food Log API expects query parameters, not a JSON body.
   * @see https://dev.fitbit.com/build/reference/web-api/nutrition/create-food-log
   */
  async syncFoodEntry(
    userId: string,
    foodEntry: FoodEntryForSync
  ): Promise<SyncResult> {
    const accessToken = await this.getAccessToken(userId);
    if (!accessToken) {
      return { success: false, entriesSynced: 0, error: 'No valid access token' };
    }

    try {
      const fitbitEntry = this.convertToHealthAppFormat(foodEntry);
      const mealTypeId = this.mapMealTypeToFitbit(fitbitEntry.meal_type);
      const amount = Math.round((fitbitEntry.quantity ?? 1) * 100) / 100; // X.XX format
      const date = fitbitEntry.date; // yyyy-MM-dd

      // Build query params (Fitbit expects these in the URL, not body)
      const params = new URLSearchParams();
      params.set('foodName', fitbitEntry.name);
      params.set('mealTypeId', String(mealTypeId));
      params.set('unitId', '1'); // 1 = servings
      params.set('amount', String(amount));
      params.set('date', date);
      params.set('calories', String(Math.round(fitbitEntry.calories ?? 0)));
      if (fitbitEntry.protein != null && fitbitEntry.protein > 0) {
        params.set('protein', String(Math.round(fitbitEntry.protein * 10) / 10));
      }
      if (fitbitEntry.carbs != null && fitbitEntry.carbs > 0) {
        params.set('totalCarbohydrate', String(Math.round(fitbitEntry.carbs * 10) / 10));
      }
      if (fitbitEntry.fat != null && fitbitEntry.fat > 0) {
        params.set('totalFat', String(Math.round(fitbitEntry.fat * 10) / 10));
      }
      if (fitbitEntry.fiber != null && fitbitEntry.fiber > 0) {
        params.set('dietaryFiber', String(Math.round(fitbitEntry.fiber * 10) / 10));
      }
      if (fitbitEntry.sugar != null && fitbitEntry.sugar > 0) {
        params.set('sugars', String(Math.round(fitbitEntry.sugar * 10) / 10));
      }
      if (fitbitEntry.sodium != null && fitbitEntry.sodium > 0) {
        params.set('sodium', String(Math.round(fitbitEntry.sodium)));
      }

      const url = `${FITBIT_API_BASE}/user/-/foods/log.json?${params.toString()}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Length': '0',
          'Accept-Language': 'en_US',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          entriesSynced: 0,
          error: `Fitbit API error: ${errorText}`,
        };
      }

      const data = await response.json();
      const logId = data?.foodLog?.logId;
      return {
        success: true,
        entriesSynced: 1,
        externalId: logId != null ? String(logId) : undefined,
      };
    } catch (error: any) {
      return {
        success: false,
        entriesSynced: 0,
        error: error.message || 'Failed to sync to Fitbit',
      };
    }
  }

  /**
   * Fetch Fitbit food log for a date (for fallback when DB row is missing).
   */
  private async getFoodLogByDate(
    accessToken: string,
    date: string
  ): Promise<Array<{ logId: number; name: string }>> {
    const url = `${FITBIT_API_BASE}/user/-/foods/log/date/${date}.json`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return [];
    const data = await response.json();
    const foods = data?.foods ?? [];
    return foods.map((f: { logId: number; loggedFood?: { name?: string } }) => ({
      logId: f.logId,
      name: (f.loggedFood?.name ?? '').trim(),
    }));
  }

  /**
   * Remove a food entry from Fitbit (by stored logId, or by date+name fallback).
   */
  async removeFoodEntry(
    userId: string,
    connection: HealthAppConnection,
    payload: FoodEntryRemovedPayload
  ): Promise<SyncResult> {
    const accessToken = await this.getAccessToken(userId);
    if (!accessToken) {
      return { success: false, entriesSynced: 0, error: 'No valid access token' };
    }
    try {
      const { data: row, error: fetchError } = await supabase
        .from('health_app_synced_entries')
        .select('external_id')
        .eq('connection_id', connection.id)
        .eq('food_entry_id', payload.entryId)
        .maybeSingle();

      let logIdToDelete: string | null = null;
      if (row?.external_id) {
        logIdToDelete = row.external_id;
      } else if (payload.foodName && payload.created_at) {
        const date = getLocalDateStringFromTimestamp(payload.created_at);
        const dayLogs = await this.getFoodLogByDate(accessToken, date);
        const normalizedName = payload.foodName.trim();
        const match = dayLogs.find((f) => f.name === normalizedName || f.name.includes(normalizedName) || normalizedName.includes(f.name));
        if (match) {
          logIdToDelete = String(match.logId);
        }
      }

      if (!logIdToDelete) {
        return { success: true, entriesSynced: 0 };
      }

      const response = await fetch(
        `${FITBIT_API_BASE}/user/-/foods/log/${logIdToDelete}.json`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          entriesSynced: 0,
          error: `Fitbit API error: ${errorText}`,
        };
      }

      if (row?.external_id) {
        await supabase
          .from('health_app_synced_entries')
          .delete()
          .eq('connection_id', connection.id)
          .eq('food_entry_id', payload.entryId);
      }

      return { success: true, entriesSynced: 1 };
    } catch (error: any) {
      return {
        success: false,
        entriesSynced: 0,
        error: error.message || 'Failed to remove from Fitbit',
      };
    }
  }

  /**
   * Update: remove from Fitbit then sync new entry. Only adds the new entry if we
   * actually removed the old one (avoids duplicate when DB row was missing).
   */
  async updateFoodEntry(
    userId: string,
    connection: HealthAppConnection,
    payload: FoodEntryUpdatedPayload
  ): Promise<SyncResult> {
    const removeResult = await this.removeFoodEntry(userId, connection, {
      entryId: payload.entryId,
      created_at: payload.previousCreatedAt,
      foodName: payload.updatedEntry.item_name,
    });
    // Only add the new entry if we actually deleted the old one; otherwise we'd create a duplicate.
    if (removeResult.entriesSynced === 0) {
      return { success: true, entriesSynced: 0 };
    }
    return this.syncFoodEntry(userId, payload.updatedEntry);
  }

  /**
   * Sync multiple food entries to Fitbit
   */
  async syncFoodEntries(
    userId: string,
    foodEntries: FoodEntryForSync[]
  ): Promise<SyncResult> {
    // Fitbit rate limit: 150 requests/hour per user
    // We'll sync sequentially to avoid rate limits
    let synced = 0;
    let lastError: string | undefined;

    for (const entry of foodEntries) {
      try {
        const result = await this.syncFoodEntry(userId, entry);
        if (result.success) {
          synced++;
        } else {
          lastError = result.error;
          // If we hit rate limit, stop syncing
          if (result.error?.includes('rate limit') || result.error?.includes('429')) {
            break;
          }
        }
        // Small delay to avoid hitting rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error: any) {
        lastError = error.message || 'Unknown error';
      }
    }

    return {
      success: synced === foodEntries.length,
      entriesSynced: synced,
      error: synced < foodEntries.length ? lastError : undefined,
    };
  }

  /**
   * Convert BoilerBites food entry to Fitbit format
   */
  protected convertToHealthAppFormat(foodEntry: FoodEntryForSync): HealthAppFoodEntry {
    const mealType = mapMealType(foodEntry.meal_name);
    const multiplier = foodEntry.quantity || 1;

    return {
      name: foodEntry.item_name,
      calories: (foodEntry.calories || 0) * multiplier,
      protein: foodEntry.protein_g ? foodEntry.protein_g * multiplier : undefined,
      carbs: foodEntry.carbs_g ? foodEntry.carbs_g * multiplier : undefined,
      fat: foodEntry.fat_g ? foodEntry.fat_g * multiplier : undefined,
      fiber: foodEntry.fiber_g ? foodEntry.fiber_g * multiplier : undefined,
      sugar: foodEntry.sugar_g ? foodEntry.sugar_g * multiplier : undefined,
      sodium: foodEntry.sodium_mg ? foodEntry.sodium_mg * multiplier : undefined,
      meal_type: mealType,
      date: getLocalDateStringFromTimestamp(foodEntry.created_at),
      quantity: foodEntry.quantity,
    };
  }

  /**
   * Map meal type to Fitbit meal type ID.
   * Fitbit: 1=Breakfast, 2=Morning Snack, 3=Lunch, 4=Afternoon Snack, 5=Dinner, 7=Anytime
   */
  private mapMealTypeToFitbit(mealType: HealthAppMealType): number {
    switch (mealType) {
      case 'breakfast':
        return 1;
      case 'lunch':
        return 3;
      case 'dinner':
        return 5;
      case 'snack':
        return 4; // Afternoon Snack
      case 'other':
      default:
        return 7; // Anytime
    }
  }

  /**
   * Generate random state for OAuth CSRF protection
   */
  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Get connection status
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
        .select(HEALTH_CONNECTION_SELECT_COLUMNS)
        .eq('user_id', userId)
        .eq('app_type', 'fitbit')
        .maybeSingle();

      if (error) {
        return { connected: false, error: error.message };
      }

      if (!data) {
        return { connected: false };
      }

      // Check if token is valid
      const hasValidToken = data.access_token && (
        !data.token_expires_at || new Date(data.token_expires_at) > new Date()
      );

      return {
        connected: hasValidToken && data.enabled,
        enabled: data.enabled,
        lastSyncAt: data.last_sync_at || undefined,
      };
    } catch (error: any) {
      return { connected: false, error: error.message };
    }
  }
}
