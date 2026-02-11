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
      className="bg-gray-800 rounded-xl p-2 mb-3 flex-1"
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
      <View className="flex-1 justify-between">
        {/* Top Content: Status + Image + Name */}
        <View className="relative">
          {/* Status Button - Upper Left */}
          <View
            className="absolute top-1 left-2 z-10 px-1.5 py-0.5 rounded-full"
            style={{
              backgroundColor: status === "open" ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
              borderWidth: 1,
              borderColor: status === "open" ? "#22c55e" : "#ef4444",
            }}
          >
            <Text
              className="text-[10px] font-sora-medium"
              style={{
                color: status === "open" ? "#22c55e" : "#ef4444",
              }}
            >
              {status === "open" ? "Open" : "Closed"}
            </Text>
          </View>

          {/* Image/Logo */}
          <View className="items-center mb-2">
            {image ? (
              <View
                className="w-[90px] h-[90px] p-2 rounded-2xl overflow-hidden"
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
                className="w-[90px] h-[90px] rounded-full items-center justify-center"
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
                <Text className="text-purdueGold font-sora-bold text-2xl">
                  {name.charAt(0)}
                </Text>
              </View>
            )}
          </View>

          {/* Name */}
          <Text
            className="text-white font-sora-bold text-center text-base mb-1"
            numberOfLines={2}
          >
            {name}
          </Text>
        </View>

        {/* Bottom Content: Hours (pinned to bottom) */}
        <View className="items-center mt-1">
          <Text className="text-gray-400 text-[10px] font-sora text-center" numberOfLines={2}>
            { hours && hours.split(": ").length > 1 ? (
              hours.split(": ")[0] + ":" + "\n" + hours.split(": ")[1]
            ) : (
              hours || "Closed Today"
            )}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
