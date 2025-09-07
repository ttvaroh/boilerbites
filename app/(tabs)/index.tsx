import { Ionicons } from "@expo/vector-icons";
import * as React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { getDining } from "../../api";
import StatsCard from "../../components/StatsCard";

export default function HomePage() {
  const [data, setData] = React.useState<any>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const load = async () => {
    setErr(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const jsonMealData = await getDining("Ford", today);
      setData(jsonMealData);
    } catch (error: any) {
      setErr(String(error?.message || error));
      setData(null);
    }
  };

  React.useEffect(() => {
    load();
  }, []);

  return (
    <ScrollView className="flex-1 bg-warmWhite">
      <View className="p-6">
        {/* Header Section */}
        <View className="mb-8">
          <Text className="text-4xl font-bold text-purdueBlack-200 mb-2">
            Welcome to BoilerBites!
          </Text>
          <Text className="text-lg text-purdueBlack-100">
            Your Purdue dining companion
          </Text>
        </View>

        {/* Quick Actions */}
        <View className="mb-8">
          <Text className="text-xl font-semibold text-purdueBlack-200 mb-4">
            Quick Actions
          </Text>
          <View className="flex-row space-x-4">
            <TouchableOpacity className="flex-1 bg-purdueGold p-4 rounded-lg items-center">
              <Ionicons name="add-circle" size={24} color="#0d0d0d" />
              <Text className="text-purdueBlack-200 font-semibold mt-2">
                Log Meal
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Dining Locations */}
        <View className="mb-8">
          <Text className="text-xl font-semibold text-purdueBlack-200 mb-4">
            Dining Locations
          </Text>
          <View className="bg-white p-4 rounded-lg border border-purdueGold">
            {err ? (
              <Text className="text-red-500 text-center">{err}</Text>
            ) : data ? (
              <Text className="text-purdueBlack-100">
                Dining locations loaded successfully!
              </Text>
            ) : (
              <Text className="text-purdueBlack-100 text-center">
                Loading dining locations...
              </Text>
            )}
            <TouchableOpacity
              onPress={load}
              className="bg-purdueBlack-200 mt-3 p-3 rounded-lg"
            >
              <Text className="text-purdueGold text-center font-semibold">
                Refresh Locations
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Section */}
        <View className="mb-8">
          <Text className="text-xl font-semibold text-purdueBlack-200 mb-4">
            Your Stats
          </Text>
          <View className="flex-row space-x-4">
            <StatsCard
              title="Open Halls"
              value="3"
              subtitle="Currently Open"
              icon="restaurant"
              variant="highlight"
            />
            <StatsCard
              title="Today's Calories"
              value="1,250"
              subtitle="Goal: 2,000"
              icon="flame"
            />
          </View>
          <View className="mt-4">
            <StatsCard
              title="Today's Protein"
              value="85g"
              subtitle="Goal: 120g"
              icon="fitness"
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
