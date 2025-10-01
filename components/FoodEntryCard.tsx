import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";

interface FoodEntry {
  id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meal_name: number; // 0=uncategorized, 1=breakfast, 2=lunch, 3=dinner, 4=snack
  created_at: string;
}

interface FoodEntryCardProps {
  entry: FoodEntry;
  onRemove?: (entryId: string) => void;
}

const mealIcons = {
  0: "help-circle-outline", // uncategorized
  1: "sunny-outline", // breakfast
  2: "restaurant-outline", // lunch
  3: "moon-outline", // dinner
  4: "nutrition-outline", // snack
};

const mealNames = {
  0: "Uncategorized",
  1: "Breakfast",
  2: "Lunch", 
  3: "Dinner",
  4: "Snack",
};

export default function FoodEntryCard({ entry, onRemove }: FoodEntryCardProps) {
  const mealIcon = mealIcons[entry.meal_name as keyof typeof mealIcons] || "help-circle-outline";
  const mealName = mealNames[entry.meal_name as keyof typeof mealNames] || "Uncategorized";
  
  const translateX = useSharedValue(0);
  const SWIPE_THRESHOLD = -80; // Minimum swipe distance to trigger delete

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Only allow swiping left (negative values)
      if (event.translationX < 0) {
        translateX.value = event.translationX;
      }
    })
    .onEnd((event) => {
      if (event.translationX < SWIPE_THRESHOLD) {
        // Swipe threshold reached, trigger delete
        if (onRemove) {
          runOnJS(onRemove)(entry.id);
        }
        translateX.value = withSpring(0);
      } else {
        // Snap back to original position
        translateX.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const deleteButtonStyle = useAnimatedStyle(() => {
    return {
      opacity: translateX.value < -20 ? 1 : 0,
      transform: [{ translateX: translateX.value + 100 }], // Offset to stay in view
    };
  });

  return (
    <View className="mb-3" style={{ position: 'relative' }}>
      {/* Delete Button Background */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 100,
            backgroundColor: '#FF5722',
            borderRadius: 12,
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1,
          },
          deleteButtonStyle,
        ]}
      >
        <Ionicons name="trash" size={24} color="white" />
      </Animated.View>

      {/* Main Card */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            {
              backgroundColor: '#1F2937',
              borderRadius: 12,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              shadowColor: "#CFB991",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 5,
              borderWidth: 1,
              borderColor: "rgba(207, 185, 145, 0.2)",
              zIndex: 2,
            },
            animatedStyle,
          ]}
        >
          {/* Meal Icon */}
          <View className="bg-purdueGold rounded-full w-10 h-10 items-center justify-center mr-4">
            <Ionicons name={mealIcon as any} size={20} color="#0d0d0d" />
          </View>

          {/* Food Info */}
          <View className="flex-1">
            <Text className="text-white text-base font-sora-semibold">
              {entry.item_name}
            </Text>
            <Text className="text-gray-300 text-sm font-sora">
              {mealName} • {entry.quantity} serving{entry.quantity !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* Calories */}
          <Text className="text-white text-sm font-sora">
            {Math.round(entry.calories)} kcal
          </Text>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
