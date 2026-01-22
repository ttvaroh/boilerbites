import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getDateStringFromToday, getTodayDateString } from '../lib/timezone-utils';
import { MealHours, ProcessedLocation } from '../types/menu';
import {
  formatLocationHours,
  getLocationLogo,
  getPlaceholderMealHours,
  isLocationOpen
} from '../utils/locationHelpers';

// ============================================================================
// Database Query
// ============================================================================

/**
 * Fetch meal hours from database for a specific location
 * @param locationName - Name of the location
 * @returns Array of meal hours or null if not found
 */
async function fetchMealHoursFromDatabase(locationName: string): Promise<MealHours[] | null> {
  try {
    // Get today's date in YYYY-MM-DD format (use local timezone to match meal selection)
    // This ensures consistency with getMealBasicInfo which also uses getTodayDateString()
    const today = getTodayDateString();
    
    // First, get the day_menu ID
    let { data: dayMenu, error: dayMenuError } = await supabase
      .from('day_menu')
      .select('id')
      .eq('location_name', locationName)
      .eq('serve_date', today)
      .eq('is_published', true)
      .single();

    // If no published data found, try without the published filter
    if (dayMenuError || !dayMenu) {
      const { data: unpublishedMenu, error: unpublishedError } = await supabase
        .from('day_menu')
        .select('id')
        .eq('location_name', locationName)
        .eq('serve_date', today)
        .single();
      
      if (unpublishedError || !unpublishedMenu) {
        return null;
      }
      
      dayMenu = unpublishedMenu;
    }

    if (!dayMenu) {
      return null;
    }

    // Now fetch the meal data directly
    const { data: mealsData, error: mealsError } = await supabase
      .from('day_meal')
      .select('meal_name, start_time, end_time, open, meal_order')
      .eq('day_menu_id', dayMenu.id)
      .order('meal_order');

    if (mealsError || !mealsData) {
      return null;
    }

    // Transform the data to match MealHours interface
    const mealHours: MealHours[] = mealsData.map((meal: any) => ({
      meal_name: meal.meal_name,
      start_time: meal.start_time,
      end_time: meal.end_time,
      open: meal.open,
    }));

    return mealHours;
  } catch (error) {
    console.error(`Error fetching meal hours for ${locationName}:`, error);
    return null;
  }
}

/**
 * Fetch tomorrow's meal hours from database for a specific location
 * @param locationName - Name of the location
 * @returns Array of meal hours or null if not found
 */
async function fetchTomorrowMealHours(locationName: string): Promise<MealHours[] | null> {
  try {
    // Get tomorrow's date in YYYY-MM-DD format (use local timezone to match meal selection)
    const tomorrowStr = getDateStringFromToday(1);
    
    // Get the day_menu ID for tomorrow
    const { data: dayMenu, error: dayMenuError } = await supabase
      .from('day_menu')
      .select('id')
      .eq('location_name', locationName)
      .eq('serve_date', tomorrowStr)
      .single();

    if (dayMenuError || !dayMenu) {
      return null;
    }

    // Fetch tomorrow's meal data
    const { data: mealsData, error: mealsError } = await supabase
      .from('day_meal')
      .select('meal_name, start_time, end_time, open, meal_order')
      .eq('day_menu_id', dayMenu.id)
      .order('meal_order');

    if (mealsError || !mealsData) {
      return null;
    }

    // Transform the data to match MealHours interface
    return mealsData.map((meal: any) => ({
      meal_name: meal.meal_name,
      start_time: meal.start_time,
      end_time: meal.end_time,
      open: meal.open,
    }));
  } catch (error) {
    console.error(`Error fetching tomorrow's meal hours for ${locationName}:`, error);
    return null;
  }
}

// ============================================================================
// Hook
// ============================================================================

interface Location {
  name: string;
  type: number;
  meals?: Array<{
    name: string;
    start_time: string;
    end_time: string;
    open: boolean;
  }>;
}

interface GroupedLocations {
  diningHalls: ProcessedLocation[];
  quickBites: ProcessedLocation[];
  onTheGo: ProcessedLocation[];
}

/**
 * Hook to process locations and determine their current status
 * Fetches meal hours from database and formats display information
 */
