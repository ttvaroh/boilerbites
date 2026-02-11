import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WhatsNewEntry } from "../lib/whatsNewData";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 48, 340);

type WhatsNewModalProps = {
  visible: boolean;
  entry: WhatsNewEntry | null;
  onDismiss: () => void;
  onCtaPress?: () => void;
};

export default function WhatsNewModal({
  visible,
  entry,
  onDismiss,
  onCtaPress,
}: WhatsNewModalProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (visible) {
      fadeAnim.setValue(0);
      slideAnim.setValue(40);
      scaleAnim.setValue(0.95);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 20,
          stiffness: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 20,
          stiffness: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim, scaleAnim]);

  if (!entry) return null;

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={onDismiss}
    >
      <Animated.View
        style={{ opacity: fadeAnim }}
        className="flex-1 justify-center items-center bg-black/70 px-6"
      >
        <Animated.View
          style={[
            {
              width: CARD_WIDTH,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim },
              ],
              borderWidth: 1,
              borderColor: "rgba(207, 185, 145, 0.25)",
              shadowColor: "#CFB991",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.15,
              shadowRadius: 24,
              elevation: 16,
            },
          ]}
          className="bg-[#141414] rounded-3xl overflow-hidden"
        >
          <View className="px-6 pt-6 pb-5">
            {/* Header */}
            <View className="items-center mb-5">
              {/* Sparkle icon */}
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: "rgba(207, 185, 145, 0.12)",
                  borderWidth: 1,
                  borderColor: "rgba(207, 185, 145, 0.2)",
                }}
                className="items-center justify-center mb-4"
              >
                <Ionicons name="sparkles" size={24} color="#CFB991" />
              </View>

              {/* Version badge */}
              <View
                style={{
                  backgroundColor: "rgba(207, 185, 145, 0.12)",
                  borderWidth: 1,
                  borderColor: "rgba(207, 185, 145, 0.2)",
                }}
                className="rounded-full px-3 py-1 mb-3"
              >
                <Text
                  style={{ color: "#CFB991" }}
                  className="text-xs font-sora-semibold"
                >
                  Version {entry.version}
                </Text>
              </View>

              {/* Title */}
              <Text className="text-white text-xl font-sora-bold text-center mb-1">
                {entry.title}
              </Text>

              {/* Subtitle */}
              {entry.subtitle && (
                <Text className="text-gray-400 text-sm font-sora text-center leading-5 px-2">
                  {entry.subtitle}
                </Text>
              )}
            </View>

            {/* Divider */}
            <View
              style={{ backgroundColor: "rgba(255, 255, 255, 0.06)" }}
              className="h-px mb-5"
            />

            {/* Features */}
            <View className="mb-5">
              {entry.features.map((feature, index) => (
                <View
                  key={index}
                  className="flex-row items-center mb-3"
                  style={
                    index === entry.features.length - 1
                      ? { marginBottom: 0 }
                      : undefined
                  }
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
                    <Ionicons
                      name={feature.icon as any}
                      size={18}
                      color="#CFB991"
                    />
                  </View>
                  <Text className="text-gray-300 text-sm font-sora flex-1 leading-5">
                    {feature.text}
                  </Text>
                </View>
              ))}
            </View>

            {/* CTA Button */}
            {entry.ctaButton && (
              <TouchableOpacity
                onPress={onCtaPress}
                activeOpacity={0.8}
                style={{
                  backgroundColor: "#CFB991",
                  shadowColor: "#CFB991",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8,
                }}
                className="rounded-xl py-3.5 px-5 flex-row items-center justify-center mb-3"
              >
                <Text className="text-[#0a0a0a] text-sm font-sora-semibold mr-2">
                  {entry.ctaButton.label}
                </Text>
                {entry.ctaButton.icon && (
                  <Ionicons
                    name={entry.ctaButton.icon as any}
                    size={16}
                    color="#0a0a0a"
                  />
                )}
              </TouchableOpacity>
            )}

            {/* Dismiss button */}
            <TouchableOpacity
              onPress={onDismiss}
              activeOpacity={0.6}
              className="py-2 items-center"
            >
              <Text className="text-gray-500 text-sm font-sora">
                Got it
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
