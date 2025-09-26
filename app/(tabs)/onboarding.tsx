import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
    Dimensions,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import BackgroundTemplate from "../../components/BackgroundTemplate";

const { width } = Dimensions.get("window");

export default function OnboardingScreen() {
  const [currentScreen, setCurrentScreen] = useState(0);

  const handleNext = () => {
    if (currentScreen < 2) {
      setCurrentScreen(currentScreen + 1);
    }
  };

  const handlePrev = () => {
    if (currentScreen > 0) {
      setCurrentScreen(currentScreen - 1);
    }
  };

  const renderSignUpScreen = () => (
    <View className="flex-1 justify-center items-center px-8">
      {/* App Logo */}
      <View className="items-center mb-8">
        <View className="w-24 h-24 rounded-2xl bg-purdueBlack-300 items-center justify-center mb-6 relative">
          {/* Bowl with food */}
          <View className="w-16 h-12 bg-gray-700 rounded-lg items-center justify-center relative">
            <View className="w-3 h-3 bg-orange-400 rounded-full mb-1" />
            <View className="w-4 h-2 bg-green-400 rounded-sm" />
          </View>
          
          {/* Golden compass/gear frame */}
          <View className="absolute inset-0 items-center justify-center">
            <View className="w-20 h-20 border-2 border-purdueGold rounded-full items-center justify-center">
              <View className="w-16 h-16 border border-purdueGold rounded-full items-center justify-center">
                <View className="w-12 h-12 border border-purdueGold rounded-full items-center justify-center">
                  {/* Small nodes */}
                  <View className="absolute -top-1 w-2 h-2 bg-purdueGold rounded-full" />
                  <View className="absolute -bottom-1 w-2 h-2 bg-purdueGold rounded-full" />
                  <View className="absolute -left-1 w-2 h-2 bg-purdueGold rounded-full" />
                  <View className="absolute -right-1 w-2 h-2 bg-purdueGold rounded-full" />
                </View>
              </View>
            </View>
            
            {/* Golden fork */}
            <View className="absolute -left-2 w-6 h-1 bg-purdueGold rounded-full" />
            <View className="absolute -left-2 w-1 h-4 bg-purdueGold rounded-full" />
          </View>
        </View>
      </View>

      {/* App Title */}
      <Text className="text-white text-3xl font-sora-bold mb-4 text-center">
        Boiler Bites
      </Text>

      {/* Tagline */}
      <Text className="text-gray-300 text-base font-sora text-center mb-12 leading-6">
        Track your dining hall calories with precision and style
      </Text>

      {/* Buttons */}
      <View className="w-full space-y-4">
        {/* Get Started Button */}
        <TouchableOpacity
          onPress={() => console.log("Get Started pressed")}
          className="w-full"
        >
          <LinearGradient
            colors={["#CFB991", "#B8A082"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            className="py-4 rounded-xl"
          >
            <Text className="text-white text-lg font-sora-bold text-center">
              Get Started
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Sign In Button */}
        <TouchableOpacity
          onPress={() => console.log("Sign In pressed")}
          className="w-full py-4 rounded-xl border border-gray-400"
        >
          <Text className="text-white text-lg font-sora-bold text-center">
            Sign In
          </Text>
        </TouchableOpacity>
      </View>

    </View>
  );

  const renderBlankScreen = (screenNumber: number) => (
    <View className="flex-1 justify-center items-center px-8">
      <Text className="text-white text-2xl font-sora-bold mb-4">
        Screen {screenNumber + 1}
      </Text>
      <Text className="text-gray-300 text-base font-sora text-center">
        This is a blank screen for future content
      </Text>
    </View>
  );

  return (
    <BackgroundTemplate>
      <View className="flex-1">
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
            setCurrentScreen(newIndex);
          }}
          scrollEventThrottle={16}
        >
          <View style={{ width }}>
            {renderSignUpScreen()}
          </View>
          <View style={{ width }}>
            {renderBlankScreen(1)}
          </View>
          <View style={{ width }}>
            {renderBlankScreen(2)}
          </View>
        </ScrollView>
        
        {/* Pagination Dots - Fixed at bottom */}
        <View className="absolute bottom-12 left-0 right-0 flex-row justify-center space-x-3">
          <View className={`w-3 h-3 rounded-full ${currentScreen === 0 ? 'bg-purdueGold' : 'bg-gray-600'}`} />
          <View className={`w-3 h-3 rounded-full ${currentScreen === 1 ? 'bg-purdueGold' : 'bg-gray-600'}`} />
          <View className={`w-3 h-3 rounded-full ${currentScreen === 2 ? 'bg-purdueGold' : 'bg-gray-600'}`} />
        </View>
      </View>
    </BackgroundTemplate>
  );
}