export function useLocationStatus(locations: Location[]) {
  const [processedLocations, setProcessedLocations] = useState<GroupedLocations>({
    diningHalls: [],
    quickBites: [],
    onTheGo: []
  });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (locations.length === 0) return;

    const processLocations = async () => {
      // Performance logging (temporary - remove after verification)
      const startTime = performance.now();
      let dbQueryCount = 0;
      
      setIsProcessing(true);
      
      try {
        const processed = await Promise.all(
          locations.map(async (location, index) => {
            // Wrap in try-catch to ensure individual location failures don't block others
            try {
              // OPTIMIZED: Prioritize cached meal data from refreshLocations()
              // This eliminates redundant database queries (15-30 queries -> 0 queries)
              // Determine meal hours priority:
              // 1. Context meal data (from refreshLocations - already fetched)
              // 2. Database meal hours (fallback if context data missing)
              // 3. Placeholder hours (final fallback)
              let mealHours: MealHours[] = [];
              
              // PRIORITY 1: Use meal data already in locations array (from refreshLocations)
              if (location.meals && location.meals.length > 0) {
                mealHours = location.meals.map((meal) => ({
                  meal_name: meal.name,
                  start_time: meal.start_time,
                  end_time: meal.end_time,
                  open: meal.open,
                }));
                
                // Check if today's data has valid times
                const hasValidTimes = mealHours.some(meal => meal.start_time && meal.end_time);
                
                if (!hasValidTimes) {
                  // If today's data is incomplete, try to fetch tomorrow's data
                  try {
                    dbQueryCount++; // Track fallback query
                    const tomorrowMealHours = await fetchTomorrowMealHours(location.name);
                    const firstTomorrowMeal = tomorrowMealHours?.find(meal => meal.start_time);
                    
                    if (firstTomorrowMeal) {
                      // Use tomorrow's first meal for "Opens tomorrow at..." display
                      mealHours = [{
                        meal_name: firstTomorrowMeal.meal_name,
                        start_time: firstTomorrowMeal.start_time,
                        end_time: firstTomorrowMeal.end_time,
                        open: false // Tomorrow's meal, so not open today
                      }];
                    }
                    // Otherwise keep the incomplete today's data
                  } catch (tomorrowError) {
                    // If fetching tomorrow's data fails, keep today's incomplete data
                    console.warn(`Error fetching tomorrow's meal hours for ${location.name}:`, tomorrowError);
                  }
                }
              } else {
                // PRIORITY 2: Fallback to database query only if location.meals is missing
                // This should rarely happen if refreshLocations() works correctly
                try {
                  dbQueryCount++; // Track fallback query
                  const dbMealHours = await fetchMealHoursFromDatabase(location.name);
                  
                  if (dbMealHours) {
                    // Check if today's data has valid times
                    const hasValidTimes = dbMealHours.some(meal => meal.start_time && meal.end_time);
                    
                    if (!hasValidTimes) {
                      // If today's data is incomplete, try to fetch tomorrow's data
                      try {
                        dbQueryCount++; // Track fallback query
                        const tomorrowMealHours = await fetchTomorrowMealHours(location.name);
                        const firstTomorrowMeal = tomorrowMealHours?.find(meal => meal.start_time);
                        
                        if (firstTomorrowMeal) {
                          // Use tomorrow's first meal for "Opens tomorrow at..." display
                          mealHours = [{
                            meal_name: firstTomorrowMeal.meal_name,
                            start_time: firstTomorrowMeal.start_time,
                            end_time: firstTomorrowMeal.end_time,
                            open: false // Tomorrow's meal, so not open today
                          }];
                        } else {
                          mealHours = dbMealHours; // Fallback to today's data
                        }
                      } catch (tomorrowError) {
                        // If fetching tomorrow's data fails, use today's incomplete data
                        console.warn(`Error fetching tomorrow's meal hours for ${location.name}:`, tomorrowError);
                        mealHours = dbMealHours;
                      }
                    } else {
                      mealHours = dbMealHours;
                    }
                  } else {
                    // PRIORITY 3: Final fallback to placeholder hours
                    mealHours = getPlaceholderMealHours();
                  }
                } catch (dbError) {
                  // If database query fails, use placeholder hours
                  console.warn(`Error fetching meal hours for ${location.name}:`, dbError);
                  mealHours = getPlaceholderMealHours();
                }
              }

              const isOpen = isLocationOpen(mealHours);
              const formattedHours = formatLocationHours(mealHours);
              const logo = getLocationLogo(location.name, location.type);

              return {
                id: index + 1,
                name: location.name,
                type: location.type,
                hours: formattedHours,
                status: (isOpen ? "open" : "closed") as "open" | "closed",
                image: logo,
                mealHours: mealHours,
              };
            } catch (error) {
              // If processing this location fails completely, return a fallback location
              console.warn(`Error processing location ${location.name}:`, error);
              return {
                id: index + 1,
                name: location.name,
                type: location.type,
                hours: "Hours unavailable",
                status: "closed" as "open" | "closed",
                image: getLocationLogo(location.name, location.type),
                mealHours: getPlaceholderMealHours(),
              };
            }
          })
        );

        // Group by location type
        const diningHalls = processed.filter(loc => loc.type === 0);
        const quickBites = processed.filter(loc => loc.type === 1);
        const onTheGo = processed.filter(loc => loc.type === 2);

        setProcessedLocations({ diningHalls, quickBites, onTheGo });
        
        // Performance logging (temporary - remove after verification)
        const endTime = performance.now();
        const totalTime = endTime - startTime;
        const locationsUsingCache = locations.filter(loc => loc.meals && loc.meals.length > 0).length;
        console.log(`[PERF] useLocationStatus completed in ${totalTime.toFixed(2)}ms`);
        console.log(`[PERF] ${locationsUsingCache}/${locations.length} locations used cached data, ${dbQueryCount} fallback DB queries`);
      } catch (error) {
        console.error('Error processing locations:', error);
        
        // Performance logging on error
        const endTime = performance.now();
        console.log(`[PERF] useLocationStatus failed after ${(endTime - startTime).toFixed(2)}ms`);
      } finally {
        setIsProcessing(false);
      }
    };

    processLocations();
  }, [locations]);

  // Memoize the grouped locations to prevent unnecessary re-renders
  const groupedLocations = useMemo(() => processedLocations, [processedLocations]);

  return {
    ...groupedLocations,
    isProcessing
  };
}