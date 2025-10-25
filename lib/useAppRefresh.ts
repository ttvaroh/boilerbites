import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export function useAppRefresh(onRefresh: () => void | Promise<void>) {
  const appState = useRef(AppState.currentState);
  const backgroundTimestamp = useRef<number | null>(null);
  const REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      // App going to background
      if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        backgroundTimestamp.current = Date.now();
      }
      
      // App returning to foreground
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        if (backgroundTimestamp.current) {
          const timeInBackground = Date.now() - backgroundTimestamp.current;
          if (timeInBackground >= REFRESH_THRESHOLD) {
            onRefresh();
            backgroundTimestamp.current = null;
          }
        }
      }
      
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [onRefresh]);
}

