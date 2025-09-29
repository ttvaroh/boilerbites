import { router } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

export default function OnboardingComponent() {
  return (
    <View className="flex-1 justify-center items-center px-8">
      {/* App Icon */}
      <View className="w-24 h-24 bg-gray-800 rounded-2xl mb-8 items-center justify-center shadow-2xl">
        <View className="w-16 h-16 bg-teal-500 rounded-xl items-center justify-center relative">
          {/* Bowl with food items */}
          <View className="w-12 h-8 bg-teal-600 rounded-b-lg relative">
            {/* Food items in bowl */}
            <View className="absolute -top-1 left-1 w-2 h-2 bg-green-500 rounded-full" />
            <View className="absolute -top-1 left-3 w-2 h-2 bg-orange-500 rounded-full" />
            <View className="absolute -top-1 left-5 w-2 h-2 bg-red-500 rounded-full" />
            <View className="absolute -top-1 left-7 w-2 h-2 bg-yellow-500 rounded-full" />
          </View>
          
          {/* Golden circular emblem around bowl */}
          <View className="absolute -inset-2 border-2 border-purdueGold rounded-full opacity-60">
            {/* Fork on left */}
            <View className="absolute -left-3 top-1/2 w-3 h-3 border border-purdueGold rounded-sm" />
            {/* Clock/timer on right */}
            <View className="absolute -right-3 top-1/2 w-3 h-3 border border-purdueGold rounded-full" />
          </View>
        </View>
      </View>

      {/* App Name */}
      <Text className="text-white text-3xl font-sora-bold mb-4">
        Boiler Bites
      </Text>

      {/* Tagline */}
      <Text className="text-gray-300 text-base font-sora text-center mb-12 leading-6">
        Track your dining hall calories with precision and style
      </Text>

      {/* Get Started Button */}
      <TouchableOpacity
        onPress={() => router.push("/signup" as any)}
        className="w-full bg-gradient-to-r from-purdueGold to-orange-500 py-4 px-8 rounded-xl mb-4 shadow-lg"
        style={{
          backgroundColor: "#CFB991", // Fallback for gradient
        }}
      >
        <Text className="text-black text-lg font-sora-bold text-center">
          Get Started
        </Text>
      </TouchableOpacity>

      {/* Sign In Button */}
      <TouchableOpacity
        onPress={() => router.push("/signin" as any)}
        className="w-full bg-gray-800 border border-gray-600 py-4 px-8 rounded-xl mb-12 shadow-lg"
      >
        <Text className="text-gray-300 text-lg font-sora text-center">
          Sign In
        </Text>
      </TouchableOpacity>
    </View>
  );
}
