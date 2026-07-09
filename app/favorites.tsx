import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as React from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import BackgroundTemplate from "../components/BackgroundTemplate";
import FavoriteItemCard from "../components/FavoriteItemCard";
import { useAuth } from "../contexts/AuthContext";
import { getItemAppearances } from "../lib/api";
import {
  hydrateCollectionStatus,
  seedCollectionStatus,
} from "../lib/collectionStatusCache";
import { getCachedFavorites, setCachedFavorites } from "../lib/favoritesCache";
import { ITEM_SELECT_COLUMNS } from "../lib/itemSelectColumns";
import { supabase } from "../lib/supabase";
import { getTodayDateString } from "../lib/timezone-utils";

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
  const [upcomingFavorites, setUpcomingFavorites] = React.useState<
    FavoriteItem[]
  >([]);
  const [globalFavorites, setGlobalFavorites] = React.useState<FavoriteItem[]>(
    [],
  );
  const [loading, setLoading] = React.useState(true);
  const [upcomingLoading, setUpcomingLoading] = React.useState(false);
  const [globalLoading, setGlobalLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<
    "purdue" | "global" | "upcoming"
  >("purdue");
  const [refreshing, setRefreshing] = React.useState(false);
  const hasAttemptedGlobalFetch = React.useRef(false);
  const [collectionStatus, setCollectionStatus] = React.useState<
    Record<string, boolean>
  >({});

  const checkCollectionStatusBatch = React.useCallback(
    async (itemIds: string[]): Promise<Record<string, boolean>> => {
      try {
        const statusMap = await hydrateCollectionStatus(itemIds);
        setCollectionStatus((prev) => ({ ...prev, ...statusMap }));
        return statusMap;
      } catch (error) {
        console.error("Error checking collection status batch:", error);
      }
      return {};
    },
    [],
  );

  // Single consolidated load: 1× getFavorites, 1× item (Purdue), 1× item (Global), 1× day_station_item.
  const loadAllFavorites = React.useCallback(
    async (isBackgroundRefetch = false) => {
      if (!user) return;

      try {
        if (!isBackgroundRefetch) {
          setLoading(true);
          setUpcomingLoading(true);
          setGlobalLoading(true);
          setError(null);
        }

      const { data: favoriteItems, error: favoritesError } =
        await getFavorites();

      if (favoritesError) {
        console.error("Error fetching favorites:", favoritesError);
        setError("Failed to load favorites. Please try again.");
        setFavorites([]);
        setUpcomingFavorites([]);
        setGlobalFavorites([]);
        hasAttemptedGlobalFetch.current = true;
        return;
      }

      if (!favoriteItems || favoriteItems.length === 0) {
        setFavorites([]);
        setUpcomingFavorites([]);
        setGlobalFavorites([]);
        hasAttemptedGlobalFetch.current = true;
        return;
      }

      const purdueIds = favoriteItems
        .map((f) => f.item_id)
        .filter((id) => !id.startsWith("fatsecret_"));
      const allItemIds = favoriteItems.map((f) => f.item_id);
      const today = getTodayDateString();

      const [purdueItemsRes, globalItemsRes, appearancesPerItem] =
        await Promise.all([
          purdueIds.length > 0
            ? supabase
                .from("item")
                .select(ITEM_SELECT_COLUMNS)
                .in("id", purdueIds)
                .eq("source", 0)
            : Promise.resolve({ data: [], error: null }),
          supabase
            .from("item")
            .select(ITEM_SELECT_COLUMNS)
            .in("id", allItemIds)
            .eq("source", 1),
          purdueIds.length > 0
            ? Promise.all(
                purdueIds.map(async (id) => ({
                  id,
                  appearances: (await getItemAppearances(id)) ?? [],
                })),
              )
            : Promise.resolve([]),
        ]);

      const purdueItems = purdueItemsRes.data ?? [];
      const globalItems = globalItemsRes.data ?? [];
      if (purdueItemsRes.error) {
        setError("Failed to load item details. Please try again.");
        setFavorites([]);
        setUpcomingFavorites([]);
        setLoading(false);
        setUpcomingLoading(false);
        setGlobalLoading(false);
        return;
      }
      if (globalItemsRes.error) {
        setError("Failed to load global item details. Please try again.");
        hasAttemptedGlobalFetch.current = true;
      }

      // Build availability from GraphQL appearances (no date window)
      const availabilityMap = new Map<
        string,
        { locations: string[]; meals: string[]; dates: string[] }
      >();
      for (const { id: itemId, appearances } of appearancesPerItem) {
        const locations: string[] = [];
        const meals: string[] = [];
        const dates: string[] = [];
        for (const occ of appearances) {
          const dateStr = occ.date.slice(0, 10);
          if (!dates.includes(dateStr)) dates.push(dateStr);
          if (occ.locationName && !locations.includes(occ.locationName))
            locations.push(occ.locationName);
          if (occ.mealName && !meals.includes(occ.mealName))
            meals.push(occ.mealName);
        }
        if (locations.length || meals.length || dates.length) {
          availabilityMap.set(itemId, { locations, meals, dates });
        }
      }

      const favoritesWithDetails: FavoriteItem[] = favoriteItems
        .filter((fav) => !fav.item_id.startsWith("fatsecret_"))
        .map((fav) => {
          const item = purdueItems.find((i: any) => i.id === fav.item_id);
          const availability = availabilityMap.get(fav.item_id);
          if (!item || item.source !== 0) return null as any;
          return {
            id: fav.item_id,
            name: item.name || "Unknown Item",
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
            ingredients: undefined,
            is_collection: item.is_collection,
            favorited_at: fav.created_at,
            is_available_today: availability?.dates?.includes(today) ?? false,
            available_locations: availability?.locations ?? [],
            available_meals: availability?.meals ?? [],
            available_dates: availability?.dates ?? [],
          } as FavoriteItem;
        })
        .filter((item): item is FavoriteItem => item !== null);

      const globalFavoritesWithDetails: FavoriteItem[] = favoriteItems
        .filter((fav) => globalItems.some((i: any) => i.id === fav.item_id))
        .map((fav) => {
          const item = globalItems.find((i: any) => i.id === fav.item_id);
          return {
            id: fav.item_id,
            name: item?.name || "Unknown Item",
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
            ingredients: undefined,
            is_collection: item?.is_collection,
            favorited_at: fav.created_at,
            is_available_today: false,
            available_locations: [],
            available_meals: [],
            available_dates: [],
          };
        });

      setFavorites(favoritesWithDetails);
      setGlobalFavorites(globalFavoritesWithDetails);
      hasAttemptedGlobalFetch.current = true;

      seedCollectionStatus(
        [...purdueItems, ...globalItems].map((item: any) => ({
          id: item.id,
          is_collection: item.is_collection,
          user_id: item.user_id,
        })),
      );

      const upcomingFavoritesWithDetails: FavoriteItem[] = [];
      const appearancesByItemId = new Map(
        appearancesPerItem.map((x) => [x.id, x.appearances]),
      );
      for (const fav of favoriteItems.filter(
        (f) => !f.item_id.startsWith("fatsecret_"),
      )) {
        const item = purdueItems.find((i: any) => i.id === fav.item_id);
        if (!item || item.source !== 0) continue;
        const appearances = appearancesByItemId.get(fav.item_id) ?? [];
        if (appearances.length === 0) continue;
        const byDate = new Map<
          string,
          { locations: Set<string>; meals: Set<string> }
        >();
        for (const occ of appearances) {
          const dateStr = occ.date.slice(0, 10);
          if (dateStr < today) continue;
          if (!byDate.has(dateStr)) {
            byDate.set(dateStr, { locations: new Set(), meals: new Set() });
          }
          const entry = byDate.get(dateStr)!;
          if (occ.locationName) entry.locations.add(occ.locationName);
          if (occ.mealName) entry.meals.add(occ.mealName);
        }
        for (const [date, { locations, meals }] of byDate.entries()) {
          upcomingFavoritesWithDetails.push({
            id: `${fav.item_id}-${date}`,
            originalItemId: fav.item_id,
            name: item.name || "Unknown Item",
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
            ingredients: undefined,
            is_collection: item.is_collection,
            favorited_at: fav.created_at,
            is_available_today: date === today,
            available_locations: Array.from(locations),
            available_meals: Array.from(meals),
            available_dates: [date],
          });
        }
      }
      const sortedUpcoming = upcomingFavoritesWithDetails.sort((a, b) => {
        const strA = a.available_dates?.[0] || "";
        const strB = b.available_dates?.[0] || "";
        return strA.localeCompare(strB);
      });
      setUpcomingFavorites(sortedUpcoming);

      const allIds = [
        ...favoritesWithDetails.map((f) => f.originalItemId || f.id),
        ...sortedUpcoming.map((f) => f.originalItemId || f.id),
        ...globalFavoritesWithDetails.map((f) => f.id),
      ];
      const uniqueIds = Array.from(new Set(allIds));
      const collectionStatusMap =
        uniqueIds.length > 0
          ? await checkCollectionStatusBatch(uniqueIds)
          : {};
      setCachedFavorites(user.id, {
        favorites: favoritesWithDetails,
        upcomingFavorites: sortedUpcoming,
        globalFavorites: globalFavoritesWithDetails,
        collectionStatus: collectionStatusMap,
      });
    } catch (err) {
      console.error("Favorites fetch error:", err);
      setError("Failed to load favorites. Please try again.");
    } finally {
        if (!isBackgroundRefetch) {
          setLoading(false);
          setUpcomingLoading(false);
          setGlobalLoading(false);
        }
      }
    },
    [user, getFavorites, checkCollectionStatusBatch],
  );

  const fetchFavorites = React.useCallback(() => loadAllFavorites(), [loadAllFavorites]);
  const fetchGlobalFavorites = React.useCallback(() => loadAllFavorites(), [loadAllFavorites]);
  const fetchUpcomingFavorites = React.useCallback(() => loadAllFavorites(), [loadAllFavorites]);

  const checkCollectionStatus = React.useCallback(async (itemId: string) => {
    const statusMap = await hydrateCollectionStatus([itemId]);
    if (statusMap[itemId] !== undefined) {
      setCollectionStatus((prev) => ({
        ...prev,
        [itemId]: statusMap[itemId],
      }));
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

  // Single load on mount: use cache if valid (within TTL), then optionally refetch in background (stale-while-revalidate)
  React.useEffect(() => {
    if (!user) {
      setLoading(false);
      setUpcomingLoading(false);
      setGlobalLoading(false);
      return;
    }
    const cached = getCachedFavorites(user.id);
    if (cached) {
      setFavorites(cached.favorites);
      setUpcomingFavorites(cached.upcomingFavorites);
      setGlobalFavorites(cached.globalFavorites);
      setCollectionStatus(cached.collectionStatus);
      setLoading(false);
      setUpcomingLoading(false);
      setGlobalLoading(false);
      setError(null);
      hasAttemptedGlobalFetch.current = true;
      loadAllFavorites(true); // Stale-while-revalidate: refresh in background
      return;
    }
    loadAllFavorites();
  }, [user, loadAllFavorites]);

  // Handle pull-to-refresh (swipe down to reload all favorites)
  const onRefresh = React.useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      await loadAllFavorites();
    } finally {
      setRefreshing(false);
    }
  }, [user, loadAllFavorites]);

  // Show loading state (only if user exists)
  if (loading && user) {
    return (
      <BackgroundTemplate>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#CFB991" />
          <Text className="text-white text-base font-sora mt-4">
            Loading favorites...
          </Text>
        </View>
      </BackgroundTemplate>
    );
  }

  // Show error state (only if user exists)
  if (error && user) {
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

  // Show login prompt if no user
  if (!user) {
    return (
      <BackgroundTemplate>
        <View className="flex-1">
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 pt-16 pb-4">
            <TouchableOpacity onPress={() => router.back()} className="p-2">
              <Ionicons name="chevron-back" size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-2xl font-sora-bold text-white">
              Favorites
            </Text>
            <View className="w-8" />
          </View>

          {/* Empty State for No User */}
          <View className="flex-1 justify-center items-center px-6">
            <View className="bg-gray-800/60 backdrop-blur-xl rounded-3xl p-8 items-center border border-gray-700/50 max-w-sm">
              <Ionicons name="heart-outline" size={80} color="#6B7280" />
              <Text className="text-white text-xl font-sora-bold text-center mt-4 mb-2">
                Sign in to save favorites
              </Text>
              <Text className="text-gray-400 text-center mb-6 font-sora px-4">
                Create an account to save your favorite menu items and access
                them anytime.
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/signin")}
                className="bg-purdueGold rounded-xl px-6 py-3 w-full mb-3"
              >
                <Text className="text-black font-sora-semibold text-center">
                  Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push("/signup")}
                className="mt-2"
              >
                <Text className="text-purdueGold font-sora text-center">
                  Don't have an account? Sign up
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </BackgroundTemplate>
    );
  }

  const availableToday = favorites.filter((item) => item.is_available_today);

  return (
    <BackgroundTemplate>
      <View className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 pt-16 pb-4">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-2xl font-sora-bold text-white">Favorites</Text>
          <View className="w-8" />
        </View>

        {/* Tab Navigation */}
        <View className="flex-row px-6 mb-4">
          <TouchableOpacity
            onPress={() => setActiveTab("purdue")}
            className={`flex-1 py-3 px-4 rounded-l-xl ${
              activeTab === "purdue"
                ? "bg-purdueGold"
                : "bg-gray-800/60 border border-gray-700/50"
            }`}
          >
            <Text
              className={`text-center font-sora-semibold ${
                activeTab === "purdue" ? "text-black" : "text-white"
              }`}
            >
              Purdue
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("global")}
            className={`flex-1 py-3 px-4 ${
              activeTab === "global"
                ? "bg-purdueGold"
                : "bg-gray-800/60 border border-gray-700/50"
            }`}
          >
            <Text
              className={`text-center font-sora-semibold ${
                activeTab === "global" ? "text-black" : "text-white"
              }`}
            >
              Global
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("upcoming")}
            className={`flex-1 py-3 px-4 rounded-r-xl ${
              activeTab === "upcoming"
                ? "bg-purdueGold"
                : "bg-gray-800/60 border border-gray-700/50"
            }`}
          >
            <Text
              className={`text-center font-sora-semibold ${
                activeTab === "upcoming" ? "text-black" : "text-white"
              }`}
            >
              Upcoming
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{ flexGrow: 1 }}
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
          {activeTab === "purdue" ? (
            loading && favorites.length === 0 ? (
              <View className="flex-1 justify-center items-center py-16">
                <ActivityIndicator size="large" color="#CFB991" />
                <Text className="text-white text-base font-sora mt-4">
                  Loading favorites...
                </Text>
              </View>
            ) : favorites.length > 0 ? (
              <>
                {availableToday.length > 0 && (
                  <View className="mb-6">
                    <View className="flex-row items-center mb-4">
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#10B981"
                      />
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
                    Start adding Purdue dining hall items to your favorites by
                    tapping the heart icon on any menu item.
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
          ) : activeTab === "upcoming" ? (
            upcomingLoading && upcomingFavorites.length === 0 ? (
              <View className="flex-1 justify-center items-center py-16">
                <ActivityIndicator size="large" color="#CFB991" />
                <Text className="text-white text-base font-sora mt-4">
                  Loading available favorites...
                </Text>
              </View>
            ) : upcomingFavorites.length > 0 ? (
              <View className="mb-6">
                <View className="flex-row items-center mb-4">
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color="#CFB991"
                  />
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
                  <Ionicons
                    name="calendar-outline"
                    size={80}
                    color="#6B7280"
                  />
                  <Text className="text-gray-400 text-xl font-sora-bold text-center mt-4 mb-2">
                    No Available Favorites
                  </Text>
                  <Text className="text-gray-500 text-center mb-6 font-sora px-4">
                    Your favorite items are not scheduled on upcoming menus.
                    Check back later!
                  </Text>
                </View>
              </View>
            )
          ) : globalLoading ? (
            <View className="flex-1 justify-center items-center py-16">
              <ActivityIndicator size="large" color="#CFB991" />
              <Text className="text-white text-base font-sora mt-4">
                Loading global favorites...
              </Text>
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
                  Start adding global food items to your favorites by searching
                  and tapping the heart icon.
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
          )}
        </ScrollView>
      </View>
    </BackgroundTemplate>
  );
}
