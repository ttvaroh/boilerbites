import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function _Layout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#CEB888", // Purdue Gold
        tabBarInactiveTintColor: "#1a1a1a", // Purdue Black 100
        tabBarStyle: {
          backgroundColor: "#fafaf9", // Warm White
          borderTopColor: "#CEB888",
          borderTopWidth: 1,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="diary"
        options={{
          title: "Diary",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
