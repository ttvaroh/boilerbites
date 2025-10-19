import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as React from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import BackgroundTemplate from "../../components/BackgroundTemplate";
import ItemSearchComponent from "../../components/ItemSearch";
import MenuItemCard from "../../components/MenuItemCard";
import SortBy from "../../components/SortBy";
import { supabase } from "../../lib/supabase";
import { DateSearchFilters, DateSearchOptions, dateSearchService, DayMenuItem } from "../../services/SearchService";

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

interface SearchFilters {
  timeOfDay: string;
  diningHalls: string[];
  dietaryPreferences: {
    vegetarian: boolean;
    vegan: boolean;
    glutenFree: boolean;
  };
  excludeAllergens: string[];
  mealAvailabilityOnly: boolean;
}

interface SearchOptions {
  sortBy?: 'calories' | 'protein_g' | 'protein/calorie' | 'carbs_g' | 'fat_g' | 'name';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// Utility functions
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);
  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function convertDayMenuItemsToMenuItems(data: DayMenuItem[]): MenuItem[] {
  const itemMap = new Map<string, MenuItem>();
  
  data.forEach((item: DayMenuItem) => {
    const key = item.id;
    
    if (itemMap.has(key)) {
      const existingItem = itemMap.get(key)!;
      if (!existingItem.meals?.includes(item.meal_name)) {
        existingItem.meals = [...(existingItem.meals || []), item.meal_name];
      }
    } else {
      itemMap.set(key, {
        id: item.id,
        name: item.name,
        vegetarian: item.vegetarian || undefined,
        vegan: item.vegan || undefined,
        gluten: item.gluten || undefined,
        allergens: item.allergens || [],
        serving_size: item.serving_size || undefined,
        calories: item.calories || undefined,
        protein_g: item.protein_g || undefined,
        carbs_g: item.carbs_g || undefined,
        fat_g: item.fat_g || undefined,
        fiber_g: item.fiber_g || undefined,
        sugar_g: item.sugar_g || undefined,
        sodium_mg: item.sodium_mg || undefined,
        protein_per_100cals: item.protein_per_100cals || undefined,
        last_verified: undefined,
        ingredients: item.ingredients || undefined,
        is_collection: item.is_collection || undefined,
        location_name: item.location_name,
        meal_name: item.meal_name,
        station_name: item.station_name,
        meals: [item.meal_name]
      });
    }
  });

  return Array.from(itemMap.values());
}

function createDateFilters(filters: SearchFilters, query: string): DateSearchFilters {
  return {
    searchQuery: query,
    locations: filters.diningHalls,
    meals: filters.timeOfDay !== 'All' ? [filters.timeOfDay] : undefined,
    dietaryPreferences: filters.dietaryPreferences,
    excludeAllergens: filters.excludeAllergens
  };
}

function createDateOptions(options: SearchOptions): DateSearchOptions {
  return {
    sortBy: options.sortBy === 'protein/calorie' ? 'protein_per_100cals' : options.sortBy,
    sortOrder: options.sortOrder,
    limit: options.limit,
    offset: options.offset
  };
}

// Custom hook for search functionality
function useSearch() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<MenuItem[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [error, setError] = React.useState<any>(null);
  const [currentPage, setCurrentPage] = React.useState(0);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);
  const [hasSearched, setHasSearched] = React.useState(false);
  
  const debouncedQuery = useDebounce(searchQuery, 300);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const performSearch = React.useCallback(async (
    query: string,
    filters: SearchFilters,
    options: SearchOptions = {}
  ) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setIsSearching(true);
      setError(null);

      const dateFilters = createDateFilters(filters, query);
      const dateOptions = createDateOptions(options);

      const { data, count, error } = await dateSearchService.searchMenuItemsByDate(
        new Date(),
        dateFilters,
        dateOptions
      );

      if (controller.signal.aborted) return;

      if (error) {
        setError(error);
        return;
      }

      const convertedResults = convertDayMenuItemsToMenuItems(data);
      setSearchResults(convertedResults);
      setTotalCount(count);
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsSearching(false);
      }
    }
  }, []);

  const loadMoreItems = React.useCallback(async (
    query: string,
    filters: SearchFilters,
    sortBy: string,
    sortOrder: 'asc' | 'desc',
    currentPage: number,
    searchResults: MenuItem[],
    totalCount: number
  ) => {
    setLoadingMore(true);
    try {
      const dateFilters = createDateFilters(filters, query);
      const dateOptions = createDateOptions({
        sortBy: sortBy as any,
        sortOrder,
        limit: 20,
        offset: (currentPage + 1) * 20
      });

      const { data, error } = await dateSearchService.searchMenuItemsByDate(
        new Date(),
        dateFilters,
        dateOptions
      );

      if (error) {
        console.error('Load more error:', error);
        return;
      }

      const convertedResults = convertDayMenuItemsToMenuItems(data);
      setSearchResults(prev => [...prev, ...convertedResults]);
      setCurrentPage(prev => prev + 1);
      
      const newTotalResults = searchResults.length + convertedResults.length;
      const newHasMore = convertedResults.length === 20 && newTotalResults < totalCount;
      setHasMore(newHasMore);
    } catch (error) {
      console.error('Load more error:', error);
    } finally {
      setLoadingMore(false);
    }
  }, []);

  React.useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    debouncedQuery,
    isSearching,
    searchResults,
    setSearchResults,
    totalCount,
    error,
    performSearch,
    loadMoreItems,
    currentPage,
    setCurrentPage,
    loadingMore,
    hasMore,
    setHasMore,
    hasSearched,
    setHasSearched
  };
}

