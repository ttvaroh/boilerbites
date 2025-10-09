import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
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
import { supabase } from "../../lib/supabase";

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
  ingredients?: string;
}

interface FoodEntry {
  id: string;
  item_id: string;
  quantity: number;
  meal_name: number;
  created_at: string;
}

export default function EditFoodEntryPage() {
  const { entryId } = useLocalSearchParams<{ entryId: string }>();
  const router = useRouter();
  const { user, removeFoodEntry, toggleFavorite } = useAuth();
  const [servingCount, setServingCount] = useState("1");
  const [selectedMeal, setSelectedMeal] = useState(0);
  const [item, setItem] = useState<MenuItem | null>(null);
  const [foodEntry, setFoodEntry] = useState<FoodEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  // Fetch food entry and item data
  useEffect(() => {
    const fetchData = async () => {
      if (!entryId || !user) return;

      try {
        setLoading(true);
        
        // Fetch the food entry
        const { data: entryData, error: entryError } = await supabase
          .from('food_entry')
          .select('*')
          .eq('id', entryId)
          .eq('user_id', user.id)
          .single();

        if (entryError || !entryData) {
          console.error('Error fetching food entry:', entryError);
          Alert.alert("Error", "Food entry not found.");
          router.back();
          return;
        }

        setFoodEntry(entryData);
        setServingCount(entryData.quantity.toString());
        setSelectedMeal(entryData.meal_name);

        // Fetch the item data
        const { data: itemData, error: itemError } = await supabase
          .from('item')
          .select('*')
          .eq('id', entryData.item_id)
          .single();

        if (itemError || !itemData) {
          console.error('Error fetching item:', itemError);
          Alert.alert("Error", "Item not found.");
          router.back();
          return;
        }

        setItem(itemData);

        // Check if item is favorited
        const { data: favorites } = await supabase
          .from('favorite_item')
          .select('id')
          .eq('user_id', user.id)
          .eq('item_id', itemData.id)
          .single();

        if (favorites) {
          setIsFavorited(true);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        Alert.alert("Error", "Failed to load food entry.");
        router.back();
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [entryId, user, router]);

  // Show loading state
  if (loading) {
    return (
      <BackgroundTemplate paddingBottom={40}>
        <View className="flex-1 justify-center items-center">
          <Text className="text-white text-lg font-sora">Loading food entry...</Text>
        </View>
      </BackgroundTemplate>
    );
  }

  // If no data found, return null (navigation handled in useEffect)
  if (!item || !foodEntry) {
    return null;
  }

  const servingCountNum = parseFloat(servingCount) || 1;

  const handleUpdateEntry = async () => {
    if (!user || !foodEntry) return;

    try {
      const { error } = await supabase
        .from('food_entry')
        .update({
          quantity: parseFloat(servingCount) || 1,
          meal_name: selectedMeal,
        })
        .eq('id', foodEntry.id)
        .eq('user_id', user.id);

      if (error) {
        Alert.alert("Error", "Failed to update food entry. Please try again.");
        console.error("Update food entry error:", error);
        return;
      }

      router.back()
    } catch (error) {
      Alert.alert("Error", "Failed to update food entry. Please try again.");
      console.error("Update food entry error:", error);
    }
  };

  const handleRemoveFromDiary = async () => {
    if (!user || !foodEntry) return;

    Alert.alert(
      "Remove from Diary",
      "Are you sure you want to remove this item from your diary?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await removeFoodEntry(foodEntry.id);
              if (error) {
                Alert.alert("Error", "Failed to remove food entry. Please try again.");
                console.error("Remove food entry error:", error);
                return;
              }
              router.back();
            } catch (error) {
              Alert.alert("Error", "Failed to remove food entry. Please try again.");
              console.error("Remove food entry error:", error);
            }
          }
        }
      ]
    );
  };

  const handleFavoritePress = async () => {
    if (!user) {
      Alert.alert(
        "Login Required",
        "You need to be logged in to add items to your favorites.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign In", onPress: () => router.push("/signin") }
        ]
      );
      return;
    }

    if (!item?.id) return;

    // Optimistic UI update - change heart immediately
    const previousFavoriteState = isFavorited;
    setIsFavorited(!isFavorited);

    try {
      setFavoriteLoading(true);
      const { error, isFavorited: newFavoriteState } = await toggleFavorite(item.id);
      
      if (error) {
        // Revert the optimistic update on error
        setIsFavorited(previousFavoriteState);
        Alert.alert("Error", "Failed to update favorite. Please try again.");
        console.error("Favorite toggle error:", error);
        return;
      }

      // Update with the actual state from the server
      setIsFavorited(newFavoriteState);
    } catch (error) {
      // Revert the optimistic update on error
      setIsFavorited(previousFavoriteState);
      Alert.alert("Error", "Failed to update favorite. Please try again.");
      console.error("Favorite toggle error:", error);
    } finally {
      setFavoriteLoading(false);
    }
  };

  return (
    <BackgroundTemplate paddingBottom={40}>
      <View className="flex-1">
        {/* Header */}
        <View className="bg-transparent pt-12 pb-2 px-6">
          <View className="flex-row items-center justify-between mb-0">
            <TouchableOpacity
              onPress={() => router.back()}
              className="flex-row items-center"
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
          </View>
          <Text className="text-white text-2xl font-sora-bold text-center">
            Edit Food Entry
          </Text>
        </View>

        {/* Main Content */}
        <ScrollView className="flex-1 px-6">
          <View className="bg-gray-800 rounded-xl p-6 mt-4 mb-6 shadow-lg"
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
            <Text className="text-gray-300 text-sm font-sora mb-4">
              Serving Size: {item.serving_size}
            </Text>

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
                        selectedMeal === meal.value ? "text-black" : "text-white"
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
            <NutritionFacts
              item={item}
              servingCount={servingCountNum}
            />

            {/* Allergens and Ingredients Component */}
            <IngredientsAndAllergens
              itemId={item.id}
              allergens={item.allergens}
            />
          </View>
        </ScrollView>
      </View>
      
      <View className="px-6">
        {/* Action Buttons */}
        <View className="flex-row gap-3 mt-6">
          {/* Update Button */}
          <TouchableOpacity
            onPress={handleUpdateEntry}
            className="flex-1 bg-purdueGold rounded-lg py-4"
            style={{
              shadowColor: "#CFB991",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Text className="text-black text-lg font-sora-bold text-center">
              Update Entry
            </Text>
          </TouchableOpacity>

          {/* Remove Button */}
          <TouchableOpacity
            onPress={handleRemoveFromDiary}
            className="flex-1 bg-red-600 rounded-lg py-4"
            style={{
              shadowColor: "#DC2626",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Text className="text-white text-lg font-sora-bold text-center">
              Remove from Diary
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </BackgroundTemplate>
  );
}
