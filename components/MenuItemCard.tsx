import React from "react";
import { Text, View } from "react-native";
import DietaryTag from "./DietaryTag";

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
  location_name?: string;
}

interface MenuItemCardProps {
  item: MenuItem;
  showDietaryTag?: boolean;
}

export default function MenuItemCard({ item, showDietaryTag = true }: MenuItemCardProps) {
  const getDietaryTag = () => {
    if (item.vegan) return { text: "Vegan", variant: "vegan" as const };
    if (item.vegetarian) return { text: "Vegetarian", variant: "vegetarian" as const };
    if (item.gluten === false) return { text: "Gluten-Free", variant: "gluten-free" as const };
    // Check if high protein (assuming >20g is high protein) - only if protein data exists
    if (item.protein_g !== undefined && item.protein_g !== null && !isNaN(Number(item.protein_g)) && Number(item.protein_g) > 20) {
      return { text: "High Protein", variant: "high-protein" as const };
    }
    return null;
  };

  const dietaryTag = getDietaryTag();

  return (
    <View className="bg-gray-800 rounded-xl p-4 mb-3 shadow-lg">
      <View className="flex-row">
        {/* Left portion - Main content */}
        <View className="flex-1 mr-3">
          {/* Title and Dietary Tag */}
          <View className="flex-row items-center mb-1">
            <Text className="text-white text-xl font-sora-bold flex-1 mr-3">
              {item.name || "Unknown Item"}
            </Text>
            {/* Dietary Tag */}
            {showDietaryTag && dietaryTag && (
              <DietaryTag text={dietaryTag.text} variant={dietaryTag.variant} />
            )}
          </View>

          {/* Location Information */}
          {item.location_name && (
            <Text className="text-purdueGold text-sm font-sora mb-2">
              📍 {item.location_name}
            </Text>
          )}

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
