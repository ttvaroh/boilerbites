import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function AuthCallback() {
  const params = useLocalSearchParams();

  useEffect(() => {
    console.log('[AuthCallback] Callback received with params:', params);
    
    const handleCallback = async () => {
      try {
        // Check if we have a code in the URL
        const code = params.code as string;
        const error = params.error as string;
        const errorDescription = params.error_description as string;

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
  }, [params]);

  return (
    <View className="flex-1 bg-black justify-center items-center">
      <ActivityIndicator size="large" color="#CFB991" />
      <Text className="text-white text-base font-sora mt-4">
        Completing sign in...
      </Text>
    </View>
  );
}


