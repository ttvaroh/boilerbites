import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import BackgroundTemplate from "../../components/BackgroundTemplate";
import MenuItemCard from "../../components/MenuItemCard";
import { supabase } from "../../lib/supabase";

export default function CustomFoodPage() {
  const router = useRouter();
  const { reload } = useLocalSearchParams<{ reload?: string }>();

  // Section toggle: "foods" | "meals"
  const [activeSection, setActiveSection] = useState<"foods" | "meals">(
    "meals"
  );



  // My foods state
  const [myFoodsLoading, setMyFoodsLoading] = useState(false);
  const [myFoods, setMyFoods] = useState<any[]>([]);
  
  // My meals state
  const [myMealsLoading, setMyMealsLoading] = useState(false);
  const [myMeals, setMyMeals] = useState<any[]>([]);

  const loadMyFoods = async () => {
    try {
      setMyFoodsLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) {
        setMyFoods([]);
        return;
      }

      // Fetch custom foods (not meals) joined with item rows
      const { data, error } = await supabase
        .from('custom_food')
        .select(`item_id, item:item_id (*)`)
        .eq('created_by', userId)
        .order('created_at', { ascending: false });

      if (error) {
        setMyFoods([]);
        return;
      }

      // Filter to only show foods (is_collection = false)
      const items = (data || [])
        .map((row: any) => row.item)
        .filter((x: any) => !!x && !x.is_collection);
      setMyFoods(items);
    } finally {
      setMyFoodsLoading(false);
    }
  };

  const loadMyMeals = async () => {
    try {
      setMyMealsLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) {
        setMyMeals([]);
        return;
      }

      // Fetch custom meals (is_collection = true AND user_id IS NOT NULL)
      const { data, error } = await supabase
        .from('custom_food')
        .select(`item_id, item:item_id (*)`)
        .eq('created_by', userId)
        .order('created_at', { ascending: false });

      if (error) {
        setMyMeals([]);
        return;
      }

      // Filter to only show meals (is_collection = true AND user_id IS NOT NULL)
      const items = (data || [])
        .map((row: any) => row.item)
        .filter((x: any) => !!x && x.is_collection && x.user_id);
      setMyMeals(items);
    } finally {
      setMyMealsLoading(false);
    }
  };

  // Load on first open of sections
  useEffect(() => {
    if (activeSection === 'foods') {
      loadMyFoods();
    } else if (activeSection === 'meals') {
      loadMyMeals();
    }
  }, [activeSection]);

  // Reload data when page becomes focused (e.g., returning from edit page)
  useFocusEffect(
    React.useCallback(() => {
      if (activeSection === 'meals') {
        loadMyMeals();
      } else if (activeSection === 'foods') {
        loadMyFoods();
      }
    }, [activeSection])
  );

  // Check for reload parameter and reload data if needed
  useEffect(() => {
    if (reload === 'true') {
      if (activeSection === 'meals') {
        loadMyMeals();
      } else if (activeSection === 'foods') {
        loadMyFoods();
      }
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
            Custom Meals & Foods
          </Text>
          {/* Section Switcher */}
          <View className="flex-row bg-gray-800 rounded-lg p-1 border border-gray-700 w-full mb-4">
            <TouchableOpacity
              onPress={() => setActiveSection("meals")}
              className={`flex-1 items-center py-2 rounded-md ${
                activeSection === "meals" ? "bg-purdueGold" : ""
              }`}
            >
              <Text
                className={`font-sora ${
                  activeSection === "meals" ? "text-black" : "text-white"
                }`}
              >
                My Meals
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveSection("foods")}
              className={`flex-1 items-center py-2 rounded-md ${
                activeSection === "foods" ? "bg-purdueGold" : ""
              }`}
            >
              <Text
                className={`font-sora ${
                  activeSection === "foods" ? "text-black" : "text-white"
                }`}
              >
                My Foods
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Create Button - Only show for active tab */}
          {activeSection === "meals" && (
            <View className="mb-4">
              <TouchableOpacity
                onPress={() => router.push('/custom-food/create-meal')}
                className="bg-purdueGold rounded-lg px-4 py-3"
                style={{
                  shadowColor: "#CFB991",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <View className="flex-row items-center justify-center">
                  <Ionicons name="restaurant-outline" size={20} color="black" />
                  <Text className="text-black font-sora-bold ml-2">Create Meal</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
          {activeSection === "foods" && (
            <View className="mb-4">
              <TouchableOpacity
                onPress={() => router.push('/custom-food/create-food')}
                className="bg-purdueGold rounded-lg px-4 py-3"
                style={{
                  shadowColor: "#CFB991",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <View className="flex-row items-center justify-center">
                  <Ionicons name="add-circle-outline" size={20} color="black" />
                  <Text className="text-black font-sora-bold ml-2">Create Food</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Main Content */}
        <ScrollView className="flex-1 px-6">
          {activeSection === "meals" && (
            <View className="py-4">
              {myMealsLoading ? (
                <Text className="text-gray-300 font-sora">Loading your meals...</Text>
              ) : myMeals.length === 0 ? (
                <View className="items-center py-8">
                  <Text className="text-gray-300 font-sora mb-4">You haven't created any custom meals yet.</Text>
                </View>
              ) : (
                <View>
                  {myMeals.map((item: any) => (
                    <View key={item.id} className="flex-row items-center mb-3">
                      <TouchableOpacity
                        onPress={() => router.push(`/nutrition/${item.id}`)}
                        activeOpacity={0.8}
                        className="flex-1"
                      >
                        <MenuItemCard item={item} showDietaryTag={true} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => router.push(`/custom-food/edit-meal?mealId=${item.id}&reload=true`)}
                        className="ml-2 pt-0 p-2"
                        activeOpacity={0.7}
                      >
                        <Ionicons name="create-outline" size={24} color="#CFB991" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <View className="mt-4 mb-2 flex-row items-center justify-center">
                    <Ionicons name="information-circle-outline" size={14} color="#6B7280" />
                    <Text className="text-gray-600 text-xs font-sora text-center ml-1">
                      Tip: You can search for your custom meals in the search page
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}
          {activeSection === "foods" && (
            <View className="py-4">
              {myFoodsLoading ? (
                <Text className="text-gray-300 font-sora">Loading your foods...</Text>
              ) : myFoods.length === 0 ? (
                <View className="items-center py-8">
                  <Text className="text-gray-300 font-sora mb-4">You haven't created any custom foods yet.</Text>
                </View>
              ) : (
                <View>
                  {myFoods.map((item: any) => (
                    <View key={item.id} className="flex-row items-center mb-3">
                      <TouchableOpacity
                        onPress={() => router.push(`/nutrition/${item.id}`)}
                        activeOpacity={0.8}
                        className="flex-1"
                      >
                        <MenuItemCard item={item} showDietaryTag={true} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => router.push(`/custom-food/edit-custom-food?itemId=${item.id}&reload=true`)}
                        className="ml-2 pt-0 p-2"
                        activeOpacity={0.7}
                      >
                        <Ionicons name="create-outline" size={24} color="#CFB991" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <View className="mt-4 mb-2 flex-row items-center justify-center">
                    <Ionicons name="information-circle-outline" size={14} color="#6B7280" />
                    <Text className="text-gray-600 text-xs font-sora text-center ml-1">
                      Tip: You can search for your custom foods in the search page
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>

    </BackgroundTemplate>
  );
}


