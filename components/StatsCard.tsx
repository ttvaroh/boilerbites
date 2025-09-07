import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  variant?: "default" | "highlight";
}

export default function StatsCard({
  title,
  value,
  subtitle,
  icon,
  iconColor = "#CEB888",
  variant = "default",
}: StatsCardProps) {
  return (
    <View
      className={`flex-1 p-4 rounded-xl items-center ${
        variant === "highlight"
          ? "bg-gradient-to-br from-purdueGold to-yellow-200"
          : "bg-white"
      } shadow-lg`}
      style={{
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
      }}
    >
      {icon && (
        <View className="mb-2">
          <Ionicons name={icon} size={24} color={iconColor} />
        </View>
      )}
      <Text
        className={`text-3xl font-bold mb-1 ${
          variant === "highlight" ? "text-purdueBlack-200" : "text-purdueGold"
        }`}
      >
        {value}
      </Text>
      <Text
        className={`text-sm font-medium text-center ${
          variant === "highlight"
            ? "text-purdueBlack-200"
            : "text-purdueBlack-100"
        }`}
      >
        {title}
      </Text>
      {subtitle && (
        <Text
          className={`text-xs text-center mt-1 ${
            variant === "highlight"
              ? "text-purdueBlack-100"
              : "text-purdueBlack-100"
          }`}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
}
