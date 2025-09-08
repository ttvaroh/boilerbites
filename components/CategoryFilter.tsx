import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

interface CategoryFilterProps {
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export default function CategoryFilter({
  categories,
  activeCategory,
  onCategoryChange,
}: CategoryFilterProps) {
  return (
    <View className="mb-4">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 6 }}
      >
        <View className="flex-row space-x-3">
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              onPress={() => onCategoryChange(category)}
              className={`px-4 py-2 rounded-full ${
                activeCategory === category
                  ? "bg-purdueBlack-200"
                  : "bg-transparent"
              }`}
            >
              <Text
                className={`font-sora-medium ${
                  activeCategory === category
                    ? "text-white"
                    : "text-purdueBlack-200"
                }`}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
