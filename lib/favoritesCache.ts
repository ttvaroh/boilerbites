/**
 * In-memory cache for the Favorites screen to reduce Supabase + GraphQL egress
 * when the user reopens Favorites or switches tabs within TTL.
 * Invalidated on toggleFavorite (add/remove) and on sign-out.
 */

const FAVORITES_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface FavoriteItemCache {
  id: string;
  originalItemId?: string;
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
  protein_per_100cals?: number;
  last_verified?: string;
  ingredients?: string;
  is_collection?: boolean;
  favorited_at: string;
  is_available_today?: boolean;
  available_locations?: string[];
  available_meals?: string[];
  available_dates?: string[];
}

export interface FavoritesCacheData {
  favorites: FavoriteItemCache[];
  upcomingFavorites: FavoriteItemCache[];
  globalFavorites: FavoriteItemCache[];
  collectionStatus: Record<string, boolean>;
}

let cache: {
  userId: string;
  data: FavoritesCacheData;
  fetchedAt: number;
} | null = null;

export function getCachedFavorites(userId: string): FavoritesCacheData | null {
  if (!cache || cache.userId !== userId) return null;
  if (Date.now() - cache.fetchedAt > FAVORITES_CACHE_TTL_MS) return null;
  return cache.data;
}

export function setCachedFavorites(
  userId: string,
  data: FavoritesCacheData,
): void {
  cache = { userId, data, fetchedAt: Date.now() };
}

export function invalidateFavoritesCache(userId?: string): void {
  if (userId === undefined || (cache && cache.userId === userId)) {
    cache = null;
  }
}

export function isCacheValid(userId: string): boolean {
  return getCachedFavorites(userId) !== null;
}
