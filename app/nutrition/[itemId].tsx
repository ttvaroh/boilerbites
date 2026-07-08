import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import BackgroundTemplate from "../../components/BackgroundTemplate";
import IngredientsAndAllergens from "../../components/IngredientsAndAllergens";
import MacroBreakdown from "../../components/MacroBreakdown";
import NutritionFacts from "../../components/NutritionFacts";
import { useAuth } from "../../contexts/AuthContext";
import { useNutritionCache } from "../../contexts/NutritionCacheContext";
import { useToast } from "../../contexts/ToastContext";
import { ITEM_SELECT_COLUMNS_WITH_INGREDIENTS } from "../../lib/itemSelectColumns";
import { supabase } from "../../lib/supabase";
import {
  createLocalDateFromString,
  getTodayDateString,
} from "../../lib/timezone-utils";

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
  last_verified?: string;
  ingredients?: string;
  is_collection?: boolean;
  user_id?: string | null;
}

export default function NutritionPage() {
  const params = useLocalSearchParams<{
    itemId: string | string[];
    date?: string;
    source?: string;
  }>();
  const router = useRouter();
  const { user, toggleFavorite, addFoodEntry } = useAuth();
  const { clearNutritionData } = useNutritionCache();
  const { showToast } = useToast();

  // Handle itemId which might be an array (expo-router sometimes returns arrays)
  const itemId = Array.isArray(params.itemId)
    ? params.itemId[0]
    : params.itemId;
  const date = Array.isArray(params.date) ? params.date[0] : params.date;
  const source = Array.isArray(params.source)
    ? params.source[0]
    : params.source;
  const initialDateParam = date;

  // Check if this is a FatSecret item
  const isFatSecretItem =
    source === "fatsecret" ||
    (itemId && typeof itemId === "string" && itemId.startsWith("fatsecret_"));
  const [servingCount, setServingCount] = useState("1");
  const [selectedMeal, setSelectedMeal] = useState(0); // 0 = uncategorized, 1 = breakfast, 2 = lunch, 3 = dinner, 4 = snack
  const [item, setItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  // Parse initial date parameter
  const initialDate = React.useMemo(() => {
    if (initialDateParam) {
      try {
        return createLocalDateFromString(initialDateParam);
      } catch {
        return new Date();
      }
    }
    return new Date();
  }, [initialDateParam]);

  // Internal date state for navigation
  const [selectedDate, setSelectedDate] = useState(initialDate);

  // Update selectedDate when the date param changes
  useEffect(() => {
    setSelectedDate(initialDate);
  }, [initialDate]);

  // Date navigation functions
  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Check if selected date is today
  const isToday = () => {
    const today = new Date();
    return selectedDate.toDateString() === today.toDateString();
  };

  // Format date for display
  const formatDate = (date: Date) => {
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return "Today";
    }
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  // Convert selectedDate to ISO string for food entry
  // Use current time to ensure unique timestamps for proper ordering
  const entryDate = React.useMemo(() => {
    // If the selected date is today, use current time
    // Otherwise, use the selected date at the current time of day
    const now = new Date();
    const isToday = selectedDate.toDateString() === now.toDateString();

    if (isToday) {
      // Use current time for today's entries
      return now.toISOString();
    } else {
      // For past/future dates, preserve the date but use current time
      const dateForEntry = new Date(selectedDate);
      dateForEntry.setHours(
        now.getHours(),
        now.getMinutes(),
        now.getSeconds(),
        now.getMilliseconds(),
      );
      return dateForEntry.toISOString();
    }
  }, [selectedDate]);

  // Check if item is already favorited
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (!user || !item?.id) return;

      try {
        const { data: favorites, error } = await supabase
          .from("favorite_item")
          .select("id")
          .eq("user_id", user.id)
          .eq("item_id", item.id)
          .single();

        if (!error && favorites) {
          setIsFavorited(true);
        }
      } catch (error) {}
    };

    checkFavoriteStatus();
  }, [user, item?.id]);

  // Fetch item data directly from Supabase
  useEffect(() => {
    const fetchItem = async () => {
      // Validate itemId
      if (!itemId || typeof itemId !== "string" || itemId.trim().length === 0) {
        Alert.alert("Error", "Invalid item ID. Please try again.");
        router.back();
        return;
      }

      try {
        setLoading(true);

        // Fetch item from database (Purdue or FatSecret)
        const { data, error } = await supabase
          .from("item")
          .select(ITEM_SELECT_COLUMNS_WITH_INGREDIENTS)
          .eq("id", itemId.trim())
          .single();

        if (error) {
          router.replace(`/missing-nutrition/${itemId}`);
          return;
        }

        if (!data) {
          router.replace(`/missing-nutrition/${itemId}`);
          return;
        }

        // Check if this is a custom meal (is_collection = true AND user_id IS NOT NULL)
        const isCustomMeal = data.is_collection && data.user_id !== null;

        // For custom meals, allow display even without serving_size since they have aggregated nutrition
        // For regular Purdue items, serving_size is required
        // FatSecret items may not have serving_size, so we allow them too
        if (!isCustomMeal && !isFatSecretItem && !data.serving_size) {
          router.replace(`/missing-nutrition/${itemId}`);
          return;
        }

        setItem(data);
      } catch (error) {
        Alert.alert("Error", "Failed to load food item. Please try again.");
        router.back();
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [itemId, router]);

  // Show loading state
  if (loading) {
    return (
      <BackgroundTemplate paddingBottom={40}>
        <View className="flex-1 justify-center items-center">
          <Text className="text-white text-lg font-sora">
            Loading nutrition info...
          </Text>
        </View>
      </BackgroundTemplate>
    );
  }

  // If no item found, return null (navigation handled in useEffect)
  if (!item) {
    return null;
  }

  const servingCountNum = parseFloat(servingCount) || 1;

  // Format date for display in the add button
  const formatDateForDisplay = () => {
    if (isToday()) {
      return "Add to Today";
    } else {
      return `Add to ${selectedDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year:
          selectedDate.getFullYear() !== new Date().getFullYear()
            ? "numeric"
            : undefined,
      })}`;
    }
  };

  const handleAddToTracker = async () => {
    if (!user) {
      Alert.alert(
        "Login Required",
        "You need to be logged in to add items to your food tracker.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign In", onPress: () => router.push("/signin") },
        ],
      );
      return;
    }

    if (!item?.id) return;

    try {
      // Item should already be in database (fetched in useEffect), but double-check for safety
      const servingCountNum = parseFloat(servingCount) || 1;
      const { error } = await addFoodEntry({
        item_id: item.id,
        quantity: servingCountNum,
        created_at: entryDate, // Use the date from search or today
        meal_name: selectedMeal,
        source: isFatSecretItem ? 1 : 0, // 0 = Purdue, 1 = FatSecret
      });

      if (error) {
        showToast("Failed to add item to tracker. Please try again.", "error");
        return;
      }

      // Clear nutrition cache for the entry date to force DailyProgress to refetch
      const entryDateObj = new Date(entryDate);
      const isToday = entryDateObj.toDateString() === new Date().toDateString();
      const dateString = isToday
        ? getTodayDateString()
        : entryDateObj.toISOString().split("T")[0];
      clearNutritionData(dateString);

      // Navigate back immediately, then show success toast on previous screen
      router.back();
      showToast("Item added to your food tracker!", "success");
    } catch (error) {
      showToast("Failed to add item to tracker. Please try again.", "error");
    }
  };

  const handleFavoritePress = async () => {
    if (!user) {
      Alert.alert(
        "Login Required",
        "You need to be logged in to add items to your favorites.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign In", onPress: () => router.push("/signin") },
        ],
      );
      return;
    }

    if (!item?.id) return;

    // Optimistic UI update - change heart immediately
    const previousFavoriteState = isFavorited;
    setIsFavorited(!isFavorited);

    try {
      setFavoriteLoading(true);
      const { error, isFavorited: newFavoriteState } = await toggleFavorite(
        item.id,
      );

      if (error) {
        // Revert the optimistic update on error
        setIsFavorited(previousFavoriteState);
        Alert.alert("Error", "Failed to update favorite. Please try again.");
        return;
      }

      // Update with the actual state from the server
      setIsFavorited(newFavoriteState);
    } catch (error) {
      // Revert the optimistic update on error
      setIsFavorited(previousFavoriteState);
      Alert.alert("Error", "Failed to update favorite. Please try again.");
    } finally {
      setFavoriteLoading(false);
    }
  };

  return (
    <BackgroundTemplate paddingBottom={40}>
      <View className="flex-1">
        {/* Header */}
        <View className="bg-transparent pt-16 pb-2 px-6">
          <View className="flex-row items-center justify-between mb-0">
            <TouchableOpacity
              onPress={() => router.back()}
              className="flex-row items-center"
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
          </View>
          <Text className="text-white text-2xl font-sora-bold text-center">
            Nutrition Facts
          </Text>
        </View>

        {/* Date Selector */}
        <View className="px-6 pb-4">
          <View className="bg-gray-800 rounded-lg px-4 py-3 border border-purdueGold/30">
            <View className="flex-row items-center justify-between">
              <TouchableOpacity onPress={goToPreviousDay} className="p-2 -ml-2">
                <Ionicons name="chevron-back" size={20} color="white" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={goToToday}
                className="flex-1 items-center justify-center"
                style={{ alignItems: "center", justifyContent: "center" }}
              >
                <View className="items-center justify-center">
                  <Text className="text-purdueGold text-base font-sora-semibold text-center">
                    Adding to Diary for
                  </Text>
                  <Text className="text-purdueGold text-base font-sora-semibold text-center">
                    {isToday() ? "Today" : formatDate(selectedDate)}
                  </Text>
                </View>
                {!isToday() && (
                  <Text className="text-xs text-gray-400 mt-1 text-center">
                    Tap to go to today
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={goToNextDay} className="p-2 -mr-2">
                <Ionicons name="chevron-forward" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Main Content */}
        <ScrollView className="flex-1 px-6">
          <View
            className="bg-gray-800 rounded-xl p-6 mt-4 mb-6 shadow-lg"
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
            {/* Product Information */}
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-white text-xl font-sora-bold flex-1 mr-3">
                {item.name}
              </Text>
              <TouchableOpacity
                onPress={handleFavoritePress}
                className="p-2"
                disabled={favoriteLoading}
              >
                <Ionicons
                  name={isFavorited ? "heart" : "heart-outline"}
                  size={24}
                  color={isFavorited ? "#CFB991" : "#9CA3AF"}
                />
              </TouchableOpacity>
            </View>
            {(item.serving_size ||
              (item.is_collection && item.user_id !== null)) && (
              <Text className="text-gray-300 text-sm font-sora mb-2">
                Serving Size: {item.serving_size || "1 meal"}
              </Text>
            )}
            {/* FatSecret Attribution */}
            {isFatSecretItem && (
              <Text className="text-gray-500 text-xs font-sora mb-4">
                Nutrition data provided by FatSecret
              </Text>
            )}

            {/* Number of Servings */}
            <View className="mb-4">
              <Text className="text-white text-base font-sora mb-2">
                Number of Servings
              </Text>
              <View className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-3">
                <TextInput
                  className="text-white text-center text-lg font-sora"
                  value={servingCount}
                  onChangeText={setServingCount}
                  keyboardType="numeric"
                  selectTextOnFocus
                />
              </View>
            </View>

            {/* Meal Selector */}
            <View className="mb-4">
              <Text className="text-white text-base font-sora mb-2">
                Meal Category
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {[
                  { value: 0, label: "Uncategorized" },
                  { value: 1, label: "Breakfast" },
                  { value: 2, label: "Lunch" },
                  { value: 3, label: "Dinner" },
                  { value: 4, label: "Snack" },
                ].map((meal) => (
                  <TouchableOpacity
                    key={meal.value}
                    onPress={() => setSelectedMeal(meal.value)}
                    className={`px-4 py-2 rounded-lg border ${
                      selectedMeal === meal.value
                        ? "bg-purdueGold border-purdueGold"
                        : "bg-gray-700 border-gray-600"
                    }`}
                  >
                    <Text
                      className={`text-sm font-sora ${
                        selectedMeal === meal.value
                          ? "text-black"
                          : "text-white"
                      }`}
                    >
                      {meal.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Macro Breakdown */}
            <MacroBreakdown
              calories={item.calories || 0}
              protein_g={item.protein_g || 0}
              carbs_g={item.carbs_g || 0}
              fat_g={item.fat_g || 0}
              servingCount={servingCountNum}
            />

            {/* Amount Per Serving Component */}
            <NutritionFacts item={item} servingCount={servingCountNum} />

            {/* Allergens and Ingredients Component */}
            <IngredientsAndAllergens
              itemId={item.id}
              allergens={item.allergens}
              ingredients={item.ingredients}
            />
          </View>
        </ScrollView>
      </View>
      <View className="px-6">
        {/* Add to Tracker Button */}
        <TouchableOpacity
          onPress={handleAddToTracker}
          className="bg-purdueGold rounded-lg py-4 mt-6"
          style={{
            shadowColor: "#CFB991",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Text className="text-white text-lg font-sora-bold text-center">
            {formatDateForDisplay()}
          </Text>
        </TouchableOpacity>
      </View>

    </BackgroundTemplate>
  );
}
