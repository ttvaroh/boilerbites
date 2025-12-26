import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as React from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import BackgroundTemplate from "../components/BackgroundTemplate";
import FavoriteItemCard from "../components/FavoriteItemCard";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

interface FavoriteItem {
  id: string;
  originalItemId?: string; // Store the original item ID for navigation
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
  favorited_at: string;
  is_available_today?: boolean; // Flag indicating if item is available today
  available_locations?: string[];
  available_meals?: string[];
  available_dates?: string[];
}

export default function FavoritesPage() {
  const { user, getFavorites } = useAuth();
  const router = useRouter();
  const [favorites, setFavorites] = React.useState<FavoriteItem[]>([]);
  const [upcomingFavorites, setUpcomingFavorites] = React.useState<FavoriteItem[]>([]);
  const [globalFavorites, setGlobalFavorites] = React.useState<FavoriteItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [upcomingLoading, setUpcomingLoading] = React.useState(false);
  const [globalLoading, setGlobalLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<'purdue' | 'global' | 'upcoming'>('purdue');
  const [refreshing, setRefreshing] = React.useState(false);
  const hasAttemptedUpcomingFetch = React.useRef(false);
  const hasAttemptedGlobalFetch = React.useRef(false);

  // Fetch user's favorite items
  const fetchFavorites = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Get favorite items from AuthContext
      const { data: favoriteItems, error: favoritesError } = await getFavorites();

      if (favoritesError) {
        console.error('Error fetching favorites:', favoritesError);
        setError('Failed to load favorites. Please try again.');
        return;
      }

      if (!favoriteItems || favoriteItems.length === 0) {
        setFavorites([]);
        return;
      }

      // Get full item details for each favorite, filtered to only Purdue items
      // Filter by source = 0 (Purdue) and exclude FatSecret items (IDs starting with 'fatsecret_')
      const itemIds = favoriteItems
        .map(fav => fav.item_id)
        .filter(id => !id.startsWith('fatsecret_'));
      
      if (itemIds.length === 0) {
        setFavorites([]);
        return;
      }
      
      const { data: items, error: itemsError } = await supabase
        .from('item')
        .select('*')
        .in('id', itemIds)
        .eq('source', 0);

      if (itemsError) {
        console.error('Error fetching item details:', itemsError);
        setError('Failed to load item details. Please try again.');
        return;
      }

      // Check availability for today and next 5 days
      const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 5); // Add 5 days to today
      const endDate = threeDaysFromNow.toISOString().split('T')[0]; // Get end date in YYYY-MM-DD format
      
      const { data: availabilityData } = await supabase
        .from('day_station_item')
        .select(`
          item_id,
          day_station!inner(
            day_meal!inner(
              meal_name,
              day_menu!inner(
                location_name,
                serve_date,
                is_published
              )
            )
          )
        `)
        .in('item_id', itemIds)
        .gte('day_station.day_meal.day_menu.serve_date', today)
        .lte('day_station.day_meal.day_menu.serve_date', endDate)
        .eq('day_station.day_meal.day_menu.is_published', true);

      // Create availability map
      const availabilityMap = new Map<string, { locations: string[], meals: string[], dates: string[] }>();
      if (availabilityData) {
        availabilityData.forEach((avail: any) => {
          const itemId = avail.item_id;
          const dayStation = avail.day_station as any;
          const location = dayStation?.day_meal?.day_menu?.location_name;
          const meal = dayStation?.day_meal?.meal_name;
          const date = dayStation?.day_meal?.day_menu?.serve_date;
          
          if (!availabilityMap.has(itemId)) {
            availabilityMap.set(itemId, { locations: [], meals: [], dates: [] });
          }
          
          const current = availabilityMap.get(itemId)!;
          if (location && !current.locations.includes(location)) {
            current.locations.push(location);
          }
          if (meal && !current.meals.includes(meal)) {
            current.meals.push(meal);
          }
          if (date && !current.dates.includes(date)) {
            current.dates.push(date);
          }
        });
      }

      // Combine favorite data with item details and availability
      // Only include items that are Purdue items (source = 0 and not FatSecret IDs)
      const favoritesWithDetails: FavoriteItem[] = favoriteItems
        .filter(fav => !fav.item_id.startsWith('fatsecret_'))
        .map(fav => {
          const item = items?.find((i: any) => i.id === fav.item_id);
          const availability = availabilityMap.get(fav.item_id);
          
          // Only include if item exists and is a Purdue item (source = 0)
          if (!item || item.source !== 0) {
            return null as any;
          }
          
          const isAvailableToday = availability?.dates?.includes(today) || false;
          
          return {
            id: fav.item_id,
            name: item.name || 'Unknown Item',
            vegetarian: item.vegetarian,
            vegan: item.vegan,
            gluten: item.gluten,
            allergens: item.allergens || [],
            serving_size: item.serving_size,
            calories: item.calories,
            protein_g: item.protein_g,
            carbs_g: item.carbs_g,
            fat_g: item.fat_g,
            fiber_g: item.fiber_g,
            sugar_g: item.sugar_g,
            sodium_mg: item.sodium_mg,
            protein_per_100cals: item.protein_per_100cals,
            last_verified: item.last_verified,
            ingredients: item.ingredients,
            is_collection: item.is_collection,
            favorited_at: fav.created_at,
            is_available_today: isAvailableToday,
            available_locations: availability?.locations || [],
            available_meals: availability?.meals || [],
            available_dates: availability?.dates || []
          } as FavoriteItem;
        })
        .filter((item): item is FavoriteItem => item !== null);

      setFavorites(favoritesWithDetails);
    } catch (err) {
      console.error('Favorites fetch error:', err);
      setError('Failed to load favorites. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch global favorites (FatSecret items)
  const fetchGlobalFavorites = async () => {
    if (!user) return;

    try {
      setGlobalLoading(true);
      setError(null);

      const { data: favoriteItems, error: favoritesError } = await getFavorites();

      if (favoritesError) {
        console.error('Error fetching favorites:', favoritesError);
        setError('Failed to load favorites. Please try again.');
        return;
      }

      if (!favoriteItems || favoriteItems.length === 0) {
        setGlobalFavorites([]);
        return;
      }

      const itemIds = favoriteItems.map(fav => fav.item_id);
      const { data: items, error: itemsError } = await supabase
        .from('item')
        .select('*')
        .in('id', itemIds)
        .eq('source', 1);

      if (itemsError) {
        console.error('Error fetching item details:', itemsError);
        setError('Failed to load item details. Please try again.');
        return;
      }

      if (itemsError) {
        console.error('Error fetching item details:', itemsError);
        setError('Failed to load item details. Please try again.');
        return;
      }

      const globalFavoritesWithDetails: FavoriteItem[] = favoriteItems
        .filter(fav => items?.some((i: any) => i.id === fav.item_id))
        .map(fav => {
          const item = items?.find((i: any) => i.id === fav.item_id);
          return {
            id: fav.item_id,
            name: item?.name || 'Unknown Item',
            vegetarian: item?.vegetarian,
            vegan: item?.vegan,
            gluten: item?.gluten,
            allergens: item?.allergens || [],
            serving_size: item?.serving_size,
            calories: item?.calories,
            protein_g: item?.protein_g,
            carbs_g: item?.carbs_g,
            fat_g: item?.fat_g,
            fiber_g: item?.fiber_g,
            sugar_g: item?.sugar_g,
            sodium_mg: item?.sodium_mg,
            protein_per_100cals: item?.protein_per_100cals,
            last_verified: item?.last_verified,
            ingredients: item?.ingredients,
            is_collection: item?.is_collection,
            favorited_at: fav.created_at,
            is_available_today: false,
            available_locations: [],
            available_meals: [],
            available_dates: []
          };
        });

      setGlobalFavorites(globalFavoritesWithDetails);
      hasAttemptedGlobalFetch.current = true;
    } catch (err) {
      console.error('Global favorites fetch error:', err);
      setError('Failed to load global favorites. Please try again.');
      hasAttemptedGlobalFetch.current = true;
    } finally {
      setGlobalLoading(false);
    }
  };

  // Fetch upcoming favorite items (next 5 days)
  const fetchUpcomingFavorites = async () => {
    if (!user) return;

    try {
      setUpcomingLoading(true);
      setError(null);

      const { data: favoriteItems, error: favoritesError } = await getFavorites();

      if (favoritesError) {
        console.error('Error fetching favorites:', favoritesError);
        setError('Failed to load favorites. Please try again.');
        return;
      }

      if (!favoriteItems || favoriteItems.length === 0) {
        setUpcomingFavorites([]);
        return;
      }

      const today = new Date();
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(today.getDate() + 5);
      
      const startDate = today.toISOString().split('T')[0];
      const endDate = threeDaysFromNow.toISOString().split('T')[0];

      // Filter to only Purdue items (exclude FatSecret items by ID prefix and source)
      const itemIds = favoriteItems
        .map(fav => fav.item_id)
        .filter(id => !id.startsWith('fatsecret_'));
      
      if (itemIds.length === 0) {
        setUpcomingFavorites([]);
        return;
      }
      
      const { data: items, error: itemsError } = await supabase
        .from('item')
        .select('*')
        .in('id', itemIds)
        .eq('source', 0);

      if (itemsError) {
        console.error('Error fetching item details:', itemsError);
        setError('Failed to load item details. Please try again.');
        return;
      }

      // Check availability for upcoming dates (next 5 days)
      const { data: availabilityData } = await supabase
        .from('day_station_item')
        .select(`
          item_id,
          day_station!inner(
            day_meal!inner(
              meal_name,
              day_menu!inner(
                location_name,
                serve_date,
                is_published
              )
            )
          )
        `)
        .in('item_id', itemIds)
        .gte('day_station.day_meal.day_menu.serve_date', startDate)
        .lte('day_station.day_meal.day_menu.serve_date', endDate)
        .eq('day_station.day_meal.day_menu.is_published', true);

      // Create availability map
      const availabilityMap = new Map<string, { locations: string[], meals: string[], dates: string[] }>();
      if (availabilityData) {
        availabilityData.forEach((avail: any) => {
          const itemId = avail.item_id;
          const dayStation = avail.day_station as any;
          const location = dayStation?.day_meal?.day_menu?.location_name;
          const meal = dayStation?.day_meal?.meal_name;
          const date = dayStation?.day_meal?.day_menu?.serve_date;
          
          if (!availabilityMap.has(itemId)) {
            availabilityMap.set(itemId, { locations: [], meals: [], dates: [] });
          }
          
          const current = availabilityMap.get(itemId)!;
          if (location && !current.locations.includes(location)) {
            current.locations.push(location);
          }
          if (meal && !current.meals.includes(meal)) {
            current.meals.push(meal);
          }
          if (date && !current.dates.includes(date)) {
            current.dates.push(date);
          }
        });
      }

      // Create separate cards for each date an item appears
      // Only include Purdue items (source = 0 and not FatSecret IDs)
      const upcomingFavoritesWithDetails: FavoriteItem[] = [];
      
      favoriteItems
        .filter(fav => !fav.item_id.startsWith('fatsecret_'))
        .forEach(fav => {
          const item = items?.find((i: any) => i.id === fav.item_id);
          // Skip if item not found or not a Purdue item
          if (!item || item.source !== 0) {
            return;
          }
          
          const availability = availabilityMap.get(fav.item_id);
          
          if (availability?.dates && availability.dates.length > 0) {
          // Create a card for each date
          availability.dates.forEach(date => {
            // Check if this specific date is today
            const today = new Date().toISOString().split('T')[0]; // Get today's date for comparison
            const isAvailableToday = date === today; // Check if this date matches today
            
            upcomingFavoritesWithDetails.push({
              id: `${fav.item_id}-${date}`, // Unique ID for each date
              originalItemId: fav.item_id, // Store original item ID for navigation
              name: item?.name || 'Unknown Item',
              vegetarian: item?.vegetarian,
              vegan: item?.vegan,
              gluten: item?.gluten,
              allergens: item?.allergens || [],
              serving_size: item?.serving_size,
              calories: item?.calories,
              protein_g: item?.protein_g,
              carbs_g: item?.carbs_g,
              fat_g: item?.fat_g,
              fiber_g: item?.fiber_g,
              sugar_g: item?.sugar_g,
              sodium_mg: item?.sodium_mg,
              protein_per_100cals: item?.protein_per_100cals,
              last_verified: item?.last_verified,
              ingredients: item?.ingredients,
              is_collection: item?.is_collection,
              favorited_at: fav.created_at,
              is_available_today: isAvailableToday,
              available_locations: availability?.locations || [],
              available_meals: availability?.meals || [],
              available_dates: [date] // Single date for this card
            });
          });
        }
      });

      // Sort by date (earliest first)
      const sortedUpcomingFavorites = upcomingFavoritesWithDetails.sort((a, b) => {
        const dateA = new Date(a.available_dates?.[0] || '');
        const dateB = new Date(b.available_dates?.[0] || '');
        return dateA.getTime() - dateB.getTime();
      });

      setUpcomingFavorites(sortedUpcomingFavorites);
      hasAttemptedUpcomingFetch.current = true;
    } catch (err) {
      console.error('Upcoming favorites fetch error:', err);
      setError('Failed to load upcoming favorites. Please try again.');
      hasAttemptedUpcomingFetch.current = true;
    } finally {
      setUpcomingLoading(false);
    }
  };

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
        itemsData.forEach((item: any) => {
          newStatus[item.id] = item.is_collection || false;
        });
        setCollectionStatus(prev => ({ ...prev, ...newStatus }));
      }
    } catch (error) {
      console.error('Error checking collection status batch:', error);
    }
  }, []);

  // Handle menu item press
  const handleMenuItemPress = async (item: FavoriteItem) => {
    // Use originalItemId for navigation if it exists (for upcoming tab cards), otherwise use id
    const itemIdForNavigation = item.originalItemId || item.id;
    
    // Check if this item is a collection
    if (collectionStatus[itemIdForNavigation]) {
      // Navigate to collection page
      router.push(`/collection/${itemIdForNavigation}`);
      return;
    }
    
    if (item.serving_size) {
      router.push(`/nutrition/${itemIdForNavigation}`);
    } else {
      router.push(`/missing-nutrition/${itemIdForNavigation}`);
    }
  };

  // Check collection status when favorites change
  React.useEffect(() => {
    const allItems = [...favorites, ...upcomingFavorites, ...globalFavorites];
    const itemIds = allItems.map(item => item.originalItemId || item.id);
    if (itemIds.length > 0) {
      checkCollectionStatusBatch(itemIds);
    }
  }, [favorites, upcomingFavorites, globalFavorites]);

  // Load favorites on component mount
  React.useEffect(() => {
    if (user) {
      fetchFavorites();
      fetchUpcomingFavorites();
      fetchGlobalFavorites();
    }
  }, [user]);

  // Fetch favorites when switching tabs (only if not already attempted)
  React.useEffect(() => {
    if (activeTab === 'upcoming' && user && !hasAttemptedUpcomingFetch.current && !upcomingLoading) {
      fetchUpcomingFavorites();
    }
    if (activeTab === 'global' && user && !hasAttemptedGlobalFetch.current && !globalLoading) {
      fetchGlobalFavorites();
    }
  }, [activeTab, user, upcomingLoading, globalLoading]);

  // Handle pull-to-refresh
  const onRefresh = React.useCallback(async () => {
    if (!user) return;
    
    setRefreshing(true);
    try {
      if (activeTab === 'purdue') {
        await fetchFavorites();
      } else if (activeTab === 'upcoming') {
        await fetchUpcomingFavorites();
      } else if (activeTab === 'global') {
        await fetchGlobalFavorites();
      }
    } finally {
      setRefreshing(false);
    }
  }, [user, activeTab]);

  // Show loading state
  if (loading) {
    return (
      <BackgroundTemplate>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#CFB991" />
          <Text className="text-white text-base font-sora mt-4">Loading favorites...</Text>
        </View>
      </BackgroundTemplate>
    );
  }

  // Show error state
  if (error) {
    return (
      <BackgroundTemplate>
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text className="text-white text-xl font-sora-bold text-center mt-4 mb-2">
            Error Loading Favorites
          </Text>
          <Text className="text-gray-400 text-center mb-6 font-sora">
            {error}
          </Text>
          <TouchableOpacity
            onPress={fetchFavorites}
            className="bg-purdueGold rounded-xl px-6 py-3"
          >
            <Text className="text-black font-sora-semibold text-center">
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      </BackgroundTemplate>
    );
  }

  // Separate available and unavailable favorites
  const availableToday = favorites.filter(item => item.is_available_today); // Filter items available today
  const unavailableToday = favorites.filter(item => !item.is_available_today); // Filter items not available today

  return (
    <BackgroundTemplate>
      <View className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 pt-16 pb-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2"
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-2xl font-sora-bold text-white">
            Favorites
          </Text>
          <View className="w-8" />
        </View>

        {/* Tab Navigation */}
        <View className="flex-row px-6 mb-4">
          <TouchableOpacity
            onPress={() => setActiveTab('purdue')}
            className={`flex-1 py-3 px-4 rounded-l-xl ${
              activeTab === 'purdue' 
                ? 'bg-purdueGold' 
                : 'bg-gray-800/60 border border-gray-700/50'
            }`}
          >
            <Text className={`text-center font-sora-semibold ${
              activeTab === 'purdue' ? 'text-black' : 'text-white'
            }`}>
              Purdue
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('global')}
            className={`flex-1 py-3 px-4 ${
              activeTab === 'global' 
                ? 'bg-purdueGold' 
                : 'bg-gray-800/60 border border-gray-700/50'
            }`}
          >
            <Text className={`text-center font-sora-semibold ${
              activeTab === 'global' ? 'text-black' : 'text-white'
            }`}>
              Global
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('upcoming')}
            className={`flex-1 py-3 px-4 rounded-r-xl ${
              activeTab === 'upcoming' 
                ? 'bg-purdueGold' 
                : 'bg-gray-800/60 border border-gray-700/50'
            }`}
          >
            <Text className={`text-center font-sora-semibold ${
              activeTab === 'upcoming' ? 'text-black' : 'text-white'
            }`}>
              Upcoming
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView 
          className="flex-1 px-6" 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#CFB991"
              colors={["#CFB991"]}
            />
          }
        >
          {activeTab === 'purdue' ? (
            favorites.length > 0 ? (
              <>
                {availableToday.length > 0 && (
                  <View className="mb-6">
                    <View className="flex-row items-center mb-4">
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                      <Text className="text-green-400 text-lg font-sora-semibold ml-2">
                        Available Today ({availableToday.length})
                      </Text>
                    </View>
                    
                    <View className="space-y-3">
                      {availableToday.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          onPress={() => handleMenuItemPress(item)}
                          activeOpacity={0.7}
                        >
                          <FavoriteItemCard 
                            item={item}
                            showAvailability={true}
                            showLocation={true}
                            showMeals={true}
                            showDates={true}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                <View className="mb-6">
                  <View className="flex-row items-center justify-between mb-4">
                    <Text className="text-purdueGold text-lg font-sora-semibold">
                      Purdue Favorites ({favorites.length})
                    </Text>
                    <TouchableOpacity
                      onPress={() => router.push("/(tabs)/search")}
                      className="bg-purdueGold/20 rounded-full px-3 py-1"
                    >
                      <Text className="text-purdueGold text-sm font-sora-semibold">
                        Add More
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View className="space-y-3">
                    {favorites.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => handleMenuItemPress(item)}
                        activeOpacity={0.7}
                      >
                        <FavoriteItemCard 
                          item={item}
                          showAvailability={true}
                          showLocation={true}
                          showMeals={true}
                          showDates={true}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </>
            ) : (
              <View className="flex-1 justify-center items-center py-16">
                <View className="bg-gray-800/60 backdrop-blur-xl rounded-3xl p-8 items-center border border-gray-700/50">
                  <Ionicons name="heart-outline" size={80} color="#6B7280" />
                  <Text className="text-gray-400 text-xl font-sora-bold text-center mt-4 mb-2">
                    No Purdue Favorites Yet
                  </Text>
                  <Text className="text-gray-500 text-center mb-6 font-sora px-4">
                    Start adding Purdue dining hall items to your favorites by tapping the heart icon on any menu item.
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push("/(tabs)/search")}
                    className="bg-purdueGold rounded-xl px-6 py-3"
                  >
                    <Text className="text-black font-sora-semibold text-center">
                      Browse Menu
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          ) : activeTab === 'upcoming' ? (
            // Upcoming Tab Content
            upcomingLoading ? (
              <View className="flex-1 justify-center items-center py-16">
                <ActivityIndicator size="large" color="#CFB991" />
                <Text className="text-white text-base font-sora mt-4">Loading available favorites...</Text>
              </View>
            ) : upcomingFavorites.length > 0 ? (
              <View className="mb-6">
                <View className="flex-row items-center mb-4">
                  <Ionicons name="calendar-outline" size={20} color="#CFB991" />
                  <Text className="text-purdueGold text-lg font-sora-semibold ml-2">
                    Upcoming Bites ({upcomingFavorites.length})
                  </Text>
                </View>
                
                <View className="space-y-3">
                  {upcomingFavorites.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => handleMenuItemPress(item)}
                      activeOpacity={0.7}
                    >
                      <FavoriteItemCard 
                        item={item}
                        showAvailability={true}
                        showLocation={true}
                        showMeals={true}
                        showDates={true}
                        showMealTimes={true}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              <View className="flex-1 justify-center items-center py-16">
                <View className="bg-gray-800/60 backdrop-blur-xl rounded-3xl p-8 items-center border border-gray-700/50">
                  <Ionicons name="calendar-outline" size={80} color="#6B7280" />
                  <Text className="text-gray-400 text-xl font-sora-bold text-center mt-4 mb-2">
                    No Available Favorites
                  </Text>
                  <Text className="text-gray-500 text-center mb-6 font-sora px-4">
                    Your favorite items aren't available today or in the next 5 days. Check back later!
                  </Text>
                </View>
              </View>
            )
          ) : (
            globalLoading ? (
              <View className="flex-1 justify-center items-center py-16">
                <ActivityIndicator size="large" color="#CFB991" />
                <Text className="text-white text-base font-sora mt-4">Loading global favorites...</Text>
              </View>
            ) : globalFavorites.length > 0 ? (
              <View className="mb-6">
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center">
                    <Ionicons name="globe-outline" size={20} color="#CFB991" />
                    <Text className="text-purdueGold text-lg font-sora-semibold ml-2">
                      Global Favorites ({globalFavorites.length})
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => router.push("/global-search")}
                    className="bg-purdueGold/20 rounded-full px-3 py-1"
                  >
                    <Text className="text-purdueGold text-sm font-sora-semibold">
                      Add More
                    </Text>
                  </TouchableOpacity>
                </View>
                
                <View className="space-y-3">
                  {globalFavorites.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => handleMenuItemPress(item)}
                      activeOpacity={0.7}
                    >
                      <FavoriteItemCard 
                        item={item}
                        showAvailability={false}
                        showLocation={false}
                        showMeals={false}
                        showDates={false}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              <View className="flex-1 justify-center items-center py-16">
                <View className="bg-gray-800/60 backdrop-blur-xl rounded-3xl p-8 items-center border border-gray-700/50">
                  <Ionicons name="globe-outline" size={80} color="#6B7280" />
                  <Text className="text-gray-400 text-xl font-sora-bold text-center mt-4 mb-2">
                    No Global Favorites Yet
                  </Text>
                  <Text className="text-gray-500 text-center mb-6 font-sora px-4">
                    Start adding global food items to your favorites by searching and tapping the heart icon.
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push("/global-search")}
                    className="bg-purdueGold rounded-xl px-6 py-3"
                  >
                    <Text className="text-black font-sora-semibold text-center">
                      Search Global Foods
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          )}
        </ScrollView>
      </View>
    </BackgroundTemplate>
  );
}
