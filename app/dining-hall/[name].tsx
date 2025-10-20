import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import BackgroundTemplate from "../../components/BackgroundTemplate";
import MenuItemCard from "../../components/MenuItemCard";
import { useMenuData } from "../../lib/MenuDataContext";
import { supabase } from "../../lib/supabase";
import { getCurrentTimeInEST, getDateStringFromToday, getTodayDateString } from "../../lib/timezone-utils";

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

interface LocalMeal extends Meal {
  stations: LocalStation[];
}

export default function DiningHallPage() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const router = useRouter();
  const {
    getMenuForDate,
    switchLocation,
    isDateLoading,
    isDateReady,
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

  // Date range helper functions
  const getDateRange = (): { minDate: string; maxDate: string } => {
    return {
      minDate: getDateStringFromToday(-5),
      maxDate: getDateStringFromToday(5),
    };
  };

  const isDateInRange = (dateStr: string): boolean => {
    const { minDate, maxDate } = getDateRange();
    return dateStr >= minDate && dateStr <= maxDate;
  };

  const addDaysToDate = (dateStr: string, days: number): string => {
    const date = new Date(dateStr + 'T00:00:00');
    date.setDate(date.getDate() + days);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Meal navigation functions
  const getMealOrder = (locationName: string): readonly string[] => {
    return locationName === 'Windsor' 
      ? ['breakfast', 'lunch', 'lateLunch', 'dinner']
      : ['breakfast', 'lunch', 'dinner'];
  };

  const navigateMeal = async (direction: 'prev' | 'next') => {
    const mealOrder = getMealOrder(name || '');
    const currentIndex = mealOrder.indexOf(currentMealType);
    
    if (direction === 'next') {
      if (currentIndex < mealOrder.length - 1) {
        // Move to next meal same day
        setCurrentMealType(mealOrder[currentIndex + 1] as any);
      } else {
        // Move to first meal of next day
        const nextDate = addDaysToDate(currentDate, 1);
        
        if (isDateInRange(nextDate)) {
          setCurrentDate(nextDate);
          setCurrentMealType('breakfast');
          // Load next date if not already loaded
          if (!menusByDate.has(nextDate)) {
            await loadMenuForDate(nextDate);
          }
        }
      }
    } else {
      if (currentIndex > 0) {
        // Move to previous meal same day
        setCurrentMealType(mealOrder[currentIndex - 1] as any);
      } else {
        // Move to last meal of previous day
        const prevDate = addDaysToDate(currentDate, -1);
        
        if (isDateInRange(prevDate)) {
          setCurrentDate(prevDate);
          const prevDayMealOrder = getMealOrder(name || '');
          setCurrentMealType(prevDayMealOrder[prevDayMealOrder.length - 1] as any);
          // Load previous date if not already loaded
          if (!menusByDate.has(prevDate)) {
            await loadMenuForDate(prevDate);
          }
        }
      }
    }
  };

  // Menu loading function
  const loadMenuForDate = async (date: string) => {
    if (!name) return;
    
    setMenuLoading(true);
    try {
      const mealsData = await getMenuForDate(name, date);
      
      if (mealsData) {
        setMenusByDate(prev => new Map(prev).set(date, mealsData));
        
        // Collect all item IDs for collection status check
        const itemIds: string[] = [];
        Object.values(mealsData).forEach((meal: Meal | undefined) => {
          if (meal) {
            meal.stations.forEach((station: Station) => {
              station.items.forEach((item: MenuItem) => itemIds.push(item.id));
            });
          }
        });
        
        if (itemIds.length > 0) {
          await checkCollectionStatusBatch(itemIds);
        }
      }
    } catch (error) {
      console.error(`Error loading menu for ${date}:`, error);
    } finally {
      setMenuLoading(false);
    }
  };

  // Find current meal type based on time
  const findCurrentMealType = (mealsData: MealsByDate, locationName: string): string => {
    const { hours, minutes } = getCurrentTimeInEST();
    const currentTime = hours * 60 + minutes;
    
    const mealOrder = getMealOrder(locationName);
    
    // Check each meal in order
    for (const mealType of mealOrder) {
      const meal = mealsData[mealType as keyof MealsByDate];
      if (meal && meal.start_time && meal.end_time) {
        const [startHour, startMin] = meal.start_time.split(':').map(Number);
        const [endHour, endMin] = meal.end_time.split(':').map(Number);
        const startTime = startHour * 60 + startMin;
        const endTime = endHour * 60 + endMin;
        
        if (meal.open && currentTime >= startTime && currentTime <= endTime) {
          return mealType;
        }
      }
    }
    
    // Find next meal if not currently in service
    for (const mealType of mealOrder) {
      const meal = mealsData[mealType as keyof MealsByDate];
      if (meal && meal.start_time) {
        const [startHour, startMin] = meal.start_time.split(':').map(Number);
        const startTime = startHour * 60 + startMin;
        
        if (meal.open && startTime > currentTime) {
          return mealType;
        }
      }
    }
    
    // Default to breakfast
    return 'breakfast';
  };

  // Initialize menu data when component mounts or location changes
  React.useEffect(() => {
    const initializeMenu = async () => {
      if (!name) return;
      
      // Switch location in context
      await switchLocation(name);
      
      // Load today's menu
      const today = getTodayDateString();
      await loadMenuForDate(today);
      
      // Determine which meal to show
      const todayMeals = menusByDate.get(today);
      if (todayMeals) {
        const mealType = findCurrentMealType(todayMeals, name);
        setCurrentMealType(mealType as any);
      }
    };
    
    initializeMenu();
  }, [name]);

  // Function to format time from HH:MM:SS to H AM/PM (removes :00 minutes)
  const formatTime = (timeString: string): string => {
    if (!timeString) return "";
    const [hours, minutes] = timeString.split(":");
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

  // Function to find the current meal based on time
  const findCurrentMealIndex = (meals: LocalMeal[]): number => {
    if (!meals || meals.length === 0) return 0;

    const { hours, minutes } = getCurrentTimeInEST();
    const currentTime = hours * 60 + minutes;

    // Find currently open meal
    const currentMealIndex = meals.findIndex((meal) => {
      if (!meal.start_time || !meal.end_time) return false;
      const [startHour, startMin] = meal.start_time.split(":").map(Number);
      const [endHour, endMin] = meal.end_time.split(":").map(Number);
      const startTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;
      return meal.open && currentTime >= startTime && currentTime <= endTime;
    });

    // If found a currently open meal, return its index
    if (currentMealIndex !== -1) {
      return currentMealIndex;
    }

    // Find next meal today
    const nextMealIndex = meals.findIndex((meal) => {
      if (!meal.start_time) return false;
      const [startHour, startMin] = meal.start_time.split(":").map(Number);
      const startTime = startHour * 60 + startMin;
      return meal.open && startTime > currentTime;
    });

    // If found next meal, return its index
    if (nextMealIndex !== -1) {
      return nextMealIndex;
    }

    // Default to first meal if no current or next meal found
    return 0;
  };

  const toggleStation = (stationId: string) => {
    setStationExpandState(prev => ({
      ...prev,
      [stationId]: !prev[stationId]
    }));
  };

  const checkCollectionStatusBatch = async (itemIds: string[]) => {
    try {
      const { data: itemsData, error } = await supabase
        .from('item')
        .select('id, is_collection')
        .in('id', itemIds);

      if (!error && itemsData) {
        const newStatus: Record<string, boolean> = {};
        itemsData.forEach(item => {
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
    const prevDate = addDaysToDate(currentDate, -1);
    return isDateInRange(prevDate);
  };

  const canNavigateNext = () => {
    const mealOrder = getMealOrder(name || '');
    if (currentMealType !== mealOrder[mealOrder.length - 1]) return true;
    const nextDate = addDaysToDate(currentDate, 1);
    return isDateInRange(nextDate);
  };

  // Get current meal from date-based structure
  const currentMeals = menusByDate.get(currentDate);
  const currentMeal = currentMeals?.[currentMealType];

  // Show loading state while context is loading or menu is loading
  if (contextLoading || menuLoading || isDateLoading(currentDate)) {
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

  // Show no menu state if no data for this location
  if (!currentMeal) {
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
          <View className="flex-1 justify-center items-center">
            <Text className="text-white text-lg font-sora text-center">
              No menu available for {name} today.
            </Text>
          </View>
        </View>
      </BackgroundTemplate>
    );
  }

  return (
    <BackgroundTemplate>
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
              {currentMeal ? currentMeal.name : 'No Menu Available'}
            </Text>
            {currentMeal && (
              <Text className="text-gray-300 text-sm font-sora">
                {formatMealTime(currentMeal.start_time, currentMeal.end_time)}
              </Text>
            )}
            <Text className="text-gray-400 text-xs font-sora mt-1">
              {new Date(currentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
          <Text className="text-white text-xl font-sora-bold mb-4">
            Stations
          </Text>

          {currentMeal && currentMeal.stations.length > 0 ? (
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
                    name={stationExpandState[station.id] ? "chevron-down" : "chevron-forward"}
                    size={20}
                    color="#CFB991"
                  />
                </TouchableOpacity>

                {/* Station Items */}
                {stationExpandState[station.id] && (
                  <View className="ml-2 mb-2">
                    {station.items.map((item) => {
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
                    })}
                  </View>
                )}
              </View>
            ))
          ) : (
            <View className="py-8 items-center">
              <Text className="text-gray-400 text-base font-sora">
                No meals will be served
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
      </View>
    </BackgroundTemplate>
  );
}
