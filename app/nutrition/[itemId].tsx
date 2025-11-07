import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Animated,
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
import { createLocalDateFromString } from "../../lib/timezone-utils";

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
}

export default function NutritionPage() {
  const { itemId, date: initialDateParam, source } = useLocalSearchParams<{ itemId: string; date?: string; source?: string }>();
  const router = useRouter();
  const { user, toggleFavorite, addFoodEntry } = useAuth();
  
  // Check if this is an FDC item
  const isFDCItem = source === 'fdc' || itemId.startsWith('fdc_');
  const [servingCount, setServingCount] = useState("1");
  const [selectedMeal, setSelectedMeal] = useState(0); // 0 = uncategorized, 1 = breakfast, 2 = lunch, 3 = dinner, 4 = snack
  const [item, setItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [toastAnimation] = useState(new Animated.Value(0));
  
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
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  // Convert selectedDate to ISO string for food entry (at noon to avoid timezone issues)
  const entryDate = React.useMemo(() => {
    const dateForEntry = new Date(selectedDate);
    dateForEntry.setHours(12, 0, 0, 0);
    return dateForEntry.toISOString();
  }, [selectedDate]);

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

  // Helper function to ensure FDC item exists in database with valid nutrition data
  const ensureFDCItemExists = async (fdcId: number, fdcData: any) => {
    const itemId = `fdc_${fdcId}`;
    
    // Extract nutrients from FDC data
    const nutrients = fdcData.foodNutrients || [];
    const getNutrientValue = (nutrientId: number) => {
      const nutrient = nutrients.find((n: any) => n.nutrientId === nutrientId || n.nutrient?.id === nutrientId);
      // Handle both direct value and nested value structures
      const value = nutrient?.value ?? nutrient?.amount ?? null;
      // Convert to number if it's a string
      return value !== null ? Number(value) : null;
    };

    const calories = getNutrientValue(1008); // Energy
    const protein_g = getNutrientValue(1003); // Protein
    const carbs_g = getNutrientValue(1005); // Carbohydrate
    const fat_g = getNutrientValue(1004); // Total lipid (fat)
    const fiber_g = getNutrientValue(1079); // Fiber
    const sugar_g = getNutrientValue(2000); // Sugars
    const sodium_mg = getNutrientValue(1093); // Sodium

    const protein_per_100cals = calories && calories > 0 && protein_g
      ? (protein_g / calories) * 100
      : null;

    // Prepare RPC parameters
    const rpcParams = {
      p_id: itemId,
      p_name: fdcData.description || fdcData.lowercaseDescription || 'Unknown Food',
      p_vegetarian: null,
      p_vegan: null,
      p_gluten: null,
      p_allergens: [],
      p_serving_size: null,
      p_calories: calories,
      p_protein_g: protein_g,
      p_carbs_g: carbs_g,
      p_fat_g: fat_g,
      p_fiber_g: fiber_g,
      p_sugar_g: sugar_g,
      p_sodium_mg: sodium_mg,
      p_protein_per_100cals: protein_per_100cals,
      p_ingredients: null,
      p_is_collection: false,
      p_is_available: true,
      p_user_id: null,
      p_source: 1, // FDC API
    };

    // Use the create_item function to bypass RLS
    const { data: result, error } = await supabase.rpc('create_item', rpcParams);

    if (error) {
      console.error('Error creating FDC item via function:', error);
      throw error;
    }

    if (!result || !result.success) {
      const errorMsg = result?.error || 'Unknown error creating item';
      console.error('Error creating FDC item:', errorMsg);
      throw new Error(errorMsg);
    }

    // Fetch the created/updated item to return it
    const { data: storedItem, error: fetchError } = await supabase
      .from('item')
      .select('*')
      .eq('id', itemId)
      .single();

    if (fetchError) {
      console.error('Error fetching stored FDC item:', fetchError);
      throw fetchError;
    }

    return storedItem;
  };

  // Fetch item data directly from Supabase or FDC API
  useEffect(() => {
    const fetchItem = async () => {
      if (!itemId) return;
      
      try {
        setLoading(true);
        
        if (isFDCItem) {
          // Extract FDC ID from itemId (remove fdc_ prefix)
          const fdcId = parseInt(itemId.replace('fdc_', ''));
          
          if (isNaN(fdcId)) {
            console.error('Invalid FDC ID:', itemId);
            router.back();
            return;
          }

          // Always fetch from FDC API first to ensure we have the latest data
          try {
            const { fdcSearchService } = await import('../../services/searchService');
            const fdcData = await fdcSearchService.getFoodById(fdcId);

            if (!fdcData) {
              console.error('FDC item not found in API');
              Alert.alert('Error', 'Food item not found. Please try again.');
              router.back();
              return;
            }

            // Store in database (upsert) to ensure it exists with valid data
            try {
              const storedItem = await ensureFDCItemExists(fdcId, fdcData);
              if (storedItem) {
                // Use the stored item from database
                setItem(storedItem);
              } else {
                throw new Error('Failed to store FDC item');
              }
            } catch (storeError) {
              console.error('Error storing FDC item:', storeError);
              // Fallback: Map FDC data directly to MenuItem format if storage fails
              const nutrients = fdcData.foodNutrients || [];
              const getNutrientValue = (nutrientId: number) => {
                const nutrient = nutrients.find((n: any) => n.nutrientId === nutrientId);
                return nutrient?.value ?? null;
              };

              const calories = getNutrientValue(1008);
              const protein_g = getNutrientValue(1003);
              const protein_per_100cals = calories && calories > 0 && protein_g
                ? (protein_g / calories) * 100
                : undefined;

              const mappedItem: MenuItem = {
                id: itemId,
                name: fdcData.description || fdcData.lowercaseDescription || 'Unknown Food',
                serving_size: undefined,
                calories: calories ?? undefined,
                protein_g: protein_g ?? undefined,
                carbs_g: getNutrientValue(1005) ?? undefined,
                fat_g: getNutrientValue(1004) ?? undefined,
                fiber_g: getNutrientValue(1079) ?? undefined,
                sugar_g: getNutrientValue(2000) ?? undefined,
                sodium_mg: getNutrientValue(1093) ?? undefined,
                vegetarian: undefined,
                vegan: undefined,
                gluten: undefined,
                allergens: [],
                ingredients: undefined,
              };
              
              // Add protein_per_100cals if calculated
              if (protein_per_100cals !== undefined) {
                (mappedItem as any).protein_per_100cals = protein_per_100cals;
              }
              
              setItem(mappedItem);
            }
          } catch (apiError) {
            console.error('Error fetching from FDC API:', apiError);
            Alert.alert('Error', 'Failed to fetch food data. Please check your connection and try again.');
            router.back();
            return;
          }
        } else {
          // Regular Purdue item
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

          // For Purdue items, serving_size is required
          // For FDC items, serving_size may be null
          if (!data) {
            router.replace(`/missing-nutrition/${itemId}`);
            return;
          }

          if (!isFDCItem && !data.serving_size) {
            router.replace(`/missing-nutrition/${itemId}`);
            return;
          }

          setItem(data);
        }
      } catch (error) {
        console.error('Error fetching item:', error);
        Alert.alert('Error', 'Failed to load food item. Please try again.');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [itemId, router, isFDCItem]);

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

  // Format date for display in the add button
  const formatDateForDisplay = () => {
    if (isToday()) {
      return 'Adding to Today';
    } else {
      return `Adding to ${selectedDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: selectedDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
      })}`;
    }
  };

  const showToast = (message: string, type: "success" | "error") => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    
    Animated.sequence([
      Animated.timing(toastAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(toastAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToastVisible(false);
    });
  };

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
        created_at: entryDate, // Use the date from search or today
        meal_name: selectedMeal,
        source: isFDCItem ? 1 : 0, // 0 = Purdue, 1 = FDC
      });

      if (error) {
        showToast("Failed to add item to tracker. Please try again.", "error");
        console.error("Add food entry error:", error);
        return;
      }

      // Show success toast and route back
      showToast("Item added to your food tracker!", "success");
      setTimeout(() => {
        router.back();
      }, 1000); // Small delay to show the toast
    } catch (error) {
      showToast("Failed to add item to tracker. Please try again.", "error");
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

      {/* Toast Notification */}
      {toastVisible && (
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 50,
            left: 20,
            right: 20,
            backgroundColor: toastType === 'success' ? '#10B981' : '#EF4444',
            borderRadius: 12,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
            transform: [
              {
                translateY: toastAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0],
                }),
              },
            ],
            opacity: toastAnimation,
          }}
        >
          <Ionicons
            name={toastType === 'success' ? 'checkmark-circle' : 'alert-circle'}
            size={24}
            color="white"
          />
          <Text className="text-white text-base font-sora-semibold ml-3 flex-1">
            {toastMessage}
          </Text>
        </Animated.View>
      )}
    </BackgroundTemplate>
  );
}
