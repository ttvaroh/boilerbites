import { Ionicons } from "@expo/vector-icons";
import * as React from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import CategoryFilter from "../../components/CategoryFilter";
import DiningHallCard from "../../components/DiningHallCard";

import {
  earhartLogo,
  fordLogo,
  hillenbrandLogo,
  wileyLogo,
  windsorLogo,
} from "../../assets/images/logos/logos";

export default function HomePage() {
  const [activeCategory, setActiveCategory] = React.useState("Open Now");

  const categories = ["Open Now", "Breakfast", "Lunch", "Dinner"];

  const diningHalls = [
    {
      id: 1,
      name: "Wiley",
      hours: "Lunch: 11AM-2PM",
      status: "open" as const,
      isFavorite: true,
      image: wileyLogo,
    },
    {
      id: 2,
      name: "Ford",
      hours: "Lunch: 11AM-2PM",
      status: "closed" as const,
      isFavorite: true,
      image: fordLogo,
    },
    {
      id: 3,
      name: "Windsor",
      hours: "Lunch: 11AM-2PM",
      status: "closed" as const,
      isFavorite: false,
      image: windsorLogo,
    },
    {
      id: 4,
      name: "Earhart",
      hours: "Lunch: 11AM-2PM",
      status: "open" as const,
      isFavorite: false,
      image: earhartLogo,
    },
    {
      id: 5,
      name: "Hillenbrand",
      hours: "Lunch: 11AM-2PM",
      status: "closed" as const,
      isFavorite: false,
      image: hillenbrandLogo,
    },
  ];

  const handleLogMeal = () => {
    Alert.alert("Log Meal", "Log meal button clicked!");
  };

  const handleDiningHallPress = (name: string) => {
    Alert.alert("Dining Hall", `${name} dining hall clicked!`);
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
              Tom Tvaroh
            </Text>
          </View>
        </View>

        {/* Log Meal Button */}
        <TouchableOpacity
          onPress={handleLogMeal}
          className="bg-purdueGold rounded-xl p-4 items-center"
        >
          <Text className="text-purdueBlack-200 font-sora-bold text-lg mb-2">
            Log meal
          </Text>
          <Ionicons name="add" size={24} color="#0d0d0d" />
        </TouchableOpacity>
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
      </ScrollView>
    </View>
  );
}
