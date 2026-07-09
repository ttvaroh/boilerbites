import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import {
  Animated,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BackgroundTemplate from "./BackgroundTemplate";

const boilerbitesLogo = require("../assets/images/logos/boilerbites-logo.png");

type UpdateHighlight = {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
};

const DEFAULT_HIGHLIGHTS: UpdateHighlight[] = [
  { icon: "flash", text: "Faster menu loading and search" },
  { icon: "sparkles", text: "Smoother, more responsive experience" },
  { icon: "shield-checkmark", text: "The latest fixes and improvements" },
];

type UpdateRequiredScreenProps = {
  onUpdatePress: () => void;
  storeUrl: string;
  currentVersion?: string;
  highlights?: UpdateHighlight[];
};

export default function UpdateRequiredScreen({
  onUpdatePress,
  storeUrl,
  currentVersion,
  highlights = DEFAULT_HIGHLIGHTS,
}: UpdateRequiredScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(32)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 22,
        stiffness: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <BackgroundTemplate>
      <SafeAreaView style={{ flex: 1 }}>
        <Animated.View
          style={{
            flex: 1,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
          className="justify-center items-center px-8"
        >
          {/* Logo with gold glow */}
          <View
            className="mb-7 rounded-2xl"
            style={{
              shadowColor: "#CFB991",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.55,
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
                className="w-20 h-20 rounded-2xl"
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Badge */}
          <View
            style={{
              backgroundColor: "rgba(207, 185, 145, 0.12)",
              borderWidth: 1,
              borderColor: "rgba(207, 185, 145, 0.2)",
            }}
            className="rounded-full px-3 py-1 mb-4 flex-row items-center"
          >
            <Ionicons name="arrow-up-circle" size={14} color="#CFB991" />
            <Text
              style={{ color: "#CFB991" }}
              className="text-xs font-sora-semibold ml-1.5"
            >
              Update available
            </Text>
          </View>

          {/* Title */}
          <Text className="text-white text-2xl font-sora-bold text-center mb-3">
            A fresh update is ready
          </Text>

          {/* Subtitle */}
          <Text className="text-gray-400 text-sm font-sora text-center leading-6 mb-8 px-2">
            We've made BoilerBites faster and more reliable. Grab the latest
            version to keep enjoying everything the app has to offer.
          </Text>

          {/* Highlights card */}
          <View
            className="w-full rounded-2xl px-5 py-5 mb-8"
            style={{
              backgroundColor: "#141414",
              borderWidth: 1,
              borderColor: "rgba(207, 185, 145, 0.15)",
            }}
          >
            {highlights.map((highlight, index) => (
              <View
                key={index}
                className="flex-row items-center"
                style={index === 0 ? undefined : { marginTop: 14 }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: "rgba(207, 185, 145, 0.1)",
                    borderWidth: 1,
                    borderColor: "rgba(207, 185, 145, 0.15)",
                  }}
                  className="items-center justify-center mr-3"
                >
                  <Ionicons name={highlight.icon} size={18} color="#CFB991" />
                </View>
                <Text className="text-gray-300 text-sm font-sora flex-1 leading-5">
                  {highlight.text}
                </Text>
              </View>
            ))}
          </View>

          {/* Update button */}
          <TouchableOpacity
            onPress={onUpdatePress}
            disabled={!storeUrl}
            activeOpacity={0.85}
            className="w-full rounded-xl py-4 px-5 flex-row items-center justify-center"
            style={{
              backgroundColor: storeUrl ? "#CFB991" : "#3a3a3a",
              shadowColor: "#CFB991",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: storeUrl ? 0.3 : 0,
              shadowRadius: 8,
              elevation: storeUrl ? 8 : 0,
            }}
          >
            <Text
              className="text-sm font-sora-semibold mr-2"
              style={{ color: storeUrl ? "#0a0a0a" : "#9ca3af" }}
            >
              {storeUrl ? "Update BoilerBites" : "Store link unavailable"}
            </Text>
            {storeUrl && (
              <Ionicons name="open-outline" size={16} color="#0a0a0a" />
            )}
          </TouchableOpacity>

          {/* Footer note */}
          <Text className="text-gray-600 text-xs font-sora text-center mt-5">
            {currentVersion
              ? `You're on version ${currentVersion}`
              : "Thanks for using BoilerBites"}
          </Text>
        </Animated.View>
      </SafeAreaView>
    </BackgroundTemplate>
  );
}
