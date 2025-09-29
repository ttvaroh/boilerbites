import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function _Layout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#CFB991", // Purdue Gold
        tabBarInactiveTintColor: "#B0B0B0", // Light Gray
        tabBarStyle: {
          backgroundColor: "rgba(45, 45, 45, 0.95)", // Dark translucent
          borderTopColor: "transparent",
          borderTopWidth: 0,
          position: "absolute",
          elevation: 0,
          shadowOpacity: 0,
          backdropFilter: "blur(20px)",
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
          title: "Stats",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" size={size} color={color} />
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
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
