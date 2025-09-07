import { Ionicons } from "@expo/vector-icons";
import * as React from "react";
import {
  FlatList,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("all");
  const [searchResults, setSearchResults] = React.useState([]);

  const categories = [
    { id: "all", name: "All", icon: "grid" },
    { id: "breakfast", name: "Breakfast", icon: "sunny" },
    { id: "lunch", name: "Lunch", icon: "restaurant" },
    { id: "dinner", name: "Dinner", icon: "moon" },
    { id: "snacks", name: "Snacks", icon: "cafe" },
  ];

  const sampleFoods = [
    {
      id: 1,
      name: "Grilled Chicken Breast",
      category: "lunch",
      calories: 165,
      protein: "31g",
      location: "Ford Dining",
    },
    {
      id: 2,
      name: "Oatmeal with Berries",
      category: "breakfast",
      calories: 150,
      protein: "6g",
      location: "Wiley Dining",
    },
    {
      id: 3,
      name: "Salmon Fillet",
      category: "dinner",
      calories: 206,
      protein: "22g",
      location: "Ford Dining",
    },
    {
      id: 4,
      name: "Greek Yogurt",
      category: "snacks",
      calories: 100,
      protein: "17g",
      location: "Wiley Dining",
    },
    {
      id: 5,
      name: "Quinoa Bowl",
      category: "lunch",
      calories: 222,
      protein: "8g",
      location: "Ford Dining",
    },
  ];

  const performSearch = () => {
    // Simulate search functionality
    const filtered = sampleFoods.filter((food) => {
      const matchesQuery = food.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "all" || food.category === selectedCategory;
      return matchesQuery && matchesCategory;
    });
    setSearchResults(filtered);
  };

  React.useEffect(() => {
    performSearch();
  }, [searchQuery, selectedCategory]);

  const renderFoodItem = ({ item }) => (
    <View className="bg-white p-4 rounded-lg border border-purdueGold mb-3">
      <View className="flex-row justify-between items-start mb-2">
        <Text className="text-lg font-semibold text-purdueBlack-200 flex-1 mr-2">
          {item.name}
        </Text>
        <View className="items-end">
          <Text className="text-purdueGold font-bold">{item.calories} cal</Text>
          <Text className="text-purdueBlack-100 text-sm">
            {item.protein} protein
          </Text>
        </View>
      </View>
      <Text className="text-purdueBlack-100 text-sm mb-2">{item.location}</Text>
      <View className="flex-row">
        <View className="bg-purdueGold px-2 py-1 rounded-full mr-2">
          <Text className="text-purdueBlack-200 text-xs capitalize">
            {item.category}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView className="flex-1 bg-warmWhite">
      <View className="p-6">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-3xl font-bold text-purdueBlack-200 mb-2">
            Search Food
          </Text>
          <Text className="text-lg text-purdueBlack-100">
            Find meals and track nutrition
          </Text>
        </View>

        {/* Search Bar */}
        <View className="mb-6">
          <View className="flex-row items-center bg-white border border-purdueGold rounded-lg px-3">
            <Ionicons name="search" size={20} color="#CEB888" />
            <TextInput
              placeholder="Search for food items..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 p-3 text-purdueBlack-200"
            />
          </View>
        </View>

        {/* Category Filter */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-purdueBlack-200 mb-3">
            Categories
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row space-x-3">
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  onPress={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-full flex-row items-center ${
                    selectedCategory === category.id
                      ? "bg-purdueGold"
                      : "bg-white border border-purdueGold"
                  }`}
                >
                  <Ionicons
                    name={category.icon}
                    size={16}
                    color={
                      selectedCategory === category.id ? "#0d0d0d" : "#CEB888"
                    }
                  />
                  <Text
                    className={`ml-2 font-medium ${
                      selectedCategory === category.id
                        ? "text-purdueBlack-200"
                        : "text-purdueGold"
                    }`}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Search Results */}
        <View>
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-semibold text-purdueBlack-200">
              Search Results
            </Text>
            <Text className="text-purdueBlack-100">
              {searchResults.length} items found
            </Text>
          </View>

          {searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              renderItem={renderFoodItem}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
            />
          ) : (
            <View className="bg-white p-8 rounded-lg border border-purdueGold items-center">
              <Ionicons name="search" size={48} color="#CEB888" />
              <Text className="text-purdueBlack-100 text-center mt-2">
                No results found. Try adjusting your search or category filter.
              </Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
