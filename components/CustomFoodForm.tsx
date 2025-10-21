import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

interface CustomFoodFormProps {
  // Form data
  name: string;
  servingSize: string;
  calories: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
  fiberG: string;
  sugarG: string;
  sodiumMg: string;
  vegetarian: boolean;
  vegan: boolean;
  gluten: boolean;
  allergens: string;
  ingredients: string;
  
  // Setters
  setName: (value: string) => void;
  setServingSize: (value: string) => void;
  setCalories: (value: string) => void;
  setProteinG: (value: string) => void;
  setCarbsG: (value: string) => void;
  setFatG: (value: string) => void;
  setFiberG: (value: string) => void;
  setSugarG: (value: string) => void;
  setSodiumMg: (value: string) => void;
  setVegetarian: (value: boolean) => void;
  setVegan: (value: boolean) => void;
  setGluten: (value: boolean) => void;
  setAllergens: (value: string) => void;
  setIngredients: (value: string) => void;
  
  // Submit handlers
  onSubmit: () => void;
  onDelete?: () => void;
  
  // UI state
  submitting: boolean;
  submitButtonText: string;
  deleteButtonText?: string;
  showDeleteButton?: boolean;
}

export default function CustomFoodForm({
  name,
  servingSize,
  calories,
  proteinG,
  carbsG,
  fatG,
  fiberG,
  sugarG,
  sodiumMg,
  vegetarian,
  vegan,
  gluten,
  allergens,
  ingredients,
  setName,
  setServingSize,
  setCalories,
  setProteinG,
  setCarbsG,
  setFatG,
  setFiberG,
  setSugarG,
  setSodiumMg,
  setVegetarian,
  setVegan,
  setGluten,
  setAllergens,
  setIngredients,
  onSubmit,
  onDelete,
  submitting,
  submitButtonText,
  deleteButtonText = "Delete",
  showDeleteButton = false,
}: CustomFoodFormProps) {
  // Accordions for form sections
  const [isPrimaryOpen, setIsPrimaryOpen] = useState(true);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Derived suggestion (optional helper shown inline)
  const suggestedProteinPer100 = useMemo(() => {
    const cals = parseFloat(calories || "0");
    const p = parseFloat(proteinG || "0");
    if (cals <= 0) return "";
    return ((p / cals) * 100).toFixed(2);
  }, [calories, proteinG]);

  return (
    <View className="py-4">
      {/* Primary accordion - single container */}
      <View
        className="bg-gray-800 rounded-lg mb-2"
        style={{ borderWidth: 1, borderColor: "rgba(207, 185, 145, 0.2)" }}
      >
        <TouchableOpacity
          onPress={() => setIsPrimaryOpen(!isPrimaryOpen)}
          className="flex-row items-center justify-between py-3 px-4"
          activeOpacity={0.8}
        >
          <Text className="text-white text-base font-sora-bold">
            Basic Info
          </Text>
          <Ionicons
            name={isPrimaryOpen ? "chevron-down" : "chevron-forward"}
            size={20}
            color="#CFB991"
          />
        </TouchableOpacity>
        {isPrimaryOpen && (
          <View className="px-4 pb-3">
            {/* Name */}
            <Text className="text-white text-sm font-sora mb-1">Name</Text>
            <View className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 mb-3">
              <TextInput
                className="text-white font-sora"
                placeholder="Custom Chicken Bowl"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Serving Size */}
            <Text className="text-white text-sm font-sora mb-1">Serving Size</Text>
            <View className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 mb-3">
              <TextInput
                className="text-white font-sora"
                placeholder="1 bowl (350g)"
                placeholderTextColor="#9CA3AF"
                value={servingSize}
                onChangeText={setServingSize}
              />
            </View>

            {/* Calories */}
            <Text className="text-white text-sm font-sora mb-1">Calories</Text>
            <View className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 mb-3">
              <TextInput
                className="text-white font-sora"
                placeholder="0"
                placeholderTextColor="#9CA3AF"
                value={calories}
                onChangeText={setCalories}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Macros */}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-white text-sm font-sora mb-1">Protein (g)</Text>
                <View className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 mb-3">
                  <TextInput
                    className="text-white font-sora"
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    value={proteinG}
                    onChangeText={setProteinG}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              <View className="flex-1">
                <Text className="text-white text-sm font-sora mb-1">Carbs (g)</Text>
                <View className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 mb-3">
                  <TextInput
                    className="text-white font-sora"
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    value={carbsG}
                    onChangeText={setCarbsG}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              <View className="flex-1">
                <Text className="text-white text-sm font-sora mb-1">Fat (g)</Text>
                <View className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 mb-3">
                  <TextInput
                    className="text-white font-sora"
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    value={fatG}
                    onChangeText={setFatG}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Advanced accordion - single container */}
      <View
        className="bg-gray-800 rounded-lg mb-6"
        style={{ borderWidth: 1, borderColor: "rgba(207, 185, 145, 0.2)" }}
      >
        <TouchableOpacity
          onPress={() => setIsAdvancedOpen(!isAdvancedOpen)}
          className="flex-row items-center justify-between py-3 px-4"
          activeOpacity={0.8}
        >
          <Text className="text-white text-base font-sora-bold">
            Advanced Details
          </Text>
          <Ionicons
            name={isAdvancedOpen ? "chevron-down" : "chevron-forward"}
            size={20}
            color="#CFB991"
          />
        </TouchableOpacity>
        {isAdvancedOpen && (
          <View className="px-4 pb-3">
            {/* Fiber & Sugar */}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-white text-sm font-sora mb-1">Fiber (g)</Text>
                <View className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 mb-3">
                  <TextInput
                    className="text-white font-sora"
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    value={fiberG}
                    onChangeText={setFiberG}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              <View className="flex-1">
                <Text className="text-white text-sm font-sora mb-1">Sugar (g)</Text>
                <View className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 mb-3">
                  <TextInput
                    className="text-white font-sora"
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    value={sugarG}
                    onChangeText={setSugarG}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            </View>

            {/* Sodium */}
            <Text className="text-white text-sm font-sora mb-1">Sodium (mg)</Text>
            <View className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 mb-3">
              <TextInput
                className="text-white font-sora"
                placeholder="0"
                placeholderTextColor="#9CA3AF"
                value={sodiumMg}
                onChangeText={setSodiumMg}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Dietary flags */}
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-white font-sora">Vegetarian</Text>
              <Switch value={vegetarian} onValueChange={setVegetarian} />
            </View>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-white font-sora">Vegan</Text>
              <Switch value={vegan} onValueChange={setVegan} />
            </View>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-white font-sora">Gluten</Text>
              <Switch value={gluten} onValueChange={setGluten} />
            </View>

            {/* Allergens */}
            <Text className="text-white text-sm font-sora mb-1">Allergens (comma-separated)</Text>
            <View className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 mb-3">
              <TextInput
                className="text-white font-sora"
                placeholder="milk, eggs, soy"
                placeholderTextColor="#9CA3AF"
                value={allergens}
                onChangeText={setAllergens}
              />
            </View>

            {/* Ingredients */}
            <Text className="text-white text-sm font-sora mb-1">Ingredients</Text>
            <View className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 mb-3">
              <TextInput
                className="text-white font-sora"
                placeholder="Ingredient list"
                placeholderTextColor="#9CA3AF"
                value={ingredients}
                onChangeText={setIngredients}
                multiline
              />
            </View>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      {showDeleteButton ? (
        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={onSubmit}
            disabled={submitting}
            className="flex-1 bg-purdueGold rounded-lg py-4"
            style={{
              shadowColor: "#CFB991",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Text className="text-black text-lg font-sora-bold text-center">
              {submitting ? "Updating..." : submitButtonText}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onDelete}
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
              {submitting ? "Deleting..." : deleteButtonText}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          disabled={submitting}
          onPress={onSubmit}
          className="bg-purdueGold rounded-lg py-4 mb-8"
          style={{
            shadowColor: "#CFB991",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Text className="text-black text-lg font-sora-bold text-center">
            {submitting ? "Submitting..." : submitButtonText}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

