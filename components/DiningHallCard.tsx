import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";

interface DiningHallCardProps {
  name: string;
  hours: string;
  status: "open" | "closed";
  isFavorite: boolean;
  image?: any; // For require() imported images
  onPress: () => void;
  onFavoritePress: () => void;
}

export default function DiningHallCard({
  name,
  hours,
  status,
  isFavorite,
  image,
  onPress,
  onFavoritePress,
}: DiningHallCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white rounded-xl p-4 mb-4 shadow-sm"
      style={{
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}
    >
      <View className="relative">
        {/* Favorite Button */}
        <TouchableOpacity
          onPress={onFavoritePress}
          className="absolute top-1 right-1 z-10 p-1"
        >
          <Ionicons
            name={isFavorite ? "heart" : "heart-outline"}
            size={20}
            color={isFavorite ? "#CFB991" : "#9CA3AF"}
          />
        </TouchableOpacity>

        {/* Image/Logo */}
        <View className="items-center mb-4">
          {image ? (
            <View
              className="w-[160px] h-[160px] rounded-3xl overflow-hidden"
              style={{ backgroundColor: "rgba(207, 185, 145, 0.3)" }}
            >
              <Image
                source={image}
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>
          ) : (
            <View
              className="w-[160px] h-[160px] rounded-3xl items-center justify-center"
              style={{ backgroundColor: "rgba(207, 185, 145, 0.3)" }}
            >
              <Text className="text-purdueBlack-200 font-bold text-2xl">
                {name.charAt(0)}
              </Text>
            </View>
          )}
        </View>

        {/* Name */}
        <Text className="text-purdueBlack-200 font-sora-bold text-center text-xl mb-2">
          {name}
        </Text>

        {/* Hours/Status */}
        <Text
          className={`text-center text-sm font-sora-medium ${
            status === "open" ? "text-purdueBlack-100" : "text-red-500"
          }`}
        >
          {hours}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
