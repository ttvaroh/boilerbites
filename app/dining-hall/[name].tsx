import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import BackgroundTemplate from "../../components/BackgroundTemplate";
import MenuItemCard from "../../components/MenuItemCard";
import { getMealOrder } from "../../lib/mealConfig";
import { useMenuData } from "../../lib/MenuDataContext";
import { supabase } from "../../lib/supabase";
import { addDaysToDateString, createLocalDateFromString, getCurrentTimeInEST, getDateStringFromToday, getTodayDateString } from "../../lib/timezone-utils";

interface MealsByDate {
  breakfast?: Meal;
  lunch?: Meal;
  lateLunch?: Meal;  // Only for Windsor
  dinner?: Meal;
}

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
  last_verified?: string;
}

interface Station {
  id: string;
  name: string;
  items: MenuItem[];
}

interface Meal {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  open: boolean;
  stations: Station[];
}

interface LocalStation extends Station {
  isExpanded: boolean;
}

export default function DiningHallPage() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const router = useRouter();
  const {
    getMealBasicInfo,
    getMealDetailedData,
    switchLocation,
    isDateLoading,
    currentLocation,
    loading: contextLoading,
    error: contextError,
  } = useMenuData();

  const [currentDate, setCurrentDate] = useState<string>(getTodayDateString());
  const [currentMealType, setCurrentMealType] = useState<'breakfast' | 'lunch' | 'lateLunch' | 'dinner'>('breakfast');
  const [menusByDate, setMenusByDate] = useState<Map<string, MealsByDate>>(new Map());
  const [stationExpandState, setStationExpandState] = useState<Record<string, boolean>>({});
  const [menuLoading, setMenuLoading] = useState(false);
  const [collectionStatus, setCollectionStatus] = useState<Record<string, boolean>>({});
  const [allStationsExpanded, setAllStationsExpanded] = useState(true);
  
  // Track last processed location to avoid unnecessary re-initialization
  const lastProcessedLocation = useRef<string | null>(null);
  // Track if we've already auto-determined the meal for today
  const hasAutoDeterminedMeal = useRef(false);

  // Date range helper functions
  const getDateRange = (): { minDate: string; maxDate: string } => {
    return {
      minDate: getDateStringFromToday(-6),
      maxDate: getDateStringFromToday(6),
    };
  };

  const isDateInRange = (dateStr: string): boolean => {
    const { minDate, maxDate } = getDateRange();
    return dateStr >= minDate && dateStr <= maxDate;
  };

  // Meal navigation functions - now using centralized config

  // Find current meal type based on time
  const findCurrentMealType = (mealsData: MealsByDate, locationName: string): string => {
    const { hours, minutes } = getCurrentTimeInEST();
    const currentTime = hours * 60 + minutes;
    
    const locationMealOrder = getMealOrder(locationName);
    
    // First, check if we're currently in any meal period
    for (const mealType of locationMealOrder) {
      const meal = mealsData[mealType as keyof MealsByDate];
      if (meal && meal.start_time && meal.end_time && meal.open) {
        const [startHour, startMin] = meal.start_time.split(':').map(Number);
        const [endHour, endMin] = meal.end_time.split(':').map(Number);
        const startTime = startHour * 60 + startMin;
        const endTime = endHour * 60 + endMin;
        
        // Check if current time is within this meal's service period
        if (currentTime >= startTime && currentTime <= endTime) {
          return mealType;
        }
      }
    }
    
    // If not currently in any meal, find the next upcoming meal today
    for (const mealType of locationMealOrder) {
      const meal = mealsData[mealType as keyof MealsByDate];
      if (meal && meal.start_time && meal.open) {
        const [startHour, startMin] = meal.start_time.split(':').map(Number);
        const startTime = startHour * 60 + startMin;
        
        // Check if this meal starts after current time
        if (startTime > currentTime) {
          return mealType;
        }
      }
    }
    
    // If no upcoming meals today, find the last meal that was served today
    for (let i = locationMealOrder.length - 1; i >= 0; i--) {
      const mealType = locationMealOrder[i];
      const meal = mealsData[mealType as keyof MealsByDate];
      if (meal && meal.start_time && meal.open) {
        return mealType;
      }
    }
    
    // Fallback to first available meal for this location
    const fallbackMealOrder = getMealOrder(locationName);
    return fallbackMealOrder[0] || 'breakfast';
  };

  const navigateMeal = async (direction: 'prev' | 'next') => {
    const mealOrder = getMealOrder(name || '');
    const currentIndex = mealOrder.indexOf(currentMealType);
    
    // Mark that user is manually navigating to prevent auto-determination
    hasAutoDeterminedMeal.current = true;
    
    if (direction === 'next') {
      if (currentIndex < mealOrder.length - 1) {
        // Move to next meal same day
        const nextMealType = mealOrder[currentIndex + 1] as any;
        setCurrentMealType(nextMealType);
        // Pre-expand stations for the new meal if we have basic data
        const currentMeals = menusByDate.get(currentDate);
        const nextMealData = currentMeals?.[nextMealType as keyof MealsByDate];
        if (nextMealData && nextMealData.stations) {
          initializeAllStationsExpanded(nextMealData.stations);
        }
        
        // Load detailed data for the new meal
        await loadDetailedMealData(currentDate, nextMealType);
      } else {
        // Move to first meal of next day
        const nextDate = addDaysToDateString(currentDate, 1);
        
        if (isDateInRange(nextDate)) {
          const nextDayMealOrder = getMealOrder(name || '');
          const firstMealType = nextDayMealOrder[0] as any;
          
          // Set both date and meal type together to avoid race conditions
          setCurrentDate(nextDate);
          setCurrentMealType(firstMealType);
          
          // Load next date if not already loaded
          if (!menusByDate.has(nextDate)) {
            await loadMenuForDate(nextDate, firstMealType);
          } else {
            // Load detailed data for the first meal on the new date
            await loadDetailedMealData(nextDate, firstMealType);
          }
        }
      }
    } else {
      if (currentIndex > 0) {
        // Move to previous meal same day
        const prevMealType = mealOrder[currentIndex - 1] as any;
        setCurrentMealType(prevMealType);
        // Pre-expand stations for the new meal if we have basic data
        const currentMeals = menusByDate.get(currentDate);
        const prevMealData = currentMeals?.[prevMealType as keyof MealsByDate];
        if (prevMealData && prevMealData.stations) {
          initializeAllStationsExpanded(prevMealData.stations);
        }
        
        // Load detailed data for the new meal
        await loadDetailedMealData(currentDate, prevMealType);
      } else {
        // Move to last meal of previous day
        const prevDate = addDaysToDateString(currentDate, -1);
        
        if (isDateInRange(prevDate)) {
          const prevDayMealOrder = getMealOrder(name || '');
          const lastMealType = prevDayMealOrder[prevDayMealOrder.length - 1] as any;
          
          // Set both date and meal type together to avoid race conditions
          setCurrentDate(prevDate);
          setCurrentMealType(lastMealType);
          
          // Load previous date if not already loaded
          if (!menusByDate.has(prevDate)) {
            await loadMenuForDate(prevDate, lastMealType);
          } else {
            // Load detailed data for the last meal on the previous date
            await loadDetailedMealData(prevDate, lastMealType);
          }
        }
      }
    }
  };

  // Progressive loading: Load basic info first, then detailed data on demand
  const loadMenuForDate = async (date: string, specificMealType?: string) => {
      if (!name) return;
      
      setMenuLoading(true);
      try {
      // First, load basic meal info (fast)
      const basicMealsData = await getMealBasicInfo(name, date);
      
      if (basicMealsData) {
        // Store basic data immediately for navigation
        setMenusByDate(prev => new Map(prev).set(date, basicMealsData));
        
        // Determine which meal to load detailed data for
        let mealToLoad = specificMealType;
        
        // If no specific meal type provided AND this is for today AND we haven't auto-determined yet
        if (!mealToLoad && date === getTodayDateString() && !hasAutoDeterminedMeal.current) {
          mealToLoad = findCurrentMealType(basicMealsData, name);
          // Update the current meal type state
          setCurrentMealType(mealToLoad as any);
          hasAutoDeterminedMeal.current = true;
        } else if (!mealToLoad) {
          // Use first available meal for this location as fallback
          const mealOrder = getMealOrder(name);
          mealToLoad = mealOrder[0] || 'breakfast';
        }
        
        // Pre-expand stations for the meal we're about to load
        const mealData = basicMealsData[mealToLoad as keyof MealsByDate];
        if (mealData && mealData.stations) {
          initializeAllStationsExpanded(mealData.stations);
        }
        
        // Load detailed data for the determined meal
        await loadDetailedMealData(date, mealToLoad);
        }
      } catch (error) {
      console.error(`Error loading menu for ${date}:`, error);
      } finally {
        setMenuLoading(false);
      }
    };

  // Load detailed data for a specific meal
  const loadDetailedMealData = async (date: string, mealType: string) => {
    if (!name) return;
    
    try {
      const detailedMeal = await getMealDetailedData(name, date, mealType);
      
      if (detailedMeal) {
        // Update the specific meal with detailed data
        setMenusByDate(prev => {
          const newMap = new Map(prev);
          const existingData = newMap.get(date);
          if (existingData) {
            const updatedData = { ...existingData, [mealType]: detailedMeal };
            newMap.set(date, updatedData);
          }
          return newMap;
        });
        
        // Set all stations to expanded by default
        initializeAllStationsExpanded(detailedMeal.stations);
        
        // Load collection status for current meal items in background
        const itemIds: string[] = [];
        detailedMeal.stations.forEach((station: Station) => {
          station.items.forEach((item: MenuItem) => itemIds.push(item.id));
        });
        
        if (itemIds.length > 0) {
          checkCollectionStatusBatch(itemIds).catch(error => {
            console.warn('Collection status check failed:', error);
          });
        }
      }
    } catch (error) {
      console.error(`Error loading detailed data for ${mealType} on ${date}:`, error);
    }
  };

  // Initialize menu data when component mounts or location changes
  React.useEffect(() => {
    const initializeMenu = async () => {
      if (!name) return;
      
      // Check if this is a new location or first load
      const isNewLocation = lastProcessedLocation.current !== name;
      const hasLocationChanged = currentLocation !== name;
      
      if (isNewLocation || hasLocationChanged) {
        // Reset all local state when location changes
        setCurrentDate(getTodayDateString());
        setCurrentMealType('breakfast'); // Set default, will be updated after data loads
        setMenusByDate(new Map());
        setStationExpandState({});
        setCollectionStatus({});
            setMenuLoading(false);
            
        // Reset auto-determination flag for new location
        hasAutoDeterminedMeal.current = false;
        
        // Update the ref to track this location
        lastProcessedLocation.current = name;
        
        // Switch location in context (this will clear context data)
        await switchLocation(name);
      }
      
      // Load today's menu (without specifying meal type - will auto-determine)
      const today = getTodayDateString();
      await loadMenuForDate(today);
    };
    
    initializeMenu();
  }, [name, currentLocation]);

  // Reset auto-determination flag when date changes away from today
  React.useEffect(() => {
    const today = getTodayDateString();
    if (currentDate !== today) {
      hasAutoDeterminedMeal.current = true; // Don't auto-determine for non-today dates
    }
  }, [currentDate]);

  // Function to format time from HH:MM:SS to H AM/PM (removes :00 minutes)
  const formatTime = (timeString: string): string => {
    if (!timeString) {
      return "";
    }
    const [hours, minutes] = timeString.split(":");
    if (!hours || !minutes) {
      return timeString;
    }
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    // Remove minutes if they are :00
    if (minutes === "00") {
      return `${displayHour} ${ampm}`;
    }
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Function to format meal time range
  const formatMealTime = (startTime: string, endTime: string): string => {
    const start = formatTime(startTime);
    const end = formatTime(endTime);
    return `${start}-${end}`;
  };

  // Function to set all stations to expanded by default
  const initializeAllStationsExpanded = (stations: Station[]) => {
    const expandedState: Record<string, boolean> = {};
    stations.forEach(station => {
      expandedState[station.id] = true;
    });
    setStationExpandState(expandedState);
    setAllStationsExpanded(true);
  };

  const toggleStation = async (stationId: string) => {
    const isExpanding = !stationExpandState[stationId];
    
    setStationExpandState(prev => ({
      ...prev,
      [stationId]: !prev[stationId]
    }));
    
    // Update allStationsExpanded state based on individual station toggles
    const currentMeal = menusByDate.get(currentDate)?.[currentMealType];
    if (currentMeal) {
      const updatedState = { ...stationExpandState, [stationId]: !stationExpandState[stationId] };
      const allExpanded = currentMeal.stations.every(station => updatedState[station.id] ?? true);
      setAllStationsExpanded(allExpanded);
    }
    
    // Load collection status for items in this station when expanding
    if (isExpanding) {
      if (currentMeal) {
        const station = currentMeal.stations.find(s => s.id === stationId);
        if (station) {
          const itemIds = station.items.map(item => item.id);
          if (itemIds.length > 0) {
            // Load collection status in background
            checkCollectionStatusBatch(itemIds).catch(error => {
              console.warn('Collection status check failed for station:', error);
            });
          }
        }
      }
    }
  };

  const toggleAllStations = async () => {
    const currentMeal = menusByDate.get(currentDate)?.[currentMealType];
    if (!currentMeal) return;

    const newExpandedState = !allStationsExpanded;
    setAllStationsExpanded(newExpandedState);

    // Update all stations to the new state
    const updatedState: Record<string, boolean> = {};
    currentMeal.stations.forEach(station => {
      updatedState[station.id] = newExpandedState;
    });
    setStationExpandState(updatedState);

    // Load collection status for all items if expanding
    if (newExpandedState) {
      const allItemIds = currentMeal.stations.flatMap(station => 
        station.items.map(item => item.id)
      );
      if (allItemIds.length > 0) {
        checkCollectionStatusBatch(allItemIds).catch(error => {
          console.warn('Collection status check failed for all stations:', error);
        });
      }
    }
  };

  const checkCollectionStatusBatch = async (itemIds: string[]) => {
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
  };

  const handleMenuItemPress = async (item: MenuItem) => {
    // Check if this item is a collection
    if (collectionStatus[item.id]) {
      // Navigate to collection page
      router.push(`/collection/${item.id}`);
      return;
    }

    // Navigate to nutrition page if serving size exists, otherwise to missing nutrition page
    if (item.serving_size) {
      router.push(`/nutrition/${item.id}`);
    } else {
      router.push(`/missing-nutrition/${item.id}`);
    }
  };

  // Navigation boundary functions
  const canNavigatePrev = () => {
    if (currentMealType !== 'breakfast') return true;
    const prevDate = addDaysToDateString(currentDate, -1);
    return isDateInRange(prevDate);
  };

  const canNavigateNext = () => {
    const mealOrder = getMealOrder(name || '');
    if (currentMealType !== mealOrder[mealOrder.length - 1]) return true;
    const nextDate = addDaysToDateString(currentDate, 1);
    return isDateInRange(nextDate);
  };

  // Get current meal from date-based structure
  const currentMeals = menusByDate.get(currentDate);
  const currentMeal = currentMeals?.[currentMealType];
  
  // Check if we have data for the current date and meal
  const hasDataForCurrentMeal = currentMeal && currentMeal.stations && currentMeal.stations.length > 0;
  const isDataLoading = menuLoading || isDateLoading(currentDate);

  // Get meal display info (actual data or defaults)
  const mealDisplayInfo = currentMeal ? {
    name: currentMeal.name,
    startTime: currentMeal.start_time,
    endTime: currentMeal.end_time
  } : {
    name: currentMealType.charAt(0).toUpperCase() + currentMealType.slice(1).replace(/([A-Z])/g, ' $1'),
    startTime: '-',
    endTime: '-'
  };


  // Show loading state while context is loading or initial menu is loading
  if (contextLoading || (menuLoading && !hasDataForCurrentMeal)) {
    return (
      <BackgroundTemplate paddingBottom={0}>
        <View className="flex-1">
          <View className="bg-purdueBlack-200 pt-12 pb-6 px-6">
            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                onPress={() => router.back()}
                className="flex-row items-center"
              >
                <Ionicons name="arrow-back" size={24} color="white" />
                <Text className="text-white text-lg font-sora ml-2">Back</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View className="flex-1 justify-center items-center">
            <Text className="text-white text-lg font-sora">
              Loading menu...
            </Text>
          </View>
        </View>
      </BackgroundTemplate>
    );
  }

  // Show error state if context has error
  if (contextError) {
    return (
      <BackgroundTemplate>
        <View className="flex-1">
          <View className="bg-purdueBlack-200 pt-12 pb-6 px-6">
            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                onPress={() => router.back()}
                className="flex-row items-center"
              >
                <Ionicons name="arrow-back" size={24} color="white" />
                <Text className="text-white text-lg font-sora ml-2">Back</Text>
              </TouchableOpacity>
            </View>
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

  return (
    <BackgroundTemplate paddingBottom={0}>
      <View className="flex-1">
      {/* Header */}
      <View className="bg-transparent pt-14 pb-2 px-6">
        <View className="flex-row items-center justify-between mb-0">
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex-row items-center pb-2"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
            <Text className="text-white text-lg font-sora ml-2">Back</Text>
          </TouchableOpacity>
        </View>

        <Text className="text-white text-3xl font-sora-bold mb-4">{name}</Text>
      </View>

      {/* Main Content */}
      <ScrollView className="flex-1 px-6">
        {/* Meal Navigation */}
        <View className="flex-row items-center justify-between py-4 border-b border-gray-600">
          <TouchableOpacity
            onPress={() => navigateMeal("prev")}
            disabled={!canNavigatePrev()}
            className={`p-2 ${!canNavigatePrev() ? "opacity-30" : ""}`}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>

          <View className="flex-1 items-center">
            <Text className="text-white text-lg font-sora-bold">
              {mealDisplayInfo.name}
            </Text>
            <Text className="text-gray-300 text-sm font-sora">
              {mealDisplayInfo.startTime === '-' ? '-' : formatMealTime(mealDisplayInfo.startTime, mealDisplayInfo.endTime)}
            </Text>
            <Text className="text-gray-400 text-xs font-sora mt-1">
              {createLocalDateFromString(currentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => navigateMeal("next")}
            disabled={!canNavigateNext()}
            className={`p-2 ${!canNavigateNext() ? "opacity-30" : ""}`}
          >
            <Ionicons name="chevron-forward" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Stations */}
        <View className="py-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-white text-xl font-sora-bold">
              Stations
            </Text>
            <TouchableOpacity
              onPress={toggleAllStations}
              className="bg-gray-700 rounded-lg px-3 py-2"
            >
              <Text className="text-white text-sm font-sora">
                {allStationsExpanded ? "Close All" : "Open All"}
              </Text>
            </TouchableOpacity>
          </View>

          {isDataLoading ? (
            <View className="py-8 items-center">
              <Text className="text-gray-400 text-base font-sora">
                Loading {mealDisplayInfo.name.toLowerCase()} menu...
              </Text>
            </View>
          ) : hasDataForCurrentMeal ? (
            currentMeal.stations.map((station, stationIndex) => (
            <View key={station.id}>
              {/* Station Header */}
              <TouchableOpacity
                  onPress={() => toggleStation(station.id)}
                className="flex-row items-center justify-between py-3 px-4 bg-gray-800 rounded-lg mb-2"
                style={{
                  borderWidth: 1,
                  borderColor: "rgba(207, 185, 145, 0.2)",
                }}
              >
                <View className="flex-row items-center flex-1">
                  <Text className="text-white text-base font-sora-bold flex-1">
                    {station.name}
                  </Text>
                  <Ionicons
                    name="restaurant"
                    size={20}
                    color="#CFB991"
                    style={{ marginRight: 8 }}
                  />
                </View>
                <Ionicons
                    name={(stationExpandState[station.id] ?? true) ? "chevron-down" : "chevron-forward"}
                  size={20}
                  color="#CFB991"
                />
              </TouchableOpacity>

              {/* Station Items */}
                {(stationExpandState[station.id] ?? true) && (
                <View className="ml-2 mb-2">
                    {(() => {
                      // Deduplicate items by id at render time
                      const uniqueItems = station.items.reduce((acc, item) => {
                        // Only add item if we haven't seen this id before
                        if (!acc.find(i => i.id === item.id)) {
                          acc.push(item);
                        }
                        return acc;
                      }, [] as MenuItem[]);

                      return uniqueItems.map((item) => {
                    const isCollection = collectionStatus[item.id] || false;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => handleMenuItemPress(item)}
                      >
                        <MenuItemCard 
                          item={item} 
                          isCollection={isCollection}
                        />
                      </TouchableOpacity>
                    );
                      });
                    })()}
                </View>
              )}
              </View>
            ))
          ) : (
            <View className="py-8 items-center">
              <Text className="text-gray-400 text-base font-sora">
                No {mealDisplayInfo.name.toLowerCase()} will be served
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
      </View>
    </BackgroundTemplate>
  );
}