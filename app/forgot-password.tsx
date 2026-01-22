import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import BackgroundTemplate from "../components/BackgroundTemplate";
import { useAuth } from "../contexts/AuthContext";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { resetPasswordForEmail } = useAuth();

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }
    
    setLoading(true);
    
    const { error } = await resetPasswordForEmail(email);
    
    setLoading(false);
    
    if (error) {
      // Don't reveal if email exists or not for security
      Alert.alert(
        "Email Sent",
        "If an account with that email exists, a password reset link has been sent. Please check your inbox and follow the instructions to reset your password.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } else {
      Alert.alert(
        "Email Sent",
        "If an account with that email exists, a password reset link has been sent. Please check your inbox and follow the instructions to reset your password.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    }
  };

  return (
    <BackgroundTemplate paddingBottom={0}>
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingHorizontal: 32, paddingTop: 60, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button */}
        <TouchableOpacity
          onPress={() => router.back()}
          className="mb-8"
        >
          <View className="flex-row items-center">
            <Ionicons name="chevron-back" size={24} color="#CFB991" />
            <Text className="text-purdueGold text-base font-sora ml-1">Back</Text>
          </View>
        </TouchableOpacity>

        {/* Header */}
        <View className="mb-8">
          <Text className="text-white text-3xl font-sora-bold mb-2">
            Reset Password
          </Text>
          <Text className="text-gray-400 text-base font-sora">
            Enter your email address and we'll send you a link to reset your password.
          </Text>
        </View>

        {/* Form */}
        <View className="mb-6">
          {/* Email Input */}
          <View className="mb-6">
            <Text className="text-white text-sm font-sora mb-2">Email Address</Text>
            <View className="bg-gray-800 rounded-xl border border-gray-700 flex-row items-center px-4">
              <Ionicons name="mail-outline" size={20} color="#9CA3AF" />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor="#6B7280"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                className="flex-1 text-white py-4 px-3 font-sora"
                editable={!loading}
              />
            </View>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleResetPassword}
          className="w-full bg-purdueGold py-4 rounded-xl mb-6"
          activeOpacity={0.8}
          disabled={loading}
        >
          <Text className="text-black text-base font-sora-bold text-center">
            {loading ? "Sending..." : "Send Reset Link"}
          </Text>
        </TouchableOpacity>

        {/* Info Text */}
        <View className="bg-gray-800 rounded-xl p-4 mb-6">
          <View className="flex-row items-start">
            <Ionicons name="information-circle-outline" size={20} color="#CFB991" className="mr-3 mt-0.5" />
            <View className="flex-1">
              <Text className="text-gray-300 text-sm font-sora">
                After clicking "Send Reset Link", check your email inbox (and spam folder) for a password reset link. The link will expire after 1 hour.
              </Text>
            </View>
          </View>
        </View>

        {/* Back to Sign In Link */}
        <View className="flex-row justify-center">
          <Text className="text-gray-400 text-sm font-sora">
            Remember your password?{" "}
          </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-purdueGold text-sm font-sora-bold">
              Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </BackgroundTemplate>
  );
}
