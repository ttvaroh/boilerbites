import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import BackgroundTemplate from "../components/BackgroundTemplate";
import ErrorBoundary from "../components/ErrorBoundary";
import ItemSearchComponent from "../components/ItemSearch";
import SearchItemCard from "../components/SearchItemCard";
import { useAuth } from "../contexts/AuthContext";
import { useNutritionGoals } from "../contexts/NutritionGoalsContext";
import { getUserAllergenNames, itemContainsIntolerance } from "../lib/allergenUtils";
import {
  getCustomMealStatusMap,
  getCollectionStatusMap,
  getUnresolvedItemIds,
  hydrateCollectionStatus,
  seedCollectionStatus,
  seedCollectionStatusFromFlags,
} from "../lib/collectionStatusCache";
import { ITEM_SELECT_COLUMNS } from "../lib/itemSelectColumns";
import { supabase } from "../lib/supabase";
import { FatSecretSearchFilters, fatSecretSearchService } from "../services/searchService";

// Interfaces
interface MenuItem {
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
  protein_per_100cals?: number;
  last_verified?: string;
  ingredients?: string;
  is_collection?: boolean;
  is_custom_meal?: boolean;
  location_name?: string;
  meal_name?: string;
  station_name?: string;
  meals?: string[];
}

const HYDRATION_DEBOUNCE_MS = 250;
const HYDRATION_BATCH_SIZE = 100;

const chunkArray = <T,>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const getResolvedCollectionState = (
  item: MenuItem,
  collectionStatus: Record<string, boolean>,
  customMealStatus: Record<string, boolean>,
) => {
  const isCollection =
    item.is_collection !== undefined ? item.is_collection : (collectionStatus[item.id] ?? false);
  const isCustomMeal =
    item.is_custom_meal !== undefined ? item.is_custom_meal : (customMealStatus[item.id] ?? false);
  return { isCollection, isCustomMeal };
};



// Optimized SearchItemWrapper component
const SearchItemWrapper = React.memo(({ 
  item, 
  index, 
  onPress, 
  isCollection,
  isCustomMeal,
  hasIntolerance
}: { 
  item: MenuItem; 
  index: number; 
  onPress: (item: MenuItem) => void; 
  isCollection: boolean;
  isCustomMeal?: boolean;
  hasIntolerance?: boolean;
}) => {
  const handlePress = React.useCallback(() => {
    onPress(item);
  }, [onPress, item]);

  return (
    <TouchableOpacity onPress={handlePress}>
      <SearchItemCard
        item={item}
        showDietaryTag={true}
        meals={item.meals || []}
        isCollection={isCollection}
        isCustomMeal={isCustomMeal || false}
        hideLocation={true}
        hasIntolerance={hasIntolerance}
      />
    </TouchableOpacity>
  );
});

// Utility functions
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);
  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function createFatSecretFilters(query: string): FatSecretSearchFilters {
  return {
    searchQuery: query
  };
}

