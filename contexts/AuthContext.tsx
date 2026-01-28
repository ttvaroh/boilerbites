import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { createLocalDateFromString, getCurrentTimestampInESTTimezone, getLocalDateUTCBounds, getTodayDateString } from '../lib/timezone-utils';

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
  source?: number; // 0=Purdue API, 1=FatSecret API
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
  signUp: (email: string, password: string, name: string) => Promise<{ data: any; error: any }>;
  signInWithAzure: () => Promise<{ error: any }>;
  signInWithApple: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<{ error: any }>;
  deleteAccount: () => Promise<{ error: any }>;
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
  signUp: async () => ({ data: null, error: null }),
  signInWithAzure: async () => ({ error: null }),
  signInWithApple: async () => ({ error: null }),
  signOut: async () => {},
  resetPasswordForEmail: async () => ({ error: null }),
  deleteAccount: async () => ({ error: null }),
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
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: Session | null) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Handle deep links for OAuth callbacks
    // Note: Hash fragments are NOT accessible via route params, so we must handle them here
    // Query parameters (code flow) are handled by the route component to avoid duplicate processing
    const handleDeepLink = async (url: string) => {
      if (url.includes('auth/callback')) {
        // Check if this is a hash fragment callback (implicit flow)
        // Hash fragments are not accessible via route params, so we must handle them here
        const hashIndex = url.indexOf('#');
        const queryIndex = url.indexOf('?');
        
        // Only handle hash fragments here - query params are handled by route component
        if (hashIndex !== -1) {
          
          const hash = url.substring(hashIndex + 1);
          const hashParams = new URLSearchParams(hash);
          
          const accessToken = hashParams.get('access_token');
          const error = hashParams.get('error');
          const errorDescription = hashParams.get('error_description');
          
          if (error) {
            console.error('[AuthContext] Deep link OAuth error:', error, errorDescription);
            return;
          }
          
          if (accessToken) {
            
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
            }
          }
        } else if (queryIndex !== -1) {
          // Query parameters (code flow) - skip here, let route component handle it
          // to prevent duplicate code exchange
          console.log('[AuthContext] OAuth callback with query params detected - skipping (handled by route component)');
          return;
        }
      }
      
      // Handle other types of deep links here if needed in the future
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
    return { data, error };
  };

  const signInWithAzure = async () => {    
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
      
      // Open the OAuth URL in the browser
      const result = await WebBrowser.openAuthSessionAsync(
        oauthUrl,
        'boilerbites://auth/callback'
      );

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
        
        // Check if URL contains hash fragment (implicit flow) or query params (code flow)
        const hashIndex = callbackUrl.indexOf('#');
        const queryIndex = callbackUrl.indexOf('?');
        
        if (hashIndex !== -1) {
          // Handle hash fragment (implicit flow - tokens in hash)
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
          const url = new URL(callbackUrl);
          
          const code = url.searchParams.get('code');
          const error = url.searchParams.get('error');
          const errorDescription = url.searchParams.get('error_description');
          const errorUri = url.searchParams.get('error_uri');

          if (error) {
            console.error('[AuthContext] OAuth callback error:', error, errorDescription);
            console.error('[AuthContext] Error URI:', errorUri);
            return { error: new Error(errorDescription || error || 'OAuth authentication failed') };
          }

          if (code) {
            // Exchange the code for a session
            const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
            
            if (sessionError) {
              console.error('[AuthContext] Session exchange error:', sessionError);
              return { error: sessionError };
            }

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

  const signInWithApple = async () => {
    // Native Sign in with Apple is only available on iOS
    if (Platform.OS !== 'ios') {
      return { error: new Error('Sign in with Apple is only available on iOS devices') };
    }

    try {
      // Check if Apple Authentication is available
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        return { error: new Error('Sign in with Apple is not available on this device') };
      }

      // Request Apple authentication
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Verify we have an identity token
      if (!credential.identityToken) {
        return { error: new Error('No identity token received from Apple') };
      }

      // Sign in to Supabase using the identity token
      const { error: signInError, data: { user: supabaseUser } } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (signInError) {
        console.error('[AuthContext] Supabase sign in error:', signInError);
        return { error: signInError };
      }

      // Apple only provides the user's full name on the first sign-in
      // Save it to user metadata if available
      if (credential.fullName && supabaseUser) {
        try {
          const nameParts: string[] = [];
          if (credential.fullName.givenName) nameParts.push(credential.fullName.givenName);
          if (credential.fullName.middleName) nameParts.push(credential.fullName.middleName);
          if (credential.fullName.familyName) nameParts.push(credential.fullName.familyName);
          
          if (nameParts.length > 0) {
            const fullName = nameParts.join(' ');
            await supabase.auth.updateUser({
              data: {
                full_name: fullName,
                given_name: credential.fullName.givenName || null,
                family_name: credential.fullName.familyName || null,
              },
            });
          }
        } catch (updateError) {
          // Non-critical error - user is signed in, just name update failed
          console.warn('[AuthContext] Failed to update user name:', updateError);
        }
      }

      return { error: null };
    } catch (error: any) {
      // Handle user cancellation
      if (error.code === 'ERR_REQUEST_CANCELED' || error.code === 'ERR_CANCELED') {
        return { error: new Error('Apple sign in was cancelled') };
      }
      
      console.error('[AuthContext] Unexpected error in signInWithApple:', error);
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
        source: foodEntry.source !== undefined ? foodEntry.source : 0, // Default to 0 (Purdue), 1 for FatSecret
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

    const targetDate = date || getTodayDateString();

    try {
      // Convert date string to local Date object for proper timezone handling
      const localDate = createLocalDateFromString(targetDate);
      
      // Get UTC bounds for the local date to ensure we capture all entries for that EST day
      const { start, end } = getLocalDateUTCBounds(localDate);

      // Calculate consumed values from food entries using EST date bounds
      // This ensures entries added late at night EST are counted for the correct day
      const { data: foodEntries, error: entriesError } = await supabase
        .from('food_entry')
        .select(`
          quantity,
          item:item_id (
            calories,
            protein_g,
            carbs_g,
            fat_g
          )
        `)
        .eq('user_id', user.id)
        .gte('created_at', start)
        .lte('created_at', end);

      if (entriesError) {
        console.error('Error fetching food entries for daily nutrition:', entriesError);
        // Continue with zero values if query fails
      }

      // Calculate consumed values from food entries
      const consumed = (foodEntries || []).reduce(
        (acc: { consumed_calories: number; consumed_protein_g: number; consumed_carbs_g: number; consumed_fat_g: number }, entry: any) => {
          const item = entry.item;
          const quantity = entry.quantity || 1;
          return {
            consumed_calories: acc.consumed_calories + ((item?.calories || 0) * quantity),
            consumed_protein_g: acc.consumed_protein_g + ((item?.protein_g || 0) * quantity),
            consumed_carbs_g: acc.consumed_carbs_g + ((item?.carbs_g || 0) * quantity),
            consumed_fat_g: acc.consumed_fat_g + ((item?.fat_g || 0) * quantity),
          };
        },
        {
          consumed_calories: 0,
          consumed_protein_g: 0,
          consumed_carbs_g: 0,
          consumed_fat_g: 0,
        }
      );

      // Get goals from user_daily_nutrition table if it exists, otherwise use defaults
      const { data: existingData, error: fetchError } = await supabase
        .from('user_daily_nutrition')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', targetDate)
        .single();

      // Use goals from database if available, otherwise use defaults
      const goal_calories = existingData?.goal_calories || 2300;
      const goal_protein_g = existingData?.goal_protein_g || 115;
      const goal_carbs_g = existingData?.goal_carbs_g || 288;
      const goal_fat_g = existingData?.goal_fat_g || 77;

      const result: DailyNutrition = {
        id: existingData?.id || '',
        user_id: user.id,
        date: targetDate,
        goal_calories,
        goal_protein_g,
        goal_carbs_g,
        goal_fat_g,
        consumed_calories: consumed.consumed_calories,
        consumed_protein_g: consumed.consumed_protein_g,
        consumed_carbs_g: consumed.consumed_carbs_g,
        consumed_fat_g: consumed.consumed_fat_g,
        remaining_calories: goal_calories - consumed.consumed_calories,
        remaining_protein_g: goal_protein_g - consumed.consumed_protein_g,
        remaining_carbs_g: goal_carbs_g - consumed.consumed_carbs_g,
        remaining_fat_g: goal_fat_g - consumed.consumed_fat_g,
        percent_calories: goal_calories > 0 ? (consumed.consumed_calories / goal_calories * 100) : 0,
        percent_protein: goal_protein_g > 0 ? (consumed.consumed_protein_g / goal_protein_g * 100) : 0,
        percent_carbs: goal_carbs_g > 0 ? (consumed.consumed_carbs_g / goal_carbs_g * 100) : 0,
        percent_fat: goal_fat_g > 0 ? (consumed.consumed_fat_g / goal_fat_g * 100) : 0,
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

  const resetPasswordForEmail = async (email: string) => {
    if (!email) {
      return { error: new Error('Email is required') };
    }

    try {
      // Redirect to web page for password reset
      // Users will complete the reset on the website, then can sign in on the app
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://boilerbites.vercel.app/reset-password',
      });

      return { error };
    } catch (error) {
      console.error('Error in resetPasswordForEmail:', error);
      return { error: error as Error };
    }
  };

  const deleteAccount = async () => {
    if (!user) {
      return { error: new Error('User not authenticated') };
    }

    const userId = user.id;

    try {
      // Delete all user data in the correct order to respect foreign key constraints
      
      // 1. Delete food entries
      const { error: foodEntryError } = await supabase
        .from('food_entry')
        .delete()
        .eq('user_id', userId);

      if (foodEntryError) {
        console.error('Error deleting food entries:', foodEntryError);
        return { error: foodEntryError };
      }

      // 2. Delete favorite items
      const { error: favoriteError } = await supabase
        .from('favorite_item')
        .delete()
        .eq('user_id', userId);

      if (favoriteError) {
        console.error('Error deleting favorite items:', favoriteError);
        return { error: favoriteError };
      }

      // 3. Delete user daily nutrition records
      const { error: dailyNutritionError } = await supabase
        .from('user_daily_nutrition')
        .delete()
        .eq('user_id', userId);

      if (dailyNutritionError) {
        console.error('Error deleting daily nutrition:', dailyNutritionError);
        return { error: dailyNutritionError };
      }

      // 4. Delete nutrition preferences
      const { error: nutritionPrefsError } = await supabase
        .from('nutrition_preferences')
        .delete()
        .eq('user_id', userId);

      if (nutritionPrefsError) {
        console.error('Error deleting nutrition preferences:', nutritionPrefsError);
        return { error: nutritionPrefsError };
      }

      // 5. Get all custom items (meals and foods) created by this user
      const { data: customItems, error: customItemsError } = await supabase
        .from('item')
        .select('id')
        .eq('user_id', userId);

      if (customItemsError) {
        console.error('Error fetching custom items:', customItemsError);
        return { error: customItemsError };
      }

      // 6. Delete collection_item entries for custom meals
      if (customItems && customItems.length > 0) {
        const customItemIds = customItems.map((item: { id: string }) => item.id);
        
        const { error: collectionItemError } = await supabase
          .from('collection_item')
          .delete()
          .in('collection_id', customItemIds);

        if (collectionItemError) {
          console.error('Error deleting collection items:', collectionItemError);
          return { error: collectionItemError };
        }
      }

      // 7. Delete custom_food entries
      const { error: customFoodError } = await supabase
        .from('custom_food')
        .delete()
        .eq('created_by', userId);

      if (customFoodError) {
        console.error('Error deleting custom foods:', customFoodError);
        return { error: customFoodError };
      }

      // 8. Delete custom items (meals and foods) from item table
      if (customItems && customItems.length > 0) {
        const customItemIds = customItems.map((item: { id: string }) => item.id);
        
        const { error: itemError } = await supabase
          .from('item')
          .delete()
          .in('id', customItemIds);

        if (itemError) {
          console.error('Error deleting custom items:', itemError);
          return { error: itemError };
        }
      }

      // 9. Delete the auth user
      // Note: Client-side auth doesn't support deleting users directly
      // We need to use a database function or edge function
      // Try using a database RPC function if available
      const { error: rpcError } = await supabase.rpc('delete_user_account', {
        user_id: userId
      });

      if (rpcError) {
        // If RPC function doesn't exist, try admin API (will likely fail from client)
        try {
          const { error: adminError } = await supabase.auth.admin.deleteUser(userId);
          if (adminError) {
            // Both methods failed - sign out user and return error
            console.warn('User deletion failed. All user data has been deleted, but user account remains. Error:', adminError);
            await supabase.auth.signOut();
            return { 
              error: new Error('User data deleted, but account deletion requires server-side setup. Please contact support to complete account deletion.') 
            };
          }
        } catch (adminErr) {
          // Admin API not available from client
          console.warn('Admin API not available. All user data deleted, but user account remains.');
          await supabase.auth.signOut();
          return { 
            error: new Error('User data deleted, but account deletion requires server-side setup. Please contact support to complete account deletion.') 
          };
        }
      }

      // Sign out after successful deletion
      await supabase.auth.signOut();

      return { error: null };
    } catch (error) {
      console.error('Error in deleteAccount:', error);
      return { error: error as Error };
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signInWithAzure,
    signInWithApple,
    signOut,
    refreshSession,
    resetPasswordForEmail,
    addFoodEntry,
    removeFoodEntry,
    toggleFavorite,
    getFavorites,
    getDailyNutrition,
    updateDailyGoals,
    deleteAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
