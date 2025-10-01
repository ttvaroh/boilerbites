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

export default function NutritionPage() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const router = useRouter();
  const { user, toggleFavorite, addFoodEntry } = useAuth();
  const [servingCount, setServingCount] = useState("1");
  const [item, setItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  // Check if item is already favorited
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (!user || !item?.id) return;

      try {
        const { data: favorites, error } = await supabase
          .from('favorite_item')
          .select('id')
          .eq('user_id', user.id)
          .eq('item_id', item.id)
          .single();

        if (!error && favorites) {
          setIsFavorited(true);
        }
      } catch (error) {
        console.error('Error checking favorite status:', error);
      }
    };

    checkFavoriteStatus();
  }, [user, item?.id]);

  // Fetch item data directly from Supabase
  useEffect(() => {
    const fetchItem = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('item')
          .select('*')
          .eq('id', itemId)
          .single();

        if (error) {
          console.error('Error fetching item:', error);
          router.replace(`/missing-nutrition/${itemId}`);
          return;
        }

        if (!data || !data.serving_size) {
          router.replace(`/missing-nutrition/${itemId}`);
          return;
        }

        setItem(data);
      } catch (error) {
        console.error('Error fetching item:', error);
        router.replace(`/missing-nutrition/${itemId}`);
      } finally {
        setLoading(false);
      }
    };

    if (itemId) {
      fetchItem();
    }
  }, [itemId, router]);

  // Show loading state
  if (loading) {
    return (
      <BackgroundTemplate paddingBottom={40}>
        <View className="flex-1 justify-center items-center">
          <Text className="text-white text-lg font-sora">Loading nutrition info...</Text>
        </View>
      </BackgroundTemplate>
    );
  }

  // If no item found, return null (navigation handled in useEffect)
  if (!item) {
    return null;
  }

  const servingCountNum = parseFloat(servingCount) || 1;

  const handleAddToTracker = async () => {
    if (!user) {
      Alert.alert(
        "Login Required",
        "You need to be logged in to add items to your food tracker.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign In", onPress: () => router.push("/signin") }
        ]
      );
      return;
    }

    if (!item?.id) return;

    try {
      const servingCountNum = parseFloat(servingCount) || 1;
      const { error } = await addFoodEntry({
        item_id: item.id,
        quantity: servingCountNum,
        created_at: new Date().toISOString(),
        meal_name: 0, // Default to uncategorized
      });

      if (error) {
        Alert.alert("Error", "Failed to add item to tracker. Please try again.");
        console.error("Add food entry error:", error);
        return;
      }

      Alert.alert(
        "Success",
        `Added ${servingCount} serving${servingCountNum !== 1 ? 's' : ''} of ${item.name} to your food tracker!`,
        [{ text: "OK" }]
      );
    } catch (error) {
      Alert.alert("Error", "Failed to add item to tracker. Please try again.");
      console.error("Add food entry error:", error);
    }
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
            Nutrition Facts
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
            Add to Tracker
          </Text>
        </TouchableOpacity>
      </View>
    </BackgroundTemplate>
  );
}
