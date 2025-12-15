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

    // Extract values from params to avoid dependency on the object reference
    const code = params.code as string;
    const error = params.error as string;
    const errorDescription = params.error_description as string;

    // Mark as processed immediately to prevent re-execution
    hasProcessedRef.current = true;

    console.log('[AuthCallback] Callback received with params:', { code: !!code, error, errorDescription });
    
    const handleCallback = async () => {
      try {
        if (error) {
          console.error('[AuthCallback] OAuth error:', error, errorDescription);
          router.replace('/signin');
          return;
        }

        if (code) {
          console.log('[AuthCallback] Exchanging code for session...');
          const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (sessionError) {
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
        router.replace('/signin');
      }
    };

    handleCallback();
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


