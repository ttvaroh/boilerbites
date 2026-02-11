import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import BackgroundTemplate from "../components/BackgroundTemplate";
const boilerbitesLogo = require("../assets/images/logos/boilerbites-logo.png");
const tomHeadshot = require("../assets/images/tommycancun.jpg");

export default function AboutScreen() {
  const router = useRouter();

  return (
    <BackgroundTemplate paddingBottom={0}>
      <View className="flex-1">
        {/* Header */}
        <View className="bg-transparent pt-14 pb-2 px-6">
          <View className="flex-row items-center justify-between mb-0">
            <TouchableOpacity
              onPress={() => router.back()}
              className="flex-row items-center pb-2"
            >
              <Ionicons name="arrow-back" size={24} color="white" />
              <Text className="text-white text-lg font-sora ml-2">Back</Text>
            </TouchableOpacity>
          </View>

          <Text className="text-white text-3xl font-sora-bold mb-4">About</Text>
        </View>

        {/* Main Content */}
        <ScrollView
          className="flex-1 px-6"
          showsVerticalScrollIndicator={false}
        >
          {/* App Info Section */}
          <View className="mb-6">
            <View className="bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50">
              <View className="items-center mb-4">
                <View className="w-20 h-20 bg-[#10100e] rounded-full items-center justify-center mb-4 shadow-lg overflow-hidden">
                  <Image
                    source={boilerbitesLogo}
                    className="w-16 h-16"
                    resizeMode="contain"
                  />
                </View>
                <Text className="text-white text-2xl font-sora-bold mb-2">
                  BoilerBites
                </Text>
                <Text className="text-gray-400 text-sm font-sora text-center">
                  Your personal dining app at Purdue University
                </Text>
              </View>

              <Text className="text-gray-300 text-base font-sora leading-6 text-center">
                BoilerBites helps you discover, track, and manage your dining
                experience at Purdue. Find your favorite foods, track nutrition,
                and never miss your favorite meal again.
              </Text>
            </View>
          </View>

          {/* Features */}
          <View className="mb-6">
            <Text className="text-white text-lg font-sora-semibold mb-2">
              Features
            </Text>
            <View className="bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50">
              <View className="space-y-4">
                <View className="flex-row items-center">
                  <Ionicons name="restaurant" size={20} color="#CFB991" />
                  <Text className="text-gray-300 text-sm font-sora ml-3">
                    Real-time dining hall menus
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="nutrition" size={20} color="#CFB991" />
                  <Text className="text-gray-300 text-sm font-sora ml-3">
                    Nutritional information tracking
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="heart" size={20} color="#CFB991" />
                  <Text className="text-gray-300 text-sm font-sora ml-3">
                    Favorite items management
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="add-circle" size={20} color="#CFB991" />
                  <Text className="text-gray-300 text-sm font-sora ml-3">
                    Custom food entries
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="search" size={20} color="#CFB991" />
                  <Text className="text-gray-300 text-sm font-sora ml-3">
                    Advanced search and filtering
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="fitness" size={20} color="#CFB991" />
                  <Text className="text-gray-300 text-sm font-sora ml-3">
                    Health app connections (Apple Health & Fitbit)
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* What's New & Feedback */}
          <View className="mb-6">
            <Text className="text-white text-lg font-sora-semibold mb-2">
              What's New
            </Text>
            <View className="bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50">
              {/* Updates Section */}
              <View className="mb-4">
                <View className="flex-row items-center mb-3">
                  <Ionicons name="sparkles" size={20} color="#CFB991" />
                  <Text className="text-purdueGold text-sm font-sora-semibold ml-2">
                    Version 1.0.5 - Latest Updates
                  </Text>
                </View>
                <View className="ml-7">
                  <View className="flex-row items-start">
                    <Text className="text-gray-400 text-sm font-sora mr-2">
                      •
                    </Text>
                    <Text className="text-gray-300 text-sm font-sora flex-1 leading-5">
                      Health App Connections—sync your food log to Apple Health
                      or Fitbit from Profile → Health App Connections
                    </Text>
                  </View>
                  <View className="flex-row items-start">
                    <Text className="text-gray-400 text-sm font-sora mr-2">
                      •
                    </Text>
                    <Text className="text-gray-300 text-sm font-sora flex-1 leading-5">
                      Ingredients and allergens now load and display correctly
                      on item details
                    </Text>
                  </View>
                  <View className="flex-row items-start">
                    <Text className="text-gray-400 text-sm font-sora mr-2">
                      •
                    </Text>
                    <Text className="text-gray-300 text-sm font-sora flex-1 leading-5">
                      Updated privacy policy and new Terms of Service for health
                      data and app use
                    </Text>
                  </View>
                </View>
              </View>

              {/* Divider */}
              <View className="h-px bg-gray-700/50 my-2" />

              {/* Feedback Section */}
              <View>
                <View className="flex-row items-center mb-3">
                  <Ionicons name="chatbubbles" size={20} color="#CFB991" />
                  <Text className="text-purdueGold text-sm font-sora-semibold ml-2">
                    Feedback & Support
                  </Text>
                </View>
                <Text className="text-gray-300 text-sm font-sora leading-5">
                  Have suggestions or found a bug? We'd love to hear from you!
                  Contact us using the information below.
                </Text>
              </View>
            </View>
          </View>

          {/* Contact Info */}
          <View className="mb-6">
            <Text className="text-white text-lg font-sora-semibold mb-2">
              Contact
            </Text>
            <View className="bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50">
              <Text className="text-gray-300 text-sm font-sora leading-5 mb-4">
                Have feedback, suggestions, or found a bug? Your input is always
                welcome!
              </Text>

              <View className="space-y-3">
                <View className="flex-row items-center">
                  <Ionicons name="mail" size={20} color="#CFB991" />
                  <Text className="text-gray-300 text-sm font-sora ml-3">
                    ttvaroh@purdue.edu
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Version Info */}
          <View className="mb-8">
            <Text className="text-white text-lg font-sora-semibold mb-2">
              Version
            </Text>
            <View className="bg-gray-800/60 backdrop-blur-xl rounded-2xl p-4 border border-gray-700/50">
              <View className="flex-row items-center justify-between">
                <Text className="text-gray-300 text-base font-sora">
                  App Version
                </Text>
                <Text className="text-purdueGold text-base font-sora-semibold">
                  1.0.5
                </Text>
              </View>
              <View className="flex-row items-center justify-between mt-3">
                <Text className="text-gray-300 text-base font-sora">Build</Text>
                <Text className="text-gray-400 text-sm font-sora">Beta</Text>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View className="pb-8">
            <Text className="text-gray-500 text-xs font-sora text-center leading-4">
              © 2026 BoilerBites. Made with ❤️ for the Purdue community.
              <Text className="block mt-1">
                {" "}
                This app is not officially affiliated with Purdue University.
              </Text>
            </Text>
          </View>
        </ScrollView>
      </View>
    </BackgroundTemplate>
  );
}
