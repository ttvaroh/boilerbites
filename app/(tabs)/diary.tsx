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
        <View className="p-6 pt-14">
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
        
        {/* Today's Summary */}
        <View className="mb-6">
          <Text className="text-lg font-sora-semibold text-white mb-4">
            Today's Summary
          </Text>

            {/* Daily Progress */}
            <DailyProgress />
        </View>

        {/* Log Your Intake Section */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-sora-semibold text-white">
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
            <View className="bg-gray-800 p-4 rounded-xl mb-4" style={{
              shadowColor: "#CFB991",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 5,
              borderWidth: 1,
              borderColor: "rgba(207, 185, 145, 0.2)",
            }}>
              <Text className="text-lg font-sora-semibold text-white mb-4">
                Add New Meal
              </Text>
              <TextInput
                placeholder="Meal Name"
                placeholderTextColor="#9CA3AF"
                value={newMeal.name}
                onChangeText={(text) => setNewMeal({ ...newMeal, name: text })}
                className="bg-gray-700 border border-gray-600 text-white p-3 rounded-lg mb-3 font-sora"
              />
              <TextInput
                placeholder="Meal Type (Breakfast, Lunch, Dinner, Snacks)"
                placeholderTextColor="#9CA3AF"
                value={newMeal.mealType}
                onChangeText={(text) =>
                  setNewMeal({ ...newMeal, mealType: text })
                }
                className="bg-gray-700 border border-gray-600 text-white p-3 rounded-lg mb-3 font-sora"
              />
              <TextInput
                placeholder="Calories"
                placeholderTextColor="#9CA3AF"
                value={newMeal.calories}
                onChangeText={(text) =>
                  setNewMeal({ ...newMeal, calories: text })
                }
                className="bg-gray-700 border border-gray-600 text-white p-3 rounded-lg mb-3 font-sora"
                keyboardType="numeric"
              />
              <TouchableOpacity
                onPress={addMeal}
                className="bg-purdueGold p-3 rounded-lg"
              >
                <Text className="text-white text-center font-sora-semibold">
                  Add Meal
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Meals List */}
          {meals.map((meal) => (
            <View
              key={meal.id}
              className="bg-gray-800 rounded-xl p-4 mb-3 flex-row items-center"
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
              {/* Meal Icon */}
              <View className="bg-purdueGold rounded-full w-10 h-10 items-center justify-center mr-4">
                <Ionicons name={meal.icon as any} size={20} color="#0d0d0d" />
              </View>

              {/* Meal Info */}
              <View className="flex-1">
                <Text className="text-white text-base font-sora-semibold">
                  {meal.name}
                </Text>
                <Text className="text-gray-300 text-sm font-sora">
                  {meal.mealType}
                </Text>
              </View>

              {/* Calories */}
              <Text className="text-white text-sm font-sora">
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
