import { useState, useCallback, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface RateLimitState {
  canSearch: boolean;
  requestsRemaining: number;
  timeUntilNextRequest: number; // seconds
}

const RATE_LIMIT_KEY = 'off_search_rate_limit';
const MAX_REQUESTS = 10;
const WINDOW_MS = 60000; // 1 minute
const MIN_SEARCH_INTERVAL = 3000; // 3 seconds

export function useOFFRateLimit() {
  const [rateLimitState, setRateLimitState] = useState<RateLimitState>({
    canSearch: true,
    requestsRemaining: MAX_REQUESTS,
    timeUntilNextRequest: 0
  });
  
  const lastSearchTimeRef = useRef<number>(0);
  const requestTimestampsRef = useRef<number[]>([]);

  const checkRateLimit = useCallback(async (): Promise<boolean> => {
    const now = Date.now();
    
    // Check 3 second minimum interval
    const timeSinceLastSearch = now - lastSearchTimeRef.current;
    if (timeSinceLastSearch < MIN_SEARCH_INTERVAL) {
      const waitTime = Math.ceil((MIN_SEARCH_INTERVAL - timeSinceLastSearch) / 1000);
      setRateLimitState({
        canSearch: false,
        requestsRemaining: 0,
        timeUntilNextRequest: waitTime
      });
      return false;
    }

    // Load persisted timestamps from AsyncStorage
    try {
      const stored = await AsyncStorage.getItem(RATE_LIMIT_KEY);
      if (stored) {
        requestTimestampsRef.current = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading rate limit from storage:', error);
    }

    // Remove timestamps older than 1 minute
    const oneMinuteAgo = now - WINDOW_MS;
    requestTimestampsRef.current = requestTimestampsRef.current.filter(
      timestamp => timestamp > oneMinuteAgo
    );

    // Check if we can make another request
    const requestsInWindow = requestTimestampsRef.current.length;
    const canMakeRequest = requestsInWindow < MAX_REQUESTS;

    if (canMakeRequest) {
      // Add current request timestamp
      requestTimestampsRef.current.push(now);
      lastSearchTimeRef.current = now;
      
      // Persist to AsyncStorage
      try {
        await AsyncStorage.setItem(
          RATE_LIMIT_KEY,
          JSON.stringify(requestTimestampsRef.current)
        );
      } catch (error) {
        console.error('Error saving rate limit to storage:', error);
      }

      setRateLimitState({
        canSearch: true,
        requestsRemaining: MAX_REQUESTS - requestsInWindow - 1,
        timeUntilNextRequest: 0
      });
      return true;
    } else {
      // Calculate time until oldest request expires
      if (requestTimestampsRef.current.length > 0) {
        const oldestRequest = Math.min(...requestTimestampsRef.current);
        const timeUntilOldestExpires = Math.ceil(
          (oldestRequest + WINDOW_MS - now) / 1000
        );

        setRateLimitState({
          canSearch: false,
          requestsRemaining: 0,
          timeUntilNextRequest: Math.max(0, timeUntilOldestExpires)
        });
      } else {
        setRateLimitState({
          canSearch: false,
          requestsRemaining: 0,
          timeUntilNextRequest: 0
        });
      }
      return false;
    }
  }, []);

  const updateState = useCallback(async () => {
    const now = Date.now();
    
    // Load persisted timestamps
    try {
      const stored = await AsyncStorage.getItem(RATE_LIMIT_KEY);
      if (stored) {
        requestTimestampsRef.current = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading rate limit from storage:', error);
    }

    // Remove timestamps older than 1 minute
    const oneMinuteAgo = now - WINDOW_MS;
    requestTimestampsRef.current = requestTimestampsRef.current.filter(
      timestamp => timestamp > oneMinuteAgo
    );

    const requestsInWindow = requestTimestampsRef.current.length;
    const timeSinceLastSearch = now - lastSearchTimeRef.current;
    
    // Check both conditions: rate limit and minimum interval
    const canSearch = requestsInWindow < MAX_REQUESTS && 
                      timeSinceLastSearch >= MIN_SEARCH_INTERVAL;

    if (!canSearch) {
      let waitTime = 0;
      
      // Calculate wait time based on which condition is blocking
      if (timeSinceLastSearch < MIN_SEARCH_INTERVAL) {
        waitTime = Math.ceil((MIN_SEARCH_INTERVAL - timeSinceLastSearch) / 1000);
      } else if (requestsInWindow >= MAX_REQUESTS && requestTimestampsRef.current.length > 0) {
        const oldestRequest = Math.min(...requestTimestampsRef.current);
        waitTime = Math.ceil((oldestRequest + WINDOW_MS - now) / 1000);
      }
      
      setRateLimitState({
        canSearch: false,
        requestsRemaining: Math.max(0, MAX_REQUESTS - requestsInWindow),
        timeUntilNextRequest: Math.max(0, waitTime)
      });
    } else {
      setRateLimitState({
        canSearch: true,
        requestsRemaining: MAX_REQUESTS - requestsInWindow,
        timeUntilNextRequest: 0
      });
    }
  }, []);

  // Update state periodically to show countdown
  useEffect(() => {
    updateState();
    const interval = setInterval(updateState, 1000);
    return () => clearInterval(interval);
  }, [updateState]);

  return {
    canSearch: rateLimitState.canSearch,
    requestsRemaining: rateLimitState.requestsRemaining,
    timeUntilNextRequest: rateLimitState.timeUntilNextRequest,
    checkRateLimit
  };
}

