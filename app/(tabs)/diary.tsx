import { Ionicons } from "@expo/vector-icons";
import * as React from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import BackgroundTemplate from "../../components/BackgroundTemplate";
import DailyProgress from "../../components/DailyProgress";
export default function DiaryPage() {
  const [meals, setMeals] = React.useState([
    {
      id: 1,
      name: "Oatmeal with Berries",
      mealType: "Breakfast",
      calories: 350,
      icon: "restaurant",
    },
    {
      id: 2,
      name: "Grilled Chicken Salad",
      mealType: "Lunch",
      calories: 500,
      icon: "restaurant",
    },
    {
      id: 3,
      name: "Salmon with Vegetables",
      mealType: "Dinner",
      calories: 600,
      icon: "fish",
    },
    {
      id: 4,
      name: "Apple and Peanut Butter",
      mealType: "Snacks",
      calories: 200,
      icon: "nutrition",
    },
  ]);

  const [showAddForm, setShowAddForm] = React.useState(false);
  const [newMeal, setNewMeal] = React.useState({
    name: "",
    mealType: "",
    calories: "",
  });

  const addMeal = () => {
    if (newMeal.name && newMeal.mealType && newMeal.calories) {
      const meal = {
        id: Date.now(),
        name: newMeal.name,
        mealType: newMeal.mealType,
        calories: parseInt(newMeal.calories),
        icon: "restaurant",
      };
      setMeals([...meals, meal]);
      setNewMeal({ name: "", mealType: "", calories: "" });
      setShowAddForm(false);
    }
  };

  const totalCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);
  const totalProtein = 120; // Example value
  const totalFat = 60; // Example value

  return (
    <BackgroundTemplate>
      <ScrollView className="flex-1">
        <View className="p-6">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity>
            <Ionicons name="menu" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-2xl font-sora-bold text-white">
            Tracker
          </Text>
          <View style={{ width: 24 }} />
        </View>
        
        {/* Test Content */}
        <View className="bg-white rounded-lg p-4 mb-6">
          <Text className="text-black text-xl font-sora-bold text-center">
            Diary Screen Test
          </Text>
          <Text className="text-gray-600 text-center">
            This should be visible
          </Text>
        </View>

        {/* Today's Summary */}
        <View className="mb-6">
          <Text className="text-lg font-sora-semibold text-purdueBlack-200 mb-4">
            Today's Summary
          </Text>
          <View className="flex-row space-x-4 mb-4">
            {/* Calories Card */}
            <View className="bg-white rounded-lg p-4 flex-1">
              <Text className="text-purdueBlack-200 text-sm font-sora mb-1">
                Calories
              </Text>
              <Text className="text-purdueBlack-200 text-2xl font-sora-bold">
                {totalCalories}
              </Text>
            </View>
            {/* Protein Card */}
            <View className="bg-white rounded-lg p-4 flex-1">
              <Text className="text-purdueBlack-200 text-sm font-sora mb-1">
                Protein
              </Text>
              <Text className="text-purdueBlack-200 text-2xl font-sora-bold">
                {totalProtein}g
              </Text>
            </View>
          </View>
          {/* Fat Card */}
          <View className="bg-white rounded-lg p-4">
            <Text className="text-purdueBlack-200 text-sm font-sora mb-1">
              Fat
            </Text>
            <Text className="text-purdueBlack-200 text-2xl font-sora-bold">
              {totalFat}g
            </Text>
          </View>
        </View>
        <DailyProgress />

        {/* Log Your Intake Section */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-sora-semibold text-purdueBlack-200">
              Log Your Intake
            </Text>
            <TouchableOpacity
              onPress={() => setShowAddForm(!showAddForm)}
              className="bg-purdueGold rounded-full w-8 h-8 items-center justify-center"
            >
              <Ionicons name="add" size={20} color="#0d0d0d" />
            </TouchableOpacity>
          </View>

          {/* Add Meal Form */}
          {showAddForm && (
            <View className="bg-white p-4 rounded-lg mb-4">
              <Text className="text-lg font-sora-semibold text-purdueBlack-200 mb-4">
                Add New Meal
              </Text>
              <TextInput
                placeholder="Meal Name"
                value={newMeal.name}
                onChangeText={(text) => setNewMeal({ ...newMeal, name: text })}
                className="border border-gray-300 p-3 rounded-lg mb-3 font-sora"
              />
              <TextInput
                placeholder="Meal Type (Breakfast, Lunch, Dinner, Snacks)"
                value={newMeal.mealType}
                onChangeText={(text) =>
                  setNewMeal({ ...newMeal, mealType: text })
                }
                className="border border-gray-300 p-3 rounded-lg mb-3 font-sora"
              />
              <TextInput
                placeholder="Calories"
                value={newMeal.calories}
                onChangeText={(text) =>
                  setNewMeal({ ...newMeal, calories: text })
                }
                className="border border-gray-300 p-3 rounded-lg mb-3 font-sora"
                keyboardType="numeric"
              />
              <TouchableOpacity
                onPress={addMeal}
                className="bg-purdueGold p-3 rounded-lg"
              >
                <Text className="text-purdueBlack-200 text-center font-sora-semibold">
                  Add Meal
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Meals List */}
          {meals.map((meal) => (
            <View
              key={meal.id}
              className="bg-white rounded-lg p-4 mb-3 flex-row items-center"
            >
              {/* Meal Icon */}
              <View className="bg-purdueGold rounded-full w-10 h-10 items-center justify-center mr-4">
                <Ionicons name={meal.icon as any} size={20} color="#0d0d0d" />
              </View>

              {/* Meal Info */}
              <View className="flex-1">
                <Text className="text-purdueBlack-200 text-base font-sora-semibold">
                  {meal.name}
                </Text>
                <Text className="text-purdueBlack-100 text-sm font-sora">
                  {meal.mealType}
                </Text>
              </View>

              {/* Calories */}
              <Text className="text-purdueBlack-200 text-sm font-sora">
                {meal.calories} kcal
              </Text>
            </View>
          ))}
        </View>
        </View>
      </ScrollView>
    </BackgroundTemplate>
  );
}
