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
import SortBy from "../components/SortBy";
import { useNutritionGoals } from "../contexts/NutritionGoalsContext";
import { supabase } from "../lib/supabase";
import { FDCSearchFilters, FDCSearchOptions, fdcSearchService } from "../services/searchService";

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
  dietaryPreferences: {
    vegetarian: boolean;
    vegan: boolean;
    glutenFree: boolean;
  };
  excludeAllergens: string[];
}

interface SearchOptions {
  sortBy?: 'protein/calorie' | 'protein_g' | 'carbs_g' | 'fat_g' | 'calories' | 'name' | null;
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

function createFDCFilters(filters: SearchFilters, query: string): FDCSearchFilters {
  return {
    searchQuery: query,
    dietaryPreferences: filters.dietaryPreferences,
    excludeAllergens: filters.excludeAllergens
  };
}

function createFDCOptions(options: SearchOptions): FDCSearchOptions {
  return {
    sortBy: options.sortBy === 'protein/calorie' ? 'protein_per_100cals' : 
            options.sortBy === null ? undefined : options.sortBy,
    sortOrder: options.sortOrder,
    limit: 1000,
    offset: 0
  };
}

// Custom hook for FDC search functionality
function useFDCSearch() {
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

      const fdcFilters = createFDCFilters(filters, query);
      const fdcOptions = createFDCOptions(options);

      const { data, count, error } = await fdcSearchService.searchFoods(
        fdcFilters,
        fdcOptions
      );

      if (controller.signal.aborted) return;

      if (error) {
        setError(error);
        return;
      }

      setSearchResults(data);
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

export default function FDCSearchPage() {
  const router = useRouter();
  const { goals: nutritionGoals } = useNutritionGoals();
  
  // Map nutrition preferences to allergen names for filtering
  const getUserAllergens = () => {
    if (!nutritionGoals) return [];
    
    const allergens: string[] = [];
    if (nutritionGoals.dairy_allergy) allergens.push('Dairy');
    if (nutritionGoals.eggs_allergy) allergens.push('Eggs');
    if (nutritionGoals.shellfish_allergy) allergens.push('Shellfish');
    if (nutritionGoals.nuts_allergy) allergens.push('Tree Nuts');
    if (nutritionGoals.gluten_allergy) allergens.push('Wheat');
    if (nutritionGoals.soy_allergy) allergens.push('Soy');
    if (nutritionGoals.fish_allergy) allergens.push('Fish');
    if (nutritionGoals.peanut_allergy) allergens.push('Peanuts');
    
    return allergens;
  };
  
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
  } = useFDCSearch();
  
  const [showSortBy, setShowSortBy] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<'calories' | 'protein_g' | 'protein/calorie' | 'carbs_g' | 'fat_g' | 'name' | null>('protein/calorie');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');
  const [isSortCleared, setIsSortCleared] = React.useState(false);
  
  const [currentFilters, setCurrentFilters] = React.useState<SearchFilters>({
    dietaryPreferences: {
      vegetarian: false,
      vegan: false,
      glutenFree: false,
    },
    excludeAllergens: getUserAllergens(),
  });

  const [refreshing, setRefreshing] = React.useState(false);

  // Update filters when nutrition goals change
  React.useEffect(() => {
    if (nutritionGoals) {
      const userAllergens = getUserAllergens();
      setCurrentFilters(prev => ({
        ...prev,
        excludeAllergens: userAllergens,
      }));
    }
  }, [nutritionGoals]);

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

  const handleSearch = React.useCallback(async (query: string, filters: any) => {
    // Convert filters to our format (remove timeOfDay and diningHalls)
    const fdcFilters: SearchFilters = {
      dietaryPreferences: filters.dietaryPreferences || {
        vegetarian: false,
        vegan: false,
        glutenFree: false,
      },
      excludeAllergens: filters.excludeAllergens || [],
    };
    setCurrentFilters(fdcFilters);
    setSearchQuery(query);
  }, []);

  // Pull to refresh handler
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await performSearch(debouncedQuery, currentFilters, {
        sortBy,
        sortOrder
      });
    } finally {
      setRefreshing(false);
    }
  }, [debouncedQuery, currentFilters, sortBy, sortOrder, performSearch]);

  const handleSortChange = React.useCallback((newSortBy: string, order: 'highest' | 'lowest') => {
    // Handle clear sort
    if (newSortBy === '') {
      setSortBy(null);
      setSortOrder('desc');
      setIsSortCleared(true);
      return;
    }

    const sortByMap: Record<string, typeof sortBy> = {
      'Protein/Calorie': 'protein/calorie',
      'Protein': 'protein_g',
      'Carbs': 'carbs_g',
      'Fat': 'fat_g',
      'Calories': 'calories'
    };

    setSortBy(sortByMap[newSortBy] || null);
    setSortOrder(order === 'highest' ? 'desc' : 'asc');
    setIsSortCleared(false);
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

    // Navigate to nutrition page with source=fdc
    router.push(`/nutrition/${item.id}?source=fdc`);
  }, [router, collectionStatus]);

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
      />
    );
  }, [handleMenuItemPress, collectionStatus]);

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
          {hasSearched ? "No results found" : "Search for foods from FoodData Central"}
        </Text>
        <Text className="text-gray-500 text-sm font-sora text-center mt-2">
          {hasSearched ? "Try adjusting your search or filters" : "Enter a food name to get started"}
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
              FDC Search
            </Text>
          </View>

          {/* Search Component */}
          <ItemSearchComponent 
            onSearch={handleSearch}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            initialFilters={{
              timeOfDay: "All",
              diningHalls: [],
              dietaryPreferences: currentFilters.dietaryPreferences,
              excludeAllergens: currentFilters.excludeAllergens,
            }}
            hideLocationMealFilters={true}
          />

          {/* Results Header */}
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-white text-base font-sora">
              {isSearching ? "Searching..." : hasSearched ? `${totalCount} results` : "Available"}
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
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#CFB991"
                  colors={["#CFB991"]}
                />
              }
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

          {/* Sort By Modal */}
          <SortBy
            visible={showSortBy}
            onClose={() => setShowSortBy(false)}
            onSortChange={handleSortChange}
            currentSort={isSortCleared ? undefined : 
                        sortBy === 'protein/calorie' ? 'Protein/Calorie' : 
                        sortBy === 'protein_g' ? 'Protein' :
                        sortBy === 'carbs_g' ? 'Carbs' :
                        sortBy === 'fat_g' ? 'Fat' :
                        sortBy === 'calories' ? 'Calories' : 
                        sortBy === null ? undefined : 'Protein/Calorie'}
            currentOrder={sortOrder === 'desc' ? 'highest' : 'lowest'}
          />
        </View>
      </BackgroundTemplate>
    </ErrorBoundary>
  );
}

