import {
  Sora_400Regular,
  Sora_500Medium,
  Sora_600SemiBold,
  Sora_700Bold,
} from "@expo-google-fonts/sora";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { ReactNode, useEffect, useRef } from "react";
import { AppState } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ErrorBoundary from "../components/ErrorBoundary";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { NutritionCacheProvider } from "../contexts/NutritionCacheContext";
import { NutritionGoalsProvider, useNutritionGoals } from "../contexts/NutritionGoalsContext";
import "../global.css";
import { MenuDataProvider, useMenuData } from "../lib/MenuDataContext";
import { supabase } from "../lib/supabase";

// Wrapper component to provide user ID to NutritionGoalsProvider
const AppWithNutritionGoals = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  return (
    <NutritionGoalsProvider userId={user?.id || null}>
      {children}
    </NutritionGoalsProvider>
  );
};

// AppRefreshManager component that monitors AppState and handles refresh
const AppRefreshManager = ({ children }: { children: ReactNode }) => {
  const { refreshLocations } = useMenuData();
  const { refreshGoals } = useNutritionGoals();
  const appState = useRef(AppState.currentState);
  const backgroundTimestamp = useRef<number | null>(null);

  const handleAppRefresh = async () => {
    try {
      // Refresh all major data sources
      await Promise.all([
        refreshLocations(),
        refreshGoals(),
        supabase.auth.refreshSession()
      ]);
    } catch (error) {
      console.error('❌ Error during app refresh:', error);
    }
  };

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to foreground
        const now = Date.now();
        if (backgroundTimestamp.current && (now - backgroundTimestamp.current) >= 300000) {
          // 5 minutes = 300000ms
          handleAppRefresh();
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App is going to background
        backgroundTimestamp.current = Date.now();
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [refreshLocations, refreshGoals]);

  return <>{children}</>;
};

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
    return null;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
        <SafeAreaProvider>
          <AuthProvider>
            <AppWithNutritionGoals>
              <NutritionCacheProvider>
                <MenuDataProvider>
                  <AppRefreshManager>
                    <Stack>
                      <Stack.Screen name="index" options={{ headerShown: false }} />
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
                      <Stack.Screen
                        name="edit-food-entry/[entryId]"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="signin"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="signup"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="auth/callback"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="favorites"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="collection/[collectionId]"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="custom-food/index"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="custom-food/edit-custom-food"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="edit-profile"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="contact-support-screen"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="nutrition-preferences"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="menu-settings"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="about"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="search-by-date"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="global-search"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="[...unmatched]"
                        options={{ headerShown: false }}
                      />
                    </Stack>
                  </AppRefreshManager>
                </MenuDataProvider>
              </NutritionCacheProvider>
            </AppWithNutritionGoals>
          </AuthProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}