/**
 * Health App Connections Page
 * Allows users to connect/disconnect health apps
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import BackgroundTemplate from "../components/BackgroundTemplate";
import HealthConnectionCard from "../components/HealthConnectionCard";
import { useAuth } from "../contexts/AuthContext";

export default function HealthConnectionsPage() {
  const router = useRouter();
  const { user } = useAuth();

  if (!user) {
    return (
      <BackgroundTemplate paddingBottom={0}>
        <View className="px-6 pt-16">
          <View className="flex-row items-center mb-6">
            <TouchableOpacity
              onPress={() => router.back()}
              className="mr-4"
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text className="text-white text-2xl font-sora-bold">
              Health App Connections
            </Text>
          </View>
        </View>
        <View className="flex-1 justify-center items-center px-6">
          <View
            style={{
              backgroundColor: "rgba(207, 185, 145, 0.1)",
              borderWidth: 1,
              borderColor: "rgba(207, 185, 145, 0.2)",
            }}
            className="w-16 h-16 rounded-full items-center justify-center mb-5"
          >
            <Ionicons name="fitness-outline" size={32} color="#CFB991" />
          </View>
          <Text className="text-white text-lg font-sora-semibold text-center mb-2">
            Sign in to get started
          </Text>
          <Text className="text-gray-400 text-sm font-sora text-center leading-5 mb-6 px-4">
            Create an account or sign in to connect Apple Health, Fitbit, and
            more.
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/signin")}
            activeOpacity={0.8}
            style={{
              backgroundColor: "#CFB991",
              shadowColor: "#CFB991",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
            }}
            className="rounded-xl py-3.5 px-8 flex-row items-center"
          >
            <Text className="text-[#0a0a0a] text-sm font-sora-semibold mr-2">
              Sign In
            </Text>
            <Ionicons name="arrow-forward" size={16} color="#0a0a0a" />
          </TouchableOpacity>
        </View>
      </BackgroundTemplate>
    );
  }

  return (
    <BackgroundTemplate paddingBottom={0}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-16 pb-8">
          {/* Header */}
          <View className="flex-row items-center mb-6">
            <TouchableOpacity
              onPress={() => router.back()}
              className="mr-4"
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text className="text-white text-2xl font-sora-bold">
              Health App Connections
            </Text>
          </View>

          {/* Description */}
          <View className="bg-gray-800/60 backdrop-blur-xl rounded-2xl p-5 border border-gray-700/50 mb-6">
            <Text className="text-gray-300 text-base font-sora leading-6">
              Connect BoilerBites to your favorite health apps to automatically
              sync your nutrition data. Your food entries will be shared with
              connected apps to give you a unified health tracking experience.
            </Text>
          </View>

          {/* Apple Health Card */}
          <HealthConnectionCard
            appType="apple_health"
            appName="Apple Health"
            appIcon="heart"
            appColor="#FF3B30"
          />

          {/* Fitbit Card */}
          <HealthConnectionCard
            appType="fitbit"
            appName="Fitbit"
            appIcon="fitness"
            appColor="#00B0B9"
          />

          {/* Info Section */}
          <View className="bg-blue-500/20 backdrop-blur-xl rounded-2xl p-5 border border-blue-500/30 mt-4">
            <View className="flex-row items-start mb-2">
              <Ionicons
                name="information-circle"
                size={20}
                color="#60A5FA"
                className="mr-2"
              />
              <Text className="text-blue-300 text-sm font-sora-semibold flex-1">
                How It Works
              </Text>
            </View>
            <Text className="text-blue-200 text-xs font-sora leading-5 mt-2">
              When you add food entries in BoilerBites, they will automatically
              sync to your connected health apps. This allows you to see all
              your nutrition data in one place. You can disconnect at any time.
            </Text>
          </View>

          {/* Privacy Note */}
          <View className="bg-gray-700/40 backdrop-blur-xl rounded-2xl p-5 border border-gray-600/30 mt-4">
            <View className="flex-row items-start mb-2">
              <Ionicons
                name="lock-closed"
                size={20}
                color="#9CA3AF"
                className="mr-2"
              />
              <Text className="text-gray-300 text-sm font-sora-semibold flex-1">
                Privacy & Security
              </Text>
            </View>
            <Text className="text-gray-400 text-xs font-sora leading-5 mt-2">
              Your health data is only shared with apps you explicitly connect.
              We use secure OAuth protocols and never store your health app
              passwords. You can disconnect at any time from this page.
            </Text>
          </View>
        </View>
      </ScrollView>
    </BackgroundTemplate>
  );
}
