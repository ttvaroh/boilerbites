import {
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
} from "@expo-google-fonts/sora";
import { useFonts } from "expo-font";
import Constants from "expo-constants";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { ReactNode, useEffect, useRef, useState } from "react";
import { AppState, Linking, Platform, Text, TouchableOpacity, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ErrorBoundary from "../components/ErrorBoundary";
import WhatsNewModal from "../components/WhatsNewModal";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { NutritionCacheProvider } from "../contexts/NutritionCacheContext";
import {
    NutritionGoalsProvider,
    useNutritionGoals,
} from "../contexts/NutritionGoalsContext";
import { ToastProvider } from "../contexts/ToastContext";
import "../global.css";
import { useWhatsNew } from "../hooks/useWhatsNew";
import { MenuDataProvider, useMenuData } from "../lib/MenuDataContext";
import { shouldRefreshAfterForeground } from "../lib/menuVersion";
import { supabase } from "../lib/supabase";

const DEFAULT_MIN_SUPPORTED_VERSION = process.env.EXPO_PUBLIC_MIN_SUPPORTED_VERSION || "0.0.0";
const DEFAULT_IOS_STORE_URL = process.env.EXPO_PUBLIC_IOS_APP_STORE_URL || "";
const DEFAULT_ANDROID_STORE_URL = process.env.EXPO_PUBLIC_ANDROID_PLAY_STORE_URL || "";
const MIN_VERSION_CONFIG_KEYS = {
  iosMinVersion: "min_supported_version_ios",
  androidMinVersion: "min_supported_version_android",
  iosStoreUrl: "ios_store_url",
  androidStoreUrl: "android_store_url",
} as const;

const compareVersions = (a: string, b: string): number => {
  const aParts = a.split(".").map((part) => parseInt(part, 10) || 0);
  const bParts = b.split(".").map((part) => parseInt(part, 10) || 0);
  const maxLen = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < maxLen; i += 1) {
    const aVal = aParts[i] || 0;
    const bVal = bParts[i] || 0;
    if (aVal > bVal) return 1;
    if (aVal < bVal) return -1;
  }

  return 0;
};

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
        supabase.auth.refreshSession(),
      ]);
    } catch (_) {}
  };

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        const crossedMenuBoundary = shouldRefreshAfterForeground(
          backgroundTimestamp.current,
        );

        if (backgroundTimestamp.current && crossedMenuBoundary) {
          handleAppRefresh();
        }
      } else if (nextAppState.match(/inactive|background/)) {
        backgroundTimestamp.current = Date.now();
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [refreshLocations, refreshGoals]);

  return <>{children}</>;
};

