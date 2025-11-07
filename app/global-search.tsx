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
import { useNutritionGoals } from "../contexts/NutritionGoalsContext";
import { useOFFRateLimit } from "../hooks/useOFFRateLimit";
import { supabase } from "../lib/supabase";
import { FDCSearchFilters, FDCSearchOptions, fdcSearchService, OFFSearchFilters, offSearchService } from "../services/searchService";

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

function createOFFFilters(filters: SearchFilters, query: string): OFFSearchFilters {
  return {
    searchQuery: query,
    dietaryPreferences: filters.dietaryPreferences,
    excludeAllergens: filters.excludeAllergens
  };
}

function createFDCOptions(): FDCSearchOptions {
  return {
    limit: 1000,
    offset: 0
  };
}

// Custom hook for unified search functionality (supports FDC and OFF)
function useUnifiedSearch(selectedDatabase: 'fdc' | 'off') {
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
    checkRateLimit?: () => Promise<boolean>
  ) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setIsSearching(true);
      setError(null);

      if (selectedDatabase === 'off') {
        // Check rate limit for OFF searches
        if (checkRateLimit) {
          const canSearch = await checkRateLimit();
          if (!canSearch) {
            setError(new Error('Rate limit reached. Please wait before searching again.'));
            setIsSearching(false);
            return;
          }
        }

        const offFilters = createOFFFilters(filters, query);
        const { data, count, error } = await offSearchService.searchFoods(
          offFilters,
          { limit: 50, offset: 0 }
        );

        if (controller.signal.aborted) return;

        if (error) {
          setError(error);
          return;
        }

        setSearchResults(data);
        setTotalCount(count);
      } else {
        // FDC search
        const fdcFilters = createFDCFilters(filters, query);
        const fdcOptions = createFDCOptions();

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
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsSearching(false);
      }
    }
  }, [selectedDatabase]);

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

export default function GlobalSearchPage() {
  const router = useRouter();
  const { goals: nutritionGoals } = useNutritionGoals();
  
  // Database selection state
  const [selectedDatabase, setSelectedDatabase] = React.useState<'fdc' | 'off'>('fdc');
  
  // Rate limiting for OFF searches
  const { canSearch, requestsRemaining, timeUntilNextRequest, checkRateLimit } = useOFFRateLimit();
  
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
  } = useUnifiedSearch(selectedDatabase);
  
  
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
  // For OFF: only search on explicit button press (no auto-search)
  // For FDC: auto-search with debouncing
  React.useEffect(() => {
    if (selectedDatabase === 'off') {
      // OFF: Don't auto-search, wait for explicit search button
      return;
    }
    
    // FDC: Auto-search with debouncing
    setSearchResults([]);
    
    if (debouncedQuery.trim() || hasSearched) {
      setHasSearched(true);
      performSearch(debouncedQuery, currentFilters);
    } else {
      performSearch('', currentFilters);
    }
  }, [debouncedQuery, currentFilters, performSearch, hasSearched, selectedDatabase]);
  
  // Reset search when database changes
  React.useEffect(() => {
    setSearchResults([]);
    setHasSearched(false);
    setSearchQuery('');
  }, [selectedDatabase]);

  const handleSearch = React.useCallback(async (query: string, filters: any) => {
    // Convert filters to our format (remove timeOfDay and diningHalls)
    const searchFilters: SearchFilters = {
      dietaryPreferences: filters.dietaryPreferences || {
        vegetarian: false,
        vegan: false,
        glutenFree: false,
      },
      excludeAllergens: filters.excludeAllergens || [],
    };
    setCurrentFilters(searchFilters);
    setSearchQuery(query);
    
    // For OFF: perform search immediately on button press (with rate limit check)
    // For FDC: search will be triggered by debounced query effect
    if (selectedDatabase === 'off' && query.trim()) {
      setHasSearched(true);
      await performSearch(query.trim(), searchFilters, checkRateLimit);
    }
  }, [selectedDatabase, performSearch, checkRateLimit]);
  
  const handleDatabaseChange = React.useCallback((database: 'fdc' | 'off') => {
    setSelectedDatabase(database);
  }, []);

  // Pull to refresh handler
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      const query = selectedDatabase === 'off' ? searchQuery : debouncedQuery;
      await performSearch(query, currentFilters, selectedDatabase === 'off' ? checkRateLimit : undefined);
    } finally {
      setRefreshing(false);
    }
  }, [debouncedQuery, searchQuery, currentFilters, performSearch, selectedDatabase, checkRateLimit]);


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

    // Navigate to nutrition page with appropriate source
    if (item.id.startsWith('off_')) {
      // For OFF items: ensure item exists in database before navigating
      try {
        // Check if item exists in database
        const { data: existingItem } = await supabase
          .from('item')
          .select('id')
          .eq('id', item.id)
          .maybeSingle();

        // If not in database, use the search result data directly to create the item
        // (we already have all the data from the search, no need for another API call)
        if (!existingItem) {
          // Use the item data from search results directly
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
        console.error('Error ensuring OFF item exists in database:', error);
        // Continue navigation anyway - nutrition page will handle it
      }
      
      router.push(`/nutrition/${item.id}?source=off`);
    } else if (item.id.startsWith('fdc_')) {
      router.push(`/nutrition/${item.id}?source=fdc`);
    } else {
      // Purdue item
      router.push(`/nutrition/${item.id}`);
    }
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
          {hasSearched ? "No results found" : `Search for foods from ${selectedDatabase === 'off' ? 'Open Food Facts' : 'FoodData Central'}`}
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
              Global Search
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
            disableFilters={false}
            selectedDatabase={selectedDatabase}
            onDatabaseChange={handleDatabaseChange}
            rateLimitInfo={selectedDatabase === 'off' ? {
              canSearch,
              requestsRemaining,
              timeUntilNextRequest
            } : undefined}
            requireSearchButton={selectedDatabase === 'off'}
          />

          {/* Results Header */}
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-white text-base font-sora">
              {isSearching ? "Searching..." : hasSearched ? `${totalCount} results` : "Available"}
            </Text>
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

        </View>
      </BackgroundTemplate>
    </ErrorBoundary>
  );
}

