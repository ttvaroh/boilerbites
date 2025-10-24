import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNutritionCache } from '../contexts/NutritionCacheContext';
import { getTodayDateString } from '../lib/timezone-utils';

interface DailyProgressProps {
  selectedDate?: Date;
}

const DailyProgress = ({ selectedDate = new Date() }: DailyProgressProps) => {
  const { user, getDailyNutrition } = useAuth();
  const { getNutritionData, setNutritionData } = useNutritionCache();
  const [nutritionData, setNutritionDataState] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  // Default values if no data
  const proteinData = { 
    current: nutritionData?.consumed_protein_g || 0, 
    goal: nutritionData?.goal_protein_g || 115, 
    color: '#3B82F6' 
  };
  const carbsData = { 
    current: nutritionData?.consumed_carbs_g || 0, 
    goal: nutritionData?.goal_carbs_g || 288, 
    color: '#10B981' 
  };
  const fatData = { 
    current: nutritionData?.consumed_fat_g || 0, 
    goal: nutritionData?.goal_fat_g || 77, 
    color: '#EF4444' 
  };

  const caloriesConsumed = nutritionData?.consumed_calories || 0;
  const caloriesRemaining = nutritionData?.remaining_calories || 0;
  const caloriesGoal = nutritionData?.goal_calories || 2300;
  const caloriesPercentage = nutritionData?.percent_calories || 0;

  const getProgressPercentage = (current: number, goal: number) => {
    return Math.min((current / goal) * 100, 100);
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
    </View>
  )
}

export default DailyProgress