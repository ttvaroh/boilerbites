import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { itemContainsIntolerance } from "../lib/allergenUtils";
import { MenuItem, Station } from "../types/menu";
import MenuItemCard from "./MenuItemCard";

interface UserPreferences {
  vegan_preference?: boolean;
  vegetarian_preference?: boolean;
}

// ============================================================================
// Utility
// ============================================================================

function deduplicateItems(items: MenuItem[]): MenuItem[] {
  const seen = new Set<string>();
  return items.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

// ============================================================================
// Component
// ============================================================================

interface StationListProps {
  stations: Station[];
  expandedStations: Record<string, boolean>;
  collectionStatus: Record<string, boolean>;
  allExpanded: boolean;
  onToggleStation: (stationId: string) => void;
  onToggleAll: () => void;
  onItemPress: (item: MenuItem) => void;
  date?: string;
  userAllergenNames?: string[];
  userPreferences?: UserPreferences;
}

export default function StationList({
  stations,
  expandedStations,
  collectionStatus,
  allExpanded,
  onToggleStation,
  onToggleAll,
  onItemPress,
  date,
  userAllergenNames = [],
  userPreferences
}: StationListProps) {
  // Memoize intolerance checks for performance
  const itemIntoleranceMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    stations.forEach(station => {
      station.items.forEach(item => {
        map[item.id] = itemContainsIntolerance(
          item.allergens,
          userAllergenNames,
          item,
          userPreferences
        );
      });
    });
    return map;
  }, [stations, userAllergenNames, userPreferences]);
  return (
    <View className="py-4">
      {/* Header with Toggle All button */}
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-white text-xl font-sora-bold">Stations</Text>
        <TouchableOpacity
          onPress={onToggleAll}
          className="bg-gray-700 rounded-lg px-3 py-2"
        >
          <Text className="text-white text-sm font-sora">
            {allExpanded ? "Close All" : "Open All"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Station List */}
      {stations.map((station) => {
        const uniqueItems = useMemo(
          () => deduplicateItems(station.items),
          [station.items]
        );
        
        const isExpanded = expandedStations[station.id] ?? true;

        return (
          <View key={station.id}>
            {/* Station Header */}
            <TouchableOpacity
              onPress={() => onToggleStation(station.id)}
              className="flex-row items-center justify-between py-3 px-4 bg-gray-800 rounded-lg mb-2"
              style={{
                borderWidth: 1,
                borderColor: "rgba(207, 185, 145, 0.2)",
              }}
            >
              <View className="flex-row items-center flex-1">
                <Text className="text-white text-base font-sora-bold flex-1">
                  {station.name}
                </Text>
                <Ionicons
                  name="restaurant"
                  size={20}
                  color="#CFB991"
                  style={{ marginRight: 8 }}
                />
              </View>
              <Ionicons
                name={isExpanded ? "chevron-down" : "chevron-forward"}
                size={20}
                color="#CFB991"
              />
            </TouchableOpacity>

            {/* Station Items */}
            {isExpanded && (
              <View className="ml-2 mb-2">
                {uniqueItems.map((item) => {
                  const isCollection = collectionStatus[item.id] || false;
                  const hasIntolerance = itemIntoleranceMap[item.id] || false;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => onItemPress(item)}
                    >
                      <MenuItemCard 
                        item={item} 
                        isCollection={isCollection} 
                        date={date}
                        hasIntolerance={hasIntolerance}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}