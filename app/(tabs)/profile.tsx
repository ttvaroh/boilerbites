import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from "react-native";
import BackgroundTemplate from "../../components/BackgroundTemplate";
import OnboardingComponent from "../../components/OnboardingComponent";
import { useAuth } from "../../contexts/AuthContext";

export default function ProfileScreen() {
  const { user, signOut, loading } = useAuth();

  // No need to redirect - we'll show onboarding component instead

  const handleSignOut = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await signOut();
            // No need to redirect - the component will automatically show onboarding
          },
        },
      ]
    );
  };

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <BackgroundTemplate>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#CFB991" />
          <Text className="text-white text-base font-sora mt-4">Loading...</Text>
        </View>
      </BackgroundTemplate>
    );
  }

  // If not authenticated, show onboarding component
  if (!user) {
    return (
      <BackgroundTemplate>
        <OnboardingComponent />
      </BackgroundTemplate>
    );
  }

  return (
    <BackgroundTemplate>
      <View className="flex-1 px-8 pt-16">
        {/* Header */}
        <View className="mb-8">
          <Text className="text-white text-3xl font-sora-bold mb-2">
            Profile
          </Text>
          <Text className="text-gray-400 text-base font-sora">
            Manage your account and preferences
          </Text>
        </View>

        {/* User Info */}
        <View className="bg-gray-800 rounded-xl p-6 mb-6 border border-gray-700">
          <View className="flex-row items-center mb-4">
            <View className="w-16 h-16 bg-purdueGold rounded-full items-center justify-center mr-4">
              <Ionicons name="person" size={32} color="#000000" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-lg font-sora-bold">
                {user?.user_metadata?.full_name || "User"}
              </Text>
              <Text className="text-gray-400 text-sm font-sora">
                {user?.email}
              </Text>
            </View>
          </View>
        </View>

        {/* Profile Options */}
        <View className="space-y-4 mb-8">
          <TouchableOpacity className="bg-gray-800 rounded-xl p-4 flex-row items-center border border-gray-700">
            <Ionicons name="settings-outline" size={24} color="#CFB991" />
            <Text className="text-white text-base font-sora ml-4">Settings</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" className="ml-auto" />
          </TouchableOpacity>

          <TouchableOpacity className="bg-gray-800 rounded-xl p-4 flex-row items-center border border-gray-700">
            <Ionicons name="notifications-outline" size={24} color="#CFB991" />
            <Text className="text-white text-base font-sora ml-4">Notifications</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" className="ml-auto" />
          </TouchableOpacity>

          <TouchableOpacity className="bg-gray-800 rounded-xl p-4 flex-row items-center border border-gray-700">
            <Ionicons name="help-circle-outline" size={24} color="#CFB991" />
            <Text className="text-white text-base font-sora ml-4">Help & Support</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" className="ml-auto" />
          </TouchableOpacity>

          <TouchableOpacity className="bg-gray-800 rounded-xl p-4 flex-row items-center border border-gray-700">
            <Ionicons name="information-circle-outline" size={24} color="#CFB991" />
            <Text className="text-white text-base font-sora ml-4">About</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" className="ml-auto" />
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          onPress={handleSignOut}
          className="bg-red-600 py-4 px-6 rounded-xl flex-row items-center justify-center"
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
          <Text className="text-white text-base font-sora-bold ml-2">
            Sign Out
          </Text>
        </TouchableOpacity>
      </View>
    </BackgroundTemplate>
  );
}
