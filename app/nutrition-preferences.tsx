import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Alert,
    Modal,
    ScrollView,
    Switch,
    Text,
    TextInput,
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

  // Modal state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [tempCalories, setTempCalories] = useState("");
  const [tempProtein, setTempProtein] = useState("");
  const [tempCarbs, setTempCarbs] = useState("");
  const [tempFat, setTempFat] = useState("");

  // Calculate suggested macros based on calories
  const calculateSuggestedMacros = (calories: number) => {
    // Standard macro split: 30% protein, 40% carbs, 30% fat
    const proteinCalories = calories * 0.30;
    const carbsCalories = calories * 0.40;
    const fatCalories = calories * 0.30;

    return {
      protein: Math.round(proteinCalories / 4), // 4 cal per gram of protein
      carbs: Math.round(carbsCalories / 4),     // 4 cal per gram of carbs
      fat: Math.round(fatCalories / 9),         // 9 cal per gram of fat
    };
  };

  // Get dynamic placeholders based on calorie input
  const getPlaceholders = (calories: number, currentProtein: number, currentCarbs: number, currentFat: number) => {
    const suggested = calculateSuggestedMacros(calories);
    
    return {
      protein: tempProtein === "" ? `${currentProtein}g` : `${suggested.protein}g`,
      carbs: tempCarbs === "" ? `${currentCarbs}g` : `${suggested.carbs}g`,
      fat: tempFat === "" ? `${currentFat}g` : `${suggested.fat}g`,
    };
  };

  const openEditModal = () => {
    setTempCalories(calorieGoal.toString());
    setTempProtein("");
    setTempCarbs("");
    setTempFat("");
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
  };

  const handleSubmitGoals = () => {
    const calories = parseInt(tempCalories);
    const protein = parseInt(tempProtein);
    const carbs = parseInt(tempCarbs);
    const fat = parseInt(tempFat);

    // Validation
    if (!calories || calories < 500 || calories > 10000) {
      Alert.alert("Invalid Input", "Please enter a valid calorie goal between 500-10,000.");
      return;
    }

    if (!protein || protein < 0 || protein > 500) {
      Alert.alert("Invalid Input", "Please enter a valid protein goal between 0-500g.");
      return;
    }

    if (!carbs || carbs < 0 || carbs > 1000) {
      Alert.alert("Invalid Input", "Please enter a valid carbs goal between 0-1,000g.");
      return;
    }

    if (!fat || fat < 0 || fat > 300) {
      Alert.alert("Invalid Input", "Please enter a valid fat goal between 0-300g.");
      return;
    }

    // Check if macros are reasonable for the calorie goal
    const totalMacroCalories = (protein * 4) + (carbs * 4) + (fat * 9);
    const calorieDiscrepancy = Math.abs(totalMacroCalories - calories);
    
    if (calorieDiscrepancy > calories * 0.15) { // More than 15% difference
      Alert.alert(
        "Macro Mismatch",
        `Your macros add up to ${totalMacroCalories} calories, but your goal is ${calories} calories. Continue anyway?`,
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Continue", 
            onPress: () => saveGoals(calories, protein, carbs, fat)
          },
        ]
      );
      return;
    }

    saveGoals(calories, protein, carbs, fat);
  };

  const saveGoals = (calories: number, protein: number, carbs: number, fat: number) => {
    setCalorieGoal(calories);
    setProteinGoal(protein);
    setCarbsGoal(carbs);
    setFatGoal(fat);
    setIsModalVisible(false);
    Alert.alert("Success", "Your daily goals have been updated!");
  };

  // Get current placeholders
  const currentCalories = parseInt(tempCalories) || calorieGoal;
  const placeholders = getPlaceholders(currentCalories, proteinGoal, carbsGoal, fatGoal);

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
            nutrition_goals: {
                calorieGoal,
                proteinGoal,
                carbsGoal,
                fatGoal,
            },
            allergen_preferences: {
                dairyAllergy,
                glutenAllergy,
                nutsAllergy,
                soyAllergy,
                eggsAllergy,
                shellfishAllergy,
            },
        },
      });

      if (error) {
        Alert.alert("Error", "Failed to save preferences. Please try again.");
        return;
      }

      Alert.alert("Success", "Your preferences have been saved!");
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
                  Nutrition Settings
                </Text>
                <Text className="text-gray-300 text-sm font-sora mt-1">
                  Set your daily goals and preferences
                </Text>
              </View>
            </View>
          </View>

          {/* Daily Goals */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-3 px-1">
              <Text className="text-gray-400 text-xs font-sora-semibold uppercase tracking-wider">
                Daily Goals
              </Text>
              <TouchableOpacity
                onPress={openEditModal}
                className="bg-purdueGold/20 rounded-lg px-3 py-1.5 flex-row items-center"
              >
                <Ionicons name="create" size={14} color="#CFB991" />
                <Text className="text-purdueGold text-xs font-sora-semibold ml-1">
                  Edit All
                </Text>
              </TouchableOpacity>
            </View>
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
                    <Ionicons name="flag" size={20} color={item.color} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white text-base font-sora-semibold">
                      {item.title}
                    </Text>
                    <Text className="text-gray-400 text-xs font-sora mt-0.5">
                      Goal: {item.goal} {item.unit}
                    </Text>
                  </View>
                  <View className="bg-gray-700/30 rounded-lg px-3 py-1.5">
                    <Text className="text-gray-300 text-sm font-sora-semibold">
                      {item.goal} {item.unit}
                    </Text>
                  </View>
                </View>
              ))}
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
                  About Your Preferences
                </Text>
                <Text className="text-blue-200 text-xs font-sora leading-5">
                  Your nutrition goals and allergen preferences will help personalize your dining experience and keep you on track with your health goals.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Edit Goals Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-gray-900 rounded-t-3xl px-6 pt-6 pb-8 max-h-[85%]">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-white text-2xl font-sora-bold">
                Edit Daily Goals
              </Text>
              <TouchableOpacity
                onPress={closeModal}
                className="p-2"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={28} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Calories */}
              <View className="mb-5">
                <Text className="text-white text-sm font-sora-semibold mb-2">
                  Daily Calories
                </Text>
                <View className="bg-gray-800 rounded-xl border border-gray-700 flex-row items-center px-4">
                  <Ionicons name="flame" size={20} color="#F59E0B" />
                  <TextInput
                    onChangeText={setTempCalories}
                    placeholder={`${calorieGoal}`}
                    placeholderTextColor="#6B7280"
                    keyboardType="numeric"
                    className="flex-1 text-white text-base font-sora py-4 ml-3"
                  />
                  <Text className="text-gray-400 text-sm font-sora">cal</Text>
                </View>
              </View>

              {/* Protein */}
              <View className="mb-5">
                <Text className="text-white text-sm font-sora-semibold mb-2">
                  Protein
                </Text>
                <View className="bg-gray-800 rounded-xl border border-gray-700 flex-row items-center px-4">
                  <Ionicons name="fitness" size={20} color="#3B82F6" />
                   <TextInput
                     onChangeText={setTempProtein}
                     placeholder={placeholders.protein}
                     placeholderTextColor="#6B7280"
                     keyboardType="numeric"
                     className="flex-1 text-white text-base font-sora py-4 ml-3"
                   />
                  <Text className="text-gray-400 text-sm font-sora">g</Text>
                </View>
              </View>

              {/* Carbohydrates */}
              <View className="mb-5">
                <Text className="text-white text-sm font-sora-semibold mb-2">
                  Carbohydrates
                </Text>
                <View className="bg-gray-800 rounded-xl border border-gray-700 flex-row items-center px-4">
                  <Ionicons name="leaf" size={20} color="#10B981" />
                   <TextInput
                     onChangeText={setTempCarbs}
                     placeholder={placeholders.carbs}
                     placeholderTextColor="#6B7280"
                     keyboardType="numeric"
                     className="flex-1 text-white text-base font-sora py-4 ml-3"
                   />
                  <Text className="text-gray-400 text-sm font-sora">g</Text>
                </View>
              </View>

              {/* Fat */}
              <View className="mb-5">
                <Text className="text-white text-sm font-sora-semibold mb-2">
                  Fat
                </Text>
                <View className="bg-gray-800 rounded-xl border border-gray-700 flex-row items-center px-4">
                  <Ionicons name="water" size={20} color="#8B5CF6" />
                   <TextInput
                     onChangeText={setTempFat}
                     placeholder={placeholders.fat}
                     placeholderTextColor="#6B7280"
                     keyboardType="numeric"
                     className="flex-1 text-white text-base font-sora py-4 ml-3"
                   />
                  <Text className="text-gray-400 text-sm font-sora">g</Text>
                </View>
              </View>

              {/* Helper Info */}
              <View className="bg-purdueGold/10 rounded-xl p-4 border border-purdueGold/30 mt-5 mb-6">
                <View className="flex-row items-start">
                  <Ionicons name="bulb" size={18} color="#CFB991" />
                  <View className="flex-1 ml-3">
                    <Text className="text-purdueGold text-xs font-sora-semibold mb-1">
                      Smart Suggestions
                    </Text>
                    <Text className="text-yellow-200 text-xs font-sora leading-5">
                      Placeholders update based on your calorie goal using a balanced 30/40/30 macro split (protein/carbs/fat).
                    </Text>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View className="space-y-3">
                <TouchableOpacity
                  onPress={handleSubmitGoals}
                  className="bg-purdueGold rounded-xl py-4 flex-row items-center justify-center"
                >
                  <Ionicons name="checkmark-circle" size={22} color="#000000" />
                  <Text className="text-black text-base font-sora-semibold ml-2">
                    Save Goals
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={closeModal}
                  className="bg-gray-800 rounded-xl py-4 flex-row items-center justify-center border border-gray-700 mt-2"
                >
                  <Text className="text-gray-300 text-base font-sora-semibold">
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </BackgroundTemplate>
  );
}