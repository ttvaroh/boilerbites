import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import BackgroundTemplate from "../../components/BackgroundTemplate";
import OnboardingComponent from "../../components/OnboardingComponent";
import { useAuth } from "../../contexts/AuthContext";

export default function ProfileScreen() {
  const { user, signOut, loading } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  const handleMenuSettings = () => {
    // TODO: Navigate to menu settings page
    router.push("/menu-settings");
  };

  const handleFavorites = () => {
    router.push("/favorites");
  };

  const handleCustomFoods = () => {
    router.push("/custom-food");
  };

  const handleAbout = () => {
    router.push("/about");
  };

  const handleEditProfile = () => {
    router.push("/edit-profile");
  };

  const handleContactSupport = () => {
    router.push("/contact-support-screen");
  };

  const handleHealthConnections = () => {
    router.push("/health-connections");
  };

  if (loading) {
    return (
      <BackgroundTemplate paddingBottom={80}>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#CFB991" />
          <Text className="text-white text-base font-sora mt-4">
            Loading...
          </Text>
        </View>
      </BackgroundTemplate>
    );
  }

  if (!user) {
    return (
      <BackgroundTemplate paddingBottom={80}>
        <OnboardingComponent />
      </BackgroundTemplate>
    );
  }

  return (
    <BackgroundTemplate paddingBottom={80}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-16 pb-8">
          {/* Header with User Info */}
          <View className="mb-6">
            <View className="flex-row items-center">
              <View className="w-20 h-20 bg-purdueGold rounded-full items-center justify-center mr-4 shadow-lg">
                <Text className="text-black text-2xl font-sora-bold">
                  {(user?.user_metadata?.full_name ||
                    user?.email ||
                    "U")[0].toUpperCase()}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-white text-2xl font-sora-bold mb-1">
                  {user?.user_metadata?.full_name || "User"}
                </Text>
                <Text className="text-gray-400 text-sm font-sora">
                  {user?.email}
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Actions Grid */}
          <View className="mb-4">
            <Text className="text-white text-lg font-sora-semibold mb-3">
              Quick Actions
            </Text>
            <View className="flex-row justify-between mb-3">
              <TouchableOpacity
                onPress={handleMenuSettings}
                className="bg-gray-800/60 backdrop-blur-xl rounded-2xl p-5 flex-1 mr-2 border border-gray-700/50"
                activeOpacity={0.7}
              >
                <View className="bg-purdueGold/20 rounded-full w-12 h-12 items-center justify-center mb-3">
                  <Ionicons name="restaurant" size={24} color="#CFB991" />
                </View>
                <Text className="text-white text-base font-sora-semibold mb-1">
                  Menu Settings
                </Text>
                <Text className="text-gray-400 text-xs font-sora">
                  Customize your meals
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleFavorites}
                className="bg-gray-800/60 backdrop-blur-xl rounded-2xl p-5 flex-1 ml-2 border border-gray-700/50"
                activeOpacity={0.7}
              >
                <View className="bg-purdueGold/20 rounded-full w-12 h-12 items-center justify-center mb-3">
                  <Ionicons name="heart" size={24} color="#CFB991" />
                </View>
                <Text className="text-white text-base font-sora-semibold mb-1">
                  Favorites
                </Text>
                <Text className="text-gray-400 text-xs font-sora">
                  Your saved items
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleCustomFoods}
              className="bg-gray-800/60 backdrop-blur-xl rounded-2xl p-5 border border-gray-700/50"
              activeOpacity={0.7}
            >
              <View className="flex-row items-center">
                <View className="bg-purdueGold/20 rounded-full w-12 h-12 items-center justify-center mr-4">
                  <Ionicons name="add-circle" size={24} color="#CFB991" />
                </View>
                <View className="flex-1">
                  <Text className="text-white text-base font-sora-semibold mb-1">
                    Custom Foods & Meals
                  </Text>
                  <Text className="text-gray-400 text-xs font-sora">
                    Design your dining experience
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Account Section */}
          <View className="mb-4">
            <Text className="text-white text-lg font-sora-semibold mb-3">
              Account
            </Text>
            <View className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/50 overflow-hidden">
              <TouchableOpacity
                onPress={handleEditProfile}
                className="flex-row items-center p-4 border-b border-gray-700/50"
                activeOpacity={0.7}
              >
                <View className="bg-gray-700/50 rounded-full w-10 h-10 items-center justify-center mr-3">
                  <Ionicons name="person-outline" size={20} color="#CFB991" />
                </View>
                <Text className="text-white text-base font-sora flex-1">
                  Edit Profile
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleHealthConnections}
                className="flex-row items-center p-4"
                activeOpacity={0.7}
              >
                <View className="bg-gray-700/50 rounded-full w-10 h-10 items-center justify-center mr-3">
                  <Ionicons name="fitness-outline" size={20} color="#CFB991" />
                </View>
                <Text className="text-white text-base font-sora flex-1">
                  Health App Connections
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Support Section */}
          <View className="mb-6">
            <Text className="text-white text-lg font-sora-semibold mb-3">
              Support
            </Text>
            <View className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/50 overflow-hidden">
              <TouchableOpacity
                onPress={handleContactSupport}
                className="flex-row items-center p-4 border-b border-gray-700/50"
                activeOpacity={0.7}
              >
                <View className="bg-gray-700/50 rounded-full w-10 h-10 items-center justify-center mr-3">
                  <Ionicons
                    name="chatbubble-outline"
                    size={20}
                    color="#CFB991"
                  />
                </View>
                <Text className="text-white text-base font-sora flex-1">
                  Contact Us
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleAbout}
                className="flex-row items-center p-4"
                activeOpacity={0.7}
              >
                <View className="bg-gray-700/50 rounded-full w-10 h-10 items-center justify-center mr-3">
                  <Ionicons
                    name="information-circle-outline"
                    size={20}
                    color="#CFB991"
                  />
                </View>
                <Text className="text-white text-base font-sora flex-1">
                  About
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign Out Button */}
          <TouchableOpacity
            onPress={handleSignOut}
            className="bg-red-600/90 backdrop-blur-xl py-4 px-6 rounded-2xl flex-row items-center justify-center border border-red-500/30 mb-4"
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
            <Text className="text-white text-base font-sora-semibold ml-2">
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </BackgroundTemplate>
  );
}
