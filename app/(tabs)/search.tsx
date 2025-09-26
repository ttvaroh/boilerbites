// Updated search.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as React from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import BackgroundTemplate from "../../components/BackgroundTemplate";
import ItemSearchComponent from "../../components/ItemSearch";
import MenuItemCard from "../../components/MenuItemCard";
import SortBy from "../../components/SortBy";
import { MenuItem, SearchFilters, searchService } from "../../services/searchService";

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

export default function SearchPage() {
  const router = useRouter();
  
  // State management
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showSortBy, setShowSortBy] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [results, setResults] = React.useState<MenuItem[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
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
    mealAvailabilityOnly: true,
  });

  // Debounced search query for auto-search
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const ITEMS_PER_PAGE = 20;

  /**
   * Perform search with current parameters
   */
  const performSearch = React.useCallback(async (
    query: string = debouncedSearchQuery,
    filters: SearchFilters = currentFilters,
    page: number = 0,
    append: boolean = false
  ) => {
    try {
      if (page === 0 && !append) {
        setLoading(true);
        setResults([]);
        setHasSearched(true);
      } else {
        setLoadingMore(true);
      }

      const { data, count, error } = await searchService.searchMenuItems(
        query,
        filters,
        {
          sortBy,
          sortOrder,
          limit: ITEMS_PER_PAGE,
          offset: page * ITEMS_PER_PAGE
        }
      );

      if (error) {
        Alert.alert('Search Error', 'Failed to search menu items. Please try again.');
        console.error('Search error:', error);
        return;
      }

      if (append && page > 0) {
        setResults(prev => [...prev, ...data]);
      } else {
        setResults(data);
        setTotalCount(count);
      }

      setCurrentPage(page);
      setHasMore(data.length === ITEMS_PER_PAGE && (page + 1) * ITEMS_PER_PAGE < count);

    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Search Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [debouncedSearchQuery, currentFilters, sortBy, sortOrder]);

  /**
   * Load initial items (all items, not just currently available)
   */
  const loadInitialItems = React.useCallback(async () => {
    try {
      setLoading(true);
      // Use regular search with default filters (timeOfDay: "All", mealAvailabilityOnly: false)
      const defaultFilters: SearchFilters = {
        timeOfDay: "All",
        diningHalls: [],
        dietaryPreferences: {
          vegetarian: false,
          vegan: false,
          glutenFree: false,
        },
        excludeAllergens: [],
        mealAvailabilityOnly: false,
      };
      
      const { data, error } = await searchService.searchMenuItems(
        '', // Empty query to get all items
        defaultFilters,
        {
          sortBy,
          sortOrder,
          limit: ITEMS_PER_PAGE,
          offset: 0
        }
      );
      
      if (error) {
        console.error('Initial load error:', error);
        return;
      }

      setResults(data);
      setTotalCount(data.length);
      setHasMore(data.length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Initial load error:', error);
    } finally {
      setLoading(false);
    }
  }, [sortBy, sortOrder]);

  /**
   * Handle search from ItemSearchComponent
   */
  const handleSearch = React.useCallback(async (query: string, filters: SearchFilters) => {
    setCurrentFilters(filters);
    setSearchQuery(query);
    // The actual search will be triggered by the useEffect below due to debouncing
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
    if (loadingMore || !hasMore) return;
    await performSearch(debouncedSearchQuery, currentFilters, currentPage + 1, true);
  }, [loadingMore, hasMore, performSearch, debouncedSearchQuery, currentFilters, currentPage]);

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

  // Effect for debounced search
  React.useEffect(() => {
    if (debouncedSearchQuery.trim() || hasSearched) {
      performSearch();
    } else if (!hasSearched) {
      loadInitialItems();
    }
  }, [debouncedSearchQuery, currentFilters, sortBy, sortOrder]);

  // Initial load
  React.useEffect(() => {
    loadInitialItems();
  }, []);

  return (
    <BackgroundTemplate>
      <View className="flex-1 px-6 pt-16">
        {/* Search Component */}
        <ItemSearchComponent 
          onSearch={handleSearch}
        />

        {/* Results Section */}
        <View className="flex-1 mt-6">
          {/* Results Header */}
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-white text-base font-sora">
              {loading ? "Loading..." : hasSearched ? `${totalCount} results` : "Available now"}
            </Text>
            <TouchableOpacity
              onPress={() => setShowSortBy(true)}
              className="p-2"
            >
              <Ionicons name="swap-vertical" size={20} color="#CFB991" />
            </TouchableOpacity>
          </View>

          {/* Loading Indicator */}
          {loading && results.length === 0 && (
            <View className="flex-1 justify-center items-center py-8">
              <ActivityIndicator size="large" color="#CFB991" />
              <Text className="text-gray-400 text-lg font-sora mt-4">
                Searching menu items...
              </Text>
            </View>
          )}

          {/* Results */}
          {!loading && (
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
              {results.length > 0 ? (
                <>
                  {results.map((item, index) => (
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
                  {!hasMore && results.length > 0 && (
                    <View className="py-4 justify-center items-center">
                      <Text className="text-gray-400 text-sm font-sora">
                        That's all for now!
                      </Text>
                    </View>
                  )}
                </>
              ) : !loading && (
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