import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    Alert,
    Animated,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import BackgroundTemplate from "../../components/BackgroundTemplate";
import CustomMealBuilder from "../../components/CustomMealBuilder";
import {
    addItemToCustomMeal,
    deleteCustomMeal,
    getCustomMealItems,
    MealItem,
    removeItemFromCustomMeal,
    updateMealItemQuantity,
} from "../../lib/api";
import { supabase } from "../../lib/supabase";

export default function EditMealPage() {
  const router = useRouter();
  const { mealId } = useLocalSearchParams<{ mealId: string }>();

  const [mealName, setMealName] = useState("");
  const [selectedItems, setSelectedItems] = useState<MealItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [toastAnimation] = useState(new Animated.Value(0));

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
      Animated.delay(1000),
      Animated.timing(toastAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToastVisible(false);
    });
  };

  // Load meal data
  useEffect(() => {
    if (mealId) {
      loadMealData();
    }
  }, [mealId]);

  const loadMealData = async () => {
    try {
      setLoading(true);

      // Load meal item
      const { data: mealData, error: mealError } = await supabase
        .from("item")
        .select("*")
        .eq("id", mealId)
        .single();

      if (mealError || !mealData) {
        Alert.alert("Error", "Failed to load meal data");
        router.back();
        return;
      }

      setMealName(mealData.name || "");

      // Load meal items
      const { data: mealItemsData, error: itemsError } = await getCustomMealItems(mealId);

      if (itemsError) {
        Alert.alert("Error", "Failed to load meal items");
        return;
      }

      if (mealItemsData) {
        const items: MealItem[] = mealItemsData.map((mi) => ({
          item: mi.item,
          quantity: mi.quantity,
        }));
        setSelectedItems(items);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load meal data");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!mealName.trim()) {
      showToast("Please enter a meal name.", "error");
      return;
    }

    if (selectedItems.length === 0) {
      showToast("Please add at least one item to the meal.", "error");
      return;
    }

    if (!mealId) {
      showToast("Meal ID is missing.", "error");
      return;
    }

    try {
      setSubmitting(true);

      // Update meal name
      const { error: updateError } = await supabase
        .from("item")
        .update({ name: mealName.trim() })
        .eq("id", mealId);

      if (updateError) {
        showToast("Failed to update meal name.", "error");
        return;
      }

      // Get current meal items from database
      const { data: currentMealItems } = await getCustomMealItems(mealId);
      const currentItemIds = new Set(
        currentMealItems?.map((mi) => mi.item_id) || []
      );
      const newItemIds = new Set(selectedItems.map((si) => si.item.id));

      // Remove items that are no longer in the meal
      for (const currentItem of currentMealItems || []) {
        if (!newItemIds.has(currentItem.item_id)) {
          await removeItemFromCustomMeal(mealId, currentItem.item_id);
        }
      }

      // Add or update items
      for (const mealItem of selectedItems) {
        if (currentItemIds.has(mealItem.item.id)) {
          // Update quantity if changed
          const currentItem = currentMealItems?.find(
            (mi) => mi.item_id === mealItem.item.id
          );
          if (currentItem && currentItem.quantity !== mealItem.quantity) {
            await updateMealItemQuantity(
              mealId,
              mealItem.item.id,
              mealItem.quantity
            );
          }
        } else {
          // Ensure FatSecret items exist
          if (mealItem.item.id.startsWith("fatsecret_")) {
            try {
              const { data: existingItem } = await supabase
                .from("item")
                .select("id")
                .eq("id", mealItem.item.id)
                .maybeSingle();

              if (!existingItem) {
                const protein_per_100cals =
                  mealItem.item.calories &&
                  mealItem.item.calories > 0 &&
                  mealItem.item.protein_g
                    ? (mealItem.item.protein_g / mealItem.item.calories) * 100
                    : null;

                await supabase.rpc("create_item", {
                  p_id: mealItem.item.id,
                  p_name: mealItem.item.name || "Unknown Food",
                  p_vegetarian: mealItem.item.vegetarian ?? null,
                  p_vegan: mealItem.item.vegan ?? null,
                  p_gluten: mealItem.item.gluten ?? null,
                  p_allergens: mealItem.item.allergens || [],
                  p_serving_size: mealItem.item.serving_size ?? null,
                  p_calories: mealItem.item.calories ?? null,
                  p_protein_g: mealItem.item.protein_g ?? null,
                  p_carbs_g: mealItem.item.carbs_g ?? null,
                  p_fat_g: mealItem.item.fat_g ?? null,
                  p_fiber_g: mealItem.item.fiber_g ?? null,
                  p_sugar_g: mealItem.item.sugar_g ?? null,
                  p_sodium_mg: mealItem.item.sodium_mg ?? null,
                  p_protein_per_100cals: protein_per_100cals,
                  p_ingredients: mealItem.item.ingredients ?? null,
                  p_is_collection: false,
                  p_is_available: true,
                  p_user_id: null,
                  p_source: 2,
                });
              }
            } catch (error) {
              console.error("Error ensuring FatSecret item exists:", error);
            }
          }

          // Add new item
          await addItemToCustomMeal(mealId, mealItem.item.id, mealItem.quantity);
        }
      }

      showToast("Meal updated successfully!", "success");
      setTimeout(() => {
        router.back();
      }, 500);
    } catch (e) {
      showToast(
        e instanceof Error ? e.message : "Unknown error occurred",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!mealId) {
      showToast("Meal ID is missing.", "error");
      return;
    }

    Alert.alert(
      "Delete Meal",
      "Are you sure you want to delete this custom meal? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setSubmitting(true);
              const result = await deleteCustomMeal(mealId);

              if (result.success) {
                showToast("Meal deleted successfully!", "success");
                setTimeout(() => {
                  router.back();
                }, 500);
              } else {
                showToast(result.error || "Failed to delete meal", "error");
              }
            } catch (error) {
              showToast("Failed to delete meal", "error");
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <BackgroundTemplate paddingBottom={0}>
        <View className="flex-1 justify-center items-center">
          <Text className="text-white text-lg">Loading meal...</Text>
        </View>
      </BackgroundTemplate>
    );
  }

  return (
    <BackgroundTemplate paddingBottom={0}>
      <View className="flex-1">
        {/* Header */}
        <View className="bg-transparent pt-14 pb-2 px-6">
          <View className="flex-row items-center justify-between mb-0">
            <TouchableOpacity
              onPress={() => router.back()}
              className="flex-row items-center pb-2"
              disabled={submitting}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
              <Text className="text-white text-lg font-sora ml-2">Back</Text>
            </TouchableOpacity>
          </View>
          <Text className="text-white text-3xl font-sora-bold mb-4">
            Edit Custom Meal
          </Text>
        </View>

        {/* Main Content */}
        <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
          <CustomMealBuilder
            mealName={mealName}
            onMealNameChange={setMealName}
            selectedItems={selectedItems}
            onItemsChange={setSelectedItems}
            isSaving={submitting}
          />

          {/* Action Buttons */}
          <View className="flex-row gap-3 mt-4 mb-8">
            <TouchableOpacity
              onPress={handleSave}
              disabled={submitting || !mealName.trim() || selectedItems.length === 0}
              className={`flex-1 bg-purdueGold rounded-lg py-4 ${
                submitting || !mealName.trim() || selectedItems.length === 0
                  ? "opacity-50"
                  : ""
              }`}
              style={{
                shadowColor: "#CFB991",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <Text className="text-black text-lg font-sora-bold text-center">
                {submitting ? "Updating..." : "Update"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDelete}
              disabled={submitting}
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
                {submitting ? "Deleting..." : "Delete"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Toast Notification */}
      {toastVisible && (
        <Animated.View
          style={{
            position: "absolute",
            bottom: 50,
            left: 20,
            right: 20,
            backgroundColor: toastType === "success" ? "#10B981" : "#EF4444",
            borderRadius: 12,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            shadowColor: "#000",
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
            name={toastType === "success" ? "checkmark-circle" : "alert-circle"}
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

