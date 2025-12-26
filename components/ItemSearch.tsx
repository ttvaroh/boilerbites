import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { fatSecretSearchService } from "../services/searchService";
import BackgroundTemplate from "./BackgroundTemplate";
import BarcodeScanner from "./BarcodeScanner";

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

interface RateLimitInfo {
  canSearch: boolean;
  requestsRemaining: number;
  timeUntilNextRequest: number;
}

interface ItemSearchProps {
  onSearch: (query: string, filters: SearchFilters) => void;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  initialFilters?: SearchFilters;
  hideLocationMealFilters?: boolean;
  disableFilters?: boolean;
  selectedDatabase?: 'fatsecret';
  onDatabaseChange?: (database: 'fatsecret') => void;
  rateLimitInfo?: RateLimitInfo;
  requireSearchButton?: boolean;
  placeholder?: string;
}

const ItemSearchComponent: React.FC<ItemSearchProps> = ({ 
  onSearch, 
  searchQuery: externalSearchQuery, 
  onSearchQueryChange,
  initialFilters,
  hideLocationMealFilters = false,
  disableFilters = false,
  selectedDatabase = 'fatsecret',
  onDatabaseChange,
  rateLimitInfo,
  requireSearchButton = false,
  placeholder
}) => {
  const router = useRouter();
  const [internalSearchQuery, setInternalSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [isSearchingBarcode, setIsSearchingBarcode] = useState(false);
  const isNavigatingRef = React.useRef(false);
  
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
          <View className="flex-row items-center bg-gray-800 rounded-xl px-4 py-3" style={{ minHeight: 48, maxHeight: 48 }}>
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              className="flex-1 text-white text-base font-sora ml-3"
              placeholder={placeholder || "Search for items from Purdue..."}
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={requireSearchButton ? undefined : handleSearch}
              autoCapitalize="none"
              editable={true}
              multiline={false}
              style={{ paddingVertical: 0, height: 24 }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery("");
                  if (onSearchQueryChange) {
                    onSearchQueryChange("");
                  }
                }}
                className="p-1 ml-2"
              >
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => setShowBarcodeScanner(true)}
              className="p-1 ml-2"
            >
              <Ionicons name="barcode-outline" size={20} color="#9CA3AF" />
            </TouchableOpacity>
            {requireSearchButton && (
              <TouchableOpacity
                onPress={handleSearch}
                disabled={!rateLimitInfo?.canSearch || !searchQuery.trim()}
                className="ml-2 px-3 py-1 bg-purdueGold rounded-lg"
                style={{ opacity: (!rateLimitInfo?.canSearch || !searchQuery.trim()) ? 0.5 : 1 }}
              >
                <Text className="text-black text-sm font-sora-semibold">Search</Text>
              </TouchableOpacity>
            )}
            {!disableFilters && (
              <TouchableOpacity
                onPress={() => setShowFilters(!showFilters)}
                className="p-1 ml-2"
              >
                <Ionicons 
                  name="filter" 
                  size={20} 
                  color={showFilters ? "#CFB991" : "#9CA3AF"} 
                />
              </TouchableOpacity>
            )}
          </View>
          {requireSearchButton && rateLimitInfo && (
            <View className="mt-2 flex-row items-center justify-between">
              <Text className="text-gray-400 text-xs font-sora">
                {rateLimitInfo.requestsRemaining} searches remaining
              </Text>
              {!rateLimitInfo.canSearch && rateLimitInfo.timeUntilNextRequest > 0 && (
                <Text className="text-yellow-400 text-xs font-sora">
                  Wait {rateLimitInfo.timeUntilNextRequest}s
                </Text>
              )}
            </View>
          )}
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
                {/* Database Selection */}
                {onDatabaseChange && (
                  <View className="mb-6">
                    <Text className="text-white text-lg font-sora-bold mb-3">Search Database</Text>
                    <View className="flex-row flex-wrap gap-2">
                      <FilterChip
                        label="FatSecret"
                        isSelected={selectedDatabase === 'fatsecret'}
                        onPress={() => onDatabaseChange('fatsecret')}
                      />
                    </View>
                  </View>
                )}

                {/* Time of Day */}
                {!hideLocationMealFilters && (
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
                )}

                {/* Dining Halls */}
                {!hideLocationMealFilters && (
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
                )}

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

        {/* Barcode Scanner Modal */}
        <BarcodeScanner
          visible={showBarcodeScanner}
          isSearching={isSearchingBarcode}
          onClose={() => {
            setShowBarcodeScanner(false);
            setIsSearchingBarcode(false);
            isNavigatingRef.current = false;
          }}
          onScan={async (barcode) => {
            if (isSearchingBarcode || isNavigatingRef.current) return;
            
            setIsSearchingBarcode(true);
            setShowBarcodeScanner(false);

            try {
              const result = await fatSecretSearchService.lookupFoodByBarcode(barcode);

              if (result.error) {
                Alert.alert(
                  "Search Error",
                  "Failed to search for product. Please try again.",
                  [{ text: "OK" }]
                );
                setIsSearchingBarcode(false);
                isNavigatingRef.current = false;
                return;
              }

              if (result.notFound) {
                Alert.alert(
                  "Product Not Found",
                  "This product was not found in our database. Please try scanning again or search manually.",
                  [{ text: "OK" }]
                );
                setIsSearchingBarcode(false);
                isNavigatingRef.current = false;
                return;
              }

              if (result.data) {
                if (isNavigatingRef.current) {
                  setIsSearchingBarcode(false);
                  return;
                }
                isNavigatingRef.current = true;

                const item = result.data;
                try {
                  const { supabase } = await import("../lib/supabase");
                  const { data: existingItem } = await supabase
                    .from("item")
                    .select("id")
                    .eq("id", item.id)
                    .maybeSingle();

                  if (!existingItem) {
                    // Create item in database
                    const protein_per_100cals = item.calories && item.calories > 0 && item.protein_g
                      ? (item.protein_g / item.calories) * 100
                      : null;

                    await supabase.rpc("create_item", {
                      p_id: item.id,
                      p_name: item.name,
                      p_vegetarian: item.vegetarian ?? null,
                      p_vegan: item.vegan ?? null,
                      p_gluten: item.gluten ?? null,
                      p_allergens: item.allergens ?? [],
                      p_serving_size: item.serving_size ?? null,
                      p_calories: item.calories ?? null,
                      p_protein_g: item.protein_g ?? null,
                      p_carbs_g: item.carbs_g ?? null,
                      p_fat_g: item.fat_g ?? null,
                      p_fiber_g: item.fiber_g ?? null,
                      p_sugar_g: item.sugar_g ?? null,
                      p_sodium_mg: item.sodium_mg ?? null,
                      p_protein_per_100cals: protein_per_100cals,
                      p_ingredients: item.ingredients ?? null,
                      p_is_collection: false,
                      p_is_available: true,
                      p_user_id: null,
                      p_source: 1, // FatSecret
                    });
                  }
                } catch (error) {
                  console.error("Error ensuring FatSecret item exists in database:", error);
                }

                router.push(`/nutrition/${item.id}?source=fatsecret`);
                setTimeout(() => {
                  isNavigatingRef.current = false;
                }, 1000);
              } else {
                Alert.alert(
                  "Product Not Found",
                  "This product was not found in our database. Please try scanning again or search manually.",
                  [{ text: "OK" }]
                );
                isNavigatingRef.current = false;
              }
            } catch (error) {
              console.error("Barcode search error:", error);
              Alert.alert(
                "Error",
                "An error occurred while searching for the product. Please try again.",
                [{ text: "OK" }]
              );
              isNavigatingRef.current = false;
            } finally {
              setIsSearchingBarcode(false);
            }
          }}
        />
        </>
  );
};

export default ItemSearchComponent;