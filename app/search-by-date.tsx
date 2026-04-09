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
import SortBy from "../components/SortBy";
import { useNutritionGoals } from "../contexts/NutritionGoalsContext";
import { getUserAllergenNames, itemContainsIntolerance } from "../lib/allergenUtils";
import { supabase } from "../lib/supabase";
import { createLocalDateFromString } from "../lib/timezone-utils";
import { DateSearchFilters, DateSearchOptions, dateSearchService, DayMenuItem } from "../services/searchService";

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

interface SearchFilters {
  timeOfDay: string;
  diningHalls: string[];
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
        is_custom_meal: item.is_custom_meal || undefined,
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
    sortBy: options.sortBy === 'protein/calorie' ? 'protein_per_100cals' : 
            options.sortBy === null ? undefined : options.sortBy,
    sortOrder: options.sortOrder,
    limit: 1000,
    offset: 0
  };
}

// Custom hook for search functionality
function useSearch(searchDate: string) {
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
        searchDate,
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
  }, [searchDate]);

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

// Reusable SearchByDate component
interface SearchByDateProps {
  date?: string;
  showDateIndicator?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
  paddingBottom?: number;
}

export function SearchByDateComponent({ 
  date, 
  showDateIndicator = true, 
  showBackButton = true,
  onBack,
  paddingBottom = 0
}: SearchByDateProps) {
  const router = useRouter();
  const { goals: nutritionGoals } = useNutritionGoals();
  
  // Parse the initial date parameter
  const initialDate = React.useMemo(() => {
    if (!date) return new Date();
    // Use createLocalDateFromString to avoid UTC timezone issues
    try {
      const parsedDate = createLocalDateFromString(date);
      return isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
    } catch {
      return new Date();
    }
  }, [date]);
  
  // Internal state for date navigation
  const [searchDate, setSearchDate] = React.useState(initialDate);
  
  // Update searchDate when the date prop changes
  React.useEffect(() => {
    setSearchDate(initialDate);
  }, [initialDate]);

  // Format date string for API (YYYY-MM-DD)
  const dateString = React.useMemo(() => {
    const year = searchDate.getFullYear();
    const month = String(searchDate.getMonth() + 1).padStart(2, '0');
    const day = String(searchDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [searchDate]);

  // Date navigation functions
  const goToPreviousDay = () => {
    const newDate = new Date(searchDate);
    newDate.setDate(newDate.getDate() - 1);
    setSearchDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(searchDate);
    newDate.setDate(newDate.getDate() + 1);
    setSearchDate(newDate);
  };

  const goToToday = () => {
    setSearchDate(new Date());
  };

  // Check if selected date is today
  const isToday = () => {
    const today = new Date();
    return searchDate.toDateString() === today.toDateString();
  };

  // Format date for display
  const formatDate = (date: Date) => {
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return "Today";
    }
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
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
  } = useSearch(dateString);
  
  const [showSortBy, setShowSortBy] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<'calories' | 'protein_g' | 'protein/calorie' | 'carbs_g' | 'fat_g' | 'name' | null>('protein/calorie');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');
  const [isSortCleared, setIsSortCleared] = React.useState(false);
  
  // Initialize filters with nutrition goals if available
  const [currentFilters, setCurrentFilters] = React.useState<SearchFilters>(() => {
    const initialAllergenNames = nutritionGoals ? getUserAllergenNames({
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
    }) : [];
    
    return {
      timeOfDay: "All",
      diningHalls: [],
      dietaryPreferences: {
        vegetarian: nutritionGoals?.vegetarian_preference || false,
        vegan: nutritionGoals?.vegan_preference || false,
        glutenFree: nutritionGoals?.gluten_allergy || false,
      },
      excludeAllergens: initialAllergenNames,
    };
  });

  const [refreshing, setRefreshing] = React.useState(false);

  // Update filters when nutrition goals change
  React.useEffect(() => {
    if (nutritionGoals) {
      setCurrentFilters(prev => ({
        ...prev,
        excludeAllergens: userAllergenNames,
        dietaryPreferences: {
          vegetarian: nutritionGoals.vegetarian_preference || false,
          vegan: nutritionGoals.vegan_preference || false,
          glutenFree: nutritionGoals.gluten_allergy || false,
        },
      }));
    }
  }, [nutritionGoals, userAllergenNames]);

  // Trigger search when debounced query, filters, or date changes
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
  }, [debouncedQuery, currentFilters, sortBy, sortOrder, performSearch, hasSearched, dateString]);

  const handleSearch = React.useCallback(async (query: string, filters: SearchFilters) => {
    setCurrentFilters(filters);
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
  const [customMealStatus, setCustomMealStatus] = React.useState<Record<string, boolean>>({});
  const hydrationTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHydrationSignatureRef = React.useRef<string>('');
  const hydrationRequestIdRef = React.useRef(0);

  const checkCollectionStatusBatch = React.useCallback(async (itemIds: string[], requestId: number) => {
    try {
      const newCollectionStatus: Record<string, boolean> = {};
      const newCustomMealStatus: Record<string, boolean> = {};

      for (const chunk of chunkArray(itemIds, HYDRATION_BATCH_SIZE)) {
        const { data: itemsData, error } = await supabase
          .from('item')
          .select('id, is_collection, user_id')
          .in('id', chunk);

        // Ignore stale responses from older requests.
        if (requestId !== hydrationRequestIdRef.current) {
          return;
        }

        if (error || !itemsData) {
          continue;
        }

        itemsData.forEach((item: any) => {
          const isCollection = item.is_collection || false;
          const isCustomMeal = isCollection && item.user_id !== null;
          const isSystemCollection = isCollection && item.user_id === null;
          newCollectionStatus[item.id] = isSystemCollection;
          newCustomMealStatus[item.id] = isCustomMeal;
        });
      }

      if (requestId === hydrationRequestIdRef.current) {
        setCollectionStatus(prev => ({ ...prev, ...newCollectionStatus }));
        setCustomMealStatus(prev => ({ ...prev, ...newCustomMealStatus }));
      }
    } catch (error) {
      console.error('Error checking collection status batch:', error);
    }
  }, []);

  const handleMenuItemPress = React.useCallback(async (item: MenuItem) => {
    const { isCollection: resolvedIsCollection, isCustomMeal: resolvedIsCustomMeal } =
      getResolvedCollectionState(item, collectionStatus, customMealStatus);

    // Check if this item is a system collection (not custom meal)
    if (resolvedIsCollection && !resolvedIsCustomMeal) {
      router.push(`/collection/${item.id}?date=${dateString}`);
      return;
    }

    // Custom meals should always go to nutrition page (they have aggregated nutrition)
    const isCustomMeal = resolvedIsCustomMeal;
    
    // Custom meals and items with serving_size go to nutrition page
    // Items without serving_size (and not custom meals) go to missing nutrition page
    if (isCustomMeal || item.serving_size) {
      router.push(`/nutrition/${item.id}?date=${dateString}`);
    } else {
      router.push(`/missing-nutrition/${item.id}?date=${dateString}`);
    }
  }, [router, collectionStatus, customMealStatus, dateString]);

  // Check collection status when search results change
  React.useEffect(() => {
    if (hydrationTimeoutRef.current) {
      clearTimeout(hydrationTimeoutRef.current);
      hydrationTimeoutRef.current = null;
    }

    const unresolvedIds = Array.from(
      new Set(
        searchResults
          .filter((item) => item.is_collection === undefined || item.is_custom_meal === undefined)
          .map((item) => item.id)
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

  // Render item for FlatList - optimized with React.memo
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
      <BackgroundTemplate paddingBottom={paddingBottom}>
        <View className="flex-1 px-6 pt-16">
          {/* Header with Back Button */}
          {showBackButton && (
            <View className="flex-row items-center justify-between mb-4">
              <TouchableOpacity
                onPress={onBack || (() => router.back())}
                className="p-2 -ml-2"
              >
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              
              <Text className="text-2xl font-sora-bold text-white flex-1 text-center mr-8">
                Search
              </Text>
            </View>
          )}

          {/* Date Indicator with Navigation */}
          {showDateIndicator && (
            <View className="bg-gray-800 rounded-lg px-4 py-3 mb-4 border border-purdueGold/30">
              <View className="flex-row items-center justify-between">
                <TouchableOpacity onPress={goToPreviousDay} className="p-2 -ml-2">
                  <Ionicons name="chevron-back" size={20} color="white" />
                </TouchableOpacity>
                
                <TouchableOpacity onPress={goToToday} className="flex-1 items-center">
                  <View className="flex-row items-center justify-center">
                    <Ionicons name="calendar-outline" size={18} color="#CFB991" />
                    <Text className="text-purdueGold text-base font-sora-semibold ml-2">
                      {isToday() ? "Today" : formatDate(searchDate)}
                    </Text>
                  </View>
                  {!isToday() && (
                    <Text className="text-xs text-gray-400 mt-1">
                      Tap to go to today
                    </Text>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity onPress={goToNextDay} className="p-2 -mr-2">
                  <Ionicons name="chevron-forward" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Search Component */}
          <ItemSearchComponent 
            onSearch={handleSearch}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            initialFilters={currentFilters}
            placeholder="Search for items from Purdue..."
          />

          {/* Results Header */}
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-white text-base font-sora">
              {isSearching ? "Searching..." : hasSearched ? `${totalCount} results` : "Available"}
            </Text>
            <View className="flex-row items-center">
              <TouchableOpacity 
                onPress={() => router.push('/favorites')} 
                className="p-2 mr-2"
              >
                <Ionicons name="heart-outline" size={22} color="#CFB991" />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => router.push('/global-search')} 
                className="p-2 mr-2"
              >
                <Ionicons name="globe-outline" size={20} color="#CFB991" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowSortBy(true)} className="p-2">
                <Ionicons name="swap-vertical" size={20} color="#CFB991" />
              </TouchableOpacity>
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

// Default page component for the route
export default function SearchByDatePage() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  
  return (
    <SearchByDateComponent 
      date={date}
      showDateIndicator={true}
      showBackButton={true}
    />
  );
}