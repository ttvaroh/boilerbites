import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import BackgroundTemplate from "../components/BackgroundTemplate";
import { useAuth } from "../contexts/AuthContext";

export default function SignUpScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { signUp, signInWithAzure, signInWithApple } = useAuth();

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword || !name) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }
    
    setLoading(true);
    
    const { error, data } = await signUp(email, password, name);
    
    setLoading(false);
    
    if (error) {
      Alert.alert("Sign Up Error", error.message);
    } else {
      // Check if this is a purdue.edu email (auto-verified)
      const isPurdueEmail = email.toLowerCase().endsWith('@purdue.edu');
      const isVerified = !!data?.user?.email_confirmed_at;
      
      if (isPurdueEmail && isVerified) {
        // Purdue.edu emails are auto-verified
        Alert.alert(
          "Success", 
          "Account created! Your Purdue.edu email has been automatically verified. You can sign in now.",
          [{ text: "OK", onPress: () => router.replace("/signin") }]
        );
      } else {
        // Regular email signup - needs verification
        Alert.alert(
          "Success", 
          "Account created! Please check your email to verify your account.",
          [{ text: "OK", onPress: () => router.replace("/signin") }]
        );
      }
    }
  };

  const handleAzureSignUp = async () => {
    setLoading(true);
    console.log('[SignUp] Azure sign up button clicked');
    
    const { error } = await signInWithAzure();
    
    setLoading(false);
    
    if (error) {
      console.error('[SignUp] Azure sign up error:', error);
      Alert.alert("Sign Up Error", error.message || "Failed to sign up with Azure");
    } else {
      router.replace("/profile");
    }
  };

  const handleAppleSignUp = async () => {
    setLoading(true);
    console.log('[SignUp] Apple sign up button clicked');
    
    const { error } = await signInWithApple();
    
    setLoading(false);
    
    if (error) {
      console.error('[SignUp] Apple sign up error:', error);
      Alert.alert("Sign Up Error", error.message || "Failed to sign up with Apple");
    } else {
      router.replace("/profile");
    }
  };

  return (
    <BackgroundTemplate paddingBottom={0}>
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
            Create Account
          </Text>
          <Text className="text-gray-400 text-base font-sora">
            Join Boiler Bites to start tracking your nutrition
          </Text>
        </View>

        {/* Form */}
        <View className="mb-4">
          {/* Name Input */}
          <View className="mb-5">
            <Text className="text-white text-sm font-sora mb-2">Full Name</Text>
            <View className="bg-gray-800 rounded-xl border border-gray-700 flex-row items-center px-4">
              <Ionicons name="person-outline" size={20} color="#9CA3AF" />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter your full name"
                placeholderTextColor="#6B7280"
                className="flex-1 text-white py-4 px-3 font-sora"
                editable={!loading}
              />
            </View>
          </View>

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
          <View className="mb-5">
            <Text className="text-white text-sm font-sora mb-2">Password</Text>
            <View className="bg-gray-800 rounded-xl border border-gray-700 flex-row items-center px-4">
              <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Create a password (min 6 characters)"
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

          {/* Confirm Password Input */}
          <View className="mb-6">
            <Text className="text-white text-sm font-sora mb-2">Confirm Password</Text>
            <View className="bg-gray-800 rounded-xl border border-gray-700 flex-row items-center px-4">
              <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm your password"
                placeholderTextColor="#6B7280"
                secureTextEntry={!showConfirmPassword}
                className="flex-1 text-white py-4 px-3 font-sora"
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Ionicons 
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color="#9CA3AF" 
                />
              </TouchableOpacity>
            </View>
          </View>
          {/* Sign Up Button */}
          <TouchableOpacity
            onPress={handleSignUp}
            className="w-full bg-purdueGold py-4 rounded-xl mb-4 mt-2"
            activeOpacity={0.8}
            disabled={loading}
          >
            <Text className="text-black text-base font-sora-bold text-center">
              {loading ? "Creating Account..." : "Create Account"}
            </Text>
          </TouchableOpacity>
        </View>
        

        {/* Divider */}
        <View className="flex-row items-center mb-6">
          <View className="flex-1 h-px bg-gray-700" />
          <Text className="text-gray-500 text-sm font-sora mx-4">OR</Text>
          <View className="flex-1 h-px bg-gray-700" />
        </View>

        {/* Azure Sign Up Button - Disabled */}
        <TouchableOpacity
          onPress={() => {}}
          className="w-full bg-gray-800/50 border border-gray-700/50 py-4 rounded-xl mb-2 flex-row items-center justify-center"
          activeOpacity={1}
          disabled={true}
        >
          <Ionicons name="logo-microsoft" size={20} color="#6B7280" />
          <Text className="text-gray-500 text-base font-sora-bold ml-2">
            Continue with Purdue.edu
          </Text>
        </TouchableOpacity>
        
        {/* Notice about Azure sign-up */}
        <View className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-4">
          <View className="flex-row items-start">
            <Ionicons name="information-circle" size={16} color="#F59E0B" style={{ marginTop: 2 }} />
            <Text className="text-yellow-200 text-xs font-sora ml-2 flex-1 leading-4">
              Purdue.edu sign-in is temporarily unavailable. We're working with Purdue IT to resolve this. Please use email/password or Apple Sign-In instead.
            </Text>
          </View>
        </View>

        {/* Sign in with Apple Button (iOS only) */}
        {Platform.OS === 'ios' && (
          <TouchableOpacity
            onPress={handleAppleSignUp}
            className="w-full bg-black border border-gray-700 py-4 rounded-xl mb-6 flex-row items-center justify-center"
            activeOpacity={0.8}
            disabled={loading}
            style={{ backgroundColor: '#000000' }}
          >
            <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
            <Text className="text-white text-base font-sora-bold ml-2">
              {loading ? "Signing Up..." : "Continue with Apple"}
            </Text>
          </TouchableOpacity>
        )}

        {/* Sign In Link */}
        <View className="flex-row justify-center">
          <Text className="text-gray-400 text-sm font-sora">
            Already have an account?{" "}
          </Text>
          <TouchableOpacity onPress={() => router.push("/signin" as any)}>
            <Text className="text-purdueGold text-sm font-sora-bold">
              Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </BackgroundTemplate>
  );
}