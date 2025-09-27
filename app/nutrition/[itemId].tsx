import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
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
  const [servingCount, setServingCount] = useState("1");
  const [item, setItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);

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

  const handleAddToTracker = () => {
    console.log(
      `Add to Tracker clicked for ${item.name} with ${servingCount} servings`
    );
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
            <Text className="text-white text-xl font-sora-bold mb-2">
              {item.name}
            </Text>
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
