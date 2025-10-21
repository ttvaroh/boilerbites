import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Modal,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import BackgroundTemplate from "./BackgroundTemplate";

interface SortByProps {
  visible: boolean;
  onClose: () => void;
  onSortChange: (sortBy: string, order: 'highest' | 'lowest') => void;
  currentSort?: string;
  currentOrder?: 'highest' | 'lowest';
}

const SortBy: React.FC<SortByProps> = ({ 
  visible, 
  onClose, 
  onSortChange, 
  currentSort = "Protein/Calorie",
  currentOrder = "highest"
}) => {
  const [selectedSort, setSelectedSort] = useState(currentSort);
  const [selectedOrder, setSelectedOrder] = useState<'highest' | 'lowest'>(currentOrder);

  const sortOptions = [
    { key: "Protein/Calorie", label: "Protein/Calorie" },
    { key: "Protein", label: "Protein" },
    { key: "Fat", label: "Fat" },
    { key: "Carbs", label: "Carbs" },
    { key: "Calories", label: "Calories" },
  ];

  const handleApply = () => {
    onSortChange(selectedSort, selectedOrder);
    onClose();
  };

  const handleClearSort = () => {
    onSortChange('', 'highest');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <BackgroundTemplate>
        <View className="flex-1 pt-12 px-6">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-8">
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-white text-xl font-sora-bold">Sort by</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Order Selection */}
          <View className="mb-8">
            <View className="flex-row">
              <TouchableOpacity
                onPress={() => setSelectedOrder('highest')}
                className={`flex-1 flex-row items-center justify-center py-4 rounded-l-xl ${
                  selectedOrder === 'highest' ? 'bg-gray-600' : 'bg-transparent'
                }`}
              >
                <Ionicons 
                  name="arrow-up" 
                  size={20} 
                  color={selectedOrder === 'highest' ? 'white' : '#9CA3AF'} 
                />
                <Text className={`ml-2 font-sora ${
                  selectedOrder === 'highest' ? 'text-white' : 'text-gray-400'
                }`}>
                  Highest
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => setSelectedOrder('lowest')}
                className={`flex-1 flex-row items-center justify-center py-4 rounded-r-xl ${
                  selectedOrder === 'lowest' ? 'bg-gray-600' : 'bg-transparent'
                }`}
              >
                <Ionicons 
                  name="arrow-down" 
                  size={20} 
                  color={selectedOrder === 'lowest' ? 'white' : '#9CA3AF'} 
                />
                <Text className={`ml-2 font-sora ${
                  selectedOrder === 'lowest' ? 'text-white' : 'text-gray-400'
                }`}>
                  Lowest
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sort Options Grid */}
          <View className="flex-row flex-wrap justify-between">
            {sortOptions.map((option, index) => (
              <TouchableOpacity
                key={option.key}
                onPress={() => setSelectedSort(option.key)}
                className={`w-[48%] py-4 px-4 mb-4 rounded-xl ${
                  selectedSort === option.key ? 'bg-purdueGold' : 'bg-gray-800'
                }`}
              >
                <View className="flex-row items-center">
                  <View className={`w-5 h-5 rounded-full border-2 mr-3 ${
                    selectedSort === option.key 
                      ? 'border-black bg-black' 
                      : 'border-gray-400 bg-transparent'
                  }`}>
                    {selectedSort === option.key && (
                      <View className="w-3 h-3 bg-white rounded-full m-0.5" />
                    )}
                  </View>
                  <Text className={`font-sora ${
                    selectedSort === option.key ? 'text-black' : 'text-white'
                  }`}>
                    {option.label}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Action Buttons */}
          <View className="mt-8 space-y-4">
            {/* Clear Sort Button */}
            <TouchableOpacity
              onPress={handleClearSort}
              className="bg-gray-700 rounded-xl py-4"
            >
              <Text className="text-white text-center font-sora-semibold text-lg">
                Clear Sort
              </Text>
            </TouchableOpacity>
            
            {/* Apply Button */}
            <TouchableOpacity
              onPress={handleApply}
              className="bg-purdueGold rounded-xl py-4"
            >
              <Text className="text-black text-center font-sora-bold text-lg">
                Apply
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </BackgroundTemplate>
    </Modal>
  );
};

export default SortBy;
