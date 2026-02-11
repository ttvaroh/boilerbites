import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
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

/**
 * Format ingredients string for better readability
 * - Removes collection ID prefix if present
 * - Preserves the original structure
 * - Returns formatted string ready for display
 */
const formatIngredients = (ingredients: string | null | undefined): string | null => {
  if (!ingredients || !ingredients.trim()) {
    return null;
  }

  let formatted = ingredients.trim();

  // Remove collection ID prefix if present (format: [COLLECTION_ID:...])
  formatted = formatted.replace(/^\[COLLECTION_ID:[^\]]+\]\s*/i, '');

  return formatted;
};

interface IngredientsAndAllergensProps {
  itemId: string;
  allergens?: string[];
  ingredients?: string | null; // Accept ingredients as prop instead of fetching
}

export default function IngredientsAndAllergens({
  itemId,
  allergens = [],
  ingredients: ingredientsProp,
}: IngredientsAndAllergensProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [fetchedIngredients, setFetchedIngredients] = useState<string | null>(null);
  const [loadingIngredients, setLoadingIngredients] = useState(false);

  // Fallback: fetch ingredients if not provided as prop
  const fetchIngredients = useCallback(async () => {
    if (ingredientsProp !== undefined) {
      // Ingredients provided as prop, no need to fetch
      return;
    }

    if (!itemId) return;
    
    setLoadingIngredients(true);
    try {
      const { data, error } = await supabase
        .from("item")
        .select("ingredients")
        .eq("id", itemId)
        .maybeSingle();

      if (error) {
        if (error.code !== 'PGRST116') {
        }
        setFetchedIngredients(null);
      } else {
        setFetchedIngredients(data?.ingredients || null);
      }
    } catch (error) {
      setFetchedIngredients(null);
    } finally {
      setLoadingIngredients(false);
    }
  }, [itemId, ingredientsProp]);

  useEffect(() => {
    fetchIngredients();
  }, [fetchIngredients]);

  // Use prop if available, otherwise use fetched
  const ingredients = ingredientsProp !== undefined ? ingredientsProp : fetchedIngredients;

  // Format ingredients for display
  const formattedIngredients = useMemo(() => {
    return formatIngredients(ingredients);
  }, [ingredients]);

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
            ) : formattedIngredients ? (
              <ScrollView 
                className="max-h-64"
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
              >
                <Text className="text-gray-300 text-sm font-sora leading-6">
                  {formattedIngredients}
                </Text>
              </ScrollView>
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
