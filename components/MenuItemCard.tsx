import { FontAwesome6, Ionicons, MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
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
    const icons: Array<{
      icon: string;
      iconFamily: "Ionicons" | "MaterialIcons" | "MaterialCommunityIcons" | "FontAwesome6";
      color: string;
      tooltip: string;
    }> = [];
    
    // Show gluten warning if item contains gluten
    if (item.gluten === true) {
      icons.push({ 
        icon: "wheat-awn-circle-exclamation", 
        iconFamily: "FontAwesome6",
        color: "#F59E0B", // Amber
        tooltip: "Contains Gluten" 
      });
    }
    
    // Show vegan or vegetarian (vegan takes priority)
    if (item.vegan) {
      icons.push({ 
        icon: "leaf", 
        iconFamily: "Ionicons",
        color: "#059669", // Dark green
        tooltip: "Vegan" 
      });
    } else if (item.vegetarian) {
      icons.push({ 
        icon: "leaf-outline", 
        iconFamily: "Ionicons",
        color: "#10B981", // Green
        tooltip: "Vegetarian" 
      });
    }
    
    // Only show high protein if no other dietary tags
    if (icons.length === 0 && item.protein_per_100cals !== undefined && item.protein_per_100cals !== null && !isNaN(Number(item.protein_per_100cals)) && Number(item.protein_per_100cals) > 8) {
      icons.push({ 
        icon: "fitness-center", 
        iconFamily: "MaterialIcons",
        color: "#3b82f6", // Blue
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
                {dietaryIcons.map((iconData, index) => {
                  return (
                    <View 
                      key={index} 
                      className="w-6 h-6 rounded-full bg-gray-700 items-center justify-center mr-1"
                      style={{ backgroundColor: `${iconData.color}20` }} // 20% opacity
                    >
                      {iconData.iconFamily === "MaterialIcons" ? (
                        <MaterialIcons 
                          name={iconData.icon as any} 
                          size={14} 
                          color={iconData.color} 
                        />
                      ) : iconData.iconFamily === "MaterialCommunityIcons" ? (
                        <MaterialCommunityIcons 
                          name={iconData.icon as any} 
                          size={14} 
                          color={iconData.color} 
                        />
                      ) : iconData.iconFamily === "FontAwesome6" ? (
                        <FontAwesome6 
                          name={iconData.icon as any} 
                          size={14} 
                          color={iconData.color} 
                        />
                      ) : (
                        <Ionicons 
                          name={iconData.icon as any} 
                          size={14} 
                          color={iconData.color} 
                        />
                      )}
                    </View>
                  );
                })}
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
