import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Alert,
    ScrollView,
    Switch,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import BackgroundTemplate from "../components/BackgroundTemplate";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

type AllergenItem = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  value: boolean;
  onToggle: (value: boolean) => void;
  color: string;
};

type GoalItem = {
  id: string;
  title: string;
  current: number;
  goal: number;
  unit: string;
  color: string;
};

export default function NutritionPreferencesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  
  // Allergen preferences
  const [dairyAllergy, setDairyAllergy] = useState(false);
  const [glutenAllergy, setGlutenAllergy] = useState(false);
  const [nutsAllergy, setNutsAllergy] = useState(false);
  const [soyAllergy, setSoyAllergy] = useState(false);
  const [eggsAllergy, setEggsAllergy] = useState(false);
  const [shellfishAllergy, setShellfishAllergy] = useState(false);
  
  // Daily goals
  const [calorieGoal, setCalorieGoal] = useState(2000);
  const [proteinGoal, setProteinGoal] = useState(115);
  const [carbsGoal, setCarbsGoal] = useState(288);
  const [fatGoal, setFatGoal] = useState(67);

  const allergenItems: AllergenItem[] = [
    {
      id: "dairy",
      icon: "water",
      title: "Dairy",
      subtitle: "Milk, cheese, yogurt, butter",
      value: dairyAllergy,
      onToggle: setDairyAllergy,
      color: "#3B82F6",
    },
    {
      id: "gluten",
      icon: "leaf",
      title: "Gluten",
      subtitle: "Wheat, barley, rye, bread",
      value: glutenAllergy,
      onToggle: setGlutenAllergy,
      color: "#10B981",
    },
    {
      id: "nuts",
      icon: "nutrition",
      title: "Tree Nuts",
      subtitle: "Almonds, walnuts, cashews",
      value: nutsAllergy,
      onToggle: setNutsAllergy,
      color: "#8B5CF6",
    },
    {
      id: "soy",
      icon: "leaf",
      title: "Soy",
      subtitle: "Soybeans, tofu, soy sauce",
      value: soyAllergy,
      onToggle: setSoyAllergy,
      color: "#F59E0B",
    },
    {
      id: "eggs",
      icon: "egg",
      title: "Eggs",
      subtitle: "Chicken eggs and egg products",
      value: eggsAllergy,
      onToggle: setEggsAllergy,
      color: "#F97316",
    },
    {
      id: "shellfish",
      icon: "fish",
      title: "Shellfish",
      subtitle: "Shrimp, crab, lobster, mollusks",
      value: shellfishAllergy,
      onToggle: setShellfishAllergy,
      color: "#EF4444",
    },
  ];

  const goalItems: GoalItem[] = [
    {
      id: "calories",
      title: "Daily Calories",
      current: 0,
      goal: calorieGoal,
      unit: "cal",
      color: "#F59E0B",
    },
    {
      id: "protein",
      title: "Protein",
      current: 0,
      goal: proteinGoal,
      unit: "g",
      color: "#3B82F6",
    },
    {
      id: "carbs",
      title: "Carbohydrates",
      current: 0,
      goal: carbsGoal,
      unit: "g",
      color: "#10B981",
    },
    {
      id: "fat",
      title: "Fat",
      current: 0,
      goal: fatGoal,
      unit: "g",
      color: "#8B5CF6",
    },
  ];

  const handleSavePreferences = async () => {
    if (!user) return;

    try {
      // Save preferences to user metadata
      const { error } = await supabase.auth.updateUser({
        data: {
          allergen_preferences: {
            dairyAllergy,
            glutenAllergy,
            nutsAllergy,
            soyAllergy,
            eggsAllergy,
            shellfishAllergy,
          },
          nutrition_goals: {
            calorieGoal,
            proteinGoal,
            carbsGoal,
            fatGoal,
          },
        },
      });

      if (error) {
        Alert.alert("Error", "Failed to save preferences. Please try again.");
        return;
      }

      Alert.alert("Success", "Your allergen preferences have been saved!");
    } catch (error) {
      console.error("Error saving preferences:", error);
      Alert.alert("Error", "Failed to save preferences. Please try again.");
    }
  };

  return (
    <BackgroundTemplate paddingBottom={0}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-16 pb-8">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center flex-1">
              <TouchableOpacity
                onPress={() => router.back()}
                className="mr-4 p-2"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <Text className="text-white text-2xl font-sora-bold">
                Nutrition Preferences
              </Text>
            </View>
          </View>

          {/* Hero Section */}
          <View className="bg-gradient-to-br from-purdueGold/20 to-yellow-600/10 rounded-2xl p-6 mb-6 border border-purdueGold/30">
            <View className="flex-row items-center mb-3">
              <View className="bg-purdueGold rounded-full p-3 mr-4">
                <Ionicons name="nutrition" size={28} color="#000000" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-xl font-sora-bold">
                  Allergen Preferences
                </Text>
                <Text className="text-gray-300 text-sm font-sora mt-1">
                  Select your food allergies and intolerances
                </Text>
              </View>
            </View>
          </View>

          {/* Allergen Preferences */}
          <View className="mb-6">
            <Text className="text-gray-400 text-xs font-sora-semibold uppercase tracking-wider mb-3 px-1">
              Food Allergies & Intolerances
            </Text>
            <View className="bg-gray-800/40 backdrop-blur-xl rounded-2xl border border-gray-700/30 overflow-hidden">
              {allergenItems.map((item, index) => (
                <View
                  key={item.id}
                  className={`px-5 py-4 flex-row items-center ${
                    index !== allergenItems.length - 1 ? "border-b border-gray-700/30" : ""
                  }`}
                >
                  <View
                    className="rounded-full p-2.5 mr-4"
                    style={{ backgroundColor: `${item.color}20` }}
                  >
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white text-base font-sora-semibold">
                      {item.title}
                    </Text>
                    <Text className="text-gray-400 text-xs font-sora mt-0.5">
                      {item.subtitle}
                    </Text>
                  </View>
                  <Switch
                    value={item.value}
                    onValueChange={item.onToggle}
                    trackColor={{ false: "#374151", true: item.color }}
                    thumbColor={item.value ? "#FFFFFF" : "#9CA3AF"}
                  />
                </View>
              ))}
            </View>
          </View>

          {/* Daily Goals */}
          <View className="mb-6">
            <Text className="text-gray-400 text-xs font-sora-semibold uppercase tracking-wider mb-3 px-1">
              Daily Goals
            </Text>
            <View className="bg-gray-800/40 backdrop-blur-xl rounded-2xl border border-gray-700/30 overflow-hidden">
              {goalItems.map((item, index) => (
                <View
                  key={item.id}
                  className={`px-5 py-4 flex-row items-center ${
                    index !== goalItems.length - 1 ? "border-b border-gray-700/30" : ""
                  }`}
                >
                  <View
                    className="rounded-full p-2.5 mr-4"
                    style={{ backgroundColor: `${item.color}20` }}
                  >
                    <Ionicons name="target" size={20} color={item.color} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white text-base font-sora-semibold">
                      {item.title}
                    </Text>
                    <Text className="text-gray-400 text-xs font-sora mt-0.5">
                      Goal: {item.goal} {item.unit}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      // TODO: Implement goal editing modal
                      Alert.alert("Coming Soon", "Goal editing will be available in a future update!");
                    }}
                    className="bg-gray-700/50 rounded-lg px-3 py-2"
                  >
                    <Text className="text-gray-300 text-sm font-sora">
                      Edit
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            onPress={handleSavePreferences}
            className="bg-purdueGold rounded-xl py-4 px-6 flex-row items-center justify-center mb-6"
            style={{
              shadowColor: "#CFB991",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Ionicons name="save" size={20} color="#000000" />
            <Text className="text-black text-base font-sora-semibold ml-2">
              Save Preferences
            </Text>
          </TouchableOpacity>

          {/* Info Section */}
          <View className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
            <View className="flex-row items-start">
              <Ionicons name="information-circle" size={20} color="#60A5FA" />
              <View className="flex-1 ml-3">
                <Text className="text-blue-300 text-sm font-sora-semibold mb-1">
                  About Allergen Preferences
                </Text>
                <Text className="text-blue-200 text-xs font-sora leading-5">
                  Your allergen preferences will be used to filter menu items and warn you about potential allergens. 
                  This helps keep you safe while dining on campus.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </BackgroundTemplate>
  );
}