// Custom hook for FatSecret search functionality
function useFatSecretSearch() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isSearching, setIsSearching] = React.useState(false);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<MenuItem[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [currentOffset, setCurrentOffset] = React.useState(0);
  const [error, setError] = React.useState<any>(null);
  const [hasSearched, setHasSearched] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(false);
  
  const debouncedQuery = useDebounce(searchQuery, 400);
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const currentOffsetRef = React.useRef(0);

  // Keep ref in sync with state
  React.useEffect(() => {
    currentOffsetRef.current = currentOffset;
  }, [currentOffset]);

  const performSearch = React.useCallback(async (query: string, append: boolean = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsSearching(true);
        setCurrentOffset(0);
        currentOffsetRef.current = 0;
      }
      setError(null);

      const offset = append ? currentOffsetRef.current : 0;
      const fatSecretFilters = createFatSecretFilters(query);
      const { data, count, error } = await fatSecretSearchService.searchFoods(
        fatSecretFilters,
        { limit: 20, offset: offset }
      );

      if (controller.signal.aborted) return;

      if (error) {
        setError(error);
        return;
      }

      if (append) {
        setSearchResults(prev => [...prev, ...data]);
        const newOffset = currentOffsetRef.current + data.length;
        setCurrentOffset(newOffset);
        currentOffsetRef.current = newOffset;
        setHasMore(newOffset < count);
      } else {
        setSearchResults(data);
        const newOffset = data.length;
        setCurrentOffset(newOffset);
        currentOffsetRef.current = newOffset;
        setTotalCount(count);
        setHasMore(newOffset < count);
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsSearching(false);
        setIsLoadingMore(false);
      }
    }
  }, []); // No dependencies - uses refs for current values

  React.useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const resetPagination = React.useCallback(() => {
    setCurrentOffset(0);
    currentOffsetRef.current = 0;
    setHasMore(false);
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    debouncedQuery,
    isSearching,
    isLoadingMore,
    searchResults,
    setSearchResults,
    totalCount,
    error,
    performSearch,
    hasSearched,
    setHasSearched,
    hasMore,
    resetPagination
  };
}

