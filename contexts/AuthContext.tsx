import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getCurrentTimestampInESTTimezone } from '../lib/timezone-utils';

// Complete the OAuth session when the browser closes
WebBrowser.maybeCompleteAuthSession();

type User = any;
type Session = any;

interface FoodEntry {
  item_id: string;
  quantity: number;
  created_at?: string;
  location_name?: string;
  meal_name?: number; // 0=uncategorized, 1=breakfast, 2=lunch, 3=dinner, 4=snack
  source?: number; // 0=Purdue API, 1=FDC API
}

interface DailyNutrition {
  id: string;
  user_id: string;
  date: string;
  goal_calories: number;
  goal_protein_g: number;
  goal_carbs_g: number;
  goal_fat_g: number;
  consumed_calories: number;
  consumed_protein_g: number;
  consumed_carbs_g: number;
  consumed_fat_g: number;
  remaining_calories: number;
  remaining_protein_g: number;
  remaining_carbs_g: number;
  remaining_fat_g: number;
  percent_calories: number;
  percent_protein: number;
  percent_carbs: number;
  percent_fat: number;
}

interface FavoriteItem {
  id: string;
  user_id: string;
  item_id: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>;
  signInWithAzure: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  addFoodEntry: (foodEntry: FoodEntry) => Promise<{ error: any }>;
  removeFoodEntry: (entryId: string) => Promise<{ error: any }>;
  toggleFavorite: (itemId: string) => Promise<{ error: any; isFavorited: boolean }>;
  getFavorites: () => Promise<{ data: FavoriteItem[] | null; error: any }>;
  getDailyNutrition: (date?: string) => Promise<{ data: DailyNutrition | null; error: any }>;
  updateDailyGoals: (date: string, goals: { calories?: number; protein?: number; carbs?: number; fat?: number; }) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signInWithAzure: async () => ({ error: null }),
  signOut: async () => {},
  refreshSession: async () => {},
  addFoodEntry: async () => ({ error: null }),
  removeFoodEntry: async () => ({ error: null }),
  toggleFavorite: async () => ({ error: null, isFavorited: false }),
  getFavorites: async () => ({ data: null, error: null }),
  getDailyNutrition: async () => ({ data: null, error: null }),
  updateDailyGoals: async () => ({ error: null }),
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      console.log('[AuthContext] Initial session loaded:', session ? 'authenticated' : 'not authenticated');
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: Session | null) => {
      console.log('[AuthContext] Auth state changed:', event, session ? 'authenticated' : 'not authenticated');
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Handle deep links for OAuth callback
    const handleDeepLink = async (url: string) => {
      console.log('[AuthContext] Deep link received:', url);
      
      if (url.includes('auth/callback')) {
        // Check for hash fragment (implicit flow) or query params (code flow)
        const hashIndex = url.indexOf('#');
        const queryIndex = url.indexOf('?');
        
        if (hashIndex !== -1) {
          // Hash fragment - Supabase should handle this automatically
          // Extract hash and let Supabase process it
          const hash = url.substring(hashIndex + 1);
          const hashParams = new URLSearchParams(hash);
          
          const accessToken = hashParams.get('access_token');
          const error = hashParams.get('error');
          
          if (error) {
            console.error('[AuthContext] Deep link OAuth error:', error);
            return;
          }
          
          if (accessToken) {
            console.log('[AuthContext] Access token in deep link hash - setting session manually');
            
            // Extract refresh token from hash fragment
            const refreshToken = hashParams.get('refresh_token');
            
            if (!refreshToken) {
              console.error('[AuthContext] No refresh token found in deep link hash');
              return;
            }
            
            // Set the session manually
            const { data: sessionData, error: setSessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (setSessionError) {
              console.error('[AuthContext] Deep link session set error:', setSessionError);
            } else if (sessionData.session) {
              console.log('[AuthContext] Deep link session set successfully');
            }
          }
        } else if (queryIndex !== -1) {
          // Query parameters - authorization code flow
          const parsedUrl = Linking.parse(url);
          const code = parsedUrl.queryParams?.code as string;
          const error = parsedUrl.queryParams?.error as string;
          
          if (error) {
            console.error('[AuthContext] Deep link OAuth error:', error);
            return;
          }
          
          if (code) {
            console.log('[AuthContext] Exchanging code from deep link...');
            const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
            if (sessionError) {
              console.error('[AuthContext] Deep link session exchange error:', sessionError);
            } else {
              console.log('[AuthContext] Deep link session exchange successful');
            }
          }
        }
      }
    };

    // Check if app was opened with a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Listen for deep links while app is running
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => {
      subscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });
    return { error };
  };

  const signInWithAzure = async () => {
    console.log('[AuthContext] Starting Azure OAuth sign in...');
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          redirectTo: 'boilerbites://auth/callback',
          skipBrowserRedirect: true, // We handle browser opening manually in React Native
          scopes: 'email openid profile', // Explicitly request email, openid, and profile scopes
        },
      });

      if (error) {
        console.error('[AuthContext] OAuth error:', error);
        return { error };
      }

      if (!data?.url) {
        console.error('[AuthContext] No OAuth URL returned');
        return { error: new Error('No OAuth URL returned from Supabase') };
      }

      const oauthUrl = data.url;
      console.log('[AuthContext] Full OAuth URL:', oauthUrl);
      console.log('[AuthContext] Expected redirect URL: boilerbites://auth/callback');
      console.log('[AuthContext] Make sure this redirect URL is configured in:');
      console.log('  1. Supabase Dashboard → Authentication → URL Configuration');
      console.log('  2. Azure Portal → App Registration → Authentication → Redirect URIs');
      
      // Open the OAuth URL in the browser
      const result = await WebBrowser.openAuthSessionAsync(
        oauthUrl,
        'boilerbites://auth/callback'
      );

      console.log('[AuthContext] WebBrowser result:', {
        type: result.type,
        url: result.type === 'success' ? result.url : null,
        hasUrl: result.type === 'success' && !!result.url,
      });

      // Log the full result for debugging
      if (result.type === 'cancel') {
        console.warn('[AuthContext] Browser session cancelled');
        console.warn('[AuthContext] This could mean:');
        console.warn('  1. User closed the browser');
        console.warn('  2. Azure returned an error (check Azure app registration)');
        console.warn('  3. Redirect URL mismatch (check Supabase and Azure redirect URLs)');
        console.warn('  4. Deep link not properly configured');
        return { error: new Error('Authentication cancelled. Please check Azure configuration and redirect URLs.') };
      }

      if (result.type === 'success' && result.url) {
        const callbackUrl = result.url;
        console.log('[AuthContext] Received callback URL:', callbackUrl);
        
        // Check if URL contains hash fragment (implicit flow) or query params (code flow)
        const hashIndex = callbackUrl.indexOf('#');
        const queryIndex = callbackUrl.indexOf('?');
        
        if (hashIndex !== -1) {
          // Handle hash fragment (implicit flow - tokens in hash)
          console.log('[AuthContext] Detected hash fragment (implicit flow)');
          const hash = callbackUrl.substring(hashIndex + 1);
          const hashParams = new URLSearchParams(hash);
          
          const accessToken = hashParams.get('access_token');
          const error = hashParams.get('error');
          const errorDescription = hashParams.get('error_description');
          
          if (error) {
            console.error('[AuthContext] OAuth callback error:', error, errorDescription);
            return { error: new Error(errorDescription || error || 'OAuth authentication failed') };
          }
          
          if (accessToken) {
            console.log('[AuthContext] Access token found in hash, setting session manually');
            
            // Extract all tokens from hash fragment
            const refreshToken = hashParams.get('refresh_token');
            const expiresAt = hashParams.get('expires_at');
            const expiresIn = hashParams.get('expires_in');
            
            if (!refreshToken) {
              console.error('[AuthContext] No refresh token found in hash fragment');
              return { error: new Error('No refresh token received') };
            }
            
            // Set the session manually using the tokens
            // Supabase needs the session object with access_token and refresh_token
            const { data: sessionData, error: setSessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (setSessionError) {
              console.error('[AuthContext] Error setting session:', setSessionError);
              return { error: setSessionError };
            }
            
            if (sessionData.session) {
              console.log('[AuthContext] Session successfully set from hash fragment');
              // The session will be updated via the onAuthStateChange listener
              return { error: null };
            } else {
              console.warn('[AuthContext] Session was not set properly');
              return { error: new Error('Failed to set session') };
            }
          } else {
            console.warn('[AuthContext] No access token found in hash fragment');
            return { error: new Error('No access token received') };
          }
        } else if (queryIndex !== -1) {
          // Handle query parameters (authorization code flow)
          console.log('[AuthContext] Detected query parameters (code flow)');
          const url = new URL(callbackUrl);
          
          const code = url.searchParams.get('code');
          const error = url.searchParams.get('error');
          const errorDescription = url.searchParams.get('error_description');
          const errorUri = url.searchParams.get('error_uri');

          console.log('[AuthContext] Callback params:', {
            hasCode: !!code,
            hasError: !!error,
            error,
            errorDescription,
          });

          if (error) {
            console.error('[AuthContext] OAuth callback error:', error, errorDescription);
            console.error('[AuthContext] Error URI:', errorUri);
            return { error: new Error(errorDescription || error || 'OAuth authentication failed') };
          }

          if (code) {
            console.log('[AuthContext] Exchange code for session...');
            // Exchange the code for a session
            const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
            
            if (sessionError) {
              console.error('[AuthContext] Session exchange error:', sessionError);
              return { error: sessionError };
            }

            console.log('[AuthContext] Session exchange successful');
            // The session will be updated via the onAuthStateChange listener
            return { error: null };
          } else {
            console.warn('[AuthContext] No code found in callback URL');
            return { error: new Error('No authorization code received') };
          }
        } else {
          console.warn('[AuthContext] No hash or query parameters found in callback URL');
          return { error: new Error('Invalid callback URL format') };
        }
      } else {
        console.error('[AuthContext] Unexpected browser result:', {
          type: result.type,
        });
        return { error: new Error(`Authentication failed: ${result.type}`) };
      }

    } catch (error) {
      console.error('[AuthContext] Unexpected error in signInWithAzure:', error);
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshSession = async (): Promise<void> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error refreshing session:', error);
        return;
      }
      setSession(session);
      setUser(session?.user ?? null);
    } catch (error) {
      console.error('Error in refreshSession:', error);
    }
  };

  const addFoodEntry = async (foodEntry: FoodEntry) => {
    if (!user) {
      return { error: new Error('User not authenticated') };
    }

    const { error } = await supabase
      .from('food_entry')
      .insert({
        user_id: user.id,
        item_id: foodEntry.item_id,
        quantity: foodEntry.quantity,
        created_at: foodEntry.created_at || getCurrentTimestampInESTTimezone(),
        meal_name: foodEntry.meal_name || 0, // Default to uncategorized
        source: foodEntry.source !== undefined ? foodEntry.source : 0, // Default to 0 (Purdue), 1 for FDC
      });

    return { error };
  };

  const removeFoodEntry = async (entryId: string) => {
    if (!user) {
      return { error: new Error('User not authenticated') };
    }

    const { error } = await supabase
      .from('food_entry')
      .delete()
      .eq('id', entryId)
      .eq('user_id', user.id); // Ensure user can only delete their own entries

    return { error };
  };

  const getDailyNutrition = async (date?: string) => {
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    const targetDate = date || new Date().toISOString().split('T')[0];

    try {
      // First, try to get existing record
      const { data: existingData, error: fetchError } = await supabase
        .from('user_daily_nutrition')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', targetDate)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching daily nutrition:', fetchError);
        return { data: null, error: fetchError };
      }

      // If record exists, return it with calculated fields
      if (existingData) {
        const goal_calories = existingData.goal_calories || 2300;
        const goal_protein_g = existingData.goal_protein_g || 115;
        const goal_carbs_g = existingData.goal_carbs_g || 288;
        const goal_fat_g = existingData.goal_fat_g || 77;
        
        const consumed_calories = existingData.consumed_calories || 0;
        const consumed_protein_g = existingData.consumed_protein_g || 0;
        const consumed_carbs_g = existingData.consumed_carbs_g || 0;
        const consumed_fat_g = existingData.consumed_fat_g || 0;

        const result: DailyNutrition = {
          id: existingData.id,
          user_id: existingData.user_id,
          date: existingData.date,
          goal_calories,
          goal_protein_g,
          goal_carbs_g,
          goal_fat_g,
          consumed_calories,
          consumed_protein_g,
          consumed_carbs_g,
          consumed_fat_g,
          remaining_calories: goal_calories - consumed_calories,
          remaining_protein_g: goal_protein_g - consumed_protein_g,
          remaining_carbs_g: goal_carbs_g - consumed_carbs_g,
          remaining_fat_g: goal_fat_g - consumed_fat_g,
          percent_calories: goal_calories > 0 ? (consumed_calories / goal_calories * 100) : 0,
          percent_protein: goal_protein_g > 0 ? (consumed_protein_g / goal_protein_g * 100) : 0,
          percent_carbs: goal_carbs_g > 0 ? (consumed_carbs_g / goal_carbs_g * 100) : 0,
          percent_fat: goal_fat_g > 0 ? (consumed_fat_g / goal_fat_g * 100) : 0,
        };

        return { data: result, error: null };
      }

      // If no record exists, return baseline values without creating database record
      const baselineGoals = {
        goal_calories: 2300,
        goal_protein_g: 115,
        goal_carbs_g: 288,
        goal_fat_g: 77,
      };

      const baselineConsumed = {
        consumed_calories: 0,
        consumed_protein_g: 0,
        consumed_carbs_g: 0,
        consumed_fat_g: 0,
      };

      const result: DailyNutrition = {
        id: '', // No database record, so no ID
        user_id: user.id,
        date: targetDate,
        goal_calories: baselineGoals.goal_calories,
        goal_protein_g: baselineGoals.goal_protein_g,
        goal_carbs_g: baselineGoals.goal_carbs_g,
        goal_fat_g: baselineGoals.goal_fat_g,
        consumed_calories: baselineConsumed.consumed_calories,
        consumed_protein_g: baselineConsumed.consumed_protein_g,
        consumed_carbs_g: baselineConsumed.consumed_carbs_g,
        consumed_fat_g: baselineConsumed.consumed_fat_g,
        remaining_calories: baselineGoals.goal_calories - baselineConsumed.consumed_calories,
        remaining_protein_g: baselineGoals.goal_protein_g - baselineConsumed.consumed_protein_g,
        remaining_carbs_g: baselineGoals.goal_carbs_g - baselineConsumed.consumed_carbs_g,
        remaining_fat_g: baselineGoals.goal_fat_g - baselineConsumed.consumed_fat_g,
        percent_calories: baselineGoals.goal_calories > 0 ? (baselineConsumed.consumed_calories / baselineGoals.goal_calories * 100) : 0,
        percent_protein: baselineGoals.goal_protein_g > 0 ? (baselineConsumed.consumed_protein_g / baselineGoals.goal_protein_g * 100) : 0,
        percent_carbs: baselineGoals.goal_carbs_g > 0 ? (baselineConsumed.consumed_carbs_g / baselineGoals.goal_carbs_g * 100) : 0,
        percent_fat: baselineGoals.goal_fat_g > 0 ? (baselineConsumed.consumed_fat_g / baselineGoals.goal_fat_g * 100) : 0,
      };

      return { data: result, error: null };
    } catch (error) {
      console.error('Error in getDailyNutrition:', error);
      return { data: null, error: error as Error };
    }
  };

  const updateDailyGoals = async (
    date: string,
    goals: {
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
    }
  ) => {
    if (!user) {
      return { error: new Error('User not authenticated') };
    }

    // Update the user's global nutrition goals first
    if (goals.calories || goals.protein || goals.carbs || goals.fat) {
      try {
        const { upsertNutritionGoals } = await import('../lib/nutritionGoalsService');
        await upsertNutritionGoals(user.id, {
          calories: goals.calories || 2000,
          protein: goals.protein || 115,
          carbs: goals.carbs || 288,
          fat: goals.fat || 67,
        });
      } catch (error) {
        console.error('Error updating nutrition goals:', error);
        return { error: error as Error };
      }
    }

    // Update the daily nutrition record for the specific date
    const { error: updateError } = await supabase
      .from('user_daily_nutrition')
      .update({
        goal_calories: goals.calories,
        goal_protein_g: goals.protein,
        goal_carbs_g: goals.carbs,
        goal_fat_g: goals.fat,
      })
      .eq('user_id', user.id)
      .eq('date', date);

    // If update failed (likely because no record exists), create a new one
    if (updateError) {
      const { error: insertError } = await supabase
        .from('user_daily_nutrition')
        .insert({
          user_id: user.id,
          date: date,
          goal_calories: goals.calories || 2300,
          goal_protein_g: goals.protein || 115,
          goal_carbs_g: goals.carbs || 288,
          goal_fat_g: goals.fat || 77,
          consumed_calories: 0,
          consumed_protein_g: 0,
          consumed_carbs_g: 0,
          consumed_fat_g: 0,
        });

      if (insertError) {
        console.error('Error creating daily nutrition record:', insertError);
        return { error: insertError };
      }
    }

    return { error: null };
  };

  const toggleFavorite = async (itemId: string) => {
    if (!user) {
      return { error: new Error('User not authenticated'), isFavorited: false };
    }

    // Check if item is already favorited
    const { data: existingFavorite, error: checkError } = await supabase
      .from('favorite_item')
      .select('id')
      .eq('user_id', user.id)
      .eq('item_id', itemId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      return { error: checkError, isFavorited: false };
    }

    if (existingFavorite) {
      // Remove from favorites
      const { error } = await supabase
        .from('favorite_item')
        .delete()
        .eq('user_id', user.id)
        .eq('item_id', itemId);

      return { error, isFavorited: false };
    } else {
      // Add to favorites
      const { error } = await supabase
        .from('favorite_item')
        .insert({
          user_id: user.id,
          item_id: itemId,
        });

      return { error, isFavorited: true };
    }
  };

  const getFavorites = async () => {
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    const { data, error } = await supabase
      .from('favorite_item')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    return { data, error };
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signInWithAzure,
    signOut,
    refreshSession,
    addFoodEntry,
    removeFoodEntry,
    toggleFavorite,
    getFavorites,
    getDailyNutrition,
    updateDailyGoals,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
