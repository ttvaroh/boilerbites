import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import BackgroundTemplate from "../../components/BackgroundTemplate";
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

export default function MissingNutritionPage() {
  const { itemId, date } = useLocalSearchParams<{ itemId: string; date?: string }>();
  const router = useRouter();
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
          router.back();
          return;
        }

        if (!data) {
          router.back();
          return;
        }

        setItem(data);
      } catch (error) {
        console.error('Error fetching item:', error);
        router.back();
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
      <BackgroundTemplate>
        <View className="flex-1 justify-center items-center">
          <Text className="text-white text-lg font-sora">Loading item info...</Text>
        </View>
      </BackgroundTemplate>
    );
  }

  // If no item found, return null (navigation handled in useEffect)
  if (!item) {
    return null;
  }

  const handleRequestNutrition = () => {
    // Navigate to contact support screen with pre-filled subject
    const subject = `Nutrition Information Request: ${item.name}`;
    router.push({
      pathname: "/contact-support-screen",
      params: { 
        subject: subject,
        message: `I would like to request nutrition information for the following menu item:\n\nItem: ${item.name}\n\nPlease add complete nutritional data including calories, protein, carbs, fat, and other relevant nutritional information.`
      }
    });
  };

  return (
    <BackgroundTemplate paddingBottom={40}>
      <View className="flex-1">
        {/* Header */}
        <View className="bg-transparent pt-14 pb-6 px-6">
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="flex-row items-center"
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
          </View>
          <Text className="text-white text-2xl font-sora-bold text-center">
            Missing Nutrition
          </Text>
        </View>

        {/* Main Content */}
        <View className="flex-1 px-6">
          <View className="bg-gray-800 rounded-xl p-6 mt-4 mb-6 flex-1 justify-center shadow-lg"
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
            {/* Icon */}
            <View className="items-center mb-6">
              <View className="bg-gray-700 rounded-full p-6">
                <Ionicons name="nutrition-outline" size={48} color="#CFB991" />
              </View>
            </View>

            {/* Item Name */}
            <Text className="text-white text-xl font-sora-bold text-center mb-4">
              {item.name}
            </Text>

            {/* Missing Info Message */}
            <Text className="text-gray-300 text-base font-sora text-center mb-8 leading-6">
              Nutrition information is not available for this item. We're working
              to add complete nutritional data for all menu items.
            </Text>

            {/* Dietary Information (if available) */}
            {(item.vegetarian ||
              item.vegan ||
              item.gluten ||
              (item.allergens && item.allergens.length > 0)) && (
              <View className="mb-8">
                <Text className="text-white text-lg font-sora-bold mb-4 text-center">
                  Available Information
                </Text>

                <View className="space-y-2">
                  {item.vegetarian && (
                    <View className="flex-row items-center justify-center">
                      <Ionicons name="leaf" size={16} color="#10B981" />
                      <Text className="text-green-400 text-sm font-sora ml-2">
                        Vegetarian
                      </Text>
                    </View>
                  )}

                  {item.vegan && (
                    <View className="flex-row items-center justify-center">
                      <Ionicons name="leaf" size={16} color="#10B981" />
                      <Text className="text-green-400 text-sm font-sora ml-2">
                        Vegan
                      </Text>
                    </View>
                  )}

                  {item.gluten && (
                    <View className="flex-row items-center justify-center">
                      <Ionicons name="warning" size={16} color="#EF4444" />
                      <Text className="text-red-400 text-sm font-sora ml-2">
                        Contains Gluten
                      </Text>
                    </View>
                  )}

                  {item.allergens && item.allergens.length > 0 && (
                    <View className="flex-row items-center justify-center">
                      <Ionicons name="warning" size={16} color="#EF4444" />
                      <Text className="text-red-400 text-sm font-sora ml-2">
                        Allergens: {item.allergens.map(allergen => 
                          allergen === 'Milk' ? 'Dairy' : allergen
                        ).join(", ")}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Request Button */}
            <TouchableOpacity
              onPress={handleRequestNutrition}
              className="bg-purdueGold rounded-lg py-4"
              style={{
                shadowColor: "#CFB991",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <Text className="text-white text-lg font-sora-bold text-center">
                Request Nutrition Info
              </Text>
            </TouchableOpacity>

            {/* Help Text */}
            <Text className="text-gray-400 text-sm font-sora text-center mt-4">
              Help us improve by requesting nutrition information for this item
            </Text>
        </View>
        </View>
      </View>
    </BackgroundTemplate>
  );
}
