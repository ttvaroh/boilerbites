import { useRouter } from "expo-router";
import * as React from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import CategoryFilter from "../../components/CategoryFilter";
import DiningHallCard from "../../components/DiningHallCard";
import { useMenuData } from "../../lib/MenuDataContext";

import {
  earhartLogo,
  fordLogo,
  hillenbrandLogo,
  wileyLogo,
  windsorLogo,
} from "../../assets/images/logos/logos";

interface MealHours {
  meal_name: string;
  start_time: string;
  end_time: string;
  open: boolean;
}

interface DiningHall {
  id: number;
  name: string;
  hours: string;
  status: "open" | "closed";
  isFavorite: boolean;
  image: any;
  mealHours?: MealHours[];
}

export default function HomePage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = React.useState("Open Now");
  const { menuData, loading, error, refreshData } = useMenuData();

  const categories = ["Open Now", "Breakfast", "Lunch", "Dinner"];

  // Logo mapping
  const logoMap: { [key: string]: any } = {
    Wiley: wileyLogo,
    Ford: fordLogo,
    Windsor: windsorLogo,
    Earhart: earhartLogo,
    Hillenbrand: hillenbrandLogo,
  };

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

  // Function to format hours for display
  const formatHours = (mealHours: MealHours[]): string => {
    if (!mealHours || mealHours.length === 0) return "Closed Today";

    const openMeals = mealHours.filter((meal) => meal.open);
    if (openMeals.length === 0) return "Closed Today";

    // Get current time
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    // Find currently open meal
    const currentMeal = openMeals.find((meal) => {
      if (!meal.start_time || !meal.end_time) return false;
      const [startHour, startMin] = meal.start_time.split(":").map(Number);
      const [endHour, endMin] = meal.end_time.split(":").map(Number);
      const startTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;
      return currentTime >= startTime && currentTime <= endTime;
    });

    if (currentMeal) {
      return `${currentMeal.meal_name}: ${formatTime(currentMeal.start_time)} - ${formatTime(currentMeal.end_time)}`;
    }

    // Find next meal
    const nextMeal = openMeals.find((meal) => {
      if (!meal.start_time) return false;
      const [startHour, startMin] = meal.start_time.split(":").map(Number);
      const startTime = startHour * 60 + startMin;
      return startTime > currentTime;
    });

    if (nextMeal) {
      return `Opens at ${formatTime(nextMeal.start_time)}`;
    }

    // If no current or next meal, show the last meal
    const lastMeal = openMeals[openMeals.length - 1];
    return `Last meal: ${formatTime(lastMeal.start_time)} - ${formatTime(lastMeal.end_time)}`;
  };

  // Convert preloaded menu data to dining hall format
  const diningHalls: DiningHall[] = React.useMemo(() => {
    return menuData.map((locationMenu, index) => {
      const isOpen = locationMenu.isPublished;

      // Get meal hours for this location
      const mealHours: MealHours[] = locationMenu.meals.map((meal) => ({
        meal_name: meal.name,
        start_time: meal.start_time,
        end_time: meal.end_time,
        open: meal.open,
      }));

      const formattedHours = formatHours(mealHours);

      return {
        id: index + 1,
        name: locationMenu.locationName,
        hours: formattedHours,
        status: isOpen ? "open" : "closed",
        isFavorite: false, // TODO: Implement favorites from user preferences
        image: logoMap[locationMenu.locationName] || wileyLogo,
        mealHours: mealHours,
      };
    });
  }, [menuData]);

  const fetchDiningHalls = async () => {
    try {
      await refreshData();
    } catch (error) {
      console.error("Error refreshing dining halls:", error);
      Alert.alert("Error", "Failed to refresh dining hall data");
    }
  };

  const handleLogMeal = () => {
    Alert.alert("Log Meal", "Log meal button clicked!");
  };

  const handleDiningHallPress = (name: string) => {
    router.push(`/dining-hall/${encodeURIComponent(name)}`);
  };

  const handleFavoritePress = (name: string, isFavorite: boolean) => {
    Alert.alert(
      "Favorite",
      `${name} ${isFavorite ? "removed from" : "added to"} favorites!`
    );
  };

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    Alert.alert("Filter", `Filter changed to: ${category}`);
  };

  return (
    <View className="flex-1 bg-warmWhite">
      {/* Header Section */}
      <View className="bg-purdueBlack-200 pt-12 pb-6 px-6">
        <View className="flex-row items-center justify-between mb-6">
          <View>
            <Text className="text-white text-lg font-sora">Welcome</Text>
            <Text className="text-white text-2xl font-sora-bold">
              Boilermaker
            </Text>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView className="flex-1 px-6 pt-6">
        {/* Category Filter */}
        <CategoryFilter
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
        />

        {/* Dining Halls Grid */}
        {loading ? (
          <View className="flex-1 justify-center items-center py-8">
            <Text className="text-purdueBlack-200 text-lg font-sora">
              Loading dining halls...
            </Text>
          </View>
        ) : error ? (
          <View className="flex-1 justify-center items-center py-8 px-6">
            <Text className="text-purdueBlack-200 text-lg font-sora text-center mb-4">
              Error loading dining halls
            </Text>
            <Text className="text-purdueBlack-200 text-sm font-sora text-center opacity-70 mb-4">
              {error}
            </Text>
            <TouchableOpacity
              onPress={fetchDiningHalls}
              className="bg-purdueGold rounded-lg px-6 py-3"
            >
              <Text className="text-purdueBlack-200 font-sora-bold">Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="flex-row flex-wrap justify-between">
            {diningHalls.map((hall) => (
              <View key={hall.id} className="w-[48%]">
                <DiningHallCard
                  name={hall.name}
                  hours={hall.hours}
                  status={hall.status}
                  isFavorite={hall.isFavorite}
                  image={hall.image}
                  onPress={() => handleDiningHallPress(hall.name)}
                  onFavoritePress={() =>
                    handleFavoritePress(hall.name, hall.isFavorite)
                  }
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
