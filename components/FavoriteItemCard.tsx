import { FontAwesome6, Ionicons, MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { getTodayDateString, getDateStringFromToday, createLocalDateFromString } from "../lib/timezone-utils";

interface FavoriteItem {
  id: string;
  originalItemId?: string;
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
  last_verified?: string;
  ingredients?: string;
  is_collection?: boolean;
  favorited_at: string;
  is_available_today?: boolean;
  available_locations?: string[];
  available_meals?: string[];
  available_dates?: string[];
}

interface FavoriteItemCardProps {
  item: FavoriteItem;
  showAvailability?: boolean;
  showLocation?: boolean;
  showMeals?: boolean;
  showDates?: boolean;
  showMealTimes?: boolean;
}

export default function FavoriteItemCard({ 
  item, 
  showAvailability = true, 
  showLocation = true, 
  showMeals = true,
  showDates = false,
  showMealTimes = false
}: FavoriteItemCardProps) {

  const formatDate = (dateString: string) => {
    // dateString is YYYY-MM-DD; compare as strings in local timezone
    const todayStr = getTodayDateString();
    const tomorrowStr = getDateStringFromToday(1);

    if (dateString === todayStr) {
      return 'Today';
    } else if (dateString === tomorrowStr) {
      return 'Tomorrow';
    } else {
      const date = createLocalDateFromString(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    }
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
    <View className="bg-gray-800 rounded-xl p-4 mb-3 shadow-lg">
      {/* Upper Section - Name and Dietary Icons */}
      <View className="flex-row items-center justify-between mb-3">
        {/* Item Name */}
        <Text className="text-white text-xl font-sora-bold flex-1">
          {item.name || "Unknown Item"}
        </Text>
        
        {/* Dietary Icons */}
        {dietaryIcons.length > 0 && (
          <View className="flex-row">
            {dietaryIcons.map((iconData, index) => {
              return (
                <View 
                  key={index} 
                  className="w-6 h-6 rounded-full bg-gray-700 items-center justify-center ml-2"
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

      {/* Lower Section - Availability and Location/Dates */}
      <View className="flex-row items-center justify-between">
        {/* Left - Availability Status */}
        {showAvailability && (
          <View className="flex-row items-center">
            {item.is_available_today ? (
              <View className="flex-row items-center">
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text className="text-green-400 text-sm font-sora-semibold ml-1">
                  Available Today
                </Text>
              </View>
            ) : item.available_dates && item.available_dates.length > 0 ? (
              <View className="flex-row items-center">
                <Ionicons name="calendar-outline" size={16} color="#CFB991" />
                <Text className="text-purdueGold text-sm font-sora-semibold ml-1">
                  Available {formatDate(item.available_dates[0])}
                </Text>
              </View>
            ) : (
              <View className="flex-row items-center">
                <Ionicons name="time-outline" size={16} color="#9CA3AF" />
                <Text className="text-gray-400 text-sm font-sora ml-1">
                  Not Available
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Right - Location and Meal Times */}
        <View className="items-end">
          {/* Location */}
          {showLocation && item.available_locations && item.available_locations.length > 0 && (
            <View className="flex-row items-center mb-1">
              <Ionicons name="location-outline" size={12} color="#CFB991" />
              <Text className="text-purdueGold text-xs font-sora ml-1">
                {item.available_locations.join(", ")}
              </Text>
            </View>
          )}

          {/* Meal Times */}
          {showMealTimes && item.available_meals && item.available_meals.length > 0 && (
            <View className="flex-row items-center">
              <Ionicons name="time-outline" size={12} color="#9CA3AF" />
              <Text className="text-gray-400 text-xs font-sora ml-1">
                {item.available_meals.join(", ")}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Collection indicator */}
      {item.is_collection && (
        <View className="mt-3 pt-3 border-t border-gray-600">
          <View className="flex-row items-center justify-center">
            <Ionicons name="folder" size={16} color="#CFB991" />
            <Text className="text-purdueGold text-sm font-sora ml-1">
              Collection
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
