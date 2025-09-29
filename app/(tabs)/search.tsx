// Updated search.tsx
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
import { MenuItem, SearchFilters, SearchOptions, searchService } from "../../services/searchService";

// Add debounce hook for search optimization
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Custom hook for debounced live search with request cancellation
function useDebouncedSearch() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<MenuItem[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [error, setError] = React.useState<any>(null);
  
  const debouncedQuery = useDebounce(searchQuery, 300);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const performSearch = React.useCallback(async (
    query: string,
    filters: SearchFilters,
    options: SearchOptions = {}
  ) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setIsSearching(true);
      setError(null);

      const { data, count, error } = await searchService.searchMenuItems(
        query,
        filters,
        options
      );

      // Check if request was aborted
      if (controller.signal.aborted) {
        return;
      }

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

  const appendSearchResults = React.useCallback((newData: MenuItem[]) => {
    setSearchResults(prev => [...prev, ...newData]);
  }, []);

  const resetSearchResults = React.useCallback(() => {
    setSearchResults([]);
    setTotalCount(0);
    setError(null);
  }, []);

  // Cleanup on unmount
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
    appendSearchResults,
    resetSearchResults,
    totalCount,
    error,
    performSearch
  };
}

export default function SearchPage() {
  const router = useRouter();
  
  // Use the debounced search hook
  const {
    searchQuery,
    setSearchQuery,
    debouncedQuery,
    isSearching,
    searchResults,
    setSearchResults,
    appendSearchResults,
    resetSearchResults,
    totalCount,
    error,
    performSearch
  } = useDebouncedSearch();
  
  // State management
  const [showSortBy, setShowSortBy] = React.useState(false);
  const [hasSearched, setHasSearched] = React.useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(0);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);
  
  // Sort state
  const [sortBy, setSortBy] = React.useState<'calories' | 'protein_g' | 'protein/calorie' | 'carbs_g' | 'fat_g' | 'name'>('name');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');
  
  // Current filters
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

  const ITEMS_PER_PAGE = 20;

  // Trigger search when debounced query or filters change
  React.useEffect(() => {
    // Reset pagination state when starting a new search
    setCurrentPage(0);
    setHasMore(true);
    
    // Reset search results for new search
    resetSearchResults();
    
    if (debouncedQuery.trim() || hasSearched) {
      setHasSearched(true);
      performSearch(debouncedQuery, currentFilters, {
        sortBy,
        sortOrder,
        limit: ITEMS_PER_PAGE,
        offset: 0
      });
    } else {
      // Load initial items with current filters
      performSearch('', currentFilters, {
        sortBy,
        sortOrder,
        limit: ITEMS_PER_PAGE,
        offset: 0
      });
    }
  }, [debouncedQuery, currentFilters, sortBy, sortOrder, performSearch, hasSearched, resetSearchResults]);

  /**
   * Handle search from ItemSearchComponent
   */
  const handleSearch = React.useCallback(async (query: string, filters: SearchFilters) => {
    setCurrentFilters(filters);
    setSearchQuery(query);
    // The actual search will be triggered by the useEffect above due to debouncing
  }, []);

  /**
   * Handle sort changes
   */
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

  /**
   * Load more items (pagination)
   */
  const loadMoreItems = React.useCallback(async () => {
    setLoadingMore(true);
    try {
      const { data, error } = await searchService.searchMenuItems(
        debouncedQuery,
        currentFilters,
        {
          sortBy,
          sortOrder,
          limit: ITEMS_PER_PAGE,
          offset: (currentPage + 1) * ITEMS_PER_PAGE
        }
      );

      if (error) {
        console.error('Load more error:', error);
        return;
      }


      // Append to existing results using the hook's method
      appendSearchResults(data);
      setCurrentPage(prev => prev + 1);
      
      // Update hasMore based on whether we got a full page and if there are more items
      const newTotalResults = searchResults.length + data.length;
      const newHasMore = data.length === ITEMS_PER_PAGE && newTotalResults < totalCount;
      setHasMore(newHasMore);
      

    } catch (error) {
      console.error('Load more error:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, debouncedQuery, currentFilters, sortBy, sortOrder, currentPage, appendSearchResults, searchResults, totalCount]);

  /**
   * Handle menu item press
   */
  const handleMenuItemPress = React.useCallback((item: MenuItem) => {
    // Navigate to nutrition page if serving size exists, otherwise to missing nutrition page
    if (item.serving_size) {
      router.push(`/nutrition/${item.id}`);
    } else {
      router.push(`/missing-nutrition/${item.id}`);
    }
  }, [router]);


  return (
    <BackgroundTemplate>
      <View className="flex-1 px-6 pt-16">
        {/* Header */}
        <View className="flex-row items-center justify-center mb-6">
          <Text className="text-2xl font-sora-bold text-white">
            Search
          </Text>
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
            <TouchableOpacity
              onPress={() => setShowSortBy(true)}
              className="p-2"
            >
              <Ionicons name="swap-vertical" size={20} color="#CFB991" />
            </TouchableOpacity>
          </View>

          {/* Loading Indicator */}
          {isSearching && searchResults.length === 0 && (
            <View className="flex-1 justify-center items-center py-8">
              <ActivityIndicator size="large" color="#CFB991" />
              <Text className="text-gray-400 text-lg font-sora mt-4">
                Searching menu items...
              </Text>
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
                
                if (isNearBottom && hasMore && !loadingMore) {
                  loadMoreItems();
                }
              }}
            >
              {searchResults.length > 0 ? (
                <>
                  {searchResults.map((item, index) => (
                    <TouchableOpacity
                      key={`${item.id}-${index}`} // Handle potential duplicates
                      onPress={() => handleMenuItemPress(item)}
                    >
                      <MenuItemCard
                        item={item}
                        showDietaryTag={true}
                        meals={item.meals || []}
                      />
                    </TouchableOpacity>
                  ))}
                  
                  {/* Load more indicator */}
                  {loadingMore && (
                    <View className="py-4 justify-center items-center">
                      <ActivityIndicator size="small" color="#CFB991" />
                      <Text className="text-gray-400 text-sm font-sora mt-2">
                        Loading more...
                      </Text>
                    </View>
                  )}
                  
                  {/* End of results indicator */}
                  {!hasMore && searchResults.length > 0 && (
                    <View className="py-4 justify-center items-center">
                      <Text className="text-gray-400 text-sm font-sora">
                        That's all for now!
                      </Text>
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