import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

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
  protein_per_100cals?: number;
  ingredients?: string;
  last_verified?: string;
  // Additional fields from joins
  location_name?: string;
  meal_name?: string;
  station_name?: string;
  // Support for multiple meals
  meals?: string[];
}

interface MenuItemCardProps {
  item: MenuItem;
  showDietaryTag?: boolean;
  meals?: string[];
}

export default function MenuItemCard({ item, showDietaryTag = true, meals }: MenuItemCardProps) {
  const getDietaryIcons = () => {
    const icons = [];
    
    // Always show gluten-free if applicable
    if (item.gluten === false) {
      icons.push({ 
        icon: "shield-checkmark" as const, 
        color: "#10B981", // Green
        tooltip: "Gluten-Free" 
      });
    }
    
    // Show vegan or vegetarian (vegan takes priority)
    if (item.vegan) {
      icons.push({ 
        icon: "leaf" as const, 
        color: "#059669", // Dark green
        tooltip: "Vegan" 
      });
    } else if (item.vegetarian) {
      icons.push({ 
        icon: "leaf-outline" as const, 
        color: "#10B981", // Green
        tooltip: "Vegetarian" 
      });
    }
    
    // Only show high protein if no other dietary tags
    if (icons.length === 0 && item.protein_g !== undefined && item.protein_g !== null && !isNaN(Number(item.protein_g)) && Number(item.protein_g) > 20) {
      icons.push({ 
        icon: "fitness" as const, 
        color: "#F59E0B", // Amber
        tooltip: "High Protein" 
      });
    }
    
    return icons;
  };

  const dietaryIcons = getDietaryIcons();

  return (
    <View className="bg-gray-800 rounded-xl p-4 mb-3 shadow-lg">
      <View className="flex-row">
        {/* Left portion - Main content */}
        <View className="flex-1 mr-3">
          {/* Title and Dietary Tags */}
          <View className="flex-row items-center mb-1">
            <Text className="text-white text-xl font-sora-bold flex-1 mr-3">
              {item.name || "Unknown Item"}
            </Text>
            {/* Dietary Icons */}
            {showDietaryTag && dietaryIcons.length > 0 && (
              <View className="flex-row">
                {dietaryIcons.map((iconData, index) => (
                  <View 
                    key={index} 
                    className="w-6 h-6 rounded-full bg-gray-700 items-center justify-center mr-1"
                    style={{ backgroundColor: `${iconData.color}20` }} // 20% opacity
                  >
                    <Ionicons 
                      name={iconData.icon} 
                      size={14} 
                      color={iconData.color} 
                    />
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Location and Meals Information */}
          <View className="flex-row items-center justify-between mb-2">
            {item.location_name && (
              <Text className="text-purdueGold text-sm font-sora">
                📍 {item.location_name}
              </Text>
            )}
            {meals && meals.length > 0 && (
              <Text className="text-gray-400 text-sm font-sora">
                {meals.join(", ")}
              </Text>
            )}
          </View>

          {/* Nutritional Information */}
          <View className="flex-row flex-wrap">
            {item.protein_g !== undefined && item.protein_g !== null && !isNaN(Number(item.protein_g)) && (
              <Text className="text-gray-300 text-sm font-sora mr-5">
                Protein: {Number(item.protein_g).toFixed(1)}g
              </Text>
            )}
            {item.carbs_g !== undefined && item.carbs_g !== null && !isNaN(Number(item.carbs_g)) && (
              <Text className="text-gray-300 text-sm font-sora mr-5">
                Carbs: {Number(item.carbs_g).toFixed(1)}g
              </Text>
            )}
            {item.fat_g !== undefined && item.fat_g !== null && !isNaN(Number(item.fat_g)) && (
              <Text className="text-gray-300 text-sm font-sora">
                Fat: {Number(item.fat_g).toFixed(1)}g
              </Text>
            )}
          </View>
        </View>

        {/* Right portion - Calories only */}
        {item.calories !== undefined && item.calories !== null && !isNaN(Number(item.calories)) && (
          <View className="items-end justify-center" style={{ minWidth: 80 }}>
            <Text className="text-purdueGold text-2xl font-sora-bold">
              {Math.trunc(Number(item.calories))}
            </Text>
            <Text className="text-gray-400 text-sm font-sora">calories</Text>
          </View>
        )}
      </View>
    </View>
  );
}
