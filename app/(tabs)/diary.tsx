import { Ionicons } from "@expo/vector-icons";
import * as React from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import StatsCard from "../../components/StatsCard";

export default function DiaryPage() {
  const [meals, setMeals] = React.useState([
    {
      id: 1,
      name: "Breakfast",
      time: "8:00 AM",
      items: ["Oatmeal", "Banana", "Coffee"],
      calories: 320,
    },
    {
      id: 2,
      name: "Lunch",
      time: "12:30 PM",
      items: ["Grilled Chicken", "Rice", "Vegetables"],
      calories: 450,
    },
  ]);

  const [showAddForm, setShowAddForm] = React.useState(false);
  const [newMeal, setNewMeal] = React.useState({
    name: "",
    time: "",
    items: "",
    calories: "",
  });

  const addMeal = () => {
    if (newMeal.name && newMeal.time && newMeal.items && newMeal.calories) {
      const meal = {
        id: Date.now(),
        name: newMeal.name,
        time: newMeal.time,
        items: newMeal.items.split(",").map((item) => item.trim()),
        calories: parseInt(newMeal.calories),
      };
      setMeals([...meals, meal]);
      setNewMeal({ name: "", time: "", items: "", calories: "" });
      setShowAddForm(false);
    }
  };

  const totalCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);
  const totalProtein = meals.reduce((sum, meal) => {
    // Estimate protein based on meal type (this is a simplified calculation)
    const proteinMap: { [key: string]: number } = {
      "Grilled Chicken": 31,
      Rice: 4,
      Oatmeal: 6,
      Banana: 1,
      Coffee: 0,
      Vegetables: 3,
    };
    return (
      sum +
      meal.items.reduce((itemSum, item) => itemSum + (proteinMap[item] || 2), 0)
    );
  }, 0);

  return (
    <ScrollView className="flex-1 bg-warmWhite">
      <View className="p-6">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-3xl font-bold text-purdueBlack-200 mb-2">
            Food Diary
          </Text>
          <Text className="text-lg text-purdueBlack-100">
            Track your daily nutrition
          </Text>
        </View>

        {/* Daily Summary */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-purdueBlack-200 mb-4">
            Today's Summary
          </Text>
          <View className="flex-row space-x-4">
            <StatsCard
              title="Meals"
              value={meals.length}
              subtitle="Logged Today"
              icon="restaurant"
            />
            <StatsCard
              title="Calories"
              value={totalCalories}
              subtitle="Goal: 2,000"
              icon="flame"
            />
          </View>
          <View className="mt-4">
            <StatsCard
              title="Protein"
              value={`${totalProtein}g`}
              subtitle="Goal: 120g"
              icon="fitness"
            />
          </View>
        </View>

        {/* Add Meal Button */}
        <TouchableOpacity
          onPress={() => setShowAddForm(!showAddForm)}
          className="bg-purdueGold p-4 rounded-lg mb-6 flex-row items-center justify-center"
        >
          <Ionicons name="add" size={24} color="#0d0d0d" />
          <Text className="text-purdueBlack-200 font-semibold ml-2">
            {showAddForm ? "Cancel" : "Add New Meal"}
          </Text>
        </TouchableOpacity>

        {/* Add Meal Form */}
        {showAddForm && (
          <View className="bg-white p-4 rounded-lg border border-purdueGold mb-6">
            <Text className="text-lg font-semibold text-purdueBlack-200 mb-4">
              Add New Meal
            </Text>
            <TextInput
              placeholder="Meal Name (e.g., Breakfast, Lunch)"
              value={newMeal.name}
              onChangeText={(text) => setNewMeal({ ...newMeal, name: text })}
              className="border border-gray-300 p-3 rounded-lg mb-3"
            />
            <TextInput
              placeholder="Time (e.g., 8:00 AM)"
              value={newMeal.time}
              onChangeText={(text) => setNewMeal({ ...newMeal, time: text })}
              className="border border-gray-300 p-3 rounded-lg mb-3"
            />
            <TextInput
              placeholder="Food Items (comma separated)"
              value={newMeal.items}
              onChangeText={(text) => setNewMeal({ ...newMeal, items: text })}
              className="border border-gray-300 p-3 rounded-lg mb-3"
            />
            <TextInput
              placeholder="Calories"
              value={newMeal.calories}
              onChangeText={(text) =>
                setNewMeal({ ...newMeal, calories: text })
              }
              className="border border-gray-300 p-3 rounded-lg mb-3"
              keyboardType="numeric"
            />
            <TouchableOpacity
              onPress={addMeal}
              className="bg-purdueBlack-200 p-3 rounded-lg"
            >
              <Text className="text-purdueGold text-center font-semibold">
                Add Meal
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Meals List */}
        <View>
          <Text className="text-xl font-semibold text-purdueBlack-200 mb-4">
            Today's Meals
          </Text>
          {meals.map((meal) => (
            <View
              key={meal.id}
              className="bg-white p-4 rounded-lg border border-purdueGold mb-3"
            >
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-lg font-semibold text-purdueBlack-200">
                  {meal.name}
                </Text>
                <Text className="text-purdueGold font-semibold">
                  {meal.calories} cal
                </Text>
              </View>
              <Text className="text-purdueBlack-100 mb-2">{meal.time}</Text>
              <View className="flex-row flex-wrap">
                {meal.items.map((item, index) => (
                  <View
                    key={index}
                    className="bg-purdueGold px-2 py-1 rounded-full mr-2 mb-1"
                  >
                    <Text className="text-purdueBlack-200 text-sm">{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
