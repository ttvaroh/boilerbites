import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { supabase } from "../lib/supabase";

// Map database allergen names to UI-friendly names
const mapAllergensForDisplay = (allergens: string[]): string[] => {
  return allergens.map(allergen => {
    switch (allergen) {
      case 'Milk':
        return 'Dairy';
      default:
        return allergen;
    }
  });
};

interface IngredientsAndAllergensProps {
  itemId: string;
  allergens?: string[];
}

export default function IngredientsAndAllergens({
  itemId,
  allergens = [],
}: IngredientsAndAllergensProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [ingredients, setIngredients] = useState<string | null>(null);
  const [loadingIngredients, setLoadingIngredients] = useState(false);

  // Load ingredients when component mounts
  useEffect(() => {
    if (!ingredients && !loadingIngredients) {
      loadIngredients();
    }
  }, []);

  const loadIngredients = async () => {
    setLoadingIngredients(true);
    try {
      const { data, error } = await supabase
        .from("item")
        .select("ingredients")
        .eq("id", itemId)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle no rows gracefully

      if (error) {
        // PGRST116 means no rows found, which is fine - just means no ingredients
        if (error.code !== 'PGRST116') {
          console.error("Error loading ingredients:", error);
        }
        setIngredients(null);
      } else {
        setIngredients(data?.ingredients || null);
      }
    } catch (error) {
      console.error("Error loading ingredients:", error);
      setIngredients(null);
    } finally {
      setLoadingIngredients(false);
    }
  };

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
        <Text className="text-white text-lg font-sora-bold">Allergens & Ingredients</Text>
        <Ionicons
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={20}
          color="white"
        />
      </TouchableOpacity>

      {isExpanded && (
        <View className="mt-4">
          {/* Allergens Section */}
          <View className="mb-4">
            <Text className="text-white text-base font-sora-bold mb-3">
              Allergens
            </Text>
            {allergens && allergens.length > 0 ? (
              <View className="flex-row flex-wrap">
                {mapAllergensForDisplay(allergens).map((allergen, index) => (
                  <View
                    key={index}
                    className="bg-red-500 rounded-full px-3 py-1 mr-2 mb-2"
                  >
                    <Text className="text-white text-xs font-sora">
                      {allergen}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View className="bg-red-500 rounded-full px-3 py-1 self-start">
                <Text className="text-white text-xs font-sora">
                  None
                </Text>
              </View>
            )}
          </View>

          {/* Separator */}
          <View className="border-b border-gray-600 mb-4" />

          {/* Ingredients Section */}
          <View>
            <Text className="text-white text-base font-sora-bold mb-3">
              Ingredients
            </Text>
            {loadingIngredients ? (
              <Text className="text-gray-300 text-sm font-sora text-center">
                Loading ingredients...
              </Text>
            ) : ingredients ? (
              <Text className="text-gray-300 text-sm font-sora leading-6">
                {ingredients}
              </Text>
            ) : (
              <Text className="text-gray-400 text-sm font-sora text-center">
                No ingredients available
              </Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}
