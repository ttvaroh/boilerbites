import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useMenuData } from "../../lib/MenuDataContext";

interface MenuItem {
  id: string;
  name: string;
  vegetarian?: boolean;
  vegan?: boolean;
  gluten?: boolean;
  allergens?: string[];
}

interface Station {
  id: string;
  name: string;
  items: MenuItem[];
  isExpanded: boolean;
}

interface Meal {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  open: boolean;
  stations: Station[];
}

export default function DiningHallPage() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const router = useRouter();
  const {
    getMenuForLocation,
    loading: contextLoading,
    error: contextError,
  } = useMenuData();

  const [currentMealIndex, setCurrentMealIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Get preloaded menu data for this location
  const locationMenu = getMenuForLocation(name || "");

  // Convert preloaded data to local state format with expanded/collapsed state
  const [meals, setMeals] = useState<Meal[]>(() => {
    if (!locationMenu) return [];
    return locationMenu.meals.map((meal) => ({
      ...meal,
      stations: meal.stations.map((station) => ({
        ...station,
        isExpanded: false, // Start with all stations collapsed
      })),
    }));
  });

  // Update meals when locationMenu changes
  React.useEffect(() => {
    if (locationMenu) {
      setMeals(
        locationMenu.meals.map((meal) => ({
          ...meal,
          stations: meal.stations.map((station) => ({
            ...station,
            isExpanded: false, // Start with all stations collapsed
          })),
        }))
      );
      setCurrentMealIndex(0); // Reset to first meal
    }
  }, [locationMenu]);

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

  const toggleStation = (mealIndex: number, stationIndex: number) => {
    const updatedMeals = [...meals];
    updatedMeals[mealIndex].stations[stationIndex].isExpanded =
      !updatedMeals[mealIndex].stations[stationIndex].isExpanded;
    setMeals(updatedMeals);
  };

  const handleMenuItemPress = (item: MenuItem) => {
    Alert.alert("Menu Item", `Clicked on: ${item.name}`);
  };

  const navigateMeal = (direction: "prev" | "next") => {
    if (direction === "prev" && currentMealIndex > 0) {
      setCurrentMealIndex(currentMealIndex - 1);
    } else if (direction === "next" && currentMealIndex < meals.length - 1) {
      setCurrentMealIndex(currentMealIndex + 1);
    }
  };

  const currentMeal = meals[currentMealIndex];

  // Show loading state while context is loading
  if (contextLoading) {
    return (
      <View className="flex-1 bg-warmWhite">
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
          <Text className="text-purdueBlack-200 text-lg font-sora">
            Loading menu...
          </Text>
        </View>
      </View>
    );
  }

  // Show error state if context has error
  if (contextError) {
    return (
      <View className="flex-1 bg-warmWhite">
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
          <Text className="text-purdueBlack-200 text-lg font-sora text-center mb-4">
            Error loading menu data
          </Text>
          <Text className="text-purdueBlack-200 text-sm font-sora text-center opacity-70">
            {contextError}
          </Text>
        </View>
      </View>
    );
  }

  // Show no menu state if no data for this location
  if (!locationMenu || !currentMeal) {
    return (
      <View className="flex-1 bg-warmWhite">
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
          <Text className="text-purdueBlack-200 text-lg font-sora text-center">
            No menu available for {name} today.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-warmWhite">
      {/* Header */}
      <View className="bg-purdueBlack-200 pt-12 pb-6 px-6">
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex-row items-center"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
            <Text className="text-white text-lg font-sora ml-2">Back</Text>
          </TouchableOpacity>
        </View>

        <Text className="text-gray-300 text-sm font-sora mb-1">
          Dining Courts
        </Text>
        <Text className="text-white text-2xl font-sora-bold mb-4">{name}</Text>

        {/* Search Bar */}
        <View className="flex-row items-center bg-white/10 rounded-lg px-4 py-3 mb-2">
          <Ionicons name="search" size={20} color="white" />
          <TextInput
            className="flex-1 text-white ml-3 font-sora"
            placeholder="Search menu items..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity className="ml-2">
            <Ionicons name="options" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView className="flex-1 px-6">
        {/* Meal Navigation */}
        <View className="flex-row items-center justify-between py-4 border-b border-gray-200">
          <TouchableOpacity
            onPress={() => navigateMeal("prev")}
            disabled={currentMealIndex === 0}
            className={`p-2 ${currentMealIndex === 0 ? "opacity-30" : ""}`}
          >
            <Ionicons name="chevron-back" size={24} color="#0d0d0d" />
          </TouchableOpacity>

          <View className="flex-1 items-center">
            <Text className="text-purdueBlack-200 text-lg font-sora-bold">
              {currentMeal.name}
            </Text>
            <Text className="text-purdueBlack-200 text-sm font-sora">
              {formatMealTime(currentMeal.start_time, currentMeal.end_time)}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => navigateMeal("next")}
            disabled={currentMealIndex === meals.length - 1}
            className={`p-2 ${currentMealIndex === meals.length - 1 ? "opacity-30" : ""}`}
          >
            <Ionicons name="chevron-forward" size={24} color="#0d0d0d" />
          </TouchableOpacity>
        </View>

        {/* Stations */}
        <View className="py-4">
          <Text className="text-purdueBlack-200 text-lg font-sora-bold mb-4">
            Stations
          </Text>

          {currentMeal.stations.map((station, stationIndex) => (
            <View key={station.id} className="mb-4">
              {/* Station Header */}
              <TouchableOpacity
                onPress={() => toggleStation(currentMealIndex, stationIndex)}
                className="flex-row items-center justify-between py-3"
              >
                <View className="flex-row items-center flex-1">
                  <Text className="text-purdueBlack-200 text-base font-sora-bold flex-1">
                    {station.name}
                  </Text>
                  <Ionicons
                    name="restaurant"
                    size={20}
                    color="#0d0d0d"
                    style={{ marginRight: 8 }}
                  />
                </View>
                <Ionicons
                  name={station.isExpanded ? "chevron-down" : "chevron-forward"}
                  size={20}
                  color="#0d0d0d"
                />
              </TouchableOpacity>

              {/* Station Items */}
              {station.isExpanded && (
                <View className="ml-4">
                  {station.items.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => handleMenuItemPress(item)}
                      className="py-2 border-b border-gray-100 last:border-b-0"
                    >
                      <Text className="text-purdueBlack-200 text-sm font-sora">
                        {item.name}
                      </Text>
                      {/* Show dietary info if available */}
                      {(item.vegetarian || item.vegan || item.gluten) && (
                        <View className="flex-row mt-1">
                          {item.vegetarian && (
                            <Text className="text-green-600 text-xs mr-2">
                              Vegetarian
                            </Text>
                          )}
                          {item.vegan && (
                            <Text className="text-green-600 text-xs mr-2">
                              Vegan
                            </Text>
                          )}
                          {item.gluten && (
                            <Text className="text-orange-600 text-xs mr-2">
                              Contains Gluten
                            </Text>
                          )}
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
