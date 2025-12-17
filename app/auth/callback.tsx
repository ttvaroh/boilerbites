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
          } catch (e) {
            console.warn('[AuthCallback] Could not get initial URL:', e);
          }
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
            console.error('[AuthCallback] OAuth error from hash:', error, errorDescription);
            router.replace('/signin');
            return;
          }
          
          if (accessToken) {
            console.log('[AuthCallback] Access token found in hash fragment (fallback handler)');
            const refreshToken = hashParams.get('refresh_token');
            
            if (!refreshToken) {
              console.error('[AuthCallback] No refresh token found in hash fragment');
              router.replace('/signin');
              return;
            }
            
            // Check if session already exists (may have been set by deep link handler)
            const { data: { session: existingSession } } = await supabase.auth.getSession();
            if (existingSession) {
              console.log('[AuthCallback] Session already exists, skipping hash processing');
              router.replace('/profile');
              return;
            }
            
            // Set the session manually
            const { data: sessionData, error: setSessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (setSessionError) {
              console.error('[AuthCallback] Session set error:', setSessionError);
              router.replace('/signin');
              return;
            }
            
            if (sessionData.session) {
              console.log('[AuthCallback] Session set successfully from hash fragment');
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

        console.log('[AuthCallback] Callback received with params:', { code: !!code, error, errorDescription });

        if (error) {
          console.error('[AuthCallback] OAuth error:', error, errorDescription);
          router.replace('/signin');
          return;
        }

        // Check if session already exists (may have been set by signInWithAzure or another handler)
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (existingSession) {
          console.log('[AuthCallback] Session already exists, skipping code exchange');
          router.replace('/profile');
          return;
        }

        if (code) {
          console.log('[AuthCallback] Exchanging code for session...');
          const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (sessionError) {
            // Check if error is due to code already being used (which is OK if session exists)
            const { data: { session: checkSession } } = await supabase.auth.getSession();
            if (checkSession) {
              console.log('[AuthCallback] Code already used but session exists, proceeding');
              router.replace('/profile');
              return;
            }
            
            console.error('[AuthCallback] Session exchange error:', sessionError);
            router.replace('/signin');
            return;
          }

          console.log('[AuthCallback] Session exchange successful');
          // Redirect to profile - the auth state change will handle navigation
          router.replace('/profile');
        } else {
          console.warn('[AuthCallback] No code found in callback');
          router.replace('/signin');
        }
      } catch (error) {
        console.error('[AuthCallback] Unexpected error:', error);
        // Check if session exists despite the error
        const { data: { session: checkSession } } = await supabase.auth.getSession();
        if (checkSession) {
          console.log('[AuthCallback] Session exists despite error, proceeding');
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
        console.log('[AuthCallback] Received URL event with hash fragment');
        
        // Check if session already exists (may have been processed by deep link handler)
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (existingSession) {
          console.log('[AuthCallback] Session already exists from URL event, skipping');
          router.replace('/profile');
          return;
        }
        
        // Process the URL event if no session exists yet
        // This handles the case where the initial handleCallback() didn't catch it
        // (e.g., if getInitialURL() returned null because app was already running)
        console.log('[AuthCallback] Processing URL event with hash fragment');
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


