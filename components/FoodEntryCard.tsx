import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

interface FoodEntry {
  id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meal_name: number;
  created_at: string;
}

interface FoodEntryCardProps {
  entry: FoodEntry;
  onRemove?: (entryId: string) => void;
}

const mealIcons = {
  0: "help-circle-outline",
  1: "sunny-outline",
  2: "restaurant-outline",
  3: "moon-outline",
  4: "nutrition-outline",
};

const mealNames = {
  0: "Uncategorized",
  1: "Breakfast",
  2: "Lunch",
  3: "Dinner",
  4: "Snack",
};

const DELETE_BUTTON_WIDTH = 80;
const FULL_SWIPE_THRESHOLD = -150;

export default function FoodEntryCard({ entry, onRemove }: FoodEntryCardProps) {
  const mealIcon = mealIcons[entry.meal_name as keyof typeof mealIcons] || "help-circle-outline";
  const mealName = mealNames[entry.meal_name as keyof typeof mealNames] || "Uncategorized";
  
  const translateX = useSharedValue(0);
  const itemHeight = useSharedValue(0); // Will be set dynamically

  const handleCardLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    itemHeight.value = height;
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      // Only allow swiping left (negative values)
      const newTranslateX = Math.min(0, event.translationX);
      // Cap at full swipe threshold
      translateX.value = Math.max(FULL_SWIPE_THRESHOLD, newTranslateX);
    })
    .onEnd((event) => {
      const velocity = event.velocityX;
      
      // Full swipe - auto delete
      if (translateX.value <= FULL_SWIPE_THRESHOLD || velocity < -500) {
        translateX.value = withTiming(-500, { duration: 200 });
        itemHeight.value = withTiming(0, { duration: 300 }, (finished) => {
          if (finished && onRemove) {
            // Call onRemove on the JS thread after animation completes
            scheduleOnRN(onRemove, entry.id);
          }
        });
      }
      // Partial swipe - show delete button
      else if (translateX.value < -DELETE_BUTTON_WIDTH / 2) {
        translateX.value = withSpring(-DELETE_BUTTON_WIDTH, {
          damping: 20,
          stiffness: 300,
        });
      }
      // Not enough swipe - snap back
      else {
        translateX.value = withSpring(0, {
          damping: 20,
          stiffness: 300,
        });
      }
    });

  const handleDeletePress = () => {
    translateX.value = withTiming(-500, { duration: 200 });
    itemHeight.value = withTiming(0, { duration: 300 }, (finished) => {
      if (finished && onRemove) {
        scheduleOnRN(onRemove, entry.id);
      }
    });
  };

  const animatedCardStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const animatedDeleteStyle = useAnimatedStyle(() => {
    const opacity = translateX.value < -20 ? 1 : 0;
    return {
      opacity: withTiming(opacity, { duration: 150 }),
    };
  });

  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      height: itemHeight.value,
      marginBottom: itemHeight.value > 0 ? 12 : 0,
      opacity: itemHeight.value > 0 ? 1 : 0,
    };
  });

  const animatedDeleteButtonStyle = useAnimatedStyle(() => {
    return {
      height: itemHeight.value, // Dynamic height to match the actual card
    };
  });

  return (
    <Animated.View style={[{ overflow: 'hidden' }, animatedContainerStyle]}>
      {/* Delete Button - Behind the card */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            right: 0,
            top: 0,
            width: DELETE_BUTTON_WIDTH,
            justifyContent: 'center',
            alignItems: 'center',
          },
          animatedDeleteButtonStyle
        ]}
      >
        <Animated.View style={[animatedDeleteStyle, { width: '100%', height: '100%' }]}>
          <TouchableOpacity
            onPress={handleDeletePress}
            className="bg-red-600 rounded-xl h-full w-full items-center justify-center"
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={24} color="white" />
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      {/* Main Card - Swipeable */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[animatedCardStyle]}
          className="bg-gray-800 rounded-xl p-4 flex-row items-center border border-gray-700"
          onLayout={handleCardLayout}
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
            <Text className="text-gray-400 text-sm font-sora">
              {mealName} • {entry.quantity} serving{entry.quantity !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* Calories */}
          <Text className="text-white text-sm font-sora">
            {Math.round(entry.calories)} kcal
          </Text>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}