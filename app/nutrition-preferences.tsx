import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Animated,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import BackgroundTemplate from "../components/BackgroundTemplate";
import { useAuth } from "../contexts/AuthContext";
import { useNutritionGoals } from "../contexts/NutritionGoalsContext";

type AllergenItem = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  value: boolean;
  onToggle: (value: boolean) => void;
  color: string;
};


export default function NutritionPreferencesScreen() {
  const { user } = useAuth();
  const { goals: nutritionGoals, updateGoals } = useNutritionGoals();
  const router = useRouter();
  
  // Allergen preferences - initialize from context or use defaults
  const [dairyAllergy, setDairyAllergy] = useState(nutritionGoals?.dairy_allergy || false);
  const [glutenAllergy, setGlutenAllergy] = useState(nutritionGoals?.gluten_allergy || false);
  const [nutsAllergy, setNutsAllergy] = useState(nutritionGoals?.nuts_allergy || false);
  const [soyAllergy, setSoyAllergy] = useState(nutritionGoals?.soy_allergy || false);
  const [eggsAllergy, setEggsAllergy] = useState(nutritionGoals?.eggs_allergy || false);
  const [shellfishAllergy, setShellfishAllergy] = useState(nutritionGoals?.shellfish_allergy || false);
  const [fishAllergy, setFishAllergy] = useState(nutritionGoals?.fish_allergy || false);
  const [peanutAllergy, setPeanutAllergy] = useState(nutritionGoals?.peanut_allergy || false);
  const [veganPreference, setVeganPreference] = useState(nutritionGoals?.vegan_preference || false);
  const [vegetarianPreference, setVegetarianPreference] = useState(nutritionGoals?.vegetarian_preference || false);
  

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [toastAnimation] = useState(new Animated.Value(0));

  // Show toast function
  const showToast = (message: string, type: "success" | "error" = "success") => {
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
      id: "peanut",
      icon: "nutrition",
      title: "Peanuts",
      subtitle: "Peanuts, peanut butter, peanut oil",
      value: peanutAllergy,
      onToggle: setPeanutAllergy,
      color: "#F59E0B",
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
      id: "fish",
      icon: "fish",
      title: "Fish",
      subtitle: "Salmon, tuna, cod, bass",
      value: fishAllergy,
      onToggle: setFishAllergy,
      color: "#06B6D4",
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
    {
      id: "vegan",
      icon: "leaf",
      title: "Vegan",
      subtitle: "No animal products",
      value: veganPreference,
      onToggle: setVeganPreference,
      color: "#059669",
    },
    {
      id: "vegetarian",
      icon: "leaf-outline",
      title: "Vegetarian",
      subtitle: "No Meat, poultry, or fish",
      value: vegetarianPreference,
      onToggle: setVegetarianPreference,
      color: "#10B981",
    },
  ];


  const handleSavePreferences = async () => {
    if (!user) return;

    try {
      // Save allergen preferences only (preserve existing goals)
      await updateGoals({
        calories: nutritionGoals?.calories || 2000,
        protein: nutritionGoals?.protein || 115,
        carbs: nutritionGoals?.carbs || 288,
        fat: nutritionGoals?.fat || 67,
        // Include allergen preferences
        dairy_allergy: dairyAllergy,
        gluten_allergy: glutenAllergy,
        nuts_allergy: nutsAllergy,
        soy_allergy: soyAllergy,
        eggs_allergy: eggsAllergy,
        shellfish_allergy: shellfishAllergy,
        fish_allergy: fishAllergy,
        peanut_allergy: peanutAllergy,
        vegan_preference: veganPreference,
        vegetarian_preference: vegetarianPreference,
      });

      showToast("Your nutrition preferences have been saved successfully!");
      
      // Route back after successful save
      setTimeout(() => {
        router.back();
      }, 500); // Small delay to show toast
    } catch (error) {
      console.error("Error saving preferences:", error);
      Alert.alert("Error", "Failed to save preferences. Please try again.");
    }
  };

  return (
    <BackgroundTemplate paddingBottom={0}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-12 pb-8">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
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

          {/* Small Hero Section */}
          <View className="bg-gradient-to-br from-purdueGold/20 to-yellow-600/10 rounded-xl p-3 mb-3 border border-purdueGold/30">
            <View className="flex-row items-center">
              <View className="bg-purdueGold rounded-full p-1.5 mr-2.5">
                <Ionicons name="nutrition" size={14} color="#000000" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-sm font-sora-semibold">
                  Customize your food allergies and dietary preferences
                </Text>
              </View>
            </View>
          </View>

          {/* Allergen Preferences */}
          <View className="mb-4">
            <Text className="text-gray-400 text-xs font-sora-semibold uppercase tracking-wider mb-3 px-1">
              Food Allergies & Intolerances
            </Text>
            <View className="bg-gray-800/40 backdrop-blur-xl rounded-2xl border border-gray-700/30 overflow-hidden">
              {allergenItems.map((item, index) => (
                <View
                  key={item.id}
                  className={`px-4 py-3 flex-row items-center ${
                    index !== allergenItems.length - 1 ? "border-b border-gray-700/30" : ""
                  }`}
                >
                  <View
                    className="rounded-full p-2.5 mr-3.5"
                    style={{ backgroundColor: `${item.color}20` }}
                  >
                    <Ionicons name={item.icon} size={19} color={item.color} />
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
                  Your allergen preferences will help personalize your dining experience by filtering menu items based on your dietary needs.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

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