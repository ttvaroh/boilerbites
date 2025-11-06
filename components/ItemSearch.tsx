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
}

interface ItemSearchProps {
  onSearch: (query: string, filters: SearchFilters) => void;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  initialFilters?: SearchFilters;
}

const ItemSearchComponent: React.FC<ItemSearchProps> = ({ 
  onSearch, 
  searchQuery: externalSearchQuery, 
  onSearchQueryChange,
  initialFilters
}) => {
  const [internalSearchQuery, setInternalSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  
  // Use external search query if provided, otherwise use internal state
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;
  const setSearchQuery = onSearchQueryChange || setInternalSearchQuery;
  
  const [filters, setFilters] = useState<SearchFilters>(initialFilters || {
    timeOfDay: "All",
    diningHalls: [],
    dietaryPreferences: {
      vegetarian: false,
      vegan: false,
      glutenFree: false,
    },
    excludeAllergens: [],
  });

  const timeOfDayOptions = ["All", "Breakfast", "Lunch", "Late Lunch", "Dinner"];
  const diningHallOptions = ["Wiley", "Earhart", "Ford", "Windsor", "Hillenbrand"];
  const allergenOptions = ["Dairy", "Eggs", "Fish", "Shellfish", "Tree Nuts", "Peanuts", "Wheat", "Soy"];

  // Update filters when initialFilters change
  React.useEffect(() => {
    if (initialFilters) {
      setFilters(initialFilters);
    }
  }, [initialFilters]);

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
    onPress,
    isDisabled = false
  }: {
    label: string;
    isSelected: boolean;
    onPress: () => void;
    isDisabled?: boolean;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={false} // Always allow clicking
      className={`px-3 py-2 rounded-full mr-2 mb-2 ${
        isDisabled 
          ? 'bg-gray-600 opacity-50' 
          : isSelected 
            ? 'bg-purdueGold' 
            : 'bg-gray-700'
      }`}
    >
      <Text className={`text-sm font-sora ${
        isDisabled 
          ? 'text-gray-400' 
          : isSelected 
            ? 'text-black' 
            : 'text-white'
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
              autoCapitalize="none"
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
                    onPress={() => {
                      handleSearch();
                      setShowFilters(false);
                    }}
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