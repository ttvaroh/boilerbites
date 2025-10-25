import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Alert,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import BackgroundTemplate from "../components/BackgroundTemplate";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

export default function EditProfileScreen() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || "");
  const [email] = useState(user?.email || "");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const handleSave = async () => {
    if (!user) return;

    if (!fullName.trim()) {
      Alert.alert("Validation Error", "Please enter your full name.");
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
        },
      });

      if (error) {
        Alert.alert("Error", "Failed to update profile. Please try again.");
        console.error("Profile update error:", error);
        return;
      }

      Alert.alert("Success", "Profile updated successfully!", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to update profile. Please try again.");
      console.error("Profile update error:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;

    Alert.alert(
      "Reset Password",
      `A password reset link will be sent to ${user.email}. Continue?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Send Link",
          onPress: async () => {
            setIsSendingReset(true);
            try {
              const { error } = await supabase.auth.resetPasswordForEmail(
                user.email,
                {
                  redirectTo: "yourapp://reset-password", // Update with your app's deep link
                }
              );

              if (error) {
                Alert.alert("Error", "Failed to send reset link. Please try again.");
                console.error("Password reset error:", error);
                return;
              }

              Alert.alert(
                "Email Sent",
                "Password reset link has been sent to your email. Please check your inbox.",
                [{ text: "OK" }]
              );
            } catch (error) {
              Alert.alert("Error", "Failed to send reset link. Please try again.");
              console.error("Password reset error:", error);
            } finally {
              setIsSendingReset(false);
            }
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    router.back();
  };

  if (loading) {
    return (
      <BackgroundTemplate>
        <View className="flex-1 justify-center items-center">
          <Text className="text-white text-base font-sora">Loading...</Text>
        </View>
      </BackgroundTemplate>
    );
  }

  if (!user) {
    return (
      <BackgroundTemplate>
        <View className="flex-1 justify-center items-center p-6">
          <View className="bg-gray-800 rounded-2xl p-8 items-center max-w-sm">
            <Ionicons name="lock-closed-outline" size={64} color="#CFB991" />
            <Text className="text-2xl font-sora-bold text-white text-center mt-4 mb-2">
              Login Required
            </Text>
            <Text className="text-gray-400 text-center mb-6 font-sora">
              You need to be logged in to edit your profile.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/signin")}
              className="bg-purdueGold rounded-xl px-6 py-3 w-full"
            >
              <Text className="text-black font-sora-semibold text-center">
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </BackgroundTemplate>
    );
  }

  const hasChanges = fullName.trim() !== (user?.user_metadata?.full_name || "");

  return (
    <BackgroundTemplate paddingBottom={0}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-16 pb-8">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-8">
            <View className="flex-row items-center flex-1">
              <TouchableOpacity
                onPress={handleCancel}
                className="mr-4 p-2"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <Text className="text-white text-2xl font-sora-bold">
                Edit Profile
              </Text>
            </View>
            {hasChanges && (
              <TouchableOpacity
                onPress={handleSave}
                disabled={isUpdating}
                className="ml-2"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text className={`text-base font-sora-semibold ${
                  isUpdating ? "text-gray-500" : "text-purdueGold"
                }`}>
                  {isUpdating ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Profile Picture Section */}
          <View className="items-center mb-8">
            <View className="relative">
                <View className="w-24 h-24 bg-purdueGold rounded-full items-center justify-center shadow-lg mb-4">
                    <Text className="text-black text-4xl font-sora-bold">
                        {fullName[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                    </Text>
                </View>
              {/* Disabled camera icon overlay */}
              <View className="absolute bottom-0 right-0 bg-gray-700 rounded-full p-2 border-2 border-gray-800">
                <Ionicons name="camera" size={16} color="#6B7280" />
              </View>
            </View>
            <Text className="text-gray-400 text-sm font-sora text-center mt-3">
              Custom profile pictures coming soon
            </Text>
          </View>

          {/* Personal Information Section */}
          <View className="bg-gray-800/40 backdrop-blur-xl rounded-2xl p-5 mb-6 border border-gray-700/30">
            <Text className="text-white text-lg font-sora-bold mb-4">
              Personal Information
            </Text>

            {/* Full Name */}
            <View className="mb-4">
              <Text className="text-gray-300 text-sm font-sora-semibold mb-2">
                Full Name
              </Text>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor="#6B7280"
                className="bg-gray-900/50 rounded-xl px-4 py-3.5 text-white text-base font-sora border border-gray-600/40"
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            {/* Email (Read-only) */}
            <View>
              <Text className="text-gray-300 text-sm font-sora-semibold mb-2">
                Email Address
              </Text>
              <View className="bg-gray-900/30 rounded-xl px-4 py-3.5 border border-gray-700/20 flex-row items-center justify-between">
                <Text className="text-gray-400 text-base font-sora flex-1">
                  {email}
                </Text>
                <Ionicons name="lock-closed" size={16} color="#6B7280" />
              </View>
              <Text className="text-gray-500 text-xs font-sora mt-2">
                Email address is locked for security
              </Text>
            </View>
          </View>

          {/* Security Section */}
          <View className="bg-gray-800/40 backdrop-blur-xl rounded-2xl p-5 mb-6 border border-gray-700/30">
            <Text className="text-white text-lg font-sora-bold mb-4">
              Security
            </Text>

            {/* Reset Password Button */}
            <TouchableOpacity
              onPress={handleResetPassword}
              disabled={isSendingReset}
              className="bg-gray-900/50 rounded-xl px-4 py-4 border border-gray-600/40 flex-row items-center justify-between"
              activeOpacity={0.7}
            >
              <View className="flex-row items-center flex-1">
                <View className="bg-purdueGold/20 rounded-full p-2 mr-3">
                  <Ionicons name="key" size={18} color="#CFB991" />
                </View>
                <View className="flex-1">
                  <Text className="text-white text-base font-sora-semibold">
                    {isSendingReset ? "Sending..." : "Reset Password"}
                  </Text>
                  <Text className="text-gray-400 text-xs font-sora mt-0.5">
                    Send reset link to email
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View className="mt-2 space-y-3">
            <TouchableOpacity
              onPress={handleSave}
              disabled={isUpdating || !hasChanges}
              className={`py-4 px-6 rounded-xl flex-row items-center justify-center shadow-lg ${
                isUpdating || !hasChanges
                  ? "bg-gray-700"
                  : "bg-purdueGold"
              }`}
              activeOpacity={0.8}
            >
              {isUpdating ? (
                <Text className="text-white text-base font-sora-semibold">
                  Saving Changes...
                </Text>
              ) : (
                <>
                  <Ionicons 
                    name="checkmark-circle" 
                    size={22} 
                    color={hasChanges ? "#000000" : "#6B7280"} 
                  />
                  <Text className={`text-base font-sora-semibold ml-2 ${
                    hasChanges ? "text-black" : "text-gray-500"
                  }`}>
                    Save Changes
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCancel}
              className="py-4 px-6 rounded-xl border-2 border-gray-600/50 flex-row items-center justify-center mt-1"
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle-outline" size={22} color="#9CA3AF" />
              <Text className="text-gray-300 text-base font-sora-semibold ml-2">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </BackgroundTemplate>
  );
}