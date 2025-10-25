import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import { formatDateDisplay, formatMealTime } from "../lib/timezone-utils";

interface MealNavigationHeaderProps {
  mealName: string;
  startTime: string;
  endTime: string;
  date: string;
  canNavigatePrev: boolean;
  canNavigateNext: boolean;
  onNavigate: (direction: 'prev' | 'next') => void;
}

export default function MealNavigationHeader({
  mealName,
  startTime,
  endTime,
  date,
  canNavigatePrev,
  canNavigateNext,
  onNavigate
}: MealNavigationHeaderProps) {
  return (
    <View className="flex-row items-center justify-between py-4 border-b border-gray-600">
      <TouchableOpacity
        onPress={() => onNavigate('prev')}
        disabled={!canNavigatePrev}
        className={`p-2 ${!canNavigatePrev ? "opacity-30" : ""}`}
      >
        <Ionicons name="chevron-back" size={24} color="white" />
      </TouchableOpacity>

      <View className="flex-1 items-center">
        <Text className="text-white text-lg font-sora-bold">
          {mealName}
        </Text>
        <Text className="text-gray-300 text-sm font-sora">
          {startTime === '-' ? '-' : formatMealTime(startTime, endTime)}
        </Text>
        <Text className="text-gray-400 text-xs font-sora mt-1">
          {formatDateDisplay(date)}
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => onNavigate('next')}
        disabled={!canNavigateNext}
        className={`p-2 ${!canNavigateNext ? "opacity-30" : ""}`}
      >
        <Ionicons name="chevron-forward" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
}