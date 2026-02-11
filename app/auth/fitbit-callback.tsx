/**
 * Fitbit OAuth Callback Handler
 * Handles the OAuth redirect from Fitbit
 */

import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { FitbitService } from '../../lib/health-integrations/fitbit/FitbitService';

export default function FitbitCallback() {
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    if (hasProcessedRef.current || !user) {
      return;
    }

    hasProcessedRef.current = true;

    const handleCallback = async () => {
      try {
        // Get the full URL from params or linking
        const code = params.code as string;
        const state = params.state as string;
        const error = params.error as string;
        const errorDescription = params.error_description as string;

        // Also try to get from initial URL if params are empty
        let url: string | null = null;
        if (!code && !error) {
          url = await Linking.getInitialURL();
          if (url) {
            // Parse URL manually for React Native
            const urlParts = url.split('?');
            if (urlParts.length > 1) {
              const queryParams = new URLSearchParams(urlParts[1]);
              const urlCode = queryParams.get('code');
              const urlError = queryParams.get('error');
              if (urlCode || urlError) {
                // Use URL params
                const finalCode = urlCode || code;
                const finalError = urlError || error;
                if (finalError) {
                  router.replace('/health-connections');
                  return;
                }
                if (!finalCode) {
                  router.replace('/health-connections');
                  return;
                }
                // Connection should be handled by WebBrowser session
                router.replace('/health-connections');
                return;
              }
            }
          }
        }

        if (error) {
          router.replace('/health-connections');
          return;
        }

        if (!code) {
          router.replace('/health-connections');
          return;
        }

        // Note: The FitbitService.connect() method uses WebBrowser.openAuthSessionAsync
        // which handles the full OAuth flow including token exchange automatically.
        // This callback page is mainly for handling deep link redirects.
        // The actual connection is completed in the FitbitService.connect() method.
        // Redirect to health connections page where the user can see connection status.
        router.replace('/health-connections');
      } catch (_) {
        router.replace('/health-connections');
      }
    };

    handleCallback();
  }, [user]);

  return (
    <View className="flex-1 bg-black justify-center items-center">
      <ActivityIndicator size="large" color="#00B0B9" />
      <Text className="text-white text-base font-sora mt-4">
        Completing Fitbit connection...
      </Text>
    </View>
  );
}
