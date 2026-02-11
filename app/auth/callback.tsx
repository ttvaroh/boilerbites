import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function AuthCallback() {
  const params = useLocalSearchParams();
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    // Prevent multiple executions - only process callback once
    if (hasProcessedRef.current) {
      return;
    }

    // Mark as processed immediately to prevent re-execution
    hasProcessedRef.current = true;

    const handleCallback = async (url?: string | null) => {
      try {
        // Get the full URL to check for hash fragments (which aren't in route params)
        // Hash fragments are handled by deep link handler, but we check here as fallback
        let fullUrl: string | null = url || null;
        
        // Try to get the URL from various sources
        if (!fullUrl) {
          try {
            fullUrl = await Linking.getInitialURL();
          } catch (_) {}
        }

        // Check for hash fragment (implicit flow) - these should be handled by deep link handler
        // but we check here as a fallback in case the route was navigated to directly
        if (fullUrl && fullUrl.includes('#')) {
          const hashIndex = fullUrl.indexOf('#');
          const hash = fullUrl.substring(hashIndex + 1);
          const hashParams = new URLSearchParams(hash);
          
          const accessToken = hashParams.get('access_token');
          const error = hashParams.get('error');
          const errorDescription = hashParams.get('error_description');
          
          if (error) {
            router.replace('/signin');
            return;
          }
          
          if (accessToken) {
            const refreshToken = hashParams.get('refresh_token');
            if (!refreshToken) {
              router.replace('/signin');
              return;
            }
            
            // Check if session already exists (may have been set by deep link handler)
            const { data: { session: existingSession } } = await supabase.auth.getSession();
            if (existingSession) {
              router.replace('/profile');
              return;
            }
            
            // Set the session manually
            const { data: sessionData, error: setSessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (setSessionError) {
              router.replace('/signin');
              return;
            }
            
            if (sessionData.session) {
              router.replace('/profile');
              return;
            }
          }
        }

        // Handle query parameters (authorization code flow)
        // Extract values from params to avoid dependency on the object reference
        const code = params.code as string;
        const error = params.error as string;
        const errorDescription = params.error_description as string;

        if (error) {
          router.replace('/signin');
          return;
        }

        // Check if session already exists (may have been set by signInWithAzure or another handler)
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (existingSession) {
          router.replace('/profile');
          return;
        }

        if (code) {
          const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
          if (sessionError) {
            const { data: { session: checkSession } } = await supabase.auth.getSession();
            if (checkSession) {
              router.replace('/profile');
              return;
            }
            router.replace('/signin');
            return;
          }

          router.replace('/profile');
        } else {
          router.replace('/signin');
        }
      } catch (_) {
        const { data: { session: checkSession } } = await supabase.auth.getSession();
        if (checkSession) {
          router.replace('/profile');
          return;
        }
        router.replace('/signin');
      }
    };

    // Process callback immediately
    handleCallback();

    // Also listen for URL events in case deep link comes in while component is mounted
    // This handles the case where the app is already running and a deep link is received
    const urlListener = Linking.addEventListener('url', async ({ url }) => {
      if (url.includes('auth/callback') && url.includes('#')) {
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (existingSession) {
          router.replace('/profile');
          return;
        }
        handleCallback(url);
      }
    });

    return () => {
      urlListener.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount

  return (
    <View className="flex-1 bg-black justify-center items-center">
      <ActivityIndicator size="large" color="#CFB991" />
      <Text className="text-white text-base font-sora mt-4">
        Completing sign in...
      </Text>
    </View>
  );
}


