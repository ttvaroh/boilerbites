import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import BackgroundTemplate from "../components/BackgroundTemplate";
import { useAuth } from "../contexts/AuthContext";

type SettingsItem = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  action: () => void;
  showChevron?: boolean;
  showSwitch?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
  color?: string;
  destructive?: boolean;
};

type SettingsSection = {
  title: string;
  items: SettingsItem[];
};

export default function SettingsScreen() {
  const { user } = useAuth();
  const router = useRouter();


  const settingsSections: SettingsSection[] = [
    {
        title: "Nutrition Preferences",
        items: [
            {
                id: "nutrition-preferences",
                icon: "nutrition",
                title: "Nutrition Preferences",
                subtitle: "Customize your nutrition preferences",
                action: () => router.push("/nutrition-preferences"),
                showChevron: true,
                color: "#CFB991",
            }
        ]
    },
    {
      title: "Preferences",
      items: [
        {
          id: "notifications",
          icon: "notifications",
          title: "Push Notifications",
          subtitle: "Coming soon",
          action: () => {},
          showSwitch: true,
          switchValue: false,
          onSwitchChange: () => {}, // Disabled - no action
          color: "#F59E0B",
        },
      ],
    },
    {
      title: "Account",
      items: [
        {
          id: "profile",
          icon: "person",
          title: "Edit Profile",
          subtitle: "Update your name and information",
          action: () => router.push("/edit-profile"),
          showChevron: true,
          color: "#CFB991",
        },
        {
          id: "email",
          icon: "mail",
          title: "Email",
          subtitle: user?.email || "Not signed in",
          action: () => {},
          showChevron: false,
          color: "#60A5FA",
        },
      ],
    },
    {
      title: "Support",
      items: [
        {
          id: "contact",
          icon: "chatbubbles",
          title: "Contact Support",
          subtitle: "Get help with any issues",
          action: () => router.push("/contact-support-screen"),
          showChevron: true,
          color: "#10B981",
        },
      ],
    },
  ];

  return (
    <BackgroundTemplate paddingBottom={0}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-16 pb-8">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center flex-1">
              <TouchableOpacity
                onPress={() => router.back()}
                className="mr-4 p-2"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <Text className="text-white text-2xl font-sora-bold">
                Settings
              </Text>
            </View>
          </View>

          {/* User Info Card */}
          {user && (
            <View className="bg-gradient-to-br from-purdueGold/20 to-yellow-600/10 rounded-2xl p-5 mb-6 border border-purdueGold/30">
              <View className="flex-row items-center">
                <View className="w-16 h-16 bg-purdueGold rounded-full items-center justify-center shadow-lg mr-4">
                  <Text className="text-black text-2xl font-sora-bold">
                    {user?.user_metadata?.full_name[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                  </Text>
                </View>

                <View className="flex-1">
                  <Text className="text-white text-lg font-sora-bold">
                    {user?.user_metadata?.full_name || "User"}
                  </Text>
                  <Text className="text-gray-300 text-sm font-sora mt-0.5">
                    {user?.email}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Settings Sections */}
          {settingsSections.map((section, sectionIndex) => (
            <View key={section.title} className="mb-5">
              <Text className="text-gray-400 text-xs font-sora-semibold uppercase tracking-wider mb-3 px-1">
                {section.title}
              </Text>
              <View className="bg-gray-800/40 backdrop-blur-xl rounded-2xl border border-gray-700/30 overflow-hidden">
                {section.items.map((item, itemIndex) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={item.action}
                    disabled={item.showSwitch || !item.showChevron && !item.destructive}
                    className={`px-5 py-4 flex-row items-center ${
                      itemIndex !== section.items.length - 1 ? "border-b border-gray-700/30" : ""
                    }`}
                    activeOpacity={0.7}
                  >
                    <View
                      className="rounded-full p-2.5 mr-4"
                      style={{ backgroundColor: `${item.color}20` }}
                    >
                      <Ionicons name={item.icon} size={20} color={item.color} />
                    </View>
                    <View className="flex-1">
                      <Text className={`text-base font-sora-semibold ${
                        item.destructive ? "text-red-400" : "text-white"
                      }`}>
                        {item.title}
                      </Text>
                      {item.subtitle && (
                        <Text className="text-gray-400 text-xs font-sora mt-0.5">
                          {item.subtitle}
                        </Text>
                      )}
                    </View>
                    {item.showSwitch && (
                      <Switch
                        value={item.switchValue || false}
                        onValueChange={item.onSwitchChange || (() => {})}
                        trackColor={{ false: "#374151", true: "#CFB991" }}
                        thumbColor={item.switchValue ? "#FFFFFF" : "#9CA3AF"}
                        disabled={!item.onSwitchChange || item.id === "notifications"}
                      />
                    )}
                    {item.showChevron && (
                      <Ionicons 
                        name="chevron-forward" 
                        size={20} 
                        color={item.destructive ? "#EF4444" : "#9CA3AF"} 
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          {/* Footer Info */}
          <View className="items-center mb-6">
            <Text className="text-gray-500 text-xs font-sora">
              Made with ❤️ for Purdue
            </Text>
            <Text className="text-gray-600 text-xs font-sora mt-1">
              © 2025 BoilerBites
            </Text>
          </View>
        </View>
      </ScrollView>
    </BackgroundTemplate>
  );
}