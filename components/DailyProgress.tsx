import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Animated,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNutritionCache } from '../contexts/NutritionCacheContext';
import { useNutritionGoals } from '../contexts/NutritionGoalsContext';
import { getTodayDateString } from '../lib/timezone-utils';
import EditGoalsModal from './EditGoalsModal';

interface DailyProgressProps {
  selectedDate?: Date;
}

const DailyProgress = ({ selectedDate = new Date() }: DailyProgressProps) => {
  const { user, getDailyNutrition } = useAuth();
  const { getNutritionData, setNutritionData } = useNutritionCache();
  const { goals: nutritionGoals } = useNutritionGoals();
  const [nutritionData, setNutritionDataState] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [toastAnimation] = useState(new Animated.Value(0));

  useEffect(() => {
    const fetchNutritionData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Use proper local date string for consistent timezone handling
        const isToday = selectedDate.toDateString() === new Date().toDateString();
        let dateString;
        
        if (isToday) {
          dateString = getTodayDateString();
        } else {
          // For non-today dates, calculate the correct local date string
          const year = selectedDate.getFullYear();
          const month = (selectedDate.getMonth() + 1).toString().padStart(2, "0");
          const day = selectedDate.getDate().toString().padStart(2, "0");
          dateString = `${year}-${month}-${day}`;
        }

        // Check cache first
        const cachedData = getNutritionData(dateString);
        if (cachedData) {
          setNutritionDataState(cachedData);
          setLoading(false);
        }
        
        const { data, error } = await getDailyNutrition(dateString);
        if (error) {
          console.error('Error fetching daily nutrition:', error);
        } else {
          setNutritionDataState(data);
          // Cache the data for future use
          if (data) {
            setNutritionData(dateString, data);
          }
        }
      } catch (error) {
        console.error('Error fetching daily nutrition:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNutritionData();
  }, [user, getDailyNutrition, selectedDate, getNutritionData, setNutritionData]);

  // Use only nutrition goals from nutrition_preferences table
  const proteinData = { 
    current: nutritionData?.consumed_protein_g || 0, 
    goal: nutritionGoals?.protein || 115, 
    color: '#3B82F6' 
  };
  const carbsData = { 
    current: nutritionData?.consumed_carbs_g || 0, 
    goal: nutritionGoals?.carbs || 288, 
    color: '#10B981' 
  };
  const fatData = { 
    current: nutritionData?.consumed_fat_g || 0, 
    goal: nutritionGoals?.fat || 77, 
    color: '#EF4444' 
  };

  const caloriesConsumed = nutritionData?.consumed_calories || 0;
  const caloriesGoal = nutritionGoals?.calories || 2300;
  const caloriesRemaining = caloriesGoal - caloriesConsumed;
  const caloriesPercentage = (caloriesConsumed / caloriesGoal) * 100;

  const getProgressPercentage = (current: number, goal: number) => {
    return Math.min((current / goal) * 100, 100);
  };

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

  const openEditModal = () => {
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
  };

  const handleSuccess = (message: string) => {
    showToast(message);
  };

  const MacroBar = ({ data, label }: { data: { current: number; goal: number; color: string }; label: string }) => {
    const percentage = getProgressPercentage(data.current, data.goal);
    
    return (
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center flex-1">
          <View 
            className="w-3 h-3 rounded-full mr-3" 
            style={{ backgroundColor: data.color }}
          />
          <Text className="text-white text-sm font-sora flex-1">{label}</Text>
        </View>
        <View className="flex-1 ml-4">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-gray-400 text-xs font-sora">
              {data.current.toFixed(1)}g / {data.goal.toFixed(1)}g
            </Text>
          </View>
          <View className="w-full bg-gray-700 rounded-full h-2">
            <View 
              className="h-2 rounded-full" 
              style={{ 
                backgroundColor: data.color,
                width: `${percentage}%`
              }}
            />
          </View>
        </View>
      </View>
    );
  };

  // Remove the loading state display - keep showing existing data while loading

  if (!user) {
    return (
      <View className="bg-gray-800 rounded-xl p-6 mb-6" style={{
        shadowColor: "#CFB991",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        borderWidth: 1,
        borderColor: "rgba(207, 185, 145, 0.2)",
      }}>
        <View className="flex-row items-center justify-center py-8">
          <Text className="text-gray-400 text-lg font-sora text-center">
            Sign in to track your daily nutrition
          </Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <View className="bg-gray-800 rounded-xl p-6 mb-6" style={{
        shadowColor: "#CFB991",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        borderWidth: 1,
        borderColor: "rgba(207, 185, 145, 0.2)",
      }}>
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-lg font-sora-semibold text-white">
            {selectedDate.toDateString() === new Date().toDateString() 
              ? "Today's Progress" 
              : "Daily Progress"
            }
          </Text>
          <Text className="text-sm text-gray-400">
            {selectedDate.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </Text>
        </View>
        
        <View className="flex-row justify-between mb-6">
          <View className="flex-1 items-center">
            <Text className="text-2xl font-sora-bold text-purdueGold">
              {Math.round(caloriesConsumed).toLocaleString()}
            </Text>
            <Text className="text-xs text-gray-400">Consumed</Text>
          </View>
          <View className="flex-1 items-center">
            <Text className="text-2xl font-sora-bold text-white">
              {Math.round(caloriesRemaining).toLocaleString()}
            </Text>
            <Text className="text-xs text-gray-400">Remaining</Text>
          </View>
        </View>
        
        <View className="w-full bg-gray-700 rounded-full h-3 mb-2">
          <View 
            className="bg-purdueGold h-3 rounded-full" 
            style={{ width: `${Math.min(caloriesPercentage, 100)}%` }}
          />
        </View>
        <Text className="text-xs text-center text-gray-400 mb-6">
          Goal: {Math.round(caloriesGoal).toLocaleString()} calories
        </Text>

        {/* Macronutrient Breakdown */}
        <View>
          <MacroBar data={proteinData} label="Protein" />
          <MacroBar data={carbsData} label="Carbs" />
          <MacroBar data={fatData} label="Fat" />
        </View>

        {/* Edit Button - Bottom Right */}
        {selectedDate.toDateString() === new Date().toDateString() && (
          <View className="absolute bottom-2 right-2">
            <TouchableOpacity
              onPress={openEditModal}
              className="bg-purdueGold/20 rounded-full p-2"
              style={{
                shadowColor: "#CFB991",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 3,
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="create" size={16} color="#CFB991" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Edit Goals Modal */}
      <EditGoalsModal
        visible={isModalVisible}
        onClose={closeModal}
        onSuccess={handleSuccess}
      />

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
    </>
  )
}

export default DailyProgress