const MinimumVersionGate = ({ children }: { children: ReactNode }) => {
  const currentVersion = Constants.expoConfig?.version || "0.0.0";
  const [minVersion, setMinVersion] = useState(DEFAULT_MIN_SUPPORTED_VERSION);
  const [storeUrl, setStoreUrl] = useState(
    Platform.OS === "ios" ? DEFAULT_IOS_STORE_URL : DEFAULT_ANDROID_STORE_URL,
  );
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadRemoteGateConfig = async () => {
      try {
        const configKeys = Platform.OS === "ios"
          ? [MIN_VERSION_CONFIG_KEYS.iosMinVersion, MIN_VERSION_CONFIG_KEYS.iosStoreUrl]
          : [MIN_VERSION_CONFIG_KEYS.androidMinVersion, MIN_VERSION_CONFIG_KEYS.androidStoreUrl];

        const { data, error } = await supabase
          .from("app_runtime_config")
          .select("key, value")
          .in("key", configKeys);

        if (error || !data || !isMounted) {
          return;
        }

        const configMap = new Map<string, string>();
        for (const row of data) {
          if (row?.key && typeof row.value === "string") {
            configMap.set(row.key, row.value);
          }
        }

        if (Platform.OS === "ios") {
          setMinVersion(configMap.get(MIN_VERSION_CONFIG_KEYS.iosMinVersion) || DEFAULT_MIN_SUPPORTED_VERSION);
          setStoreUrl(configMap.get(MIN_VERSION_CONFIG_KEYS.iosStoreUrl) || DEFAULT_IOS_STORE_URL);
        } else {
          setMinVersion(configMap.get(MIN_VERSION_CONFIG_KEYS.androidMinVersion) || DEFAULT_MIN_SUPPORTED_VERSION);
          setStoreUrl(configMap.get(MIN_VERSION_CONFIG_KEYS.androidStoreUrl) || DEFAULT_ANDROID_STORE_URL);
        }
      } catch (err) {
        console.warn("Failed to load minimum version config:", err);
      } finally {
        if (isMounted) {
          setIsConfigLoaded(true);
        }
      }
    };

    loadRemoteGateConfig();

    return () => {
      isMounted = false;
    };
  }, []);

  // While loading remote config, fall back to env defaults.
  const effectiveMinVersion = minVersion || DEFAULT_MIN_SUPPORTED_VERSION;
  const shouldBlock = compareVersions(currentVersion, effectiveMinVersion) < 0;

  const handleUpdatePress = async () => {
    if (!storeUrl) {
      return;
    }
    try {
      await Linking.openURL(storeUrl);
    } catch (err) {
      console.warn("Could not open store URL:", err);
    }
  };

  if (!isConfigLoaded && !DEFAULT_MIN_SUPPORTED_VERSION) {
    return <>{children}</>;
  }

  if (!shouldBlock) {
    return <>{children}</>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Text style={{ color: "white", fontSize: 24, fontFamily: "Sora_700Bold", marginBottom: 12, textAlign: "center" }}>
        Update required
      </Text>
      <Text style={{ color: "#d1d5db", fontSize: 15, fontFamily: "Sora_400Regular", textAlign: "center", marginBottom: 24 }}>
        This version is no longer supported. Please update BoilerBites to continue.
      </Text>
      <TouchableOpacity
        onPress={handleUpdatePress}
        disabled={!storeUrl}
        style={{
          backgroundColor: storeUrl ? "#CFB991" : "#6b7280",
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderRadius: 999,
        }}
      >
        <Text style={{ color: "#0a0a0a", fontFamily: "Sora_600SemiBold", fontSize: 15 }}>
          {storeUrl ? "Update app" : "Store link unavailable"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// Wrapper that manages the "What's New" modal after version updates
const WhatsNewManager = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const { visible, entry, dismiss } = useWhatsNew();

  const handleCtaPress = () => {
    if (entry?.ctaButton?.route) {
      dismiss();
      router.push(entry.ctaButton.route as any);
    }
  };

  return (
    <>
      {children}
      <WhatsNewModal
        visible={visible}
        entry={entry}
        onDismiss={dismiss}
        onCtaPress={handleCtaPress}
      />
    </>
  );
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
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
        <SafeAreaProvider>
          <AuthProvider>
            <ToastProvider>
              <AppWithNutritionGoals>
                <NutritionCacheProvider>
                  <MenuDataProvider>
                    <MinimumVersionGate>
                      <AppRefreshManager>
                        <WhatsNewManager>
                          <Stack>
                            <Stack.Screen
                              name="index"
                              options={{ headerShown: false }}
                            />
                            <Stack.Screen
                              name="(tabs)"
                              options={{ headerShown: false }}
                            />
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
                              name="forgot-password"
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
                              name="custom-food/create-food"
                              options={{ headerShown: false }}
                            />
                            <Stack.Screen
                              name="custom-food/create-meal"
                              options={{ headerShown: false }}
                            />
                            <Stack.Screen
                              name="custom-food/edit-meal"
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
                              name="health-connections"
                              options={{ headerShown: false }}
                            />
                            <Stack.Screen
                              name="auth/fitbit-callback"
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
                        </WhatsNewManager>
                      </AppRefreshManager>
                    </MinimumVersionGate>
                  </MenuDataProvider>
                </NutritionCacheProvider>
              </AppWithNutritionGoals>
            </ToastProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
