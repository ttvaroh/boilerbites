import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import BackgroundTemplate from "../../components/BackgroundTemplate";
import MealNavigationHeader from "../../components/MealNavigationHeader";
import StationList from "../../components/StationList";
import { useMenuView } from "../../hooks/useMenuView";
import { useStationExpansion } from "../../hooks/useStationExpansion";
import { useMenuData } from "../../lib/MenuDataContext";
import { supabase } from "../../lib/supabase";
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
    currentLocation,
    loading: contextLoading,
    error: contextError,
  } = useMenuData();

  // Custom hooks
  const menuView = useMenuView({
    locationName: name || '',
    getMealBasicInfo,
    getMealDetailedData
  });

  const expansion = useStationExpansion();

  // Local state
  const [collectionStatus, setCollectionStatus] = useState<Record<string, boolean>>({});
  const initializedLocationRef = useRef<string | null>(null);

  // ============================================================================
  // Collection Status Loading
  // ============================================================================

  const loadCollectionStatus = useCallback(async (itemIds: string[]) => {
    if (itemIds.length === 0) return;

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
      console.warn('Collection status check failed:', error);
    }
  }, []);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleNavigate = useCallback(async (direction: 'prev' | 'next') => {
    await menuView.navigateToMeal(direction);
  }, [menuView]);

  const handleMenuItemPress = useCallback((item: MenuItem) => {
    if (collectionStatus[item.id]) {
      router.push(`/collection/${item.id}`);
    } else if (item.serving_size) {
      router.push(`/nutrition/${item.id}`);
    } else {
      router.push(`/missing-nutrition/${item.id}`);
    }
  }, [collectionStatus, router]);

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

      const isNewLocation = initializedLocationRef.current !== name || currentLocation !== name;
      
      if (isNewLocation) {
        // Reset all state
        menuView.resetView(true);
        expansion.reset();
        setCollectionStatus({});
        initializedLocationRef.current = name;
        
        // Switch location in context
        await switchLocation(name);
        
        // Load today's menu with auto-detection
        await menuView.initializeToday();
      }
    };

    initialize();
  }, [name, currentLocation]);

  // Load collection status when meal data loads
  useEffect(() => {
    if (menuView.viewState.status === 'loaded') {
      const stations = menuView.viewState.data.stations;
      
      // Initialize expansion state
      expansion.initialize(stations);
      
      // Load collection status for all items
      const itemIds = stations.flatMap(station =>
        station.items.map(item => item.id)
      );
      
      if (itemIds.length > 0) {
        loadCollectionStatus(itemIds);
      }
    }
  }, [menuView.viewState]);

  // ============================================================================
  // Memoized Values
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
    
    if (state.status === 'loading' || state.status === 'error') {
      const mealType = state.mealType;
      return {
        name: mealType.charAt(0).toUpperCase() + mealType.slice(1).replace(/([A-Z])/g, ' $1'),
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

  const currentDate = useMemo(() => {
    if (menuView.viewState.status === 'initializing') {
      return getTodayDateString();
    }
    return menuView.viewState.date;
  }, [menuView.viewState]);

  const currentStations = useMemo(() => {
    if (menuView.viewState.status === 'loaded') {
      return menuView.viewState.data.stations;
    }
    return [];
  }, [menuView.viewState]);

  // ============================================================================
  // Render: Loading State
  // ============================================================================

  if (contextLoading || menuView.viewState.status === 'initializing') {
    return (
      <BackgroundTemplate paddingBottom={0}>
        <View className="flex-1">
          <View className="bg-purdueBlack-200 pt-12 pb-6 px-6">
            <TouchableOpacity onPress={() => router.back()} className="flex-row items-center">
              <Ionicons name="arrow-back" size={24} color="white" />
              <Text className="text-white text-lg font-sora ml-2">Back</Text>
            </TouchableOpacity>
          </View>
          <View className="flex-1 justify-center items-center">
            <Text className="text-white text-lg font-sora">Loading menu...</Text>
          </View>
        </View>
      </BackgroundTemplate>
    );
  }

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
        <View className="bg-transparent pt-14 pb-2 px-6">
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex-row items-center pb-2"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
            <Text className="text-white text-lg font-sora ml-2">Back</Text>
          </TouchableOpacity>
          <Text className="text-white text-3xl font-sora-bold mb-4">{name}</Text>
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

          {/* Content based on view state */}
          {menuView.viewState.status === 'loading' && (
            <View className="py-8 items-center">
              <Text className="text-gray-400 text-base font-sora">
                Loading {mealDisplayInfo.name.toLowerCase()} menu...
              </Text>
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
                No {mealDisplayInfo.name.toLowerCase()} will be served
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
            />
          )}
        </ScrollView>
      </View>
    </BackgroundTemplate>
  );
}