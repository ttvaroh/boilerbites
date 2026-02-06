import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  const { getNutritionData, setNutritionData, getCacheInvalidationTime } = useNutritionCache();
  const { goals: nutritionGoals } = useNutritionGoals();
  const [nutritionData, setNutritionDataState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(1));
  
  // Animated values for progress bars
  const caloriesProgressAnim = useRef(new Animated.Value(0)).current;
  const proteinProgressAnim = useRef(new Animated.Value(0)).current;
  const carbsProgressAnim = useRef(new Animated.Value(0)).current;
  const fatProgressAnim = useRef(new Animated.Value(0)).current;

  // Request tracking refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentDateRef = useRef<string>('');
  const previousDataRef = useRef<string>(''); // Track previous nutrition data to prevent unnecessary animations
  const animationRefs = useRef<Animated.CompositeAnimation[]>([]); // Track ongoing animations
  const dataSetForDateRef = useRef<string>(''); // Track if we've already set data for this date
  const animatedToValuesRef = useRef<{
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null>(null); // Track what values we've animated to
  
  // Store cache functions in refs to avoid stale closures
  const getNutritionDataRef = useRef(getNutritionData);
  const setNutritionDataRef = useRef(setNutritionData);
  const getDailyNutritionRef = useRef(getDailyNutrition);
  const getCacheInvalidationTimeRef = useRef(getCacheInvalidationTime);
  
  // Track cache invalidation times to detect when cache is cleared
  const lastInvalidationTimeRef = useRef<number | null>(null);
  
  // Update refs when functions change
  useEffect(() => {
    getNutritionDataRef.current = getNutritionData;
    setNutritionDataRef.current = setNutritionData;
    getDailyNutritionRef.current = getDailyNutrition;
    getCacheInvalidationTimeRef.current = getCacheInvalidationTime;
  }, [getNutritionData, setNutritionData, getDailyNutrition, getCacheInvalidationTime]);

  // Modal state
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [toastAnimation] = useState(new Animated.Value(0));

  // Memoize date string calculation for consistency
  const dateString = useMemo(() => {
    const isToday = selectedDate.toDateString() === new Date().toDateString();
    if (isToday) {
      return getTodayDateString();
    } else {
      const year = selectedDate.getFullYear();
      const month = (selectedDate.getMonth() + 1).toString().padStart(2, "0");
      const day = selectedDate.getDate().toString().padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  }, [selectedDate]);

  // Single effect to handle date changes and data fetching
  useEffect(() => {
    // Cancel any previous in-flight request
    abortControllerRef.current?.abort();
    
    // Stop any ongoing animations
    animationRefs.current.forEach(anim => anim.stop());
    animationRefs.current = [];
    
    // Don't reset animated values - let them animate from current position to new position
    // This creates a smooth transition between dates
    
    // Reset state tracking
    setNutritionDataState(null);
    setLoading(true);
    currentDateRef.current = dateString;
    // Don't reset previousDataRef - let it transition smoothly from previous values
    // This allows the animation to compare old data values with new data values
    // and only animate if they're actually different
    dataSetForDateRef.current = ''; // Reset data set tracking
    // Don't reset animatedToValuesRef - we want to track if we need to animate
    // Reset invalidation time ref for new date
    lastInvalidationTimeRef.current = null;
    
    // Fade out animation for smooth transition
    Animated.timing(fadeAnim, {
      toValue: 0.5,
      duration: 150,
      useNativeDriver: true,
    }).start();
    
      if (!user) {
        setLoading(false);
        return;
      }

    // Create new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    const fetchDate = dateString;
    const updateData = (data: any) => {
      // Only update if this is still the current date and we haven't set data yet
      if (currentDateRef.current !== fetchDate || dataSetForDateRef.current === fetchDate) {
        return;
      }
      
      dataSetForDateRef.current = fetchDate;
      setNutritionDataState(data);
      setLoading(false);
      
      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    };

    const fetchNutritionData = async () => {
      try {
        // Check cache first - if available, use it immediately
        const cachedData = getNutritionDataRef.current(fetchDate);
        if (cachedData) {
          // Use cached data immediately - this is instant
          updateData(cachedData);
          
          // Still fetch fresh data in background to update cache, but don't update state if same
          const { data, error } = await getDailyNutritionRef.current(fetchDate);
          
          if (!abortController.signal.aborted && currentDateRef.current === fetchDate) {
            if (!error && data) {
              // Only update if data actually changed
              const dataKey = `${data.consumed_calories}-${data.consumed_protein_g}-${data.consumed_carbs_g}-${data.consumed_fat_g}`;
              const cachedKey = `${cachedData.consumed_calories}-${cachedData.consumed_protein_g}-${cachedData.consumed_carbs_g}-${cachedData.consumed_fat_g}`;
              
              if (dataKey !== cachedKey) {
                // Data changed, update it
                updateData(data);
                // Update cache with fresh data
                setNutritionDataRef.current(fetchDate, data);
              }
              // If data is the same, don't update cache (prevents unnecessary re-renders)
            }
          }
        } else {
          // No cache, fetch fresh data
          const { data, error } = await getDailyNutritionRef.current(fetchDate);
          
          if (abortController.signal.aborted || currentDateRef.current !== fetchDate) {
            return;
          }
          
        if (error) {
          console.error('Error fetching daily nutrition:', error);
            if (currentDateRef.current === fetchDate) {
              setLoading(false);
            }
        } else {
            updateData(data);
          // Cache the data for future use
          if (data) {
              setNutritionDataRef.current(fetchDate, data);
            }
          }
        }
      } catch (error: any) {
        // Ignore abort errors
        if (error?.name === 'AbortError') {
          return;
        }
        console.error('Error fetching daily nutrition:', error);
        if (currentDateRef.current === fetchDate && dataSetForDateRef.current !== fetchDate) {
        setLoading(false);
        }
      }
    };

    fetchNutritionData();

    // Cleanup: cancel request when date changes or component unmounts
    return () => {
      abortController.abort();
    };
  }, [user, dateString, fadeAnim, caloriesProgressAnim, proteinProgressAnim, carbsProgressAnim, fatProgressAnim]);

  // Watch for cache invalidation and refetch when cache is cleared
  useEffect(() => {
    if (!user) return;

    // Initialize last invalidation time for current date
    const currentInvalidationTime = getCacheInvalidationTimeRef.current(dateString);
    if (currentInvalidationTime !== null) {
      lastInvalidationTimeRef.current = currentInvalidationTime;
    }

    const checkInvalidation = () => {
      // Only check if we're still on the same date
      if (currentDateRef.current !== dateString) {
        return;
      }

      const invalidationTime = getCacheInvalidationTimeRef.current(dateString);
      if (invalidationTime && 
          invalidationTime !== lastInvalidationTimeRef.current) {
        // Cache was invalidated, trigger a refetch
        lastInvalidationTimeRef.current = invalidationTime;
        const fetchFreshData = async () => {
          try {
            const { data, error } = await getDailyNutritionRef.current(dateString);
            if (!error && data && currentDateRef.current === dateString) {
              setNutritionDataState(data);
              setNutritionDataRef.current(dateString, data);
            }
          } catch (error) {
            console.error('Error refetching nutrition data after cache invalidation:', error);
          }
        };
        fetchFreshData();
      }
    };

    // Check immediately
    checkInvalidation();

    // Set up interval to check for cache invalidation (every 500ms)
    // This allows DailyProgress to detect when cache is cleared from other screens
    const interval = setInterval(checkInvalidation, 500);

    return () => clearInterval(interval);
  }, [dateString, user]);

  // Memoize data calculations to prevent unnecessary re-renders
  const proteinData = useMemo(() => ({ 
    current: nutritionData?.consumed_protein_g || 0, 
    goal: nutritionGoals?.protein || 115, 
    color: '#3B82F6' 
  }), [nutritionData?.consumed_protein_g, nutritionGoals?.protein]);
  
  const carbsData = useMemo(() => ({ 
    current: nutritionData?.consumed_carbs_g || 0, 
    goal: nutritionGoals?.carbs || 288, 
    color: '#10B981' 
  }), [nutritionData?.consumed_carbs_g, nutritionGoals?.carbs]);
  
  const fatData = useMemo(() => ({ 
    current: nutritionData?.consumed_fat_g || 0, 
    goal: nutritionGoals?.fat || 77, 
    color: '#EF4444' 
  }), [nutritionData?.consumed_fat_g, nutritionGoals?.fat]);

  const caloriesConsumed = useMemo(() => nutritionData?.consumed_calories || 0, [nutritionData?.consumed_calories]);
  const caloriesGoal = useMemo(() => nutritionGoals?.calories || 2300, [nutritionGoals?.calories]);
  const caloriesRemaining = useMemo(() => caloriesGoal - caloriesConsumed, [caloriesGoal, caloriesConsumed]);
  const caloriesPercentage = useMemo(() => {
    if (caloriesGoal === 0) return 0;
    return (caloriesConsumed / caloriesGoal) * 100;
  }, [caloriesConsumed, caloriesGoal]);

  const getProgressPercentage = (current: number, goal: number) => {
    if (goal === 0) return 0;
    return Math.min((current / goal) * 100, 100);
  };

  // Animate progress bars when nutrition data actually changes
  useEffect(() => {
    // Skip if no nutrition data and we're not loading (to avoid animating on initial mount)
    if (!nutritionData && !loading) {
      return;
    }
    
    // Create a unique key for the current data to detect actual changes
    const dataKey = nutritionData 
      ? `${nutritionData.consumed_calories}-${nutritionData.consumed_protein_g}-${nutritionData.consumed_carbs_g}-${nutritionData.consumed_fat_g}-${caloriesPercentage.toFixed(2)}-${proteinData.goal}-${carbsData.goal}-${fatData.goal}`
      : 'null';
    
    // Only animate if data actually changed (not just because date changed)
    // This allows smooth transitions from previous date's values to new date's values
    if (previousDataRef.current === dataKey) {
      return;
    }
    
    // Update the previous data ref - this tracks the actual data values, not the date
    previousDataRef.current = dataKey;
    
    // Stop any ongoing animations
    animationRefs.current.forEach(anim => anim.stop());
    animationRefs.current = [];
    
    if (nutritionData) {
      const caloriesPct = Math.min(caloriesPercentage, 100);
      const proteinPct = getProgressPercentage(proteinData.current, proteinData.goal);
      const carbsPct = getProgressPercentage(carbsData.current, carbsData.goal);
      const fatPct = getProgressPercentage(fatData.current, fatData.goal);

      // Check if we've already animated to these exact values
      if (animatedToValuesRef.current) {
        const prev = animatedToValuesRef.current;
        const valuesMatch = 
          Math.abs(prev.calories - caloriesPct) < 0.1 &&
          Math.abs(prev.protein - proteinPct) < 0.1 &&
          Math.abs(prev.carbs - carbsPct) < 0.1 &&
          Math.abs(prev.fat - fatPct) < 0.1;
        
        if (valuesMatch) {
          // Already animated to these values, skip animation
          return;
        }
      }

      // Update tracking
      animatedToValuesRef.current = {
        calories: caloriesPct,
        protein: proteinPct,
        carbs: carbsPct,
        fat: fatPct,
      };

      // Animate from current position to new position
      // The animated values will start from wherever they currently are
      const animations = Animated.parallel([
        Animated.timing(caloriesProgressAnim, {
          toValue: caloriesPct,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(proteinProgressAnim, {
          toValue: proteinPct,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(carbsProgressAnim, {
          toValue: carbsPct,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(fatProgressAnim, {
          toValue: fatPct,
          duration: 300,
          useNativeDriver: false,
        }),
      ]);
      
      animationRefs.current.push(animations);
      animations.start(() => {
        // Remove completed animation from tracking
        animationRefs.current = animationRefs.current.filter(anim => anim !== animations);
      });
    } else {
      // Animate to 0 when no data (smooth transition from previous values)
      animatedToValuesRef.current = null;
      
      const resetAnimations = Animated.parallel([
        Animated.timing(caloriesProgressAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(proteinProgressAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(carbsProgressAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(fatProgressAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
      ]);
      
      animationRefs.current.push(resetAnimations);
      resetAnimations.start(() => {
        animationRefs.current = animationRefs.current.filter(anim => anim !== resetAnimations);
      });
    }
  }, [nutritionData, loading, caloriesPercentage, proteinData, carbsData, fatData, caloriesProgressAnim, proteinProgressAnim, carbsProgressAnim, fatProgressAnim]);

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

  const MacroBar = ({ data, label, animValue }: { data: { current: number; goal: number; color: string }; label: string; animValue: Animated.Value }) => {
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
            <Animated.View 
              className="h-2 rounded-full" 
              style={{ 
                backgroundColor: data.color,
                width: animValue.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                })
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
      <Animated.View 
        className="bg-gray-800 rounded-xl p-6 mb-6" 
        style={{
      shadowColor: "#CFB991",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
      borderWidth: 1,
      borderColor: "rgba(207, 185, 145, 0.2)",
          opacity: fadeAnim,
        }}
      >
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
          <Animated.View 
          className="bg-purdueGold h-3 rounded-full" 
            style={{ 
              width: caloriesProgressAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              })
            }}
        />
      </View>
      <Text className="text-xs text-center text-gray-400 mb-6">
        Goal: {Math.round(caloriesGoal).toLocaleString()} calories
      </Text>

      {/* Macronutrient Breakdown */}
      <View>
          <MacroBar data={proteinData} label="Protein" animValue={proteinProgressAnim} />
          <MacroBar data={carbsData} label="Carbs" animValue={carbsProgressAnim} />
          <MacroBar data={fatData} label="Fat" animValue={fatProgressAnim} />
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
      </Animated.View>

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