export default function SearchPage() {
  const router = useRouter();
  const {
    searchQuery,
    setSearchQuery,
    debouncedQuery,
    isSearching,
    searchResults,
    setSearchResults,
    totalCount,
    error,
    performSearch,
    loadMoreItems,
    currentPage,
    setCurrentPage,
    loadingMore,
    hasMore,
    setHasMore,
    hasSearched,
    setHasSearched
  } = useSearch();
  
  const [showSortBy, setShowSortBy] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<'calories' | 'protein_g' | 'protein/calorie' | 'carbs_g' | 'fat_g' | 'name'>('name');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');
  
  const [currentFilters, setCurrentFilters] = React.useState<SearchFilters>({
    timeOfDay: "All",
    diningHalls: [],
    dietaryPreferences: {
      vegetarian: false,
      vegan: false,
      glutenFree: false,
    },
    excludeAllergens: [],
    mealAvailabilityOnly: false,
  });

  // Trigger search when debounced query or filters change
  React.useEffect(() => {
    setCurrentPage(0);
    setHasMore(true);
    setSearchResults([]);
    
    if (debouncedQuery.trim() || hasSearched) {
      setHasSearched(true);
      performSearch(debouncedQuery, currentFilters, {
        sortBy,
        sortOrder,
        limit: 20,
        offset: 0
      });
    } else {
      performSearch('', currentFilters, {
        sortBy,
        sortOrder,
        limit: 20,
        offset: 0
      });
    }
  }, [debouncedQuery, currentFilters, sortBy, sortOrder, performSearch, hasSearched]);

  const handleSearch = React.useCallback(async (query: string, filters: SearchFilters) => {
    setCurrentFilters(filters);
    setSearchQuery(query);
  }, []);

  const handleSortChange = React.useCallback((newSortBy: string, order: 'highest' | 'lowest') => {
    const sortByMap: Record<string, typeof sortBy> = {
      'Calories': 'calories',
      'Protein': 'protein_g',
      'Protein/Calorie': 'protein/calorie',
      'Carbs': 'carbs_g',
      'Fat': 'fat_g'
    };

    setSortBy(sortByMap[newSortBy] || 'name');
    setSortOrder(order === 'highest' ? 'desc' : 'asc');
  }, []);

  const [collectionStatus, setCollectionStatus] = React.useState<Record<string, boolean>>({});

  const checkCollectionStatus = React.useCallback(async (itemId: string) => {
    try {
      const { data: itemData, error } = await supabase
        .from('item')
        .select('is_collection')
        .eq('id', itemId)
        .single();

      if (!error && itemData) {
        setCollectionStatus(prev => ({ ...prev, [itemId]: itemData.is_collection }));
      }
    } catch (error) {
      console.error('Error checking if item is collection:', error);
    }
  }, []);

  const checkCollectionStatusBatch = React.useCallback(async (itemIds: string[]) => {
    try {
      const { data: itemsData, error } = await supabase
        .from('item')
        .select('id, is_collection')
        .in('id', itemIds);

      if (!error && itemsData) {
        const newStatus: Record<string, boolean> = {};
        itemsData.forEach(item => {
          newStatus[item.id] = item.is_collection || false;
        });
        setCollectionStatus(prev => ({ ...prev, ...newStatus }));
      }
    } catch (error) {
      console.error('Error checking collection status batch:', error);
    }
  }, []);

  const handleMenuItemPress = React.useCallback(async (item: MenuItem) => {
    // Check if this item is a collection
    if (collectionStatus[item.id]) {
      // Navigate to collection page
      router.push(`/collection/${item.id}`);
      return;
    }

    // Navigate to nutrition page if serving size exists, otherwise to missing nutrition page
    if (item.serving_size) {
      router.push(`/nutrition/${item.id}`);
    } else {
      router.push(`/missing-nutrition/${item.id}`);
    }
  }, [router, collectionStatus]);

  // Check collection status when search results change
  React.useEffect(() => {
    const itemIds = searchResults.map(item => item.id);
    if (itemIds.length > 0) {
      checkCollectionStatusBatch(itemIds);
    }
  }, [searchResults]);

  const handleLoadMore = React.useCallback(() => {
    if (hasMore && !loadingMore) {
      loadMoreItems(debouncedQuery, currentFilters, sortBy, sortOrder, currentPage, searchResults, totalCount);
    }
  }, [hasMore, loadingMore, debouncedQuery, currentFilters, sortBy, sortOrder, currentPage, searchResults, totalCount, loadMoreItems]);

  return (
    <BackgroundTemplate>
      <View className="flex-1 px-6 pt-16">
        {/* Header */}
        <View className="flex-row items-center justify-center mb-6">
          <Text className="text-2xl font-sora-bold text-white">Search</Text>
        </View>

        {/* Search Component */}
        <ItemSearchComponent 
          onSearch={handleSearch}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
        />

        {/* Results Section */}
        <View className="flex-1">
          {/* Results Header */}
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-white text-base font-sora">
              {isSearching ? "Searching..." : hasSearched ? `${totalCount} results` : "Available now"}
            </Text>
            <TouchableOpacity onPress={() => setShowSortBy(true)} className="p-2">
              <Ionicons name="swap-vertical" size={20} color="#CFB991" />
            </TouchableOpacity>
          </View>

          {/* Loading Indicator */}
          {isSearching && searchResults.length === 0 && (
            <View className="flex-1 justify-center items-center py-8">
              <ActivityIndicator size="large" color="#CFB991" />
              <Text className="text-gray-400 text-lg font-sora mt-4">Searching menu items...</Text>
            </View>
          )}

          {/* Results */}
          {!isSearching && (
            <ScrollView 
              className="flex-1" 
              showsVerticalScrollIndicator={false}
              onMomentumScrollEnd={({ nativeEvent }) => {
                const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
                const isNearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 100;
                if (isNearBottom) handleLoadMore();
              }}
            >
              {searchResults.length > 0 ? (
                <>
                  {searchResults.map((item, index) => (
                    <TouchableOpacity
                      key={`${item.id}-${index}`}
                      onPress={() => handleMenuItemPress(item)}
                    >
                      <MenuItemCard
                        item={item}
                        showDietaryTag={true}
                        meals={item.meals || []}
                        isCollection={collectionStatus[item.id] || false}
                      />
                    </TouchableOpacity>
                  ))}
                  
                  {/* Load more indicator */}
                  {loadingMore && (
                    <View className="py-4 justify-center items-center">
                      <ActivityIndicator size="small" color="#CFB991" />
                      <Text className="text-gray-400 text-sm font-sora mt-2">Loading more...</Text>
                    </View>
                  )}
                  
                  {/* End of results indicator */}
                  {!hasMore && searchResults.length > 0 && (
                    <View className="py-4 justify-center items-center">
                      <Text className="text-gray-400 text-sm font-sora">That's all for now!</Text>
                    </View>
                  )}
                </>
              ) : !isSearching && (
                <View className="flex-1 justify-center items-center py-8">
                  <Text className="text-gray-400 text-lg font-sora text-center">
                    {hasSearched ? "No results found" : "No items available"}
                  </Text>
                  <Text className="text-gray-500 text-sm font-sora text-center mt-2">
                    {hasSearched ? "Try adjusting your search or filters" : "Check back later for menu updates"}
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>

        {/* Sort By Modal */}
        <SortBy
          visible={showSortBy}
          onClose={() => setShowSortBy(false)}
          onSortChange={handleSortChange}
          currentSort="Calories"
          currentOrder={sortOrder === 'desc' ? 'highest' : 'lowest'}
        />
      </View>
    </BackgroundTemplate>
  );
}