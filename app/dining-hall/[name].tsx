import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import BackgroundTemplate from "../../components/BackgroundTemplate";
import MealNavigationHeader from "../../components/MealNavigationHeader";
import StationList from "../../components/StationList";
import { useNutritionGoals } from "../../contexts/NutritionGoalsContext";
import { useMenuView } from "../../hooks/useMenuView";
import { useStationExpansion } from "../../hooks/useStationExpansion";
import { getUserAllergenNames } from "../../lib/allergenUtils";
import { isSystemCollection } from "../../lib/collectionStatusCache";
import { useMenuData } from "../../lib/MenuDataContext";
import { getTodayDateString } from "../../lib/timezone-utils";
import { MenuItem } from "../../types/menu";

// ============================================================================
// Main Component
// ============================================================================

export default function DiningHallPage() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const router = useRouter();
  
  const {
    getMealBasicInfo,
    getMealDetailedData,
    switchLocation,
    error: contextError,
  } = useMenuData();

  // Custom hooks
  const menuView = useMenuView({
    locationName: name || '',
    getMealBasicInfo,
    getMealDetailedData
  });

  const expansion = useStationExpansion();
  const { goals: nutritionGoals } = useNutritionGoals();

  const initializedLocationRef = useRef<string | null>(null);
  const initializedStationsRef = useRef<string | null>(null);

  // Get user's allergen names from preferences
  const userAllergenNames = useMemo(() => {
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
  const userPreferences = useMemo(() => {
    if (!nutritionGoals) return undefined;
    return {
      vegan_preference: nutritionGoals.vegan_preference,
      vegetarian_preference: nutritionGoals.vegetarian_preference,
    };
  }, [nutritionGoals]);

  const collectionStatus = useMemo(() => {
    if (menuView.viewState.status !== "loaded") {
      return {};
    }

    const result: Record<string, boolean> = {};
    for (const station of menuView.viewState.data.stations) {
      for (const item of station.items) {
        result[item.id] = isSystemCollection(item);
      }
    }
    return result;
  }, [menuView.viewState]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleNavigate = useCallback(async (direction: 'prev' | 'next') => {
    await menuView.navigateToMeal(direction);
  }, [menuView]);

  // Memoized values (defined early for use in callbacks)
  const currentDate = useMemo(() => {
    if (menuView.viewState.status === 'initializing') {
      return getTodayDateString();
    }
    return menuView.viewState.date;
  }, [menuView.viewState]);

  const handleMenuItemPress = useCallback((item: MenuItem) => {
    const dateForNavigation = currentDate;
    if (collectionStatus[item.id]) {
      router.push(`/collection/${item.id}?date=${dateForNavigation}`);
    } else if (item.serving_size) {
      router.push(`/nutrition/${item.id}?date=${dateForNavigation}`);
    } else {
      router.push(`/missing-nutrition/${item.id}?date=${dateForNavigation}`);
    }
  }, [collectionStatus, router, currentDate]);

  const handleToggleStation = useCallback((stationId: string) => {
    expansion.toggleStation(stationId);
  }, [expansion]);

  const handleToggleAll = useCallback(() => {
    if (menuView.viewState.status === 'loaded') {
      expansion.toggleAll(menuView.viewState.data.stations);
    }
  }, [menuView.viewState, expansion]);

  // ============================================================================
  // Effects
  // ============================================================================

  // Initialize menu when location changes
  useEffect(() => {
    const initialize = async () => {
      if (!name) return;

      const isNewLocation = initializedLocationRef.current !== name;
      
      if (isNewLocation) {
        // Reset non-view state
        expansion.reset();
        initializedLocationRef.current = name;
        initializedStationsRef.current = null; // Reset stations ref for new location
        
        // Switch location in context (cache is preserved for instant switching)
        await switchLocation(name);
        
        // OPTIMIZED: Let menuView.initializeToday() handle all data fetching
        // It will check cache internally and handle both cached and uncached scenarios
        menuView.resetView(true);
        await menuView.initializeToday();
      }
    };

    initialize();
  }, [name, getMealBasicInfo, menuView, expansion, switchLocation]);

  // Initialize station expansion once per unique menu view
  useEffect(() => {
    if (menuView.viewState.status === 'loaded') {
      const stations = menuView.viewState.data.stations;
      const viewState = menuView.viewState;
      
      const firstStationId = stations.length > 0 ? stations[0].id : '';
      const stationsKey = `${viewState.date}:${viewState.mealType}:${firstStationId}`;
      
      if (initializedStationsRef.current !== stationsKey) {
        initializedStationsRef.current = stationsKey;
        expansion.initialize(stations);
      }
    }
  }, [menuView.viewState, expansion]);

  // ============================================================================
  // Memoized Values (continued)
  // ============================================================================

  const mealDisplayInfo = useMemo(() => {
    const state = menuView.viewState;
    
    if (state.status === 'loaded') {
      return {
        name: state.data.name,
        startTime: state.data.start_time,
        endTime: state.data.end_time
      };
    }
    
    if (state.status === 'empty') {
      return {
        name: state.mealName,
        startTime: '-',
        endTime: '-'
      };
    }
    
    if (state.status === 'loading') {
      const mealName = state.mealName || '';
      return {
        name: mealName,
        startTime: '-',
        endTime: '-'
      };
    }
    
    if (state.status === 'cached') {
      return {
        name: state.mealName,
        startTime: '-',
        endTime: '-'
      };
    }
    
    if (state.status === 'error') {
      return {
        name: '',
        startTime: '-',
        endTime: '-'
      };
    }
    
    return {
      name: 'Loading...',
      startTime: '-',
      endTime: '-'
    };
  }, [menuView.viewState]);

  const currentStations = useMemo(() => {
    if (menuView.viewState.status === 'loaded') {
      return menuView.viewState.data.stations;
    }
    return [];
  }, [menuView.viewState]);

  // ============================================================================
  // Render: Error State
  // ============================================================================

  if (contextError) {
    return (
      <BackgroundTemplate paddingBottom={0}>
        <View className="flex-1">
          <View className="bg-purdueBlack-200 pt-12 pb-6 px-6">
            <TouchableOpacity onPress={() => router.back()} className="flex-row items-center">
              <Ionicons name="arrow-back" size={24} color="white" />
              <Text className="text-white text-lg font-sora ml-2">Back</Text>
            </TouchableOpacity>
          </View>
          <View className="flex-1 justify-center items-center px-6">
            <Text className="text-white text-lg font-sora text-center mb-4">
              Error loading menu data
            </Text>
            <Text className="text-gray-300 text-sm font-sora text-center opacity-70">
              {contextError}
            </Text>
          </View>
        </View>
      </BackgroundTemplate>
    );
  }

  // ============================================================================
  // Render: Main Content
  // ============================================================================

  return (
    <BackgroundTemplate paddingBottom={0}>
      <View className="flex-1">
        {/* Header */}
        <View className="bg-transparent pt-16 pb-2 px-6">
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex-row items-center pb-2"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
            <Text className="text-white text-lg font-sora ml-2">Back</Text>
          </TouchableOpacity>
          <Text className="text-white text-3xl font-sora-bold mb-2">{name}</Text>
        </View>

        {/* Main Content */}
        <ScrollView className="flex-1 px-6">
          {/* Meal Navigation Header */}
          <MealNavigationHeader
            mealName={mealDisplayInfo.name}
            startTime={mealDisplayInfo.startTime}
            endTime={mealDisplayInfo.endTime}
            date={currentDate}
            canNavigatePrev={menuView.canNavigate('prev')}
            canNavigateNext={menuView.canNavigate('next')}
            onNavigate={handleNavigate}
          />

          {(menuView.viewState.status === 'loading' || menuView.viewState.status === 'cached' || menuView.viewState.status === 'initializing') && (
            <View className="py-8">
              {[1, 2, 3].map((i) => (
                <View key={i} className="mb-6">
                  <View className="h-6 w-32 bg-gray-700 rounded mb-3" />
                  <View className="space-y-2">
                    {[1, 2, 3].map((j) => (
                      <View key={j} className="h-4 w-full bg-gray-700 rounded" />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}

          {menuView.viewState.status === 'error' && (
            <View className="py-8 items-center">
              <Text className="text-red-400 text-base font-sora text-center">
                {menuView.viewState.error}
              </Text>
            </View>
          )}

          {menuView.viewState.status === 'empty' && (
            <View className="py-8 items-center">
              <Text className="text-gray-400 text-base font-sora">
                No {mealDisplayInfo.name} will be served
              </Text>
            </View>
          )}

          {menuView.viewState.status === 'loaded' && (
            <StationList
              stations={currentStations}
              expandedStations={expansion.expandedStations}
              collectionStatus={collectionStatus}
              allExpanded={expansion.allExpanded}
              onToggleStation={handleToggleStation}
              onToggleAll={handleToggleAll}
              onItemPress={handleMenuItemPress}
              date={currentDate}
              userAllergenNames={userAllergenNames}
              userPreferences={userPreferences}
            />
          )}
        </ScrollView>
      </View>
    </BackgroundTemplate>
  );
}
