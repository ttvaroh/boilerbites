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
import { getCurrentTimeInEST } from "../../lib/timezone-utils";

interface DiningHallMenu {
  locationName: string;
  menuId: string;
  isPublished: boolean;
  meals: Meal[];
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
    getMenuForLocation,
    isLocationLoading,
    isMenuReady,
    loading: contextLoading,
    error: contextError,
  } = useMenuData();

  const [currentMealIndex, setCurrentMealIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationMenu, setLocationMenu] = useState<DiningHallMenu | null>(null);
  const [menuLoading, setMenuLoading] = useState(false);

  // Convert menu data to local state format with expanded/collapsed state
  const [meals, setMeals] = useState<LocalMeal[]>([]);

  // Load menu data when component mounts or location changes
  React.useEffect(() => {
    const loadMenuData = async () => {
      if (!name) return;
      
      setMenuLoading(true);
      try {
        const menu = await getMenuForLocation(name);
        setLocationMenu(menu);
        
        if (menu) {
          const mealsWithExpanded = menu.meals.map((meal): LocalMeal => ({
            ...meal,
            stations: meal.stations.map((station): LocalStation => ({
              ...station,
              isExpanded: true, // Start with all stations collapsed
            })),
          }));
          
          setMeals(mealsWithExpanded);
          // Set to current meal based on time
          setCurrentMealIndex(findCurrentMealIndex(mealsWithExpanded));
          
          // Check collection status for all items in batch
          const allItemIds = mealsWithExpanded.flatMap(meal => 
            meal.stations.flatMap(station => 
              station.items.map(item => item.id)
            )
          );
          checkCollectionStatusBatch(allItemIds);
        }
      } catch (error) {
        console.error('Error loading menu data:', error);
      } finally {
        setMenuLoading(false);
      }
    };

    loadMenuData();
  }, [name, getMenuForLocation]);

  // Watch for when menu becomes ready (from background loading)
  React.useEffect(() => {
    const checkMenuReady = async () => {
      if (!name || locationMenu) return; // Don't reload if we already have menu data
      
      if (isMenuReady(name)) {
        try {
          const menu = await getMenuForLocation(name);
          if (menu) {
            setLocationMenu(menu);
            const mealsWithExpanded = menu.meals.map((meal): LocalMeal => ({
              ...meal,
              stations: meal.stations.map((station): LocalStation => ({
                ...station,
                isExpanded: false, // Start with all stations collapsed
              })),
            }));
            
            setMeals(mealsWithExpanded);
            // Set to current meal based on time
            setCurrentMealIndex(findCurrentMealIndex(mealsWithExpanded));
            setMenuLoading(false);
            
            // Check collection status for all items in batch
            const allItemIds = mealsWithExpanded.flatMap(meal => 
              meal.stations.flatMap(station => 
                station.items.map(item => item.id)
              )
            );
            checkCollectionStatusBatch(allItemIds);
          }
        } catch (error) {
          console.error('Error loading ready menu data:', error);
        }
      }
    };

    // Check immediately
    checkMenuReady();

    // Set up interval to check periodically
    const interval = setInterval(checkMenuReady, 500);
    
    return () => clearInterval(interval);
  }, [name, isMenuReady, getMenuForLocation, locationMenu]);

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

  const toggleStation = (mealIndex: number, stationIndex: number) => {
    const updatedMeals = [...meals];
    updatedMeals[mealIndex].stations[stationIndex].isExpanded =
      !updatedMeals[mealIndex].stations[stationIndex].isExpanded;
    setMeals(updatedMeals);
  };

  const [collectionStatus, setCollectionStatus] = useState<Record<string, boolean>>({});


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

  const navigateMeal = (direction: "prev" | "next") => {
    if (direction === "prev" && currentMealIndex > 0) {
      setCurrentMealIndex(currentMealIndex - 1);
    } else if (direction === "next" && currentMealIndex < meals.length - 1) {
      setCurrentMealIndex(currentMealIndex + 1);
    }
  };

  const currentMeal = meals[currentMealIndex];

  // Show loading state while context is loading or menu is loading
  if (contextLoading || menuLoading || isLocationLoading(name || "")) {
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
  if (!locationMenu || !currentMeal) {
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
            disabled={currentMealIndex === 0}
            className={`p-2 ${currentMealIndex === 0 ? "opacity-30" : ""}`}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>

          <View className="flex-1 items-center">
            <Text className="text-white text-lg font-sora-bold">
              {currentMeal.name}
            </Text>
            <Text className="text-gray-300 text-sm font-sora">
              {formatMealTime(currentMeal.start_time, currentMeal.end_time)}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => navigateMeal("next")}
            disabled={currentMealIndex === meals.length - 1}
            className={`p-2 ${currentMealIndex === meals.length - 1 ? "opacity-30" : ""}`}
          >
            <Ionicons name="chevron-forward" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Stations */}
        <View className="py-4">
          <Text className="text-white text-xl font-sora-bold mb-4">
            Stations
          </Text>

          {currentMeal.stations.map((station, stationIndex) => (
            <View key={station.id}>
              {/* Station Header */}
              <TouchableOpacity
                onPress={() => toggleStation(currentMealIndex, stationIndex)}
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
                  name={station.isExpanded ? "chevron-down" : "chevron-forward"}
                  size={20}
                  color="#CFB991"
                />
              </TouchableOpacity>

              {/* Station Items */}
              {station.isExpanded && (
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
          ))}
        </View>
      </ScrollView>
      </View>
    </BackgroundTemplate>
  );
}
