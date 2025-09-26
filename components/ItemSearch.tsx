import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import BackgroundTemplate from "./BackgroundTemplate";

interface SearchFilters {
  timeOfDay: string;
  diningHalls: string[];
  dietaryPreferences: {
    vegetarian: boolean;
    vegan: boolean;
    glutenFree: boolean;
  };
  excludeAllergens: string[];
  mealAvailabilityOnly: boolean;
}

interface ItemSearchProps {
  onSearch: (query: string, filters: SearchFilters) => void;
  onResults: (results: any[]) => void;
}

const ItemSearchComponent: React.FC<ItemSearchProps> = ({ onSearch, onResults }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState<SearchFilters>({
    timeOfDay: "All",
    diningHalls: [],
    dietaryPreferences: {
      vegetarian: false,
      vegan: false,
      glutenFree: false,
    },
    excludeAllergens: [],
    mealAvailabilityOnly: true,
  });

  const timeOfDayOptions = ["All", "Breakfast", "Lunch", "Dinner"];
  const diningHallOptions = ["Wiley", "Earhart", "Ford", "Windsor", "Hillenbrand"];
  const allergenOptions = ["Dairy", "Eggs", "Fish", "Shellfish", "Tree Nuts", "Peanuts", "Wheat", "Soybeans"];

  const handleSearch = () => {
    onSearch(searchQuery, filters);
  };

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const updateDietaryPreference = (key: keyof SearchFilters['dietaryPreferences'], value: boolean) => {
    setFilters(prev => ({
      ...prev,
      dietaryPreferences: { ...prev.dietaryPreferences, [key]: value }
    }));
  };

  const toggleDiningHall = (hall: string) => {
    setFilters(prev => ({
      ...prev,
      diningHalls: prev.diningHalls.includes(hall)
        ? prev.diningHalls.filter(h => h !== hall)
        : [...prev.diningHalls, hall]
    }));
  };

  const toggleAllergen = (allergen: string) => {
    setFilters(prev => ({
      ...prev,
      excludeAllergens: prev.excludeAllergens.includes(allergen)
        ? prev.excludeAllergens.filter(a => a !== allergen)
        : [...prev.excludeAllergens, allergen]
    }));
  };


  const FilterChip = ({ 
    label, 
    isSelected, 
    onPress 
  }: {
    label: string;
    isSelected: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      className={`px-3 py-2 rounded-full mr-2 mb-2 ${
        isSelected ? 'bg-purdueGold' : 'bg-gray-700'
      }`}
    >
      <Text className={`text-sm font-sora ${
        isSelected ? 'text-black' : 'text-white'
      }`}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <>
        {/* Search Bar */}
        <View className="mb-4">
          <View className="flex-row items-center bg-gray-800 rounded-xl px-4 py-3">
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              className="flex-1 text-white text-base font-sora ml-3"
              placeholder="Search for items (e.g. chicken, pasta, pizza)"
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity
              onPress={() => setShowFilters(!showFilters)}
              className="p-1"
            >
              <Ionicons 
                name="filter" 
                size={20} 
                color={showFilters ? "#CFB991" : "#9CA3AF"} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Modal */}
        <Modal
          visible={showFilters}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <BackgroundTemplate>
            <View className="flex-1 pt-12 px-6">
              {/* Header */}
              <View className="flex-row items-center justify-between mb-8">
                <TouchableOpacity onPress={() => setShowFilters(false)}>
                  <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text className="text-white text-xl font-sora-bold">Filters</Text>
                <View style={{ width: 24 }} />
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Time of Day */}
                <View className="mb-6">
                  <Text className="text-white text-lg font-sora-bold mb-3">Time of Day</Text>
                  <View className="flex-row flex-wrap">
                    {timeOfDayOptions.map((option) => (
                      <FilterChip
                        key={option}
                        label={option}
                        isSelected={filters.timeOfDay === option}
                        onPress={() => updateFilter('timeOfDay', option)}
                      />
                    ))}
                  </View>
                </View>

                {/* Meal Availability Toggle */}
                <View className="mb-6">
                  <TouchableOpacity
                    onPress={() => updateFilter('mealAvailabilityOnly', !filters.mealAvailabilityOnly)}
                    className="flex-row items-center justify-between"
                  >
                    <View>
                      <Text className="text-white text-lg font-sora-bold">Available Meals Only</Text>
                      <Text className="text-gray-400 text-sm">Show only items from currently open meals</Text>
                    </View>
                    <View className={`w-12 h-6 rounded-full ${
                      filters.mealAvailabilityOnly ? 'bg-purdueGold' : 'bg-gray-600'
                    }`}>
                      <View className={`w-5 h-5 bg-white rounded-full mt-0.5 ${
                        filters.mealAvailabilityOnly ? 'ml-6' : 'ml-0.5'
                      }`} />
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Dining Halls */}
                <View className="mb-6">
                  <Text className="text-white text-lg font-sora-bold mb-3">Dining Halls</Text>
                  <View className="flex-row flex-wrap">
                    {diningHallOptions.map((hall) => (
                      <FilterChip
                        key={hall}
                        label={hall}
                        isSelected={filters.diningHalls.includes(hall)}
                        onPress={() => toggleDiningHall(hall)}
                      />
                    ))}
                  </View>
                </View>

                {/* Allergens and Dietary Preferences */}
                <View className="mb-6">
                  <Text className="text-white text-lg font-sora-bold mb-3">Allergens & Dietary Preferences</Text>
                  
                  {/* Dietary Preferences */}
                  <View className="mb-4">
                    <Text className="text-gray-300 text-sm font-sora mb-2">Dietary Preferences</Text>
                    <View className="flex-row flex-wrap">
                      <FilterChip
                        label="Vegetarian"
                        isSelected={filters.dietaryPreferences.vegetarian}
                        onPress={() => updateDietaryPreference('vegetarian', !filters.dietaryPreferences.vegetarian)}
                      />
                      <FilterChip
                        label="Vegan"
                        isSelected={filters.dietaryPreferences.vegan}
                        onPress={() => updateDietaryPreference('vegan', !filters.dietaryPreferences.vegan)}
                      />
                      <FilterChip
                        label="Gluten-Free"
                        isSelected={filters.dietaryPreferences.glutenFree}
                        onPress={() => updateDietaryPreference('glutenFree', !filters.dietaryPreferences.glutenFree)}
                      />
                    </View>
                  </View>

                  {/* Allergens to Exclude */}
                  <View>
                    <Text className="text-gray-300 text-sm font-sora mb-2">Exclude Allergens</Text>
                    <View className="flex-row flex-wrap">
                      {allergenOptions.map((allergen) => (
                        <FilterChip
                          key={allergen}
                          label={allergen}
                          isSelected={filters.excludeAllergens.includes(allergen)}
                          onPress={() => toggleAllergen(allergen)}
                        />
                      ))}
                    </View>
                  </View>
                </View>

                {/* Apply Button */}
                <View className="mt-8 mb-6">
                  <TouchableOpacity
                    onPress={() => setShowFilters(false)}
                    className="bg-purdueGold rounded-xl py-4"
                  >
                    <Text className="text-black text-center font-sora-bold text-lg">
                      Apply Filters
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </BackgroundTemplate>
        </Modal>
        </>
  );
};

export default ItemSearchComponent;