export default function GlobalSearchPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { goals: nutritionGoals } = useNutritionGoals();
  const { query: initialQuery } = useLocalSearchParams<{ query?: string }>();
  
  const {
    searchQuery,
    setSearchQuery,
    debouncedQuery,
    isSearching,
    isLoadingMore,
    searchResults,
    setSearchResults,
    totalCount,
    error,
    performSearch,
    hasSearched,
    setHasSearched,
    hasMore,
    resetPagination
  } = useFatSecretSearch();

  // Set initial search query from URL parameter
  React.useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
      setHasSearched(true);
    }
  }, [initialQuery, setSearchQuery, setHasSearched]);

  const [refreshing, setRefreshing] = React.useState(false);

  // Get user's allergen names from preferences
  const userAllergenNames = React.useMemo(() => {
    if (!nutritionGoals) return [];
    return getUserAllergenNames({
      dairy_allergy: nutritionGoals.dairy_allergy,
      gluten_allergy: nutritionGoals.gluten_allergy,
      nuts_allergy: nutritionGoals.nuts_allergy,
      soy_allergy: nutritionGoals.soy_allergy,
      eggs_allergy: nutritionGoals.eggs_allergy,
      shellfish_allergy: nutritionGoals.shellfish_allergy,
      fish_allergy: nutritionGoals.fish_allergy,
      peanut_allergy: nutritionGoals.peanut_allergy,
      vegan_preference: nutritionGoals.vegan_preference,
      vegetarian_preference: nutritionGoals.vegetarian_preference,
    });
  }, [nutritionGoals]);

  // Get user preferences for vegan/vegetarian checking
  const userPreferences = React.useMemo(() => {
    if (!nutritionGoals) return undefined;
    return {
      vegan_preference: nutritionGoals.vegan_preference,
      vegetarian_preference: nutritionGoals.vegetarian_preference,
    };
  }, [nutritionGoals]);

  // Search custom foods and meals
  const searchCustomItems = React.useCallback(async (query: string): Promise<MenuItem[]> => {
    if (!user?.id || query.trim().length < 2) {
      return [];
    }

    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      
      if (!userId) {
        return [];
      }

      // Search custom foods and meals by searching items directly
      // Custom foods/meals have user_id matching the current user
      const { data: customItemsData, error: customItemsError } = await supabase
        .from('item')
        .select(ITEM_SELECT_COLUMNS)
        .eq('user_id', userId)
        .ilike('name', `%${query.trim()}%`)
        .limit(20);

      if (customItemsError || !customItemsData) {
        return [];
      }

      seedCollectionStatus(customItemsData);

      return customItemsData.map((item: any) => ({
        ...item,
        is_collection: item.is_collection === true && item.user_id === null,
        is_custom_meal: item.is_collection === true && item.user_id !== null,
        // Ensure all required MenuItem fields are present
        allergens: item.allergens || [],
        meals: [],
      }));
    } catch (err) {
      console.error('Error searching custom foods/meals:', err);
      return [];
    }
  }, [user?.id]);

  // Track custom items for current query to combine with FatSecret results
  const customItemsRef = React.useRef<MenuItem[]>([]);
  const lastQueryRef = React.useRef<string>('');

  // Trigger search when debounced query changes
  React.useEffect(() => {
    setSearchResults([]);
    resetPagination();
    
    if (debouncedQuery.trim() || hasSearched) {
      setHasSearched(true);
      
      // Search custom items and store in ref
      searchCustomItems(debouncedQuery).then(items => {
        customItemsRef.current = items;
        lastQueryRef.current = debouncedQuery;
      });
      
      performSearch(debouncedQuery, false);
    } else {
      customItemsRef.current = [];
      lastQueryRef.current = '';
      performSearch('', false);
    }
    // Only depend on debouncedQuery - performSearch and searchCustomItems are stable now
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  // Combine custom items with FatSecret results when searchResults update
  React.useEffect(() => {
    if (searchResults.length > 0 && customItemsRef.current.length > 0 && lastQueryRef.current === debouncedQuery) {
      // Check if custom items are already in results
      const customItemIds = new Set(customItemsRef.current.map(item => item.id));
      const hasCustomItems = searchResults.some(item => customItemIds.has(item.id));
      
      if (!hasCustomItems) {
        // Combine custom items with FatSecret results (custom items first)
        const combinedResults = [...customItemsRef.current, ...searchResults];
        setSearchResults(combinedResults);
      }
    } else if (searchResults.length === 0 && customItemsRef.current.length > 0 && lastQueryRef.current === debouncedQuery) {
      // If no FatSecret results but we have custom items, show them
      setSearchResults(customItemsRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchResults, debouncedQuery]);

  const handleSearch = React.useCallback(async (query: string, filters?: any) => {
    setSearchQuery(query);
    
    if (query.trim()) {
      setHasSearched(true);
      await performSearch(query.trim());
    }
  }, [performSearch]);

  // Pull to refresh handler
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await performSearch(debouncedQuery);
    } finally {
      setRefreshing(false);
    }
  }, [debouncedQuery, performSearch]);


  const [collectionStatus, setCollectionStatus] = React.useState<Record<string, boolean>>({});
  const [customMealStatus, setCustomMealStatus] = React.useState<Record<string, boolean>>({});
  const hydrationTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHydrationSignatureRef = React.useRef<string>('');
  const hydrationRequestIdRef = React.useRef(0);

  const checkCollectionStatusBatch = React.useCallback(async (itemIds: string[], requestId: number) => {
    try {
      seedCollectionStatusFromFlags(
        searchResults.filter(
          (item) =>
            item.is_collection !== undefined || item.is_custom_meal !== undefined,
        ),
      );

      const unresolved = getUnresolvedItemIds(itemIds);
      if (unresolved.length > 0) {
        await hydrateCollectionStatus(unresolved);
      }

      if (requestId !== hydrationRequestIdRef.current) {
        return;
      }

      setCollectionStatus((prev) => ({
        ...prev,
        ...getCollectionStatusMap(itemIds),
      }));
      setCustomMealStatus((prev) => ({
        ...prev,
        ...getCustomMealStatusMap(itemIds),
      }));
    } catch (error) {
      console.error('Error checking collection status batch:', error);
    }
  }, [searchResults]);

  const handleMenuItemPress = React.useCallback(async (item: MenuItem) => {
    const { isCollection: resolvedIsCollection, isCustomMeal: resolvedIsCustomMeal } =
      getResolvedCollectionState(item, collectionStatus, customMealStatus);

    // Check if this item is a system collection (not custom meal)
    if (resolvedIsCollection && !resolvedIsCustomMeal) {
      router.push(`/collection/${item.id}`);
      return;
    }

    if (item.id.startsWith('fatsecret_')) {
      try {
        const { data: existingItem } = await supabase
          .from('item')
          .select('id')
          .eq('id', item.id)
          .maybeSingle();

        if (!existingItem) {
          const protein_per_100cals = item.calories && item.calories > 0 && item.protein_g
            ? (item.protein_g / item.calories) * 100
            : null;

          await supabase.rpc('create_item', {
            p_id: item.id,
            p_name: item.name || 'Unknown Food',
            p_vegetarian: item.vegetarian ?? null,
            p_vegan: item.vegan ?? null,
            p_gluten: item.gluten ?? null,
            p_allergens: item.allergens || [],
            p_serving_size: item.serving_size ?? null,
            p_calories: item.calories ?? null,
            p_protein_g: item.protein_g ?? null,
            p_carbs_g: item.carbs_g ?? null,
            p_fat_g: item.fat_g ?? null,
            p_fiber_g: item.fiber_g ?? null,
            p_sugar_g: item.sugar_g ?? null,
            p_sodium_mg: item.sodium_mg ?? null,
            p_protein_per_100cals: protein_per_100cals,
            p_ingredients: item.ingredients ?? null,
            p_is_collection: false,
            p_is_available: true,
            p_user_id: null,
            p_source: 1,
          });
        }
      } catch (error) {
        console.error('Error ensuring FatSecret item exists in database:', error);
      }

      router.push(`/nutrition/${item.id}?source=fatsecret`);
    } else {
      router.push(`/nutrition/${item.id}`);
    }
  }, [router, collectionStatus, customMealStatus]);

  React.useEffect(() => {
    if (hydrationTimeoutRef.current) {
      clearTimeout(hydrationTimeoutRef.current);
      hydrationTimeoutRef.current = null;
    }

    const fatSecretIds = searchResults
      .map((item) => item.id)
      .filter((id) => id.startsWith('fatsecret_'));

    if (fatSecretIds.length > 0) {
      setCollectionStatus((prev) => {
        const next = { ...prev };
        for (const id of fatSecretIds) {
          if (next[id] === undefined) next[id] = false;
        }
        return next;
      });
      setCustomMealStatus((prev) => {
        const next = { ...prev };
        for (const id of fatSecretIds) {
          if (next[id] === undefined) next[id] = false;
        }
        return next;
      });
    }

    const unresolvedIds = Array.from(
      new Set(
        searchResults
          .filter((item) => item.is_collection === undefined || item.is_custom_meal === undefined)
          .map((item) => item.id)
          .filter((id) => !id.startsWith('fatsecret_'))
          .filter((id) => collectionStatus[id] === undefined || customMealStatus[id] === undefined),
      ),
    ).sort();

    if (unresolvedIds.length === 0) {
      lastHydrationSignatureRef.current = '';
      return;
    }

    const signature = unresolvedIds.join('|');
    if (signature === lastHydrationSignatureRef.current) {
      return;
    }
    lastHydrationSignatureRef.current = signature;

    hydrationTimeoutRef.current = setTimeout(() => {
      const requestId = hydrationRequestIdRef.current + 1;
      hydrationRequestIdRef.current = requestId;
      checkCollectionStatusBatch(unresolvedIds, requestId);
    }, HYDRATION_DEBOUNCE_MS);

    return () => {
      if (hydrationTimeoutRef.current) {
        clearTimeout(hydrationTimeoutRef.current);
        hydrationTimeoutRef.current = null;
      }
    };
  }, [searchResults, checkCollectionStatusBatch]);

  const renderItem = React.useCallback(({ item, index }: { item: MenuItem; index: number }) => {
    const hasIntolerance = itemContainsIntolerance(
      item.allergens,
      userAllergenNames,
      item,
      userPreferences
    );
    
    return (
      <SearchItemWrapper
        item={item}
        index={index}
        onPress={handleMenuItemPress}
        isCollection={getResolvedCollectionState(item, collectionStatus, customMealStatus).isCollection}
        isCustomMeal={getResolvedCollectionState(item, collectionStatus, customMealStatus).isCustomMeal}
        hasIntolerance={hasIntolerance}
      />
    );
  }, [handleMenuItemPress, collectionStatus, customMealStatus, userAllergenNames, userPreferences]);

  const ListEmptyComponent = React.useCallback(() => {
    if (isSearching) {
      return (
        <View className="flex-1 justify-center items-center py-8">
          <ActivityIndicator size="large" color="#CFB991" />
          <Text className="text-gray-400 text-lg font-sora mt-4">Searching foods...</Text>
        </View>
      );
    }

    return (
      <View className="flex-1 justify-center items-center py-8">
        <Text className="text-gray-400 text-lg font-sora text-center">
          {hasSearched ? "No results found" : "Search for foods from FatSecret"}
        </Text>
        <Text className="text-gray-500 text-sm font-sora text-center mt-2">
          {hasSearched ? "Try adjusting your search" : "Enter a food name to get started"}
        </Text>
      </View>
    );
  }, [isSearching, hasSearched]);

  const loadMoreResults = React.useCallback(() => {
    if (!isLoadingMore && hasMore && !isSearching && debouncedQuery.trim()) {
      performSearch(debouncedQuery, true);
    }
  }, [isLoadingMore, hasMore, isSearching, debouncedQuery, performSearch]);

  const ListFooterComponent = React.useCallback(() => {
    if (isLoadingMore) {
      return (
        <View className="py-4 justify-center items-center">
          <ActivityIndicator size="small" color="#CFB991" />
          <Text className="text-gray-400 text-sm font-sora mt-2">
            Loading more results...
          </Text>
        </View>
      );
    }
    
    if (searchResults.length > 0 && !isSearching) {
      return (
        <View className="py-4 justify-center items-center">
          <Text className="text-gray-400 text-sm font-sora">
            {searchResults.length} of {totalCount} items
            {hasMore && " • Scroll for more"}
          </Text>
          <Text className="text-gray-500 text-xs font-sora mt-2">
            Nutrition data provided by FatSecret
          </Text>
        </View>
      );
    }
    return null;
  }, [searchResults.length, totalCount, isSearching, isLoadingMore, hasMore]);

  return (
    <ErrorBoundary>
      <BackgroundTemplate paddingBottom={0}>
        <View className="flex-1 px-6 pt-16">
          {/* Header with Back Button */}
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="p-2 -ml-2"
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            
            <Text className="text-2xl font-sora-bold text-white flex-1 text-center mr-8">
              Global Search
            </Text>
          </View>

          {/* Search Component */}
          <ItemSearchComponent 
            onSearch={handleSearch}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            hideLocationMealFilters={true}
            disableFilters={true}
            placeholder="Search for anything..."
          />

          {/* Results Header */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <Text className="text-white text-base font-sora">
                {isSearching ? "Searching..." : hasSearched ? `${totalCount} results` : "Available"}
              </Text>
              {hasSearched && totalCount > 0 && (
                <Text className="text-gray-500 text-xs font-sora ml-2">
                  - Data provided by FatSecret
                </Text>
              )}
            </View>
          </View>

          {/* Results with FlatList */}
          <View className="flex-1">
            <FlatList
              data={searchResults}
              renderItem={renderItem}
              keyExtractor={(item: MenuItem, index: number) => `${item.id}-${index}`}
              ListEmptyComponent={ListEmptyComponent}
              ListFooterComponent={ListFooterComponent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#CFB991"
                  colors={["#CFB991"]}
                />
              }
              onEndReached={loadMoreResults}
              onEndReachedThreshold={0.5}
              removeClippedSubviews={true}
              initialNumToRender={8}
              maxToRenderPerBatch={5}
              windowSize={5}
              updateCellsBatchingPeriod={50}
              disableVirtualization={false}
              legacyImplementation={false}
            />
          </View>

        </View>
      </BackgroundTemplate>
    </ErrorBoundary>
  );
}

