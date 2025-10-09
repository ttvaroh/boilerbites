import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface NutritionFactsProps {
  item: {
    calories?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
    fiber_g?: number;
    sugar_g?: number;
    sodium_mg?: number;
  };
  servingCount: number;
}

export default function NutritionFacts({ item, servingCount }: NutritionFactsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatNutrientValue = (
    value: number | undefined,
    unit: string
  ): string => {
    if (value === undefined || value === null) return "0" + unit;
    return (value * servingCount).toFixed(0) + unit;
  };

  const formatNutrientValueWithDecimal = (
    value: number | undefined,
    unit: string
  ): string => {
    if (value === undefined || value === null) return "0" + unit;
    return (value * servingCount).toFixed(1) + unit;
  };

  return (
    <View className="bg-gray-800 rounded-xl p-4 mb-4"
      style={{
        shadowColor: "#CFB991",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        borderWidth: 1,
        borderColor: "rgba(207, 185, 145, 0.2)",
      }}
    >
      {/* Header */}
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        className="flex-row items-center justify-between"
      >
        <Text className="text-white text-lg font-sora-bold">Nutrition Facts</Text>
        <Ionicons
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={20}
          color="white"
        />
      </TouchableOpacity>

      {isExpanded && (
        <View className="mt-4">
          {/* Calories */}
          <View className="flex-row justify-between items-center py-3 border-b border-gray-600">
            <Text className="text-white text-base font-sora-bold">
              Calories
            </Text>
            <Text className="text-purdueGold text-2xl font-sora-bold">
              {formatNutrientValue(item.calories, "")}
            </Text>
          </View>

          {/* Total Fat */}
          <View className="flex-row justify-between items-center py-3 border-b border-gray-600">
            <Text className="text-white text-base font-sora">Total Fat</Text>
            <Text className="text-white text-base font-sora">
              {formatNutrientValueWithDecimal(item.fat_g, "g")}
            </Text>
          </View>

          {/* Saturated Fat */}
          <View className="flex-row justify-between items-center py-2 border-b border-gray-600 ml-4">
            <Text className="text-gray-300 text-sm font-sora">
              Saturated Fat
            </Text>
            <Text className="text-white text-sm font-sora">
              {formatNutrientValueWithDecimal(
                item.fat_g ? item.fat_g * 0.3 : 0,
                "g"
              )}
            </Text>
          </View>

          {/* Cholesterol */}
          <View className="flex-row justify-between items-center py-3 border-b border-gray-600">
            <Text className="text-white text-base font-sora">Cholesterol</Text>
            <Text className="text-white text-base font-sora">
              {formatNutrientValue(
                item.sodium_mg ? item.sodium_mg * 0.1 : 0,
                "mg"
              )}
            </Text>
          </View>

          {/* Sodium */}
          <View className="flex-row justify-between items-center py-3 border-b border-gray-600">
            <Text className="text-white text-base font-sora">Sodium</Text>
            <Text className="text-white text-base font-sora">
              {formatNutrientValue(item.sodium_mg, "mg")}
            </Text>
          </View>

          {/* Total Carbohydrate */}
          <View className="flex-row justify-between items-center py-3 border-b border-gray-600">
            <Text className="text-white text-base font-sora">
              Total Carbohydrate
            </Text>
            <Text className="text-white text-base font-sora">
              {formatNutrientValueWithDecimal(item.carbs_g, "g")}
            </Text>
          </View>

          {/* Dietary Fiber */}
          <View className="flex-row justify-between items-center py-2 border-b border-gray-600 ml-4">
            <Text className="text-gray-300 text-sm font-sora">
              Dietary Fiber
            </Text>
            <Text className="text-white text-sm font-sora">
              {formatNutrientValueWithDecimal(item.fiber_g, "g")}
            </Text>
          </View>

          {/* Sugars */}
          <View className="flex-row justify-between items-center py-2 border-b border-gray-600 ml-4">
            <Text className="text-gray-300 text-sm font-sora">Sugars</Text>
            <Text className="text-white text-sm font-sora">
              {formatNutrientValueWithDecimal(item.sugar_g, "g")}
            </Text>
          </View>

          {/* Protein */}
          <View className="flex-row justify-between items-center py-3">
            <Text className="text-white text-base font-sora">Protein</Text>
            <Text className="text-white text-base font-sora">
              {formatNutrientValueWithDecimal(item.protein_g, "g")}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
