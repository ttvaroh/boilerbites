import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
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
  meal_name: number;
  created_at: string;
}

interface FoodEntryCardProps {
  entry: FoodEntry;
  onRemove?: (entryId: string) => void;
  isSwiped?: boolean;
  onSwipeStart?: (entryId: string) => void;
  onSwipeEnd?: () => void;
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

const DELETE_THRESHOLD = -80;
const SPRING_CONFIG = {
  damping: 15,
  stiffness: 150,
};

const FoodEntryCard = React.memo(({ 
  entry, 
  onRemove,
  isSwiped = false,
  onSwipeStart,
  onSwipeEnd,
}: FoodEntryCardProps) => {
  const router = useRouter();
  const mealIcon = mealIcons[entry.meal_name as keyof typeof mealIcons] || "help-circle-outline";
  const mealName = mealNames[entry.meal_name as keyof typeof mealNames] || "Uncategorized";

  // Animated values
  const translateX = useSharedValue(0);
  const itemHeight = useSharedValue(0);
  const opacity = useSharedValue(1);
  const isAnimating = useSharedValue(false);

  // Reset swipe when isSwiped prop changes (when another card is swiped)
  React.useEffect(() => {
    if (!isSwiped && translateX.value < 0) {
      translateX.value = withSpring(0, SPRING_CONFIG);
      if (onSwipeEnd) {
        runOnJS(onSwipeEnd)();
      }
    }
  }, [isSwiped, translateX, onSwipeEnd]);

  // Handle delete action - no confirmation, delete immediately
  const handleDelete = React.useCallback(() => {
    if (!onRemove) return;

    // Animate card out
    isAnimating.value = true;
    opacity.value = withSpring(0, { damping: 20, stiffness: 200 });
    translateX.value = withSpring(translateX.value, { damping: 20, stiffness: 200 });
    
    // After animation, call onRemove
    setTimeout(() => {
      runOnJS(onRemove)(entry.id);
    }, 200);
  }, [onRemove, entry.id, translateX, opacity, isAnimating]);

  // Pan gesture handler
  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10]) // Activate when horizontal movement > 10px
    .failOffsetY([-5, 5]) // Fail if vertical movement > 5px before horizontal
    .onStart(() => {
      if (onSwipeStart) {
        runOnJS(onSwipeStart)(entry.id);
      }
    })
    .onUpdate((event: { translationX: number }) => {
      // Only allow swiping left (negative translateX)
      const newTranslateX = Math.min(0, event.translationX);
      translateX.value = newTranslateX;
    })
    .onEnd((event: { translationX: number }) => {
      // If swiped past threshold, delete immediately
      if (event.translationX < DELETE_THRESHOLD) {
        // Trigger delete immediately
        runOnJS(handleDelete)();
      } else {
        // Otherwise, snap back to original position
        translateX.value = withSpring(0, SPRING_CONFIG);
        // Clear swiped state when card resets
        if (onSwipeEnd) {
          runOnJS(onSwipeEnd)();
        }
      }
    });

  // Tap gesture handler for navigation
  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      // Only navigate if card is not swiped
      if (translateX.value > -40) {
        // If slightly swiped, reset it
        if (translateX.value < 0) {
          translateX.value = withSpring(0, SPRING_CONFIG);
        } else {
          // Navigate to edit page
          router.push(`/edit-food-entry/${entry.id}`);
        }
      }
    });

  // Combined gesture (tap and pan)
  const composedGesture = Gesture.Simultaneous(panGesture, tapGesture);

  // Animated styles for card
  const cardAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      opacity: opacity.value,
    };
  });

  // Animated styles for delete button
  const deleteButtonAnimatedStyle = useAnimatedStyle(() => {
    const deleteOpacity = interpolate(
      translateX.value,
      [0, DELETE_THRESHOLD],
      [0, 1],
      'clamp'
    );
    
    return {
      opacity: deleteOpacity,
    };
  });

  // Measure card height
  const handleLayout = (event: any) => {
    itemHeight.value = event.nativeEvent.layout.height;
  };

  return (
    <View className="mb-2" style={{ overflow: 'hidden' }}>
      {/* Delete Button Background */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 80,
            backgroundColor: '#EF4444',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 12,
          },
          deleteButtonAnimatedStyle,
        ]}
      >
        <Ionicons name="trash-outline" size={24} color="white" />
      </Animated.View>

      {/* Card Content */}
      <GestureDetector gesture={composedGesture}>
        <Animated.View
          onLayout={handleLayout}
          style={cardAnimatedStyle}
          className="bg-gray-800 rounded-xl px-4 py-2 flex-row items-center border border-gray-700"
        >
          {/* Meal Icon */}
          <View className="bg-purdueGold rounded-full w-8 h-8 items-center justify-center mr-4">
            <Ionicons name={mealIcon as any} size={18} color="#0d0d0d" />
          </View>

          {/* Food Info */}
          <View className="flex-1">
            <Text className="text-white text-[.9rem] font-sora-semibold mb-1">
              {entry.item_name.length > 30 ? `${entry.item_name.substring(0, 30)}...` : entry.item_name}
            </Text>
            <Text className="text-gray-400 text-[0.75rem] font-sora">
              {entry.quantity} serving{entry.quantity !== 1 ? 's' : ''} • P: {entry.protein_g.toFixed(1)} • C: {entry.carbs_g.toFixed(1)} • F: {entry.fat_g.toFixed(1)}
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
});

FoodEntryCard.displayName = 'FoodEntryCard';

export default FoodEntryCard;
