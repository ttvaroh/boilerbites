import { Image, Text, TouchableOpacity, View } from "react-native";

interface DiningHallCardProps {
  name: string;
  hours: string;
  status: "open" | "closed";
  image?: any; // For require() imported images
  onPress: () => void;
}

export default function DiningHallCard({
  name,
  hours,
  status,
  image,
  onPress,
}: DiningHallCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-gray-800 rounded-xl p-4 mb-4"
      style={{
        shadowColor: "#CFB991",
        shadowOffset: {
          width: 0,
          height: 0,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        borderWidth: 1,
        borderColor: "rgba(207, 185, 145, 0.2)",
        opacity: status === "closed" ? 0.4 : 1,
      }}
    >
      <View className="relative">
        {/* Status Button - Upper Left */}
        <View
          className="absolute top-1.5 left-3.5 z-10 px-2 py-1 rounded-full"
          style={{
            backgroundColor: status === "open" ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
            borderWidth: 1,
            borderColor: status === "open" ? "#22c55e" : "#ef4444",
          }}
        >
          <Text
            className="text-xs font-sora-medium"
            style={{
              color: status === "open" ? "#22c55e" : "#ef4444",
            }}
          >
            {status === "open" ? "Open" : "Closed"}
          </Text>
        </View>

        {/* Image/Logo */}
        <View className="items-center mb-4">
          {image ? (
            <View
              className="w-[140px] h-[140px] p-4 rounded-2xl overflow-hidden"
              style={{
                backgroundColor: "rgba(207, 185, 145, 0.1)",
                borderWidth: 1,
                borderColor: "rgba(207, 185, 145, 0.3)",
                shadowColor: "#CFB991",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.2,
                shadowRadius: 6,
                elevation: 4,
              }}
            >
              <Image
                source={image}
                className="w-full h-full rounded-full"
                resizeMode="cover"
              />
            </View>
          ) : (
            <View
              className="w-[140px] h-[140px] rounded-full items-center justify-center"
              style={{
                backgroundColor: "rgba(207, 185, 145, 0.1)",
                borderWidth: 1,
                borderColor: "rgba(207, 185, 145, 0.3)",
                shadowColor: "#CFB991",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.2,
                shadowRadius: 6,
                elevation: 4,
              }}
            >
              <Text className="text-purdueGold font-sora-bold text-3xl">
                {name.charAt(0)}
              </Text>
            </View>
          )}
        </View>

        {/* Name */}
        <Text className="text-white font-sora-bold text-center text-xl mb-2">
          {name}
        </Text>

        {/* Hours */}
        <View className="items-center">
          <Text className="text-gray-400 text-xs font-sora text-center">
            {hours}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
