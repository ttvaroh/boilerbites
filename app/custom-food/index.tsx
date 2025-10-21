import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Animated,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import BackgroundTemplate from "../../components/BackgroundTemplate";
import CustomFoodForm from "../../components/CustomFoodForm";
import MenuItemCard from "../../components/MenuItemCard";
import { createAndAddCustomFood } from "../../lib/api";
import { supabase } from "../../lib/supabase";

export default function CustomFoodPage() {
  const router = useRouter();
  const { reload } = useLocalSearchParams<{ reload?: string }>();

  // Section toggle: "create" | "search" | "mine"
  const [activeSection, setActiveSection] = useState<"mine" | "create" | "search" >(
    "mine"
  );


  // Form state (primary)
  const [name, setName] = useState("");
  const [servingSize, setServingSize] = useState("");
  const [calories, setCalories] = useState("");
  const [proteinG, setProteinG] = useState("");
  const [carbsG, setCarbsG] = useState("");
  const [fatG, setFatG] = useState("");

  // Form state (advanced)
  const [fiberG, setFiberG] = useState("");
  const [sugarG, setSugarG] = useState("");
  const [sodiumMg, setSodiumMg] = useState("");
  const [vegetarian, setVegetarian] = useState(false);
  const [vegan, setVegan] = useState(false);
  const [gluten, setGluten] = useState(false);
  const [allergens, setAllergens] = useState(""); // comma-separated
  const [ingredients, setIngredients] = useState("");
  const [proteinPer100Cals, setProteinPer100Cals] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // My foods state
  const [myFoodsLoading, setMyFoodsLoading] = useState(false);
  const [myFoods, setMyFoods] = useState<any[]>([]);

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

  const loadMyFoods = async () => {
    try {
      setMyFoodsLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) {
        setMyFoods([]);
        return;
      }

      // Fetch custom foods joined with item rows
      const { data, error } = await supabase
        .from('custom_food')
        .select(`item_id, item:item_id (*)`)
        .eq('created_by', userId)
        .order('created_at', { ascending: false });

      if (error) {
        setMyFoods([]);
        return;
      }

      const items = (data || []).map((row: any) => row.item).filter((x: any) => !!x);
      setMyFoods(items);
    } finally {
      setMyFoodsLoading(false);
    }
  };

  // Load on first open of My Foods
  useEffect(() => {
    if (activeSection === 'mine') {
      loadMyFoods();
    }
  }, [activeSection]);

  // Reload data when page becomes focused (e.g., returning from edit page)
  useFocusEffect(
    React.useCallback(() => {
      if (activeSection === 'mine') {
        loadMyFoods();
      }
    }, [activeSection])
  );

  // Check for reload parameter and reload data if needed
  useEffect(() => {
    if (reload === 'true' && activeSection === 'mine') {
      loadMyFoods();
    }
  }, [reload, activeSection]);


  return (
    <BackgroundTemplate>
      <View className="flex-1">
        {/* Header */}
        <View className="bg-transparent pt-14 pb-2 px-6">
          <View className="flex-row items-center justify-between mb-0">
            <TouchableOpacity
              onPress={() => router.back()}
              className="flex-row items-center pb-2"
            >
              <Ionicons name="arrow-back" size={24} color="white" />
              <Text className="text-white text-lg font-sora ml-2">Back</Text>
            </TouchableOpacity>
          </View>
          <Text className="text-white text-3xl font-sora-bold mb-4">
            Custom Foods
          </Text>
          {/* Section Switcher */}
          <View className="flex-row bg-gray-800 rounded-lg p-1 border border-gray-700 w-full">
            <TouchableOpacity
              onPress={() => setActiveSection("mine")}
              className={`flex-1 items-center py-2 rounded-md ${
                activeSection === "mine" ? "bg-purdueGold" : ""
              }`}
            >
              <Text
                className={`font-sora ${
                  activeSection === "mine" ? "text-black" : "text-white"
                }`}
              >
                My Foods
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveSection("create")}
              className={`flex-1 items-center py-2 rounded-md ${
                activeSection === "create" ? "bg-purdueGold" : ""
              }`}
            >
              <Text
                className={`font-sora ${
                  activeSection === "create" ? "text-black" : "text-white"
                }`}
              >
                Create
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveSection("search")}
              className={`flex-1 items-center py-2 rounded-md ${
                activeSection === "search" ? "bg-purdueGold" : ""
              }`}
            >
              <Text
                className={`font-sora ${
                  activeSection === "search" ? "text-black" : "text-white"
                }`}
              >
                Search/QR
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Content */}
        <ScrollView className="flex-1 px-6">
          {activeSection === "search" ? (
            <View className="py-6">
              {/* Placeholder for future search UI */}
              <Text className="text-gray-300 font-sora">
                Search and QR code scanning coming soon.
              </Text>
            </View>
          ) : activeSection === "mine" ? (
            <View className="py-4">
              {myFoodsLoading ? (
                <Text className="text-gray-300 font-sora">Loading your foods...</Text>
              ) : myFoods.length === 0 ? (
                <View className="items-center py-8">
                  <Text className="text-gray-300 font-sora mb-4">You haven't created any custom foods yet.</Text>
                  <TouchableOpacity
                    onPress={() => setActiveSection('create')}
                    className="bg-purdueGold rounded-lg px-4 py-2"
                  >
                    <Text className="text-black font-sora-bold">Create one</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  {myFoods.map((item: any) => (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => router.push(`/custom-food/edit-custom-food?itemId=${item.id}&reload=true`)}
                      activeOpacity={0.8}
                    >
                      <MenuItemCard item={item} showDietaryTag={true} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <CustomFoodForm
              name={name}
              servingSize={servingSize}
              calories={calories}
              proteinG={proteinG}
              carbsG={carbsG}
              fatG={fatG}
              fiberG={fiberG}
              sugarG={sugarG}
              sodiumMg={sodiumMg}
              vegetarian={vegetarian}
              vegan={vegan}
              gluten={gluten}
              allergens={allergens}
              ingredients={ingredients}
              setName={setName}
              setServingSize={setServingSize}
              setCalories={setCalories}
              setProteinG={setProteinG}
              setCarbsG={setCarbsG}
              setFatG={setFatG}
              setFiberG={setFiberG}
              setSugarG={setSugarG}
              setSodiumMg={setSodiumMg}
              setVegetarian={setVegetarian}
              setVegan={setVegan}
              setGluten={setGluten}
              setAllergens={setAllergens}
              setIngredients={setIngredients}
              onSubmit={async () => {
                if (!name.trim()) {
                  showToast("Please enter a food name.", "error");
                  return;
                }
                try {
                  setSubmitting(true);
                  const { data: auth } = await supabase.auth.getUser();
                  const userId = auth?.user?.id;

                  const toNum = (v: string) => (v?.trim() ? parseFloat(v) : undefined);
                  const allergenArray = (allergens || "")
                    .split(",")
                    .map((s) => s.trim())
                    .filter((s) => s.length > 0);

                  const result = await createAndAddCustomFood(
                    {
                      name: name.trim(),
                      serving_size: servingSize || undefined,
                      calories: toNum(calories),
                      protein_g: toNum(proteinG),
                      carbs_g: toNum(carbsG),
                      fat_g: toNum(fatG),
                      fiber_g: toNum(fiberG),
                      sugar_g: toNum(sugarG),
                      sodium_mg: toNum(sodiumMg),
                      vegetarian,
                      vegan,
                      gluten,
                      allergens: allergenArray.length ? allergenArray : undefined,
                      ingredients: ingredients || undefined,
                    },
                    userId
                  );

                  if (result.success) {
                    showToast("Custom food created successfully!", "success");
                    // Navigate directly to the nutrition page of the created item
                    if (result.item_id) {
                      router.push(`/nutrition/${result.item_id}`);
                    } else {
                      router.back();
                    }
                  } else {
                    showToast(result.error || "Failed to create custom food.", "error");
                  }
                } catch (e) {
                  showToast(
                    e instanceof Error ? e.message : "Unknown error",
                    "error"
                  );
                } finally {
                  setSubmitting(false);
                }
              }}
              submitting={submitting}
              submitButtonText="Create Custom Food"
              showDeleteButton={false}
            />
          )}
        </ScrollView>
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


