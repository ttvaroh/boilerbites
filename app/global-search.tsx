import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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
  location_name?: string;
  meal_name?: string;
  station_name?: string;
  meals?: string[];
}



// Optimized SearchItemWrapper component
const SearchItemWrapper = React.memo(({ 
  item, 
  index, 
  onPress, 
  isCollection,
  isCustomMeal
}: { 
  item: MenuItem; 
  index: number; 
  onPress: (item: MenuItem) => void; 
  isCollection: boolean;
  isCustomMeal?: boolean;
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
        { limit: 50, offset: offset }
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

  const [refreshing, setRefreshing] = React.useState(false);

  // Trigger search when debounced query changes
  React.useEffect(() => {
    setSearchResults([]);
    resetPagination();
    
    if (debouncedQuery.trim() || hasSearched) {
      setHasSearched(true);
      performSearch(debouncedQuery, false);
    } else {
      performSearch('', false);
    }
    // Only depend on debouncedQuery - performSearch is stable now
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

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

  const checkCollectionStatusBatch = React.useCallback(async (itemIds: string[]) => {
    try {
      const { data: itemsData, error } = await supabase
        .from('item')
        .select('id, is_collection, user_id')
        .in('id', itemIds);

      if (!error && itemsData) {
        const newCollectionStatus: Record<string, boolean> = {};
        const newCustomMealStatus: Record<string, boolean> = {};
        
        itemsData.forEach((item: any) => {
          const isCollection = item.is_collection || false;
          const isCustomMeal = isCollection && item.user_id !== null;
          const isSystemCollection = isCollection && item.user_id === null;
          
          // Only mark as collection if it's a system collection (not custom meal)
          newCollectionStatus[item.id] = isSystemCollection;
          newCustomMealStatus[item.id] = isCustomMeal;
        });
        
        setCollectionStatus(prev => ({ ...prev, ...newCollectionStatus }));
        setCustomMealStatus(prev => ({ ...prev, ...newCustomMealStatus }));
      }
    } catch (error) {
      console.error('Error checking collection status batch:', error);
    }
  }, []);

  const handleMenuItemPress = React.useCallback(async (item: MenuItem) => {
    // Check if this item is a system collection (not custom meal)
    if (collectionStatus[item.id] && !customMealStatus[item.id]) {
      router.push(`/collection/${item.id}`);
      return;
    }

    // Custom meals and regular items go to nutrition page
    // Navigate to nutrition page with FatSecret source
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
            p_source: 2,
          });
        }
      } catch (error) {
        console.error('Error ensuring FatSecret item exists in database:', error);
      }

      router.push(`/nutrition/${item.id}?source=fatsecret`);
    } else {
      // Purdue item
      router.push(`/nutrition/${item.id}`);
    }
  }, [router, collectionStatus, customMealStatus]);

  // Check collection status when search results change
  React.useEffect(() => {
    const itemIds = searchResults.map(item => item.id);
    if (itemIds.length > 0) {
      checkCollectionStatusBatch(itemIds);
    }
  }, [searchResults, checkCollectionStatusBatch]);

  // Render item for FlatList - optimized with React.memo
  const renderItem = React.useCallback(({ item, index }: { item: MenuItem; index: number }) => {
    return (
      <SearchItemWrapper
        item={item}
        index={index}
        onPress={handleMenuItemPress}
        isCollection={collectionStatus[item.id] || false}
        isCustomMeal={customMealStatus[item.id] || false}
      />
    );
  }, [handleMenuItemPress, collectionStatus, customMealStatus]);

  // Empty state component
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

  // Load more results when scrolling to bottom
  const loadMoreResults = React.useCallback(() => {
    if (!isLoadingMore && hasMore && !isSearching && debouncedQuery.trim()) {
      performSearch(debouncedQuery, true);
    }
  }, [isLoadingMore, hasMore, isSearching, debouncedQuery, performSearch]);

  // Footer component
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

  // Show login prompt if user is not authenticated
  if (!user) {
    return (
      <ErrorBoundary>
        <BackgroundTemplate paddingBottom={0}>
          <View className="flex-1 justify-center items-center p-6">
            <View className="bg-gray-800 rounded-2xl p-8 items-center max-w-sm">
              <Ionicons name="lock-closed-outline" size={64} color="#CFB991" />
              <Text className="text-2xl font-sora-bold text-white text-center mt-4 mb-2">
                Login Required
              </Text>
              <Text className="text-gray-400 text-center mb-6 font-sora">
                You need to be logged in to search for foods and track your nutrition.
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/signin")}
                className="bg-purdueGold rounded-xl px-6 py-3 w-full"
              >
                <Text className="text-black font-sora-semibold text-center">
                  Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push("/signup")}
                className="mt-3"
              >
                <Text className="text-purdueGold font-sora text-center">
                  Don't have an account? Sign up
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </BackgroundTemplate>
      </ErrorBoundary>
    );
  }

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
              // Performance optimizations
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

