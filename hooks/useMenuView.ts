import { useCallback, useEffect, useReducer, useRef } from 'react';
import { formatMealTypeName, getMealOrder, MealType } from '../lib/mealConfig';
import {
  addDaysToDateString,
  getCurrentTimeInEST,
  getDateStringFromToday,
  getTodayDateString
} from '../lib/timezone-utils';
import { Meal, MealsByDate, ViewAction, ViewState } from '../types/menu';

// ============================================================================
// Reducer
// ============================================================================

function viewStateReducer(state: ViewState, action: ViewAction): ViewState {
  switch (action.type) {
    case 'START_LOADING':
      return {
        status: 'loading',
        date: action.date,
        mealType: action.mealType,
        autoDetectMeal: state.status === 'initializing' ? state.autoDetectMeal : false,
        mealName: action.mealName
      };
    case 'SHOW_CACHED':
      return {
        status: 'cached',
        date: action.date,
        mealType: action.mealType,
        mealName: action.mealName
      };
    case 'LOAD_SUCCESS':
      return {
        status: 'loaded',
        date: action.date,
        mealType: action.mealType,
        data: action.data
      };
    case 'LOAD_EMPTY':
      return {
        status: 'empty',
        date: action.date,
        mealType: action.mealType,
        mealName: action.mealName
      };
    case 'LOAD_ERROR':
      return {
        status: 'error',
        date: action.date,
        mealType: action.mealType,
        error: action.error
      };
    case 'RESET':
      return { 
        status: 'initializing', 
        autoDetectMeal: action.autoDetectMeal ?? true 
      };
    default:
      return state;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function getDateRange() {
  return {
    minDate: getDateStringFromToday(-7),
    maxDate: getDateStringFromToday(7)
  };
}

function isDateInRange(dateStr: string): boolean {
  const { minDate, maxDate } = getDateRange();
  return dateStr >= minDate && dateStr <= maxDate;
}

function findCurrentMealType(mealsData: MealsByDate, locationName: string): MealType {
  const { hours, minutes } = getCurrentTimeInEST();
  const currentTime = hours * 60 + minutes;
  
  const locationMealOrder = getMealOrder(locationName);
  
  // Check if we're currently in any meal period
  for (const mealType of locationMealOrder) {
    const meal = mealsData[mealType as keyof MealsByDate];
    if (meal && meal.start_time && meal.end_time && meal.open) {
      const [startHour, startMin] = meal.start_time.split(':').map(Number);
      const [endHour, endMin] = meal.end_time.split(':').map(Number);
      const startTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;
      
      if (currentTime >= startTime && currentTime <= endTime) {
        return mealType;
      }
    }
  }
  
  // Find next upcoming meal
  for (const mealType of locationMealOrder) {
    const meal = mealsData[mealType as keyof MealsByDate];
    if (meal && meal.start_time && meal.open) {
      const [startHour, startMin] = meal.start_time.split(':').map(Number);
      const startTime = startHour * 60 + startMin;
      
      if (startTime > currentTime) {
        return mealType;
      }
    }
  }
  
  // Find last meal that was served today
  for (let i = locationMealOrder.length - 1; i >= 0; i--) {
    const mealType = locationMealOrder[i];
    const meal = mealsData[mealType as keyof MealsByDate];
    if (meal && meal.start_time && meal.open) {
      return mealType;
    }
  }
  
  return locationMealOrder[0] || 'breakfast';
}

// ============================================================================
// Hook
// ============================================================================

interface UseMenuViewProps {
  locationName: string;
  getMealBasicInfo: (location: string, date: string) => Promise<MealsByDate | null>;
  getMealDetailedData: (location: string, date: string, mealType: string) => Promise<Meal | null>;
}

export function useMenuView({ 
  locationName, 
  getMealBasicInfo, 
  getMealDetailedData 
}: UseMenuViewProps) {
  const [viewState, dispatch] = useReducer(viewStateReducer, { 
    status: 'initializing', 
    autoDetectMeal: true 
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);

  // ============================================================================
  // Navigation Logic
  // ============================================================================

  const getAdjacentMeal = useCallback((
    direction: 'next' | 'prev'
  ): { date: string; mealType: MealType } | null => {
    if (viewState.status === 'initializing') return null;
    
    const mealOrder = getMealOrder(locationName);
    const currentIndex = mealOrder.indexOf(viewState.mealType as MealType);
    
    if (direction === 'next') {
      // Move to next meal same day
      if (currentIndex < mealOrder.length - 1) {
        return {
          date: viewState.date,
          mealType: mealOrder[currentIndex + 1]
        };
      }
      
      // Move to first meal of next day
      const nextDate = addDaysToDateString(viewState.date, 1);
      if (isDateInRange(nextDate)) {
        return {
          date: nextDate,
          mealType: mealOrder[0]
        };
      }
    } else {
      // Move to previous meal same day
      if (currentIndex > 0) {
        return {
          date: viewState.date,
          mealType: mealOrder[currentIndex - 1]
        };
      }
      
      // Move to last meal of previous day
      const prevDate = addDaysToDateString(viewState.date, -1);
      if (isDateInRange(prevDate)) {
        return {
          date: prevDate,
          mealType: mealOrder[mealOrder.length - 1]
        };
      }
    }
    
    return null;
  }, [viewState, locationName]);

  const canNavigate = useCallback((direction: 'next' | 'prev'): boolean => {
    return getAdjacentMeal(direction) !== null;
  }, [getAdjacentMeal]);

  // ============================================================================
  // Data Loading
  // ============================================================================

  const loadMealView = useCallback(async (
    date: string,
    mealType: MealType,
    shouldAutoDetect: boolean = false
  ) => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    dispatch({ type: 'START_LOADING', date, mealType, mealName: formatMealTypeName(mealType) });

    try {
      let finalMealType = mealType;
      
      // Auto-detect meal if requested
      if (shouldAutoDetect) {
        const basicData = await getMealBasicInfo(locationName, date);
        if (controller.signal.aborted) return;
        
        if (basicData) {
          finalMealType = findCurrentMealType(basicData, locationName);
        }
      }

      // Load detailed meal data (context handles caching)
      const mealData = await getMealDetailedData(locationName, date, finalMealType);
      if (controller.signal.aborted) return;

      if (!mealData || !mealData.stations || mealData.stations.length === 0) {
        dispatch({
          type: 'LOAD_EMPTY',
          date,
          mealType: finalMealType,
          mealName: mealData?.name || formatMealTypeName(finalMealType)
        });
      } else {
        dispatch({
          type: 'LOAD_SUCCESS',
          date,
          mealType: finalMealType,
          data: mealData
        });
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      
      console.error('Error loading meal:', error);
      dispatch({
        type: 'LOAD_ERROR',
        date,
        mealType,
        error: error instanceof Error ? error.message : 'Failed to load menu'
      });
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [locationName, getMealBasicInfo, getMealDetailedData]);

  const navigateToMeal = useCallback(async (direction: 'next' | 'prev') => {
    const targetMeal = getAdjacentMeal(direction);
    if (targetMeal) {
      await loadMealView(targetMeal.date, targetMeal.mealType, false);
    }
  }, [getAdjacentMeal, loadMealView]);

  const resetView = useCallback((autoDetect: boolean = true) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    dispatch({ type: 'RESET', autoDetectMeal: autoDetect });
  }, []);

  const initializeToday = useCallback(async () => {
    const today = getTodayDateString();
    
    // Pre-check cache before any state changes
    try {
      const basicData = await getMealBasicInfo(locationName, today);
      if (basicData) {
        const detectedMealType = findCurrentMealType(basicData, locationName);
        const detectedMeal = basicData[detectedMealType as keyof MealsByDate];
        
        if (detectedMeal && detectedMeal.name) {
          // We have cached basic data - show meal name immediately without any loading state
          dispatch({ 
            type: 'SHOW_CACHED', 
            date: today, 
            mealType: detectedMealType,
            mealName: detectedMeal.name 
          });
          
          // Load detailed data in background without changing the display
          try {
            const detailedData = await getMealDetailedData(locationName, today, detectedMealType);
            if (detailedData && detailedData.stations && detailedData.stations.length > 0) {
              dispatch({
                type: 'LOAD_SUCCESS',
                date: today,
                mealType: detectedMealType,
                data: detailedData
              });
            } else {
              dispatch({
                type: 'LOAD_EMPTY',
                date: today,
                mealType: detectedMealType,
                mealName: detectedMeal.name
              });
            }
          } catch (error) {
            // Keep showing the meal name even if detailed data fails
            dispatch({
              type: 'LOAD_EMPTY',
              date: today,
              mealType: detectedMealType,
              mealName: detectedMeal.name
            });
          }
          return; // Skip the normal loading flow entirely
        }
      }
    } catch (error) {
      // Basic data not cached, fall through to loading
    }
    
    // No cached data available - use normal loading flow
    const defaultMeal = getMealOrder(locationName)[0];
    await loadMealView(today, defaultMeal, true);
  }, [locationName, getMealBasicInfo, getMealDetailedData, loadMealView]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    viewState,
    navigateToMeal,
    canNavigate,
    loadMealView,
    resetView,
    initializeToday
  };
}