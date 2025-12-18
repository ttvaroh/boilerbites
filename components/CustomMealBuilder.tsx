import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { supabase } from "../lib/supabase";
import { fatSecretSearchService } from "../services/searchService";
import ItemSearchComponent from "./ItemSearch";
import SearchItemCard from "./SearchItemCard";

interface MenuItem {
  id: string;
  name: string;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
  serving_size?: string;
  vegetarian?: boolean;
  vegan?: boolean;
  gluten?: boolean;
  allergens?: string[];
  ingredients?: string;
  is_collection?: boolean;
}

interface MealItem {
  item: MenuItem;
  quantity: number;
}

interface CustomMealBuilderProps {
  mealName: string;
  onMealNameChange: (name: string) => void;
  selectedItems: MealItem[];
  onItemsChange: (items: MealItem[]) => void;
  onSave?: () => void;
  isSaving?: boolean;
}

export default function CustomMealBuilder({
  mealName,
  onMealNameChange,
  selectedItems,
  onItemsChange,
  isSaving = false,
}: CustomMealBuilderProps) {
  const [searchMode, setSearchMode] = useState<"purdue" | "fatsecret">("purdue");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MenuItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [collectionStatus, setCollectionStatus] = useState<Record<string, boolean>>({});

  // Calculate aggregated nutrition
  const aggregatedNutrition = useMemo(() => {
    return selectedItems.reduce(
      (acc, mealItem) => {
        const item = mealItem.item;
        const qty = mealItem.quantity;
        return {
          calories: acc.calories + (item.calories || 0) * qty,
          protein_g: acc.protein_g + (item.protein_g || 0) * qty,
          carbs_g: acc.carbs_g + (item.carbs_g || 0) * qty,
          fat_g: acc.fat_g + (item.fat_g || 0) * qty,
          fiber_g: acc.fiber_g + (item.fiber_g || 0) * qty,
          sugar_g: acc.sugar_g + (item.sugar_g || 0) * qty,
          sodium_mg: acc.sodium_mg + (item.sodium_mg || 0) * qty,
        };
      },
      {
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        fiber_g: 0,
        sugar_g: 0,
        sodium_mg: 0,
      }
    );
  }, [selectedItems]);

  // Search Purdue items and Collections
  const searchPurdueItems = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Search for both Purdue items and Collections
      // Filter: system items (user_id is NULL), not FatSecret items
      // Include both regular items (is_collection = false) and collections (is_collection = true)
      const { data, error } = await supabase
        .from("item")
        .select("*")
        .is("user_id", null) // Only system items (Purdue items and collections)
        .not("id", "like", "fatsecret_%")
        .ilike("name", `%${query.trim()}%`)
        .limit(50);

      if (error) {
        console.error("Error searching Purdue items and collections:", error);
        setSearchResults([]);
        return;
      }

      setSearchResults(data || []);
    } catch (err) {
      console.error("Error searching:", err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Search FatSecret items
  const searchFatSecretItems = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, count, error } = await fatSecretSearchService.searchFoods(
        { searchQuery: query.trim() },
        { limit: 50, offset: 0 }
      );

      if (error) {
        console.error("Error searching FatSecret:", error);
        setSearchResults([]);
        return;
      }

      setSearchResults(data);
    } catch (err) {
      console.error("Error searching FatSecret:", err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);


  // Debounce search query
  useEffect(() => {
    // If search is cleared, clear results immediately
    if (!searchQuery.trim()) {
      setDebouncedSearchQuery("");
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 400); // 400ms debounce delay

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Perform search when debounced query changes
  useEffect(() => {
    if (debouncedSearchQuery.trim()) {
      if (searchMode === "purdue") {
        searchPurdueItems(debouncedSearchQuery);
      } else if (searchMode === "fatsecret") {
        searchFatSecretItems(debouncedSearchQuery);
      }
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [debouncedSearchQuery, searchMode, searchPurdueItems, searchFatSecretItems]);

  // Handle search (for manual trigger if needed)
  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      // Debounce will handle the actual search
    },
    []
  );

  // Check if item is a collection
  const checkCollectionStatus = useCallback(async (itemIds: string[]) => {
    try {
      const { data } = await supabase
        .from("item")
        .select("id, is_collection")
        .in("id", itemIds);

      if (data) {
        const status: Record<string, boolean> = {};
        data.forEach((item: any) => {
          status[item.id] = item.is_collection || false;
        });
        setCollectionStatus((prev) => ({ ...prev, ...status }));
      }
    } catch (error) {
      console.error("Error checking collection status:", error);
    }
  }, []);

  // Handle item selection
  const handleItemSelect = useCallback(
    async (item: MenuItem) => {
      // If it's a collection, expand it
      if (collectionStatus[item.id] || item.is_collection) {
        try {
          const { data: collectionItems } = await supabase
            .from("collection_item")
            .select(
              `
              item_id,
              quantity,
              item:item_id (
                id,
                name,
                calories,
                protein_g,
                carbs_g,
                fat_g,
                fiber_g,
                sugar_g,
                sodium_mg,
                serving_size,
                vegetarian,
                vegan,
                gluten,
                allergens,
                ingredients
              )
            `
            )
            .eq("collection_id", item.id);

          if (collectionItems) {
            const expandedItems: MealItem[] = collectionItems.map((ci: any) => ({
              item: ci.item,
              quantity: ci.quantity || 1.0,
            }));

            // Add all items from collection
            onItemsChange([...selectedItems, ...expandedItems]);
          }
        } catch (error) {
          console.error("Error expanding collection:", error);
        }
      } else {
        // Add single item
        const newItem: MealItem = {
          item,
          quantity: 1.0,
        };
        onItemsChange([...selectedItems, newItem]);
      }

      // Clear search
      setSearchQuery("");
      setDebouncedSearchQuery("");
      setSearchResults([]);
    },
    [selectedItems, onItemsChange, collectionStatus]
  );

  // Update quantity
  const updateQuantity = useCallback(
    (index: number, quantity: number) => {
      if (quantity <= 0) return;
      const updated = [...selectedItems];
      updated[index].quantity = quantity;
      onItemsChange(updated);
    },
    [selectedItems, onItemsChange]
  );

  // Remove item
  const removeItem = useCallback(
    (index: number) => {
      const updated = selectedItems.filter((_, i) => i !== index);
      onItemsChange(updated);
    },
    [selectedItems, onItemsChange]
  );

  // Check collection status when search results change
  useEffect(() => {
    const itemIds = searchResults.map((item) => item.id);
    if (itemIds.length > 0) {
      checkCollectionStatus(itemIds);
    }
  }, [searchResults, checkCollectionStatus]);

  return (
    <View className="flex-1">
      {/* Meal Name Input */}
      <View className="mb-4">
        <Text className="text-white text-sm font-sora mb-2">Meal Name</Text>
        <View className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3">
          <TextInput
            className="text-white font-sora text-base"
            placeholder="New Custom Meal"
            placeholderTextColor="#9CA3AF"
            value={mealName}
            onChangeText={onMealNameChange}
            editable={!isSaving}
          />
        </View>
      </View>

      {/* Search Mode Tabs */}
      <View className="flex-row bg-gray-800 rounded-lg p-1 mb-4 border border-gray-700">
        <TouchableOpacity
          onPress={() => {
            setSearchMode("purdue");
            setSearchResults([]);
            setSearchQuery("");
            setDebouncedSearchQuery("");
          }}
          className={`flex-1 items-center py-2 rounded-md ${
            searchMode === "purdue" ? "bg-purdueGold" : ""
          }`}
        >
          <Text
            className={`font-sora text-sm ${
              searchMode === "purdue" ? "text-black" : "text-white"
            }`}
          >
            Purdue
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setSearchMode("fatsecret");
            setSearchResults([]);
            setSearchQuery("");
            setDebouncedSearchQuery("");
          }}
          className={`flex-1 items-center py-2 rounded-md ${
            searchMode === "fatsecret" ? "bg-purdueGold" : ""
          }`}
        >
          <Text
            className={`font-sora text-sm ${
              searchMode === "fatsecret" ? "text-black" : "text-white"
            }`}
          >
            FatSecret
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <ItemSearchComponent
        onSearch={handleSearch}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        hideLocationMealFilters={true}
        disableFilters={true}
        placeholder={
          searchMode === "purdue"
            ? "Search Purdue items and collections..."
            : "Search food globally..."
        }
      />

      {/* Search Results */}
      {isSearching && (
        <View className="py-4 items-center">
          <ActivityIndicator size="small" color="#CFB991" />
          <Text className="text-gray-400 text-sm font-sora mt-2">Searching...</Text>
        </View>
      )}

      {!isSearching && searchResults.length > 0 && (
        <View className="mb-4">
          <View className="flex-row items-center mb-2">
            <Text className="text-white text-sm font-sora-bold">
              Search Results ({searchResults.length})
            </Text>
            {searchMode === "fatsecret" && (
              <Text className="text-gray-500 text-xs font-sora ml-2">
                - Data provided by FatSecret
              </Text>
            )}
          </View>
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleItemSelect(item)}
                className="mb-2"
              >
                <SearchItemCard
                  item={item}
                  showDietaryTag={true}
                  isCollection={collectionStatus[item.id] || false}
                  hideLocation={true}
                />
              </TouchableOpacity>
            )}
            scrollEnabled={false}
            nestedScrollEnabled={true}
          />
        </View>
      )}

      {/* Selected Items */}
      <View className="flex-1">
        <Text className="text-white text-sm font-sora-bold mb-2">
          Selected Items ({selectedItems.length})
        </Text>
        {selectedItems.length === 0 ? (
          <View className="bg-gray-800 rounded-lg p-6 items-center border border-gray-700">
            <Ionicons name="restaurant-outline" size={48} color="#9CA3AF" />
            <Text className="text-gray-400 text-sm font-sora mt-2 text-center">
              No items selected. Search and add items to build your meal.
            </Text>
          </View>
        ) : (
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            {selectedItems.map((mealItem, index) => (
              <View
                key={`${mealItem.item.id}-${index}`}
                className="bg-gray-800 rounded-lg p-4 mb-2 border border-gray-700"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-white font-sora-bold flex-1" numberOfLines={2}>
                    {mealItem.item.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => removeItem(index)}
                    className="ml-2 p-1"
                    disabled={isSaving}
                  >
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </View>
                <View className="flex-row items-center">
                  <Text className="text-gray-300 text-sm font-sora mr-2">
                    Servings {mealItem.item.serving_size ? `(${mealItem.item.serving_size})` : ""}:
                  </Text>
                  <TouchableOpacity
                    onPress={() => updateQuantity(index, mealItem.quantity - 0.25)}
                    disabled={isSaving || mealItem.quantity <= 0.25}
                    className="bg-gray-700 rounded px-3 py-1"
                  >
                    <Text className="text-white font-sora">-</Text>
                  </TouchableOpacity>
                  <TextInput
                    className="bg-gray-700 text-white font-sora text-center mx-2 rounded px-3 py-1 min-w-[60px]"
                    value={mealItem.quantity.toString()}
                    onChangeText={(text) => {
                      const qty = parseFloat(text) || 0;
                      if (qty > 0) updateQuantity(index, qty);
                    }}
                    keyboardType="decimal-pad"
                    editable={!isSaving}
                  />
                  <TouchableOpacity
                    onPress={() => updateQuantity(index, mealItem.quantity + 0.25)}
                    disabled={isSaving}
                    className="bg-gray-700 rounded px-3 py-1"
                  >
                    <Text className="text-white font-sora">+</Text>
                  </TouchableOpacity>
                </View>
                {mealItem.item.calories && (
                  <Text className="text-gray-400 text-xs font-sora mt-1">
                    {(mealItem.item.calories * mealItem.quantity).toFixed(0)} cal •{" "}
                    P: {((mealItem.item.protein_g || 0) * mealItem.quantity).toFixed(2)}g •{" "}
                    C: {((mealItem.item.carbs_g || 0) * mealItem.quantity).toFixed(2)}g •{" "}
                    F: {((mealItem.item.fat_g || 0) * mealItem.quantity).toFixed(2)}g
                  </Text>
                )}
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Nutrition Summary */}
      {selectedItems.length > 0 && (
        <View className="bg-gray-800 rounded-lg p-4 mt-4 border border-gray-700">
          <Text className="text-white font-sora-bold mb-2">Total Nutrition</Text>
          <View className="flex-row flex-wrap">
            <View className="w-1/2 mb-2">
              <Text className="text-gray-400 text-xs font-sora">Calories</Text>
              <Text className="text-white font-sora-bold">
                {aggregatedNutrition.calories.toFixed(0)}
              </Text>
            </View>
            <View className="w-1/2 mb-2">
              <Text className="text-gray-400 text-xs font-sora">Protein</Text>
              <Text className="text-white font-sora-bold">
                {aggregatedNutrition.protein_g.toFixed(2)}g
              </Text>
            </View>
            <View className="w-1/2 mb-2">
              <Text className="text-gray-400 text-xs font-sora">Carbs</Text>
              <Text className="text-white font-sora-bold">
                {aggregatedNutrition.carbs_g.toFixed(2)}g
              </Text>
            </View>
            <View className="w-1/2 mb-2">
              <Text className="text-gray-400 text-xs font-sora">Fat</Text>
              <Text className="text-white font-sora-bold">
                {aggregatedNutrition.fat_g.toFixed(2)}g
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

