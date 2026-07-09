import { router } from "expo-router";
import { Image, Text, TouchableOpacity, View } from "react-native";

const boilerbitesLogo = require("../assets/images/logos/boilerbites-logo.png");

export default function OnboardingComponent() {
  return (
    <View className="flex-1 justify-center items-center px-8">
      <View
        className="mb-8 rounded-2xl"
        style={{
          shadowColor: "#CFB991",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.65,
          shadowRadius: 18,
          elevation: 14,
        }}
      >
        <View
          className="rounded-2xl"
          style={{
            borderWidth: 1,
            borderColor: "rgba(207, 185, 145, 0.35)",
          }}
        >
          <Image
            source={boilerbitesLogo}
            className="w-24 h-24 rounded-2xl"
            resizeMode="contain"
          />
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
