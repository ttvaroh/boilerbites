import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as React from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import BackgroundTemplate from "../../components/BackgroundTemplate";
import ErrorBoundary from "../../components/ErrorBoundary";
import ItemSearchComponent from "../../components/ItemSearch";
import SearchItemCard from "../../components/SearchItemCard";
import SortBy from "../../components/SortBy";
import { supabase } from "../../lib/supabase";
import { DateSearchFilters, DateSearchOptions, dateSearchService, DayMenuItem } from "../../services/searchService";

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
  sortBy?: 'protein/calorie' | 'protein_g' | 'carbs_g' | 'fat_g' | 'calories' | 'name';
  sortOrder?: 'desc' | 'asc';
}

// Optimized SearchItemWrapper component
const SearchItemWrapper = React.memo(({ 
  item, 
  index, 
  onPress, 
  isCollection 
}: { 
  item: MenuItem; 
  index: number; 
  onPress: (item: MenuItem) => void; 
  isCollection: boolean; 
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
    limit: 1000, // Large limit to get all items
    offset: 0
  };
}

// Custom hook for search functionality
function useSearch() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<MenuItem[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [error, setError] = React.useState<any>(null);
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
    hasSearched,
    setHasSearched
  } = useSearch();
  
  const [showSortBy, setShowSortBy] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<'calories' | 'protein_g' | 'protein/calorie' | 'carbs_g' | 'fat_g' | 'name'>('name');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');
  
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
    setSearchResults([]);
    
    if (debouncedQuery.trim() || hasSearched) {
      setHasSearched(true);
      performSearch(debouncedQuery, currentFilters, {
        sortBy,
        sortOrder
      });
    } else {
      performSearch('', currentFilters, {
        sortBy,
        sortOrder
      });
    }
  }, [debouncedQuery, currentFilters, sortBy, sortOrder, performSearch, hasSearched]);

  const handleSearch = React.useCallback(async (query: string, filters: SearchFilters) => {
    setCurrentFilters(filters);
    setSearchQuery(query);
  }, []);

  const handleSortChange = React.useCallback((newSortBy: string, order: 'highest' | 'lowest') => {
    // Handle clear sort
    if (newSortBy === '') {
      setSortBy('name');
      setSortOrder('desc');
      return;
    }

    const sortByMap: Record<string, typeof sortBy> = {
      'Protein/Calorie': 'protein/calorie',
      'Protein': 'protein_g',
      'Carbs': 'carbs_g',
      'Fat': 'fat_g',
      'Calories': 'calories'
    };

    setSortBy(sortByMap[newSortBy] || 'name');
    setSortOrder(order === 'highest' ? 'desc' : 'asc');
  }, []);

  const [collectionStatus, setCollectionStatus] = React.useState<Record<string, boolean>>({});

  const checkCollectionStatusBatch = React.useCallback(async (itemIds: string[]) => {
    try {
      const { data: itemsData, error } = await supabase
        .from('item')
        .select('id, is_collection')
        .in('id', itemIds);

      if (!error && itemsData) {
        const newStatus: Record<string, boolean> = {};
        itemsData.forEach((item: any) => {
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

  // Render item for FlatList - optimized with React.memo
  const renderItem = React.useCallback(({ item, index }: { item: MenuItem; index: number }) => {
    return (
      <SearchItemWrapper
        item={item}
        index={index}
        onPress={handleMenuItemPress}
        isCollection={collectionStatus[item.id] || false}
      />
    );
  }, [handleMenuItemPress, collectionStatus]);

  // Empty state component
  const ListEmptyComponent = React.useCallback(() => {
    if (isSearching) {
      return (
        <View className="flex-1 justify-center items-center py-8">
          <ActivityIndicator size="large" color="#CFB991" />
          <Text className="text-gray-400 text-lg font-sora mt-4">Searching menu items...</Text>
        </View>
      );
    }

    return (
      <View className="flex-1 justify-center items-center py-8">
        <Text className="text-gray-400 text-lg font-sora text-center">
          {hasSearched ? "No results found" : "No items available"}
        </Text>
        <Text className="text-gray-500 text-sm font-sora text-center mt-2">
          {hasSearched ? "Try adjusting your search or filters" : "Check back later for menu updates"}
        </Text>
      </View>
    );
  }, [isSearching, hasSearched]);

  // Footer component
  const ListFooterComponent = React.useCallback(() => {
    if (searchResults.length > 0 && !isSearching) {
      return (
        <View className="py-4 justify-center items-center">
          <Text className="text-gray-400 text-sm font-sora">
            {searchResults.length} of {totalCount} items
          </Text>
        </View>
      );
    }
    return null;
  }, [searchResults.length, totalCount, isSearching]);

  return (
    <ErrorBoundary>
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

        {/* Results Header */}
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-white text-base font-sora">
            {isSearching ? "Searching..." : hasSearched ? `${totalCount} results` : "Available now"}
          </Text>
          <TouchableOpacity onPress={() => setShowSortBy(true)} className="p-2">
            <Ionicons name="swap-vertical" size={20} color="#CFB991" />
          </TouchableOpacity>
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
            // Performance optimizations
            removeClippedSubviews={true}
            initialNumToRender={8}
            maxToRenderPerBatch={5}
            windowSize={5}
            updateCellsBatchingPeriod={50}
            disableVirtualization={false}
            legacyImplementation={false}
            // Remove getItemLayout as it can cause issues with dynamic heights
          />
        </View>

        {/* Sort By Modal */}
        <SortBy
          visible={showSortBy}
          onClose={() => setShowSortBy(false)}
          onSortChange={handleSortChange}
          currentSort={sortBy === 'protein/calorie' ? 'Protein/Calorie' : 
                      sortBy === 'protein_g' ? 'Protein' :
                      sortBy === 'carbs_g' ? 'Carbs' :
                      sortBy === 'fat_g' ? 'Fat' :
                      sortBy === 'calories' ? 'Calories' : 'Protein/Calorie'}
          currentOrder={sortOrder === 'desc' ? 'highest' : 'lowest'}
        />
        </View>
      </BackgroundTemplate>
    </ErrorBoundary>
  );
}