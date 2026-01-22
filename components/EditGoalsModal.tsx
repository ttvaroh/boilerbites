import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useNutritionGoals } from '../contexts/NutritionGoalsContext';
import { calculateSuggestedMacros } from '../lib/nutritionGoalsService';

interface EditGoalsModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

const EditGoalsModal = ({ visible, onClose, onSuccess }: EditGoalsModalProps) => {
  const { goals: nutritionGoals, updateGoals } = useNutritionGoals();
  
  const calorieGoal = nutritionGoals?.calories || 2300;
  const proteinGoal = nutritionGoals?.protein || 115;
  const carbsGoal = nutritionGoals?.carbs || 288;
  const fatGoal = nutritionGoals?.fat || 77;

  // Modal state
  const [tempCalories, setTempCalories] = useState("");
  const [tempProtein, setTempProtein] = useState("");
  const [tempCarbs, setTempCarbs] = useState("");
  const [tempFat, setTempFat] = useState("");

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setTempCalories(calorieGoal.toString());
      setTempProtein("");
      setTempCarbs("");
      setTempFat("");
    }
  }, [visible, calorieGoal]);

  // Calculate remaining calories for suggestions
  const calculateRemainingCalories = () => {
    const calories = parseInt(tempCalories) || calorieGoal;
    const protein = parseInt(tempProtein) || 0;
    const carbs = parseInt(tempCarbs) || 0;
    const fat = parseInt(tempFat) || 0;
    
    const usedCalories = (protein * 4) + (carbs * 4) + (fat * 9);
    return calories - usedCalories;
  };

  // Calculate dynamic suggestions based on what's already entered
  const getDynamicSuggestions = () => {
    const calories = parseInt(tempCalories) || calorieGoal;
    const remainingCalories = calculateRemainingCalories();
    
    const hasProtein = tempProtein !== "";
    const hasCarbs = tempCarbs !== "";
    const hasFat = tempFat !== "";
    
    // Count how many macros are empty
    const emptyCount = [hasProtein, hasCarbs, hasFat].filter(x => !x).length;
    
    if (emptyCount === 0) return { protein: 0, carbs: 0, fat: 0 };
    if (emptyCount === 3) return calculateSuggestedMacros(calories);
    
    // Distribute remaining calories among empty macros
    if (emptyCount === 2) {
      if (hasProtein) {
        // Split remaining between carbs and fat (40/30 ratio)
        const carbCalories = remainingCalories * 0.57; // 40/(40+30)
        const fatCalories = remainingCalories * 0.43; // 30/(40+30)
        return {
          protein: 0,
          carbs: Math.round(carbCalories / 4),
          fat: Math.round(fatCalories / 9),
        };
      } else if (hasCarbs) {
        // Split remaining between protein and fat (30/30 ratio)
        const proteinCalories = remainingCalories * 0.5;
        const fatCalories = remainingCalories * 0.5;
        return {
          protein: Math.round(proteinCalories / 4),
          carbs: 0,
          fat: Math.round(fatCalories / 9),
        };
      } else if (hasFat) {
        // Split remaining between protein and carbs (30/40 ratio)
        const proteinCalories = remainingCalories * 0.43; // 30/(30+40)
        const carbCalories = remainingCalories * 0.57; // 40/(30+40)
        return {
          protein: Math.round(proteinCalories / 4),
          carbs: Math.round(carbCalories / 4),
          fat: 0,
        };
      }
    }
    
    // Only one macro is empty
    if (!hasProtein) {
      return {
        protein: Math.max(0, Math.round(remainingCalories / 4)),
        carbs: 0,
        fat: 0,
      };
    } else if (!hasCarbs) {
      return {
        protein: 0,
        carbs: Math.max(0, Math.round(remainingCalories / 4)),
        fat: 0,
      };
    } else {
      return {
        protein: 0,
        carbs: 0,
        fat: Math.max(0, Math.round(remainingCalories / 9)),
      };
    }
  };

  // Calculate total calories from entered macros
  const calculateEnteredCalories = () => {
    const protein = parseInt(tempProtein) || 0;
    const carbs = parseInt(tempCarbs) || 0;
    const fat = parseInt(tempFat) || 0;
    return (protein * 4) + (carbs * 4) + (fat * 9);
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

  const saveGoals = async (calories: number, protein: number, carbs: number, fat: number) => {
    try {
      await updateGoals({ calories, protein, carbs, fat });
      onClose();
      if (onSuccess) {
        onSuccess("Your daily goals have been updated successfully!");
      }
    } catch (error) {
      console.error('Error saving nutrition goals:', error);
      Alert.alert("Error", "Failed to save your goals. Please try again.");
    }
  };

  const handleClose = () => {
    setTempCalories("");
    setTempProtein("");
    setTempCarbs("");
    setTempFat("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View className="flex-1 justify-end bg-black/60">
        <View className="bg-gray-800 rounded-t-3xl px-6 pb-10 pt-6 max-h-[85%]" style={{
          borderWidth: 1,
          borderColor: "rgba(207, 185, 145, 0.2)",
        }}>
          {/* Modal Header */}
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-white text-2xl font-sora-bold">
              Edit Daily Goals
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              className="p-2"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={28} color="#CFB991" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Calories */}
            <View className="mb-5">
              <Text className="text-white text-sm font-sora-semibold mb-2">
                Daily Calories
              </Text>
              <View className="bg-gray-700 rounded-xl border border-purdueGold/20 flex-row items-center px-4" style={{
                borderColor: "rgba(207, 185, 145, 0.2)",
              }}>
                <Ionicons name="flame" size={20} color="#CFB991" />
                <TextInput
                  value={tempCalories}
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
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-white text-sm font-sora-semibold">
                  Protein
                </Text>
                {tempProtein === "" && getDynamicSuggestions().protein > 0 && (
                  <Text className="text-xs font-sora" style={{ color: '#3B82F6' }}>
                    Suggested: {getDynamicSuggestions().protein}g
                  </Text>
                )}
              </View>
              <View className="bg-gray-700 rounded-xl border flex-row items-center px-4" style={{
                borderColor: "rgba(59, 130, 246, 0.3)",
              }}>
                <Ionicons name="fitness" size={20} color="#3B82F6" />
                <TextInput
                  value={tempProtein}
                  onChangeText={setTempProtein}
                  placeholder={`${proteinGoal}g`}
                  placeholderTextColor="#6B7280"
                  keyboardType="numeric"
                  className="flex-1 text-white text-base font-sora py-4 ml-3"
                />
                <Text className="text-gray-400 text-sm font-sora">g</Text>
              </View>
            </View>

            {/* Carbohydrates */}
            <View className="mb-5">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-white text-sm font-sora-semibold">
                  Carbohydrates
                </Text>
                {tempCarbs === "" && getDynamicSuggestions().carbs > 0 && (
                  <Text className="text-xs font-sora" style={{ color: '#10B981' }}>
                    Suggested: {getDynamicSuggestions().carbs}g
                  </Text>
                )}
              </View>
              <View className="bg-gray-700 rounded-xl border flex-row items-center px-4" style={{
                borderColor: "rgba(16, 185, 129, 0.3)",
              }}>
                <Ionicons name="leaf" size={20} color="#10B981" />
                <TextInput
                  value={tempCarbs}
                  onChangeText={setTempCarbs}
                  placeholder={`${carbsGoal}g`}
                  placeholderTextColor="#6B7280"
                  keyboardType="numeric"
                  className="flex-1 text-white text-base font-sora py-4 ml-3"
                />
                <Text className="text-gray-400 text-sm font-sora">g</Text>
              </View>
            </View>

            {/* Fat */}
            <View className="mb-5">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-white text-sm font-sora-semibold">
                  Fat
                </Text>
                {tempFat === "" && getDynamicSuggestions().fat > 0 && (
                  <Text className="text-xs font-sora" style={{ color: '#EF4444' }}>
                    Suggested: {getDynamicSuggestions().fat}g
                  </Text>
                )}
              </View>
              <View className="bg-gray-700 rounded-xl border flex-row items-center px-4" style={{
                borderColor: "rgba(239, 68, 68, 0.3)",
              }}>
                <Ionicons name="water" size={20} color="#EF4444" />
                <TextInput
                  value={tempFat}
                  onChangeText={setTempFat}
                  placeholder={`${fatGoal}g`}
                  placeholderTextColor="#6B7280"
                  keyboardType="numeric"
                  className="flex-1 text-white text-base font-sora py-4 ml-3"
                />
                <Text className="text-gray-400 text-sm font-sora">g</Text>
              </View>
            </View>

            {/* Current Macros Calorie Display */}
            {(tempProtein !== "" || tempCarbs !== "" || tempFat !== "") && (
              <View className={`rounded-xl p-4 border mt-2 ${
                Math.abs(calculateEnteredCalories() - (parseInt(tempCalories) || calorieGoal)) <= (parseInt(tempCalories) || calorieGoal) * 0.05
                  ? "bg-green-500/10 border-green-500/30"
                  : Math.abs(calculateEnteredCalories() - (parseInt(tempCalories) || calorieGoal)) > (parseInt(tempCalories) || calorieGoal) * 0.15
                  ? "bg-red-500/10 border-red-500/30"
                  : "bg-purdueGold/10 border-purdueGold/30"
              }`}>
                <View className="flex-row items-center justify-between">
                  <Text className={`text-sm font-sora-semibold ${
                    Math.abs(calculateEnteredCalories() - (parseInt(tempCalories) || calorieGoal)) <= (parseInt(tempCalories) || calorieGoal) * 0.05
                      ? "text-green-300"
                      : Math.abs(calculateEnteredCalories() - (parseInt(tempCalories) || calorieGoal)) > (parseInt(tempCalories) || calorieGoal) * 0.15
                      ? "text-red-300"
                      : "text-purdueGold"
                  }`}>
                    Current Macros
                  </Text>
                  <Text className={`text-base font-sora-bold ${
                    Math.abs(calculateEnteredCalories() - (parseInt(tempCalories) || calorieGoal)) <= (parseInt(tempCalories) || calorieGoal) * 0.05
                      ? "text-green-200"
                      : Math.abs(calculateEnteredCalories() - (parseInt(tempCalories) || calorieGoal)) > (parseInt(tempCalories) || calorieGoal) * 0.15
                      ? "text-red-200"
                      : "text-purdueGold"
                  }`}>
                    {calculateEnteredCalories()} cal
                  </Text>
                </View>
                <Text className={`text-xs font-sora mt-1 ${
                  Math.abs(calculateEnteredCalories() - (parseInt(tempCalories) || calorieGoal)) <= (parseInt(tempCalories) || calorieGoal) * 0.05
                    ? "text-green-400"
                    : Math.abs(calculateEnteredCalories() - (parseInt(tempCalories) || calorieGoal)) > (parseInt(tempCalories) || calorieGoal) * 0.15
                    ? "text-red-400"
                    : "text-purdueGold/80"
                }`}>
                  {calculateEnteredCalories() < (parseInt(tempCalories) || calorieGoal)
                    ? `${(parseInt(tempCalories) || calorieGoal) - calculateEnteredCalories()} cal remaining`
                    : calculateEnteredCalories() > (parseInt(tempCalories) || calorieGoal)
                    ? `${calculateEnteredCalories() - (parseInt(tempCalories) || calorieGoal)} cal over target`
                    : "Perfect match!"
                  }
                </Text>
              </View>
            )}

            {/* Helper Info */}
            <View className="bg-purdueGold/10 rounded-xl p-4 border border-purdueGold/30 mt-2 mb-6">
              <View className="flex-row items-start">
                <Ionicons name="bulb" size={18} color="#CFB991" />
                <View className="flex-1 ml-3">
                  <Text className="text-purdueGold text-xs font-sora-semibold mb-1">
                    Smart Suggestions
                  </Text>
                  <Text className="text-purdueGold/80 text-xs font-sora leading-5">
                    Suggestions update based on your calorie goal using a balanced 30/40/30 macro split (protein/carbs/fat).
                  </Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View className="space-y-3">
              <TouchableOpacity
                onPress={handleSubmitGoals}
                className="bg-purdueGold rounded-xl py-4 flex-row items-center justify-center"
                style={{
                  shadowColor: "#CFB991",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <Ionicons name="checkmark-circle" size={22} color="#000000" />
                <Text className="text-black text-base font-sora-semibold ml-2">
                  Save Goals
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleClose}
                className="bg-gray-700 rounded-xl py-4 flex-row items-center justify-center border border-purdueGold/20 mt-2"
                style={{
                  borderColor: "rgba(207, 185, 145, 0.2)",
                }}
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
  );
};

export default EditGoalsModal;
