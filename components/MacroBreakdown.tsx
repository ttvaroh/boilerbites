import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface MacroBreakdownProps {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  servingCount?: number;
}

export default function MacroBreakdown({
  calories,
  protein_g,
  carbs_g,
  fat_g,
  servingCount = 1,
}: MacroBreakdownProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Calculate values based on serving count
  const totalCalories = Math.round(calories * servingCount);
  const totalProtein = protein_g * servingCount;
  const totalCarbs = carbs_g * servingCount;
  const totalFat = fat_g * servingCount;

  // Calculate percentages
  const proteinCalories = totalProtein * 4; // 4 calories per gram of protein
  const carbCalories = totalCarbs * 4; // 4 calories per gram of carbs
  const fatCalories = totalFat * 9; // 9 calories per gram of fat
  const totalMacroCalories = proteinCalories + carbCalories + fatCalories;

  const proteinPercentage = totalMacroCalories > 0 ? (proteinCalories / totalMacroCalories) * 100 : 0;
  const carbPercentage = totalMacroCalories > 0 ? (carbCalories / totalMacroCalories) * 100 : 0;
  const fatPercentage = totalMacroCalories > 0 ? (fatCalories / totalMacroCalories) * 100 : 0;

  // SVG circle properties
  const radius = 45;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  
  // Calculate stroke dash arrays for each macro
  const proteinDashArray = `${(proteinPercentage / 100) * circumference} ${circumference}`;
  const carbDashArray = `${(carbPercentage / 100) * circumference} ${circumference}`;
  const fatDashArray = `${(fatPercentage / 100) * circumference} ${circumference}`;

  // Calculate stroke dash offsets
  const proteinDashOffset = 0;
  const carbDashOffset = -(proteinPercentage / 100) * circumference;
  const fatDashOffset = -((proteinPercentage + carbPercentage) / 100) * circumference;

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
        <Text className="text-white text-lg font-sora-bold">Energy Summary</Text>
        <Ionicons
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={20}
          color="white"
        />
      </TouchableOpacity>

      {isExpanded && (
        <View className="flex-row items-center mt-4">
          {/* Circular Chart with Segments */}
          <View className="items-center mr-6">
            <View className="relative">
              <Svg width={110} height={110}>
                {/* Background circle */}
                <Circle
                  cx={55}
                  cy={55}
                  r={radius}
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth={strokeWidth}
                  fill="none"
                />
                {/* Protein segment (green) */}
                <Circle
                  cx={55}
                  cy={55}
                  r={radius}
                  stroke="#10B981"
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={proteinDashArray}
                  strokeDashoffset={proteinDashOffset}
                  strokeLinecap="round"
                  transform={`rotate(-90 55 55)`}
                />
                {/* Carbs segment (light blue) */}
                <Circle
                  cx={55}
                  cy={55}
                  r={radius}
                  stroke="#3B82F6"
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={carbDashArray}
                  strokeDashoffset={carbDashOffset}
                  strokeLinecap="round"
                  transform={`rotate(-90 55 55)`}
                />
                {/* Fat segment (orange) */}
                <Circle
                  cx={55}
                  cy={55}
                  r={radius}
                  stroke="#F97316"
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={fatDashArray}
                  strokeDashoffset={fatDashOffset}
                  strokeLinecap="round"
                  transform={`rotate(-90 55 55)`}
                />
              </Svg>
              
              {/* Center text */}
              <View className="absolute inset-0 items-center justify-center">
                <Text className="text-white text-2xl font-sora-bold">
                  {totalCalories}
                </Text>
                <Text className="text-gray-300 text-sm font-sora">
                  kcal
                </Text>
              </View>
            </View>
          </View>

          {/* Macro breakdown list */}
          <View className="flex-1">
            {/* Protein */}
            <View className="flex-row items-center mb-2">
              <View className="w-3 h-3 rounded-full bg-green-500 mr-3" />
              <Text className="text-green-400 text-sm font-sora flex-1">
                Protein ({proteinPercentage.toFixed(0)}%) - {totalProtein.toFixed(1)}g
              </Text>
            </View>

            {/* Net Carbs */}
            <View className="flex-row items-center mb-2">
              <View className="w-3 h-3 rounded-full bg-blue-500 mr-3" />
              <Text className="text-blue-400 text-sm font-sora flex-1">
                Net Carbs ({carbPercentage.toFixed(0)}%) - {totalCarbs.toFixed(1)}g
              </Text>
            </View>

            {/* Fat */}
            <View className="flex-row items-center">
              <View className="w-3 h-3 rounded-full bg-orange-500 mr-3" />
              <Text className="text-orange-400 text-sm font-sora flex-1">
                Fat ({fatPercentage.toFixed(0)}%) - {totalFat.toFixed(1)}g
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
