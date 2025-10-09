import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import BackgroundTemplate from "../components/BackgroundTemplate";

export default function ComingSoonPage() {
  const router = useRouter();

  return (
    <BackgroundTemplate paddingBottom={40}>
      <View className="flex-1 justify-center items-center px-6">
        {/* Header */}
        <View className="bg-transparent pt-12 pb-2 px-6 absolute top-0 left-0 right-0">
          <View className="flex-row items-center justify-between mb-0">
            <TouchableOpacity
              onPress={() => router.back()}
              className="flex-row items-center"
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Content */}
        <View className="items-center">
          {/* Icon */}
          <View className="bg-purdueGold rounded-full w-24 h-24 items-center justify-center mb-6">
            <Ionicons name="construct-outline" size={48} color="#0d0d0d" />
          </View>

          {/* Title */}
          <Text className="text-white text-3xl font-sora-bold text-center mb-4">
            Coming Soon
          </Text>

          {/* Description */}
          <Text className="text-gray-300 text-lg font-sora text-center mb-8 leading-6">
            This feature is currently under development.{"\n"}
            We're working hard to bring you something amazing!
          </Text>

          {/* Action Buttons */}
          <View className="w-full max-w-sm">
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/diary")}
              className="bg-purdueGold rounded-lg py-4 mb-4 w-full"
              style={{
                shadowColor: "#CFB991",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <Text className="text-black text-lg font-sora-bold text-center">
                Go to Diary
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.back()}
              className="bg-gray-700 border border-gray-600 rounded-lg py-4"
            >
              <Text className="text-white text-lg font-sora-bold text-center">
                Go Back
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View className="absolute bottom-8 left-0 right-0 px-6">
          <Text className="text-gray-400 text-sm font-sora text-center">
            Stay tuned for updates!
          </Text>
        </View>
      </View>
    </BackgroundTemplate>
  );
}
