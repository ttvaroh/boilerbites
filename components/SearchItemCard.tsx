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

interface SearchItemCardProps {
  item: MenuItem;
  showDietaryTag?: boolean;
  meals?: string[];
  isCollection?: boolean;
  hideLocation?: boolean;
}

const SearchItemCard = React.memo(({ item, showDietaryTag = true, meals, isCollection = false, hideLocation = false }: SearchItemCardProps) => {
  // Check if location is one of the 5 main dining halls
  const isMainDiningHall = (locationName: string): boolean => {
    const mainDiningHalls = ['Ford', 'Wiley', 'Windsor', 'Earhart', 'Hillenbrand'];
    return mainDiningHalls.includes(locationName);
  };

  // Sort meals in the correct order
  const sortMeals = (meals: string[]): string[] => {
    const mealOrder = ['breakfast', 'brunch', 'lunch', 'late lunch', 'dinner'];
    return meals.sort((a, b) => {
      const aIndex = mealOrder.indexOf(a.toLowerCase());
      const bIndex = mealOrder.indexOf(b.toLowerCase());
      
      // If both meals are in the order list, sort by their position
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      
      // If only one is in the order list, prioritize it
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      
      // If neither is in the order list, maintain original order
      return 0;
    });
  };

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
    <View className="bg-gray-800 rounded-xl p-4 mb-2 shadow-lg">
      <View className="flex-row">
        {/* Left portion - Main content */}
        <View className="flex-1">
          {/* Title */}
          <Text className="text-white text-xl font-sora-bold mb-2">
            {item.name || "Unknown Item"}
          </Text>

          {/* Location and Meals Information */}
          {!hideLocation && item.location_name && (
            <View className="flex-row items-center mb-2">
              {item.location_name && (
                <>
              <Text className="text-purdueGold text-sm font-sora">
                📍 {item.location_name}
              </Text>
                </>
              )}
              {meals && meals.length > 0 && isMainDiningHall(item.location_name || '') && (
                <>
                  <Text className="text-gray-400 text-sm font-sora">  •  </Text>
                  <Text className="text-gray-400 text-sm font-sora">
                    {sortMeals(meals.filter(meal => meal && meal.trim() !== "")).join(", ")}
                  </Text>
                </>
              )}
            </View>
          )}

          {/* Nutritional Information */}
          <View className="flex-row flex-wrap">
            {(() => {
              // Only show nutrition if calories exist and are not 0
              const hasValidCalories = item.calories !== null && Number(item.calories) > 0;
              if (!hasValidCalories) {
                return null;
              }
              
              const nutritionParts = [];
              
              // Always show protein, carbs, and fat if calories are valid
              nutritionParts.push(`P: ${item.protein_g !== undefined && item.protein_g !== null && !isNaN(Number(item.protein_g)) ? Number(item.protein_g).toFixed(1) : '0.0'}g`);
              nutritionParts.push(`C: ${item.carbs_g !== undefined && item.carbs_g !== null && !isNaN(Number(item.carbs_g)) ? Number(item.carbs_g).toFixed(1) : '0.0'}g`);
              nutritionParts.push(`F: ${item.fat_g !== undefined && item.fat_g !== null && !isNaN(Number(item.fat_g)) ? Number(item.fat_g).toFixed(1) : '0.0'}g`);
              
              return (
                <Text className="text-gray-300 text-sm font-sora">
                  {nutritionParts.join('  •  ')}
                </Text>
              );
            })()}
          </View>
        </View>

        {/* Right portion - Dietary Icons, Meals, and Calories */}
        <View className="items-end justify-start" style={{ minWidth: 80 }}>
          {/* Dietary Icons */}
          {showDietaryTag && dietaryIcons.length > 0 && (
            <View className="flex-row mb-2">
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

          {/* Calories */}
          {item.calories !== undefined && item.calories !== null && !isNaN(Number(item.calories)) && (
            <View className="items-end">
              <Text className="text-purdueGold text-2xl font-sora-bold">
                {Math.trunc(Number(item.calories))}
              </Text>
              <Text className="text-gray-400 text-sm font-sora">calories</Text>
            </View>
          )}
        </View>
      </View>

      {/* Collection indicator */}
      {isCollection && (
        <View className="flex-row">
          <Ionicons name="albums-outline" size={16} color="#CFB991" />
          <Text className="text-purdueGold text-sm font-sora ml-1">
            Collection
          </Text>
        </View>
      )}
    </View>
  );
});

export default SearchItemCard;
