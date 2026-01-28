import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import * as React from "react";
import { useCallback } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import BackgroundTemplate from "../../components/BackgroundTemplate";
import DailyProgress from "../../components/DailyProgress";
import FoodEntryCard from "../../components/FoodEntryCard";
import { useAuth } from "../../contexts/AuthContext";
import { useNutritionCache } from "../../contexts/NutritionCacheContext";
import { supabase } from "../../lib/supabase";
import { getLocalDateUTCBounds, getTodayDateString } from "../../lib/timezone-utils";

interface FoodEntry {
  id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meal_name: number;
  created_at: string;
}


export default function DiaryPage() {
  const { user, removeFoodEntry: removeFoodEntryFromDB } = useAuth();
  const { 
    clearNutritionData, 
    getFoodEntries, 
    setFoodEntries: setFoodEntriesCache, 
    clearFoodEntries,
    removeFoodEntry: removeFoodEntryFromCache
  } = useNutritionCache();
  const router = useRouter();
  const [foodEntries, setFoodEntries] = React.useState<FoodEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [expandedMeals, setExpandedMeals] = React.useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [refreshing, setRefreshing] = React.useState(false);
  const [swipedCardId, setSwipedCardId] = React.useState<string | null>(null);

  // Date navigation functions
  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Check if selected date is today
  const isToday = () => {
    const today = new Date();
    return selectedDate.toDateString() === today.toDateString();
  };

  // Fetch food entries for selected date
  const fetchFoodEntries = async (isRefresh = false) => {
    if (!user) {
      // If no user, show empty state
      setFoodEntries([]);
      setLoading(false);
      return;
    }

    try {
      if (!isRefresh) {
        setLoading(true);
      }
      
      // Get date string for cache
      const isToday = selectedDate.toDateString() === new Date().toDateString();
      const dateString = isToday ? getTodayDateString() : selectedDate.toISOString().split('T')[0];
      
      // Check cache first
      const cachedEntries = getFoodEntries(dateString);
      if (cachedEntries && !isRefresh) {
        setFoodEntries(cachedEntries);
        setLoading(false);
      }
      
      // Get proper UTC bounds for the selected local date
      const { start, end } = getLocalDateUTCBounds(selectedDate);
      
      const { data, error } = await supabase
        .from('food_entry')
        .select(`
          id,
          item_id,
          quantity,
          meal_name,
          created_at,
          item:item_id (
            name,
            calories,
            protein_g,
            carbs_g,
            fat_g
          )
        `)
        .eq('user_id', user.id)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching food entries:', error);
        return;
      }

      const transformedEntries: FoodEntry[] = data
        ?.filter((entry: any) => entry.item_id && typeof entry.item_id === 'string' && entry.item_id.trim().length > 0)
        .map((entry: any) => ({
          id: entry.id,
          item_id: entry.item_id,
          item_name: entry.item?.name || 'Unknown Item',
          quantity: entry.quantity,
          calories: ((entry.item?.calories || 0) * entry.quantity),
          protein_g: ((entry.item?.protein_g || 0) * entry.quantity),
          carbs_g: ((entry.item?.carbs_g || 0) * entry.quantity),
          fat_g: ((entry.item?.fat_g || 0) * entry.quantity),
          meal_name: entry.meal_name,
          created_at: entry.created_at,
        })) || [];

      setFoodEntries(transformedEntries);
      // Cache the entries
      setFoodEntriesCache(dateString, transformedEntries);
    } catch (error) {
      console.error('Error fetching food entries:', error);
    } finally {
      if (!isRefresh) {
        setLoading(false);
      }
    }
  };

  // Refresh DailyProgress when page is focused
  useFocusEffect(
    useCallback(() => {
      setRefreshKey(prev => prev + 1);
    }, [])
  );


  // Toggle meal section
  const toggleMealSection = (mealKey: string) => {
    setExpandedMeals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(mealKey)) {
        newSet.delete(mealKey);
      } else {
        newSet.add(mealKey);
      }
      return newSet;
    });
  };

  // Define all meal sections
  const MEAL_SECTIONS = [
    { key: 'uncategorized', title: 'Other', icon: 'ellipsis-horizontal-outline', mealType: 0 },
    { key: 'breakfast', title: 'Breakfast', icon: 'sunny-outline', mealType: 1 },
    { key: 'lunch', title: 'Lunch', icon: 'fast-food-outline', mealType: 2 },
    { key: 'dinner', title: 'Dinner', icon: 'restaurant-outline', mealType: 3 },
    { key: 'snack', title: 'Snacks', icon: 'ice-cream-outline', mealType: 4 },
  ];

  // Get entries for a meal type - already sorted by created_at from database
  const getEntriesForMeal = (mealType: number) => {
    return foodEntries.filter(entry => entry.meal_name === mealType);
  };

  // Calculate totals for entries
  const calculateTotals = (entries: FoodEntry[]) => {
    return entries.reduce((acc, entry) => ({
      calories: acc.calories + entry.calories,
      protein_g: acc.protein_g + entry.protein_g,
      carbs_g: acc.carbs_g + entry.carbs_g,
      fat_g: acc.fat_g + entry.fat_g,
    }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
  };

  // Helper function to get date string for cache clearing
  const getDateStringForEntry = React.useCallback((createdAt: string) => {
    // Parse the entry's created_at timestamp
    const entryDate = new Date(createdAt);
    const today = new Date();
    
    // Check if entry is from today
    const isToday = entryDate.toDateString() === today.toDateString();
    
    if (isToday) {
      return getTodayDateString();
    } else {
      // For past dates, get the local date string
      const year = entryDate.getFullYear();
      const month = String(entryDate.getMonth() + 1).padStart(2, '0');
      const day = String(entryDate.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }, []);

  // Handle entry removal
  const handleRemoveEntry = React.useCallback(async (entryId: string) => {
    if (!user) {
      Alert.alert(
        "Login Required",
        "You need to be logged in to remove food entries.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign In", onPress: () => router.push("/signin") }
        ]
      );
      return;
    }

    // Find the entry to get its date
    const entry = foodEntries.find(e => e.id === entryId);
    if (!entry) return;

    // Optimistic update: remove from local state immediately
    setFoodEntries(prev => prev.filter(e => e.id !== entryId));

    // Get date string for cache operations
    const dateString = getDateStringForEntry(entry.created_at);

    // Remove from cache
    removeFoodEntryFromCache(dateString, entryId);

    // Clear nutrition data cache to force recalculation
    clearNutritionData(dateString);

    try {
      // Delete from database
      const { error } = await removeFoodEntryFromDB(entryId);
      
      if (error) {
        // Revert optimistic update on error
        setFoodEntries(prev => {
          const updated = [...prev, entry];
          // Re-sort by created_at to maintain order
          return updated.sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        });
        
        // Restore cache
        setFoodEntriesCache(dateString, foodEntries);
        
        Alert.alert(
          "Error",
          "Failed to remove food entry. Please try again.",
          [{ text: "OK" }]
        );
        return;
      }

      // Refresh DailyProgress
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      // Revert optimistic update on error
      setFoodEntries(prev => {
        const updated = [...prev, entry];
        return updated.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });
      
      // Restore cache
      setFoodEntriesCache(dateString, foodEntries);
      
      Alert.alert(
        "Error",
        "Failed to remove food entry. Please try again.",
        [{ text: "OK" }]
      );
    }
  }, [user, foodEntries, getDateStringForEntry, removeFoodEntryFromDB, removeFoodEntryFromCache, clearNutritionData, setFoodEntriesCache]);

  // Handle swipe start - close other cards
  const handleSwipeStart = React.useCallback((entryId: string) => {
    // If a different card is being swiped, close the previous one
    if (swipedCardId && swipedCardId !== entryId) {
      setSwipedCardId(null);
    }
    setSwipedCardId(entryId);
  }, [swipedCardId]);

  // Handle swipe end - clear swiped card ID when card is reset
  const handleSwipeEnd = React.useCallback(() => {
    // Clear the swiped card ID when a card resets to position 0
    // This is called from the card when it snaps back
    setSwipedCardId(null);
  }, []);

  // Pull to refresh handler
  const onRefresh = React.useCallback(async () => {
    if (!user) {
      setRefreshing(false);
      return;
    }
    
    setRefreshing(true);
    
    // Get date string for cache operations
    const isToday = selectedDate.toDateString() === new Date().toDateString();
    const dateString = isToday ? getTodayDateString() : selectedDate.toISOString().split('T')[0];
    
    // Clear both caches for the current date
    clearNutritionData(dateString);
    clearFoodEntries(dateString);
    
    await fetchFoodEntries(true);
    setRefreshKey(prev => prev + 1); // Also refresh DailyProgress
    setRefreshing(false);
  }, [user, selectedDate, clearNutritionData, clearFoodEntries]);

  useFocusEffect(
    useCallback(() => {
      fetchFoodEntries();
    }, [user, selectedDate])
  );

  return (
    <BackgroundTemplate paddingBottom={80}>
      <ScrollView 
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#CFB991"
            colors={["#CFB991"]}
          />
        }
      >
        <View className="p-6 pt-14">
          <View className="flex-row items-center justify-between mb-6">
            <TouchableOpacity onPress={goToPreviousDay} className="p-2">
              <Ionicons name="chevron-back" size={24} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={goToToday} className="flex-1 items-center">
              <Text className="text-xl font-sora-bold text-white text-center">
                {isToday() ? "Today" : formatDate(selectedDate)}
              </Text>
              {!isToday() && (
                <Text className="text-sm text-gray-400 mt-1">
                  Tap to go to today
                </Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity onPress={goToNextDay} className="p-2">
              <Ionicons name="chevron-forward" size={24} color="white" />
            </TouchableOpacity>
          </View>
        
          <View className="mb-2">
            <Text className="text-lg font-sora-semibold text-white mb-4">
              {isToday() ? "Today's Summary" : `${formatDate(selectedDate)} Summary`}
            </Text>
            <DailyProgress key={`${refreshKey}-${selectedDate.toISOString()}`} selectedDate={selectedDate} />
          </View>

          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-sora-semibold text-white">
                Log Your Intake
              </Text>
              <TouchableOpacity
                onPress={() => {
                  if (!user) {
                    Alert.alert(
                      "Login Required",
                      "You need to be logged in to add food to your diary.",
                      [
                        { text: "Cancel", style: "cancel" },
                        { text: "Sign In", onPress: () => router.push("/signin") }
                      ]
                    );
                    return;
                  }
                  // Format date in local timezone (YYYY-MM-DD) to avoid UTC issues
                  const year = selectedDate.getFullYear();
                  const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                  const day = String(selectedDate.getDate()).padStart(2, '0');
                  const dateString = `${year}-${month}-${day}`;
                  router.push(`/search-by-date?date=${dateString}`);
                }}
                className="bg-purdueGold rounded-full w-8 h-8 items-center justify-center"
              >
                <Ionicons name="add" size={20} color="#0d0d0d" />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View className="bg-gray-800 rounded-xl p-6 items-center">
                <Text className="text-white text-base font-sora">Loading...</Text>
              </View>
            ) : !user ? (
              <View className="bg-gray-800 rounded-xl p-8 items-center">
                <Ionicons name="lock-closed-outline" size={48} color="#CFB991" />
                <Text className="text-white text-lg font-sora-semibold text-center mt-4 mb-2">
                  Sign in to track your nutrition
                </Text>
                <Text className="text-gray-400 text-sm font-sora text-center mb-6">
                  Create an account to start logging your meals and tracking your daily nutrition goals.
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/signin")}
                  className="bg-purdueGold rounded-xl px-6 py-3 w-full"
                >
                  <Text className="text-black font-sora-semibold text-center">
                    Sign In
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push("/signup")}
                  className="mt-3"
                >
                  <Text className="text-purdueGold font-sora text-center">
                    Don't have an account? Sign up
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                {MEAL_SECTIONS.map(section => {
                  const entries = getEntriesForMeal(section.mealType);
                  const isExpanded = expandedMeals.has(section.key);
                  const totals = calculateTotals(entries);
                  const hasEntries = entries.length > 0;
                  
                  return (
                    <View key={section.key} className="mb-2">
                      <TouchableOpacity
                        onPress={() => hasEntries && toggleMealSection(section.key)}
                        className="bg-gray-800 rounded-xl px-4 py-3"
                        activeOpacity={hasEntries ? 0.7 : 1}
                      >
                        <View className="flex-row items-center justify-between">
                          <View className="flex-1">
                            <View className="flex-row items-center">
                              <Ionicons 
                                name={section.icon as any} 
                                size={18} 
                                color={hasEntries ? "#CFB991" : "#6B7280"} 
                              />
                              <Text className={`text-[1rem] font-sora-semibold ml-2 ${hasEntries ? 'text-white' : 'text-gray-500'}`}>
                                {section.title}
                              </Text>
                            </View>
                            {hasEntries && (
                              <Text className="text-[0.8rem] text-gray-400 font-sora ml-6 mt-1">
                                Protein: {totals.protein_g.toFixed(1)}g • Carbs: {totals.carbs_g.toFixed(1)}g • Fat: {totals.fat_g.toFixed(1)}g
                              </Text>
                            )}
                          </View>

                          <View className="flex-row items-center">
                            {hasEntries ? (
                              <>
                                <View className="items-end mr-2">
                                  <Text className="text-purdueGold text-[1rem] font-sora-semibold">
                                    {Math.round(totals.calories)}
                                  </Text>
                                  <Text className="text-xs text-gray-400 font-sora">
                                    kcal
                                  </Text>
                                </View>
                                <Ionicons 
                                  name={isExpanded ? "chevron-up" : "chevron-down"} 
                                  size={18} 
                                  color="#9CA3AF" 
                                />
                              </>
                            ) : (
                              <Text className="text-gray-500 text-xs font-sora">
                                No items
                              </Text>
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>

                      {isExpanded && hasEntries && (
                        <View className="mt-2 ml-2">
                          {entries.map((entry) => (
                            <FoodEntryCard
                              key={entry.id}
                              entry={entry}
                              onRemove={handleRemoveEntry}
                              isSwiped={swipedCardId === entry.id}
                              onSwipeStart={handleSwipeStart}
                              onSwipeEnd={handleSwipeEnd}
                            />
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </BackgroundTemplate>
  );
}