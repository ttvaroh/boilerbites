import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
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
    createCustomMeal,
    MealItem
} from "../../lib/api";
import { supabase } from "../../lib/supabase";

export default function CreateMealPage() {
  const router = useRouter();
  const [mealName, setMealName] = useState("");
  const [selectedItems, setSelectedItems] = useState<MealItem[]>([]);
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
      Animated.delay(3000),
      Animated.timing(toastAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToastVisible(false);
    });
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

    try {
      setSubmitting(true);

      // Get current user
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;

      if (!userId) {
        showToast("You must be logged in to create a meal.", "error");
        return;
      }

      // Create the meal
      const createResult = await createCustomMeal(mealName.trim(), userId);

      if (!createResult.success || !createResult.item_id) {
        showToast(
          createResult.error || "Failed to create meal.",
          "error"
        );
        return;
      }

      const mealId = createResult.item_id;

      // Add all items to the meal
      for (const mealItem of selectedItems) {
        // Ensure FatSecret items exist in database
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
                p_source: 1, // FatSecret
              });
            }
          } catch (error) {
            console.error("Error ensuring FatSecret item exists:", error);
          }
        }

        // Add item to meal
        const addResult = await addItemToCustomMeal(
          mealId,
          mealItem.item.id,
          mealItem.quantity
        );

        if (!addResult.success) {
          console.error(
            `Failed to add item ${mealItem.item.name}:`,
            addResult.error
          );
        }
      }

      showToast("Meal created successfully!", "success");
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (e) {
      showToast(
        e instanceof Error ? e.message : "Unknown error occurred",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

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
            Create Custom Meal
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

          {/* Save Button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={submitting || !mealName.trim() || selectedItems.length === 0}
            className={`bg-purdueGold rounded-lg py-4 mb-8 mt-4 ${
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
              {submitting ? "Creating Meal..." : "Create Meal"}
            </Text>
          </TouchableOpacity>
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

