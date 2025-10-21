import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import BackgroundTemplate from "../components/BackgroundTemplate";
import { useAuth } from "../contexts/AuthContext";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { signIn, signInWithAzure } = useAuth();

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    
    setLoading(true);
    
    const { error } = await signIn(email, password);
    
    setLoading(false);
    
    if (error) {
      Alert.alert("Sign In Error", error.message);
    } else {
      router.replace("/profile");
    }
  };

  const handleAzureSignIn = async () => {
    setLoading(true);
    
    const { error } = await signInWithAzure();
    
    setLoading(false);
    
    if (error) {
      Alert.alert("Azure Sign In Error", error.message);
    }
  };

  return (
    <BackgroundTemplate>
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingHorizontal: 32, paddingTop: 60, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button - Properly positioned outside header */}
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
            Welcome Back
          </Text>
          <Text className="text-gray-400 text-base font-sora">
            Sign in to continue tracking your nutrition
          </Text>
        </View>

        {/* Form */}
        <View className="mb-2">
          {/* Email Input */}
          <View className="mb-5">
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
                className="flex-1 text-white py-4 px-3 font-sora"
                editable={!loading}
              />
            </View>
          </View>

          {/* Password Input */}
          <View className="mb-6">
            <Text className="text-white text-sm font-sora mb-2">Password</Text>
            <View className="bg-gray-800 rounded-xl border border-gray-700 flex-row items-center px-4">
              <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="#6B7280"
                secureTextEntry={!showPassword}
                className="flex-1 text-white py-4 px-3 font-sora"
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color="#9CA3AF" 
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Forgot Password Link */}
        <TouchableOpacity className="self-end mb-8">
          <Text className="text-purdueGold text-sm font-sora">
            Forgot Password?
          </Text>
        </TouchableOpacity>

        {/* Sign In Button */}
        <TouchableOpacity
          onPress={handleSignIn}
          className="w-full bg-purdueGold py-4 rounded-xl mb-6"
          activeOpacity={0.8}
          disabled={loading}
        >
          <Text className="text-black text-base font-sora-bold text-center">
            {loading ? "Signing In..." : "Sign In"}
          </Text>
        </TouchableOpacity>

        {/* Separator */}
        <View className="flex-row items-center mb-6">
          <View className="flex-1 h-px bg-gray-700" />
          <Text className="text-gray-500 text-sm font-sora mx-4">or</Text>
          <View className="flex-1 h-px bg-gray-700" />
        </View>

        {/* Social Login Buttons */}
        <View className="mb-8">
          {/* Microsoft Button */}
          <TouchableOpacity 
            onPress={handleAzureSignIn}
            className="w-full bg-gray-800 border border-gray-700 py-4 rounded-xl flex-row items-center justify-center opacity-50 mb-3"
            activeOpacity={0.8}
            disabled={loading}
          >
            <Ionicons name="logo-microsoft" size={20} color="#FFFFFF" />
            <Text className="text-white text-base font-sora ml-3">
              {loading ? "Connecting..." : "Continue with Purdue Email"}
            </Text>
            <Text className="text-gray-400 text-xs font-sora ml-2">(Coming Soon)</Text>
          </TouchableOpacity>

          {/* Google Button - Disabled */}
          <TouchableOpacity 
            className="w-full bg-gray-800 border border-gray-700 py-4 rounded-xl flex-row items-center justify-center opacity-50"
            activeOpacity={0.8}
            disabled={true}
          >
            <Ionicons name="logo-google" size={20} color="#FFFFFF" />
            <Text className="text-white text-base font-sora ml-3">Continue with Google</Text>
            <Text className="text-gray-400 text-xs font-sora ml-2">(Coming Soon)</Text>
          </TouchableOpacity>
        </View>

        {/* Sign Up Link */}
        <View className="flex-row justify-center">
          <Text className="text-gray-400 text-sm font-sora">
            Don't have an account?{" "}
          </Text>
          <TouchableOpacity onPress={() => router.push("/signup" as any)}>
            <Text className="text-purdueGold text-sm font-sora-bold">
              Sign Up
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </BackgroundTemplate>
  );
}
