import { supabase } from './supabase';

/**
 * Check if an error is a JWT expiration error
 */
export function isJWTExpiredError(error: any): boolean {
  if (!error) return false;
  
  const errorCode = error.code;
  const errorMessage = error.message?.toLowerCase() || '';
  
  return (
    errorCode === 'PGRST303' ||
    errorMessage.includes('jwt expired') ||
    errorMessage.includes('token expired')
  );
}

/**
 * Refresh the session and retry an operation
 * @param operation - The async operation to retry after refresh
 * @param maxRetries - Maximum number of retry attempts (default: 1)
 * @returns The result of the operation
 */
export async function withTokenRefresh<T>(
  operation: () => Promise<T>,
  maxRetries: number = 1
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      return result;
    } catch (error: any) {
      lastError = error;
      
      // If it's a JWT expired error and we haven't exceeded max retries, try to refresh
      if (isJWTExpiredError(error) && attempt < maxRetries) {
        try {
          // Attempt to refresh the session
          const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError) {
            console.warn('Failed to refresh session:', refreshError);
            // If refresh fails, break and return the original error
            break;
          }
          
          if (session) {
            // Session refreshed, retry the operation
            console.log('Session refreshed, retrying operation...');
            continue;
          }
        } catch (refreshErr) {
          console.warn('Error during session refresh:', refreshErr);
          break;
        }
      } else {
        // Not a JWT error or max retries reached, throw the error
        throw error;
      }
    }
  }
  
  // If we get here, all retries failed
  throw lastError;
}

