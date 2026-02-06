import { useRouter } from "expo-router";
import * as React from "react";
import { Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import BackgroundTemplate from "../../components/BackgroundTemplate";
import DiningHallCard from "../../components/DiningHallCard";
import { useAuth } from "../../contexts/AuthContext";
import { useLocationStatus } from "../../hooks/useLocationStatus";
import { useMenuData } from "../../lib/MenuDataContext";

// ============================================================================
// Main Component
// ============================================================================

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { locations, loading, error, refreshLocations, prefetchLocationMenu } = useMenuData();
  const [refreshing, setRefreshing] = React.useState(false);

  // Process locations to determine status and format hours
  const { diningHalls, quickBites, onTheGo, isProcessing } = useLocationStatus(locations);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleDiningHallPress = React.useCallback((name: string) => {
    // OPTIMIZED: Prefetch menu data immediately (don't await - fire and forget)
    // This starts loading data before navigation, making menu appear instantly
    prefetchLocationMenu(name).catch(err => {
      // Silently fail - prefetching shouldn't block navigation
      console.warn(`Failed to prefetch menu for ${name}:`, err);
    });
    
    // Navigate immediately - menu will load from cache or fresh data
    router.push(`/dining-hall/${encodeURIComponent(name)}`);
  }, [router, prefetchLocationMenu]);

  const handleRetry = React.useCallback(async () => {
    try {
      await refreshLocations();
    } catch (error) {
      console.error("Error refreshing dining halls:", error);
      Alert.alert("Error", "Failed to refresh dining hall data");
    }
  }, [refreshLocations]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshLocations();
    } catch (error) {
      console.error("Error refreshing dining halls:", error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshLocations]);

  // ============================================================================
  // Memoized Values
  // ============================================================================

  const userName = React.useMemo(() => {
    return user?.user_metadata?.full_name 
      ? user.user_metadata.full_name.split(' ')[0] 
      : 'Boilermaker';
  }, [user]);

  const isLoading = loading || isProcessing;

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderLocationSection = (
    title: string,
    locations: Array<{ id: number; name: string; hours: string; status: "open" | "closed"; image: any }>
  ) => {
    if (locations.length === 0) return null;

    return (
      <View>
        <Text className="text-white text-2xl font-sora-semibold mb-2 mt-2">
          {title}
        </Text>
        <View className="flex-row flex-wrap justify-start gap-2">
          {locations.map((hall) => (
            <View key={hall.id} className="w-[31.5%]">
              <DiningHallCard
                name={hall.name}
                hours={hall.hours}
                status={hall.status}
                image={hall.image}
                onPress={() => handleDiningHallPress(hall.name)}
              />
            </View>
          ))}
        </View>
      </View>
    );
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <BackgroundTemplate paddingBottom={80}>
      <View className="flex-1">
        {/* Header Section */}
        <View className="bg-transparent pt-14 pb-3 px-6">
          <View className="flex-row items-center justify-between mb-2">
            <View>
              <Text className="text-white text-lg font-sora">Welcome</Text>
              <Text className="text-white text-2xl font-sora-bold">{userName}</Text>
            </View>
          </View>
        </View>

        {/* Main Content */}
        <ScrollView 
          className="flex-1 px-6"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#CFB991"
              colors={["#CFB991"]}
            />
          }
        >
          {/* Loading State */}
          {isLoading ? (
            <View className="flex-1 justify-center items-center py-8">
              <Text className="text-white text-lg font-sora">
                Loading dining halls...
              </Text>
            </View>
          ) : error ? (
            /* Error State */
            <View className="flex-1 justify-center items-center py-8 px-6">
              <Text className="text-purdueBlack-200 text-lg font-sora text-center mb-4">
                Error loading dining halls
              </Text>
              <Text className="text-purdueBlack-200 text-sm font-sora text-center opacity-70 mb-4">
                {error}
              </Text>
              <TouchableOpacity
                onPress={handleRetry}
                className="bg-purdueGold rounded-lg px-6 py-3"
              >
                <Text className="text-purdueBlack-200 font-sora-bold">Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Location Sections */
            <View>
              {renderLocationSection("Dining Halls", diningHalls)}
              {renderLocationSection("Quick Bites", quickBites)}
              {renderLocationSection("On-The-GO!", onTheGo)}
            </View>
          )}
        </ScrollView>
      </View>
    </BackgroundTemplate>
  );
}