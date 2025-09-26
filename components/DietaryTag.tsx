import React from "react";
import { Text, View } from "react-native";

interface DietaryTagProps {
  text: string;
  variant: "vegetarian" | "vegan" | "gluten-free" | "high-protein";
}

export default function DietaryTag({ text, variant }: DietaryTagProps) {
  const getTagStyles = () => {
    switch (variant) {
      case "vegetarian":
        return {
          backgroundColor: "#065f46", // dark green
          textColor: "#5efcbf", // light green
          borderColor: "#10b981", // light green glow
        };
      case "vegan":
        return {
          backgroundColor: "#064e3b", // darker green
          textColor: "#5efcbf", // light green
          borderColor: "#10b981", // light green glow
        };
      case "gluten-free":
        return {
          backgroundColor: "#065f46", // dark green
          textColor: "#5efcbf", // light green
          borderColor: "#10b981", // light green glow
        };
      case "high-protein":
        return {
          backgroundColor: "#1e3a8a", // dark blue
          textColor: "#3b82f6", // light blue
          borderColor: "#3b82f6", // light blue glow
        };
      default:
        return {
          backgroundColor: "#374151", // default dark gray
          textColor: "#9ca3af", // light gray
          borderColor: "#9ca3af", // light gray glow
        };
    }
  };

  const styles = getTagStyles();

  return (
    <View
      className="px-2 py-1 rounded-full"
      style={{
        backgroundColor: styles.backgroundColor,
        borderWidth: 1,
        borderColor: styles.borderColor,
        shadowColor: styles.borderColor,
        shadowOffset: {
          width: 0,
          height: 0,
        },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
      }}
    >
      <Text
        className="text-xs font-sora-medium"
        style={{ color: styles.textColor }}
      >
        {text}
      </Text>
    </View>
  );
}
