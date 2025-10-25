import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { MenuItem, Station } from "../types/menu";
import MenuItemCard from "./MenuItemCard";

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
}

export default function StationList({
  stations,
  expandedStations,
  collectionStatus,
  allExpanded,
  onToggleStation,
  onToggleAll,
  onItemPress
}: StationListProps) {
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
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => onItemPress(item)}
                    >
                      <MenuItemCard item={item} isCollection={isCollection} />
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