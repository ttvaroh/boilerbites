import {
  Sora_400Regular,
  Sora_500Medium,
  Sora_600SemiBold,
  Sora_700Bold,
} from "@expo-google-fonts/sora";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "../global.css";
import { MenuDataProvider } from "../lib/MenuDataContext";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <MenuDataProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="dining-hall/[name]"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="nutrition/[itemId]"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="missing-nutrition/[itemId]"
            options={{ headerShown: false }}
          />
        </Stack>
      </MenuDataProvider>
    );
  }

  return (
    <MenuDataProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="dining-hall/[name]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="nutrition/[itemId]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="missing-nutrition/[itemId]"
          options={{ headerShown: false }}
        />
      </Stack>
    </MenuDataProvider>
  );
}
