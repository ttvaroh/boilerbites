import { Ionicons } from "@expo/vector-icons";
import * as React from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import BackgroundTemplate from "../../components/BackgroundTemplate";
import DailyProgress from "../../components/DailyProgress";
import FoodEntryCard from "../../components/FoodEntryCard";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
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
  const { user, removeFoodEntry } = useAuth();
  const [foodEntries, setFoodEntries] = React.useState<FoodEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [newMeal, setNewMeal] = React.useState({
    name: "",
    mealType: "",
    calories: "",
  });

  // Fetch today's food entries
  const fetchFoodEntries = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
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
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching food entries:', error);
        return;
      }

      // Transform the data to match our interface
      const transformedEntries: FoodEntry[] = data?.map((entry: any) => ({
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
    } catch (error) {
      console.error('Error fetching food entries:', error);
    } finally {
      setLoading(false);
    }
  };

  // Remove food entry
  const handleRemoveEntry = async (entryId: string) => {
    try {
      const { error } = await removeFoodEntry(entryId);
      if (error) {
        Alert.alert('Error', 'Failed to remove food entry. Please try again.');
        return;
      }
      
      // Remove from local state
      setFoodEntries(prev => prev.filter(entry => entry.id !== entryId));
    } catch (error) {
      Alert.alert('Error', 'Failed to remove food entry. Please try again.');
      console.error('Remove food entry error:', error);
    }
  };

  // Group entries by meal type
  const groupEntriesByMeal = (entries: FoodEntry[]) => {
    const grouped = {
      breakfast: entries.filter(entry => entry.meal_name === 1),
      lunch: entries.filter(entry => entry.meal_name === 2),
      dinner: entries.filter(entry => entry.meal_name === 3),
      snack: entries.filter(entry => entry.meal_name === 4),
      uncategorized: entries.filter(entry => entry.meal_name === 0),
    };
    return grouped;
  };

  React.useEffect(() => {
    fetchFoodEntries();
  }, [user]);

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
                onPress={() => {
                  // TODO: Implement add meal functionality
                  setShowAddForm(false);
                }}
                className="bg-purdueGold p-3 rounded-lg"
              >
                <Text className="text-white text-center font-sora-semibold">
                  Add Meal
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Food Entries List */}
          {loading ? (
            <View className="bg-gray-800 rounded-xl p-6 items-center">
              <Text className="text-white text-lg font-sora">Loading food entries...</Text>
            </View>
          ) : foodEntries.length === 0 ? (
            <View className="bg-gray-800 rounded-xl p-6 items-center">
              <Ionicons name="restaurant-outline" size={48} color="#9CA3AF" />
              <Text className="text-gray-300 text-lg font-sora mt-4 text-center">
                No food entries for today
              </Text>
              <Text className="text-gray-400 text-sm font-sora mt-2 text-center">
                Add your first meal to start tracking!
              </Text>
            </View>
          ) : (
            (() => {
              const groupedEntries = groupEntriesByMeal(foodEntries);
              const mealSections = [
                { key: 'breakfast', title: 'Breakfast', entries: groupedEntries.breakfast },
                { key: 'lunch', title: 'Lunch', entries: groupedEntries.lunch },
                { key: 'dinner', title: 'Dinner', entries: groupedEntries.dinner },
                { key: 'snack', title: 'Snacks', entries: groupedEntries.snack },
                { key: 'uncategorized', title: 'Other', entries: groupedEntries.uncategorized },
              ];
              
              return mealSections.map(section => {
                if (section.entries.length === 0) return null;
                
                return (
                  <View key={section.key} className="mb-4">
                    <Text className="text-white text-lg font-sora-semibold mb-3">
                      {section.title}
                    </Text>
                    {section.entries.map((entry) => (
                      <FoodEntryCard
                        key={entry.id}
                        entry={entry}
                        onRemove={handleRemoveEntry}
                      />
                    ))}
                  </View>
                );
              });
            })()
          )}
        </View>
        </View>
      </ScrollView>
    </BackgroundTemplate>
  );
}
