import { supabase } from "./supabase";

export interface CollectionStatusEntry {
  isCollection: boolean;
  isCustomMeal: boolean;
}

const cache = new Map<string, CollectionStatusEntry>();

export function isSystemCollection(item: {
  is_collection?: boolean | null;
  user_id?: string | null;
}): boolean {
  return item.is_collection === true && item.user_id == null;
}

export function isCustomMealItem(item: {
  is_collection?: boolean | null;
  user_id?: string | null;
}): boolean {
  return item.is_collection === true && item.user_id != null;
}

export function entryFromItem(item: {
  id: string;
  is_collection?: boolean | null;
  user_id?: string | null;
}): CollectionStatusEntry {
  return {
    isCollection: isSystemCollection(item),
    isCustomMeal: isCustomMealItem(item),
  };
}

export function seedCollectionStatus(
  items: Array<{
    id: string;
    is_collection?: boolean | null;
    user_id?: string | null;
  }>,
): void {
  for (const item of items) {
    cache.set(item.id, entryFromItem(item));
  }
}

export function getCachedCollectionStatus(
  itemId: string,
): CollectionStatusEntry | undefined {
  return cache.get(itemId);
}

export function getUnresolvedItemIds(itemIds: string[]): string[] {
  return Array.from(new Set(itemIds)).filter((id) => !cache.has(id));
}

export async function hydrateCollectionStatus(
  itemIds: string[],
): Promise<Record<string, boolean>> {
  const uniqueIds = Array.from(new Set(itemIds));
  const unresolved = getUnresolvedItemIds(uniqueIds);

  if (unresolved.length > 0) {
    const chunkSize = 100;
    for (let i = 0; i < unresolved.length; i += chunkSize) {
      const chunk = unresolved.slice(i, i + chunkSize);
      const { data, error } = await supabase
        .from("item")
        .select("id, is_collection, user_id")
        .in("id", chunk);

      if (!error && data) {
        seedCollectionStatus(data);
      }
    }
  }

  const result: Record<string, boolean> = {};
  for (const id of uniqueIds) {
    const entry = cache.get(id);
    if (entry) {
      result[id] = entry.isCollection;
    }
  }
  return result;
}

export function getCollectionStatusMap(
  itemIds: string[],
): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const id of itemIds) {
    const entry = cache.get(id);
    if (entry) {
      result[id] = entry.isCollection;
    }
  }
  return result;
}

export function getCustomMealStatusMap(
  itemIds: string[],
): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const id of itemIds) {
    const entry = cache.get(id);
    if (entry) {
      result[id] = entry.isCustomMeal;
    }
  }
  return result;
}

export function seedCollectionStatusFromFlags(
  items: Array<{
    id: string;
    is_collection?: boolean | null;
    is_custom_meal?: boolean | null;
  }>,
): void {
  for (const item of items) {
    cache.set(item.id, {
      isCollection: item.is_collection === true && item.is_custom_meal !== true,
      isCustomMeal: item.is_custom_meal === true,
    });
  }
}

export function clearCollectionStatusCache(): void {
  cache.clear();
}
